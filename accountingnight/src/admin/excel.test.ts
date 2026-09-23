import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
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
    admission: { label: '학번', value: '98' },
    affiliation: { label: '소속', value: '삼일회계법인 파트너' },
    'archived-field': { label: '비고', value: '동국대학교' },
  },
  status: 'confirmed',
  admin_memo: '안내 완료',
  privacy_consent_at: '2026-09-14T00:00:00Z',
};

const blankNumericSubmission: Submission = {
  ...submission,
  id: 'submission-3',
  phone: '',
  sponsorship_units: undefined as unknown as number,
  pledge_amount: undefined as unknown as number,
  answers: {},
};

const guardianSubmission: Submission = {
  ...submission,
  id: 'submission-2',
  pledge_option: 'guardian_50',
  pledge_amount: 500_000,
};

interface XlsxCellXml {
  attributes: string;
  value: string;
}

function getArchiveText(archive: ReturnType<typeof unzipSync>, path: string): string {
  const file = archive[path];
  if (!file) throw new Error(`Missing XLSX archive entry: ${path}`);
  return strFromU8(file);
}

function getCellXml(sheetXml: string, address: string): XlsxCellXml | null {
  const match = sheetXml.match(new RegExp(`<c\\s+([^>]*\\br="${address}"[^>]*)>([\\s\\S]*?)<\\/c>`));
  if (!match) return null;

  return {
    attributes: match[1],
    value: match[2].match(/<v>([^<]*)<\/v>/)?.[1] ?? '',
  };
}

function getCellNumberFormat(stylesXml: string, cell: XlsxCellXml): string | undefined {
  const styleIndex = Number(cell.attributes.match(/\bs="(\d+)"/)?.[1]);
  const cellXfs = stylesXml.match(/<cellXfs[^>]*>([\s\S]*?)<\/cellXfs>/)?.[1];
  if (!Number.isInteger(styleIndex) || !cellXfs) return undefined;

  const style = Array.from(cellXfs.matchAll(/<xf\b([^>]*)>/g))[styleIndex]?.[1];
  const numberFormatId = style?.match(/\bnumFmtId="(\d+)"/)?.[1];
  if (!numberFormatId) return undefined;

  return Array.from(stylesXml.matchAll(/<numFmt\b([^>]*)\/>/g))
    .map((match) => match[1])
    .find((attributes) => attributes.match(/\bnumFmtId="(\d+)"/)?.[1] === numberFormatId)
    ?.match(/\bformatCode="([^"]+)"/)?.[1];
}

describe('Excel export rows', () => {
  it('exports C, D, and G as typed number cells while preserving inactive fields', () => {
    const sheet = buildExcelSheet([submission], [field]);
    const headings = sheet[0].map((cell) => typeof cell === 'object' && cell && 'value' in cell ? cell.value : cell);

    expect(headings).toContain('입학년도(학번)');
    expect(headings).toContain('현재 소속 및 직함');
    expect(headings).toContain('비고');
    expect(headings).toContain('약정유형');
    expect(headings).toContain('약정금액');
    expect(sheet[1][2]).toMatchObject({ value: 1_012_345_678, type: Number, format: '00000000000' });
    expect(sheet[1][3]).toMatchObject({ value: 98, type: Number, format: '00' });
    expect(sheet[1][6]).toMatchObject({ value: 1_000_000, type: Number, format: '₩#,##0' });
    expect(sheet[1]).toContain('동국대학교');
  });

  it('keeps empty C, D, and G values as empty cells', () => {
    const sheet = buildExcelSheet([blankNumericSubmission], [field]);

    expect(sheet[1][2]).toBeNull();
    expect(sheet[1][3]).toBeNull();
    expect(sheet[1][6]).toBeNull();
  });

  it('writes and reads back numeric C, D, and currency-formatted G cells', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'accountingnight-excel-'));
    const filePath = join(directory, 'verification.xlsx');

    try {
      await writeExcelFile(
        buildExcelSheet([submission, guardianSubmission, blankNumericSubmission], [field]),
      ).toFile(filePath);
      const file = await readFile(filePath);
      const archive = unzipSync(file);
      const sheetXml = getArchiveText(archive, 'xl/worksheets/sheet1.xml');
      const stylesXml = getArchiveText(archive, 'xl/styles.xml');
      const phoneCell = getCellXml(sheetXml, 'C2');
      const admissionCell = getCellXml(sheetXml, 'D2');
      const amountCell = getCellXml(sheetXml, 'G2');
      const guardianAmountCell = getCellXml(sheetXml, 'G3');

      expect(file.byteLength).toBeGreaterThan(1_000);
      expect(Array.from(file.subarray(0, 2))).toEqual([0x50, 0x4b]);
      expect(phoneCell?.attributes).not.toMatch(/\bt=/);
      expect(phoneCell?.value).toBe('1012345678');
      expect(phoneCell && getCellNumberFormat(stylesXml, phoneCell)).toBe('00000000000');
      expect(admissionCell?.attributes).not.toMatch(/\bt=/);
      expect(admissionCell?.value).toBe('98');
      expect(admissionCell && getCellNumberFormat(stylesXml, admissionCell)).toBe('00');
      expect(amountCell?.attributes).not.toMatch(/\bt=/);
      expect(amountCell?.value).toBe('1000000');
      expect(amountCell && getCellNumberFormat(stylesXml, amountCell)).toBe('₩#,##0');
      expect(guardianAmountCell?.attributes).not.toMatch(/\bt=/);
      expect(guardianAmountCell?.value).toBe('500000');
      expect(guardianAmountCell && getCellNumberFormat(stylesXml, guardianAmountCell)).toBe('₩#,##0');
      expect(getCellXml(sheetXml, 'C4')).toBeNull();
      expect(getCellXml(sheetXml, 'D4')).toBeNull();
      expect(getCellXml(sheetXml, 'G4')).toBeNull();
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
