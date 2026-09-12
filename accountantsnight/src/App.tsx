import { useState } from 'react';
import { FloatingControls } from './components/FloatingControls';
import { Toast } from './components/Toast';
import { CountdownCalendar } from './sections/CountdownCalendar';
import { ContactShare } from './sections/ContactShare';
import { FinalClosing } from './sections/FinalClosing';
import { Hero } from './sections/Hero';
import { History } from './sections/History';
import { Invitation } from './sections/Invitation';
import { Location } from './sections/Location';
import { Program } from './sections/Program';
import { Sponsorship } from './sections/Sponsorship';
import { shareInvitation } from './utils/share';

export function App() {
  const [toastMessage, setToastMessage] = useState('');

  function toast(message: string) {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(''), 2800);
  }

  return (
    <>
      <Hero />
      <main>
        <Invitation />
        <CountdownCalendar />
        <History />
        <Program />
        <Sponsorship />
        <Location />
        <ContactShare toast={toast} />
      </main>
      <FinalClosing />
      <FloatingControls onShare={() => void shareInvitation(toast)} toast={toast} />
      <Toast message={toastMessage} />
    </>
  );
}
