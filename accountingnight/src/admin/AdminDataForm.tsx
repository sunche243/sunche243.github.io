import { useState, type FormEvent } from 'react';
import { createAdminManualResponse } from './adminDataService';
import {
  emptyAdminManualResponseDraft,
  type AdminManualResponseDraft,
  type AdminResponseType,
} from './adminDataTypes';
import { normalizeAdminPledgeAmount, validateAdminManualResponse } from './adminDataUtils';

const responseTypeLabels: Record<AdminResponseType, string> = {
  sponsorship: '발전기금·참석 회신',
  attendance: '참석 여부',
  student: '학생 참석',
};

function OptionalMark() {
  return <span className="admin-data-optional">선택</span>;
}

export function AdminDataForm({
  onCreated,
  onError,
}: {
  onCreated: (message: string) => void;
  onError: (message: string) => void;
}) {
  const [draft, setDraft] = useState<AdminManualResponseDraft>(emptyAdminManualResponseDraft);
  const [errors, setErrors] = useState<ReturnType<typeof validateAdminManualResponse>['errors']>({});
  const [submitting, setSubmitting] = useState(false);

  const showAlumniFields = draft.responseType !== 'student';
  const showPledgeAmount = draft.responseType === 'sponsorship';
  const showStudentFields = draft.responseType === 'student';

  function updateDraft<K extends keyof AdminManualResponseDraft>(key: K, value: AdminManualResponseDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function changeResponseType(responseType: AdminResponseType) {
    setDraft(emptyAdminManualResponseDraft(responseType));
    setErrors({});
  }

  function changeStudentCouncilExperience(value: AdminManualResponseDraft['studentCouncilExperience']) {
    setDraft((current) => ({
      ...current,
      studentCouncilExperience: value,
      studentCouncilDetails: value === 'yes' ? current.studentCouncilDetails : '',
    }));
    setErrors((current) => ({ ...current, studentCouncilExperience: undefined, studentCouncilDetails: undefined }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const validation = validateAdminManualResponse(draft);
    setErrors(validation.errors);
    if (!validation.valid || !validation.value) return;

    setSubmitting(true);
    try {
      await createAdminManualResponse(validation.value);
      onCreated(`${responseTypeLabels[draft.responseType]}에 데이터를 등록했습니다.`);
      setDraft(emptyAdminManualResponseDraft(draft.responseType));
    } catch (error) {
      onError(error instanceof Error ? error.message : '데이터를 등록하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-data-form" onSubmit={(event) => void submit(event)} noValidate>
      <fieldset className="admin-data-type-picker">
        <legend>데이터가 들어갈 위치</legend>
        <p>먼저 등록할 응답 종류를 선택해주세요.</p>
        <div>
          {(Object.entries(responseTypeLabels) as [AdminResponseType, string][]).map(([value, label]) => (
            <label key={value} className={draft.responseType === value ? 'is-selected' : ''}>
              <input
                type="radio"
                name="response-type"
                value={value}
                checked={draft.responseType === value}
                onChange={() => changeResponseType(value)}
              />
              <strong>{label}</strong>
              <span>{value === 'sponsorship' ? '후원·동문 회신' : value === 'attendance' ? '졸업생·내외빈 회신' : '재학생 회신'}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <section className="admin-data-fields" aria-labelledby="admin-data-fields-title">
        <div className="admin-data-section-heading">
          <p>MANUAL DATA ENTRY</p>
          <h2 id="admin-data-fields-title">{responseTypeLabels[draft.responseType]} 입력</h2>
          <span>아래 항목은 모두 선택 입력입니다. 비워둔 값은 미입력으로 저장됩니다.</span>
        </div>

        <div className="admin-data-grid">
          <label>
            <span>성명 <OptionalMark /></span>
            <input
              value={draft.name}
              onChange={(event) => updateDraft('name', event.target.value)}
              maxLength={80}
              autoComplete="off"
              aria-invalid={Boolean(errors.name)}
              placeholder="예: 홍길동"
            />
            {errors.name ? <small className="admin-field-error">{errors.name}</small> : null}
          </label>

          <label>
            <span>전화번호 <OptionalMark /></span>
            <input
              type="tel"
              inputMode="tel"
              value={draft.phone}
              onChange={(event) => updateDraft('phone', event.target.value)}
              autoComplete="off"
              aria-invalid={Boolean(errors.phone)}
              placeholder="예: 010-1234-5678"
            />
            {errors.phone ? <small className="admin-field-error">{errors.phone}</small> : null}
          </label>

          <label>
            <span>{showStudentFields ? '학번' : '입학년도(학번)'} <OptionalMark /></span>
            <input
              value={draft.admissionYear}
              onChange={(event) => updateDraft('admissionYear', event.target.value.replace(/\D/g, '').slice(0, 2))}
              inputMode="numeric"
              maxLength={2}
              autoComplete="off"
              aria-invalid={Boolean(errors.admissionYear)}
              placeholder={showStudentFields ? '예: 24' : '예: 98'}
            />
            {errors.admissionYear ? <small className="admin-field-error">{errors.admissionYear}</small> : null}
          </label>

          {showAlumniFields ? (
            <label>
              <span>현재 소속 및 직함 <OptionalMark /></span>
              <input
                value={draft.affiliation}
                onChange={(event) => updateDraft('affiliation', event.target.value)}
                maxLength={200}
                autoComplete="off"
                aria-invalid={Boolean(errors.affiliation)}
                placeholder="예: 동국대학교 교수"
              />
              {errors.affiliation ? <small className="admin-field-error">{errors.affiliation}</small> : null}
            </label>
          ) : null}

          {showPledgeAmount ? (
            <label>
              <span>후원금액 <OptionalMark /></span>
              <div className="admin-data-amount">
                <input
                  value={draft.pledgeAmount}
                  onChange={(event) => updateDraft('pledgeAmount', normalizeAdminPledgeAmount(event.target.value))}
                  inputMode="numeric"
                  autoComplete="off"
                  aria-invalid={Boolean(errors.pledgeAmount)}
                  placeholder="예: 500,000"
                />
                <span>원</span>
              </div>
              {errors.pledgeAmount ? <small className="admin-field-error">{errors.pledgeAmount}</small> : null}
            </label>
          ) : null}

          <label>
            <span>참석 여부 <OptionalMark /></span>
            <select
              value={draft.attendanceStatus}
              onChange={(event) => updateDraft('attendanceStatus', event.target.value as AdminManualResponseDraft['attendanceStatus'])}
            >
              <option value="">미입력</option>
              <option value="attending">참석</option>
              <option value="not_attending">불참</option>
            </select>
          </label>

          {showStudentFields ? (
            <>
              <label>
                <span>학생회 활동 경험 <OptionalMark /></span>
                <select
                  value={draft.studentCouncilExperience}
                  onChange={(event) => changeStudentCouncilExperience(event.target.value as AdminManualResponseDraft['studentCouncilExperience'])}
                >
                  <option value="">미입력</option>
                  <option value="yes">경험 있음</option>
                  <option value="no">경험 없음</option>
                </select>
              </label>

              {draft.studentCouncilExperience === 'yes' ? (
                <label className="admin-data-full-width">
                  <span>학생회 활동 연도 및 직책 <OptionalMark /></span>
                  <textarea
                    value={draft.studentCouncilDetails}
                    onChange={(event) => updateDraft('studentCouncilDetails', event.target.value)}
                    maxLength={500}
                    rows={4}
                    aria-invalid={Boolean(errors.studentCouncilDetails)}
                    placeholder="예: 2024년 2학기 총무부장"
                  />
                  {errors.studentCouncilDetails ? <small className="admin-field-error">{errors.studentCouncilDetails}</small> : null}
                </label>
              ) : null}

              <label>
                <span>학생회비 납부 상태 <OptionalMark /></span>
                <select
                  value={draft.studentCouncilFeeStatus}
                  onChange={(event) => updateDraft('studentCouncilFeeStatus', event.target.value as AdminManualResponseDraft['studentCouncilFeeStatus'])}
                >
                  <option value="">미입력</option>
                  <option value="paid">납부</option>
                  <option value="unpaid">미납부</option>
                  <option value="unverified">확인 필요</option>
                  <option value="not_applicable">해당 없음</option>
                </select>
              </label>
            </>
          ) : null}

          {draft.responseType !== 'attendance' ? (
            <label className="admin-data-full-width">
              <span>관리자 메모 <OptionalMark /></span>
              <textarea
                value={draft.adminMemo}
                onChange={(event) => updateDraft('adminMemo', event.target.value)}
                maxLength={2_000}
                rows={4}
                aria-invalid={Boolean(errors.adminMemo)}
                placeholder="입력 경위나 확인할 내용을 자유롭게 기록하세요."
              />
              {errors.adminMemo ? <small className="admin-field-error">{errors.adminMemo}</small> : null}
            </label>
          ) : null}
        </div>
      </section>

      <div className="admin-data-submit">
        <p>등록 후 각 관리자 탭에서 바로 확인하고 수정할 수 있습니다.</p>
        <button className="admin-button" type="submit" disabled={submitting}>
          {submitting ? '등록 중...' : `${responseTypeLabels[draft.responseType]}에 등록하기`}
        </button>
      </div>
    </form>
  );
}
