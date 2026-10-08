import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import {
  StudentAdmissionYearField,
  StudentAttendanceForm,
  StudentCouncilExperienceFields,
  StudentCouncilFeeFields,
  StudentSelectionCriteria,
} from './StudentAttendanceForm';

describe('student attendance form', () => {
  it('asks for attendance application status before application-only fields', () => {
    const html = renderToStaticMarkup(<StudentAttendanceForm />);

    expect(html).toContain('참석 신청 여부');
    expect(html).toContain('참석을 신청합니다');
    expect(html).toContain('참석하지 못합니다');
    expect(html.indexOf('참석 신청 여부')).toBeLessThan(html.indexOf('회신자 정보'));
    expect(html).not.toContain('학생회 활동 여부');
    expect(html).not.toContain('참석자 선정 기준에 동의합니다.');
    expect(html).not.toContain('현재 소속 및 직함');
  });

  it('shows an immediate ineligibility alert for 26 admission year', () => {
    const html = renderToStaticMarkup(
      <StudentAdmissionYearField value="26" onChange={vi.fn()} />,
    );

    expect(html).toContain('role="alert"');
    expect(html).toContain('이번 행사는 1학년(26학번) 대상 행사가 아닙니다.');
    expect(html).toContain('aria-invalid="true"');
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
    expect(experienced).toContain('2024년 회계학과 학생회 총무부장');
    expect(experienced).toContain('가장 최근 이력 1개만 작성해도 됩니다.');
    expect(experienced).not.toContain('총무국장');
    expect(inexperienced).not.toContain('id="student-council-details"');
  });

  it('collects council fee payment status and links to the payment form', () => {
    const html = renderToStaticMarkup(
      <StudentCouncilFeeFields paid={null} onChange={vi.fn()} />,
    );

    expect(html).toContain('학생회비 납부 여부');
    expect(html).toContain('학생회비를 납부했습니다');
    expect(html).toContain('학생회비를 납부하지 않았습니다');
    expect(html).toContain('https://forms.gle/rvgMsXt4AufcZmUz8');
    expect(html).toContain('target="_blank"');
  });

  it('shows the revised selection priorities, participation fee, and waitlist policy', () => {
    const html = renderToStaticMarkup(<StudentSelectionCriteria />);

    expect(html).toContain('1순위');
    expect(html).toContain('학생회 활동 경험이 확인된 신청자');
    expect(html).toContain('2순위');
    expect(html).toContain('학생회비 납부가 확인된 신청자');
    expect(html).toContain('3순위');
    expect(html).toContain('학생회비 미납 신청자');
    expect(html).toContain('동일 순위 내 추첨');
    expect(html).toContain('해당 순위 신청자를 대상으로 무작위 추첨');
    expect(html).toContain('참가비 30,000원');
    expect(html).toContain('대기 순서에 따라 차순위 신청자에게 개별 연락');
  });
});
