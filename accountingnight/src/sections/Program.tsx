import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { programItems } from '../data/program';

export function Program() {
  const hasProgram = programItems.length > 0;

  return (
    <RevealSection
      className={`section--paper program ${hasProgram ? '' : 'program--empty'}`}
      label="행사 식순"
    >
      <div className="section-inner">
        <SectionHeader eyebrow="PROGRAM" />
        {hasProgram ? (
          <ol className="program-list">
            {programItems.map((item) => (
              <li key={`${item.time}-${item.title}`}>
                <time>{item.time}</time>
                <div>
                  <h3>{item.title}</h3>
                  {item.description ? <p>{item.description}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <div className="program-empty">
            <span aria-hidden="true" />
            <p>행사 세부 프로그램은 추후 안내될 예정입니다.</p>
          </div>
        )}
      </div>
    </RevealSection>
  );
}
