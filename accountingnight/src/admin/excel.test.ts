import { describe, expect, it } from 'vitest';
import writeExcelFile from 'write-excel-file/node';
import type { FormField, Submission } from '../types/registration';
import { buildExcelSheet } from './excel';

const field: FormField = {
  id: 'archived-field',
  label: '비고',
  type: 'text',
  required: false,
  options: [],
  sort_order: 10,
  active: false,
  created_at: '2026-09-14T00:00:00Z',
};

const submission: Submission = {
  id: 'submission-1',
  created_at: '2026-09-14T00:00:00Z',
  name: '홍길동',
  phone: '01012345678',
  wants_sponsorship: true,
  sponsorship_units: 2,
  pledge_option: 'century_100',
  pledge_amount: 1_000_000,
  attendance_status: 'attending',
  answers: {
    admission: { label: '학번', value: '98학번' },
    affiliation: { label: '소속', value: '삼일회계법인 파트너' },
    'archived-field': { label: '비고', value: '동국대학교' },
  },
  status: 'confirmed',
  admin_memo: '안내 완료',
  privacy_consent_at: '2026-09-14T00:00:00Z',
};

describe('Excel export rows', () => {
  it('exports numeric amounts and answers from inactive fields', () => {
    const sheet = buildExcelSheet([submission], [field]);
    const headings = sheet[0].map((cell) => typeof cell === 'object' && cell && 'value' in cell ? cell.value : cell);

    expect(headings).toContain('입학년도(학번)');
    expect(headings).toContain('현재 소속 및 직함');
    expect(headings).toContain('비고');
    expect(headings).toContain('약정유형');
    expect(headings).toContain('약정금액');
    expect(sheet[1]).toContain(1_000_000);
    expect(sheet[1]).toContain('동국대학교');
  });

  it('creates a valid XLSX archive from the export sheet', async () => {
    const file = await writeExcelFile(buildExcelSheet([submission], [field])).toBuffer();

    expect(file.byteLength).toBeGreaterThan(1_000);
    expect(Array.from(file.subarray(0, 2))).toEqual([0x50, 0x4b]);
  });
});
