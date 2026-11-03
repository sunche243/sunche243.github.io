import { describe, expect, it } from 'vitest';
import { isSponsorshipOnlyMode, SPONSORSHIP_ONLY_START_AT } from './sponsorMode';

describe('sponsor-only cutoff', () => {
  it('keeps attendance options through November 3 at 23:59:59 in Korea', () => {
    expect(isSponsorshipOnlyMode(SPONSORSHIP_ONLY_START_AT - 1)).toBe(false);
  });

  it('switches to sponsorship-only mode on November 4 at midnight in Korea', () => {
    expect(isSponsorshipOnlyMode(SPONSORSHIP_ONLY_START_AT)).toBe(true);
  });
});
