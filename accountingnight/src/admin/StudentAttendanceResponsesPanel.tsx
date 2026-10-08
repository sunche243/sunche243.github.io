import { useMemo, useState, type FormEvent } from 'react';
import type {
  StudentAttendanceResponse,
  StudentAttendanceResponseEditableFields,
  StudentCouncilFeeStatus,
  StudentParticipationFeeStatus,
  StudentSelectionManagementFields,
  StudentSelectionStatus,
} from '../types/studentAttendance';
import { attendanceResponseLabels } from '../utils/attendance';
import { AdminDialog } from './AdminDialog';
import {
  deleteStudentAttendanceResponse,
  updateStudentAttendanceResponse,
  updateStudentSelectionManagement,
} from './adminService';
import { formatAdminDate } from './adminUtils';
import { downloadStudentAttendanceExcel } from './excel';
import {
  calculateStudentAttendanceAdminStats,
  filterStudentAttendanceResponses,
  getStudentSelectionPriority,
  studentCouncilFeeStatusLabels,
  studentParticipationFeeStatusLabels,
  studentSelectionStatusLabels,
  validateStudentAttendanceAdminEdit,
  validateStudentSelectionManagement,
  type StudentAttendanceAdminEditDraft,
  type StudentAttendanceAdminEditErrors,
  type StudentAttendanceAdminFilters,
  type StudentSelectionManagementDraft,
} from './studentAttendanceAdminUtils';

interface StudentAttendanceResponsesPanelProps {
  responses: StudentAttendanceResponse[];
  onUpdated: (id: string, value: StudentAttendanceResponseEditableFields) => void;
  onManagementUpdated: (id: string, value: StudentSelectionManagementFields) => void;
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
    studentCouncilFeeStatus: response.student_council_fee_status,
    attendanceStatus: response.attendance_status,
  });
  const [errors, setErrors] = useState<StudentAttendanceAdminEditErrors>({});
  const [saving, setSaving] = useState(false);
  const attending = draft.attendanceStatus === 'attending';
  const requestClose = () => { if (!saving) onClose(); };

  function updateDraft<K extends keyof StudentAttendanceAdminEditDraft>(
    key: K,
    value: StudentAttendanceAdminEditDraft[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function updateStudentCouncilExperience(value: boolean | null) {
    setDraft((current) => ({
      ...current,
      studentCouncilExperience: value,
      studentCouncilDetails: value ? current.studentCouncilDetails : '',
    }));
    setErrors((current) => ({ ...current, studentCouncilExperience: undefined, studentCouncilDetails: undefined }));
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
      onError('학생 참석 응답 수정에 실패했습니다. 전화번호 중복 여부와 입력값을 확인해 주세요.');
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
          <label htmlFor="student-attendance-edit-status">참석 신청 여부
            <select id="student-attendance-edit-status" value={draft.attendanceStatus} onChange={(event) => updateDraft('attendanceStatus', event.target.value)} required>
              {response.attendance_status === 'attending' ? <option value="attending">참석 신청</option> : null}
              <option value="not_attending">불참</option>
            </select>
            {response.attendance_status === 'not_attending' ? <span className="admin-field-help">참석 신청으로 변경하려면 학생이 선정 기준에 동의하여 직접 다시 제출해야 합니다.</span> : null}
          </label>
          <label htmlFor="student-attendance-edit-name">성명
            <input id="student-attendance-edit-name" data-autofocus value={draft.name} onChange={(event) => updateDraft('name', event.target.value)} maxLength={80} aria-invalid={Boolean(errors.name)} required />
            {errors.name ? <span className="admin-field-error">{errors.name}</span> : null}
          </label>
          <label htmlFor="student-attendance-edit-phone">휴대전화 번호
            <input id="student-attendance-edit-phone" type="tel" value={draft.phone} onChange={(event) => updateDraft('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} required />
            {errors.phone ? <span className="admin-field-error">{errors.phone}</span> : null}
          </label>
          {attending ? <>
            <label htmlFor="student-attendance-edit-admission-year">입학년도(학번)
              <input id="student-attendance-edit-admission-year" inputMode="numeric" value={draft.admissionYear} onChange={(event) => updateDraft('admissionYear', event.target.value)} maxLength={2} aria-invalid={Boolean(errors.admissionYear)} required />
              {errors.admissionYear ? <span className="admin-field-error">{errors.admissionYear}</span> : null}
            </label>
            <label htmlFor="student-attendance-edit-council">학생회 활동 여부
              <select id="student-attendance-edit-council" value={draft.studentCouncilExperience === null ? '' : draft.studentCouncilExperience ? 'yes' : 'no'} onChange={(event) => updateStudentCouncilExperience(event.target.value === '' ? null : event.target.value === 'yes')}>
                <option value="">선택</option><option value="yes">활동 경험 있음</option><option value="no">활동 경험 없음</option>
              </select>
              {errors.studentCouncilExperience ? <span className="admin-field-error">{errors.studentCouncilExperience}</span> : null}
            </label>
            {draft.studentCouncilExperience ? <label htmlFor="student-attendance-edit-council-details">활동 연도 및 직책
              <textarea id="student-attendance-edit-council-details" value={draft.studentCouncilDetails} onChange={(event) => updateDraft('studentCouncilDetails', event.target.value)} maxLength={500} rows={4} aria-invalid={Boolean(errors.studentCouncilDetails)} required />
              {errors.studentCouncilDetails ? <span className="admin-field-error">{errors.studentCouncilDetails}</span> : null}
            </label> : null}
            <label htmlFor="student-attendance-edit-council-fee">학생회비 납부 상태
              <select id="student-attendance-edit-council-fee" value={draft.studentCouncilFeeStatus} onChange={(event) => updateDraft('studentCouncilFeeStatus', event.target.value as StudentCouncilFeeStatus)}>
                <option value="unverified">확인 필요</option><option value="paid">납부</option><option value="unpaid">미납부</option>
              </select>
              {errors.studentCouncilFeeStatus ? <span className="admin-field-error">{errors.studentCouncilFeeStatus}</span> : null}
            </label>
          </> : null}
        </div>

        <div className="admin-dialog__actions admin-dialog__actions--end">
          <button className="admin-button admin-button--secondary" type="button" onClick={requestClose} disabled={saving}>취소</button>
          <button className="admin-button" type="submit" disabled={saving}>{saving ? '저장 중...' : '변경사항 저장'}</button>
        </div>
      </form>
    </AdminDialog>
  );
}

interface StudentSelectionManagementDialogProps extends StudentAttendanceMutationDialogProps {
  onUpdated: (id: string, value: StudentSelectionManagementFields) => void;
}

export function StudentSelectionManagementDialog({ response, onClose, onUpdated, onError, onSuccess }: StudentSelectionManagementDialogProps) {
  const [draft, setDraft] = useState<StudentSelectionManagementDraft>({
    studentCouncilFeeStatus: response.student_council_fee_status,
    selectionStatus: response.selection_status,
    waitlistOrder: response.waitlist_order?.toString() ?? '',
    participationFeeStatus: response.participation_fee_status,
    contacted: Boolean(response.contacted_at),
    adminMemo: response.admin_memo,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const requestClose = () => { if (!saving) onClose(); };

  function updateDraft<K extends keyof StudentSelectionManagementDraft>(key: K, value: StudentSelectionManagementDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: '' }));
  }

  function updateSelectionStatus(value: StudentSelectionStatus) {
    setDraft((current) => ({
      ...current,
      selectionStatus: value,
      waitlistOrder: value === 'waitlisted' ? current.waitlistOrder : '',
      participationFeeStatus: value === 'selected'
        ? (['paid', 'unpaid'].includes(current.participationFeeStatus) ? current.participationFeeStatus : 'unpaid')
        : value === 'cancelled'
          ? (['refund_pending', 'refunded'].includes(current.participationFeeStatus) ? current.participationFeeStatus : 'not_applicable')
          : 'not_applicable',
    }));
    setErrors({});
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const validation = validateStudentSelectionManagement(response, draft);
    setErrors(validation.errors);
    if (!validation.valid || !validation.value) return;
    setSaving(true);
    onError('');
    try {
      await updateStudentSelectionManagement(response.id, validation.value);
      onUpdated(response.id, validation.value);
      onSuccess('학생 선정 관리 정보를 저장했습니다.');
      onClose();
    } catch {
      setSaving(false);
      onError('학생 선정 관리 정보 저장에 실패했습니다. 입력값을 확인해 주세요.');
    }
  }

  const nonAttending = response.attendance_status === 'not_attending';
  return (
    <AdminDialog titleId="student-selection-management-title" onClose={requestClose}>
      <form onSubmit={save} noValidate>
        <div className="admin-dialog__header">
          <div><p>SELECTION MANAGEMENT</p><h2 id="student-selection-management-title">학생 선정 관리</h2></div>
          <button type="button" onClick={requestClose} disabled={saving} aria-label="학생 선정 관리 창 닫기">×</button>
        </div>
        <p className="admin-panel__description"><strong>{response.name}</strong> · {response.phone}</p>
        <div className="admin-edit-fields attendance-edit-fields">
          <label htmlFor="student-management-council-fee">학생회비 납부 상태
            <select id="student-management-council-fee" value={draft.studentCouncilFeeStatus} onChange={(event) => updateDraft('studentCouncilFeeStatus', event.target.value as StudentCouncilFeeStatus)} disabled={nonAttending}>
              {nonAttending ? <option value="not_applicable">해당 없음</option> : <><option value="unverified">확인 필요</option><option value="paid">납부</option><option value="unpaid">미납부</option></>}
            </select>
            {errors.studentCouncilFeeStatus ? <span className="admin-field-error">{errors.studentCouncilFeeStatus}</span> : null}
          </label>
          <label htmlFor="student-management-selection">선정 상태
            <select id="student-management-selection" value={draft.selectionStatus} onChange={(event) => updateSelectionStatus(event.target.value as StudentSelectionStatus)}>
              {nonAttending ? <><option value="not_applicable">해당 없음</option><option value="cancelled">취소</option></> : <><option value="pending">선정 검토</option><option value="selected">선정</option><option value="waitlisted">대기</option><option value="not_selected">미선정</option><option value="cancelled">취소</option></>}
            </select>
            {errors.selectionStatus ? <span className="admin-field-error">{errors.selectionStatus}</span> : null}
          </label>
          {draft.selectionStatus === 'waitlisted' ? <label htmlFor="student-management-waitlist">대기 순번
            <input id="student-management-waitlist" type="number" min={1} step={1} value={draft.waitlistOrder} onChange={(event) => updateDraft('waitlistOrder', event.target.value)} />
            {errors.waitlistOrder ? <span className="admin-field-error">{errors.waitlistOrder}</span> : null}
          </label> : null}
          {(draft.selectionStatus === 'selected' || draft.selectionStatus === 'cancelled' || nonAttending) ? <label htmlFor="student-management-participation-fee">행사 참가비 30,000원
            <select id="student-management-participation-fee" value={draft.participationFeeStatus} onChange={(event) => updateDraft('participationFeeStatus', event.target.value as StudentParticipationFeeStatus)}>
              {draft.selectionStatus === 'selected' ? <><option value="unpaid">미납부</option><option value="paid">납부</option></> : <><option value="not_applicable">해당 없음</option><option value="refund_pending">환불 대기</option><option value="refunded">환불 완료</option></>}
            </select>
            {errors.participationFeeStatus ? <span className="admin-field-error">{errors.participationFeeStatus}</span> : null}
          </label> : null}
          <label className="admin-checkbox-row" htmlFor="student-management-contacted">
            <input id="student-management-contacted" type="checkbox" checked={draft.contacted} onChange={(event) => updateDraft('contacted', event.target.checked)} />
            개별 연락 완료
          </label>
          <label htmlFor="student-management-memo">관리 메모
            <textarea id="student-management-memo" rows={4} maxLength={2_000} value={draft.adminMemo} onChange={(event) => updateDraft('adminMemo', event.target.value)} />
            {errors.adminMemo ? <span className="admin-field-error">{errors.adminMemo}</span> : null}
          </label>
        </div>
        <div className="admin-dialog__actions admin-dialog__actions--end">
          <button className="admin-button admin-button--secondary" type="button" onClick={requestClose} disabled={saving}>취소</button>
          <button className="admin-button" type="submit" disabled={saving}>{saving ? '저장 중...' : '선정 정보 저장'}</button>
        </div>
      </form>
    </AdminDialog>
  );
}

interface StudentAttendanceDeleteDialogProps extends StudentAttendanceMutationDialogProps { onDeleted: (id: string) => void; }

export function StudentAttendanceDeleteDialog({ response, onClose, onDeleted, onError, onSuccess }: StudentAttendanceDeleteDialogProps) {
  const [deleting, setDeleting] = useState(false);
  async function remove() {
    if (deleting) return;
    setDeleting(true); onError('');
    try {
      await deleteStudentAttendanceResponse(response.id);
      onDeleted(response.id); onSuccess('학생 참석 응답을 삭제했습니다.'); onClose();
    } catch {
      setDeleting(false); onError('학생 참석 응답 삭제에 실패했습니다. 잠시 후 다시 시도해 주세요.');
    }
  }
  return (
    <AdminDialog titleId="student-attendance-delete-title" descriptionId="student-attendance-delete-description" onClose={() => { if (!deleting) onClose(); }}>
      <div className="admin-dialog__header"><div><p>DELETE STUDENT RESPONSE</p><h2 id="student-attendance-delete-title">학생 참석 응답 삭제</h2></div><button type="button" onClick={onClose} disabled={deleting} aria-label="학생 참석 응답 삭제 확인 창 닫기">×</button></div>
      <div className="attendance-delete-copy" id="student-attendance-delete-description"><p><strong>{response.name}</strong>님의 <strong>{attendanceResponseLabels[response.attendance_status]}</strong> 응답을 삭제하시겠습니까?</p><p>이 작업은 되돌릴 수 없습니다.</p></div>
      <div className="admin-dialog__actions admin-dialog__actions--end"><button className="admin-button admin-button--secondary" type="button" onClick={onClose} disabled={deleting} data-autofocus>취소</button><button className="admin-button admin-button--danger" type="button" onClick={remove} disabled={deleting}>{deleting ? '삭제 중...' : '삭제'}</button></div>
    </AdminDialog>
  );
}

export function StudentAttendanceResponsesPanel({ responses, onUpdated, onManagementUpdated, onDeleted, onError, onSuccess }: StudentAttendanceResponsesPanelProps) {
  const [filters, setFilters] = useState<StudentAttendanceAdminFilters>({ query: '', status: 'all', priority: 'all', selectionStatus: 'all', participationFeeStatus: 'all' });
  const [editing, setEditing] = useState<StudentAttendanceResponse | null>(null);
  const [managing, setManaging] = useState<StudentAttendanceResponse | null>(null);
  const [deleting, setDeleting] = useState<StudentAttendanceResponse | null>(null);
  const [exporting, setExporting] = useState(false);
  const filtered = useMemo(() => filterStudentAttendanceResponses(responses, filters), [responses, filters]);
  const stats = useMemo(() => calculateStudentAttendanceAdminStats(responses), [responses]);

  async function exportExcel() {
    setExporting(true);
    try { await downloadStudentAttendanceExcel(responses); }
    catch { onError('학생 참석 Excel 파일을 생성하지 못했습니다.'); }
    finally { setExporting(false); }
  }

  return (
    <section className="admin-panel" aria-labelledby="student-attendance-responses-title">
      <div className="admin-panel__heading"><div><p>STUDENT ATTENDANCE RESPONSES</p><h2 id="student-attendance-responses-title">학생 참석 신청</h2></div><button className="admin-button admin-button--secondary" type="button" onClick={exportExcel} disabled={exporting || !responses.length}>{exporting ? '생성 중' : 'Excel 다운로드'}</button></div>
      <section className="admin-stats attendance-admin-stats" aria-label="학생 참석 통계">
        <article><span>전체 회신</span><strong>{stats.total}<small>건</small></strong></article>
        <article><span>참석 신청</span><strong>{stats.attending}<small>명</small></strong></article>
        <article><span>선정</span><strong>{stats.selected}<small>명</small></strong></article>
        <article><span>대기</span><strong>{stats.waitlisted}<small>명</small></strong></article>
        <article><span>참가비 납부</span><strong>{stats.participationFeePaid}<small>명</small></strong></article>
      </section>
      <div className="admin-filters student-attendance-admin-filters">
        <label className="admin-search"><span>이름, 전화번호, 학번, 활동 내용 또는 메모 검색</span><input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} /></label>
        <label><span>참석 여부</span><select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as StudentAttendanceAdminFilters['status'] }))}><option value="all">전체</option><option value="attending">참석 신청</option><option value="not_attending">불참</option></select></label>
        <label><span>우선순위</span><select value={filters.priority} onChange={(event) => setFilters((current) => ({ ...current, priority: event.target.value as StudentAttendanceAdminFilters['priority'] }))}><option value="all">전체</option><option value="1">1순위</option><option value="2">2순위</option><option value="3">3순위</option><option value="unverified">확인 필요</option></select></label>
        <label><span>선정 상태</span><select value={filters.selectionStatus} onChange={(event) => setFilters((current) => ({ ...current, selectionStatus: event.target.value as StudentAttendanceAdminFilters['selectionStatus'] }))}><option value="all">전체</option>{Object.entries(studentSelectionStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>참가비 상태</span><select value={filters.participationFeeStatus} onChange={(event) => setFilters((current) => ({ ...current, participationFeeStatus: event.target.value as StudentAttendanceAdminFilters['participationFeeStatus'] }))}><option value="all">전체</option>{Object.entries(studentParticipationFeeStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      </div>
      <p className="admin-result-count">총 {filtered.length}건</p>
      <div className="admin-table-wrap"><table className="admin-table attendance-admin-table student-attendance-admin-table">
        <thead><tr><th>최종 회신일시</th><th>성명</th><th>전화번호</th><th>학번</th><th>우선순위</th><th>학생회 활동</th><th>학생회비</th><th>선정</th><th>대기순번</th><th>참가비</th><th>연락</th><th>참석 응답</th><th className="attendance-actions-cell">관리</th></tr></thead>
        <tbody>{filtered.map((response) => {
          const priority = getStudentSelectionPriority(response);
          return <tr key={response.id}>
            <td>{formatAdminDate(response.updated_at ?? response.created_at)}</td><td><strong>{response.name}</strong></td><td>{response.phone}</td><td>{response.admission_year || '−'}</td>
            <td>{response.attendance_status === 'attending' ? priority ? `${priority}순위` : '확인 필요' : '−'}</td>
            <td>{response.student_council_experience === null ? '−' : response.student_council_experience ? `경험 있음${response.student_council_details ? ` · ${response.student_council_details}` : ''}` : '경험 없음'}</td>
            <td>{studentCouncilFeeStatusLabels[response.student_council_fee_status]}</td><td>{studentSelectionStatusLabels[response.selection_status]}</td><td>{response.waitlist_order ?? '−'}</td><td>{studentParticipationFeeStatusLabels[response.participation_fee_status]}</td><td>{response.contacted_at ? '완료' : '미완료'}</td>
            <td><span className={`attendance-status attendance-status--${response.attendance_status}`}>{attendanceResponseLabels[response.attendance_status]}</span></td>
            <td className="attendance-actions-cell"><div className="admin-row-actions"><button type="button" onClick={() => setEditing(response)} aria-label={`${response.name}님의 학생 참석 응답 수정`}>응답</button><button type="button" onClick={() => setManaging(response)} aria-label={`${response.name}님의 학생 선정 관리`}>선정</button><button className="admin-row-action--danger" type="button" onClick={() => setDeleting(response)} aria-label={`${response.name}님의 학생 참석 응답 삭제`}>삭제</button></div></td>
          </tr>;
        })}{!filtered.length ? <tr><td className="admin-empty" colSpan={13}>조건에 맞는 학생 참석 회신이 없습니다.</td></tr> : null}</tbody>
      </table></div>
      {editing ? <StudentAttendanceEditDialog response={editing} onClose={() => setEditing(null)} onUpdated={onUpdated} onError={onError} onSuccess={onSuccess} /> : null}
      {managing ? <StudentSelectionManagementDialog response={managing} onClose={() => setManaging(null)} onUpdated={onManagementUpdated} onError={onError} onSuccess={onSuccess} /> : null}
      {deleting ? <StudentAttendanceDeleteDialog response={deleting} onClose={() => setDeleting(null)} onDeleted={onDeleted} onError={onError} onSuccess={onSuccess} /> : null}
    </section>
  );
}
