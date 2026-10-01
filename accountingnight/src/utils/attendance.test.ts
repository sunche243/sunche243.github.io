import { describe, expect, it, vi } from 'vitest';
import type { AttendanceDraft } from '../types/attendance';
import { moveToAttendanceSuccess, validateAttendanceResponse } from './attendance';

const draft: AttendanceDraft = {
  name: '홍길동',
  phone: '010-1234-5678',
  admissionYear: '98',
  affiliation: '삼일회계법인 파트너',
  attendanceStatus: 'attending',
  privacyConsent: true,
};

function validate(nextDraft: AttendanceDraft) {
  return validateAttendanceResponse({
    draft: nextDraft,
    honeypot: '',
    formStartedAt: 1_000,
    now: 5_000,
  });
}

describe('attendance response validation', () => {
  it.each(['01012345678', '010-1234-5678'])('accepts the supported phone format: %s', (phone) => {
    expect(validate({ ...draft, phone }).errors.phone).toBeUndefined();
  });

  it.each(['01112345678', '+821012345678', '010 1234 5678', '010.1234.5678', '0101234567a'])(
    'rejects an unsupported phone format: %s',
    (phone) => {
      expect(validate({ ...draft, phone }).errors.phone).toBeTruthy();
    },
  );

  it.each(['', '98', '08'])('accepts an omitted or two-digit admission year: %j', (admissionYear) => {
    expect(validate({ ...draft, admissionYear }).errors.admissionYear).toBeUndefined();
  });

  it.each(['8', '1998', '9a'])('rejects an invalid admission year: %s', (admissionYear) => {
    expect(validate({ ...draft, admissionYear }).errors.admissionYear).toBeTruthy();
  });

  it.each(['attending', 'not_attending'] as const)('accepts the attendance status: %s', (attendanceStatus) => {
    expect(validate({ ...draft, attendanceStatus }).errors.attendanceStatus).toBeUndefined();
  });

  it('rejects missing or unknown attendance status', () => {
    expect(validate({ ...draft, attendanceStatus: null }).errors.attendanceStatus).toBeTruthy();
    expect(validate({ ...draft, attendanceStatus: 'maybe' as 'attending' }).errors.attendanceStatus).toBeTruthy();
  });

  it('requires privacy consent', () => {
    expect(validate({ ...draft, privacyConsent: false }).errors.privacy).toBeTruthy();
    expect(validate({ ...draft, privacyConsent: true }).errors.privacy).toBeUndefined();
  });

  it('scrolls to the success section and focuses its heading after submission', () => {
    const scrollIntoView = vi.fn();
    const focus = vi.fn();

    moveToAttendanceSuccess({ scrollIntoView }, { focus }, false);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });
});
