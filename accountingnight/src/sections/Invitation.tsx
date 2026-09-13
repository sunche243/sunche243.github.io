import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { event, invitationCopy } from '../data/event';

export function Invitation() {
  return (
    <RevealSection id="invitation" className="section--ivory invitation" label="초대의 글">
      <div className="section-inner section-inner--narrow">
        <SectionHeader eyebrow="INVITATION" title="초대의 글" />
        <div className="invitation__copy">
          {invitationCopy.map((paragraph) => (
            <p key={paragraph}>
              {paragraph.split('\n').map((line) => (
                <span key={line}>{line}</span>
              ))}
            </p>
          ))}
        </div>
        <p className="signature">{event.host}</p>
      </div>
    </RevealSection>
  );
}
