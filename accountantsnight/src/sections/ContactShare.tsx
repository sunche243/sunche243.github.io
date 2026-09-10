import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { contacts } from '../data/contacts';
import { isKakaoConfigured, shareToKakao } from '../services/kakaoShare';
import { copyText, shareInvitation } from '../utils/share';

interface ContactShareProps {
  toast: (message: string) => void;
}

export function ContactShare({ toast }: ContactShareProps) {
  async function handleKakao() {
    if (!isKakaoConfigured()) {
      await shareInvitation(toast);
      toast('Kakao JavaScript Key가 없어 주소 복사로 대신했습니다.');
      return;
    }

    try {
      await shareToKakao();
    } catch {
      await shareInvitation(toast);
      toast('카카오톡 공유 대신 초대장 주소를 복사했습니다.');
    }
  }

  async function handleCopy() {
    await copyText(window.location.href);
    toast('초대장 주소를 복사했습니다.');
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
          {contacts.map((contact) => (
            <article className="contact-card" key={contact.name}>
              <span>{contact.role}</span>
              <h3>{contact.name}</h3>
              <p>{contact.phone}</p>
              <p>{contact.email}</p>
              <div className="button-row">
                <a className="button button--dark" href={`tel:${contact.phone}`}>
                  전화하기
                </a>
                <a className="button button--outline-dark" href={`mailto:${contact.email}`}>
                  이메일 보내기
                </a>
              </div>
            </article>
          ))}
        </div>
        <div className="share-panel">
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
