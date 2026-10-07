import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { isKakaoConfigured, shareToKakao } from '../services/kakaoShare';
import { copyText, shareInvitation } from '../utils/share';

interface StudentContactShareProps {
  toast?: (message: string) => void;
}

const studentContact = {
  organization: '동국대학교 회계학과',
  role: '회계학과 50주년 준비위원회',
  phone: '010-9678-4100',
  email: 'starcj7@naver.com',
};

export function StudentContactShare({ toast }: StudentContactShareProps) {
  const notify = toast ?? (() => undefined);

  async function handleKakao() {
    if (!isKakaoConfigured()) {
      await shareInvitation(notify);
      return;
    }

    try {
      await shareToKakao();
    } catch {
      await shareInvitation(notify);
    }
  }

  async function handleCopy() {
    const copied = await copyText(window.location.href);
    notify(copied ? '초대장 주소를 복사했습니다.' : '주소를 복사하지 못했습니다. 다시 시도해주세요.');
  }

  return (
    <RevealSection className="section--ivory contact" label="문의와 공유">
      <div className="section-inner">
        <SectionHeader eyebrow="CONTACT" />
        <p className="contact__intro">
          행사와 관련하여 궁금하신 사항이 있으시면
          <br />
          아래 연락처를 통해 문의해주시기 바랍니다.
        </p>
        <div className="contact-grid">
          <article className="contact-card">
            <p className="contact-card__organization">{studentContact.organization}</p>
            <h3>{studentContact.role}</h3>
            <div className="contact-card__links">
              <a href={`tel:${studentContact.phone}`}>{studentContact.phone}</a>
              <a href={`mailto:${studentContact.email}`}>{studentContact.email}</a>
            </div>
            <p className="contact__notice">※ 문의는 가급적 이메일로 부탁드립니다.</p>
          </article>
        </div>
        <div className="share-panel">
          <p className="share-panel__label">SHARE INVITATION</p>
          <p>초대장을 함께 나누세요</p>
          <div className="button-row">
            <button className="button button--gold" type="button" onClick={handleKakao}>
              카카오톡 공유
            </button>
            <button className="button button--outline-dark" type="button" onClick={handleCopy}>
              URL 복사
            </button>
          </div>
        </div>
      </div>
    </RevealSection>
  );
}
