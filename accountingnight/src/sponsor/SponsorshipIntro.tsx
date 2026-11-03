import { RevealSection } from '../components/RevealSection';
import { InvitationReturnLink } from '../sections/InvitationReturnLink';
import { SectionHeader } from '../components/SectionHeader';

export function SponsorshipIntro({ sponsorshipOnly }: { sponsorshipOnly: boolean }) {
  return (
    <RevealSection
      id="sponsor-intro"
      className="section--ivory sponsor-intro"
      label={sponsorshipOnly ? '발전기금 후원 약정 안내' : '참석 및 발전기금 약정 안내'}
    >
      <div className="section-inner">
        <InvitationReturnLink />
        <SectionHeader
          eyebrow="50th ANNIVERSARY PLEDGE"
          title={sponsorshipOnly
            ? <>동국대학교 회계학과 창립 50주년<br />발전기금 후원 약정</>
            : <>동국대학교 회계학과 창립 50주년<br />'회계인의 밤'<br />참석 및 발전기금 약정</>}
        />
        <div className="sponsor-intro__copy">
          {sponsorshipOnly ? (
            <>
              <div className="sponsor-intro__notice" role="note">
                <strong>참가 신청 기간이 종료되었습니다.</strong>
                <span>현재는 발전기금 후원 약정만 가능하며, 후원은 2026년 11월 15일(일)까지 자유롭게 신청 가능합니다.</span>
              </div>
              <p>지난 50년의 눈부신 성취를 넘어, 새로운 50년의 비전을 밝히는 발전기금에 동문 여러분의 뜻을 모시고자 합니다.</p>
              <p>본 약정서는 발전기금 후원 의사를 확인하기 위한 폼입니다.<br /> 실제 기부금 납부 계좌 및 세제 혜택(기부금 영수증 발급)을 위한 세부 절차는 약정 확인 후 동국대학교 대외협력실에서 개별적으로 친절히 안내해드릴 예정입니다.<br />부담 없이 작성 부탁드립니다.</p>
            </>
          ) : (
            <>
              <p>지난 50년의 눈부신 성취를 넘어, 새로운 50년의 비전을 밝히는 뜻깊은 자리에 동문 여러분을 귀빈으로 모십니다.</p>
              <p>본 약정서는 원활한 행사 준비를 위한 참석 여부 파악과 발전기금 후원 의사를 확인하기 위한 폼입니다.<br /> 실제 기부금 납부 계좌 및 세제 혜택(기부금 영수증 발급)을 위한 세부 절차는 약정 확인 후 동국대학교 대외협력실에서 개별적으로 친절히 안내해드릴 예정입니다.<br />부담 없이 작성 부탁드립니다.</p>
            </>
          )}
        </div>
      </div>
    </RevealSection>
  );
}
