import { useEffect, useLayoutEffect, useState } from 'react';
import {
  getStudentAttendanceClosingDelay,
  isStudentAttendanceClosed,
} from '../config/studentAttendanceDeadline';
import { Hero } from '../sections/Hero';
import { Location } from '../sections/Location';
import { StudentAttendanceClosed } from './StudentAttendanceClosed';
import { StudentAttendanceForm } from './StudentAttendanceForm';
import { StudentAttendanceIntro } from './StudentAttendanceIntro';
import { StudentContactShare } from './StudentContactShare';
import { StudentFinalClosing } from './StudentFinalClosing';
import { StudentProgram } from './StudentProgram';

export function StudentAttendanceApp() {
  const [responseComplete, setResponseComplete] = useState(false);
  const [closed, setClosed] = useState(() => isStudentAttendanceClosed());

  useEffect(() => {
    if (closed) return;
    const delay = getStudentAttendanceClosingDelay();
    if (delay === 0) {
      setClosed(true);
      return;
    }

    const timer = window.setTimeout(() => setClosed(true), delay);
    return () => window.clearTimeout(timer);
  }, [closed]);

  useLayoutEffect(() => {
    const targetId = window.location.hash.slice(1);
    if (!targetId) return;
    document.getElementById(targetId)?.scrollIntoView({ block: 'start' });
  }, []);

  return (
    <>
      <Hero
        scrollLabel={closed ? '재학생 참석 신청이 마감되었습니다' : '재학생 참석 신청을 확인해주세요'}
        scrollHref={closed ? '#student-attendance-response' : '#student-attendance-intro'}
        scrollAriaLabel={closed ? '재학생 참석 신청 마감 안내로 이동' : '재학생 참석 신청 및 불참 회신 안내로 이동'}
      />
      <main>
        <nav className="student-attendance-back" aria-label="재학생 초대장 이동">
          <a className="button button--outline-dark" href={`${import.meta.env.BASE_URL}student/`}>
            재학생 초대장으로 돌아가기
          </a>
        </nav>
        {closed ? (
          <StudentAttendanceClosed />
        ) : (
          <>
            {!responseComplete ? <StudentAttendanceIntro /> : null}
            <StudentAttendanceForm
              onClosed={() => setClosed(true)}
              onComplete={() => setResponseComplete(true)}
            />
          </>
        )}
        <StudentProgram />
        <Location />
        <StudentContactShare showShare={false} />
      </main>
      <StudentFinalClosing />
    </>
  );
}
