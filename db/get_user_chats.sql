-- Chat list for a user, assembled server-side in one call (fixes the client
-- fan-out that broke for users with many chats: 112+ chat ids in a single
-- PostgREST in.(...) filter overflowed the request URL).
-- Returns a jsonb array shaped exactly like the app's ChatListItem.
create or replace function public.get_user_chats(p_user_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with my_chats as (
    select c.id, c.users, c.read, c.title, c.is_group, c.sort_date
    from public.chats c
    where p_user_id = any(c.users)
    order by c.sort_date desc nulls last
    limit 300
  ),
  last_msg as (
    select distinct on (m.chat) m.chat, m.text, m.created_at
    from public.messages m
    where m.chat in (select id from my_chats)
    order by m.chat, m.created_at desc
  ),
  other as (
    select mc.id as chat_id, u."Name" as name, u."Photo" as photo
    from my_chats mc
    join lateral (
      select uid from unnest(mc.users) uid where uid <> p_user_id limit 1
    ) o(uid) on true
    join public.users u on u.id = o.uid
    where not coalesce(mc.is_group, false)
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', mc.id,
        'title', case when coalesce(mc.is_group, false) then coalesce(mc.title, 'Группа')
                      else coalesce(o.name, 'Диалог') end,
        'photo', case when coalesce(mc.is_group, false) then null else o.photo end,
        'isGroup', coalesce(mc.is_group, false),
        'lastMessageText', lm.text,
        'lastMessageAt', lm.created_at,
        'unread', not (p_user_id = any(coalesce(mc.read, '{}'::uuid[])))
      )
      order by mc.sort_date desc nulls last
    ),
    '[]'::jsonb
  )
  from my_chats mc
  left join last_msg lm on lm.chat = mc.id
  left join other o on o.chat_id = mc.id;
$$;
grant execute on function public.get_user_chats(uuid) to anon, authenticated, service_role;
