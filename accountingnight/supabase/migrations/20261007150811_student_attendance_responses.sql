-- Add an isolated student RSVP store and admin mutation functions.

begin;

create table public.student_attendance_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^010[0-9]{8}$'),
  admission_year text null check (admission_year is null or admission_year ~ '^[0-9]{2}$'),
  student_council_experience boolean not null,
  student_council_details text null,
  attendance_status text not null check (attendance_status in ('attending', 'not_attending')),
  privacy_consent_at timestamptz not null,
  constraint student_attendance_responses_council_details_check check (
    (
      student_council_experience
      and student_council_details is not null
      and char_length(btrim(student_council_details)) between 1 and 500
    )
    or (
      not student_council_experience
      and student_council_details is null
    )
  )
);

create index student_attendance_responses_created_at_idx
on public.student_attendance_responses (created_at desc);

create index student_attendance_responses_status_idx
on public.student_attendance_responses (attendance_status);

create index student_attendance_responses_phone_idx
on public.student_attendance_responses (phone);

create trigger student_attendance_responses_set_updated_at
before update on public.student_attendance_responses
for each row execute function public.set_updated_at();

alter table public.student_attendance_responses enable row level security;

revoke all on table public.student_attendance_responses from public, anon, authenticated;
grant select on table public.student_attendance_responses to authenticated;

create policy student_attendance_responses_admin_read
on public.student_attendance_responses for select
to authenticated
using ((select public.is_admin()));

create or replace function public.submit_student_attendance_response(
  p_name text,
  p_phone text,
  p_admission_year text,
  p_student_council_experience boolean,
  p_student_council_details text,
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

  insert into public.student_attendance_responses (
    name,
    phone,
    admission_year,
    student_council_experience,
    student_council_details,
    attendance_status,
    privacy_consent_at
  ) values (
    btrim(p_name),
    v_phone,
    v_admission_year,
    p_student_council_experience,
    v_student_council_details,
    p_attendance_status,
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

revoke all on function public.submit_student_attendance_response(text, text, text, boolean, text, text, boolean, text, timestamptz) from public, anon, authenticated;
grant execute on function public.submit_student_attendance_response(text, text, text, boolean, text, text, boolean, text, timestamptz) to anon, authenticated;

revoke all on function public.update_student_attendance_response(uuid, text, text, text, boolean, text, text) from public, anon, authenticated;
grant execute on function public.update_student_attendance_response(uuid, text, text, text, boolean, text, text) to authenticated;

revoke all on function public.delete_student_attendance_response(uuid) from public, anon, authenticated;
grant execute on function public.delete_student_attendance_response(uuid) to authenticated;

-- Public visitors can insert only through the validated submit RPC.
-- Authenticated administrators can read rows and mutate them only through admin-checked RPCs.

commit;
