import { describe, expect, it } from 'vitest';
import type { FormField, PledgeOption, RegistrationDraft } from '../types/registration';
import {
  getPledgeSelection,
  normalizePhone,
  normalizePledgeAmountInput,
  serializeDynamicAnswers,
  validateRegistration,
} from './registration';

const field: FormField = {
  id: 'field-1',
  label: '현재 소속 및 직함',
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
  pledgeOption: 'century_100',
  pledgeAmount: 0,
  privacyConsent: true,
};

describe('registration utilities', () => {
  it.each([
    ['century_100', 0, 1_000_000, 'attending'],
    ['guardian_50', 0, 500_000, 'attending'],
    ['free_attending', 275_000, 275_000, 'attending'],
    ['free_absent', 125_000, 125_000, 'not_attending'],
    ['absent_only', 0, 0, 'not_attending'],
  ] as const)('maps %s to its amount and attendance', (option, customAmount, amount, attendanceStatus) => {
    expect(getPledgeSelection(option, customAmount)).toEqual({ amount, attendanceStatus });
  });

  it('normalizes common phone number formatting without enforcing one carrier pattern', () => {
    expect(normalizePhone(' 010-1234 5678 ')).toBe('01012345678');
    expect(normalizePhone('+82 (10) 1234-5678')).toBe('+821012345678');
  });

  it('keeps only numeric pledge input for thousand-separator formatting and validation', () => {
    expect(normalizePledgeAmountInput('1,250,000원')).toBe(1_250_000);
    expect(normalizePledgeAmountInput('999999999999999')).toBe(999_999_999_999_999);
  });

  it('serializes active dynamic answers by stable field id', () => {
    expect(serializeDynamicAnswers([field], { 'field-1': '  삼일회계법인 파트너  ', unknown: 'ignored' })).toEqual({
      'field-1': '삼일회계법인 파트너',
    });
  });

  it.each(['free_attending', 'free_absent'] as PledgeOption[])('rejects an invalid custom amount for %s', (pledgeOption) => {
    const result = validateRegistration({
      draft: { ...draft, pledgeOption, pledgeAmount: 0 },
      fields: [field],
      answers: { 'field-1': '동국대학교' },
      honeypot: '',
      formStartedAt: 1_000,
      now: 5_000,
    });

    expect(result.errors.pledgeAmount).toBeTruthy();
  });

  it('rejects an abnormally large custom pledge amount', () => {
    const result = validateRegistration({
      draft: { ...draft, pledgeOption: 'free_attending', pledgeAmount: 10_000_000_001 },
      fields: [field],
      answers: { 'field-1': '동국대학교' },
      honeypot: '',
      formStartedAt: 1_000,
      now: 5_000,
    });

    expect(result.errors.pledgeAmount).toBeTruthy();
  });

  it('requires a pledge option, privacy consent, and active required dynamic fields', () => {
    const result = validateRegistration({
      draft: { ...draft, pledgeOption: null, privacyConsent: false },
      fields: [field],
      answers: {},
      honeypot: '',
      formStartedAt: 1_000,
      now: 5_000,
    });

    expect(result.valid).toBe(false);
    expect(result.errors).toMatchObject({
      pledgeOption: expect.any(String),
      privacy: expect.any(String),
      'field-1': expect.any(String),
    });
  });
});
