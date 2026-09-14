import { describe, expect, it } from 'vitest';
import type { FormField, RegistrationDraft } from '../types/registration';
import {
  calculateSponsorshipAmount,
  normalizePhone,
  serializeDynamicAnswers,
  validateRegistration,
} from './registration';

const field: FormField = {
  id: 'field-1',
  label: '소속',
  type: 'text',
  required: true,
  options: [],
  sort_order: 10,
  active: true,
  created_at: '2026-09-14T00:00:00Z',
};

const draft: RegistrationDraft = {
  name: '홍길동',
  phone: '010-1234-5678',
  wantsSponsorship: true,
  sponsorshipUnits: 2,
  attendanceStatus: 'attending',
  privacyConsent: true,
};

describe('registration utilities', () => {
  it('calculates sponsorship amounts by unit', () => {
    expect(calculateSponsorshipAmount(1)).toBe(500_000);
    expect(calculateSponsorshipAmount(3)).toBe(1_500_000);
  });

  it('normalizes common phone number formatting without enforcing one carrier pattern', () => {
    expect(normalizePhone(' 010-1234 5678 ')).toBe('01012345678');
    expect(normalizePhone('+82 (10) 1234-5678')).toBe('+821012345678');
  });

  it('serializes active dynamic answers by stable field id', () => {
    expect(serializeDynamicAnswers([field], { 'field-1': '  경영대학  ', unknown: 'ignored' })).toEqual({
      'field-1': '경영대학',
    });
  });

  it('validates core participation, privacy, timing, and required dynamic fields', () => {
    const result = validateRegistration({
      draft: { ...draft, wantsSponsorship: false, attendanceStatus: null, privacyConsent: false },
      fields: [field],
      answers: {},
      honeypot: '',
      formStartedAt: 1_000,
      now: 5_000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      participation: expect.any(String),
      privacy: expect.any(String),
      'field-1': expect.any(String),
    });
  });
});
