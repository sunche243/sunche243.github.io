import { useEffect, useState } from 'react';
import { event } from '../data/event';

export function Hero() {
  const [hasHeroImage, setHasHeroImage] = useState(false);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setHasHeroImage(true);
    image.onerror = () => setHasHeroImage(false);
    image.src = event.heroImage;
  }, []);

  return (
    <header className={`hero ${hasHeroImage ? 'has-hero-image' : ''}`}>
      <div
        className="hero__image"
        aria-hidden="true"
        style={
          hasHeroImage
            ? {
                backgroundImage: `linear-gradient(rgba(17, 17, 17, 0.55), rgba(17, 17, 17, 0.72)), url("${event.heroImage}")`,
              }
            : undefined
        }
      />
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
          <span>50th</span>
          <span>ANNIVERSARY</span>
        </h1>
        <p className="hero__korean">회계인의 밤</p>
        <p className="hero__years">{event.years}</p>
      </div>
      <div className="hero__meta">
        <p>{event.shortDateLabel}</p>
        <p>{event.venueEnglish}</p>
      </div>
      <a className="scroll-cue" href="#invitation" aria-label="초대장 본문으로 이동">
        <span>초대장을 확인해주세요</span>
        <i aria-hidden="true" />
      </a>
    </header>
  );
}
