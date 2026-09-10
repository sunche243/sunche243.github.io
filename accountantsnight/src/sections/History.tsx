import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { historyItems } from '../data/history';

export function History() {
  return (
    <RevealSection className="section--ivory history" label="50년 역사">
      <div className="section-inner">
        <SectionHeader eyebrow="50 YEARS" title="우리의 50년" />
        <div className="history__range" aria-hidden="true">
          <span>1976</span>
          <i />
          <span>2026</span>
        </div>
        {historyItems.length > 0 ? (
          <ol className="timeline">
            {historyItems.map((item) => (
              <li key={`${item.year}-${item.title}`}>
                <time>{item.year}</time>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">50</span>
            <p>상세 연혁을 준비하고 있습니다.</p>
          </div>
        )}
      </div>
    </RevealSection>
  );
}
