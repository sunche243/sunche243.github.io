import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';

export function StudentAttendanceIntro() {
  return (
    <RevealSection id="student-attendance-intro" className="section--ivory attendance-intro" label="재학생 참석 여부 회신 안내">
      <div className="section-inner">
        <SectionHeader eyebrow="STUDENT RSVP" title="재학생 참석 여부를 알려주세요" />
        <div className="attendance-intro__copy">
          <p>
            학생회 경험이 있는 학생을 우선 선발하며<br />
            이후 무작위 추첨을 통해 참석자를 선정합니다.
          </p>
          <p>입력해 주신 내용은 참석 확인과 행사 운영을 위해서만 사용됩니다.</p>
        </div>
      </div>
    </RevealSection>
  );
}
