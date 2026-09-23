import { useEffect, useRef, useState, type FormEvent } from 'react';
import { RevealSection } from '../components/RevealSection';
import { privacyPolicy } from '../config/privacy';
import { pledgeOptionDetails, pledgeOptions } from '../config/sponsorship';
import { fetchActiveFormFields, submitRegistration } from '../services/registration';
import { isSupabaseConfigured, SupabaseConfigurationError } from '../services/supabase';
import type {
  DynamicAnswers,
  DynamicAnswerValue,
  FormField,
  RegistrationDraft,
} from '../types/registration';
import {
  attendanceLabels,
  formatWon,
  getPledgeSelection,
  isAdmissionFieldLabel,
  isAffiliationFieldLabel,
  normalizePhone,
  normalizePledgeAmountInput,
  serializeDynamicAnswers,
  validateRegistration,
} from '../utils/registration';

interface RegistrationFormProps {
  onComplete: () => void;
}

function getFieldPlaceholder(field: FormField): string | undefined {
  if (isAdmissionFieldLabel(field.label)) return '예: 98학번';
  if (isAffiliationFieldLabel(field.label)) return '예: OO기업 CFO 등';
  return undefined;
}

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
          placeholder={getFieldPlaceholder(field)}
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
          placeholder={getFieldPlaceholder(field)}
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

function StepHeading({ number, title, description }: { number: number; title: string; description?: string }) {
  return (
    <header className="registration-step__heading">
      <p>STEP {number}</p>
      <h2>{title}</h2>
      {description ? <span>{description}</span> : null}
    </header>
  );
}

export function RegistrationForm({ onComplete }: RegistrationFormProps) {
  const formStartedAt = useRef(Date.now());
  const [fields, setFields] = useState<FormField[]>([]);
  const [answers, setAnswers] = useState<DynamicAnswers>({});
  const [draft, setDraft] = useState<RegistrationDraft>({
    name: '',
    phone: '',
    pledgeOption: null,
    pledgeAmount: 0,
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
    setErrors((current) => ({ ...current, [key]: '', pledgeOption: '', pledgeAmount: '' }));
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

    if (!draft.pledgeOption) return;
    const selection = getPledgeSelection(draft.pledgeOption, draft.pledgeAmount);
    setSubmitting(true);
    setErrors({});

    try {
      await submitRegistration({
        name: draft.name.trim(),
        phone: normalizePhone(draft.phone),
        pledgeOption: draft.pledgeOption,
        pledgeAmount: selection.amount,
        attendanceStatus: selection.attendanceStatus,
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

  const admissionField = fields.find((field) => isAdmissionFieldLabel(field.label));
  const affiliationField = fields.find((field) => isAffiliationFieldLabel(field.label));
  const otherFields = fields.filter((field) => field !== admissionField && field !== affiliationField);

  if (submitted && draft.pledgeOption) {
    const selection = getPledgeSelection(draft.pledgeOption, draft.pledgeAmount);
    return (
      <RevealSection id="registration" className="section--paper registration-section" label="등록 완료">
        <div className="section-inner registration-success" role="status">
          <p className="registration-success__eyebrow">THANK YOU</p>
          <h2>약정 및 참석 여부가 정상적으로 등록되었습니다.</h2>
          <p>학과사무실에서 확인 후<br />필요한 절차를 개별적으로 안내드리겠습니다.</p>
          <dl>
            <div><dt>선택 옵션</dt><dd>{pledgeOptionDetails[draft.pledgeOption].label}</dd></div>
            <div><dt>약정 금액</dt><dd>{formatWon(selection.amount)}</dd></div>
            <div><dt>참석 여부</dt><dd>{attendanceLabels[selection.attendanceStatus]}</dd></div>
          </dl>
          <p className="registration-success__note">본 등록은 기부금 납부 또는 결제 완료를 의미하지 않습니다.</p>
        </div>
      </RevealSection>
    );
  }

  return (
    <RevealSection id="registration" className="section--paper registration-section" label="참석 및 발전기금 약정">
      <div className="section-inner registration-layout">
        <form className="registration-form" onSubmit={handleSubmit} noValidate>
          <section className="registration-step" aria-labelledby="registration-step-1-title">
            <div id="registration-step-1-title">
              <StepHeading
                number={1}
                title="동문 기본 정보"
                description="행사 당일 원활한 의전과 네트워킹, 그리고 추후 기부금 약정 안내를 위해 정확한 기재를 부탁드립니다."
              />
            </div>
            <div className="registration-core-group">
              <div className="registration-core-fields">
                <div className="registration-field">
                  <label htmlFor="registration-name">성명 <span aria-label="필수">*</span></label>
                  <input
                    id="registration-name"
                    name="name"
                    required
                    autoComplete="name"
                    value={draft.name}
                    onChange={(event) => updateDraft('name', event.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'registration-name-error' : undefined}
                  />
                  {errors.name ? <span className="field-error" id="registration-name-error">{errors.name}</span> : null}
                </div>
                {admissionField ? (
                  <DynamicField
                    field={admissionField}
                    value={answers[admissionField.id]}
                    error={errors[admissionField.id]}
                    onChange={(value) => updateAnswer(admissionField.id, value)}
                  />
                ) : null}
                <div className="registration-field">
                  <label htmlFor="registration-phone">휴대전화 번호 <span aria-label="필수">*</span></label>
                  <input
                    id="registration-phone"
                    name="phone"
                    type="tel"
                    inputMode="tel"
                    required
                    autoComplete="tel"
                    value={draft.phone}
                    onChange={(event) => updateDraft('phone', event.target.value)}
                    aria-invalid={Boolean(errors.phone)}
                    aria-describedby={errors.phone ? 'registration-phone-error' : undefined}
                  />
                  {errors.phone ? <span className="field-error" id="registration-phone-error">{errors.phone}</span> : null}
                </div>
                {affiliationField ? (
                  <DynamicField
                    field={affiliationField}
                    value={answers[affiliationField.id]}
                    error={errors[affiliationField.id]}
                    onChange={(value) => updateAnswer(affiliationField.id, value)}
                  />
                ) : null}
              </div>
              <p className="registration-required-note">* 별표가 표시된 항목만 필수 입력입니다.</p>
            </div>

            {fieldLoading ? <p className="registration-loading" aria-live="polite">추가 질문을 불러오고 있습니다.</p> : null}
            {!fieldLoading && otherFields.length ? (
              <div className="registration-dynamic-fields registration-dynamic-fields--additional">
                {otherFields.map((field) => (
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
          </section>

          <section className="registration-step" aria-labelledby="registration-step-2-title">
            <div id="registration-step-2-title">
              <StepHeading number={2} title="참석 수락 및 기부 약정 옵션" description="아래 항목 중 하나를 선택해 주십시오." />
            </div>
            <fieldset className="pledge-options">
              <legend className="sr-only">참석 및 발전기금 약정 옵션</legend>
              {pledgeOptions.map((option) => {
                const detail = pledgeOptionDetails[option];
                const selected = draft.pledgeOption === option;
                const customAmount = detail.amount === null;
                return (
                  <div className={`pledge-option ${selected ? 'is-selected' : ''}`} key={option}>
                    <label htmlFor={`pledge-option-${option}`}>
                      <input
                        id={`pledge-option-${option}`}
                        type="radio"
                        name="pledge-option"
                        value={option}
                        checked={selected}
                        onChange={() => updateDraft('pledgeOption', option)}
                        required
                        aria-invalid={Boolean(errors.pledgeOption)}
                        aria-describedby={errors.pledgeOption ? 'pledge-option-error' : undefined}
                      />
                      <span className="pledge-option__body">
                        <span className="pledge-option__number">OPTION {detail.optionNumber}</span>
                        {detail.optionNumber <= 3 ? <strong>[{detail.label}]</strong> : null}
                        <span className="pledge-option__title">{detail.title}</span>
                        {detail.description ? <small>{detail.description}</small> : null}
                      </span>
                    </label>
                    {selected && customAmount ? (
                      <div className="pledge-amount-field">
                        <label htmlFor={`pledge-amount-${option}`}>약정액 <span aria-label="필수">*</span></label>
                        <div className="pledge-amount-input">
                          <input
                            id={`pledge-amount-${option}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9,]*"
                            required
                            autoComplete="off"
                            value={draft.pledgeAmount ? draft.pledgeAmount.toLocaleString('ko-KR') : ''}
                            onChange={(event) => updateDraft('pledgeAmount', normalizePledgeAmountInput(event.target.value))}
                            aria-invalid={Boolean(errors.pledgeAmount)}
                            aria-describedby={errors.pledgeAmount ? 'pledge-amount-error' : undefined}
                            placeholder="금액을 입력해주세요"
                          />
                          <span>원</span>
                        </div>
                        {errors.pledgeAmount ? <span className="field-error" id="pledge-amount-error">{errors.pledgeAmount}</span> : null}
                      </div>
                    ) : null}
                  </div>
                );
              })}
              {errors.pledgeOption ? <span className="field-error" id="pledge-option-error">{errors.pledgeOption}</span> : null}
            </fieldset>
          </section>

          <section className="registration-step registration-step--tax" aria-labelledby="registration-step-3-title">
            <div id="registration-step-3-title">
              <StepHeading number={3} title="세제 혜택 안내" />
            </div>
            <div className="tax-information">
              <h3>📌 [기부금 세제 혜택 안내]</h3>
              <p>동문님께서 후원해 주시는 발전기금은 전액 동국대학교 '기부금'으로 투명하게 처리됩니다.</p>
              <p>추후 발급되는 기부금 영수증을 통해 법인세법상 법정 한도 내 전액 손금산입(법인) 또는 소득세법상 기부금 세액공제(개인) 등 완벽한 세무적 혜택을 받으실 수 있습니다. 회계학과 후배들의 든든한 버팀목이 되어주셔서 깊이 감사드립니다.</p>
            </div>
          </section>

          <div className="privacy-consent">
            <label className="registration-checkline">
              <input
                id="registration-privacy"
                type="checkbox"
                required
                checked={draft.privacyConsent}
                onChange={(event) => updateDraft('privacyConsent', event.target.checked)}
                aria-invalid={Boolean(errors.privacy)}
                aria-describedby={errors.privacy ? 'registration-privacy-error' : undefined}
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
            {errors.privacy ? <span className="field-error" id="registration-privacy-error">{errors.privacy}</span> : null}
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

          {Object.keys(errors).some((key) => errors[key]) ? (
            <p className="registration-error-summary" role="alert" tabIndex={-1}>
              {errors.form ?? '입력한 내용을 다시 확인해주세요.'}
            </p>
          ) : null}
          {!isSupabaseConfigured() ? <p className="registration-configuration-note">현재 온라인 신청 기능을 준비하고 있습니다.</p> : null}
          <button className="button button--gold registration-submit" type="submit" disabled={submitting || fieldLoading || fieldLoadFailed}>
            {submitting ? '등록 중' : '약정 및 참석 수락 완료하기'}
          </button>
          <p className="registration-submit-note">제출 후 동국대학교 대외협력실에서 납부 및 기부금 영수증 관련 절차를 개별 안내드립니다.</p>
        </form>
      </div>
    </RevealSection>
  );
}
