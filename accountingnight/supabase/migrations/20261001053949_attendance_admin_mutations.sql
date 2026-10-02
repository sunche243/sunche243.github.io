-- Allow administrators to edit and delete attendance responses only through
-- validated SECURITY DEFINER functions.

begin;

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

revoke update, delete on table public.attendance_responses from public, anon, authenticated;

drop policy if exists attendance_responses_admin_update on public.attendance_responses;
drop policy if exists attendance_responses_admin_delete on public.attendance_responses;

revoke all on function public.update_attendance_response(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.update_attendance_response(uuid, text, text, text, text, text) to authenticated;

revoke all on function public.delete_attendance_response(uuid) from public, anon, authenticated;
grant execute on function public.delete_attendance_response(uuid) to authenticated;

commit;
