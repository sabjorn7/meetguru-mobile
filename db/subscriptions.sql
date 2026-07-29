-- MeetGuru subscriptions — follow a speaker / educational institution.
-- User-to-user follow (NOT the paid `club_subs` club membership). Shared by the
-- mobile app and the web site. Push-on-new-content is a later migration.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  subscriber uuid not null,   -- who follows (users.id)
  target     uuid not null,   -- who is followed (users.id — a speaker / institution)
  created_at timestamptz not null default now(),
  unique (subscriber, target) -- a user can follow a target at most once
);

create index if not exists subscriptions_subscriber_idx on public.subscriptions(subscriber);
create index if not exists subscriptions_target_idx on public.subscriptions(target);

-- RLS is off across the project; anon/authenticated read+write directly (mirrors
-- user_course, messages). Server-side enforcement is deferred to the security review.
grant all on public.subscriptions to anon, authenticated, service_role;
