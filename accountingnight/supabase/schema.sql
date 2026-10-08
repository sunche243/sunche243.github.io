-- Dongguk Accounting 50th: sponsorship and attendance registration
-- Run this file in a new Supabase project's SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.form_fields (
  id uuid primary key default gen_random_uuid(),
  label text not null check (char_length(btrim(label)) between 1 and 120),
  type text not null check (type in ('text', 'number', 'tel', 'email', 'select', 'radio', 'checkbox', 'textarea')),
  required boolean not null default false,
  options jsonb not null default '[]'::jsonb check (jsonb_typeof(options) = 'array'),
  sort_order integer not null default 0 check (sort_order between -100000 and 100000),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    type not in ('select', 'radio')
    or jsonb_array_length(options) > 0
  )
);

create table if not exists public.submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^010[0-9]{8}$'),
  wants_sponsorship boolean not null default false,
  sponsorship_units integer not null default 0,
  pledge_option text not null,
  pledge_amount bigint not null,
  attendance_status text check (attendance_status in ('attending', 'not_attending', 'undecided')),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  status text not null default 'new' check (status in ('new', 'contacted', 'confirmed', 'cancelled')),
  admin_memo text not null default '' check (char_length(admin_memo) <= 5000),
  privacy_consent_at timestamptz not null,
  constraint submissions_sponsorship_units_check check (sponsorship_units between 0 and 100),
  constraint submissions_pledge_option_check check (
    pledge_option in (
      'century_100',
      'guardian_50',
      'free_attending',
      'free_absent',
      'absent_only',
      'legacy_units',
      'legacy_no_pledge'
    )
  ),
  constraint submissions_pledge_consistency_check check (
    (pledge_option = 'century_100' and pledge_amount = 1000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 2)
    or (pledge_option = 'guardian_50' and pledge_amount = 500000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 1)
    or (pledge_option = 'free_attending' and pledge_amount between 1000000 and 10000000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'free_absent' and pledge_amount between 1 and 10000000000 and attendance_status = 'not_attending' and wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'absent_only' and pledge_amount = 0 and attendance_status = 'not_attending' and not wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'legacy_units' and pledge_amount = sponsorship_units::bigint * 500000 and wants_sponsorship and sponsorship_units between 1 and 100)
    or (pledge_option = 'legacy_no_pledge' and pledge_amount = 0 and not wants_sponsorship and sponsorship_units = 0)
  )
);

create table if not exists public.attendance_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^010[0-9]{8}$'),
  admission_year text null check (admission_year is null or admission_year ~ '^[0-9]{2}$'),
  affiliation text null check (affiliation is null or char_length(affiliation) between 1 and 200),
  attendance_status text not null check (attendance_status in ('attending', 'not_attending')),
  privacy_consent_at timestamptz not null,
  superseded_at timestamptz
);

create table if not exists public.student_attendance_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^010[0-9]{8}$'),
  admission_year text null check (admission_year is null or admission_year ~ '^[0-9]{2}$'),
  student_council_experience boolean,
  student_council_details text null,
  student_council_fee_status text not null default 'unverified',
  attendance_status text not null check (attendance_status in ('attending', 'not_attending')),
  privacy_consent_at timestamptz not null,
  selection_criteria_consent_at timestamptz,
  selection_status text not null default 'pending',
  waitlist_order integer,
  participation_fee_status text not null default 'not_applicable',
  contacted_at timestamptz,
  admin_memo text not null default '',
  superseded_at timestamptz,
  constraint student_attendance_responses_council_details_check check (
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
  constraint student_attendance_responses_council_fee_status_check check (
    student_council_fee_status in ('unverified', 'paid', 'unpaid', 'not_applicable')
  ),
  constraint student_attendance_responses_selection_status_check check (
    selection_status in ('pending', 'selected', 'waitlisted', 'not_selected', 'cancelled', 'not_applicable')
  ),
  constraint student_attendance_responses_waitlist_order_check check (
    (selection_status = 'waitlisted' and waitlist_order is not null and waitlist_order > 0)
    or (selection_status <> 'waitlisted' and waitlist_order is null)
  ),
  constraint student_attendance_responses_participation_fee_status_check check (
    participation_fee_status in ('not_applicable', 'unpaid', 'paid', 'refund_pending', 'refunded')
  ),
  constraint student_attendance_responses_admin_memo_check check (
    char_length(admin_memo) <= 2000
  ),
  constraint student_attendance_responses_attending_contract_check check (
    attendance_status <> 'attending'
    or (
      admission_year is not null
      and admission_year <> '26'
      and student_council_experience is not null
      and student_council_fee_status in ('unverified', 'paid', 'unpaid')
      and selection_criteria_consent_at is not null
    )
  )
);

do $$
begin
  if not exists (
    select 1
    from public.form_fields
    where regexp_replace(lower(label), '[[:space:]()（）·_/-]', '', 'g') in ('입학년도학번', '학번입학년도', '입학년도', '학번')
  ) then
    insert into public.form_fields (label, type, required, options, sort_order, active)
    values ('입학년도(학번)', 'text', false, '[]'::jsonb, 10, true);
  end if;

  if not exists (
    select 1
    from public.form_fields
    where regexp_replace(lower(label), '[[:space:]()（）·_/-]', '', 'g') in (
      '현재소속및직함', '소속및직함', '현재소속직함', '소속직함',
      '현재소속및직책', '소속및직책', '현재소속', '소속'
    )
  ) then
    insert into public.form_fields (label, type, required, options, sort_order, active)
    values ('현재 소속 및 직함', 'text', false, '[]'::jsonb, 20, true);
  end if;
end;
$$;

create index if not exists submissions_created_at_idx on public.submissions (created_at desc);
create index if not exists submissions_status_idx on public.submissions (status);
create index if not exists submissions_attendance_idx on public.submissions (attendance_status);
create index if not exists attendance_responses_created_at_idx on public.attendance_responses (created_at desc);
create index if not exists attendance_responses_status_idx on public.attendance_responses (attendance_status);
create index if not exists attendance_responses_phone_idx on public.attendance_responses (phone);
create unique index if not exists attendance_responses_current_phone_uidx on public.attendance_responses (phone) where superseded_at is null;
create index if not exists student_attendance_responses_created_at_idx on public.student_attendance_responses (created_at desc);
create index if not exists student_attendance_responses_status_idx on public.student_attendance_responses (attendance_status);
create index if not exists student_attendance_responses_phone_idx on public.student_attendance_responses (phone);
create unique index if not exists student_attendance_responses_current_phone_uidx on public.student_attendance_responses (phone) where superseded_at is null;
create index if not exists student_attendance_responses_selection_status_idx on public.student_attendance_responses (selection_status) where superseded_at is null;
create index if not exists form_fields_order_idx on public.form_fields (sort_order, created_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists form_fields_set_updated_at on public.form_fields;
create trigger form_fields_set_updated_at
before update on public.form_fields
for each row execute function public.set_updated_at();

drop trigger if exists submissions_set_updated_at on public.submissions;
create trigger submissions_set_updated_at
before update on public.submissions
for each row execute function public.set_updated_at();

drop trigger if exists attendance_responses_set_updated_at on public.attendance_responses;
create trigger attendance_responses_set_updated_at
before update on public.attendance_responses
for each row execute function public.set_updated_at();

drop trigger if exists student_attendance_responses_set_updated_at on public.student_attendance_responses;
create trigger student_attendance_responses_set_updated_at
before update on public.student_attendance_responses
for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admins
    where user_id = (select auth.uid())
  );
$$;

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

create or replace function public.update_attendance_response(
  p_id uuid,
  p_name text,
  p_phone text,
  p_admission_year text,
  p_affiliation text,
  p_attendance_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_admission_year text;
  v_affiliation text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
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

  update public.attendance_responses
  set
    name = btrim(p_name),
    phone = v_phone,
    admission_year = v_admission_year,
    affiliation = v_affiliation,
    attendance_status = p_attendance_status
  where id = p_id;

  if not found then
    raise exception 'Attendance response not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_attendance_response(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  delete from public.attendance_responses
  where id = p_id;

  if not found then
    raise exception 'Attendance response not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.submit_student_attendance_response(
  p_name text,
  p_phone text,
  p_admission_year text,
  p_student_council_experience boolean,
  p_student_council_details text,
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
  v_student_council_details text;
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

  if p_student_council_experience is null then
    raise exception 'Student council experience is required';
  end if;

  v_student_council_details := nullif(btrim(coalesce(p_student_council_details, '')), '');
  if p_student_council_experience
    and (v_student_council_details is null or char_length(v_student_council_details) > 500) then
    raise exception 'Invalid student council details';
  end if;
  if not p_student_council_experience then
    v_student_council_details := null;
  end if;

  if p_attendance_status is null or p_attendance_status not in ('attending', 'not_attending') then
    raise exception 'Invalid attendance status';
  end if;

  if p_privacy_consent is distinct from true then
    raise exception 'Privacy consent is required';
  end if;

  if p_selection_criteria_consent is distinct from true then
    raise exception 'Selection criteria consent is required';
  end if;

  insert into public.student_attendance_responses (
    name,
    phone,
    admission_year,
    student_council_experience,
    student_council_details,
    attendance_status,
    privacy_consent_at,
    selection_criteria_consent_at
  ) values (
    btrim(p_name),
    v_phone,
    v_admission_year,
    p_student_council_experience,
    v_student_council_details,
    p_attendance_status,
    now(),
    now()
  )
  returning id into v_response_id;

  return v_response_id;
end;
$$;

create or replace function public.update_student_attendance_response(
  p_id uuid,
  p_name text,
  p_phone text,
  p_admission_year text,
  p_student_council_experience boolean,
  p_student_council_details text,
  p_attendance_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_admission_year text;
  v_student_council_details text;
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
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

  if p_student_council_experience is null then
    raise exception 'Student council experience is required';
  end if;

  v_student_council_details := nullif(btrim(coalesce(p_student_council_details, '')), '');
  if p_student_council_experience
    and (v_student_council_details is null or char_length(v_student_council_details) > 500) then
    raise exception 'Invalid student council details';
  end if;
  if not p_student_council_experience then
    v_student_council_details := null;
  end if;

  if p_attendance_status is null or p_attendance_status not in ('attending', 'not_attending') then
    raise exception 'Invalid attendance status';
  end if;

  update public.student_attendance_responses
  set
    name = btrim(p_name),
    phone = v_phone,
    admission_year = v_admission_year,
    student_council_experience = p_student_council_experience,
    student_council_details = v_student_council_details,
    attendance_status = p_attendance_status
  where id = p_id;

  if not found then
    raise exception 'Student attendance response not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.delete_student_attendance_response(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  delete from public.student_attendance_responses
  where id = p_id;

  if not found then
    raise exception 'Student attendance response not found' using errcode = 'P0002';
  end if;
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
    name, phone, admission_year, student_council_experience, student_council_details,
    student_council_fee_status, attendance_status, privacy_consent_at,
    selection_criteria_consent_at, selection_status, waitlist_order,
    participation_fee_status, superseded_at
  ) values (
    btrim(p_name), v_phone, v_admission_year, v_student_council_experience,
    v_student_council_details, v_student_council_fee_status, p_attendance_status,
    now(), v_selection_criteria_consent_at,
    case when p_attendance_status = 'attending' then 'pending' else 'not_applicable' end,
    null, 'not_applicable', null
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
      when excluded.attendance_status = 'not_attending' and existing.attendance_status = 'attending' then 'cancelled'
      when excluded.attendance_status = 'not_attending' then existing.selection_status
      when existing.attendance_status = 'not_attending' then 'pending'
      else existing.selection_status
    end,
    waitlist_order = case
      when excluded.attendance_status = 'not_attending' or existing.attendance_status = 'not_attending' then null
      else existing.waitlist_order
    end,
    participation_fee_status = case
      when excluded.attendance_status = 'not_attending' and existing.participation_fee_status = 'paid' then 'refund_pending'
      when excluded.attendance_status = 'not_attending' and existing.participation_fee_status in ('refund_pending', 'refunded') then existing.participation_fee_status
      when excluded.attendance_status = 'not_attending' then 'not_applicable'
      when existing.attendance_status = 'not_attending' then 'not_applicable'
      else existing.participation_fee_status
    end,
    contacted_at = case
      when existing.attendance_status = 'not_attending' and excluded.attendance_status = 'attending' then null
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
  select * into v_existing from public.student_attendance_responses
  where id = p_id and superseded_at is null for update;
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
    if v_existing.attendance_status = 'not_attending' and v_existing.selection_criteria_consent_at is null then
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
      when p_attendance_status = 'not_attending' and v_existing.attendance_status = 'attending' then 'cancelled'
      when p_attendance_status = 'attending' and v_existing.attendance_status = 'not_attending' then 'pending'
      else v_existing.selection_status
    end,
    waitlist_order = case when p_attendance_status <> v_existing.attendance_status then null else v_existing.waitlist_order end,
    participation_fee_status = case
      when p_attendance_status = 'not_attending' and v_existing.participation_fee_status = 'paid' then 'refund_pending'
      when p_attendance_status = 'not_attending' and v_existing.participation_fee_status in ('refund_pending', 'refunded') then v_existing.participation_fee_status
      when p_attendance_status = 'not_attending' then 'not_applicable'
      when v_existing.attendance_status = 'not_attending' then 'not_applicable'
      else v_existing.participation_fee_status
    end,
    contacted_at = case
      when p_attendance_status = 'attending' and v_existing.attendance_status = 'not_attending' then null
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
  select attendance_status into v_attendance_status from public.student_attendance_responses
  where id = p_id and superseded_at is null for update;
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
    if p_selection_status = 'selected' and p_participation_fee_status not in ('unpaid', 'paid') then
      raise exception 'Selected students require a participation fee status';
    end if;
    if p_selection_status = 'cancelled' and p_participation_fee_status not in ('not_applicable', 'refund_pending', 'refunded') then
      raise exception 'Invalid cancellation fee status';
    end if;
    if p_selection_status not in ('selected', 'cancelled') and p_participation_fee_status <> 'not_applicable' then
      raise exception 'Participation fee does not apply to this selection status';
    end if;
  end if;

  update public.student_attendance_responses
  set
    student_council_fee_status = p_student_council_fee_status,
    selection_status = p_selection_status,
    waitlist_order = p_waitlist_order,
    participation_fee_status = p_participation_fee_status,
    contacted_at = case when p_contacted then coalesce(contacted_at, now()) else null end,
    admin_memo = v_admin_memo
  where id = p_id and superseded_at is null;
end;
$$;

drop function if exists public.submit_sponsorship(text, text, boolean, integer, text, jsonb, boolean, text, timestamptz);

create or replace function public.submit_sponsorship(
  p_name text,
  p_phone text,
  p_pledge_option text,
  p_pledge_amount bigint,
  p_attendance_status text,
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
  v_phone text;
  v_answers jsonb;
  v_expected_amount bigint;
  v_expected_attendance text;
  v_wants_sponsorship boolean;
  v_sponsorship_units integer;
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

  case p_pledge_option
    when 'century_100' then
      v_expected_amount := 1000000;
      v_expected_attendance := 'attending';
      v_wants_sponsorship := true;
      v_sponsorship_units := 2;
    when 'guardian_50' then
      v_expected_amount := 500000;
      v_expected_attendance := 'attending';
      v_wants_sponsorship := true;
      v_sponsorship_units := 1;
    when 'free_attending' then
      v_expected_amount := p_pledge_amount;
      v_expected_attendance := 'attending';
      v_wants_sponsorship := true;
      v_sponsorship_units := 0;
    when 'free_absent' then
      v_expected_amount := p_pledge_amount;
      v_expected_attendance := 'not_attending';
      v_wants_sponsorship := true;
      v_sponsorship_units := 0;
    when 'absent_only' then
      v_expected_amount := 0;
      v_expected_attendance := 'not_attending';
      v_wants_sponsorship := false;
      v_sponsorship_units := 0;
    else
      raise exception 'Invalid pledge option';
  end case;

  if p_pledge_amount is null or p_pledge_amount <> v_expected_amount then
    raise exception 'Pledge option and amount do not match';
  end if;

  if p_pledge_option = 'free_attending'
    and p_pledge_amount not between 1000000 and 10000000000 then
    raise exception 'Invalid custom pledge amount';
  end if;

  if p_pledge_option = 'free_absent'
    and p_pledge_amount not between 1 and 10000000000 then
    raise exception 'Invalid custom pledge amount';
  end if;

  if p_attendance_status is null or p_attendance_status <> v_expected_attendance then
    raise exception 'Pledge option and attendance do not match';
  end if;

  if p_privacy_consent is distinct from true then
    raise exception 'Privacy consent is required';
  end if;

  if p_answers is null or jsonb_typeof(p_answers) <> 'object' or char_length(p_answers::text) > 20000 then
    raise exception 'Invalid answers';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_answers) as answer_keys(field_id)
    where not exists (
      select 1 from public.form_fields
      where active and id::text = answer_keys.field_id
    )
  ) then
    raise exception 'Unknown or inactive form field';
  end if;

  if exists (
    select 1
    from public.form_fields
    where active
      and required
      and (
        not (p_answers ? id::text)
        or p_answers -> id::text = 'null'::jsonb
        or (jsonb_typeof(p_answers -> id::text) = 'string' and btrim(p_answers ->> id::text) = '')
        or (type = 'checkbox' and p_answers -> id::text <> 'true'::jsonb)
      )
  ) then
    raise exception 'A required answer is missing';
  end if;

  if exists (
    select 1
    from public.form_fields
    where active
      and p_answers ? id::text
      and not (
        p_answers -> id::text = 'null'::jsonb
        and regexp_replace(lower(label), '[[:space:]()（）·_/-]', '', 'g') in (
          '입학년도학번', '학번입학년도', '입학년도', '학번'
        )
      )
      and (
        (type = 'number' and jsonb_typeof(p_answers -> id::text) <> 'number')
        or (type = 'checkbox' and jsonb_typeof(p_answers -> id::text) <> 'boolean')
        or (type in ('text', 'tel', 'email', 'select', 'radio', 'textarea') and jsonb_typeof(p_answers -> id::text) <> 'string')
        or (type in ('select', 'radio') and not (options ? (p_answers ->> id::text)))
        or char_length((p_answers -> id::text)::text) > 4000
      )
  ) then
    raise exception 'Invalid answer value';
  end if;

  if exists (
    select 1
    from public.form_fields
    where active
      and regexp_replace(lower(label), '[[:space:]()（）·_/-]', '', 'g') in (
        '입학년도학번', '학번입학년도', '입학년도', '학번'
      )
      and p_answers ? id::text
      and p_answers -> id::text <> 'null'::jsonb
      and btrim(p_answers ->> id::text) <> ''
      and btrim(p_answers ->> id::text) !~ '^[0-9]{2}$'
  ) then
    raise exception 'Invalid admission year';
  end if;

  select coalesce(
    jsonb_object_agg(
      id::text,
      jsonb_build_object('label', label, 'value', p_answers -> id::text)
    ),
    '{}'::jsonb
  )
  into v_answers
  from public.form_fields
  where active and p_answers ? id::text;

  insert into public.submissions (
    name,
    phone,
    wants_sponsorship,
    sponsorship_units,
    pledge_option,
    pledge_amount,
    attendance_status,
    answers,
    status,
    admin_memo,
    privacy_consent_at
  ) values (
    btrim(p_name),
    v_phone,
    v_wants_sponsorship,
    v_sponsorship_units,
    p_pledge_option,
    v_expected_amount,
    v_expected_attendance,
    v_answers,
    'new',
    '',
    now()
  )
  returning id into v_submission_id;

  return v_submission_id;
end;
$$;

alter table public.admins enable row level security;
alter table public.form_fields enable row level security;
alter table public.submissions enable row level security;
alter table public.attendance_responses enable row level security;
alter table public.student_attendance_responses enable row level security;

revoke all on table public.admins from anon, authenticated;
revoke all on table public.form_fields from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;
revoke all on table public.attendance_responses from public, anon, authenticated;
revoke all on table public.student_attendance_responses from public, anon, authenticated;

grant select on table public.admins to authenticated;
grant select on table public.form_fields to anon, authenticated;
grant insert, update on table public.form_fields to authenticated;
grant select, delete on table public.submissions to authenticated;
grant update (status, admin_memo) on table public.submissions to authenticated;
grant select on table public.attendance_responses to authenticated;
grant select on table public.student_attendance_responses to authenticated;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.submit_sponsorship(text, text, text, bigint, text, jsonb, boolean, text, timestamptz) from public;
grant execute on function public.submit_sponsorship(text, text, text, bigint, text, jsonb, boolean, text, timestamptz) to anon, authenticated;

revoke all on function public.submit_attendance_response(text, text, text, text, text, boolean, text, timestamptz) from public;
grant execute on function public.submit_attendance_response(text, text, text, text, text, boolean, text, timestamptz) to anon, authenticated;

revoke all on function public.update_attendance_response(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_attendance_response(uuid, text, text, text, text, text) to authenticated;

revoke all on function public.delete_attendance_response(uuid) from public, anon, authenticated;
grant execute on function public.delete_attendance_response(uuid) to authenticated;

revoke all on function public.submit_student_attendance_response(text, text, text, boolean, text, boolean, text, boolean, boolean, text, timestamptz) from public, anon, authenticated;
grant execute on function public.submit_student_attendance_response(text, text, text, boolean, text, boolean, text, boolean, boolean, text, timestamptz) to anon, authenticated;

revoke all on function public.update_student_attendance_response(uuid, text, text, text, boolean, text, text, text) from public, anon, authenticated;
grant execute on function public.update_student_attendance_response(uuid, text, text, text, boolean, text, text, text) to authenticated;

revoke all on function public.update_student_selection_management(uuid, text, text, integer, text, boolean, text) from public, anon, authenticated;
grant execute on function public.update_student_selection_management(uuid, text, text, integer, text, boolean, text) to authenticated;

revoke all on function public.delete_student_attendance_response(uuid) from public, anon, authenticated;
grant execute on function public.delete_student_attendance_response(uuid) to authenticated;

drop policy if exists admins_read_self on public.admins;
create policy admins_read_self
on public.admins for select
to authenticated
using (user_id = (select auth.uid()));

drop policy if exists form_fields_public_read_active on public.form_fields;
create policy form_fields_public_read_active
on public.form_fields for select
to anon, authenticated
using (active);

drop policy if exists form_fields_admin_read_all on public.form_fields;
create policy form_fields_admin_read_all
on public.form_fields for select
to authenticated
using ((select public.is_admin()));

drop policy if exists form_fields_admin_insert on public.form_fields;
create policy form_fields_admin_insert
on public.form_fields for insert
to authenticated
with check ((select public.is_admin()));

drop policy if exists form_fields_admin_update on public.form_fields;
create policy form_fields_admin_update
on public.form_fields for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists submissions_admin_read on public.submissions;
create policy submissions_admin_read
on public.submissions for select
to authenticated
using ((select public.is_admin()));

drop policy if exists submissions_admin_update on public.submissions;
create policy submissions_admin_update
on public.submissions for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists submissions_admin_delete on public.submissions;
create policy submissions_admin_delete
on public.submissions for delete
to authenticated
using ((select public.is_admin()));

drop policy if exists attendance_responses_admin_read on public.attendance_responses;
create policy attendance_responses_admin_read
on public.attendance_responses for select
to authenticated
using ((select public.is_admin()));

drop policy if exists student_attendance_responses_admin_read on public.student_attendance_responses;
create policy student_attendance_responses_admin_read
on public.student_attendance_responses for select
to authenticated
using ((select public.is_admin()));

-- No direct INSERT grant or policy exists for submissions.
-- Public visitors can only submit through submit_sponsorship(), which controls every writable column.
-- attendance_responses permits authenticated administrator reads only.
-- Creates use submit_attendance_response(); mutations use the authenticated-only admin RPCs.
-- student_attendance_responses follows the same isolation model with dedicated student RPCs.
