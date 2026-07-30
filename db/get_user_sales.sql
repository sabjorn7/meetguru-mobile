-- Paginated seller sales for the my_finanse page (replaces the full-table collection).
-- Server-filtered to the caller's own sales, newest first, with limit/offset paging,
-- a totals aggregate, AND the buyer (name/email/id) resolved best-effort:
--   buyer = owner of the order whose course_positions contains this sale's `position`,
--   picking the order closest in time (disambiguates products sold more than once).
-- Subscription/manual sales with no matching order return a null buyer.
-- NOTE: this is a best-effort attribution (sales has no buyer column). For 100% accuracy
-- going forward, add a `buyer` uuid column to `sales` populated by the sale-creation flow.

create or replace function public.get_user_sales(p_user uuid, p_limit int default 100, p_offset int default 0)
returns jsonb language sql stable as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  from (
    select
      s.id,
      s.created_at,
      s.amount,
      s.price,
      s.position_name,
      s.position_category,
      s.status,
      s.back,
      b.id    as buyer_id,
      b."Name" as buyer_name,
      b.email  as buyer_email
    from (
      select *
      from public.sales
      where "user" = p_user
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
grant execute on function public.get_user_sales(uuid, int, int) to anon, authenticated, service_role;

-- Totals across ALL the seller's sales (for the "Продано на сумму" line — unaffected by paging).
create or replace function public.get_user_sales_summary(p_user uuid)
returns jsonb language sql stable as $$
  select jsonb_build_object(
    'count', count(*),
    'total_amount', coalesce(sum(s.amount), 0),
    'total_price', coalesce(sum(s.price), 0)
  )
  from public.sales s
  where s."user" = p_user;
$$;
grant execute on function public.get_user_sales_summary(uuid) to anon, authenticated, service_role;
