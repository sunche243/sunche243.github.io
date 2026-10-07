import { RevealSection } from '../components/RevealSection';
import { programItems } from '../data/program';
import { SectionHeader } from '../components/SectionHeader';

export function StudentProgram() {
  return (
    <RevealSection className="section--paper program student-program" label="행사 식순">
      <div className="section-inner">
        <SectionHeader eyebrow="PROGRAM" />
        <ol className="program-list">
          {programItems.map((item) => (
            <li key={`${item.time}-${item.title}`}>
              <time>{item.time}</time>
              <div>
                <h3>{item.title}</h3>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </RevealSection>
  );
}
