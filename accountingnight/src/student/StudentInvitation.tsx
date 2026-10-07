import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { event } from '../data/event';

const studentInvitationCopy = [
  '회계학과의 오늘을 함께 만들어가고 있는\n재학생 여러분을 「회계인의 밤」에 초대합니다.',
  '학과의 지난 50년을 이끌어온 선배들과 만나\n소중한 경험을 나누고 새로운 인연을 이어가는\n뜻깊은 시간이 되기를 바랍니다.',
  '우리 학과의 다음 50년을 시작하는 자리에\n재학생 여러분의 밝은 에너지와 발걸음을 더해주세요.',
];

export function StudentInvitation() {
  return (
    <RevealSection id="student-invitation" className="section--ivory invitation" label="재학생 초대의 글">
      <div className="section-inner section-inner--narrow">
        <SectionHeader eyebrow="STUDENT INVITATION" title="재학생 여러분을 초대합니다" />
        <div className="invitation__copy">
          {studentInvitationCopy.map((paragraph) => (
            <p key={paragraph}>
              {paragraph.split('\n').map((line) => <span key={line}>{line}</span>)}
            </p>
          ))}
        </div>
        <p className="signature">{event.host}</p>
      </div>
    </RevealSection>
  );
}
