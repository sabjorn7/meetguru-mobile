-- Phase 3 (paid streams): per-stream replay access duration.
-- The author picks 1 / 3 / 6 / 12 months in the create form. Access is counted FROM THE AIR
-- DATE (streams.scheduled_at, falling back to created_at), NOT from the purchase time — so the
-- gate computes expiry itself (air_date + access_months) rather than relying on the untouched
-- BuyCourse grant's purchase-based user_course.end_period. NULL for free streams.

alter table public.streams add column if not exists access_months integer;

comment on column public.streams.access_months is
  'Paid streams: months of replay access counted from the air date (scheduled_at, else created_at). NULL for free.';
