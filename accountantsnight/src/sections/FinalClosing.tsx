import { event } from '../data/event';

export function FinalClosing() {
  return (
    <footer className="final">
      <div className="final__fifty" aria-hidden="true">
        50
      </div>
      <div className="final__content">
        <p className="hero__years">{event.years}</p>
        <p>
          지나온 50년을 기억하며
          <br />
          함께 만들어갈 새로운 50년을 기다립니다.
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
