import { event } from '../data/event';
import { createGoogleCalendarUrl, downloadIcs, type CalendarEventInput } from '../utils/calendar';

interface CalendarModalProps {
  open: boolean;
  input: CalendarEventInput;
  onClose: () => void;
}

export function CalendarModal({ open, input, onClose }: CalendarModalProps) {
  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="bottom-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="calendar-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" />
        <h3 id="calendar-modal-title">캘린더에 일정 추가</h3>
        <p>
          {event.shortDateLabel} · {event.startTime} · {event.venue}
        </p>
        <div className="sheet-actions">
          <a className="button button--light" href={createGoogleCalendarUrl(input)} target="_blank" rel="noreferrer">
            Google Calendar
          </a>
          <button className="button button--outline-dark" type="button" onClick={() => downloadIcs(input)}>
            일정 파일 다운로드
          </button>
        </div>
        <button className="sheet-close" type="button" onClick={onClose}>
          닫기
        </button>
      </div>
    </div>
  );
}
