import { useState } from 'react';
import { CalendarModal } from '../components/CalendarModal';
import { RevealSection } from '../components/RevealSection';
import { event } from '../data/event';
import { useCountdown } from '../hooks/useCountdown';
import {
  createGoogleCalendarUrl,
  downloadIcs,
  getDeviceCalendarAction,
  type CalendarEventInput,
} from '../utils/calendar';
import { pad2 } from '../utils/date';

const calendarInput: CalendarEventInput = {
  title: event.title,
  description: event.description,
  location: event.venue,
  startIso: event.startIso,
  endIso: event.endIso,
  timezone: event.timezone,
};

export function CountdownCalendar() {
  const countdown = useCountdown(event.startIso, event.endIso);
  const [modalOpen, setModalOpen] = useState(false);

  function addCalendar() {
    const action = getDeviceCalendarAction();
    if (action === 'ios') {
      downloadIcs(calendarInput);
      return;
    }
    if (action === 'android') {
      window.open(createGoogleCalendarUrl(calendarInput), '_blank', 'noopener,noreferrer');
      return;
    }
    setModalOpen(true);
  }

  return (
    <RevealSection className="section--dark countdown-section" label="카운트다운과 캘린더">
      <div className="section-inner">
        <div className="countdown">
          <p className="countdown__eyebrow">THE NIGHT BEGINS IN</p>
          {countdown.phase === 'before' ? (
            <>
              <p className="countdown__day">D - {countdown.days}</p>
              <div className="countdown__grid" aria-label="행사 시작까지 남은 시간">
                <time>
                  <strong>{pad2(countdown.days)}</strong>
                  <span>DAYS</span>
                </time>
                <time>
                  <strong>{pad2(countdown.hours)}</strong>
                  <span>HOURS</span>
                </time>
                <time>
                  <strong>{pad2(countdown.minutes)}</strong>
                  <span>MIN</span>
                </time>
                <time>
                  <strong>{pad2(countdown.seconds)}</strong>
                  <span>SEC</span>
                </time>
              </div>
            </>
          ) : (
            <p className="countdown__status">
              {countdown.phase === 'started' ? '회계인의 밤이 시작되었습니다.' : '함께해주셔서 감사합니다.'}
            </p>
          )}
          <button className="button button--gold" type="button" onClick={addCalendar}>
            캘린더에 일정 추가
          </button>
        </div>
      </div>
      <CalendarModal open={modalOpen} input={calendarInput} onClose={() => setModalOpen(false)} />
    </RevealSection>
  );
}
