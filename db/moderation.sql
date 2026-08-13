-- UGC moderation tables (Apple Guideline 1.2 / Google Play UGC).
-- RLS is off project-wide, so the authenticated client reads/writes these directly.
-- Run this in the Supabase SQL editor.

-- A user blocking another user: the blocker no longer sees the blocked user's messages.
create table if not exists public.user_blocks (
  blocker    uuid        not null,
  blocked    uuid        not null,
  created_at timestamptz not null default now(),
  primary key (blocker, blocked)
);
create index if not exists user_blocks_blocker_idx on public.user_blocks (blocker);

-- Reports on user-generated content (a chat message, a whole stream, or a user).
create table if not exists public.stream_reports (
  id          uuid        primary key default gen_random_uuid(),
  reporter    uuid,
  target_type text        not null,          -- 'message' | 'stream' | 'user'
  target_id   text        not null,
  stream      uuid,
  reason      text,
  created_at  timestamptz not null default now()
);
create index if not exists stream_reports_created_idx on public.stream_reports (created_at desc);
