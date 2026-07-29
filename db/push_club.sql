-- MeetGuru push — club activity (new post / new club-chat message).
-- Reuses the generic tg_notify_push() helper and the n8n "meetguru-push" workflow
-- (rpc = push_targets_<type>). Recipients = ACTIVE, non-expired club subscribers
-- (club_subs.active AND end_date in the future/null) with send_notif + a push token.

-- 1) New club post → notify active subscribers (excluding the club owner = author)
create or replace function public.push_targets_club_post(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with p as (select id, club, text from public.club_posts where id = p_id),
  c as (select cl.id, cl.title, cl."owner" as club_owner from public.clubs cl, p where cl.id = p.club),
  targets as (
    select distinct pt.token,
      coalesce((select title from c),'Клуб') as title,
      coalesce((select text from p),'Новая запись') as body,
      jsonb_build_object('type','club_post','clubId',(select club from p)) as data
    from p
    join public.club_subs cs on cs.club = p.club and cs.active = true
      and (cs.end_date is null or cs.end_date >= current_date)
      and cs.suber <> (select club_owner from c)
    join public.users u on u.id = cs.suber and coalesce(u.send_notif,true)
    join public.push_tokens pt on pt.user_id = cs.suber
  )
  select jsonb_build_object('messages',
    coalesce(jsonb_agg(jsonb_build_object('to',token,'title',title,'body',body,'data',data)),'[]'::jsonb)
  ) from targets;
$$;
grant execute on function public.push_targets_club_post(uuid) to anon, authenticated, service_role;

-- 2) New club-chat message → notify active subscribers except the sender
create or replace function public.push_targets_club_chat(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with m as (select id, club, text, "owner" as sender from public.club_chat where id = p_id),
  c as (select cl.title from public.clubs cl, m where cl.id = m.club),
  s as (select u."Name" as name from public.users u, m where u.id = m.sender),
  targets as (
    select distinct pt.token,
      coalesce((select title from c),'Клуб') as title,
      coalesce((select name from s),'')||': '||coalesce((select text from m),'') as body,
      jsonb_build_object('type','club_chat','clubId',(select club from m)) as data
    from m
    join public.club_subs cs on cs.club = m.club and cs.active = true
      and (cs.end_date is null or cs.end_date >= current_date)
      and cs.suber <> m.sender
    join public.users u on u.id = cs.suber and coalesce(u.send_notif,true)
    join public.push_tokens pt on pt.user_id = cs.suber
  )
  select jsonb_build_object('messages',
    coalesce(jsonb_agg(jsonb_build_object('to',token,'title',title,'body',body,'data',data)),'[]'::jsonb)
  ) from targets;
$$;
grant execute on function public.push_targets_club_chat(uuid) to anon, authenticated, service_role;

-- 3) Triggers (reuse the shared tg_notify_push helper → posts {type,id:NEW.id} to n8n)
drop trigger if exists on_club_post_notify on public.club_posts;
create trigger on_club_post_notify after insert on public.club_posts
  for each row execute function public.tg_notify_push('club_post');

drop trigger if exists on_club_chat_notify on public.club_chat;
create trigger on_club_chat_notify after insert on public.club_chat
  for each row when (new.deleted is not true)
  execute function public.tg_notify_push('club_chat');
