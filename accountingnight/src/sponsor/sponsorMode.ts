import { useEffect, useState } from 'react';

export const SPONSORSHIP_ONLY_START_AT = Date.parse('2026-11-04T00:00:00+09:00');

export function isSponsorshipOnlyMode(now = Date.now()): boolean {
  return now >= SPONSORSHIP_ONLY_START_AT;
}

export function useSponsorshipOnlyMode(): boolean {
  const [sponsorshipOnly, setSponsorshipOnly] = useState(isSponsorshipOnlyMode);

  useEffect(() => {
    if (sponsorshipOnly) return;

    const delay = Math.max(0, SPONSORSHIP_ONLY_START_AT - Date.now());
    const timeout = window.setTimeout(() => setSponsorshipOnly(true), delay);
    return () => window.clearTimeout(timeout);
  }, [sponsorshipOnly]);

  return sponsorshipOnly;
}
