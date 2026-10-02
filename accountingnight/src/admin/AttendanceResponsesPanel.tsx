import { useMemo, useState, type FormEvent } from 'react';
import type { AttendanceResponse, AttendanceResponseEditableFields } from '../types/attendance';
import { attendanceResponseLabels } from '../utils/attendance';
import {
  calculateAttendanceAdminStats,
  countAttendanceResponsesByPhone,
  filterAttendanceResponses,
  validateAttendanceAdminEdit,
  type AttendanceAdminEditDraft,
  type AttendanceAdminEditErrors,
  type AttendanceAdminFilters,
} from './attendanceAdminUtils';
import { deleteAttendanceResponse, updateAttendanceResponse } from './adminService';
import { AdminDialog } from './AdminDialog';
import { formatAdminDate } from './adminUtils';
import { downloadAttendanceExcel } from './excel';

interface AttendanceResponsesPanelProps {
  responses: AttendanceResponse[];
  onUpdated: (id: string, value: AttendanceResponseEditableFields) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

interface AttendanceMutationDialogProps {
  response: AttendanceResponse;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

interface AttendanceEditDialogProps extends AttendanceMutationDialogProps {
  onUpdated: (id: string, value: AttendanceResponseEditableFields) => void;
}

export function AttendanceEditDialog({
  response,
  onClose,
  onUpdated,
  onError,
  onSuccess,
}: AttendanceEditDialogProps) {
  const [draft, setDraft] = useState<AttendanceAdminEditDraft>({
    name: response.name,
    phone: response.phone,
    admissionYear: response.admission_year ?? '',
    affiliation: response.affiliation ?? '',
    attendanceStatus: response.attendance_status,
  });
  const [errors, setErrors] = useState<AttendanceAdminEditErrors>({});
  const [saving, setSaving] = useState(false);
  const requestClose = () => {
    if (!saving) onClose();
  };

  function updateDraft<K extends keyof AttendanceAdminEditDraft>(key: K, value: AttendanceAdminEditDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const validation = validateAttendanceAdminEdit(draft);
    setErrors(validation.errors);
    if (!validation.valid || !validation.value) return;

    setSaving(true);
    onError('');
    try {
      await updateAttendanceResponse(response.id, validation.value);
      onUpdated(response.id, validation.value);
      onSuccess('참석 여부 응답을 수정했습니다.');
      onClose();
    } catch {
      setSaving(false);
      onError('응답 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <AdminDialog titleId="attendance-edit-title" onClose={requestClose}>
      <form onSubmit={save} noValidate>
        <div className="admin-dialog__header">
          <div>
            <p>EDIT RESPONSE</p>
            <h2 id="attendance-edit-title">참석 여부 응답 수정</h2>
          </div>
          <button type="button" onClick={requestClose} disabled={saving} aria-label="수정 창 닫기">×</button>
        </div>

        <div className="admin-edit-fields attendance-edit-fields">
          <label htmlFor="attendance-edit-name">
            성명
            <input
              id="attendance-edit-name"
              data-autofocus
              value={draft.name}
              onChange={(event) => updateDraft('name', event.target.value)}
              maxLength={80}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'attendance-edit-name-error' : undefined}
              required
            />
            {errors.name ? <span className="admin-field-error" id="attendance-edit-name-error">{errors.name}</span> : null}
          </label>

          <label htmlFor="attendance-edit-phone">
            휴대전화 번호
            <input
              id="attendance-edit-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={draft.phone}
              onChange={(event) => updateDraft('phone', event.target.value)}
              placeholder="010-1234-5678"
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'attendance-edit-phone-error' : 'attendance-edit-phone-help'}
              required
            />
            <span className="admin-field-help" id="attendance-edit-phone-help">010으로 시작하는 11자리 번호를 입력해주세요.</span>
            {errors.phone ? <span className="admin-field-error" id="attendance-edit-phone-error">{errors.phone}</span> : null}
          </label>

          <label htmlFor="attendance-edit-admission-year">
            <span className="admin-field-label">입학년도(학번) <small className="admin-optional">선택</small></span>
            <input
              id="attendance-edit-admission-year"
              inputMode="numeric"
              value={draft.admissionYear}
              onChange={(event) => updateDraft('admissionYear', event.target.value)}
              maxLength={2}
              placeholder="예: 98"
              aria-invalid={Boolean(errors.admissionYear)}
              aria-describedby={errors.admissionYear ? 'attendance-edit-admission-error' : undefined}
            />
            {errors.admissionYear ? <span className="admin-field-error" id="attendance-edit-admission-error">{errors.admissionYear}</span> : null}
          </label>

          <label htmlFor="attendance-edit-affiliation">
            <span className="admin-field-label">현재 소속 및 직함 <small className="admin-optional">선택</small></span>
            <textarea
              id="attendance-edit-affiliation"
              value={draft.affiliation}
              onChange={(event) => updateDraft('affiliation', event.target.value)}
              maxLength={200}
              rows={3}
              aria-invalid={Boolean(errors.affiliation)}
              aria-describedby={errors.affiliation ? 'attendance-edit-affiliation-error' : undefined}
            />
            {errors.affiliation ? <span className="admin-field-error" id="attendance-edit-affiliation-error">{errors.affiliation}</span> : null}
          </label>

          <label htmlFor="attendance-edit-status">
            참석 여부
            <select
              id="attendance-edit-status"
              value={draft.attendanceStatus}
              onChange={(event) => updateDraft('attendanceStatus', event.target.value)}
              aria-invalid={Boolean(errors.attendanceStatus)}
              aria-describedby={errors.attendanceStatus ? 'attendance-edit-status-error' : undefined}
              required
            >
              <option value="attending">참석합니다</option>
              <option value="not_attending">참석하지 못합니다</option>
            </select>
            {errors.attendanceStatus ? <span className="admin-field-error" id="attendance-edit-status-error">{errors.attendanceStatus}</span> : null}
          </label>
        </div>

        <div className="admin-dialog__actions admin-dialog__actions--end">
          <button className="admin-button admin-button--secondary" type="button" onClick={requestClose} disabled={saving}>취소</button>
          <button className="admin-button" type="submit" disabled={saving}>{saving ? '저장 중...' : '변경사항 저장'}</button>
        </div>
      </form>
    </AdminDialog>
  );
}

interface AttendanceDeleteDialogProps extends AttendanceMutationDialogProps {
  onDeleted: (id: string) => void;
}

export function AttendanceDeleteDialog({
  response,
  onClose,
  onDeleted,
  onError,
  onSuccess,
}: AttendanceDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const requestClose = () => {
    if (!deleting) onClose();
  };

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    onError('');
    try {
      await deleteAttendanceResponse(response.id);
      onDeleted(response.id);
      onSuccess('참석 여부 응답을 삭제했습니다.');
      onClose();
    } catch {
      setDeleting(false);
      onError('응답 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <AdminDialog
      titleId="attendance-delete-title"
      descriptionId="attendance-delete-description"
      onClose={requestClose}
    >
      <div className="admin-dialog__header">
        <div>
          <p>DELETE RESPONSE</p>
          <h2 id="attendance-delete-title">참석 여부 응답 삭제</h2>
        </div>
        <button type="button" onClick={requestClose} disabled={deleting} aria-label="삭제 확인 창 닫기">×</button>
      </div>
      <div className="attendance-delete-copy" id="attendance-delete-description">
        <p><strong>{response.name}</strong>님의 <strong>{attendanceResponseLabels[response.attendance_status]}</strong> 응답을 삭제하시겠습니까?</p>
        <p>이 작업은 되돌릴 수 없습니다.</p>
      </div>
      <div className="admin-dialog__actions admin-dialog__actions--end">
        <button className="admin-button admin-button--secondary" type="button" onClick={requestClose} disabled={deleting} data-autofocus>취소</button>
        <button className="admin-button admin-button--danger" type="button" onClick={remove} disabled={deleting}>{deleting ? '삭제 중...' : '삭제'}</button>
      </div>
    </AdminDialog>
  );
}

export function AttendanceResponsesPanel({
  responses,
  onUpdated,
  onDeleted,
  onError,
  onSuccess,
}: AttendanceResponsesPanelProps) {
  const [filters, setFilters] = useState<AttendanceAdminFilters>({ query: '', status: 'all' });
  const [editing, setEditing] = useState<AttendanceResponse | null>(null);
  const [deleting, setDeleting] = useState<AttendanceResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const filtered = useMemo(() => filterAttendanceResponses(responses, filters), [responses, filters]);
  const stats = useMemo(() => calculateAttendanceAdminStats(responses), [responses]);
  const phoneCounts = useMemo(() => countAttendanceResponsesByPhone(responses), [responses]);

  async function exportExcel() {
    setExporting(true);
    try {
      await downloadAttendanceExcel(responses);
    } catch {
      onError('참석 여부 Excel 파일을 생성하지 못했습니다.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="attendance-responses-title">
      <div className="admin-panel__heading">
        <div>
          <p>ATTENDANCE RESPONSES</p>
          <h2 id="attendance-responses-title">참석 여부</h2>
        </div>
        <button className="admin-button admin-button--secondary" type="button" onClick={exportExcel} disabled={exporting || !responses.length}>
          {exporting ? '생성 중' : 'Excel 다운로드'}
        </button>
      </div>

      <section className="admin-stats attendance-admin-stats" aria-label="참석 여부 통계">
        <article><span>전체 회신</span><strong>{stats.total}<small>건</small></strong></article>
        <article><span>참석</span><strong>{stats.attending}<small>명</small></strong></article>
        <article><span>불참</span><strong>{stats.notAttending}<small>명</small></strong></article>
        <article><span>참석률</span><strong>{stats.attendanceRate.toFixed(1)}<small>%</small></strong></article>
      </section>

      <div className="admin-filters attendance-admin-filters">
        <label className="admin-search">
          <span>이름, 전화번호, 학번 또는 소속 검색</span>
          <input
            value={filters.query}
            onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
            placeholder="검색어 입력"
          />
        </label>
        <label>
          <span>참석 여부</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({
              ...current,
              status: event.target.value as AttendanceAdminFilters['status'],
            }))}
          >
            <option value="all">전체</option>
            <option value="attending">참석</option>
            <option value="not_attending">불참</option>
          </select>
        </label>
      </div>

      <p className="admin-result-count">총 {filtered.length}건</p>
      <div className="admin-table-wrap">
        <table className="admin-table attendance-admin-table">
          <thead>
            <tr>
              <th>회신일시</th><th>성명</th><th>전화번호</th><th>입학년도</th><th>현재 소속 및 직함</th><th>참석 여부</th><th className="attendance-actions-cell">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((response) => {
              const duplicateCount = phoneCounts.get(response.phone) ?? 1;
              return (
                <tr key={response.id}>
                  <td>{formatAdminDate(response.created_at)}</td>
                  <td><strong>{response.name}</strong></td>
                  <td>
                    {response.phone}
                    {duplicateCount > 1 ? <span className="admin-duplicate">동일 번호 {duplicateCount}회</span> : null}
                  </td>
                  <td>{response.admission_year || '−'}</td>
                  <td>{response.affiliation || '−'}</td>
                  <td>
                    <span className={`attendance-status attendance-status--${response.attendance_status}`}>
                      {attendanceResponseLabels[response.attendance_status]}
                    </span>
                  </td>
                  <td className="attendance-actions-cell">
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => setEditing(response)} aria-label={`${response.name}님의 참석 여부 응답 수정`}>수정</button>
                      <button className="admin-row-action--danger" type="button" onClick={() => setDeleting(response)} aria-label={`${response.name}님의 참석 여부 응답 삭제`}>삭제</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length ? <tr><td className="admin-empty" colSpan={7}>조건에 맞는 참석 여부 회신이 없습니다.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <AttendanceEditDialog
          response={editing}
          onClose={() => setEditing(null)}
          onUpdated={onUpdated}
          onError={onError}
          onSuccess={onSuccess}
        />
      ) : null}

      {deleting ? (
        <AttendanceDeleteDialog
          response={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={onDeleted}
          onError={onError}
          onSuccess={onSuccess}
        />
      ) : null}
    </section>
  );
}
