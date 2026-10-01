import { useLayoutEffect, useState } from 'react';
import { ContactShare } from '../sections/ContactShare';
import { FinalClosing } from '../sections/FinalClosing';
import { Hero } from '../sections/Hero';
import { Location } from '../sections/Location';
import { AttendanceForm } from './AttendanceForm';
import { AttendanceIntro } from './AttendanceIntro';

export function AttendanceApp() {
  const [responseComplete, setResponseComplete] = useState(false);

  useLayoutEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <>
      <Hero
        scrollLabel="참석 여부를 알려주세요"
        scrollHref="#attendance-intro"
        scrollAriaLabel="참석 여부 회신 안내로 이동"
      />
      <main>
        {!responseComplete ? <AttendanceIntro /> : null}
        <AttendanceForm onComplete={() => setResponseComplete(true)} />
        <Location />
        <ContactShare showShare={false} />
      </main>
      <FinalClosing />
    </>
  );
}
