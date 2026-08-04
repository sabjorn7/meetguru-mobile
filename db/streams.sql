-- Online live broadcasts ("Трансляции") — metadata table (SITE feature; app comes later).
--
-- ACCESS MODEL (Variant 1 — "stream as a hidden course"): a PAID stream is backed by a
-- hidden `course` row (created at stream-creation time, no slug / not «Опубликовано» → kept
-- out of the catalog by the existing catalog filters); `backing_course_id` links it. The
-- existing, proven purchase pipeline (n8n `BuyCourse`) is left 100% UNTOUCHED — it grants
-- access via a `user_course` row on the backing course, and the access check reuses the
-- normal course-membership check. FREE streams (price = 0) are open to everyone. No separate
-- `stream_access` table is needed. (Phase 1 handles FREE streams only; backing courses for
-- paid streams arrive in Phase 3.)
--
-- LIVE STATE is authoritative from PeerTube at view time (`GET /api/v1/videos/{id}` →
-- state.id: 4 = waiting for live, 1 = published/live, 5 = live ended). The `status` column
-- here is a lightweight cached flag the author flips to 'live' (v1: manual action) to fire
-- the "live_started" push (Phase 4).
--
-- SECURITY: the RTMP stream key is intentionally NOT stored here (RLS is off project-wide →
-- this table is world-readable, and a leaked key lets anyone hijack the broadcast). The author
-- is shown the RTMP url + key once at creation and can re-fetch it from the PeerTube live API
-- on demand. (Bounded anyway by SF-1 — the system token is currently public; see
-- SECURITY_FINDINGS.md.)

create table if not exists public.streams (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  author            uuid not null references public.users(id) on delete cascade,
  title             text not null,
  description       text not null default '',
  peertube_video_id uuid,                                   -- PeerTube live video uuid (player + video.state)
  price             numeric not null default 0,             -- 0 = free
  status            text not null default 'scheduled'
                      check (status in ('scheduled', 'live', 'ended')),
  scheduled_at      timestamptz,                            -- optional planned start (for the "скоро" state)
  cover_url         text,                                   -- optional manual thumbnail (a live has none until it starts)
  backing_course_id uuid references public.course(id) on delete set null  -- paid streams only (Variant 1)
);

create index if not exists streams_author_idx     on public.streams(author);
create index if not exists streams_status_idx     on public.streams(status);
create index if not exists streams_created_at_idx on public.streams(created_at desc);

-- Project-wide convention: RLS off, anon/authenticated hold full ACL (mirrors subscriptions,
-- user_course, and the other public tables the site/app read & write with the anon key).
grant all on public.streams to anon, authenticated, service_role;
