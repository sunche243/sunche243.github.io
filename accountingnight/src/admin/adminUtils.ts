import type { AttendanceStatus, Submission, SubmissionStatus } from '../types/registration';
import { getSubmissionPledgeAmount, normalizePhone } from '../utils/registration';

export interface AdminFilters {
  query: string;
  status: SubmissionStatus | 'all';
  attendance: AttendanceStatus | 'all' | 'not_selected';
  sponsorship: 'all' | 'yes' | 'no';
}

export interface AdminStats {
  totalResponses: number;
  pledgeCount: number;
  totalPledgeAmount: number;
  attendingCount: number;
}

export function filterSubmissions(submissions: Submission[], filters: AdminFilters): Submission[] {
  const query = filters.query.trim().toLocaleLowerCase('ko-KR');
  const normalizedQueryPhone = normalizePhone(filters.query);

  return submissions.filter((submission) => {
    const matchesQuery = !query ||
      submission.name.toLocaleLowerCase('ko-KR').includes(query) ||
      (normalizedQueryPhone.length > 0 && submission.phone.includes(normalizedQueryPhone));
    const matchesStatus = filters.status === 'all' || submission.status === filters.status;
    const matchesAttendance = filters.attendance === 'all' ||
      (filters.attendance === 'not_selected'
        ? submission.attendance_status === null
        : submission.attendance_status === filters.attendance);
    const matchesSponsorship = filters.sponsorship === 'all' ||
      (filters.sponsorship === 'yes'
        ? getSubmissionPledgeAmount(submission) > 0
        : getSubmissionPledgeAmount(submission) === 0);

    return matchesQuery && matchesStatus && matchesAttendance && matchesSponsorship;
  });
}

export function calculateAdminStats(submissions: Submission[]): AdminStats {
  const active = submissions.filter((submission) => submission.status !== 'cancelled');
  const pledged = active.filter((submission) => getSubmissionPledgeAmount(submission) > 0);

  return {
    totalResponses: submissions.length,
    pledgeCount: pledged.length,
    totalPledgeAmount: pledged.reduce((total, submission) => total + getSubmissionPledgeAmount(submission), 0),
    attendingCount: active.filter((submission) => submission.attendance_status === 'attending').length,
  };
}

export function formatAdminDate(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value));
}
