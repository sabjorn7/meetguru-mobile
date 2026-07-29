-- MeetGuru push — new content from a followed author (subscriptions).
-- When a speaker/institution first publishes a course or article, notify their
-- followers (public.subscriptions). Reuses the generic tg_notify_push() helper
-- and the n8n "meetguru-push" workflow (rpc = push_targets_<type>).

-- 1) Lookup RPC — new course: notify followers of course.owner
create or replace function public.push_targets_new_course(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with crs as (
    select c.id, c."owner" as author, c."Title" as title, c.slug, c."ModStatus" as status
    from public.course c where c.id = p_id
  ),
  a as (select u."Name" as name from public.users u, crs where u.id = crs.author),
  targets as (
    select pt.token,
      'Новый курс' as title,
      coalesce((select name from a),'Автор')||': «'||coalesce(crs.title,'')||'»' as body,
      jsonb_build_object('type','new_course','slug',crs.slug) as data
    from crs
    join public.subscriptions s on s.target = crs.author
    join public.users u on u.id = s.subscriber and coalesce(u.send_notif,true)
    join public.push_tokens pt on pt.user_id = s.subscriber
    where crs.status = 'Опубликовано' and crs.author is not null
  )
  select jsonb_build_object('messages',
    coalesce(jsonb_agg(jsonb_build_object('to',token,'title',title,'body',body,'data',data)),'[]'::jsonb)
  ) from targets;
$$;
grant execute on function public.push_targets_new_course(uuid) to anon, authenticated, service_role;

-- 2) Lookup RPC — new article: notify followers of articles.Creator
create or replace function public.push_targets_new_article(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with art as (
    select a.id, a."Creator" as author, a."Title" as title, a.slug, a."Status" as status
    from public.articles a where a.id = p_id
  ),
  au as (select u."Name" as name from public.users u, art where u.id = art.author),
  targets as (
    select pt.token,
      'Новая статья' as title,
      coalesce((select name from au),'Автор')||': «'||coalesce(art.title,'')||'»' as body,
      jsonb_build_object('type','new_article','slug',art.slug) as data
    from art
    join public.subscriptions s on s.target = art.author
    join public.users u on u.id = s.subscriber and coalesce(u.send_notif,true)
    join public.push_tokens pt on pt.user_id = s.subscriber
    where art.status = 'Опубликовано' and art.author is not null
  )
  select jsonb_build_object('messages',
    coalesce(jsonb_agg(jsonb_build_object('to',token,'title',title,'body',body,'data',data)),'[]'::jsonb)
  ) from targets;
$$;
grant execute on function public.push_targets_new_article(uuid) to anon, authenticated, service_role;

-- 3) Triggers — fire on the transition INTO "Опубликовано" (once per first publish).
--    Existing already-published rows never fire (no transition). Reuses tg_notify_push.

-- course: created already published
drop trigger if exists on_course_publish_insert on public.course;
create trigger on_course_publish_insert after insert on public.course
  for each row when (new."ModStatus" = 'Опубликовано')
  execute function public.tg_notify_push('new_course');

-- course: draft/other -> published
drop trigger if exists on_course_publish_update on public.course;
create trigger on_course_publish_update after update on public.course
  for each row when (old."ModStatus" is distinct from 'Опубликовано' and new."ModStatus" = 'Опубликовано')
  execute function public.tg_notify_push('new_course');

-- article: created already published
drop trigger if exists on_article_publish_insert on public.articles;
create trigger on_article_publish_insert after insert on public.articles
  for each row when (new."Status" = 'Опубликовано')
  execute function public.tg_notify_push('new_article');

-- article: draft/other -> published
drop trigger if exists on_article_publish_update on public.articles;
create trigger on_article_publish_update after update on public.articles
  for each row when (old."Status" is distinct from 'Опубликовано' and new."Status" = 'Опубликовано')
  execute function public.tg_notify_push('new_article');
