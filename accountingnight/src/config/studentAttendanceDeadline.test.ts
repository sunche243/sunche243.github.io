import { describe, expect, it } from 'vitest';
import {
  getStudentAttendanceClosingDelay,
  isStudentAttendanceClosed,
  STUDENT_ATTENDANCE_CLOSES_AT,
} from './studentAttendanceDeadline';

describe('student attendance deadline', () => {
  it('keeps the form open through 2026-10-20 23:59:59 KST and closes at midnight', () => {
    expect(isStudentAttendanceClosed(new Date('2026-10-20T23:59:59.999+09:00'))).toBe(false);
    expect(isStudentAttendanceClosed(new Date(STUDENT_ATTENDANCE_CLOSES_AT))).toBe(true);
  });

  it('calculates the remaining delay without returning a negative value', () => {
    const closingTime = Date.parse(STUDENT_ATTENDANCE_CLOSES_AT);
    expect(getStudentAttendanceClosingDelay(closingTime - 1_000)).toBe(1_000);
    expect(getStudentAttendanceClosingDelay(closingTime + 1_000)).toBe(0);
  });
});
