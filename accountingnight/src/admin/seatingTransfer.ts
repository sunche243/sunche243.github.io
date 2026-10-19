import type { StudentAttendanceResponse } from '../types/studentAttendance';

export const SEATING_TRANSFER_KEY = 'accountingnight:selected-students-to-seating:v1';

export interface SeatingTransferPerson {
  id: string;
  name: string;
  group: string;
  identifier: string;
}

export function selectedStudentsForSeating(responses: StudentAttendanceResponse[]): SeatingTransferPerson[] {
  return responses
    .filter((response) => response.attendance_status === 'attending' && response.selection_status === 'selected')
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))
    .map((response) => ({
      id: `student-${response.id}`,
      name: response.name,
      group: response.admission_year ? `${response.admission_year}학번` : '학번 미입력',
      identifier: response.phone,
    }));
}

export function saveSelectedStudentsForSeating(responses: StudentAttendanceResponse[]): number {
  const people = selectedStudentsForSeating(responses);
  window.sessionStorage.setItem(SEATING_TRANSFER_KEY, JSON.stringify({
    version: 1,
    createdAt: new Date().toISOString(),
    people,
  }));
  return people.length;
}
