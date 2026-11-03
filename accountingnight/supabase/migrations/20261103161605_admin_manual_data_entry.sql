-- Allow authenticated administrators to add incomplete historical/manual responses
-- without weakening validation for any public submission RPC.

begin;

alter table public.submissions
  add column created_by_admin uuid;
alter table public.attendance_responses
  add column created_by_admin uuid;
alter table public.student_attendance_responses
  add column created_by_admin uuid;

alter table public.submissions
  alter column name drop not null,
  alter column phone drop not null,
  alter column pledge_option drop not null,
  alter column pledge_amount drop not null,
  alter column privacy_consent_at drop not null;

alter table public.attendance_responses
  alter column name drop not null,
  alter column phone drop not null,
  alter column attendance_status drop not null,
  alter column privacy_consent_at drop not null;

alter table public.student_attendance_responses
  alter column name drop not null,
  alter column phone drop not null,
  alter column attendance_status drop not null,
  alter column privacy_consent_at drop not null;

alter table public.submissions
  add constraint submissions_public_required_fields_check
  check (
    created_by_admin is not null
    or (
      name is not null
      and phone is not null
      and pledge_option is not null
      and pledge_amount is not null
      and privacy_consent_at is not null
    )
  ) not valid;

alter table public.attendance_responses
  add constraint attendance_responses_public_required_fields_check
  check (
    created_by_admin is not null
    or (
      name is not null
      and phone is not null
      and attendance_status is not null
      and privacy_consent_at is not null
    )
  ) not valid;

alter table public.student_attendance_responses
  add constraint student_attendance_responses_public_required_fields_check
  check (
    created_by_admin is not null
    or (
      name is not null
      and phone is not null
      and attendance_status is not null
      and privacy_consent_at is not null
    )
  ) not valid;

alter table public.submissions
  add constraint submissions_pledge_consistency_admin_candidate_check
  check (
    created_by_admin is not null
    or (
      (pledge_option = 'century_100' and pledge_amount = 1000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 2)
      or (pledge_option = 'guardian_50' and pledge_amount = 500000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 1)
      or (pledge_option = 'free_attending' and pledge_amount between 1000000 and 10000000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 0)
      or (pledge_option = 'free_absent' and pledge_amount between 1 and 10000000000 and attendance_status = 'not_attending' and wants_sponsorship and sponsorship_units = 0)
      or (pledge_option = 'absent_only' and pledge_amount = 0 and attendance_status = 'not_attending' and not wants_sponsorship and sponsorship_units = 0)
      or (pledge_option = 'donation_only' and pledge_amount between 1 and 10000000000 and attendance_status = 'undecided' and wants_sponsorship and sponsorship_units = 0)
      or (pledge_option = 'legacy_units' and pledge_amount = sponsorship_units::bigint * 500000 and wants_sponsorship and sponsorship_units between 1 and 100)
      or (pledge_option = 'legacy_no_pledge' and pledge_amount = 0 and not wants_sponsorship and sponsorship_units = 0)
    )
  ) not valid;

alter table public.student_attendance_responses
  add constraint student_attendance_council_details_admin_candidate_check
  check (
    created_by_admin is not null
    or (
      (
        student_council_experience is true
        and student_council_details is not null
        and char_length(btrim(student_council_details)) between 1 and 500
      )
      or (student_council_experience is false and student_council_details is null)
      or (student_council_experience is null and student_council_details is null)
    )
  ) not valid;

alter table public.student_attendance_responses
  add constraint student_attendance_contract_admin_candidate_check
  check (
    created_by_admin is not null
    or attendance_status <> 'attending'
    or (
      admission_year is not null
      and student_council_experience is not null
      and student_council_fee_status in ('unverified', 'paid', 'unpaid')
      and selection_criteria_consent_at is not null
    )
  ) not valid;

alter table public.submissions validate constraint submissions_public_required_fields_check;
alter table public.attendance_responses validate constraint attendance_responses_public_required_fields_check;
alter table public.student_attendance_responses validate constraint student_attendance_responses_public_required_fields_check;
alter table public.submissions validate constraint submissions_pledge_consistency_admin_candidate_check;
alter table public.student_attendance_responses validate constraint student_attendance_council_details_admin_candidate_check;
alter table public.student_attendance_responses validate constraint student_attendance_contract_admin_candidate_check;

alter table public.submissions drop constraint submissions_pledge_consistency_check;
alter table public.submissions
  rename constraint submissions_pledge_consistency_admin_candidate_check to submissions_pledge_consistency_check;

alter table public.student_attendance_responses
  drop constraint student_attendance_responses_council_details_check;
alter table public.student_attendance_responses
  rename constraint student_attendance_council_details_admin_candidate_check
  to student_attendance_responses_council_details_check;

alter table public.student_attendance_responses
  drop constraint student_attendance_responses_attending_contract_check;
alter table public.student_attendance_responses
  rename constraint student_attendance_contract_admin_candidate_check
  to student_attendance_responses_attending_contract_check;

create or replace function public.create_admin_response(
  p_response_type text,
  p_name text,
  p_phone text,
  p_admission_year text,
  p_affiliation text,
  p_pledge_amount bigint,
  p_attendance_status text,
  p_student_council_experience boolean,
  p_student_council_details text,
  p_student_council_fee_status text,
  p_admin_memo text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_admin_id uuid := (select auth.uid());
  v_response_id uuid;
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_phone text := nullif(replace(btrim(coalesce(p_phone, '')), '-', ''), '');
  v_admission_year text := nullif(btrim(coalesce(p_admission_year, '')), '');
  v_affiliation text := nullif(btrim(coalesce(p_affiliation, '')), '');
  v_attendance_status text := nullif(btrim(coalesce(p_attendance_status, '')), '');
  v_student_council_details text := nullif(btrim(coalesce(p_student_council_details, '')), '');
  v_student_council_fee_status text := nullif(btrim(coalesce(p_student_council_fee_status, '')), '');
  v_admin_memo text := nullif(btrim(coalesce(p_admin_memo, '')), '');
  v_answers jsonb := '{}'::jsonb;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if p_response_type is null or p_response_type not in ('sponsorship', 'attendance', 'student') then
    raise exception 'Invalid response type';
  end if;
  if v_name is not null and char_length(v_name) > 80 then
    raise exception 'Invalid name';
  end if;
  if v_phone is not null and v_phone !~ '^010[0-9]{8}$' then
    raise exception 'Invalid phone';
  end if;
  if v_admission_year is not null and v_admission_year !~ '^[0-9]{2}$' then
    raise exception 'Invalid admission year';
  end if;
  if v_affiliation is not null and char_length(v_affiliation) > 200 then
    raise exception 'Invalid affiliation';
  end if;
  if p_pledge_amount is not null and p_pledge_amount not between 0 and 10000000000 then
    raise exception 'Invalid pledge amount';
  end if;
  if v_attendance_status is not null and v_attendance_status not in ('attending', 'not_attending') then
    raise exception 'Invalid attendance status';
  end if;
  if v_student_council_details is not null and char_length(v_student_council_details) > 500 then
    raise exception 'Invalid student council details';
  end if;
  if v_student_council_fee_status is not null
    and v_student_council_fee_status not in ('unverified', 'paid', 'unpaid', 'not_applicable') then
    raise exception 'Invalid student council fee status';
  end if;
  if v_admin_memo is not null and char_length(v_admin_memo) > 2000 then
    raise exception 'Invalid admin memo';
  end if;

  if p_response_type = 'sponsorship' then
    if v_admission_year is not null then
      v_answers := v_answers || jsonb_build_object(
        'admin-admission-year',
        jsonb_build_object('label', '입학년도(학번)', 'value', v_admission_year)
      );
    end if;
    if v_affiliation is not null then
      v_answers := v_answers || jsonb_build_object(
        'admin-affiliation',
        jsonb_build_object('label', '현재 소속 및 직함', 'value', v_affiliation)
      );
    end if;

    insert into public.submissions (
      name, phone, wants_sponsorship, sponsorship_units, pledge_option,
      pledge_amount, attendance_status, answers, admin_memo,
      privacy_consent_at, created_by_admin
    ) values (
      v_name,
      v_phone,
      coalesce(p_pledge_amount > 0, false),
      0,
      case
        when p_pledge_amount is null then null
        when p_pledge_amount > 0 then 'donation_only'
        else 'legacy_no_pledge'
      end,
      p_pledge_amount,
      v_attendance_status,
      v_answers,
      coalesce(v_admin_memo, ''),
      null,
      v_admin_id
    )
    returning id into v_response_id;
  elsif p_response_type = 'attendance' then
    insert into public.attendance_responses (
      name, phone, admission_year, affiliation, attendance_status,
      privacy_consent_at, superseded_at, created_by_admin
    ) values (
      v_name, v_phone, v_admission_year, v_affiliation, v_attendance_status,
      null, null, v_admin_id
    )
    returning id into v_response_id;
  else
    insert into public.student_attendance_responses (
      name, phone, admission_year, student_council_experience,
      student_council_details, student_council_fee_status, attendance_status,
      privacy_consent_at, selection_criteria_consent_at, selection_status,
      waitlist_order, participation_fee_status, admin_memo, superseded_at,
      created_by_admin
    ) values (
      v_name,
      v_phone,
      v_admission_year,
      p_student_council_experience,
      case when p_student_council_experience is true then v_student_council_details else null end,
      coalesce(v_student_council_fee_status, 'unverified'),
      v_attendance_status,
      null,
      null,
      case when v_attendance_status = 'not_attending' then 'not_applicable' else 'pending' end,
      null,
      'not_applicable',
      coalesce(v_admin_memo, ''),
      null,
      v_admin_id
    )
    returning id into v_response_id;
  end if;

  return v_response_id;
end;
$$;

grant insert on table public.submissions to authenticated;
grant insert on table public.attendance_responses to authenticated;
grant insert on table public.student_attendance_responses to authenticated;

drop policy if exists submissions_admin_insert on public.submissions;
create policy submissions_admin_insert
on public.submissions for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by_admin = (select auth.uid())
);

drop policy if exists attendance_responses_admin_insert on public.attendance_responses;
create policy attendance_responses_admin_insert
on public.attendance_responses for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by_admin = (select auth.uid())
);

drop policy if exists student_attendance_responses_admin_insert on public.student_attendance_responses;
create policy student_attendance_responses_admin_insert
on public.student_attendance_responses for insert
to authenticated
with check (
  (select public.is_admin())
  and created_by_admin = (select auth.uid())
);

revoke all on function public.create_admin_response(
  text, text, text, text, text, bigint, text, boolean, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_admin_response(
  text, text, text, text, text, bigint, text, boolean, text, text, text
) to authenticated;

commit;
