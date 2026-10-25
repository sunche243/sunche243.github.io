-- Add privacy-preserving Web Push notifications for authenticated administrators.
-- Apply only after the send-admin-push Edge Function and its VAPID secrets are ready.

begin;

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.admin_push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 1 and 4096),
  p256dh text not null check (char_length(p256dh) between 1 and 512),
  auth text not null check (char_length(auth) between 1 and 512),
  expiration_time bigint,
  user_agent text check (user_agent is null or char_length(user_agent) <= 512),
  enabled boolean not null default true,
  last_success_at timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists admin_push_subscriptions_user_id_idx
on public.admin_push_subscriptions (user_id);

drop trigger if exists admin_push_subscriptions_set_updated_at on public.admin_push_subscriptions;
create trigger admin_push_subscriptions_set_updated_at
before update on public.admin_push_subscriptions
for each row execute function public.set_updated_at();

create table if not exists public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('sponsorship', 'attendance', 'student_attendance')),
  title text not null check (char_length(title) between 1 and 120),
  body text not null check (char_length(body) between 1 and 240),
  target_url text not null check (
    char_length(target_url) between 1 and 500
    and target_url like '/accountingnight/admin/%'
  ),
  delivery_started_at timestamptz,
  delivered_at timestamptz,
  success_count integer not null default 0 check (success_count >= 0),
  failure_count integer not null default 0 check (failure_count >= 0),
  last_error text check (last_error is null or char_length(last_error) <= 1000),
  created_at timestamptz not null default now()
);

create index if not exists push_notification_events_pending_idx
on public.push_notification_events (created_at)
where delivered_at is null;

alter table public.admin_push_subscriptions enable row level security;
alter table public.push_notification_events enable row level security;

revoke all on table public.admin_push_subscriptions from public, anon, authenticated;
revoke all on table public.push_notification_events from public, anon, authenticated;

grant select, insert, update, delete on table public.admin_push_subscriptions to authenticated;

drop policy if exists admin_push_subscriptions_select_own on public.admin_push_subscriptions;
create policy admin_push_subscriptions_select_own
on public.admin_push_subscriptions for select
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.is_admin())
);

drop policy if exists admin_push_subscriptions_insert_own on public.admin_push_subscriptions;
create policy admin_push_subscriptions_insert_own
on public.admin_push_subscriptions for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and (select public.is_admin())
);

drop policy if exists admin_push_subscriptions_update_own on public.admin_push_subscriptions;
create policy admin_push_subscriptions_update_own
on public.admin_push_subscriptions for update
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.is_admin())
)
with check (
  user_id = (select auth.uid())
  and (select public.is_admin())
);

drop policy if exists admin_push_subscriptions_delete_own on public.admin_push_subscriptions;
create policy admin_push_subscriptions_delete_own
on public.admin_push_subscriptions for delete
to authenticated
using (
  user_id = (select auth.uid())
  and (select public.is_admin())
);

create or replace function private.queue_admin_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_category text;
  v_title text;
  v_body text;
  v_target_url text;
begin
  -- Administrator edits use separate authenticated operations and must not create alerts.
  if public.is_admin() then
    return new;
  end if;

  case tg_table_name
    when 'submissions' then
      v_category := 'sponsorship';
      v_title := '새 발전기금·참석 회신';
      v_body := '새 후원 또는 참석 회신이 접수되었습니다.';
      v_target_url := '/accountingnight/admin/?tab=submissions';
    when 'attendance_responses' then
      v_category := 'attendance';
      v_title := '새 참석 여부 회신';
      v_body := '졸업생 또는 내외빈의 참석 회신이 접수되었습니다.';
      v_target_url := '/accountingnight/admin/?tab=attendance';
    when 'student_attendance_responses' then
      v_category := 'student_attendance';
      v_title := '새 재학생 참석 회신';
      v_body := '재학생 참석 회신이 접수되었습니다.';
      v_target_url := '/accountingnight/admin/?tab=student';
    else
      return new;
  end case;

  insert into public.push_notification_events (category, title, body, target_url)
  values (v_category, v_title, v_body, v_target_url);

  return new;
end;
$$;

revoke all on function private.queue_admin_push_notification() from public, anon, authenticated;

drop trigger if exists submissions_queue_admin_push on public.submissions;
create trigger submissions_queue_admin_push
after insert on public.submissions
for each row execute function private.queue_admin_push_notification();

drop trigger if exists attendance_responses_queue_admin_push on public.attendance_responses;
create trigger attendance_responses_queue_admin_push
after insert or update on public.attendance_responses
for each row execute function private.queue_admin_push_notification();

drop trigger if exists student_attendance_responses_queue_admin_push on public.student_attendance_responses;
create trigger student_attendance_responses_queue_admin_push
after insert or update on public.student_attendance_responses
for each row execute function private.queue_admin_push_notification();

create or replace function private.dispatch_admin_push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_dispatch_secret text;
begin
  select decrypted_secret
  into v_dispatch_secret
  from vault.decrypted_secrets
  where name = 'accountingnight_web_push_dispatch_secret'
  limit 1;

  if v_dispatch_secret is null then
    raise exception 'Web Push dispatch secret is not configured';
  end if;

  perform net.http_post(
    url := 'https://nwobpivpkokwpbmyhoeq.supabase.co/functions/v1/send-admin-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_dispatch_secret
    ),
    body := jsonb_build_object('event_id', new.id),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

revoke all on function private.dispatch_admin_push_notification() from public, anon, authenticated;

drop trigger if exists push_notification_events_dispatch on public.push_notification_events;
create trigger push_notification_events_dispatch
after insert on public.push_notification_events
for each row execute function private.dispatch_admin_push_notification();

commit;
