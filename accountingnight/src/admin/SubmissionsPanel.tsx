import { useMemo, useState } from 'react';
import type { AttendanceStatus, FormField, Submission, SubmissionStatus } from '../types/registration';
import { attendanceLabels, calculateSponsorshipAmount, formatWon, submissionStatusLabels } from '../utils/registration';
import { deleteSubmission, updateSubmission } from './adminService';
import { filterSubmissions, formatAdminDate, type AdminFilters } from './adminUtils';
import { AdminDialog } from './AdminDialog';
import { downloadSubmissionsExcel } from './excel';

const statusOptions = Object.keys(submissionStatusLabels) as SubmissionStatus[];
const attendanceOptions = Object.keys(attendanceLabels) as AttendanceStatus[];

interface SubmissionsPanelProps {
  submissions: Submission[];
  fields: FormField[];
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}

function SubmissionDetail({
  submission,
  onClose,
  onRefresh,
  onError,
}: {
  submission: Submission;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const [status, setStatus] = useState(submission.status);
  const [memo, setMemo] = useState(submission.admin_memo);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      await updateSubmission(submission.id, status, memo);
      await onRefresh();
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : '저장하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!window.confirm('정말 삭제하시겠습니까? 삭제한 신청은 복구할 수 없습니다.')) return;
    setSaving(true);
    try {
      await deleteSubmission(submission.id);
      await onRefresh();
      onClose();
    } catch (error) {
      onError(error instanceof Error ? error.message : '삭제하지 못했습니다.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminDialog titleId="submission-detail-title" onClose={onClose} wide>
      <div className="admin-dialog__header">
        <div>
          <p>SUBMISSION DETAIL</p>
          <h2 id="submission-detail-title">{submission.name}</h2>
        </div>
        <button type="button" onClick={onClose} aria-label="상세 닫기">×</button>
      </div>
      <div className="submission-detail-grid">
        <dl>
          <div><dt>전화번호</dt><dd><a href={`tel:${submission.phone}`}>{submission.phone}</a></dd></div>
          <div><dt>후원 의향</dt><dd>{submission.wants_sponsorship ? '있음' : '없음'}</dd></div>
          <div><dt>후원 구좌</dt><dd>{submission.wants_sponsorship ? `${submission.sponsorship_units}구좌` : '−'}</dd></div>
          <div><dt>예상 후원금</dt><dd>{submission.wants_sponsorship ? formatWon(calculateSponsorshipAmount(submission.sponsorship_units)) : '−'}</dd></div>
          <div><dt>참석 여부</dt><dd>{submission.attendance_status ? attendanceLabels[submission.attendance_status] : '미입력'}</dd></div>
          <div><dt>접수일</dt><dd>{formatAdminDate(submission.created_at)}</dd></div>
        </dl>
        <div className="submission-custom-answers">
          <h3>추가 답변</h3>
          {Object.values(submission.answers).length ? (
            <dl>
              {Object.entries(submission.answers).map(([id, answer]) => (
                <div key={id}><dt>{answer.label}</dt><dd>{typeof answer.value === 'boolean' ? (answer.value ? '예' : '아니오') : answer.value}</dd></div>
              ))}
            </dl>
          ) : <p>추가 답변이 없습니다.</p>}
        </div>
      </div>
      <div className="admin-edit-fields">
        <label>
          관리 상태
          <select value={status} onChange={(event) => setStatus(event.target.value as SubmissionStatus)}>
            {statusOptions.map((value) => <option key={value} value={value}>{submissionStatusLabels[value]}</option>)}
          </select>
        </label>
        <label>
          관리 메모
          <textarea value={memo} onChange={(event) => setMemo(event.target.value)} rows={4} placeholder="연락 일정과 안내 내용을 기록하세요." />
        </label>
      </div>
      <div className="admin-dialog__actions">
        <button className="admin-text-danger" type="button" onClick={remove} disabled={saving}>신청 삭제</button>
        <div>
          <button className="admin-button admin-button--secondary" type="button" onClick={onClose}>취소</button>
          <button className="admin-button" type="button" onClick={save} disabled={saving}>{saving ? '저장 중' : '저장'}</button>
        </div>
      </div>
    </AdminDialog>
  );
}

export function SubmissionsPanel({ submissions, fields, onRefresh, onError }: SubmissionsPanelProps) {
  const [filters, setFilters] = useState<AdminFilters>({
    query: '',
    status: 'all',
    attendance: 'all',
    sponsorship: 'all',
  });
  const [selected, setSelected] = useState<Submission | null>(null);
  const [exporting, setExporting] = useState(false);
  const filtered = useMemo(() => filterSubmissions(submissions, filters), [submissions, filters]);

  async function exportExcel() {
    setExporting(true);
    try {
      await downloadSubmissionsExcel(submissions, fields);
    } catch {
      onError('Excel 파일을 생성하지 못했습니다.');
    } finally {
      setExporting(false);
    }
  }

  function openWithKeyboard(event: React.KeyboardEvent<HTMLTableRowElement>, submission: Submission) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setSelected(submission);
    }
  }

  return (
    <section className="admin-panel" aria-labelledby="submissions-title">
      <div className="admin-panel__heading">
        <div>
          <p>REGISTRATIONS</p>
          <h2 id="submissions-title">신청 내역</h2>
        </div>
        <button className="admin-button admin-button--secondary" type="button" onClick={exportExcel} disabled={exporting || !submissions.length}>
          {exporting ? '생성 중' : 'Excel 다운로드'}
        </button>
      </div>

      <div className="admin-filters">
        <label className="admin-search">
          <span>이름 또는 전화번호 검색</span>
          <input value={filters.query} onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))} placeholder="검색어 입력" />
        </label>
        <label>
          <span>상태</span>
          <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as AdminFilters['status'] }))}>
            <option value="all">전체</option>
            {statusOptions.map((status) => <option key={status} value={status}>{submissionStatusLabels[status]}</option>)}
          </select>
        </label>
        <label>
          <span>참석</span>
          <select value={filters.attendance} onChange={(event) => setFilters((current) => ({ ...current, attendance: event.target.value as AdminFilters['attendance'] }))}>
            <option value="all">전체</option>
            {attendanceOptions.map((status) => <option key={status} value={status}>{attendanceLabels[status]}</option>)}
            <option value="not_selected">미입력</option>
          </select>
        </label>
        <label>
          <span>후원</span>
          <select value={filters.sponsorship} onChange={(event) => setFilters((current) => ({ ...current, sponsorship: event.target.value as AdminFilters['sponsorship'] }))}>
            <option value="all">전체</option>
            <option value="yes">후원 의향 있음</option>
            <option value="no">후원 의향 없음</option>
          </select>
        </label>
      </div>

      <p className="admin-result-count">총 {filtered.length}건</p>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>등록일시</th><th>이름</th><th>전화번호</th><th>후원</th><th>구좌</th><th>예상 후원액</th><th>참석</th><th>상태</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((submission) => (
              <tr
                key={submission.id}
                tabIndex={0}
                onClick={() => setSelected(submission)}
                onKeyDown={(event) => openWithKeyboard(event, submission)}
                aria-label={`${submission.name} 신청 상세 보기`}
              >
                <td>{formatAdminDate(submission.created_at)}</td>
                <td><strong>{submission.name}</strong></td>
                <td>{submission.phone}</td>
                <td>{submission.wants_sponsorship ? '있음' : '없음'}</td>
                <td>{submission.wants_sponsorship ? submission.sponsorship_units : '−'}</td>
                <td>{submission.wants_sponsorship ? formatWon(calculateSponsorshipAmount(submission.sponsorship_units)) : '−'}</td>
                <td>{submission.attendance_status ? attendanceLabels[submission.attendance_status] : '미입력'}</td>
                <td><span className={`admin-status admin-status--${submission.status}`}>{submissionStatusLabels[submission.status]}</span></td>
              </tr>
            ))}
            {!filtered.length ? <tr><td className="admin-empty" colSpan={8}>조건에 맞는 신청 내역이 없습니다.</td></tr> : null}
          </tbody>
        </table>
      </div>

      {selected ? (
        <SubmissionDetail
          submission={selected}
          onClose={() => setSelected(null)}
          onRefresh={onRefresh}
          onError={onError}
        />
      ) : null}
    </section>
  );
}
