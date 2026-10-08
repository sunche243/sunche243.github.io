import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261001053949_attendance_admin_mutations.sql', import.meta.url),
  'utf8',
);
const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
const upsertMigration = readFileSync(
  new URL('../../supabase/migrations/20261008090000_response_upsert_student_operations.sql', import.meta.url),
  'utf8',
);

describe('attendance admin mutation SQL contract', () => {
  it('wraps the migration in one transaction', () => {
    expect(migration).toMatch(/^--[\s\S]*?\n\nbegin;\n/);
    expect(migration.trimEnd().endsWith('commit;')).toBe(true);
  });

  it('requires the admin check in both SECURITY DEFINER functions', () => {
    expect(migration.match(/security definer\nset search_path = ''/g)).toHaveLength(2);
    expect(migration.match(/if not public\.is_admin\(\) then/g)).toHaveLength(2);
    expect(migration.match(/raise exception 'Not authorized'/g)).toHaveLength(2);
  });

  it('validates update values, normalizes the phone, and rejects missing ids', () => {
    expect(migration).toContain("not between 1 and 80");
    expect(migration).toContain("'^(010[0-9]{8}|010-[0-9]{4}-[0-9]{4})$'");
    expect(migration).toContain("v_phone := replace(btrim(p_phone), '-', '')");
    expect(migration).toContain("v_admission_year !~ '^[0-9]{2}$'");
    expect(migration).toContain("char_length(v_affiliation) > 200");
    expect(migration).toContain("p_attendance_status not in ('attending', 'not_attending')");
    expect(migration.match(/Attendance response not found/g)).toHaveLength(2);
  });

  it('removes direct mutations and grants RPC execution only to authenticated', () => {
    expect(migration).toContain('revoke update, delete on table public.attendance_responses from public, anon, authenticated;');
    expect(migration).toContain('drop policy if exists attendance_responses_admin_delete');
    expect(migration).toContain('grant execute on function public.update_attendance_response(uuid, text, text, text, text, text) to authenticated;');
    expect(migration).toContain('grant execute on function public.delete_attendance_response(uuid) to authenticated;');
    expect(migration).not.toMatch(/grant execute on function public\.(?:update|delete)_attendance_response[^;]+to anon/);
  });

  it('keeps schema.sql synchronized with the function and privilege model', () => {
    expect(schema).toContain('create or replace function public.update_attendance_response(');
    expect(schema).toContain('create or replace function public.delete_attendance_response(p_id uuid)');
    expect(schema).toContain('grant select on table public.attendance_responses to authenticated;');
    expect(schema).not.toContain('create policy attendance_responses_admin_delete');
  });

  it('keeps historical duplicates while exposing one current response per phone', () => {
    expect(upsertMigration).toContain('attendance_responses_current_phone_uidx');
    expect(upsertMigration).toContain('set superseded_at = now()');
    expect(upsertMigration).toContain('on conflict (phone) where superseded_at is null do update');
    expect(schema).toContain('attendance_responses_current_phone_uidx');
  });
});
