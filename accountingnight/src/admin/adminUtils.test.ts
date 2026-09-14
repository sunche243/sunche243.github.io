import { describe, expect, it } from 'vitest';
import type { Submission } from '../types/registration';
import { submissionStatusLabels } from '../utils/registration';
import { calculateAdminStats, filterSubmissions } from './adminUtils';

const submission: Submission = {
  id: 'submission-1',
  created_at: '2026-09-14T00:00:00Z',
  name: '홍길동',
  phone: '01012345678',
  wants_sponsorship: true,
  sponsorship_units: 2,
  attendance_status: 'attending',
  answers: {},
  status: 'new',
  admin_memo: '',
  privacy_consent_at: '2026-09-14T00:00:00Z',
};

describe('admin utilities', () => {
  it('provides Korean labels for every admin status', () => {
    expect(submissionStatusLabels).toEqual({
      new: '신규',
      contacted: '연락 완료',
      confirmed: '확정',
      cancelled: '취소',
    });
  });

  it('calculates stats while excluding cancelled submissions', () => {
    expect(calculateAdminStats([submission, { ...submission, id: 'cancelled', status: 'cancelled' }])).toEqual({
      sponsorCount: 1,
      sponsorshipUnits: 2,
      expectedAmount: 1_000_000,
      attendingCount: 1,
    });
  });

  it('does not cap aggregate sponsorship amounts at the per-submission unit limit', () => {
    const manyUnits = Array.from({ length: 2 }, (_, index) => ({
      ...submission,
      id: `submission-${index}`,
      sponsorship_units: 75,
    }));

    expect(calculateAdminStats(manyUnits).expectedAmount).toBe(75_000_000);
  });

  it('filters by normalized phone input', () => {
    expect(filterSubmissions([submission], {
      query: '010-1234',
      status: 'all',
      attendance: 'all',
      sponsorship: 'all',
    })).toHaveLength(1);
  });
});
