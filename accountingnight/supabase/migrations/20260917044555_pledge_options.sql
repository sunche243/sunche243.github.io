-- Accounting Night 2nd revision: attendance and development-fund pledge options.
-- Safe for the existing production database: preserves all tables, rows, RLS, admins,
-- form fields, statuses, and administrator memos.

alter table public.submissions
  add column if not exists pledge_option text,
  add column if not exists pledge_amount bigint;

update public.submissions
set pledge_option = case
  when wants_sponsorship then 'legacy_units'
  else 'legacy_no_pledge'
end
where pledge_option is null;

update public.submissions
set pledge_amount = case pledge_option
  when 'century_100' then 1000000
  when 'guardian_50' then 500000
  when 'absent_only' then 0
  when 'legacy_units' then sponsorship_units::bigint * 500000
  when 'legacy_no_pledge' then 0
  else sponsorship_units::bigint * 500000
end
where pledge_amount is null;

alter table public.submissions
  alter column pledge_option set not null,
  alter column pledge_amount set not null;

-- Remove only the old/new sponsorship check constraints. Other column checks are untouched.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select conname
    from pg_constraint
    where conrelid = 'public.submissions'::regclass
      and contype = 'c'
      and (
        pg_get_constraintdef(oid) ilike '%wants_sponsorship%'
        or pg_get_constraintdef(oid) ilike '%sponsorship_units%'
        or pg_get_constraintdef(oid) ilike '%pledge_option%'
        or pg_get_constraintdef(oid) ilike '%pledge_amount%'
        or conname = 'submissions_participation_required_check'
      )
  loop
    execute format('alter table public.submissions drop constraint %I', constraint_record.conname);
  end loop;
end;
$$;

alter table public.submissions
  add constraint submissions_sponsorship_units_check
    check (sponsorship_units between 0 and 100),
  add constraint submissions_participation_required_check
    check (wants_sponsorship or attendance_status is not null),
  add constraint submissions_pledge_option_check
    check (
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
  add constraint submissions_pledge_consistency_check
    check (
      (pledge_option = 'century_100' and pledge_amount = 1000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 2)
      or (pledge_option = 'guardian_50' and pledge_amount = 500000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 1)
      or (pledge_option = 'free_attending' and pledge_amount between 1 and 10000000000 and attendance_status = 'attending' and wants_sponsorship and sponsorship_units = 0)
      or (pledge_option = 'free_absent' and pledge_amount between 1 and 10000000000 and attendance_status = 'not_attending' and wants_sponsorship and sponsorship_units = 0)
      or (pledge_option = 'absent_only' and pledge_amount = 0 and attendance_status = 'not_attending' and not wants_sponsorship and sponsorship_units = 0)
      or (pledge_option = 'legacy_units' and pledge_amount = sponsorship_units::bigint * 500000 and wants_sponsorship and sponsorship_units between 1 and 100)
      or (pledge_option = 'legacy_no_pledge' and pledge_amount = 0 and not wants_sponsorship and sponsorship_units = 0)
    );

-- Reuse semantically equivalent fields when present; otherwise seed the two requested fields.
do $$
declare
  admission_field_id uuid;
  affiliation_field_id uuid;
begin
  select id
  into admission_field_id
  from public.form_fields
  where regexp_replace(lower(label), '[[:space:]()（）·_/-]', '', 'g') in ('입학년도학번', '학번입학년도', '입학년도', '학번')
  order by active desc, sort_order, created_at
  limit 1;

  if admission_field_id is null then
    insert into public.form_fields (label, type, required, options, sort_order, active)
    values ('입학년도(학번)', 'text', true, '[]'::jsonb, 10, true);
  else
    update public.form_fields
    set label = '입학년도(학번)', type = 'text', required = true, options = '[]'::jsonb, sort_order = 10, active = true
    where id = admission_field_id;
  end if;

  select id
  into affiliation_field_id
  from public.form_fields
  where regexp_replace(lower(label), '[[:space:]()（）·_/-]', '', 'g') in (
    '현재소속및직함', '소속및직함', '현재소속직함', '소속직함',
    '현재소속및직책', '소속및직책', '현재소속', '소속'
  )
  order by active desc, sort_order, created_at
  limit 1;

  if affiliation_field_id is null then
    insert into public.form_fields (label, type, required, options, sort_order, active)
    values ('현재 소속 및 직함', 'text', true, '[]'::jsonb, 20, true);
  else
    update public.form_fields
    set label = '현재 소속 및 직함', type = 'text', required = true, options = '[]'::jsonb, sort_order = 20, active = true
    where id = affiliation_field_id;
  end if;
end;
$$;

-- Remove the retired RPC signature so PostgREST does not retain an overload.
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

  v_phone := regexp_replace(coalesce(btrim(p_phone), ''), '[^0-9+]', '', 'g');
  if v_phone !~ '^\+?[0-9]{7,20}$' then
    raise exception 'Invalid phone';
  end if;

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

  if p_pledge_option in ('free_attending', 'free_absent')
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

revoke all on function public.submit_sponsorship(text, text, text, bigint, text, jsonb, boolean, text, timestamptz) from public;
grant execute on function public.submit_sponsorship(text, text, text, bigint, text, jsonb, boolean, text, timestamptz) to anon, authenticated;

-- RLS remains enabled and unchanged. There is still no direct INSERT grant or policy
-- for submissions; public visitors can write only through the validated RPC above.
