import { describe, expect, it } from 'vitest';
import { createWorkbookPreviewFromRows, workbookRowsToPeople } from './workbook';

describe('Excel attendee import', () => {
  it('auto-detects name, group, and identifier columns', () => {
    const preview = createWorkbookPreviewFromRows('참석자.xlsx', [
      ['전화번호', '성명', '소속'],
      ['01012345678', '김동국', '회계법인'],
    ]);
    expect(preview.nameColumn).toBe(1);
    expect(preview.groupColumn).toBe(2);
    expect(preview.identifierColumn).toBe(0);
    expect(workbookRowsToPeople(preview).people[0]).toMatchObject({ name: '김동국', group: '회계법인', identifier: '01012345678' });
  });

  it('skips blank names and exact duplicate people', () => {
    const preview = createWorkbookPreviewFromRows('참석자.xlsx', [
      ['이름', '구분', '식별번호'],
      ['김동국', '24학번', '1'],
      ['', '25학번', '2'],
      ['김동국', '다른 구분', '1'],
    ]);
    const result = workbookRowsToPeople(preview);
    expect(result.people).toHaveLength(1);
    expect(result.skipped).toBe(1);
    expect(result.duplicates).toBe(1);
  });
});
