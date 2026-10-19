import { RevealSection } from '../components/RevealSection';
import { STUDENT_ATTENDANCE_DEADLINE_LABEL } from '../config/studentAttendanceDeadline';

export function StudentAttendanceClosed() {
  return (
    <RevealSection
      id="student-attendance-response"
      className="section--paper student-attendance-closed"
      label="재학생 참석 신청 마감 안내"
    >
      <div className="section-inner student-attendance-closed__inner">
        <div className="student-attendance-closed__ornament" aria-hidden="true">
          <span />
          <b>50</b>
          <span />
        </div>
        <p className="student-attendance-closed__eyebrow">APPLICATION CLOSED</p>
        <h2>재학생 참석 신청이<br />마감되었습니다</h2>
        <p className="student-attendance-closed__message">
          회계학과 50주년을 함께 축하해 주시고<br />
          보내주신 관심과 성원에 진심으로 감사드립니다.
        </p>
        <div className="student-attendance-closed__deadline">
          <span>접수 마감</span>
          <strong>{STUDENT_ATTENDANCE_DEADLINE_LABEL}</strong>
          <small>KOREA STANDARD TIME</small>
        </div>
        <p className="student-attendance-closed__notice">
          접수된 신청의 선정 결과와 행사 안내는<br />입력하신 연락처를 통해 개별적으로 안내드립니다.
        </p>
        <a className="button button--outline-dark" href={`${import.meta.env.BASE_URL}student/`}>
          재학생 초대장 다시 보기
        </a>
      </div>
    </RevealSection>
  );
}
