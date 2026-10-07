import { event } from '../data/event';

export function StudentFinalClosing() {
  return (
    <footer className="final">
      <div className="final__fifty" aria-hidden="true">50</div>
      <div className="final__content">
        <p className="hero__years">{event.years}</p>
        <p>
          선배들의 50년을 이어
          <br />
          재학생 여러분과 새로운 50년을 시작합니다.
        </p>
        <strong>
          DONGGUK UNIVERSITY
          <br />
          DEPARTMENT OF ACCOUNTING
        </strong>
        <small>2026 · 50th Anniversary</small>
        <small>© 2026 Park Chanjun. All Rights Reserved.</small>
      </div>
    </footer>
  );
}
