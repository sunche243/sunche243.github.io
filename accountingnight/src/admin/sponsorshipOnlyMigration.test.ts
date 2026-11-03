import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261103160244_sponsorship_only_pledges.sql', import.meta.url),
  'utf8',
);
const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');

describe('sponsorship-only persistence', () => {
  it('stores donation-only responses without an attendance classification', () => {
    expect(migration).toContain("pledge_option = 'donation_only'");
    expect(migration).toContain("attendance_status = 'undecided'");
    expect(migration).toContain('create or replace function public.submit_sponsorship_only');
  });

  it('keeps existing pledge rows valid while adding the new option', () => {
    expect(migration).toContain('add constraint submissions_pledge_option_candidate_check');
    expect(migration).toContain('not valid;');
    expect(migration).toContain('validate constraint submissions_pledge_consistency_candidate_check');
  });

  it('limits the new public RPC to the intended Data API roles', () => {
    expect(migration).toContain('revoke all on function public.submit_sponsorship_only');
    expect(migration).toContain('to anon, authenticated;');
  });

  it('keeps the canonical schema in sync', () => {
    expect(schema).toContain("'donation_only'");
    expect(schema).toContain('create or replace function public.submit_sponsorship_only');
    expect(schema).toContain("attendance_status = 'undecided'");
  });
});
