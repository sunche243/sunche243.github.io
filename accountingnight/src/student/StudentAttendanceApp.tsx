import { useLayoutEffect, useState } from 'react';
import { ContactShare } from '../sections/ContactShare';
import { Hero } from '../sections/Hero';
import { Location } from '../sections/Location';
import { StudentAttendanceForm } from './StudentAttendanceForm';
import { StudentAttendanceIntro } from './StudentAttendanceIntro';
import { StudentFinalClosing } from './StudentFinalClosing';

export function StudentAttendanceApp() {
  const [responseComplete, setResponseComplete] = useState(false);

  useLayoutEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <>
      <Hero
        scrollLabel="재학생 참석 여부를 알려주세요"
        scrollHref="#student-attendance-intro"
        scrollAriaLabel="재학생 참석 여부 회신 안내로 이동"
      />
      <main>
        {!responseComplete ? <StudentAttendanceIntro /> : null}
        <StudentAttendanceForm onComplete={() => setResponseComplete(true)} />
        <Location />
        <ContactShare showShare={false} />
      </main>
      <StudentFinalClosing />
    </>
  );
}
