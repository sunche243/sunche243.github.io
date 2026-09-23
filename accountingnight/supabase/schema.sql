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

revoke all on table public.admins from anon, authenticated;
revoke all on table public.form_fields from anon, authenticated;
revoke all on table public.submissions from anon, authenticated;

grant select on table public.admins to authenticated;
grant select on table public.form_fields to anon, authenticated;
grant insert, update on table public.form_fields to authenticated;
grant select, delete on table public.submissions to authenticated;
grant update (status, admin_memo) on table public.submissions to authenticated;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.submit_sponsorship(text, text, text, bigint, text, jsonb, boolean, text, timestamptz) from public;
grant execute on function public.submit_sponsorship(text, text, text, bigint, text, jsonb, boolean, text, timestamptz) to anon, authenticated;

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

-- No direct INSERT grant or policy exists for submissions.
-- Public visitors can only submit through submit_sponsorship(), which controls every writable column.
