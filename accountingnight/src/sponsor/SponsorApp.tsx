import { useState } from 'react';
import { CountdownCalendar } from '../sections/CountdownCalendar';
import { ContactShare } from '../sections/ContactShare';
import { FinalClosing } from '../sections/FinalClosing';
import { Hero } from '../sections/Hero';
import { Location } from '../sections/Location';
import { RegistrationForm } from './RegistrationForm';
import { SponsorshipIntro } from './SponsorshipIntro';
import { StickySponsorCta } from './StickySponsorCta';

export function SponsorApp() {
  const [registrationComplete, setRegistrationComplete] = useState(false);

  return (
    <>
      <Hero
        scrollLabel="후원과 참석을 확인해주세요"
        scrollHref="#sponsor-intro"
        scrollAriaLabel="후원과 참석 안내로 이동"
      />
      <main>
        <CountdownCalendar />
        <SponsorshipIntro />
        <RegistrationForm onComplete={() => setRegistrationComplete(true)} />
        <Location />
        <ContactShare showShare={false} />
      </main>
      <FinalClosing />
      <StickySponsorCta completed={registrationComplete} />
    </>
  );
}
