export type EventPhase = 'before' | 'started' | 'ended';

export interface CountdownParts {
  phase: EventPhase;
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function getEventPhase(now: Date, start: Date, end: Date): EventPhase {
  if (now < start) return 'before';
  if (now <= end) return 'started';
  return 'ended';
}

export function getCountdownParts(now: Date, start: Date, end: Date): CountdownParts {
  const phase = getEventPhase(now, start, end);
  const totalMs = Math.max(0, start.getTime() - now.getTime());

  return {
    phase,
    totalMs,
    days: Math.floor(totalMs / DAY),
    hours: Math.floor((totalMs % DAY) / HOUR),
    minutes: Math.floor((totalMs % HOUR) / MINUTE),
    seconds: Math.floor((totalMs % MINUTE) / SECOND),
  };
}

export function pad2(value: number): string {
  return String(value).padStart(2, '0');
}
