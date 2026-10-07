import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';

const studentAttendanceUrl = `${import.meta.env.BASE_URL}student/attendance/`;

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
        <a className="button button--gold" href={studentAttendanceUrl}>
          재학생 참석 여부 회신하기
        </a>
      </div>
    </RevealSection>
  );
}
