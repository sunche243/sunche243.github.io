import { useLayoutEffect, useState } from 'react';
import { Hero } from '../sections/Hero';
import { Location } from '../sections/Location';
import { StudentAttendanceForm } from './StudentAttendanceForm';
import { StudentAttendanceIntro } from './StudentAttendanceIntro';
import { StudentContactShare } from './StudentContactShare';
import { StudentFinalClosing } from './StudentFinalClosing';
import { StudentProgram } from './StudentProgram';

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
        scrollLabel="재학생 참석 신청을 확인해주세요"
        scrollHref="#student-attendance-intro"
        scrollAriaLabel="재학생 참석 신청 및 불참 회신 안내로 이동"
      />
      <main>
        <nav className="student-attendance-back" aria-label="재학생 초대장 이동">
          <a className="button button--outline-dark" href={`${import.meta.env.BASE_URL}student/`}>
            재학생 초대장으로 돌아가기
          </a>
        </nav>
        {!responseComplete ? <StudentAttendanceIntro /> : null}
        <StudentAttendanceForm onComplete={() => setResponseComplete(true)} />
        <StudentProgram />
        <Location />
        <StudentContactShare showShare={false} />
      </main>
      <StudentFinalClosing />
    </>
  );
}
