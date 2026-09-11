import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { historyItems, type HistoryItem } from '../data/history';
import { useReveal } from '../hooks/useReveal';

const milestoneYears = new Set(['1976', '1984', '1997', '2017']);

function HistoryEntry({ item }: { item: HistoryItem }) {
  const ref = useReveal<HTMLLIElement>();
  const isMilestone = milestoneYears.has(item.year);

  return (
    <li ref={ref} className={`timeline__item ${isMilestone ? 'timeline__item--milestone' : ''}`}>
      <time dateTime={item.year}>{item.year}</time>
      <span className="timeline__divider" aria-hidden="true" />
      <div className="timeline__content">
        <h3>{item.title}</h3>
        {item.description.length ? (
          <ul className="timeline__description">
            {item.description.map((description) => (
              <li key={description}>{description}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </li>
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
        <ol className="timeline">
          {historyItems.map((item) => (
            <HistoryEntry key={`${item.year}-${item.title}`} item={item} />
          ))}
        </ol>
      </div>
    </RevealSection>
  );
}
