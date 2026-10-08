import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { Toast } from '../components/Toast';
import { isSupabaseConfigured } from '../services/supabase';
import type { AttendanceResponse, AttendanceResponseEditableFields } from '../types/attendance';
import type { FormField, Submission } from '../types/registration';
import type {
  StudentAttendanceResponse,
  StudentSelectionManagementFields,
} from '../types/studentAttendance';
import { formatWon } from '../utils/registration';
import {
  fetchAllFormFields,
  fetchAttendanceResponses,
  fetchStudentAttendanceResponses,
  fetchSubmissions,
  restoreAdminSession,
  signInAdmin,
  signOutAdmin,
} from './adminService';
import { calculateAdminStats } from './adminUtils';
import { AttendanceResponsesPanel } from './AttendanceResponsesPanel';
import { deleteAttendanceResponseFromList, updateAttendanceResponseInList } from './attendanceAdminUtils';
import { FormFieldsPanel } from './FormFieldsPanel';
import { StudentAttendanceResponsesPanel } from './StudentAttendanceResponsesPanel';
import { SubmissionsPanel } from './SubmissionsPanel';
import {
  deleteStudentAttendanceResponseFromList,
  updateStudentSelectionManagementInList,
} from './studentAttendanceAdminUtils';

type AdminPhase = 'checking' | 'login' | 'ready';
type AdminTab = 'submissions' | 'attendance' | 'student' | 'fields';

function ConfigurationNotice() {
  return (
    <main className="admin-centered">
      <div className="admin-auth-panel">
        <p className="admin-brand">ACCOUNTING 50 · ADMIN</p>
        <h1>Supabase 설정이 필요합니다.</h1>
        <p><code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 <code>.env.local</code>에 설정해주세요.</p>
        <a className="admin-button" href="../">초대장으로 돌아가기</a>
      </div>
    </main>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await signInAdmin(email.trim(), password);
      onSuccess();
    } catch {
      setError('이메일, 비밀번호 또는 관리자 권한을 확인해주세요.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="admin-centered">
      <form className="admin-auth-panel" onSubmit={submit}>
        <p className="admin-brand">ACCOUNTING 50 · ADMIN</p>
        <h1>회계인의 밤 50주년 운영</h1>
        <p>등록된 관리자 계정으로 로그인해주세요.</p>
        <label>이메일<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>비밀번호<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
        <button className="admin-button" type="submit" disabled={submitting}>{submitting ? '확인 중' : '로그인'}</button>
      </form>
    </main>
  );
}

export function AdminApp() {
  const configured = isSupabaseConfigured();
  const [phase, setPhase] = useState<AdminPhase>('checking');
  const [tab, setTab] = useState<AdminTab>('submissions');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [attendanceResponses, setAttendanceResponses] = useState<AttendanceResponse[]>([]);
  const [studentAttendanceResponses, setStudentAttendanceResponses] = useState<StudentAttendanceResponse[]>([]);
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const toastTimeoutRef = useRef<number | null>(null);
  const stats = useMemo(() => calculateAdminStats(submissions), [submissions]);

  const showToast = useCallback((message: string) => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
    setToastMessage(message);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage('');
      toastTimeoutRef.current = null;
    }, 3_000);
  }, []);

  useEffect(() => () => {
    if (toastTimeoutRef.current !== null) window.clearTimeout(toastTimeoutRef.current);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    const [sponsorshipResult, attendanceResult, studentAttendanceResult] = await Promise.allSettled([
      Promise.all([fetchSubmissions(), fetchAllFormFields()]),
      fetchAttendanceResponses(),
      fetchStudentAttendanceResponses(),
    ]);

    const errors: string[] = [];
    if (sponsorshipResult.status === 'fulfilled') {
      setSubmissions(sponsorshipResult.value[0]);
      setFields(sponsorshipResult.value[1]);
    } else {
      errors.push(sponsorshipResult.reason instanceof Error ? sponsorshipResult.reason.message : '신청 데이터를 불러오지 못했습니다.');
    }

    if (attendanceResult.status === 'fulfilled') {
      setAttendanceResponses(attendanceResult.value);
    } else {
      errors.push(attendanceResult.reason instanceof Error ? attendanceResult.reason.message : '참석 여부 회신을 불러오지 못했습니다.');
    }

    if (studentAttendanceResult.status === 'fulfilled') {
      setStudentAttendanceResponses(studentAttendanceResult.value);
    } else {
      errors.push(studentAttendanceResult.reason instanceof Error ? studentAttendanceResult.reason.message : '학생 참석 회신을 불러오지 못했습니다.');
    }

    setError(errors.join(' '));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!configured) return;
    let active = true;
    void restoreAdminSession().then((isAdmin) => {
      if (active) setPhase(isAdmin ? 'ready' : 'login');
    }).catch(() => {
      if (active) setPhase('login');
    });
    return () => {
      active = false;
    };
  }, [configured]);

  useEffect(() => {
    if (phase === 'ready') void refresh();
  }, [phase, refresh]);

  async function logout() {
    try {
      await signOutAdmin();
    } finally {
      setSubmissions([]);
      setAttendanceResponses([]);
      setStudentAttendanceResponses([]);
      setFields([]);
      setToastMessage('');
      setPhase('login');
    }
  }

  const handleAttendanceUpdated = useCallback((id: string, value: AttendanceResponseEditableFields) => {
    setAttendanceResponses((current) => updateAttendanceResponseInList(current, id, value));
  }, []);

  const handleAttendanceDeleted = useCallback((id: string) => {
    setAttendanceResponses((current) => deleteAttendanceResponseFromList(current, id));
  }, []);

  const handleStudentAttendanceUpdated = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleStudentAttendanceDeleted = useCallback((id: string) => {
    setStudentAttendanceResponses((current) => deleteStudentAttendanceResponseFromList(current, id));
  }, []);

  const handleStudentSelectionManagementUpdated = useCallback((
    id: string,
    value: StudentSelectionManagementFields,
  ) => {
    setStudentAttendanceResponses((current) => updateStudentSelectionManagementInList(current, id, value));
  }, []);

  if (!configured) return <ConfigurationNotice />;
  if (phase === 'checking') return <main className="admin-centered"><p className="admin-loading">관리자 권한을 확인하고 있습니다.</p></main>;
  if (phase === 'login') return <Login onSuccess={() => setPhase('ready')} />;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div><p>ACCOUNTING 50</p><strong>ADMIN</strong></div>
        <button type="button" onClick={logout}>로그아웃</button>
      </header>
      <main className="admin-main">
        <div className="admin-title-row">
          <div><p>DONGGUK UNIVERSITY</p><h1>회계인의 밤 운영</h1></div>
          <button className="admin-refresh" type="button" onClick={() => void refresh()} disabled={loading}>{loading ? '불러오는 중' : '새로고침'}</button>
        </div>

        {tab !== 'attendance' && tab !== 'student' ? (
          <section className="admin-stats" aria-label="기존 후원 및 약정 신청 통계">
            <article><span>전체 응답</span><strong>{stats.totalResponses}<small>명</small></strong></article>
            <article><span>발전기금 약정 인원</span><strong>{stats.pledgeCount}<small>명</small></strong></article>
            <article><span>총 약정액</span><strong>{formatWon(stats.totalPledgeAmount)}</strong></article>
            <article><span>참석 예정</span><strong>{stats.attendingCount}<small>명</small></strong></article>
          </section>
        ) : null}

        {error ? <div className="admin-banner" role="alert">{error}</div> : null}

        <nav className="admin-tabs" aria-label="관리자 메뉴">
          <button type="button" className={tab === 'submissions' ? 'is-active' : ''} aria-current={tab === 'submissions' ? 'page' : undefined} onClick={() => setTab('submissions')}>발전기금·참석 회신</button>
          <button type="button" className={tab === 'attendance' ? 'is-active' : ''} aria-current={tab === 'attendance' ? 'page' : undefined} onClick={() => setTab('attendance')}>참석 여부</button>
          <button type="button" className={tab === 'student' ? 'is-active' : ''} aria-current={tab === 'student' ? 'page' : undefined} onClick={() => setTab('student')}>학생 참석</button>
          <button type="button" className={tab === 'fields' ? 'is-active' : ''} aria-current={tab === 'fields' ? 'page' : undefined} onClick={() => setTab('fields')}>폼 항목 관리</button>
        </nav>

        {tab === 'submissions' ? (
          <SubmissionsPanel submissions={submissions} fields={fields} onRefresh={refresh} onError={setError} />
        ) : tab === 'attendance' ? (
          <AttendanceResponsesPanel
            responses={attendanceResponses}
            onUpdated={handleAttendanceUpdated}
            onDeleted={handleAttendanceDeleted}
            onError={setError}
            onSuccess={showToast}
          />
        ) : tab === 'student' ? (
          <StudentAttendanceResponsesPanel
            responses={studentAttendanceResponses}
            onUpdated={handleStudentAttendanceUpdated}
            onManagementUpdated={handleStudentSelectionManagementUpdated}
            onDeleted={handleStudentAttendanceDeleted}
            onError={setError}
            onSuccess={showToast}
          />
        ) : (
          <FormFieldsPanel fields={fields} onRefresh={refresh} onError={setError} />
        )}
      </main>
      <Toast message={toastMessage} />
    </div>
  );
}
