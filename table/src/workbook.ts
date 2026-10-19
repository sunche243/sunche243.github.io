import type { SeatingPerson, WorkbookPreview } from './types';

const NAME_HEADERS = ['이름', '성명', 'name', '참석자', '학생명'];
const GROUP_HEADERS = ['구분', '소속', '학번', '입학년도', '그룹', '부서', 'affiliation', 'group'];
const IDENTIFIER_HEADERS = ['식별번호', '전화번호', '연락처', '휴대전화', 'id', 'identifier'];

function normalizeHeader(value: unknown): string {
  return String(value ?? '').trim().toLocaleLowerCase('ko').replace(/[\s_()/-]/g, '');
}

function findHeader(headers: string[], candidates: string[]): number | null {
  const normalizedCandidates = candidates.map(normalizeHeader);
  const exact = headers.findIndex((header) => normalizedCandidates.includes(normalizeHeader(header)));
  if (exact >= 0) return exact;
  const partial = headers.findIndex((header) => normalizedCandidates.some((candidate) => normalizeHeader(header).includes(candidate)));
  return partial >= 0 ? partial : null;
}

export async function readWorkbook(file: File): Promise<WorkbookPreview> {
  const { default: readXlsxFile } = await import('read-excel-file');
  const rows = await readXlsxFile(file);
  if (!rows.length) throw new Error('비어 있는 Excel 파일입니다.');
  const headers = rows[0].map((cell, index) => String(cell ?? '').trim() || `열 ${index + 1}`);
  const nameColumn = findHeader(headers, NAME_HEADERS);
  return {
    fileName: file.name,
    headers,
    rows: rows.slice(1),
    nameColumn: nameColumn ?? 0,
    groupColumn: findHeader(headers, GROUP_HEADERS),
    identifierColumn: findHeader(headers, IDENTIFIER_HEADERS),
  };
}

export function workbookRowsToPeople(
  preview: WorkbookPreview,
): { people: SeatingPerson[]; skipped: number; duplicates: number } {
  const seen = new Set<string>();
  let skipped = 0;
  let duplicates = 0;
  const people: SeatingPerson[] = [];

  preview.rows.forEach((row, index) => {
    const name = String(row[preview.nameColumn] ?? '').trim();
    if (!name) {
      skipped += 1;
      return;
    }
    const group = preview.groupColumn === null ? '' : String(row[preview.groupColumn] ?? '').trim();
    const identifier = preview.identifierColumn === null ? '' : String(row[preview.identifierColumn] ?? '').trim();
    const duplicateKey = `${name.toLocaleLowerCase('ko')}|${identifier.replaceAll(/\D/g, '')}`;
    if (seen.has(duplicateKey)) {
      duplicates += 1;
      return;
    }
    seen.add(duplicateKey);
    people.push({
      id: `excel-${Date.now()}-${index}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      group: group || '구분 없음',
      identifier,
    });
  });

  return { people, skipped, duplicates };
}

export function createWorkbookPreviewFromRows(fileName: string, rows: unknown[][]): WorkbookPreview {
  if (!rows.length) throw new Error('비어 있는 Excel 파일입니다.');
  const headers = rows[0].map((cell, index) => String(cell ?? '').trim() || `열 ${index + 1}`);
  return {
    fileName,
    headers,
    rows: rows.slice(1),
    nameColumn: findHeader(headers, NAME_HEADERS) ?? 0,
    groupColumn: findHeader(headers, GROUP_HEADERS),
    identifierColumn: findHeader(headers, IDENTIFIER_HEADERS),
  };
}
