import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SubmitRegistrationInput } from './registration';

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock('./supabase', () => ({
  getSupabase: () => ({ rpc }),
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
}));

import { submitRegistration } from './registration';

const baseInput: SubmitRegistrationInput = {
  name: '홍길동',
  phone: '01012345678',
  pledgeOption: 'century_100',
  pledgeAmount: 1_000_000,
  attendanceStatus: 'attending',
  answers: {},
  privacyConsent: true,
  honeypot: '',
  formStartedAt: Date.parse('2026-11-02T23:59:00+09:00'),
};

describe('sponsor registration service', () => {
  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: 'submission-id', error: null });
  });

  it('uses the existing RPC for attendance-linked pledges', async () => {
    await submitRegistration(baseInput);

    expect(rpc).toHaveBeenCalledWith('submit_sponsorship', expect.objectContaining({
      p_pledge_option: 'century_100',
      p_attendance_status: 'attending',
    }));
  });

  it('uses the sponsorship-only RPC without sending an attendance choice', async () => {
    await submitRegistration({
      ...baseInput,
      pledgeOption: 'donation_only',
      pledgeAmount: 300_000,
      attendanceStatus: 'undecided',
    });

    expect(rpc).toHaveBeenCalledWith('submit_sponsorship_only', expect.objectContaining({
      p_pledge_amount: 300_000,
    }));
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_attendance_status');
    expect(rpc.mock.calls[0][1]).not.toHaveProperty('p_pledge_option');
  });
});
