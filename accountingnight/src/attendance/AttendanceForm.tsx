import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { RevealSection } from '../components/RevealSection';
import { attendancePrivacyPolicy } from '../config/privacy';
import { submitAttendanceResponse } from '../services/attendance';
import { isSupabaseConfigured, SupabaseConfigurationError } from '../services/supabase';
import type { AttendanceDraft } from '../types/attendance';
import {
  scheduleAttendanceSuccessNavigation,
  validateAttendanceResponse,
} from '../utils/attendance';
import { AttendanceSuccess } from './AttendanceSuccess';

const initialDraft: AttendanceDraft = {
  name: '',
  phone: '',
  admissionYear: '',
  affiliation: '',
  attendanceStatus: null,
  privacyConsent: false,
};

interface AttendanceFormProps {
  onComplete?: () => void;
}

export function AttendanceForm({ onComplete }: AttendanceFormProps) {
  const formStartedAt = useRef(Date.now());
  const formRef = useRef<HTMLFormElement>(null);
  const attendanceSectionRef = useRef<HTMLElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const [draft, setDraft] = useState<AttendanceDraft>(initialDraft);
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

  function updateDraft<Key extends keyof AttendanceDraft>(key: Key, value: AttendanceDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '', privacy: '', form: '' }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submitted) return;

    const validation = validateAttendanceResponse({
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
      setErrors({ form: '현재 참석 여부 회신 기능을 준비하고 있습니다.' });
      return;
    }

    if (!draft.attendanceStatus) return;
    setSubmitting(true);
    setErrors({});

    try {
      await submitAttendanceResponse({
        name: draft.name.trim(),
        phone: draft.phone.trim(),
        admissionYear: draft.admissionYear.trim(),
        affiliation: draft.affiliation.trim(),
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
          ? '현재 참석 여부 회신 기능을 준비하고 있습니다.'
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
      id="attendance-response"
      className="section--paper registration-section attendance-response-section"
      label={completedStatus ? '참석 여부 회신 완료' : '참석 여부 입력'}
      sectionRef={setAttendanceSectionRef}
    >
      {completedStatus ? (
        <AttendanceSuccess
          name={draft.name.trim()}
          status={completedStatus}
          headingRef={successHeadingRef}
        />
      ) : (
        <div className="section-inner registration-layout">
        <form ref={formRef} className="registration-form" onSubmit={handleSubmit} noValidate>
          <section className="registration-step" aria-labelledby="attendance-information-title">
            <header className="registration-step__heading">
              <p>RSVP DETAILS</p>
              <h2 id="attendance-information-title">회신자 정보</h2>
              <span>별표가 표시된 항목은 참석 여부 확인을 위한 필수 정보입니다.</span>
            </header>

            <div className="registration-core-fields">
              <div className="registration-field">
                <label htmlFor="attendance-name">성명 <span aria-label="필수">*</span></label>
                <input
                  id="attendance-name"
                  name="name"
                  required
                  autoComplete="name"
                  value={draft.name}
                  onChange={(event) => updateDraft('name', event.target.value)}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? 'attendance-name-error' : undefined}
                />
                {errors.name ? <span className="field-error" id="attendance-name-error">{errors.name}</span> : null}
              </div>

              <div className="registration-field">
                <label htmlFor="attendance-admission-year">입학년도(학번)</label>
                <input
                  id="attendance-admission-year"
                  name="admission-year"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{2}"
                  placeholder="예: 98"
                  value={draft.admissionYear}
                  onChange={(event) => updateDraft('admissionYear', event.target.value)}
                  aria-invalid={Boolean(errors.admissionYear)}
                  aria-describedby={errors.admissionYear ? 'attendance-admission-year-error' : undefined}
                />
                {errors.admissionYear ? <span className="field-error" id="attendance-admission-year-error">{errors.admissionYear}</span> : null}
              </div>

              <div className="registration-field">
                <label htmlFor="attendance-phone">휴대전화 번호 <span aria-label="필수">*</span></label>
                <input
                  id="attendance-phone"
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
                  aria-describedby={errors.phone ? 'attendance-phone-error' : undefined}
                />
                {errors.phone ? <span className="field-error" id="attendance-phone-error">{errors.phone}</span> : null}
              </div>

              <div className="registration-field">
                <label htmlFor="attendance-affiliation">현재 소속 및 직함</label>
                <input
                  id="attendance-affiliation"
                  name="affiliation"
                  type="text"
                  maxLength={200}
                  placeholder="예: OO기업 CFO 등"
                  value={draft.affiliation}
                  onChange={(event) => updateDraft('affiliation', event.target.value)}
                  aria-invalid={Boolean(errors.affiliation)}
                  aria-describedby={errors.affiliation ? 'attendance-affiliation-error' : undefined}
                />
                {errors.affiliation ? <span className="field-error" id="attendance-affiliation-error">{errors.affiliation}</span> : null}
              </div>
            </div>
          </section>

          <section className="registration-step" aria-labelledby="attendance-choice-title">
            <header className="registration-step__heading">
              <p>ATTENDANCE</p>
              <h2 id="attendance-choice-title">참석 여부</h2>
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
                      aria-describedby={errors.attendanceStatus ? 'attendance-status-error' : undefined}
                    />
                    <span>
                      <small>{status === 'attending' ? 'YES, I WILL ATTEND' : 'UNABLE TO ATTEND'}</small>
                      <strong>{status === 'attending' ? '참석합니다' : '참석하지 못합니다'}</strong>
                    </span>
                  </label>
                );
              })}
              {errors.attendanceStatus ? <span className="field-error" id="attendance-status-error">{errors.attendanceStatus}</span> : null}
            </fieldset>
          </section>

          <div className="privacy-consent">
            <label className="registration-checkline">
              <input
                id="attendance-privacy"
                type="checkbox"
                required
                checked={draft.privacyConsent}
                onChange={(event) => updateDraft('privacyConsent', event.target.checked)}
                aria-invalid={Boolean(errors.privacy)}
                aria-describedby={errors.privacy ? 'attendance-privacy-error' : undefined}
              />
              <span>개인정보 수집 및 이용에 동의합니다. <b aria-label="필수">*</b></span>
            </label>
            <button
              className="privacy-toggle"
              type="button"
              aria-expanded={privacyOpen}
              aria-controls="attendance-privacy-details"
              onClick={() => setPrivacyOpen((open) => !open)}
            >{privacyOpen ? '안내 닫기' : '수집 및 이용 안내 보기'}</button>
            {privacyOpen ? (
              <dl id="attendance-privacy-details" className="privacy-details">
                <div><dt>목적</dt><dd>{attendancePrivacyPolicy.purpose}</dd></div>
                <div><dt>수집 항목</dt><dd>{attendancePrivacyPolicy.collectedItems}</dd></div>
                <div><dt>보유 기간</dt><dd>{attendancePrivacyPolicy.retentionPeriod}</dd></div>
              </dl>
            ) : null}
            {errors.privacy ? <span className="field-error" id="attendance-privacy-error">{errors.privacy}</span> : null}
          </div>

          <div className="registration-honeypot" aria-hidden="true">
            <label htmlFor="attendance-website">웹사이트</label>
            <input
              id="attendance-website"
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
            {submitting ? '회신 중...' : '참석 여부 회신하기'}
          </button>
          <p className="registration-submit-note">응답을 변경해야 하는 경우 같은 정보로 다시 회신할 수 있습니다.</p>
        </form>
        </div>
      )}
    </RevealSection>
  );
}
