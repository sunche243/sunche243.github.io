import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { StudentAttendanceForm, StudentCouncilExperienceFields } from './StudentAttendanceForm';

describe('student attendance form', () => {
  it('renders student-only fields instead of the affiliation field', () => {
    const html = renderToStaticMarkup(<StudentAttendanceForm />);

    expect(html).toContain('학생회 활동 여부');
    expect(html).toContain('활동 경험이 있습니다');
    expect(html).toContain('활동 경험이 없습니다');
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
