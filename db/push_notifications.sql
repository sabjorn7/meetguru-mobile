-- MeetGuru push notifications — DB layer (RPC lookups + triggers).
-- Sends {type,id} to the n8n workflow "meetguru-push" on new chat messages and
-- course purchases; n8n calls these RPCs and forwards the result to Expo Push.

-- 1) Push-token storage
create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token text not null unique,
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_id_idx on public.push_tokens(user_id);
grant all on public.push_tokens to anon, authenticated, service_role;

-- 2) Lookup RPC — chat message: recipients = chat members minus sender, with send_notif + a token
create or replace function public.push_targets_chat_message(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with m as (select id, chat, creator, text from public.messages where id = p_id),
  ch as (select c.id, c.users, c.title, c.is_group from public.chats c, m where c.id = m.chat),
  s as (select u."Name" as name from public.users u, m where u.id = m.creator),
  targets as (
    select pt.token,
      case when ch.is_group then coalesce(ch.title,'Чат')
           else coalesce(s.name,'Новое сообщение') end as title,
      case when ch.is_group then coalesce(s.name,'')||': '||coalesce(m.text,'')
           else coalesce(m.text,'') end as body,
      jsonb_build_object('type','chat_message','chatId',ch.id) as data
    from m cross join ch left join s on true
    cross join lateral unnest(ch.users) as rid
    join public.users u on u.id = rid and rid <> m.creator and coalesce(u.send_notif,true)
    join public.push_tokens pt on pt.user_id = rid
  )
  select jsonb_build_object('messages',
    coalesce(jsonb_agg(jsonb_build_object('to',token,'title',title,'body',body,'data',data)),'[]'::jsonb)
  ) from targets;
$$;
grant execute on function public.push_targets_chat_message(uuid) to anon, authenticated, service_role;

-- 3) Lookup RPC — course purchase: notify the seller (course.owner)
create or replace function public.push_targets_course_purchase(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with uc as (select course, "user" as buyer, buy from public.user_course where id = p_id),
  crs as (select c.id, c."owner" as seller, c."Title" as title from public.course c, uc where c.id = uc.course),
  b as (select u."Name" as name from public.users u, uc where u.id = uc.buyer),
  targets as (
    select pt.token,
      'Новая покупка' as title,
      coalesce((select name from b),'Пользователь')||' купил курс «'||coalesce(crs.title,'')||'»' as body,
      jsonb_build_object('type','course_purchase','courseId',crs.id) as data
    from uc cross join crs
    join public.users u on u.id = crs.seller and coalesce(u.send_notif,true)
    join public.push_tokens pt on pt.user_id = crs.seller
    where uc.buy is true and crs.seller is not null and crs.seller <> uc.buyer
  )
  select jsonb_build_object('messages',
    coalesce(jsonb_agg(jsonb_build_object('to',token,'title',title,'body',body,'data',data)),'[]'::jsonb)
  ) from targets;
$$;
grant execute on function public.push_targets_course_purchase(uuid) to anon, authenticated, service_role;

-- 4) Shared trigger helper: POST {type,id} to n8n via pg_net (async; never blocks the write)
create or replace function public.tg_notify_push()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  begin
    perform net.http_post(
      url := 'https://n8n.meetgu.ru/webhook/meetguru-push',
      headers := jsonb_build_object('Content-Type','application/json','X-Webhook-Secret','c537dd74de1c0c3a78714418958843f297a28db242b3b00629a459c83c30f2b2'),
      body := jsonb_build_object('type', TG_ARGV[0], 'id', NEW.id)
    );
  exception when others then
    raise warning 'tg_notify_push failed: %', SQLERRM;  -- never break the INSERT
  end;
  return NEW;
end;
$$;

-- 5) Triggers
drop trigger if exists on_message_notify on public.messages;
create trigger on_message_notify after insert on public.messages
  for each row execute function public.tg_notify_push('chat_message');

drop trigger if exists on_user_course_purchase_notify on public.user_course;
create trigger on_user_course_purchase_notify after insert on public.user_course
  for each row when (new.buy is true) execute function public.tg_notify_push('course_purchase');
