-- MeetGuru push — a broadcast went live ("live_started").
-- When a stream transitions to status 'live', notify the author's followers
-- (public.subscriptions.target = streams.author). Reuses the generic tg_notify_push()
-- helper and the n8n "meetguru-push" workflow (rpc = push_targets_<type>).
-- NOTE: also add 'live_started' to the n8n Router ALLOWED list (done separately).

-- 1) Lookup RPC — notify followers of streams.author that the stream is live.
create or replace function public.push_targets_live_started(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with st as (
    select s.id, s.author, s.title
    from public.streams s where s.id = p_id
  ),
  a as (select u."Name" as name from public.users u, st where u.id = st.author),
  targets as (
    select pt.token,
      'В эфире' as title,
      coalesce((select name from a),'Автор')||' начал эфир: «'||coalesce(st.title,'')||'»' as body,
      jsonb_build_object('type','live_started','stream_id',st.id) as data
    from st
    join public.subscriptions sub on sub.target = st.author
    join public.users u on u.id = sub.subscriber and coalesce(u.send_notif,true)
    join public.push_tokens pt on pt.user_id = sub.subscriber
    where st.author is not null
  )
  select jsonb_build_object('messages',
    coalesce(jsonb_agg(jsonb_build_object('to',token,'title',title,'body',body,'data',data)),'[]'::jsonb)
  ) from targets;
$$;
grant execute on function public.push_targets_live_started(uuid) to anon, authenticated, service_role;

-- 2) Triggers — fire on the transition INTO 'live'. The normal path is the author pressing
--    «Я в эфире» (scheduled -> live). The INSERT trigger covers a stream created already live.
--    Reuses tg_notify_push (SECURITY DEFINER, exception-safe → never blocks the write).

drop trigger if exists on_stream_live_insert on public.streams;
create trigger on_stream_live_insert after insert on public.streams
  for each row when (new.status = 'live')
  execute function public.tg_notify_push('live_started');

drop trigger if exists on_stream_live_update on public.streams;
create trigger on_stream_live_update after update on public.streams
  for each row when (old.status is distinct from 'live' and new.status = 'live')
  execute function public.tg_notify_push('live_started');
