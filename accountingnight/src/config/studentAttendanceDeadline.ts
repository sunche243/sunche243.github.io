export const STUDENT_ATTENDANCE_CLOSES_AT = '2026-10-21T00:00:00+09:00';
export const STUDENT_ATTENDANCE_DEADLINE_LABEL = '2026. 10. 20. 23:59:59';

export function isStudentAttendanceClosed(now: number | Date = Date.now()): boolean {
  const timestamp = now instanceof Date ? now.getTime() : now;
  return timestamp >= Date.parse(STUDENT_ATTENDANCE_CLOSES_AT);
}

export function getStudentAttendanceClosingDelay(now = Date.now()): number {
  return Math.max(0, Date.parse(STUDENT_ATTENDANCE_CLOSES_AT) - now);
}
