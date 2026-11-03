-- Store post-event sponsorship pledges without falsely classifying attendance.

begin;

alter table public.submissions
  add constraint submissions_pledge_option_candidate_check
  check (
    pledge_option in (
      'century_100',
      'guardian_50',
      'free_attending',
      'free_absent',
      'absent_only',
      'donation_only',
      'legacy_units',
      'legacy_no_pledge'
    )
  ) not valid;

alter table public.submissions
  add constraint submissions_pledge_consistency_candidate_check
  check (
    (pledge_option = 'century_100' and pledge_amount = 1000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 2)
    or (pledge_option = 'guardian_50' and pledge_amount = 500000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 1)
    or (pledge_option = 'free_attending' and pledge_amount between 1000000 and 10000000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'free_absent' and pledge_amount between 1 and 10000000000 and attendance_status = 'not_attending' and wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'absent_only' and pledge_amount = 0 and attendance_status = 'not_attending' and not wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'donation_only' and pledge_amount between 1 and 10000000000 and attendance_status = 'undecided' and wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'legacy_units' and pledge_amount = sponsorship_units::bigint * 500000 and wants_sponsorship and sponsorship_units between 1 and 100)
    or (pledge_option = 'legacy_no_pledge' and pledge_amount = 0 and not wants_sponsorship and sponsorship_units = 0)
  ) not valid;

alter table public.submissions validate constraint submissions_pledge_option_candidate_check;
alter table public.submissions validate constraint submissions_pledge_consistency_candidate_check;

alter table public.submissions drop constraint submissions_pledge_option_check;
alter table public.submissions drop constraint submissions_pledge_consistency_check;

alter table public.submissions
  rename constraint submissions_pledge_option_candidate_check to submissions_pledge_option_check;
alter table public.submissions
  rename constraint submissions_pledge_consistency_candidate_check to submissions_pledge_consistency_check;

create or replace function public.submit_sponsorship_only(
  p_name text,
  p_phone text,
  p_pledge_amount bigint,
  p_answers jsonb,
  p_privacy_consent boolean,
  p_website text,
  p_started_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_submission_id uuid;
begin
  v_submission_id := public.submit_sponsorship(
    p_name,
    p_phone,
    'free_absent',
    p_pledge_amount,
    'not_attending',
    p_answers,
    p_privacy_consent,
    p_website,
    p_started_at
  );

  update public.submissions
  set
    pledge_option = 'donation_only',
    attendance_status = 'undecided'
  where id = v_submission_id;

  return v_submission_id;
end;
$$;

revoke all on function public.submit_sponsorship_only(text, text, bigint, jsonb, boolean, text, timestamptz) from public;
grant execute on function public.submit_sponsorship_only(text, text, bigint, jsonb, boolean, text, timestamptz) to anon, authenticated;

commit;
