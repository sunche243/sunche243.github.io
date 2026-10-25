import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase', () => ({
  getSupabase: vi.fn(),
  SupabaseConfigurationError: class SupabaseConfigurationError extends Error {},
}));

import { urlBase64ToUint8Array } from './pushNotifications';

describe('administrator Web Push utilities', () => {
  it('decodes a URL-safe VAPID public key without losing bytes', () => {
    vi.stubGlobal('window', { atob: (value: string) => Buffer.from(value, 'base64').toString('binary') });

    expect([...urlBase64ToUint8Array('AQID-_8')]).toEqual([1, 2, 3, 251, 255]);

    vi.unstubAllGlobals();
  });
});
