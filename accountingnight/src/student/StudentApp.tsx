import { useCallback, useEffect, useRef, useState } from 'react';
import { FloatingControls } from '../components/FloatingControls';
import { Toast } from '../components/Toast';
import { CountdownCalendar } from '../sections/CountdownCalendar';
import { Hero } from '../sections/Hero';
import { History } from '../sections/History';
import { Location } from '../sections/Location';
import { shareInvitation } from '../utils/share';
import { StudentContactShare } from './StudentContactShare';
import { StudentFinalClosing } from './StudentFinalClosing';
import { StudentInvitation } from './StudentInvitation';
import { StudentParticipation } from './StudentParticipation';
import { StudentProgram } from './StudentProgram';

export function StudentApp() {
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
  }, []);

  const toast = useCallback((message: string) => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage('');
      toastTimeoutRef.current = null;
    }, 2_800);
  }, []);

  return (
    <>
      <Hero
        scrollLabel="재학생 초대장을 확인해주세요"
        scrollHref="#student-invitation"
        scrollAriaLabel="재학생 초대의 글로 이동"
      />
      <main>
        <StudentInvitation />
        <CountdownCalendar />
        <History />
        <StudentProgram />
        <StudentParticipation />
        <Location />
        <StudentContactShare toast={toast} />
      </main>
      <StudentFinalClosing />
      <FloatingControls onShare={() => void shareInvitation(toast)} toast={toast} />
      <Toast message={toastMessage} />
    </>
  );
}
