import type { SeatingTransferPayload } from './types';

export const SEATING_TRANSFER_KEY = 'accountingnight:selected-students-to-seating:v1';

export function consumeSeatingTransfer(): SeatingTransferPayload | null {
  const raw = window.sessionStorage.getItem(SEATING_TRANSFER_KEY);
  window.sessionStorage.removeItem(SEATING_TRANSFER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SeatingTransferPayload>;
    if (parsed.version !== 1 || !Array.isArray(parsed.people)) return null;
    return parsed as SeatingTransferPayload;
  } catch {
    return null;
  }
}
