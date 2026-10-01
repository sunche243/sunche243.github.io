import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { attendance } from '../data/event';

export function Sponsorship() {
  return (
    <RevealSection className="section--dark sponsorship" label="참석 여부 회신 안내">
      <div className="section-inner section-inner--narrow">
        <SectionHeader eyebrow="RSVP" title="참석 여부를 알려주세요" />
        <p>
          원활한 행사 준비와 좌석 배정을 위해
          <br />회계인의 밤 참석 여부를 회신해 주시면 감사하겠습니다.
        </p>
        <a className="button button--gold" href={attendance.url}>
          참석 여부 회신하기
        </a>
      </div>
    </RevealSection>
  );
}
