-- Split the custom pledge minimum by attendance without rewriting submissions.
-- RLS, admins, form_fields, grants, and existing data remain unchanged.

begin;

-- Validate the replacement before removing the currently enforced constraint.
alter table public.submissions
  drop constraint if exists submissions_pledge_consistency_candidate_check;

alter table public.submissions
  add constraint submissions_pledge_consistency_candidate_check
  check (
    (pledge_option = 'century_100' and pledge_amount = 1000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 2)
    or (pledge_option = 'guardian_50' and pledge_amount = 500000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 1)
    or (pledge_option = 'free_attending' and pledge_amount between 1000000 and 10000000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'free_absent' and pledge_amount between 1 and 10000000000 and attendance_status = 'not_attending' and wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'absent_only' and pledge_amount = 0 and attendance_status = 'not_attending' and not wants_sponsorship and sponsorship_units = 0)
    or (pledge_option = 'legacy_units' and pledge_amount = sponsorship_units::bigint * 500000 and wants_sponsorship and sponsorship_units between 1 and 100)
    or (pledge_option = 'legacy_no_pledge' and pledge_amount = 0 and not wants_sponsorship and sponsorship_units = 0)
  ) not valid;

alter table public.submissions
  validate constraint submissions_pledge_consistency_candidate_check;

alter table public.submissions
  drop constraint if exists submissions_pledge_consistency_check;

alter table public.submissions
  rename constraint submissions_pledge_consistency_candidate_check
  to submissions_pledge_consistency_check;

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

commit;
