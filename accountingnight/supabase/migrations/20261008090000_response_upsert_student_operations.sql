-- Keep one current response per phone number without deleting historical rows,
-- and add the operational fields needed for student selection management.

begin;

alter table public.attendance_responses
  add column if not exists superseded_at timestamptz;

alter table public.student_attendance_responses
  add column if not exists superseded_at timestamptz,
  add column if not exists student_council_fee_status text not null default 'unverified',
  add column if not exists selection_status text not null default 'pending',
  add column if not exists waitlist_order integer,
  add column if not exists participation_fee_status text not null default 'not_applicable',
  add column if not exists contacted_at timestamptz,
  add column if not exists admin_memo text not null default '';

alter table public.student_attendance_responses
  alter column student_council_experience drop not null,
  alter column selection_criteria_consent_at drop not null;

alter table public.student_attendance_responses
  drop constraint if exists student_attendance_responses_council_details_check,
  drop constraint if exists student_attendance_responses_council_fee_status_check,
  drop constraint if exists student_attendance_responses_selection_status_check,
  drop constraint if exists student_attendance_responses_waitlist_order_check,
  drop constraint if exists student_attendance_responses_participation_fee_status_check,
  drop constraint if exists student_attendance_responses_admin_memo_check,
  drop constraint if exists student_attendance_responses_attending_contract_check;

alter table public.student_attendance_responses
  add constraint student_attendance_responses_council_details_check check (
    (
      student_council_experience is true
      and student_council_details is not null
      and char_length(btrim(student_council_details)) between 1 and 500
    )
    or (
      student_council_experience is false
      and student_council_details is null
    )
    or (
      student_council_experience is null
      and student_council_details is null
    )
  ),
  add constraint student_attendance_responses_council_fee_status_check check (
    student_council_fee_status in ('unverified', 'paid', 'unpaid', 'not_applicable')
  ),
  add constraint student_attendance_responses_selection_status_check check (
    selection_status in ('pending', 'selected', 'waitlisted', 'not_selected', 'cancelled', 'not_applicable')
  ),
  add constraint student_attendance_responses_waitlist_order_check check (
    (selection_status = 'waitlisted' and waitlist_order is not null and waitlist_order > 0)
    or (selection_status <> 'waitlisted' and waitlist_order is null)
  ),
  add constraint student_attendance_responses_participation_fee_status_check check (
    participation_fee_status in ('not_applicable', 'unpaid', 'paid', 'refund_pending', 'refunded')
  ),
  add constraint student_attendance_responses_admin_memo_check check (
    char_length(admin_memo) <= 2000
  );

update public.student_attendance_responses
set
  student_council_fee_status = case
    when attendance_status = 'attending' then 'unverified'
    else 'not_applicable'
  end,
  selection_status = case
    when attendance_status = 'attending' then 'pending'
    else 'not_applicable'
  end,
  waitlist_order = null,
  participation_fee_status = 'not_applicable'
where
  student_council_fee_status = 'unverified'
  and selection_status = 'pending'
  and waitlist_order is null
  and participation_fee_status = 'not_applicable';

-- Keep legacy rows as-is while enforcing the current application contract for
-- newly inserted or subsequently edited rows.
alter table public.student_attendance_responses
  add constraint student_attendance_responses_attending_contract_check check (
    attendance_status <> 'attending'
    or (
      admission_year is not null
      and admission_year <> '26'
      and student_council_experience is not null
      and student_council_fee_status in ('unverified', 'paid', 'unpaid')
      and selection_criteria_consent_at is not null
    )
  ) not valid;

with ranked as (
  select
    id,
    row_number() over (
      partition by phone
      order by updated_at desc, created_at desc, id desc
    ) as response_rank
  from public.attendance_responses
  where superseded_at is null
)
update public.attendance_responses as response
set superseded_at = now()
from ranked
where response.id = ranked.id
  and ranked.response_rank > 1;

with ranked as (
  select
    id,
    row_number() over (
      partition by phone
      order by updated_at desc, created_at desc, id desc
    ) as response_rank
  from public.student_attendance_responses
  where superseded_at is null
)
update public.student_attendance_responses as response
set superseded_at = now()
from ranked
where response.id = ranked.id
  and ranked.response_rank > 1;

create unique index if not exists attendance_responses_current_phone_uidx
on public.attendance_responses (phone)
where superseded_at is null;

create unique index if not exists student_attendance_responses_current_phone_uidx
on public.student_attendance_responses (phone)
where superseded_at is null;

create index if not exists student_attendance_responses_selection_status_idx
on public.student_attendance_responses (selection_status)
where superseded_at is null;

create or replace function public.submit_attendance_response(
  p_name text,
  p_phone text,
  p_admission_year text,
  p_affiliation text,
  p_attendance_status text,
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
  v_response_id uuid;
  v_phone text;
  v_admission_year text;
  v_affiliation text;
begin
  if coalesce(btrim(p_website), '') <> '' then
    raise exception 'Invalid request';
  end if;

  if p_started_at is null or p_started_at > now() or p_started_at > now() - interval '2 seconds' then
    raise exception 'Please wait before submitting';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'Invalid name';
  end if;

  if coalesce(btrim(p_phone), '') !~ '^(010[0-9]{8}|010-[0-9]{4}-[0-9]{4})$' then
    raise exception 'Invalid phone';
  end if;
  v_phone := replace(btrim(p_phone), '-', '');

  v_admission_year := nullif(btrim(coalesce(p_admission_year, '')), '');
  if v_admission_year is not null and v_admission_year !~ '^[0-9]{2}$' then
    raise exception 'Invalid admission year';
  end if;

  v_affiliation := nullif(btrim(coalesce(p_affiliation, '')), '');
  if v_affiliation is not null and char_length(v_affiliation) > 200 then
    raise exception 'Invalid affiliation';
  end if;

  if p_attendance_status is null or p_attendance_status not in ('attending', 'not_attending') then
    raise exception 'Invalid attendance status';
  end if;

  if p_privacy_consent is distinct from true then
    raise exception 'Privacy consent is required';
  end if;

  insert into public.attendance_responses as existing (
    name,
    phone,
    admission_year,
    affiliation,
    attendance_status,
    privacy_consent_at,
    superseded_at
  ) values (
    btrim(p_name),
    v_phone,
    v_admission_year,
    v_affiliation,
    p_attendance_status,
    now(),
    null
  )
  on conflict (phone) where superseded_at is null do update
  set
    name = excluded.name,
    admission_year = excluded.admission_year,
    affiliation = excluded.affiliation,
    attendance_status = excluded.attendance_status,
    privacy_consent_at = excluded.privacy_consent_at
  returning id into v_response_id;

  return v_response_id;
end;
$$;

drop function if exists public.submit_student_attendance_response(
  text, text, text, boolean, text, text, boolean, boolean, text, timestamptz
);

create function public.submit_student_attendance_response(
  p_name text,
  p_phone text,
  p_admission_year text,
  p_student_council_experience boolean,
  p_student_council_details text,
  p_student_council_fee_paid boolean,
  p_attendance_status text,
  p_privacy_consent boolean,
  p_selection_criteria_consent boolean,
  p_website text,
  p_started_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_response_id uuid;
  v_phone text;
  v_admission_year text;
  v_student_council_experience boolean;
  v_student_council_details text;
  v_student_council_fee_status text;
  v_selection_criteria_consent_at timestamptz;
begin
  if coalesce(btrim(p_website), '') <> '' then
    raise exception 'Invalid request';
  end if;

  if p_started_at is null or p_started_at > now() or p_started_at > now() - interval '2 seconds' then
    raise exception 'Please wait before submitting';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'Invalid name';
  end if;

  if coalesce(btrim(p_phone), '') !~ '^(010[0-9]{8}|010-[0-9]{4}-[0-9]{4})$' then
    raise exception 'Invalid phone';
  end if;
  v_phone := replace(btrim(p_phone), '-', '');

  if p_attendance_status is null or p_attendance_status not in ('attending', 'not_attending') then
    raise exception 'Invalid attendance status';
  end if;

  if p_privacy_consent is distinct from true then
    raise exception 'Privacy consent is required';
  end if;

  if p_attendance_status = 'attending' then
    v_admission_year := nullif(btrim(coalesce(p_admission_year, '')), '');
    if v_admission_year is null or v_admission_year !~ '^[0-9]{2}$' then
      raise exception 'Admission year is required';
    end if;
    if v_admission_year = '26' then
      raise exception 'First-year students are not eligible';
    end if;

    if p_student_council_experience is null then
      raise exception 'Student council experience is required';
    end if;
    v_student_council_experience := p_student_council_experience;
    v_student_council_details := nullif(btrim(coalesce(p_student_council_details, '')), '');
    if v_student_council_experience
      and (v_student_council_details is null or char_length(v_student_council_details) > 500) then
      raise exception 'Invalid student council details';
    end if;
    if not v_student_council_experience then
      v_student_council_details := null;
    end if;

    if p_student_council_fee_paid is null then
      raise exception 'Student council fee status is required';
    end if;
    v_student_council_fee_status := case when p_student_council_fee_paid then 'paid' else 'unpaid' end;

    if p_selection_criteria_consent is distinct from true then
      raise exception 'Selection criteria consent is required';
    end if;
    v_selection_criteria_consent_at := now();
  else
    v_admission_year := null;
    v_student_council_experience := null;
    v_student_council_details := null;
    v_student_council_fee_status := 'not_applicable';
    v_selection_criteria_consent_at := null;
  end if;

  insert into public.student_attendance_responses as existing (
    name,
    phone,
    admission_year,
    student_council_experience,
    student_council_details,
    student_council_fee_status,
    attendance_status,
    privacy_consent_at,
    selection_criteria_consent_at,
    selection_status,
    waitlist_order,
    participation_fee_status,
    superseded_at
  ) values (
    btrim(p_name),
    v_phone,
    v_admission_year,
    v_student_council_experience,
    v_student_council_details,
    v_student_council_fee_status,
    p_attendance_status,
    now(),
    v_selection_criteria_consent_at,
    case when p_attendance_status = 'attending' then 'pending' else 'not_applicable' end,
    null,
    'not_applicable',
    null
  )
  on conflict (phone) where superseded_at is null do update
  set
    name = excluded.name,
    admission_year = excluded.admission_year,
    student_council_experience = excluded.student_council_experience,
    student_council_details = excluded.student_council_details,
    student_council_fee_status = excluded.student_council_fee_status,
    attendance_status = excluded.attendance_status,
    privacy_consent_at = excluded.privacy_consent_at,
    selection_criteria_consent_at = excluded.selection_criteria_consent_at,
    selection_status = case
      when excluded.attendance_status = 'not_attending'
        and existing.attendance_status = 'attending' then 'cancelled'
      when excluded.attendance_status = 'not_attending' then existing.selection_status
      when existing.attendance_status = 'not_attending' then 'pending'
      else existing.selection_status
    end,
    waitlist_order = case
      when excluded.attendance_status = 'not_attending'
        or existing.attendance_status = 'not_attending' then null
      else existing.waitlist_order
    end,
    participation_fee_status = case
      when excluded.attendance_status = 'not_attending'
        and existing.participation_fee_status = 'paid' then 'refund_pending'
      when excluded.attendance_status = 'not_attending'
        and existing.participation_fee_status in ('refund_pending', 'refunded')
        then existing.participation_fee_status
      when excluded.attendance_status = 'not_attending' then 'not_applicable'
      when existing.attendance_status = 'not_attending' then 'not_applicable'
      else existing.participation_fee_status
    end,
    contacted_at = case
      when existing.attendance_status = 'not_attending'
        and excluded.attendance_status = 'attending' then null
      else existing.contacted_at
    end
  returning id into v_response_id;

  return v_response_id;
end;
$$;

drop function if exists public.update_student_attendance_response(
  uuid, text, text, text, boolean, text, text
);

create function public.update_student_attendance_response(
  p_id uuid,
  p_name text,
  p_phone text,
  p_admission_year text,
  p_student_council_experience boolean,
  p_student_council_details text,
  p_student_council_fee_status text,
  p_attendance_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.student_attendance_responses%rowtype;
  v_phone text;
  v_admission_year text;
  v_student_council_experience boolean;
  v_student_council_details text;
  v_student_council_fee_status text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select * into v_existing
  from public.student_attendance_responses
  where id = p_id and superseded_at is null
  for update;
  if not found then
    raise exception 'Student attendance response not found' using errcode = 'P0002';
  end if;

  if p_name is null or char_length(btrim(p_name)) not between 1 and 80 then
    raise exception 'Invalid name';
  end if;
  if coalesce(btrim(p_phone), '') !~ '^(010[0-9]{8}|010-[0-9]{4}-[0-9]{4})$' then
    raise exception 'Invalid phone';
  end if;
  v_phone := replace(btrim(p_phone), '-', '');

  if p_attendance_status is null or p_attendance_status not in ('attending', 'not_attending') then
    raise exception 'Invalid attendance status';
  end if;

  if p_attendance_status = 'attending' then
    v_admission_year := nullif(btrim(coalesce(p_admission_year, '')), '');
    if v_admission_year is null or v_admission_year !~ '^[0-9]{2}$' then
      raise exception 'Admission year is required';
    end if;
    if v_admission_year = '26' then
      raise exception 'First-year students are not eligible';
    end if;
    if p_student_council_experience is null then
      raise exception 'Student council experience is required';
    end if;
    v_student_council_experience := p_student_council_experience;
    v_student_council_details := nullif(btrim(coalesce(p_student_council_details, '')), '');
    if v_student_council_experience
      and (v_student_council_details is null or char_length(v_student_council_details) > 500) then
      raise exception 'Invalid student council details';
    end if;
    if not v_student_council_experience then
      v_student_council_details := null;
    end if;
    if p_student_council_fee_status not in ('unverified', 'paid', 'unpaid') then
      raise exception 'Invalid student council fee status';
    end if;
    v_student_council_fee_status := p_student_council_fee_status;
    if v_existing.attendance_status = 'not_attending'
      and v_existing.selection_criteria_consent_at is null then
      raise exception 'Selection criteria consent is required; ask the student to resubmit';
    end if;
  else
    v_admission_year := null;
    v_student_council_experience := null;
    v_student_council_details := null;
    v_student_council_fee_status := 'not_applicable';
  end if;

  update public.student_attendance_responses
  set
    name = btrim(p_name),
    phone = v_phone,
    admission_year = v_admission_year,
    student_council_experience = v_student_council_experience,
    student_council_details = v_student_council_details,
    student_council_fee_status = v_student_council_fee_status,
    attendance_status = p_attendance_status,
    selection_status = case
      when p_attendance_status = 'not_attending'
        and v_existing.attendance_status = 'attending' then 'cancelled'
      when p_attendance_status = 'attending'
        and v_existing.attendance_status = 'not_attending' then 'pending'
      else v_existing.selection_status
    end,
    waitlist_order = case
      when p_attendance_status <> v_existing.attendance_status then null
      else v_existing.waitlist_order
    end,
    participation_fee_status = case
      when p_attendance_status = 'not_attending'
        and v_existing.participation_fee_status = 'paid' then 'refund_pending'
      when p_attendance_status = 'not_attending'
        and v_existing.participation_fee_status in ('refund_pending', 'refunded')
        then v_existing.participation_fee_status
      when p_attendance_status = 'not_attending' then 'not_applicable'
      when v_existing.attendance_status = 'not_attending' then 'not_applicable'
      else v_existing.participation_fee_status
    end,
    contacted_at = case
      when p_attendance_status = 'attending'
        and v_existing.attendance_status = 'not_attending' then null
      else v_existing.contacted_at
    end
  where id = p_id and superseded_at is null;
end;
$$;

create or replace function public.update_student_selection_management(
  p_id uuid,
  p_student_council_fee_status text,
  p_selection_status text,
  p_waitlist_order integer,
  p_participation_fee_status text,
  p_contacted boolean,
  p_admin_memo text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attendance_status text;
  v_admin_memo text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  select attendance_status into v_attendance_status
  from public.student_attendance_responses
  where id = p_id and superseded_at is null
  for update;
  if not found then
    raise exception 'Student attendance response not found' using errcode = 'P0002';
  end if;

  if p_contacted is null then
    raise exception 'Contact status is required';
  end if;
  v_admin_memo := btrim(coalesce(p_admin_memo, ''));
  if char_length(v_admin_memo) > 2000 then
    raise exception 'Admin memo is too long';
  end if;

  if v_attendance_status = 'not_attending' then
    if p_student_council_fee_status <> 'not_applicable'
      or p_selection_status not in ('cancelled', 'not_applicable')
      or p_waitlist_order is not null
      or p_participation_fee_status not in ('not_applicable', 'refund_pending', 'refunded') then
      raise exception 'Invalid management state for a non-attending response';
    end if;
  else
    if p_student_council_fee_status not in ('unverified', 'paid', 'unpaid') then
      raise exception 'Invalid student council fee status';
    end if;
    if p_selection_status not in ('pending', 'selected', 'waitlisted', 'not_selected', 'cancelled') then
      raise exception 'Invalid selection status';
    end if;
    if (p_selection_status = 'waitlisted' and (p_waitlist_order is null or p_waitlist_order <= 0))
      or (p_selection_status <> 'waitlisted' and p_waitlist_order is not null) then
      raise exception 'Invalid waitlist order';
    end if;
    if p_selection_status = 'selected'
      and p_participation_fee_status not in ('unpaid', 'paid') then
      raise exception 'Selected students require a participation fee status';
    end if;
    if p_selection_status = 'cancelled'
      and p_participation_fee_status not in ('not_applicable', 'refund_pending', 'refunded') then
      raise exception 'Invalid cancellation fee status';
    end if;
    if p_selection_status not in ('selected', 'cancelled')
      and p_participation_fee_status <> 'not_applicable' then
      raise exception 'Participation fee does not apply to this selection status';
    end if;
  end if;

  update public.student_attendance_responses
  set
    student_council_fee_status = p_student_council_fee_status,
    selection_status = p_selection_status,
    waitlist_order = p_waitlist_order,
    participation_fee_status = p_participation_fee_status,
    contacted_at = case
      when p_contacted then coalesce(contacted_at, now())
      else null
    end,
    admin_memo = v_admin_memo
  where id = p_id and superseded_at is null;
end;
$$;

revoke all on function public.submit_attendance_response(
  text, text, text, text, text, boolean, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.submit_attendance_response(
  text, text, text, text, text, boolean, text, timestamptz
) to anon, authenticated;

revoke all on function public.submit_student_attendance_response(
  text, text, text, boolean, text, boolean, text, boolean, boolean, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.submit_student_attendance_response(
  text, text, text, boolean, text, boolean, text, boolean, boolean, text, timestamptz
) to anon, authenticated;

revoke all on function public.update_student_attendance_response(
  uuid, text, text, text, boolean, text, text, text
) from public, anon, authenticated;
grant execute on function public.update_student_attendance_response(
  uuid, text, text, text, boolean, text, text, text
) to authenticated;

revoke all on function public.update_student_selection_management(
  uuid, text, text, integer, text, boolean, text
) from public, anon, authenticated;
grant execute on function public.update_student_selection_management(
  uuid, text, text, integer, text, boolean, text
) to authenticated;

commit;
