import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StudentAttendanceForm, StudentCouncilExperienceFields } from './StudentAttendanceForm';

describe('student attendance form', () => {
  it('renders student-only fields instead of the affiliation field', () => {
    const html = renderToStaticMarkup(<StudentAttendanceForm />);

    expect(html).toContain('학생회 활동 여부');
    expect(html).toContain('활동 경험이 있습니다');
    expect(html).toContain('활동 경험이 없습니다');
    expect(html).toContain('참석자 선정 기준에 동의합니다.');
    expect(html).toContain('학생회 활동 경험이 확인된 신청자를 우선 선발합니다.');
    expect(html).toContain('미경험 신청자를 대상으로 무작위 추첨하여 선정합니다.');
    expect(html).toContain('참가비 30,000원');
    expect(html).not.toContain('현재 소속 및 직함');
  });

  it('shows the council details textarea only when experience is selected', () => {
    const experienced = renderToStaticMarkup(
      <StudentCouncilExperienceFields
        experience
        details="2025년 학생회장"
        errors={{}}
        onExperienceChange={vi.fn()}
        onDetailsChange={vi.fn()}
      />,
    );
    const inexperienced = renderToStaticMarkup(
      <StudentCouncilExperienceFields
        experience={false}
        details=""
        errors={{}}
        onExperienceChange={vi.fn()}
        onDetailsChange={vi.fn()}
      />,
    );

    expect(experienced).toContain('id="student-council-details"');
    expect(experienced).toContain('required=""');
    expect(inexperienced).not.toContain('id="student-council-details"');
  });
});
