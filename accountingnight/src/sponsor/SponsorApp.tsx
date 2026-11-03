import { useEffect, useLayoutEffect, useState } from 'react';
import { CountdownCalendar } from '../sections/CountdownCalendar';
import { ContactShare } from '../sections/ContactShare';
import { FinalClosing } from '../sections/FinalClosing';
import { Hero } from '../sections/Hero';
import { Location } from '../sections/Location';
import { Program } from '../sections/Program';
import { RegistrationForm } from './RegistrationForm';
import { SponsorshipIntro } from './SponsorshipIntro';
import { StickySponsorCta } from './StickySponsorCta';
import { useSponsorshipOnlyMode } from './sponsorMode';

export function SponsorApp() {
  const [registrationComplete, setRegistrationComplete] = useState(false);
  const sponsorshipOnly = useSponsorshipOnlyMode();

  useLayoutEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;

    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, []);

  useEffect(() => {
    if (!sponsorshipOnly) return;

    document.title = '동국대 회계학과 창립 50주년 | 발전기금 후원 약정';
    const description = '동국대학교 회계학과 50주년 발전기금 후원 약정 의사를 남겨주세요.';
    const metadata = [
      ['meta[name="description"]', description],
      ['meta[property="og:title"]', document.title],
      ['meta[property="og:description"]', description],
      ['meta[name="twitter:title"]', document.title],
      ['meta[name="twitter:description"]', description],
    ] as const;

    for (const [selector, content] of metadata) {
      document.querySelector<HTMLMetaElement>(selector)?.setAttribute('content', content);
    }
  }, [sponsorshipOnly]);

  return (
    <>
      <Hero
        scrollLabel={sponsorshipOnly ? '발전기금 후원 약정을 확인해주세요' : '후원과 참석을 확인해주세요'}
        scrollHref="#sponsor-intro"
        scrollAriaLabel={sponsorshipOnly ? '발전기금 후원 안내로 이동' : '후원과 참석 안내로 이동'}
      />
      <main>
        <CountdownCalendar />
        <SponsorshipIntro sponsorshipOnly={sponsorshipOnly} />
        <Program />
        <RegistrationForm sponsorshipOnly={sponsorshipOnly} onComplete={() => setRegistrationComplete(true)} />
        <Location />
        <ContactShare showShare={false} />
      </main>
      <FinalClosing />
      <StickySponsorCta completed={registrationComplete} sponsorshipOnly={sponsorshipOnly} />
    </>
  );
}
