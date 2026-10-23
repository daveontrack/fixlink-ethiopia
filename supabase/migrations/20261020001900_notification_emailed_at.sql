-- =====================================================================
-- FixLink Ethiopia - 020: track the e-mail delivery of the notifications
-- =====================================================================
-- The database writes the in-app notifications; the server delivers them
-- by e-mail (Resend). This column records when a notification was sent,
-- so a delivery can be retried without sending the same e-mail twice.
-- =====================================================================

alter table public.notifications
  add column if not exists emailed_at timestamptz;

comment on column public.notifications.emailed_at is
  'When the notification was delivered by e-mail. NULL means not delivered yet.';
