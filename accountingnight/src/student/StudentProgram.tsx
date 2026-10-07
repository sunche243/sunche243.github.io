import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';

const studentProgramItems = [
  { time: '17:00', title: '입장 시작' },
  { time: '17:30', title: '개회' },
  { time: '18:00', title: '환영사' },
  { time: '18:30', title: '축사' },
  { time: '19:00-19:55', title: '식사' },
  { time: '19:55-20:20', title: 'ACCORD 공연' },
  { time: '20:20', title: '2부 시작 및 레크레이션' },
  { time: '20:40', title: '럭키드로우' },
  { time: '21:00', title: '폐회식' },
];

export function StudentProgram() {
  return (
    <RevealSection className="section--paper program student-program" label="행사 식순">
      <div className="section-inner">
        <SectionHeader eyebrow="PROGRAM" />
        <ol className="program-list">
          {studentProgramItems.map((item) => (
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
