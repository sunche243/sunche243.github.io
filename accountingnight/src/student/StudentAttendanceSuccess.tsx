import type { Ref } from 'react';
import { event } from '../data/event';
import type { AttendanceResponseStatus } from '../types/attendance';

interface StudentAttendanceSuccessProps {
  name: string;
  status: AttendanceResponseStatus;
  headingRef?: Ref<HTMLHeadingElement>;
}

export function StudentAttendanceSuccess({ name, status, headingRef }: StudentAttendanceSuccessProps) {
  const attending = status === 'attending';

  return (
    <div className="section-inner attendance-success" role="status" aria-live="polite">
      <div className="attendance-success__ornament" aria-hidden="true"><span>✓</span></div>
      <p className="attendance-success__eyebrow">STUDENT RESPONSE RECEIVED</p>
      <h2 id="student-attendance-success-title" ref={headingRef} tabIndex={-1}>
        {attending ? '참석 신청이 접수되었습니다' : '불참 회신이 접수되었습니다'}
      </h2>
      <p className="attendance-success__lead">
        {attending ? '참석 신청이 정상적으로 전달되었습니다.' : '불참 회신이 정상적으로 전달되었습니다.'}
      </p>

      <div className="attendance-success__response" aria-label="회신한 참석 여부">
        <p>{attending ? '신청 내용' : '응답 내용'}</p>
        <strong>{attending ? '참석을 신청했습니다' : '참석하지 못합니다'}</strong>
        <span>{name}님의 {attending ? '신청' : '회신'}이 접수되었습니다.</span>
      </div>

      <p className="attendance-success__message">
        {attending ? (
          <>선정 결과와 참가비 납부 방법은<br />추후 개별 연락으로 안내드립니다.</>
        ) : (
          <>소중한 회신에 감사드립니다.<br />다음 학과 행사에서 함께할 수 있기를 바랍니다.</>
        )}
      </p>

      <div className="attendance-success__divider" aria-hidden="true" />
      <dl className="attendance-success__event" aria-label="행사 정보">
        <div><dt>DATE</dt><dd>{event.shortDateLabel}</dd></div>
        <div><dt>TIME</dt><dd>{event.startTime}</dd></div>
        <div><dt>VENUE</dt><dd>{event.venue}</dd></div>
      </dl>
      <p className="attendance-success__resubmit">내용을 변경하려면 페이지를 새로고침한 뒤 동일한 전화번호로 다시 제출해 주세요.</p>
    </div>
  );
}
