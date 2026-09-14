import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';

export function SponsorshipIntro() {
  return (
    <RevealSection id="sponsor-intro" className="section--ivory sponsor-intro" label="50주년 후원 안내">
      <div className="section-inner">
        <SectionHeader eyebrow="TOGETHER FOR THE NEXT 50" title="함께 만들어온 50년, 함께 이어갈 새로운 50년" />
        <div className="sponsor-intro__copy">
          <p>
            1976년 시작된 동국대학교 회계학과가
            <br />
            뜻깊은 50주년을 맞이하였습니다.
          </p>
          <p>
            지난 50년을 함께 만들어주신 분들과
            <br />
            새로운 50년의 시작을 함께하고자 합니다.
          </p>
          <p>
            50주년 후원에 참여할 의향을 남겨주시면
            <br />
            담당자가 확인 후 개별적으로 연락드리겠습니다.
          </p>
        </div>
      </div>
    </RevealSection>
  );
}
