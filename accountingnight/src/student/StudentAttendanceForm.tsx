import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { RevealSection } from '../components/RevealSection';
import { studentAttendancePrivacyPolicy } from '../config/privacy';
import { submitStudentAttendanceResponse } from '../services/studentAttendance';
import { isSupabaseConfigured, SupabaseConfigurationError } from '../services/supabase';
import type { StudentAttendanceDraft } from '../types/studentAttendance';
import { scheduleAttendanceSuccessNavigation } from '../utils/attendance';
import { clearFormErrors } from '../utils/formErrors';
import { validateStudentAttendanceResponse } from '../utils/studentAttendance';
import { StudentAttendanceSuccess } from './StudentAttendanceSuccess';

const initialDraft: StudentAttendanceDraft = {
  name: '',
  phone: '',
  admissionYear: '',
  studentCouncilExperience: null,
  studentCouncilDetails: '',
  studentCouncilFeePaid: null,
  attendanceStatus: null,
  privacyConsent: false,
  selectionCriteriaConsent: false,
};

interface StudentCouncilExperienceFieldsProps {
  experience: boolean | null;
  details: string;
  errors: Record<string, string>;
  onExperienceChange: (value: boolean) => void;
  onDetailsChange: (value: string) => void;
}

interface StudentCouncilFeeFieldsProps {
  paid: boolean | null;
  error?: string;
  onChange: (value: boolean) => void;
}

export function StudentCouncilFeeFields({ paid, error, onChange }: StudentCouncilFeeFieldsProps) {
  return (
    <fieldset className="attendance-options student-council-options student-fee-options">
      <legend>학생회비 납부 여부 <span aria-label="필수">*</span></legend>
      <p className="student-council-help">
        학생회비 납부 여부는 참석자 선정 우선순위에 반영됩니다. 납부를 희망하는 경우{' '}
        <a href="https://forms.gle/rvgMsXt4AufcZmUz8" target="_blank" rel="noopener noreferrer">
          학생회비 납부 신청 링크
        </a>
        를 이용해 주세요.
      </p>
      {([true, false] as const).map((value) => {
        const selected = paid === value;
        return (
          <label className={`attendance-option ${selected ? 'is-selected' : ''}`} key={String(value)}>
            <input
              type="radio"
              name="student-council-fee-paid"
              value={String(value)}
              checked={selected}
              onChange={() => onChange(value)}
              required
              aria-invalid={Boolean(error)}
              aria-describedby={error ? 'student-council-fee-error' : 'student-council-fee-help'}
            />
            <span>
              <small>{value ? 'DUES PAID' : 'DUES NOT PAID'}</small>
              <strong>{value ? '학생회비를 납부했습니다' : '학생회비를 납부하지 않았습니다'}</strong>
            </span>
          </label>
        );
      })}
      <span className="sr-only" id="student-council-fee-help">학생회비 납부 여부를 선택해 주세요.</span>
      {error ? <span className="field-error" id="student-council-fee-error">{error}</span> : null}
    </fieldset>
  );
}

interface StudentAdmissionYearFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export function StudentAdmissionYearField({ value, error, onChange }: StudentAdmissionYearFieldProps) {
  const isFirstYear = value.trim() === '26';
  const visibleError = isFirstYear
    ? '이번 행사는 1학년(26학번) 대상 행사가 아닙니다.'
    : error;

  return (
    <div className="registration-field student-admission-year-field">
      <label htmlFor="student-admission-year">입학년도(학번) <span aria-label="필수">*</span></label>
      <input
        id="student-admission-year"
        name="admission-year"
        type="text"
        inputMode="numeric"
        pattern="[0-9]{2}"
        maxLength={2}
        required
        placeholder="예: 24"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(visibleError)}
        aria-describedby={visibleError ? 'student-admission-year-error' : 'student-admission-year-help'}
      />
      <span className="student-council-help" id="student-admission-year-help">
        입학년도 앞 두 자리를 입력해 주세요. 26학번은 이번 행사 참석 대상이 아닙니다.
      </span>
      {visibleError ? (
        <span className="field-error" id="student-admission-year-error" role={isFirstYear ? 'alert' : undefined}>
          {visibleError}
        </span>
      ) : null}
    </div>
  );
}

export function StudentSelectionCriteria() {
  return (
    <div id="student-selection-criteria" className="student-selection-criteria">
      <strong>참석자 선정 기준</strong>
      <p>원활한 행사 운영을 위해 아래 기준에 따라 참석자를 선정합니다.</p>
      <ol className="student-selection-priorities">
        <li><b>1순위</b>: 회계학과 학생회 활동 경험이 확인된 신청자</li>
        <li><b>2순위</b>: 학생회비 납부가 확인된 신청자</li>
        <li><b>3순위</b>: 학생회비 미납 신청자</li>
      </ol>
      <strong>선정 이후 안내</strong>
      <ul>
        <li>최종 선정 안내 후 별도로 고지되는 납부 기한까지 참가비 30,000원의 납부가 확인되지 않을 경우, 선정 및 우선순위가 취소될 수 있으며 해당 기회는 차순위 신청자에게 이전될 수 있습니다.</li>
        <li>행사 전날까지 취소 또는 참가비 미납으로 결원이 발생하는 경우, 대기 순서에 따라 차순위 신청자에게 개별 연락을 드릴 수 있습니다.</li>
      </ul>
      <p>
        학생회비 납부를 희망하는 학생은{' '}
        <a href="https://forms.gle/rvgMsXt4AufcZmUz8" target="_blank" rel="noopener noreferrer">
          학생회비 납부 신청 링크
        </a>
        에서 납부할 수 있습니다.
      </p>
    </div>
  );
}

export function StudentCouncilExperienceFields({
  experience,
  details,
  errors,
  onExperienceChange,
  onDetailsChange,
}: StudentCouncilExperienceFieldsProps) {
  return (
    <div className="student-council-fields">
      <fieldset className="attendance-options student-council-options">
        <legend>학생회 활동 여부 <span aria-label="필수">*</span></legend>
        <p className="student-council-help">회계학과 학생회 활동 경험이 있는지 선택해 주세요.</p>
        {([true, false] as const).map((value) => {
          const selected = experience === value;
          return (
            <label className={`attendance-option ${selected ? 'is-selected' : ''}`} key={String(value)}>
              <input
                type="radio"
                name="student-council-experience"
                value={String(value)}
                checked={selected}
                onChange={() => onExperienceChange(value)}
                required
                aria-invalid={Boolean(errors.studentCouncilExperience)}
                aria-describedby={errors.studentCouncilExperience ? 'student-council-experience-error' : undefined}
              />
              <span>
                <small>{value ? 'YES, I HAVE' : 'NO EXPERIENCE'}</small>
                <strong>{value ? '활동 경험이 있습니다' : '활동 경험이 없습니다'}</strong>
              </span>
            </label>
          );
        })}
        {errors.studentCouncilExperience ? (
          <span className="field-error" id="student-council-experience-error">{errors.studentCouncilExperience}</span>
        ) : null}
      </fieldset>

      {experience ? (
        <div className="registration-field student-council-details">
          <label htmlFor="student-council-details">활동 연도 및 직책 <span aria-label="필수">*</span></label>
          <textarea
            id="student-council-details"
            name="student-council-details"
            rows={4}
            maxLength={500}
            required
            placeholder="예: 2024년 회계학과 학생회 총무부장"
            value={details}
            onChange={(event) => onDetailsChange(event.target.value)}
            aria-invalid={Boolean(errors.studentCouncilDetails)}
            aria-describedby={errors.studentCouncilDetails ? 'student-council-details-error' : 'student-council-details-help'}
          />
          <span className="student-council-help" id="student-council-details-help">
            활동했던 연도와 직책을 자유롭게 작성해 주세요. 여러 활동 이력이 있는 경우 가장 최근 이력 1개만 작성해도 됩니다.
          </span>
          {errors.studentCouncilDetails ? (
            <span className="field-error" id="student-council-details-error">{errors.studentCouncilDetails}</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

interface StudentAttendanceFormProps {
  onComplete?: () => void;
}

export function StudentAttendanceForm({ onComplete }: StudentAttendanceFormProps) {
  const formStartedAt = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const attendanceSectionRef = useRef<HTMLElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<StudentAttendanceDraft>(initialDraft);
  const [honeypot, setHoneypot] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const setAttendanceSectionRef = useCallback((node: HTMLElement | null) => {
    attendanceSectionRef.current = node;
  }, []);

  useEffect(() => {
    if (!submitted) return;

    const frame = scheduleAttendanceSuccessNavigation(
      window.requestAnimationFrame.bind(window),
      attendanceSectionRef.current,
      successHeadingRef.current,
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    );

    return () => window.cancelAnimationFrame(frame);
  }, [submitted]);

  function updateDraft<Key extends keyof StudentAttendanceDraft>(key: Key, value: StudentAttendanceDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    const errorKey = key === 'privacyConsent' ? 'privacy' : key;
    setErrors((current) => clearFormErrors(current, errorKey));
  }

  function updateStudentCouncilExperience(value: boolean) {
    setDraft((current) => ({
      ...current,
      studentCouncilExperience: value,
      studentCouncilDetails: value ? current.studentCouncilDetails : '',
    }));
    setErrors((current) => clearFormErrors(current, 'studentCouncilExperience', 'studentCouncilDetails'));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submitted) return;

    const validation = validateStudentAttendanceResponse({
      draft,
      honeypot,
      formStartedAt: formStartedAt.current,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      window.requestAnimationFrame(() => {
        formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"], .registration-error-summary')?.focus();
      });
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrors({ form: '현재 재학생 참석 여부 회신 기능을 준비하고 있습니다.' });
      return;
    }
    if (!draft.attendanceStatus) return;
    if (draft.attendanceStatus === 'attending'
      && (draft.studentCouncilExperience === null || draft.studentCouncilFeePaid === null)) return;

    setSubmitting(true);
    setErrors({});
    try {
      await submitStudentAttendanceResponse({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        admissionYear: draft.admissionYear.trim(),
        studentCouncilExperience: draft.studentCouncilExperience,
        studentCouncilDetails: draft.studentCouncilDetails.trim(),
        studentCouncilFeePaid: draft.studentCouncilFeePaid,
        attendanceStatus: draft.attendanceStatus,
        privacyConsent: draft.privacyConsent,
        selectionCriteriaConsent: draft.selectionCriteriaConsent,
        honeypot,
        formStartedAt: formStartedAt.current,
      });
      setSubmitted(true);
      onComplete?.();
    } catch (error) {
      setErrors({
        form: error instanceof SupabaseConfigurationError
          ? '현재 재학생 참석 여부 회신 기능을 준비하고 있습니다.'
          : '회신 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const completedStatus = submitted ? draft.attendanceStatus : null;
  const hasErrors = Object.values(errors).some(Boolean);
  const isAttending = draft.attendanceStatus === 'attending';

  return (
    <RevealSection
      id="student-attendance-response"
      className="section--paper registration-section attendance-response-section"
      label={completedStatus ? '재학생 참석 응답 접수 완료' : '재학생 참석 신청 및 불참 회신 입력'}
      sectionRef={setAttendanceSectionRef}
    >
      {completedStatus ? (
        <StudentAttendanceSuccess name={draft.name.trim()} status={completedStatus} headingRef={successHeadingRef} />
      ) : (
        <div className="section-inner registration-layout">
          <form ref={formRef} className="registration-form" onSubmit={handleSubmit} noValidate>
            <section className="registration-step" aria-labelledby="student-attendance-choice-title">
              <header className="registration-step__heading">
                <p>APPLICATION</p>
                <h2 id="student-attendance-choice-title">참석 신청 여부</h2>
                <span>참석을 희망하는 경우 신청 후 선정 결과를 개별 안내드립니다.</span>
              </header>
              <fieldset className="attendance-options">
                <legend className="sr-only">참석 신청 여부 선택</legend>
                {(['attending', 'not_attending'] as const).map((status) => {
                  const selected = draft.attendanceStatus === status;
                  return (
                    <label className={`attendance-option ${selected ? 'is-selected' : ''}`} key={status}>
                      <input
                        type="radio"
                        name="attendance-status"
                        value={status}
                        checked={selected}
                        onChange={() => updateDraft('attendanceStatus', status)}
                        required
                        aria-invalid={Boolean(errors.attendanceStatus)}
                        aria-describedby={errors.attendanceStatus ? 'student-attendance-status-error' : undefined}
                      />
                      <span>
                        <small>{status === 'attending' ? 'APPLY TO ATTEND' : 'UNABLE TO ATTEND'}</small>
                        <strong>{status === 'attending' ? '참석을 신청합니다' : '참석하지 못합니다'}</strong>
                      </span>
                    </label>
                  );
                })}
                {errors.attendanceStatus ? <span className="field-error" id="student-attendance-status-error">{errors.attendanceStatus}</span> : null}
              </fieldset>
            </section>

            <section className="registration-step" aria-labelledby="student-information-title">
              <header className="registration-step__heading">
                <p>STUDENT DETAILS</p>
                <h2 id="student-information-title">회신자 정보</h2>
                <span>별표가 표시된 항목은 필수 정보입니다.</span>
              </header>

              <div className="registration-core-fields">
                <div className="registration-field">
                  <label htmlFor="student-name">성명 <span aria-label="필수">*</span></label>
                  <input
                    id="student-name"
                    name="name"
                    required
                    autoComplete="name"
                    value={draft.name}
                    onChange={(event) => updateDraft('name', event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'student-name-error' : undefined}
                  />
                  {errors.name ? <span className="field-error" id="student-name-error">{errors.name}</span> : null}
                </div>

                <div className="registration-field">
                  <label htmlFor="student-phone">휴대전화 번호 <span aria-label="필수">*</span></label>
                  <input
                    id="student-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    pattern="(?:010[0-9]{8}|010-[0-9]{4}-[0-9]{4})"
                    maxLength={13}
                    required
                    autoComplete="tel"
                    placeholder="예: 010-1234-5678"
                    value={draft.phone}
                    onChange={(event) => updateDraft('phone', event.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'student-phone-error' : undefined}
                  />
                  {errors.phone ? <span className="field-error" id="student-phone-error">{errors.phone}</span> : null}
                </div>
              </div>
            </section>

            {isAttending ? (
              <section className="registration-step" aria-labelledby="student-application-details-title">
                <header className="registration-step__heading">
                  <p>APPLICATION DETAILS</p>
                  <h2 id="student-application-details-title">참석 신청 정보</h2>
                  <span>이번 행사는 1학년(26학번) 대상 행사가 아닙니다.</span>
                </header>

                <StudentAdmissionYearField
                  value={draft.admissionYear}
                  error={errors.admissionYear}
                  onChange={(value) => updateDraft('admissionYear', value)}
                />

                <StudentCouncilExperienceFields
                  experience={draft.studentCouncilExperience}
                  details={draft.studentCouncilDetails}
                  errors={errors}
                  onExperienceChange={updateStudentCouncilExperience}
                  onDetailsChange={(value) => updateDraft('studentCouncilDetails', value)}
                />

                <StudentCouncilFeeFields
                  paid={draft.studentCouncilFeePaid}
                  error={errors.studentCouncilFeePaid}
                  onChange={(value) => updateDraft('studentCouncilFeePaid', value)}
                />
              </section>
            ) : null}

            <div className="privacy-consent">
              <label className="registration-checkline">
                <input
                  id="student-attendance-privacy"
                  type="checkbox"
                  required
                  checked={draft.privacyConsent}
                  onChange={(event) => updateDraft('privacyConsent', event.target.checked)}
                  aria-invalid={Boolean(errors.privacy)}
                  aria-describedby={errors.privacy ? 'student-attendance-privacy-error' : undefined}
                />
                <span>개인정보 수집 및 이용에 동의합니다. <b aria-label="필수">*</b></span>
              </label>
              <button
                className="privacy-toggle"
                type="button"
                aria-expanded={privacyOpen}
                aria-controls="student-attendance-privacy-details"
                onClick={() => setPrivacyOpen((open) => !open)}
              >{privacyOpen ? '안내 닫기' : '수집 및 이용 안내 보기'}</button>
              {privacyOpen ? (
                <dl id="student-attendance-privacy-details" className="privacy-details">
                  <div><dt>목적</dt><dd>{studentAttendancePrivacyPolicy.purpose}</dd></div>
                  <div><dt>수집 항목</dt><dd>{studentAttendancePrivacyPolicy.collectedItems}</dd></div>
                  <div><dt>보유 기간</dt><dd>{studentAttendancePrivacyPolicy.retentionPeriod}</dd></div>
                  <div><dt>동의 거부</dt><dd>{studentAttendancePrivacyPolicy.refusalNotice}</dd></div>
                </dl>
              ) : null}
              {errors.privacy ? <span className="field-error" id="student-attendance-privacy-error">{errors.privacy}</span> : null}
            </div>

            {isAttending ? <div className="privacy-consent student-selection-consent">
              <label className="registration-checkline">
                <input
                  id="student-selection-criteria-consent"
                  type="checkbox"
                  required
                  checked={draft.selectionCriteriaConsent}
                  onChange={(event) => updateDraft('selectionCriteriaConsent', event.target.checked)}
                  aria-invalid={Boolean(errors.selectionCriteriaConsent)}
                  aria-describedby={`student-selection-criteria${errors.selectionCriteriaConsent ? ' student-selection-criteria-error' : ''}`}
                />
                <span>참석자 선정 기준에 동의합니다. <b aria-label="필수">*</b></span>
              </label>
              <StudentSelectionCriteria />
              {errors.selectionCriteriaConsent ? (
                <span className="field-error" id="student-selection-criteria-error">{errors.selectionCriteriaConsent}</span>
              ) : null}
            </div> : null}

            <div className="registration-honeypot" aria-hidden="true">
              <label htmlFor="student-website">웹사이트</label>
              <input
                id="student-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(event) => setHoneypot(event.target.value)}
              />
            </div>

            {hasErrors ? (
              <p className="registration-error-summary" role="alert" tabIndex={-1}>
                {errors.form ?? '입력한 내용을 다시 확인해주세요.'}
              </p>
            ) : null}
            {!isSupabaseConfigured() ? <p className="registration-configuration-note">현재 온라인 회신 기능을 준비하고 있습니다.</p> : null}
            <button className="button button--gold registration-submit" type="submit" disabled={submitting}>
              {submitting
                ? '전송 중...'
                : isAttending
                  ? '재학생 참석 신청하기'
                  : draft.attendanceStatus === 'not_attending'
                    ? '불참 회신하기'
                    : '응답 제출하기'}
            </button>
            <p className="registration-submit-note">동일한 전화번호로 다시 제출하면 최신 응답으로 반영됩니다.</p>
          </form>
        </div>
      )}
    </RevealSection>
  );
}
