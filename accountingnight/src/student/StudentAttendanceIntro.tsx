import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';

export function StudentAttendanceIntro() {
  return (
    <RevealSection id="student-attendance-intro" className="section--ivory attendance-intro" label="재학생 참석 신청 및 불참 회신 안내">
      <div className="section-inner">
        <SectionHeader eyebrow="STUDENT APPLICATION" title="재학생 참석 신청을 안내드립니다" />
        <div className="attendance-intro__copy">
          <p>
            원활한 행사 준비와 좌석 배정을 위해<br />
            참석을 희망하는 재학생은 신청서를 제출해 주세요.
          </p>
          <p>신청자 중 참석자 선정 기준에 따라 선정한 뒤 결과를 개별 안내드립니다.</p>
          <p><strong>이번 행사는 1학년(26학번) 대상 행사가 아닙니다.</strong></p>
          <p>참석이 어려운 경우에도 행사 준비를 위해 불참 회신을 부탁드립니다.</p>
        </div>
      </div>
    </RevealSection>
  );
}
