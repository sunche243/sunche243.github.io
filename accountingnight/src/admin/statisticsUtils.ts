import type { AttendanceResponse } from '../types/attendance';
import type { Submission } from '../types/registration';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import { getSubmissionPledgeAmount } from '../utils/registration';
import { getStudentSelectionPriority } from './studentAttendanceAdminUtils';

export interface AdminDashboardStatistics {
  currentParticipants: number;
  sponsorshipAttendees: number;
  generalAttendees: number;
  studentSelected: number;
  totalCurrentResponses: number;
  pledgeCount: number;
  totalPledgeAmount: number;
  sponsorshipNotAttending: number;
  generalNotAttending: number;
  studentApplications: number;
  studentNotAttending: number;
  studentPriorityOne: number;
  studentPriorityTwo: number;
  studentPriorityThree: number;
  studentPriorityUnverified: number;
  studentPending: number;
  studentWaitlisted: number;
  studentNotSelected: number;
  studentCancelled: number;
  studentParticipationFeePaid: number;
  studentParticipationFeeUnpaid: number;
  studentSelectionRate: number;
}

export function calculateAdminDashboardStatistics(
  submissions: Submission[],
  attendanceResponses: AttendanceResponse[],
  studentAttendanceResponses: StudentAttendanceResponse[],
): AdminDashboardStatistics {
  const activeSubmissions = submissions.filter((submission) => submission.status !== 'cancelled');
  const sponsorshipAttendees = activeSubmissions.filter(
    (submission) => submission.attendance_status === 'attending',
  ).length;
  const generalAttendees = attendanceResponses.filter(
    (response) => response.attendance_status === 'attending',
  ).length;
  const studentApplications = studentAttendanceResponses.filter(
    (response) => response.attendance_status === 'attending',
  );
  const studentSelected = studentAttendanceResponses.filter(
    (response) => response.selection_status === 'selected',
  ).length;

  const priorityCounts = studentApplications.reduce(
    (counts, response) => {
      const priority = getStudentSelectionPriority(response);
      if (priority === 1) counts.one += 1;
      else if (priority === 2) counts.two += 1;
      else if (priority === 3) counts.three += 1;
      else counts.unverified += 1;
      return counts;
    },
    { one: 0, two: 0, three: 0, unverified: 0 },
  );

  return {
    currentParticipants: sponsorshipAttendees + generalAttendees + studentSelected,
    sponsorshipAttendees,
    generalAttendees,
    studentSelected,
    totalCurrentResponses: activeSubmissions.length + attendanceResponses.length + studentAttendanceResponses.length,
    pledgeCount: activeSubmissions.filter((submission) => getSubmissionPledgeAmount(submission) > 0).length,
    totalPledgeAmount: activeSubmissions.reduce(
      (total, submission) => total + getSubmissionPledgeAmount(submission),
      0,
    ),
    sponsorshipNotAttending: activeSubmissions.filter(
      (submission) => submission.attendance_status === 'not_attending',
    ).length,
    generalNotAttending: attendanceResponses.filter(
      (response) => response.attendance_status === 'not_attending',
    ).length,
    studentApplications: studentApplications.length,
    studentNotAttending: studentAttendanceResponses.filter(
      (response) => response.attendance_status === 'not_attending',
    ).length,
    studentPriorityOne: priorityCounts.one,
    studentPriorityTwo: priorityCounts.two,
    studentPriorityThree: priorityCounts.three,
    studentPriorityUnverified: priorityCounts.unverified,
    studentPending: studentAttendanceResponses.filter(
      (response) => response.selection_status === 'pending',
    ).length,
    studentWaitlisted: studentAttendanceResponses.filter(
      (response) => response.selection_status === 'waitlisted',
    ).length,
    studentNotSelected: studentAttendanceResponses.filter(
      (response) => response.selection_status === 'not_selected',
    ).length,
    studentCancelled: studentAttendanceResponses.filter(
      (response) => response.selection_status === 'cancelled',
    ).length,
    studentParticipationFeePaid: studentAttendanceResponses.filter(
      (response) => response.selection_status === 'selected' && response.participation_fee_status === 'paid',
    ).length,
    studentParticipationFeeUnpaid: studentAttendanceResponses.filter(
      (response) => response.selection_status === 'selected' && response.participation_fee_status === 'unpaid',
    ).length,
    studentSelectionRate: studentApplications.length > 0
      ? (studentSelected / studentApplications.length) * 100
      : 0,
  };
}
