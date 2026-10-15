import { useMemo } from 'react';
import type { AttendanceResponse } from '../types/attendance';
import type { Submission } from '../types/registration';
import type { StudentAttendanceResponse } from '../types/studentAttendance';
import { formatWon } from '../utils/registration';
import { calculateAdminDashboardStatistics } from './statisticsUtils';

interface StatisticsPanelProps {
  submissions: Submission[];
  attendanceResponses: AttendanceResponse[];
  studentAttendanceResponses: StudentAttendanceResponse[];
}

interface StatisticCardProps {
  label: string;
  value: string | number;
  unit?: string;
  description?: string;
  emphasis?: boolean;
}

function StatisticCard({ label, value, unit = '명', description, emphasis = false }: StatisticCardProps) {
  return (
    <article className={`admin-statistic-card${emphasis ? ' admin-statistic-card--emphasis' : ''}`}>
      <span>{label}</span>
      <strong>{value}{unit ? <small>{unit}</small> : null}</strong>
      {description ? <p>{description}</p> : null}
    </article>
  );
}

export function StatisticsPanel({
  submissions,
  attendanceResponses,
  studentAttendanceResponses,
}: StatisticsPanelProps) {
  const stats = useMemo(
    () => calculateAdminDashboardStatistics(submissions, attendanceResponses, studentAttendanceResponses),
    [submissions, attendanceResponses, studentAttendanceResponses],
  );

  return (
    <section className="admin-panel admin-statistics-panel" aria-labelledby="statistics-title">
      <div className="admin-panel__heading">
        <div>
          <p>OVERVIEW</p>
          <h2 id="statistics-title">운영 통계</h2>
        </div>
      </div>
      <p className="admin-panel__description">
        현재 저장된 유효 회신을 기준으로 집계합니다. 참가자 수는 각 회신 채널의 인원을 합산하며 채널 간 중복은 자동 제거하지 않습니다.
      </p>

      <section className="admin-statistics-section" aria-labelledby="participant-summary-title">
        <div className="admin-statistics-section__heading">
          <div>
            <p>PARTICIPANTS</p>
            <h3 id="participant-summary-title">현재 참가자 현황</h3>
          </div>
          <span>후원 참석 예정 + 일반 참석 + 학생 선정</span>
        </div>
        <div className="admin-statistics-hero">
          <StatisticCard
            label="현재 참가자 수"
            value={stats.currentParticipants}
            description={`${stats.sponsorshipAttendees} + ${stats.generalAttendees} + ${stats.studentSelected}`}
            emphasis
          />
          <div className="admin-participant-equation" aria-label={`발전기금 약정 참석 예정 ${stats.sponsorshipAttendees}명, 일반 참석 ${stats.generalAttendees}명, 학생 선정 ${stats.studentSelected}명`}>
            <StatisticCard label="발전기금 약정 참석 예정" value={stats.sponsorshipAttendees} />
            <span aria-hidden="true">+</span>
            <StatisticCard label="일반 참석 회신" value={stats.generalAttendees} />
            <span aria-hidden="true">+</span>
            <StatisticCard label="학생 선정" value={stats.studentSelected} />
          </div>
        </div>
      </section>

      <section className="admin-statistics-section" aria-labelledby="student-priority-title">
        <div className="admin-statistics-section__heading">
          <div>
            <p>STUDENT PRIORITY</p>
            <h3 id="student-priority-title">재학생 신청 및 우선순위</h3>
          </div>
          <span>참석 신청자 기준</span>
        </div>
        <div className="admin-statistics-grid admin-statistics-grid--four">
          <StatisticCard label="재학생 참석 신청 합계" value={stats.studentApplications} emphasis />
          <StatisticCard label="1순위" value={stats.studentPriorityOne} description="학생회 활동 경험자" />
          <StatisticCard label="2순위" value={stats.studentPriorityTwo} description="학생회비 납부자" />
          <StatisticCard label="3순위" value={stats.studentPriorityThree} description="학생회비 미납부자" />
          <StatisticCard label="우선순위 확인 필요" value={stats.studentPriorityUnverified} description="학생회비 상태 미확인" />
          <StatisticCard label="재학생 불참" value={stats.studentNotAttending} />
          <StatisticCard label="선정률" value={stats.studentSelectionRate.toFixed(1)} unit="%" />
        </div>
      </section>

      <section className="admin-statistics-section" aria-labelledby="student-operation-title">
        <div className="admin-statistics-section__heading">
          <div>
            <p>SELECTION</p>
            <h3 id="student-operation-title">재학생 선정 운영</h3>
          </div>
        </div>
        <div className="admin-statistics-grid">
          <StatisticCard label="선정" value={stats.studentSelected} />
          <StatisticCard label="선정 검토" value={stats.studentPending} />
          <StatisticCard label="대기" value={stats.studentWaitlisted} />
          <StatisticCard label="미선정" value={stats.studentNotSelected} />
          <StatisticCard label="취소" value={stats.studentCancelled} />
          <StatisticCard label="선정자 참가비 납부" value={stats.studentParticipationFeePaid} />
          <StatisticCard label="선정자 참가비 미납" value={stats.studentParticipationFeeUnpaid} />
        </div>
      </section>

      <section className="admin-statistics-section" aria-labelledby="response-summary-title">
        <div className="admin-statistics-section__heading">
          <div>
            <p>RESPONSES</p>
            <h3 id="response-summary-title">전체 회신 및 후원 현황</h3>
          </div>
        </div>
        <div className="admin-statistics-grid">
          <StatisticCard label="현재 유효 회신 합계" value={stats.totalCurrentResponses} unit="건" emphasis />
          <StatisticCard label="발전기금 약정 인원" value={stats.pledgeCount} />
          <StatisticCard label="총 약정액" value={formatWon(stats.totalPledgeAmount)} unit="" />
          <StatisticCard label="발전기금 회신 중 불참" value={stats.sponsorshipNotAttending} />
          <StatisticCard label="일반 참석 회신 중 불참" value={stats.generalNotAttending} />
        </div>
      </section>
    </section>
  );
}
