import { describe, expect, it } from 'vitest';
import { emptyAdminManualResponseDraft } from './adminDataTypes';
import { normalizeAdminPledgeAmount, validateAdminManualResponse } from './adminDataUtils';

describe('admin manual response validation', () => {
  it('accepts a completely blank payload because every data field is optional', () => {
    const result = validateAdminManualResponse(emptyAdminManualResponseDraft('student'));

    expect(result.valid).toBe(true);
    expect(result.value).toEqual(expect.objectContaining({
      responseType: 'student',
      name: null,
      phone: null,
      admissionYear: null,
      attendanceStatus: null,
      studentCouncilExperience: null,
    }));
  });

  it('normalizes supplied values without inventing values for omitted fields', () => {
    const result = validateAdminManualResponse({
      ...emptyAdminManualResponseDraft('sponsorship'),
      name: ' 홍길동 ',
      phone: '010-1234-5678',
      admissionYear: '98',
      pledgeAmount: '500,000',
      attendanceStatus: 'attending',
    });

    expect(result.value).toEqual(expect.objectContaining({
      name: '홍길동',
      phone: '01012345678',
      admissionYear: '98',
      pledgeAmount: 500_000,
      attendanceStatus: 'attending',
      affiliation: null,
    }));
  });

  it('validates only values that were actually supplied', () => {
    expect(validateAdminManualResponse({
      ...emptyAdminManualResponseDraft(),
      phone: '02-123-4567',
    }).errors.phone).toBeTruthy();
    expect(validateAdminManualResponse({
      ...emptyAdminManualResponseDraft(),
      admissionYear: '2024',
    }).errors.admissionYear).toBeTruthy();
  });

  it('formats pledge amounts for the input', () => {
    expect(normalizeAdminPledgeAmount('500000원')).toBe('500,000');
    expect(normalizeAdminPledgeAmount('')).toBe('');
  });
});
