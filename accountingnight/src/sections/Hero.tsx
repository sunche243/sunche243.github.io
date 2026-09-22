import { event } from '../data/event';

interface HeroProps {
  scrollLabel?: string;
  scrollHref?: string;
  scrollAriaLabel?: string;
}

export function Hero({
  scrollLabel = '초대장을 확인해주세요',
  scrollHref = '#invitation',
  scrollAriaLabel = '초대장 본문으로 이동',
}: HeroProps) {
  return (
    <header className="hero">
      <div className="hero__fifty" aria-hidden="true">
        50
      </div>
      <div className="hero__content">
        <p className="hero__kicker">
          {event.englishLines.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
        <h1>
          <span className="hero__ordinal">50th</span>
          <span className="hero__anniversary">ANNIVERSARY</span>
        </h1>
        <p className="hero__korean">회계인의 밤</p>
        <p className="hero__years">{event.years}</p>
      </div>
      <div className="hero__meta">
        <p>{event.shortDateLabel}</p>
        <p>{event.venueEnglish}</p>
      </div>
      <a className="scroll-cue" href={scrollHref} aria-label={scrollAriaLabel}>
        <span>{scrollLabel}</span>
        <i aria-hidden="true" />
      </a>
    </header>
  );
}
