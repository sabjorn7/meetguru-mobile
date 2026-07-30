-- Paginated seller sales for the my_finanse page (replaces the full-table collection).
-- Server-filtered to the caller's own sales, newest first, with limit/offset paging,
-- optional category + date-range filters, a totals aggregate (honouring the same
-- filters), AND the buyer (name/email/id) resolved best-effort:
--   buyer = owner of the order whose course_positions contains this sale's `position`,
--   picking the order closest in time (disambiguates products sold more than once).
-- Subscription/manual sales with no matching order return a null buyer.
-- NOTE: best-effort attribution (sales has no buyer column). For 100% accuracy going
-- forward, add a `buyer` uuid column to `sales` populated by the sale-creation flow.

-- Drop the older (fewer-arg) signatures so the filtered versions are unambiguous.
drop function if exists public.get_user_sales(uuid, int, int);
drop function if exists public.get_user_sales_summary(uuid);

create or replace function public.get_user_sales(
  p_user uuid,
  p_limit int default 100,
  p_offset int default 0,
  p_category text default null,
  p_from date default null,
  p_to date default null
)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  from (
    select
      s.id, s.created_at, s.amount, s.price, s.position_name, s.position_category, s.status, s.back,
      b.id     as buyer_id,
      b."Name" as buyer_name,
      b.email  as buyer_email
    from (
      select *
      from public.sales
      where "user" = p_user
        and (p_category is null or position_category = p_category)
        and (p_from is null or created_at >= p_from)
        and (p_to is null or created_at < (p_to + 1))
      order by created_at desc
      limit greatest(p_limit, 0)
      offset greatest(p_offset, 0)
    ) s
    left join lateral (
      select o.owner as bid
      from public."order" o
      where s.position::text = any(o.course_positions)
      order by abs(extract(epoch from (o.created_at - s.created_at)))
      limit 1
    ) ord on true
    left join public.users b on b.id = ord.bid
    order by s.created_at desc
  ) x;
$$;
grant execute on function public.get_user_sales(uuid, int, int, text, date, date) to anon, authenticated, service_role;

-- Totals over the seller's sales matching the same filters (for "Продано на сумму").
create or replace function public.get_user_sales_summary(
  p_user uuid,
  p_category text default null,
  p_from date default null,
  p_to date default null
)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'count', count(*),
    'total_amount', coalesce(sum(s.amount), 0),
    'total_price', coalesce(sum(s.price), 0)
  )
  from public.sales s
  where s."user" = p_user
    and (p_category is null or s.position_category = p_category)
    and (p_from is null or s.created_at >= p_from)
    and (p_to is null or s.created_at < (p_to + 1));
$$;
grant execute on function public.get_user_sales_summary(uuid, text, date, date) to anon, authenticated, service_role;
