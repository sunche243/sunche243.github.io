import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261007150811_student_attendance_responses.sql', import.meta.url),
  'utf8',
);
const selectionCriteriaMigration = readFileSync(
  new URL('../../supabase/migrations/20261007161112_student_selection_criteria_consent.sql', import.meta.url),
  'utf8',
);
const operationsMigration = readFileSync(
  new URL('../../supabase/migrations/20261008090000_response_upsert_student_operations.sql', import.meta.url),
  'utf8',
);
const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');

describe('student attendance SQL contract', () => {
  it('creates an isolated student table with relational constraints', () => {
    expect(migration).toContain('create table public.student_attendance_responses');
    expect(migration).toContain('student_council_experience boolean not null');
    expect(migration).toContain('student_attendance_responses_council_details_check');
    expect(migration).toContain("char_length(btrim(student_council_details)) between 1 and 500");
    expect(migration).toContain("attendance_status in ('attending', 'not_attending')");
  });

  it('uses separate validated submit, update, and delete RPCs', () => {
    expect(migration).toContain('create or replace function public.submit_student_attendance_response(');
    expect(migration).toContain('create or replace function public.update_student_attendance_response(');
    expect(migration).toContain('create or replace function public.delete_student_attendance_response(p_id uuid)');
    expect(migration.match(/security definer\nset search_path = ''/g)).toHaveLength(3);
    expect(migration.match(/if not public\.is_admin\(\) then/g)).toHaveLength(2);
  });

  it('allows public submission only through the RPC and admin reads through RLS', () => {
    expect(migration).toContain('alter table public.student_attendance_responses enable row level security;');
    expect(migration).toContain('revoke all on table public.student_attendance_responses from public, anon, authenticated;');
    expect(migration).toContain('grant select on table public.student_attendance_responses to authenticated;');
    expect(migration).toContain('using ((select public.is_admin()));');
    expect(migration).not.toMatch(/grant insert on table public\.student_attendance_responses/);
  });

  it('keeps schema.sql synchronized', () => {
    expect(schema).toContain('create table if not exists public.student_attendance_responses');
    expect(schema).toContain('create or replace function public.submit_student_attendance_response(');
    expect(schema).toContain('create policy student_attendance_responses_admin_read');
    expect(schema).toContain('grant select on table public.student_attendance_responses to authenticated;');
  });

  it('requires and records selection criteria consent without discarding existing responses', () => {
    expect(selectionCriteriaMigration).toContain('add column if not exists selection_criteria_consent_at timestamptz;');
    expect(selectionCriteriaMigration).toContain('set selection_criteria_consent_at = privacy_consent_at');
    expect(selectionCriteriaMigration).toContain('alter column selection_criteria_consent_at set not null;');
    expect(selectionCriteriaMigration).toContain("raise exception 'Selection criteria consent is required';");
    expect(selectionCriteriaMigration).toContain('selection_criteria_consent_at');
    expect(schema).toContain('selection_criteria_consent_at timestamptz');
    expect(schema).toContain('p_selection_criteria_consent boolean');
  });

  it('preserves superseded history and upserts one current response per phone', () => {
    expect(operationsMigration).toContain('add column if not exists superseded_at timestamptz');
    expect(operationsMigration).toContain('row_number() over');
    expect(operationsMigration).toContain('student_attendance_responses_current_phone_uidx');
    expect(operationsMigration).toContain('on conflict (phone) where superseded_at is null do update');
    expect(schema).toContain('student_attendance_responses_current_phone_uidx');
  });

  it('adds student priority inputs and admin-only selection management', () => {
    expect(operationsMigration).toContain('p_student_council_fee_paid boolean');
    expect(operationsMigration).toContain("v_admission_year = '26'");
    expect(operationsMigration).toContain('create or replace function public.update_student_selection_management(');
    expect(operationsMigration).toContain("if not public.is_admin() then");
    expect(operationsMigration).toContain('grant execute on function public.update_student_selection_management(');
    expect(schema).toContain("student_council_fee_status in ('unverified', 'paid', 'unpaid', 'not_applicable')");
    expect(schema).toContain('create or replace function public.update_student_selection_management(');
  });
});
