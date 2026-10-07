begin;

alter table public.student_attendance_responses
add column if not exists selection_criteria_consent_at timestamptz;

update public.student_attendance_responses
set selection_criteria_consent_at = privacy_consent_at
where selection_criteria_consent_at is null;

alter table public.student_attendance_responses
alter column selection_criteria_consent_at set not null;

drop function if exists public.submit_student_attendance_response(
  text,
  text,
  text,
  boolean,
  text,
  text,
  boolean,
  text,
  timestamptz
);

create function public.submit_student_attendance_response(
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

revoke all on function public.submit_student_attendance_response(
  text,
  text,
  text,
  boolean,
  text,
  text,
  boolean,
  boolean,
  text,
  timestamptz
) from public, anon, authenticated;

grant execute on function public.submit_student_attendance_response(
  text,
  text,
  text,
  boolean,
  text,
  text,
  boolean,
  boolean,
  text,
  timestamptz
) to anon, authenticated;

commit;
