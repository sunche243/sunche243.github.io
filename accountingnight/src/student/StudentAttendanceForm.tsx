import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { RevealSection } from '../components/RevealSection';
import { studentAttendancePrivacyPolicy } from '../config/privacy';
import { submitStudentAttendanceResponse } from '../services/studentAttendance';
import { isSupabaseConfigured, SupabaseConfigurationError } from '../services/supabase';
import type { StudentAttendanceDraft } from '../types/studentAttendance';
import { scheduleAttendanceSuccessNavigation } from '../utils/attendance';
import { validateStudentAttendanceResponse } from '../utils/studentAttendance';
import { StudentAttendanceSuccess } from './StudentAttendanceSuccess';

const initialDraft: StudentAttendanceDraft = {
  name: '',
  phone: '',
  admissionYear: '',
  studentCouncilExperience: null,
  studentCouncilDetails: '',
  attendanceStatus: null,
  privacyConsent: false,
};

interface StudentCouncilExperienceFieldsProps {
  experience: boolean | null;
  details: string;
  errors: Record<string, string>;
  onExperienceChange: (value: boolean) => void;
  onDetailsChange: (value: string) => void;
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
            placeholder="예: 2024년 회계학과 학생회 총무국장"
            value={details}
            onChange={(event) => onDetailsChange(event.target.value)}
            aria-invalid={Boolean(errors.studentCouncilDetails)}
            aria-describedby={errors.studentCouncilDetails ? 'student-council-details-error' : 'student-council-details-help'}
          />
          <span className="student-council-help" id="student-council-details-help">활동했던 연도와 직책을 자유롭게 작성해 주세요.</span>
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
    setErrors((current) => ({ ...current, [key]: '', privacy: '', form: '' }));
  }

  function updateStudentCouncilExperience(value: boolean) {
    setDraft((current) => ({
      ...current,
      studentCouncilExperience: value,
      studentCouncilDetails: value ? current.studentCouncilDetails : '',
    }));
    setErrors((current) => ({
      ...current,
      studentCouncilExperience: '',
      studentCouncilDetails: '',
      form: '',
    }));
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
    if (draft.studentCouncilExperience === null || !draft.attendanceStatus) return;

    setSubmitting(true);
    setErrors({});
    try {
      await submitStudentAttendanceResponse({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        admissionYear: draft.admissionYear.trim(),
        studentCouncilExperience: draft.studentCouncilExperience,
        studentCouncilDetails: draft.studentCouncilDetails.trim(),
        attendanceStatus: draft.attendanceStatus,
        privacyConsent: draft.privacyConsent,
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

  return (
    <RevealSection
      id="student-attendance-response"
      className="section--paper registration-section attendance-response-section"
      label={completedStatus ? '재학생 참석 여부 회신 완료' : '재학생 참석 여부 입력'}
      sectionRef={setAttendanceSectionRef}
    >
      {completedStatus ? (
        <StudentAttendanceSuccess name={draft.name.trim()} status={completedStatus} headingRef={successHeadingRef} />
      ) : (
        <div className="section-inner registration-layout">
          <form ref={formRef} className="registration-form" onSubmit={handleSubmit} noValidate>
            <section className="registration-step" aria-labelledby="student-information-title">
              <header className="registration-step__heading">
                <p>STUDENT DETAILS</p>
                <h2 id="student-information-title">회신자 정보</h2>
                <span>별표가 표시된 항목은 참석 여부 확인을 위한 필수 정보입니다.</span>
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
                  <label htmlFor="student-admission-year">입학년도(학번)</label>
                  <input
                    id="student-admission-year"
                    name="admission-year"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{2}"
                    maxLength={2}
                    placeholder="예: 24"
                    value={draft.admissionYear}
                    onChange={(event) => updateDraft('admissionYear', event.target.value)}
                    aria-invalid={Boolean(errors.admissionYear)}
                    aria-describedby={errors.admissionYear ? 'student-admission-year-error' : undefined}
                  />
                  {errors.admissionYear ? <span className="field-error" id="student-admission-year-error">{errors.admissionYear}</span> : null}
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

              <StudentCouncilExperienceFields
                experience={draft.studentCouncilExperience}
                details={draft.studentCouncilDetails}
                errors={errors}
                onExperienceChange={updateStudentCouncilExperience}
                onDetailsChange={(value) => updateDraft('studentCouncilDetails', value)}
              />
            </section>

            <section className="registration-step" aria-labelledby="student-attendance-choice-title">
              <header className="registration-step__heading">
                <p>ATTENDANCE</p>
                <h2 id="student-attendance-choice-title">참석 여부</h2>
                <span>현재 참석 계획에 맞는 항목을 선택해 주세요.</span>
              </header>
              <fieldset className="attendance-options">
                <legend className="sr-only">참석 여부 선택</legend>
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
                        <small>{status === 'attending' ? 'YES, I WILL ATTEND' : 'UNABLE TO ATTEND'}</small>
                        <strong>{status === 'attending' ? '참석합니다' : '참석하지 못합니다'}</strong>
                      </span>
                    </label>
                  );
                })}
                {errors.attendanceStatus ? <span className="field-error" id="student-attendance-status-error">{errors.attendanceStatus}</span> : null}
              </fieldset>
            </section>

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
                </dl>
              ) : null}
              {errors.privacy ? <span className="field-error" id="student-attendance-privacy-error">{errors.privacy}</span> : null}
            </div>

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
              {submitting ? '회신 중...' : '재학생 참석 여부 회신하기'}
            </button>
            <p className="registration-submit-note">응답을 변경해야 하는 경우 같은 정보로 다시 회신할 수 있습니다.</p>
          </form>
        </div>
      )}
    </RevealSection>
  );
}
