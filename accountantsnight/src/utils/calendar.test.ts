import { describe, expect, it } from 'vitest';
import { createGoogleCalendarUrl, createIcsContent } from './calendar';

const eventInput = {
  title: '회계학과 50주년 기념 회계인의 밤',
  description: '동국대학교 회계학과 50주년 기념 회계인의 밤',
  location: '서울신라호텔 영빈관',
  startIso: '2026-11-13T17:30:00+09:00',
  endIso: '2026-11-13T21:00:00+09:00',
  timezone: 'Asia/Seoul',
};

describe('calendar utilities', () => {
  it('creates a Google Calendar URL with UTC timestamps and timezone', () => {
    const url = createGoogleCalendarUrl(eventInput);
    expect(url).toContain('calendar.google.com/calendar/render');
    expect(url).toContain('dates=20261113T083000Z%2F20261113T120000Z');
    expect(url).toContain('ctz=Asia%2FSeoul');
  });

  it('creates an ICS file with event fields', () => {
    const ics = createIcsContent(eventInput);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('DTSTART:20261113T083000Z');
    expect(ics).toContain('DTEND:20261113T120000Z');
    expect(ics).toContain('SUMMARY:회계학과 50주년 기념 회계인의 밤');
    expect(ics).toContain('LOCATION:서울신라호텔 영빈관');
  });
});
