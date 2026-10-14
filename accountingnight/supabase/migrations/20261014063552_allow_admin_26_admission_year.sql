-- Allow administrators to correct an existing response to admission year 26.
-- Public submissions remain blocked by submit_student_attendance_response.

begin;

alter table public.student_attendance_responses
  drop constraint if exists student_attendance_responses_attending_contract_check;

alter table public.student_attendance_responses
  add constraint student_attendance_responses_attending_contract_check check (
    attendance_status <> 'attending'
    or (
      admission_year is not null
      and student_council_experience is not null
      and student_council_fee_status in ('unverified', 'paid', 'unpaid')
      and selection_criteria_consent_at is not null
    )
  ) not valid;

alter table public.student_attendance_responses
  validate constraint student_attendance_responses_attending_contract_check;

create or replace function public.update_student_attendance_response(
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

revoke all on function public.update_student_attendance_response(
  uuid, text, text, text, boolean, text, text, text
) from public, anon, authenticated;
grant execute on function public.update_student_attendance_response(
  uuid, text, text, text, boolean, text, text, text
) to authenticated;

commit;
