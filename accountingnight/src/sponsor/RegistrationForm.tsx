import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RevealSection } from '../components/RevealSection';
import { SectionHeader } from '../components/SectionHeader';
import { privacyPolicy } from '../config/privacy';
import { MAX_SPONSOR_UNITS, MIN_SPONSOR_UNITS } from '../config/sponsorship';
import { fetchActiveFormFields, submitRegistration } from '../services/registration';
import { isSupabaseConfigured, SupabaseConfigurationError } from '../services/supabase';
import type {
  AttendanceStatus,
  DynamicAnswers,
  DynamicAnswerValue,
  FormField,
  RegistrationDraft,
} from '../types/registration';
import {
  attendanceLabels,
  calculateSponsorshipAmount,
  formatWon,
  normalizePhone,
  normalizeSponsorshipUnits,
  serializeDynamicAnswers,
  validateRegistration,
} from '../utils/registration';

interface RegistrationFormProps {
  onComplete: () => void;
}

const attendanceOptions: AttendanceStatus[] = ['attending', 'not_attending', 'undecided'];

function DynamicField({
  field,
  value,
  error,
  onChange,
}: {
  field: FormField;
  value: DynamicAnswerValue | undefined;
  error?: string;
  onChange: (value: DynamicAnswerValue) => void;
}) {
  const inputId = `custom-field-${field.id}`;
  const errorId = `${inputId}-error`;
  const commonProps = {
    id: inputId,
    name: field.id,
    required: field.required,
    'aria-invalid': Boolean(error),
    'aria-describedby': error ? errorId : undefined,
  };

  if (field.type === 'radio') {
    return (
      <fieldset className="registration-field registration-field--choices">
        <legend>
          {field.label} {field.required ? <span aria-label="필수">*</span> : null}
        </legend>
        <div className="registration-choices">
          {field.options.map((option) => (
            <label key={option}>
              <input
                type="radio"
                name={field.id}
                value={option}
                checked={value === option}
                onChange={() => onChange(option)}
                required={field.required}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? errorId : undefined}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
        {error ? <span className="field-error" id={errorId}>{error}</span> : null}
      </fieldset>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div className="registration-field registration-field--checkbox">
        <label htmlFor={inputId}>
          <input
            {...commonProps}
            type="checkbox"
            checked={value === true}
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>
            {field.label} {field.required ? <b aria-label="필수">*</b> : null}
          </span>
        </label>
        {error ? <span className="field-error" id={errorId}>{error}</span> : null}
      </div>
    );
  }

  return (
    <div className="registration-field">
      <label htmlFor={inputId}>
        {field.label} {field.required ? <span aria-label="필수">*</span> : null}
      </label>
      {field.type === 'textarea' ? (
        <textarea
          {...commonProps}
          value={String(value ?? '')}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
        />
      ) : field.type === 'select' ? (
        <select {...commonProps} value={String(value ?? '')} onChange={(event) => onChange(event.target.value)}>
          <option value="">선택해주세요</option>
          {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
      ) : (
        <input
          {...commonProps}
          type={field.type}
          inputMode={field.type === 'tel' ? 'tel' : field.type === 'number' ? 'numeric' : undefined}
          value={String(value ?? '')}
          onChange={(event) => onChange(
            field.type === 'number' && event.target.value !== '' ? Number(event.target.value) : event.target.value,
          )}
        />
      )}
      {error ? <span className="field-error" id={errorId}>{error}</span> : null}
    </div>
  );
}

export function RegistrationForm({ onComplete }: RegistrationFormProps) {
  const formStartedAt = useRef(Date.now());
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<DynamicAnswers>({});
  const [draft, setDraft] = useState<RegistrationDraft>({
    name: '',
    phone: '',
    wantsSponsorship: false,
    sponsorshipUnits: MIN_SPONSOR_UNITS,
    attendanceStatus: null,
    privacyConsent: false,
  });
  const [honeypot, setHoneypot] = useState('');
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [fieldLoading, setFieldLoading] = useState(isSupabaseConfigured());
  const [fieldLoadFailed, setFieldLoadFailed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let active = true;

    void fetchActiveFormFields()
      .then((loadedFields) => {
        if (active) setFields(loadedFields);
      })
      .catch(() => {
        if (active) {
          setFieldLoadFailed(true);
          setErrors({ form: '추가 질문을 불러오지 못했습니다. 페이지를 새로고침해 다시 시도해주세요.' });
        }
      })
      .finally(() => {
        if (active) setFieldLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  function updateDraft<Key extends keyof RegistrationDraft>(key: Key, value: RegistrationDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '', participation: '' }));
  }

  function updateAnswer(fieldId: string, value: DynamicAnswerValue) {
    setAnswers((current) => ({ ...current, [fieldId]: value }));
    setErrors((current) => ({ ...current, [fieldId]: '' }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || submitted) return;

    const validation = validateRegistration({
      draft,
      fields,
      answers,
      honeypot,
      formStartedAt: formStartedAt.current,
    });

    if (!validation.valid) {
      setErrors(validation.errors);
      window.requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('[aria-invalid="true"], .registration-error-summary')?.focus();
      });
      return;
    }

    if (fieldLoadFailed) {
      setErrors({ form: '추가 질문을 불러오지 못했습니다. 페이지를 새로고침해 다시 시도해주세요.' });
      return;
    }

    if (!isSupabaseConfigured()) {
      setErrors({ form: '현재 신청 기능을 준비하고 있습니다.' });
      return;
    }

    setSubmitting(true);
    setErrors({});

    try {
      await submitRegistration({
        name: draft.name.trim(),
        phone: normalizePhone(draft.phone),
        wantsSponsorship: draft.wantsSponsorship,
        sponsorshipUnits: draft.wantsSponsorship ? draft.sponsorshipUnits : 0,
        attendanceStatus: draft.attendanceStatus,
        answers: serializeDynamicAnswers(fields, answers),
        privacyConsent: draft.privacyConsent,
        honeypot,
        formStartedAt: formStartedAt.current,
      });
      setSubmitted(true);
      onComplete();
    } catch (error) {
      setErrors({
        form: error instanceof SupabaseConfigurationError
          ? '현재 신청 기능을 준비하고 있습니다.'
          : '등록 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <RevealSection id="registration" className="section--paper registration-section" label="등록 완료">
        <div className="section-inner registration-success" role="status">
          <p className="registration-success__eyebrow">THANK YOU</p>
          <h2>소중한 참여 의향이 등록되었습니다.</h2>
          <p>담당자가 확인 후 입력하신 연락처로 안내드리겠습니다.</p>
          <dl>
            {draft.wantsSponsorship ? (
              <div>
                <dt>후원 의향</dt>
                <dd>{draft.sponsorshipUnits}구좌 · {formatWon(calculateSponsorshipAmount(draft.sponsorshipUnits))}</dd>
              </div>
            ) : null}
            {draft.attendanceStatus ? (
              <div>
                <dt>참석 여부</dt>
                <dd>{attendanceLabels[draft.attendanceStatus]}</dd>
              </div>
            ) : null}
          </dl>
          <p className="registration-success__note">이 화면은 결제 완료를 의미하지 않습니다.</p>
        </div>
      </RevealSection>
    );
  }

  return (
    <RevealSection id="registration" className="section--paper registration-section" label="후원 및 참석 등록">
      <div className="section-inner registration-layout">
        <SectionHeader eyebrow="SPONSORSHIP & ATTENDANCE" title="후원 · 참석 등록" align="left" />
        <p className="registration-lead">후원 의향과 행사 참석 여부를 남겨주시면 담당자가 확인 후 연락드리겠습니다.</p>

        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          <div className="registration-core-fields">
            <div className="registration-field">
              <label htmlFor="registration-name">이름 <span aria-label="필수">*</span></label>
              <input
                id="registration-name"
                name="name"
                autoComplete="name"
                value={draft.name}
                onChange={(event) => updateDraft('name', event.target.value)}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={errors.name ? 'registration-name-error' : undefined}
              />
              {errors.name ? <span className="field-error" id="registration-name-error">{errors.name}</span> : null}
            </div>
            <div className="registration-field">
              <label htmlFor="registration-phone">전화번호 <span aria-label="필수">*</span></label>
              <input
                id="registration-phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={draft.phone}
                onChange={(event) => updateDraft('phone', event.target.value)}
                aria-invalid={Boolean(errors.phone)}
                aria-describedby={errors.phone ? 'registration-phone-error' : undefined}
              />
              {errors.phone ? <span className="field-error" id="registration-phone-error">{errors.phone}</span> : null}
            </div>
          </div>

          <fieldset className="registration-group sponsorship-choice">
            <legend>후원 의향</legend>
            <label className="registration-checkline">
              <input
                type="checkbox"
                checked={draft.wantsSponsorship}
                onChange={(event) => updateDraft('wantsSponsorship', event.target.checked)}
              />
              <span>50주년 후원에 참여할 의향이 있습니다.</span>
            </label>
            {draft.wantsSponsorship ? (
              <div className="sponsorship-units">
                <span>후원 구좌</span>
                <div className="sponsorship-stepper" aria-label="후원 구좌 수">
                  <button
                    type="button"
                    aria-label="후원 구좌 줄이기"
                    onClick={() => updateDraft('sponsorshipUnits', normalizeSponsorshipUnits(draft.sponsorshipUnits - 1))}
                    disabled={draft.sponsorshipUnits <= MIN_SPONSOR_UNITS}
                  >−</button>
                  <strong aria-live="polite">{draft.sponsorshipUnits}구좌</strong>
                  <button
                    type="button"
                    aria-label="후원 구좌 늘리기"
                    onClick={() => updateDraft('sponsorshipUnits', normalizeSponsorshipUnits(draft.sponsorshipUnits + 1))}
                    disabled={draft.sponsorshipUnits >= MAX_SPONSOR_UNITS}
                  >+</button>
                </div>
                <strong className="sponsorship-amount">{formatWon(calculateSponsorshipAmount(draft.sponsorshipUnits))}</strong>
                <small>1구좌 = {formatWon(calculateSponsorshipAmount(1))}</small>
              </div>
            ) : null}
            {errors.sponsorshipUnits ? <span className="field-error">{errors.sponsorshipUnits}</span> : null}
          </fieldset>

          <fieldset className="registration-group registration-field--choices">
            <legend>참석 여부</legend>
            <div className="registration-choices">
              {attendanceOptions.map((status) => (
                <label key={status}>
                  <input
                    type="radio"
                    name="attendance-status"
                    checked={draft.attendanceStatus === status}
                    onChange={() => updateDraft('attendanceStatus', status)}
                    aria-invalid={Boolean(errors.participation)}
                  />
                  <span>{status === 'attending' ? '참석합니다' : status === 'not_attending' ? '참석하지 못합니다' : '아직 미정입니다'}</span>
                </label>
              ))}
            </div>
            {errors.participation ? <span className="field-error">{errors.participation}</span> : null}
          </fieldset>

          {fieldLoading ? <p className="registration-loading" aria-live="polite">추가 질문을 불러오고 있습니다.</p> : null}
          {!fieldLoading && fields.length ? (
            <div className="registration-dynamic-fields">
              {fields.map((field) => (
                <DynamicField
                  key={field.id}
                  field={field}
                  value={answers[field.id]}
                  error={errors[field.id]}
                  onChange={(value) => updateAnswer(field.id, value)}
                />
              ))}
            </div>
          ) : null}

          <div className="privacy-consent">
            <label className="registration-checkline">
              <input
                type="checkbox"
                checked={draft.privacyConsent}
                onChange={(event) => updateDraft('privacyConsent', event.target.checked)}
                aria-invalid={Boolean(errors.privacy)}
              />
              <span>개인정보 수집 및 이용에 동의합니다. <b aria-label="필수">*</b></span>
            </label>
            <button
              className="privacy-toggle"
              type="button"
              aria-expanded={privacyOpen}
              aria-controls="privacy-details"
              onClick={() => setPrivacyOpen((open) => !open)}
            >{privacyOpen ? '안내 닫기' : '수집 및 이용 안내 보기'}</button>
            {privacyOpen ? (
              <dl id="privacy-details" className="privacy-details">
                <div><dt>목적</dt><dd>{privacyPolicy.purpose}</dd></div>
                <div><dt>수집 항목</dt><dd>{privacyPolicy.collectedItems}</dd></div>
                <div><dt>보유 기간</dt><dd>{privacyPolicy.retentionPeriod}</dd></div>
              </dl>
            ) : null}
            {errors.privacy ? <span className="field-error">{errors.privacy}</span> : null}
          </div>

          <div className="registration-honeypot" aria-hidden="true">
            <label htmlFor="registration-website">웹사이트</label>
            <input
              id="registration-website"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          {Object.keys(errors).length ? (
            <p className="registration-error-summary" role="alert" tabIndex={-1}>
              {errors.form ?? '입력한 내용을 다시 확인해주세요.'}
            </p>
          ) : null}
          {!isSupabaseConfigured() ? <p className="registration-configuration-note">현재 온라인 신청 기능을 준비하고 있습니다.</p> : null}
          <button className="button button--dark registration-submit" type="submit" disabled={submitting || fieldLoading || fieldLoadFailed}>
            {submitting ? '등록 중' : '후원 · 참석 의향 등록하기'}
          </button>
          <p className="registration-submit-note">후원 의향 등록은 결제 완료를 의미하지 않습니다.</p>
        </form>
      </div>
    </RevealSection>
  );
}
