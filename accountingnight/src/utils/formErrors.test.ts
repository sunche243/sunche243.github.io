import { describe, expect, it } from 'vitest';
import { clearFormErrors } from './formErrors';

describe('clearFormErrors', () => {
  it('clears only the edited field and the form-level error', () => {
    expect(clearFormErrors({ name: '이름 오류', phone: '전화번호 오류', form: '제출 오류' }, 'name')).toEqual({
      phone: '전화번호 오류',
    });
  });

  it('supports clearing a field with a differently named validation key', () => {
    expect(clearFormErrors({ privacy: '동의 필요', attendanceStatus: '선택 필요' }, 'privacy')).toEqual({
      attendanceStatus: '선택 필요',
    });
  });
});
