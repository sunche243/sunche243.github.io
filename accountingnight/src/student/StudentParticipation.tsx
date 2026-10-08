import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';

const studentAttendanceUrl = `${import.meta.env.BASE_URL}student/attendance/#student-attendance-response`;

export function StudentParticipation() {
  return (
    <RevealSection className="section--dark sponsorship" label="재학생 참석 안내">
      <div className="section-inner section-inner--narrow">
        <SectionHeader eyebrow="TOGETHER FOR THE NEXT 50 YEARS" title="새로운 50년을 함께 만들어주세요" />
        <p>
          선배와 후배가 한자리에 모이는 회계인의 밤에
          <br />
          재학생 여러분의 참석으로 새로운 50년의 시작을 빛내주세요.
        </p>
        <p className="student-participation__notice">
          참석은 신청 후 선정되며 결과는 개별 안내드립니다.<br />
          이번 행사는 1학년(26학번) 대상 행사가 아닙니다.
        </p>
        <a className="button button--gold" href={studentAttendanceUrl}>
          재학생 참석 신청 및 불참 회신하기
        </a>
      </div>
    </RevealSection>
  );
}
