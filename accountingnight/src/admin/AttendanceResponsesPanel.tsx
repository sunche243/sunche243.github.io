import { useMemo, useState } from 'react';
import type { AttendanceResponse } from '../types/attendance';
import { attendanceResponseLabels } from '../utils/attendance';
import {
  calculateAttendanceAdminStats,
  countAttendanceResponsesByPhone,
  filterAttendanceResponses,
  type AttendanceAdminFilters,
} from './attendanceAdminUtils';
import { formatAdminDate } from './adminUtils';
import { downloadAttendanceExcel } from './excel';

interface AttendanceResponsesPanelProps {
  responses: AttendanceResponse[];
  onError: (message: string) => void;
}

export function AttendanceResponsesPanel({ responses, onError }: AttendanceResponsesPanelProps) {
  const [filters, setFilters] = useState<AttendanceAdminFilters>({ query: '', status: 'all' });
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
              <th>회신일시</th><th>성명</th><th>전화번호</th><th>입학년도</th><th>현재 소속 및 직함</th><th>참석 여부</th>
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
                </tr>
              );
            })}
            {!filtered.length ? <tr><td className="admin-empty" colSpan={6}>조건에 맞는 참석 여부 회신이 없습니다.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
