import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';

export function StudentAttendanceIntro() {
  return (
    <RevealSection id="student-attendance-intro" className="section--ivory attendance-intro" label="재학생 참석 여부 회신 안내">
      <div className="section-inner">
        <SectionHeader eyebrow="STUDENT RSVP" title="재학생 참석 여부를 알려주세요" />
        <div className="attendance-intro__copy">
          <p>
            원활한 행사 준비와 좌석 배정을 위해<br />
            재학생 여러분의 참석 여부를 회신해 주시면 감사하겠습니다.
          </p>
          <p>입력해 주신 내용은 참석 확인과 행사 운영을 위해서만 사용됩니다.</p>
        </div>
      </div>
    </RevealSection>
  );
}
