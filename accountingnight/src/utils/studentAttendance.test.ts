import { describe, expect, it } from 'vitest';
import type { StudentAttendanceDraft } from '../types/studentAttendance';
import { validateStudentAttendanceResponse } from './studentAttendance';

const draft: StudentAttendanceDraft = {
  name: '김동국',
  phone: '010-1234-5678',
  admissionYear: '24',
  studentCouncilExperience: true,
  studentCouncilDetails: '2025년 회계학과 학생회 기획국장',
  attendanceStatus: 'attending',
  privacyConsent: true,
  selectionCriteriaConsent: true,
};

function validate(nextDraft: StudentAttendanceDraft) {
  return validateStudentAttendanceResponse({
    draft: nextDraft,
    honeypot: '',
    formStartedAt: 1_000,
    now: 5_000,
  });
}

describe('student attendance response validation', () => {
  it('accepts a student response with council experience details', () => {
    expect(validate(draft)).toEqual({ valid: true, errors: {} });
  });

  it('accepts no council experience without details', () => {
    expect(validate({
      ...draft,
      studentCouncilExperience: false,
      studentCouncilDetails: '',
    })).toEqual({ valid: true, errors: {} });
  });

  it('requires a council experience choice', () => {
    expect(validate({ ...draft, studentCouncilExperience: null }).errors.studentCouncilExperience).toBeTruthy();
  });

  it('requires details when council experience is selected', () => {
    expect(validate({ ...draft, studentCouncilDetails: ' ' }).errors.studentCouncilDetails).toBeTruthy();
  });

  it('limits council details to 500 characters', () => {
    expect(validate({ ...draft, studentCouncilDetails: '가'.repeat(501) }).errors.studentCouncilDetails).toBeTruthy();
  });

  it.each(['01012345678', '010-1234-5678'])('accepts the supported phone format: %s', (phone) => {
    expect(validate({ ...draft, phone }).errors.phone).toBeUndefined();
  });

  it('validates the attendance status and required consents', () => {
    expect(validate({ ...draft, attendanceStatus: null }).errors.attendanceStatus).toBeTruthy();
    expect(validate({ ...draft, privacyConsent: false }).errors.privacy).toBeTruthy();
    expect(validate({ ...draft, selectionCriteriaConsent: false }).errors.selectionCriteriaConsent).toBeTruthy();
  });
});
