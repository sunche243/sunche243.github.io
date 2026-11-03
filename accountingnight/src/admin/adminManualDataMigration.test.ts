import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261103161605_admin_manual_data_entry.sql', import.meta.url),
  'utf8',
);
const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');

describe('admin manual data migration', () => {
  it('tags every manual row with the authenticated administrator', () => {
    expect(migration).toContain('add column created_by_admin uuid');
    expect(migration).toContain('created_by_admin = (select auth.uid())');
  });

  it('uses invoker rights and performs an explicit admin authorization check', () => {
    expect(migration).toContain('security invoker');
    expect(migration).toContain('if not public.is_admin() then');
    expect(migration).toContain('from public, anon, authenticated;');
    expect(migration).toContain('to authenticated;');
  });

  it('keeps public required-field contracts while allowing tagged admin rows', () => {
    expect(migration).toContain('submissions_public_required_fields_check');
    expect(migration).toContain('attendance_responses_public_required_fields_check');
    expect(migration).toContain('student_attendance_responses_public_required_fields_check');
    expect(migration).toContain('created_by_admin is not null');
  });

  it('keeps the canonical schema synchronized', () => {
    expect(schema).toContain('create or replace function public.create_admin_response');
    expect(schema).toContain('create policy submissions_admin_insert');
    expect(schema).toContain('security invoker');
  });
});
