import { RevealSection } from '../components/RevealSection';

export function AttendanceClosed() {
  return (
    <RevealSection
      id="attendance-response"
      className="section--paper registration-section attendance-response-section"
      label="참석 회신 마감 안내"
    >
      <div className="section-inner attendance-success attendance-closed">
        <div className="attendance-success__ornament" aria-hidden="true">
          <span>50</span>
        </div>
        <p className="attendance-success__eyebrow">RSVP CLOSED</p>
        <h2>참석 회신이<br />마감되었습니다</h2>
        <p className="attendance-success__lead">
          참가 신청 기간이 종료되어<br />현재는 추가 참석 회신을 받고 있지 않습니다.
        </p>
        <div className="attendance-success__divider" aria-hidden="true" />
        <div className="attendance-success__response">
          <p>DEVELOPMENT FUND</p>
          <strong>발전기금 후원은<br />계속 신청하실 수 있습니다</strong>
          <span>후원은 2026년 11월 15일(일)까지 자유롭게 신청 가능합니다.</span>
        </div>
        <a className="button button--gold" href={`${import.meta.env.BASE_URL}sponsor/#registration`}>
          발전기금 후원 약정하기
        </a>
      </div>
    </RevealSection>
  );
}
