import type { AttendanceResponse, AttendanceResponseStatus } from '../types/attendance';
import { normalizePhone } from '../utils/registration';

export interface AttendanceAdminFilters {
  query: string;
  status: AttendanceResponseStatus | 'all';
}

export interface AttendanceAdminStats {
  total: number;
  attending: number;
  notAttending: number;
  attendanceRate: number;
}

export function calculateAttendanceAdminStats(responses: AttendanceResponse[]): AttendanceAdminStats {
  const attending = responses.filter((response) => response.attendance_status === 'attending').length;
  const notAttending = responses.filter((response) => response.attendance_status === 'not_attending').length;

  return {
    total: responses.length,
    attending,
    notAttending,
    attendanceRate: responses.length ? (attending / responses.length) * 100 : 0,
  };
}

export function filterAttendanceResponses(
  responses: AttendanceResponse[],
  filters: AttendanceAdminFilters,
): AttendanceResponse[] {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');
  const normalizedPhoneQuery = normalizePhone(filters.query);

  return responses.filter((response) => {
    const matchesQuery = !query
      || response.name.toLocaleLowerCase('ko-KR').includes(query)
      || (normalizedPhoneQuery.length > 0 && response.phone.includes(normalizedPhoneQuery))
      || (response.admission_year?.toLocaleLowerCase('ko-KR').includes(query) ?? false)
      || (response.affiliation?.toLocaleLowerCase('ko-KR').includes(query) ?? false);
    const matchesStatus = filters.status === 'all' || response.attendance_status === filters.status;

    return matchesQuery && matchesStatus;
  });
}

export function countAttendanceResponsesByPhone(responses: AttendanceResponse[]): Map<string, number> {
  return responses.reduce((counts, response) => {
    counts.set(response.phone, (counts.get(response.phone) ?? 0) + 1);
    return counts;
  }, new Map<string, number>());
}
