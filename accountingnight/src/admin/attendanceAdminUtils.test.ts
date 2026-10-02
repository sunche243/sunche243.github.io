import { describe, expect, it } from 'vitest';
import type { AttendanceResponse } from '../types/attendance';
import type { Submission } from '../types/registration';
import { calculateAdminStats } from './adminUtils';
import {
  calculateAttendanceAdminStats,
  countAttendanceResponsesByPhone,
  deleteAttendanceResponseFromList,
  filterAttendanceResponses,
  updateAttendanceResponseInList,
  validateAttendanceAdminEdit,
  type AttendanceAdminEditDraft,
} from './attendanceAdminUtils';

const attending: AttendanceResponse = {
  id: 'attendance-1',
  created_at: '2026-10-01T00:00:00Z',
  name: '홍길동',
  phone: '01012345678',
  admission_year: '98',
  affiliation: '삼일회계법인 파트너',
  attendance_status: 'attending',
  privacy_consent_at: '2026-10-01T00:00:00Z',
};

const notAttending: AttendanceResponse = {
  ...attending,
  id: 'attendance-2',
  name: '김동국',
  phone: '01087654321',
  admission_year: '08',
  affiliation: '동국대학교',
  attendance_status: 'not_attending',
};

const validEditDraft: AttendanceAdminEditDraft = {
  name: ' 박찬준 ',
  phone: '010-1234-5678',
  admissionYear: '08',
  affiliation: ' 동국대학교 ',
  attendanceStatus: 'attending',
};

describe('attendance admin utilities', () => {
  it('calculates total, attending, not-attending, and rate from attendance responses only', () => {
    expect(calculateAttendanceAdminStats([attending, notAttending])).toEqual({
      total: 2,
      attending: 1,
      notAttending: 1,
      attendanceRate: 50,
    });
  });

  it.each(['홍길', '010-1234', '98', '삼일회계'])('searches name, phone, admission year, and affiliation: %s', (query) => {
    expect(filterAttendanceResponses([attending, notAttending], { query, status: 'all' })).toEqual([attending]);
  });

  it('filters attendance data independently by status', () => {
    expect(filterAttendanceResponses([attending, notAttending], { query: '', status: 'not_attending' })).toEqual([notAttending]);
  });

  it('keeps attendance response totals separate from legacy submissions totals', () => {
    const submission: Submission = {
      id: 'submission-1',
      created_at: '2026-10-01T00:00:00Z',
      name: '기존 신청자',
      phone: '01011112222',
      wants_sponsorship: true,
      sponsorship_units: 2,
      pledge_option: 'century_100',
      pledge_amount: 1_000_000,
      attendance_status: 'attending',
      answers: {},
      status: 'new',
      admin_memo: '',
      privacy_consent_at: '2026-10-01T00:00:00Z',
    };

    expect(calculateAdminStats([submission]).totalResponses).toBe(1);
    expect(calculateAttendanceAdminStats([attending, notAttending]).total).toBe(2);
  });

  it.each(['01012345678', '010-1234-5678'])('accepts an admin mobile phone and normalizes it: %s', (phone) => {
    const result = validateAttendanceAdminEdit({ ...validEditDraft, phone });

    expect(result.valid).toBe(true);
    expect(result.value?.phone).toBe('01012345678');
  });

  it.each(['01112345678', '+821012345678', '010 1234 5678', '010.1234.5678', '010abcdefgh'])('rejects an invalid admin mobile phone: %s', (phone) => {
    const result = validateAttendanceAdminEdit({ ...validEditDraft, phone });

    expect(result.valid).toBe(false);
    expect(result.errors.phone).toBeTruthy();
  });

  it.each(['', '98', '08'])('accepts a blank or two-digit admission year: %s', (admissionYear) => {
    const result = validateAttendanceAdminEdit({ ...validEditDraft, admissionYear });

    expect(result.valid).toBe(true);
    expect(result.value?.admission_year).toBe(admissionYear || null);
  });

  it.each(['8', '1998', '9a'])('rejects an invalid admission year: %s', (admissionYear) => {
    const result = validateAttendanceAdminEdit({ ...validEditDraft, admissionYear });

    expect(result.valid).toBe(false);
    expect(result.errors.admissionYear).toBeTruthy();
  });

  it('validates editable text fields and attendance status', () => {
    expect(validateAttendanceAdminEdit({ ...validEditDraft, name: ' ' }).errors.name).toBeTruthy();
    expect(validateAttendanceAdminEdit({ ...validEditDraft, affiliation: '가'.repeat(201) }).errors.affiliation).toBeTruthy();
    expect(validateAttendanceAdminEdit({ ...validEditDraft, attendanceStatus: 'undecided' }).errors.attendanceStatus).toBeTruthy();
  });

  it('updates an attendance row without changing immutable timestamps and recalculates stats', () => {
    const updated = updateAttendanceResponseInList([attending, notAttending], attending.id, {
      name: '홍길동 수정',
      phone: attending.phone,
      admission_year: null,
      affiliation: null,
      attendance_status: 'not_attending',
    });

    expect(updated[0]).toMatchObject({
      name: '홍길동 수정',
      attendance_status: 'not_attending',
      created_at: attending.created_at,
      privacy_consent_at: attending.privacy_consent_at,
    });
    expect(calculateAttendanceAdminStats(updated)).toMatchObject({ total: 2, attending: 0, notAttending: 2 });
  });

  it('recalculates duplicate phone markers after an update or deletion', () => {
    const duplicate = { ...notAttending, phone: attending.phone };
    expect(countAttendanceResponsesByPhone([attending, duplicate]).get(attending.phone)).toBe(2);

    const updated = updateAttendanceResponseInList([attending, duplicate], duplicate.id, {
      name: duplicate.name,
      phone: '01099998888',
      admission_year: duplicate.admission_year,
      affiliation: duplicate.affiliation,
      attendance_status: duplicate.attendance_status,
    });
    expect(countAttendanceResponsesByPhone(updated).get(attending.phone)).toBe(1);

    const remaining = deleteAttendanceResponseFromList([attending, duplicate], duplicate.id);
    expect(remaining).toEqual([attending]);
    expect(countAttendanceResponsesByPhone(remaining).get(attending.phone)).toBe(1);
  });
});
