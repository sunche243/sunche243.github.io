import { useMemo, useState, type FormEvent } from 'react';
import type {
  StudentAttendanceResponse,
  StudentAttendanceResponseEditableFields,
} from '../types/studentAttendance';
import { attendanceResponseLabels } from '../utils/attendance';
import { AdminDialog } from './AdminDialog';
import {
  deleteStudentAttendanceResponse,
  updateStudentAttendanceResponse,
} from './adminService';
import { formatAdminDate } from './adminUtils';
import { downloadStudentAttendanceExcel } from './excel';
import {
  calculateStudentAttendanceAdminStats,
  countStudentAttendanceResponsesByPhone,
  filterStudentAttendanceResponses,
  validateStudentAttendanceAdminEdit,
  type StudentAttendanceAdminEditDraft,
  type StudentAttendanceAdminEditErrors,
  type StudentAttendanceAdminFilters,
} from './studentAttendanceAdminUtils';

interface StudentAttendanceResponsesPanelProps {
  responses: StudentAttendanceResponse[];
  onUpdated: (id: string, value: StudentAttendanceResponseEditableFields) => void;
  onDeleted: (id: string) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

interface StudentAttendanceMutationDialogProps {
  response: StudentAttendanceResponse;
  onClose: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

interface StudentAttendanceEditDialogProps extends StudentAttendanceMutationDialogProps {
  onUpdated: (id: string, value: StudentAttendanceResponseEditableFields) => void;
}

export function StudentAttendanceEditDialog({
  response,
  onClose,
  onUpdated,
  onError,
  onSuccess,
}: StudentAttendanceEditDialogProps) {
  const [draft, setDraft] = useState<StudentAttendanceAdminEditDraft>({
    name: response.name,
    phone: response.phone,
    admissionYear: response.admission_year ?? '',
    studentCouncilExperience: response.student_council_experience,
    studentCouncilDetails: response.student_council_details ?? '',
    attendanceStatus: response.attendance_status,
  });
  const [errors, setErrors] = useState<StudentAttendanceAdminEditErrors>({});
  const [saving, setSaving] = useState(false);
  const requestClose = () => {
    if (!saving) onClose();
  };

  function updateDraft<K extends keyof StudentAttendanceAdminEditDraft>(
    key: K,
    value: StudentAttendanceAdminEditDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function updateStudentCouncilExperience(value: boolean) {
    setDraft((current) => ({
      ...current,
      studentCouncilExperience: value,
      studentCouncilDetails: value ? current.studentCouncilDetails : '',
    }));
    setErrors((current) => ({ ...current, studentCouncilDetails: undefined }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    const validation = validateStudentAttendanceAdminEdit(draft);
    setErrors(validation.errors);
    if (!validation.valid || !validation.value) return;

    setSaving(true);
    onError('');
    try {
      await updateStudentAttendanceResponse(response.id, validation.value);
      onUpdated(response.id, validation.value);
      onSuccess('학생 참석 응답을 수정했습니다.');
      onClose();
    } catch {
      setSaving(false);
      onError('학생 참석 응답 수정에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <AdminDialog titleId="student-attendance-edit-title" onClose={requestClose}>
      <form onSubmit={save} noValidate>
        <div className="admin-dialog__header">
          <div><p>EDIT STUDENT RESPONSE</p><h2 id="student-attendance-edit-title">학생 참석 응답 수정</h2></div>
          <button type="button" onClick={requestClose} disabled={saving} aria-label="학생 참석 응답 수정 창 닫기">×</button>
        </div>

        <div className="admin-edit-fields attendance-edit-fields">
          <label htmlFor="student-attendance-edit-name">
            성명
            <input
              id="student-attendance-edit-name"
              data-autofocus
              value={draft.name}
              onChange={(event) => updateDraft('name', event.target.value)}
              maxLength={80}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'student-attendance-edit-name-error' : undefined}
              required
            />
            {errors.name ? <span className="admin-field-error" id="student-attendance-edit-name-error">{errors.name}</span> : null}
          </label>

          <label htmlFor="student-attendance-edit-phone">
            휴대전화 번호
            <input
              id="student-attendance-edit-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              value={draft.phone}
              onChange={(event) => updateDraft('phone', event.target.value)}
              placeholder="010-1234-5678"
              aria-invalid={Boolean(errors.phone)}
              required
            />
            {errors.phone ? <span className="admin-field-error">{errors.phone}</span> : null}
          </label>

          <label htmlFor="student-attendance-edit-admission-year">
            <span className="admin-field-label">입학년도(학번) <small className="admin-optional">선택</small></span>
            <input
              id="student-attendance-edit-admission-year"
              inputMode="numeric"
              value={draft.admissionYear}
              onChange={(event) => updateDraft('admissionYear', event.target.value)}
              maxLength={2}
              placeholder="예: 24"
              aria-invalid={Boolean(errors.admissionYear)}
            />
            {errors.admissionYear ? <span className="admin-field-error">{errors.admissionYear}</span> : null}
          </label>

          <label htmlFor="student-attendance-edit-council">
            학생회 활동 여부
            <select
              id="student-attendance-edit-council"
              value={draft.studentCouncilExperience ? 'yes' : 'no'}
              onChange={(event) => updateStudentCouncilExperience(event.target.value === 'yes')}
            >
              <option value="yes">활동 경험 있음</option>
              <option value="no">활동 경험 없음</option>
            </select>
          </label>

          {draft.studentCouncilExperience ? (
            <label htmlFor="student-attendance-edit-council-details">
              활동 연도 및 직책
              <textarea
                id="student-attendance-edit-council-details"
                value={draft.studentCouncilDetails}
                onChange={(event) => updateDraft('studentCouncilDetails', event.target.value)}
                maxLength={500}
                rows={4}
                aria-invalid={Boolean(errors.studentCouncilDetails)}
                required
              />
              {errors.studentCouncilDetails ? <span className="admin-field-error">{errors.studentCouncilDetails}</span> : null}
            </label>
          ) : null}

          <label htmlFor="student-attendance-edit-status">
            참석 여부
            <select
              id="student-attendance-edit-status"
              value={draft.attendanceStatus}
              onChange={(event) => updateDraft('attendanceStatus', event.target.value)}
              aria-invalid={Boolean(errors.attendanceStatus)}
              required
            >
              <option value="attending">참석합니다</option>
              <option value="not_attending">참석하지 못합니다</option>
            </select>
            {errors.attendanceStatus ? <span className="admin-field-error">{errors.attendanceStatus}</span> : null}
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

interface StudentAttendanceDeleteDialogProps extends StudentAttendanceMutationDialogProps {
  onDeleted: (id: string) => void;
}

export function StudentAttendanceDeleteDialog({
  response,
  onClose,
  onDeleted,
  onError,
  onSuccess,
}: StudentAttendanceDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  const requestClose = () => {
    if (!deleting) onClose();
  };

  async function remove() {
    if (deleting) return;
    setDeleting(true);
    onError('');
    try {
      await deleteStudentAttendanceResponse(response.id);
      onDeleted(response.id);
      onSuccess('학생 참석 응답을 삭제했습니다.');
      onClose();
    } catch {
      setDeleting(false);
      onError('학생 참석 응답 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }

  return (
    <AdminDialog
      titleId="student-attendance-delete-title"
      descriptionId="student-attendance-delete-description"
      onClose={requestClose}
    >
      <div className="admin-dialog__header">
        <div><p>DELETE STUDENT RESPONSE</p><h2 id="student-attendance-delete-title">학생 참석 응답 삭제</h2></div>
        <button type="button" onClick={requestClose} disabled={deleting} aria-label="학생 참석 응답 삭제 확인 창 닫기">×</button>
      </div>
      <div className="attendance-delete-copy" id="student-attendance-delete-description">
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

export function StudentAttendanceResponsesPanel({
  responses,
  onUpdated,
  onDeleted,
  onError,
  onSuccess,
}: StudentAttendanceResponsesPanelProps) {
  const [filters, setFilters] = useState<StudentAttendanceAdminFilters>({
    query: '',
    status: 'all',
    studentCouncil: 'all',
  });
  const [editing, setEditing] = useState<StudentAttendanceResponse | null>(null);
  const [deleting, setDeleting] = useState<StudentAttendanceResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const filtered = useMemo(() => filterStudentAttendanceResponses(responses, filters), [responses, filters]);
  const stats = useMemo(() => calculateStudentAttendanceAdminStats(responses), [responses]);
  const phoneCounts = useMemo(() => countStudentAttendanceResponsesByPhone(responses), [responses]);

  async function exportExcel() {
    setExporting(true);
    try {
      await downloadStudentAttendanceExcel(responses);
    } catch {
      onError('학생 참석 Excel 파일을 생성하지 못했습니다.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="student-attendance-responses-title">
      <div className="admin-panel__heading">
        <div><p>STUDENT ATTENDANCE RESPONSES</p><h2 id="student-attendance-responses-title">학생 참석</h2></div>
        <button className="admin-button admin-button--secondary" type="button" onClick={exportExcel} disabled={exporting || !responses.length}>
          {exporting ? '생성 중' : 'Excel 다운로드'}
        </button>
      </div>

      <section className="admin-stats attendance-admin-stats" aria-label="학생 참석 통계">
        <article><span>전체 회신</span><strong>{stats.total}<small>건</small></strong></article>
        <article><span>참석</span><strong>{stats.attending}<small>명</small></strong></article>
        <article><span>불참</span><strong>{stats.notAttending}<small>명</small></strong></article>
        <article><span>학생회 경험</span><strong>{stats.studentCouncilExperienced}<small>명</small></strong></article>
      </section>

      <div className="admin-filters student-attendance-admin-filters">
        <label className="admin-search">
          <span>이름, 전화번호, 학번 또는 학생회 활동 내용 검색</span>
          <input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="검색어 입력" />
        </label>
        <label>
          <span>참석 여부</span>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as StudentAttendanceAdminFilters['status'] }))}>
            <option value="all">전체</option><option value="attending">참석</option><option value="not_attending">불참</option>
          </select>
        </label>
        <label>
          <span>학생회 활동</span>
          <select value={filters.studentCouncil} onChange={(event) => setFilters((current) => ({ ...current, studentCouncil: event.target.value as StudentAttendanceAdminFilters['studentCouncil'] }))}>
            <option value="all">전체</option><option value="yes">경험 있음</option><option value="no">경험 없음</option>
          </select>
        </label>
      </div>

      <p className="admin-result-count">총 {filtered.length}건</p>
      <div className="admin-table-wrap">
        <table className="admin-table attendance-admin-table student-attendance-admin-table">
          <thead>
            <tr>
              <th>회신일시</th><th>성명</th><th>전화번호</th><th>입학년도</th><th>학생회 활동</th><th>활동 연도 및 직책</th><th>참석 여부</th><th className="attendance-actions-cell">관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((response) => {
              const duplicateCount = phoneCounts.get(response.phone) ?? 1;
              return (
                <tr key={response.id}>
                  <td>{formatAdminDate(response.created_at)}</td>
                  <td><strong>{response.name}</strong></td>
                  <td>{response.phone}{duplicateCount > 1 ? <span className="admin-duplicate">동일 번호 {duplicateCount}회</span> : null}</td>
                  <td>{response.admission_year || '−'}</td>
                  <td>{response.student_council_experience ? '경험 있음' : '경험 없음'}</td>
                  <td>{response.student_council_details || '−'}</td>
                  <td><span className={`attendance-status attendance-status--${response.attendance_status}`}>{attendanceResponseLabels[response.attendance_status]}</span></td>
                  <td className="attendance-actions-cell">
                    <div className="admin-row-actions">
                      <button type="button" onClick={() => setEditing(response)} aria-label={`${response.name}님의 학생 참석 응답 수정`}>수정</button>
                      <button className="admin-row-action--danger" type="button" onClick={() => setDeleting(response)} aria-label={`${response.name}님의 학생 참석 응답 삭제`}>삭제</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!filtered.length ? <tr><td className="admin-empty" colSpan={8}>조건에 맞는 학생 참석 회신이 없습니다.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {editing ? (
        <StudentAttendanceEditDialog response={editing} onClose={() => setEditing(null)} onUpdated={onUpdated} onError={onError} onSuccess={onSuccess} />
      ) : null}
      {deleting ? (
        <StudentAttendanceDeleteDialog response={deleting} onClose={() => setDeleting(null)} onDeleted={onDeleted} onError={onError} onSuccess={onSuccess} />
      ) : null}
    </section>
  );
}
