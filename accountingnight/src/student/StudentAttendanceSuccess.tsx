import type { Ref } from 'react';
import { event } from '../data/event';
import type { AttendanceResponseStatus } from '../types/attendance';

interface StudentAttendanceSuccessProps {
  name: string;
  status: AttendanceResponseStatus;
  headingRef?: Ref<HTMLHeadingElement>;
}

const eventMonthDay = new Intl.DateTimeFormat('ko-KR', {
  timeZone: event.timezone,
  month: 'long',
  day: 'numeric',
}).format(new Date(event.startIso));

export function StudentAttendanceSuccess({ name, status, headingRef }: StudentAttendanceSuccessProps) {
  const attending = status === 'attending';

  return (
    <div className="section-inner attendance-success" role="status" aria-live="polite">
      <div className="attendance-success__ornament" aria-hidden="true"><span>✓</span></div>
      <p className="attendance-success__eyebrow">STUDENT RSVP COMPLETE</p>
      <h2 id="student-attendance-success-title" ref={headingRef} tabIndex={-1}>회신해 주셔서 감사합니다</h2>
      <p className="attendance-success__lead">재학생 참석 여부가 정상적으로 전달되었습니다.</p>

      <div className="attendance-success__response" aria-label="회신한 참석 여부">
        <p>응답 내용</p>
        <strong>{attending ? '참석합니다' : '참석하지 못합니다'}</strong>
        <span>{name}님의 회신이 접수되었습니다.</span>
      </div>

      <p className="attendance-success__message">
        {attending ? (
          <>{eventMonthDay},<br />선후배가 함께하는 회계인의 밤에서 뵙겠습니다.</>
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
      <p className="attendance-success__resubmit">응답 내용을 변경하시려면 페이지를 새로고침한 뒤 다시 회신해 주세요.</p>
    </div>
  );
}
