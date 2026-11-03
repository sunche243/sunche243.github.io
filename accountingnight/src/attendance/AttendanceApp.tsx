import { useLayoutEffect } from 'react';
import { ContactShare } from '../sections/ContactShare';
import { FinalClosing } from '../sections/FinalClosing';
import { Hero } from '../sections/Hero';
import { Location } from '../sections/Location';
import { Program } from '../sections/Program';
import { AttendanceClosed } from './AttendanceClosed';

export function AttendanceApp() {
  useLayoutEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <>
      <Hero
        scrollLabel="참석 회신이 마감되었습니다"
        scrollHref="#attendance-response"
        scrollAriaLabel="참석 회신 마감 안내로 이동"
      />
      <main>
        <AttendanceClosed />
        <Program />
        <Location />
        <ContactShare showShare={false} />
      </main>
      <FinalClosing />
    </>
  );
}
