-- Add an independent RSVP store without changing legacy sponsorship submissions.

begin;

create table public.attendance_responses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  phone text not null check (phone ~ '^010[0-9]{8}$'),
  admission_year text null check (admission_year is null or admission_year ~ '^[0-9]{2}$'),
  affiliation text null check (affiliation is null or char_length(affiliation) between 1 and 200),
  attendance_status text not null check (attendance_status in ('attending', 'not_attending')),
  privacy_consent_at timestamptz not null
);

create index attendance_responses_created_at_idx
on public.attendance_responses (created_at desc);

create index attendance_responses_status_idx
on public.attendance_responses (attendance_status);

create index attendance_responses_phone_idx
on public.attendance_responses (phone);

create trigger attendance_responses_set_updated_at
before update on public.attendance_responses
for each row execute function public.set_updated_at();

alter table public.attendance_responses enable row level security;

revoke all on table public.attendance_responses from anon, authenticated;
grant select, delete on table public.attendance_responses to authenticated;

create policy attendance_responses_admin_read
on public.attendance_responses for select
to authenticated
using ((select public.is_admin()));

create policy attendance_responses_admin_delete
on public.attendance_responses for delete
to authenticated
using ((select public.is_admin()));

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

  insert into public.attendance_responses (
    name,
    phone,
    admission_year,
    affiliation,
    attendance_status,
    privacy_consent_at
  ) values (
    btrim(p_name),
    v_phone,
    v_admission_year,
    v_affiliation,
    p_attendance_status,
    now()
  )
  returning id into v_response_id;

  return v_response_id;
end;
$$;

revoke all on function public.submit_attendance_response(text, text, text, text, text, boolean, text, timestamptz) from public;
grant execute on function public.submit_attendance_response(text, text, text, text, text, boolean, text, timestamptz) to anon, authenticated;

-- No direct INSERT, UPDATE, or public SELECT grant exists for attendance_responses.
-- Public visitors can only create a new row through submit_attendance_response().

commit;
