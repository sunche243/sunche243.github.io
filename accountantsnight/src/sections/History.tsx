import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { historyItems, type HistoryItem } from '../data/history';
import { useReveal } from '../hooks/useReveal';

const timelineItems = historyItems.filter((item) => item.timeline);

function HistoryEntry({ item }: { item: HistoryItem }) {
  const ref = useReveal<HTMLLIElement>();
  const prominence = item.timeline?.prominence ?? 'minor';
  const titles = item.timeline?.titles ?? [item.title];

  return (
    <li ref={ref} className={`timeline__item timeline__item--${prominence}`}>
      <span className="timeline__marker" aria-hidden="true" />
      <div className="timeline__summary">
        <time dateTime={item.year}>{item.year}</time>
        <div className="timeline__titles">
          {titles.map((title) => (
            <h3 key={title}>{title}</h3>
          ))}
        </div>
      </div>
    </li>
  );
}

function TimelineClosing() {
  const ref = useReveal<HTMLDivElement>();

  return (
    <div ref={ref} className="timeline__closing" aria-label="2026년 50주년">
      <span className="timeline__closing-marker" aria-hidden="true" />
      <time dateTime="2026">2026</time>
      <p>50th ANNIVERSARY</p>
    </div>
  );
}

export function History() {
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
            {timelineItems.map((item) => (
              <HistoryEntry key={`${item.year}-${item.title}`} item={item} />
            ))}
          </ol>
          <TimelineClosing />
        </div>
      </div>
    </RevealSection>
  );
}
