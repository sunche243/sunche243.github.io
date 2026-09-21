import { describe, expect, it } from 'vitest';
import type { Submission } from '../types/registration';
import { pledgeOptionLabels, submissionStatusLabels } from '../utils/registration';
import { calculateAdminStats, filterSubmissions } from './adminUtils';

const submission: Submission = {
  id: 'submission-1',
  created_at: '2026-09-14T00:00:00Z',
  name: '홍길동',
  phone: '01012345678',
  wants_sponsorship: true,
  sponsorship_units: 2,
  pledge_option: 'century_100',
  pledge_amount: 1_000_000,
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

  it('provides the requested admin labels for every current pledge option', () => {
    expect(pledgeOptionLabels).toMatchObject({
      century_100: '100주년 발전 구좌',
      guardian_50: '50주년 수호 구좌',
      free_attending: '마음으로 함께하기',
      free_absent: '불참 · 발전기금 약정',
      absent_only: '불참',
    });
  });

  it('counts every response while excluding cancelled rows from pledge and attendance totals', () => {
    expect(calculateAdminStats([submission, { ...submission, id: 'cancelled', status: 'cancelled' }])).toEqual({
      totalResponses: 2,
      pledgeCount: 1,
      totalPledgeAmount: 1_000_000,
      attendingCount: 1,
    });
  });

  it('does not cap aggregate sponsorship amounts at the per-submission unit limit', () => {
    const manyUnits = Array.from({ length: 2 }, (_, index) => ({
      ...submission,
      id: `submission-${index}`,
      sponsorship_units: 75,
    }));

    expect(calculateAdminStats(manyUnits.map((item) => ({ ...item, pledge_amount: 37_500_000 }))).totalPledgeAmount).toBe(75_000_000);
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
