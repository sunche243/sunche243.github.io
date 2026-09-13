import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { sponsorship } from '../data/event';

export function Sponsorship() {
  return (
    <RevealSection className="section--dark sponsorship" label="후원 안내">
      <div className="section-inner section-inner--narrow">
        <SectionHeader eyebrow="TOGETHER FOR THE NEXT 50 YEARS" title="새로운 50년을 함께 만들어주세요" />
        <p>
          지난 50년의 발자취를 기념하고
          <br />
          앞으로 이어질 새로운 역사를 준비하는 자리에
          <br />
          동문 여러분의 소중한 뜻을 함께하고자 합니다.
        </p>
        <a className="button button--gold" href={sponsorship.url} target="_blank" rel="noreferrer">
          50주년 행사 후원 참여하기
        </a>
      </div>
    </RevealSection>
  );
}
