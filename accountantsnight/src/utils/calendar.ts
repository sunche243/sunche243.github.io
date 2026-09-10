export interface CalendarEventInput {
  title: string;
  description: string;
  location: string;
  startIso: string;
  endIso: string;
  timezone: string;
}

function dateToUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function createGoogleCalendarUrl(input: CalendarEventInput): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: input.title,
    dates: `${dateToUtcStamp(new Date(input.startIso))}/${dateToUtcStamp(new Date(input.endIso))}`,
    details: input.description,
    location: input.location,
    ctz: input.timezone,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function createIcsContent(input: CalendarEventInput): string {
  const now = dateToUtcStamp(new Date());
  const start = dateToUtcStamp(new Date(input.startIso));
  const end = dateToUtcStamp(new Date(input.endIso));

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Dongguk Accounting//50th Anniversary//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${start}-dongguk-accounting-50th@sunche243.github.io`,
    `DTSTAMP:${now}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    `DESCRIPTION:${escapeIcsText(input.description)}`,
    `LOCATION:${escapeIcsText(input.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadIcs(input: CalendarEventInput): void {
  const blob = new Blob([createIcsContent(input)], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'dongguk-accounting-50th.ics';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function getDeviceCalendarAction(): 'ios' | 'android' | 'desktop' {
  const ua = navigator.userAgent.toLowerCase();
  const isIpadOS = navigator.maxTouchPoints > 1 && ua.includes('macintosh');
  if (/iphone|ipad|ipod/.test(ua) || isIpadOS) return 'ios';
  if (ua.includes('android')) return 'android';
  return 'desktop';
}
