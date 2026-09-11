import { useEffect, useRef, useState } from 'react';
import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { historyItems, type HistoryItem } from '../data/history';

interface HistoryEntryProps {
  item: HistoryItem;
  expandedYear: string | null;
  onToggle: (year: string | null) => void;
}

function useTimelineReveal<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || isVisible) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(node);
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible]);

  return { ref, isVisible };
}

function HistoryEntry({ item, expandedYear, onToggle }: HistoryEntryProps) {
  const { ref, isVisible } = useTimelineReveal<HTMLLIElement>();
  const isMajor = Boolean(item.featured);
  const canExpand = !isMajor || item.description.length > 0;
  const isExpanded = canExpand && expandedYear === item.year;
  const detailId = `history-${item.year}`;

  const toggle = () => {
    if (!canExpand) {
      onToggle(null);
      return;
    }

    onToggle(isExpanded ? null : item.year);
  };

  return (
    <li
      ref={ref}
      className={`timeline__item timeline__item--${isMajor ? 'major' : 'minor'} ${isExpanded ? 'is-expanded' : ''} ${isVisible ? 'is-visible' : ''}`}
    >
      <span className="timeline__marker" aria-hidden="true" />
      <button
        className="timeline__trigger"
        type="button"
        aria-expanded={isExpanded}
        aria-controls={canExpand ? detailId : undefined}
        aria-label={
          canExpand
            ? `${item.year}년 ${item.title} 세부 연혁 ${isExpanded ? '접기' : '펼치기'}`
            : `${item.year}년 ${item.title}`
        }
        onClick={toggle}
      >
        <time dateTime={item.year}>{item.year}</time>
        {isMajor ? <span className="timeline__title">{item.title}</span> : null}
        {canExpand ? <span className="timeline__hint" aria-hidden="true" /> : null}
      </button>
      {canExpand ? (
        <div className="timeline__details" id={detailId} data-open={isExpanded} aria-hidden={!isExpanded}>
          <div className="timeline__details-inner">
            <div className="timeline__details-content">
              {!isMajor ? <h3>{item.title}</h3> : null}
              {item.description.length ? (
                <ul className="timeline__description">
                  {item.description.map((description) => (
                    <li key={description}>{description}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

function TimelineClosing() {
  const { ref, isVisible } = useTimelineReveal<HTMLDivElement>();

  return (
    <div ref={ref} className={`timeline__closing ${isVisible ? 'is-visible' : ''}`} aria-label="2026년 50주년">
      <span className="timeline__closing-marker" aria-hidden="true" />
      <time dateTime="2026">2026</time>
      <p>50th ANNIVERSARY</p>
    </div>
  );
}

export function History() {
  const [expandedYear, setExpandedYear] = useState<string | null>(null);

  return (
    <RevealSection className="section--ivory history" label="50년 역사">
      <div className="section-inner">
        <SectionHeader eyebrow="50 YEARS OF HISTORY" title="우리의 50년" />
        <div className="history__range" aria-hidden="true">
          <span>1976</span>
          <i />
          <span>2026</span>
        </div>
        <div className="timeline">
          <ol className="timeline__list">
            {historyItems.map((item) => (
              <HistoryEntry
                key={`${item.year}-${item.title}`}
                item={item}
                expandedYear={expandedYear}
                onToggle={setExpandedYear}
              />
            ))}
          </ol>
          <TimelineClosing />
        </div>
      </div>
    </RevealSection>
  );
}
