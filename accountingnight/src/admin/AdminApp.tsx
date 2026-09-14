import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { isSupabaseConfigured } from '../services/supabase';
import type { FormField, Submission } from '../types/registration';
import { formatWon } from '../utils/registration';
import { fetchAllFormFields, fetchSubmissions, restoreAdminSession, signInAdmin, signOutAdmin } from './adminService';
import { calculateAdminStats } from './adminUtils';
import { FormFieldsPanel } from './FormFieldsPanel';
import { SubmissionsPanel } from './SubmissionsPanel';

type AdminPhase = 'checking' | 'login' | 'ready';
type AdminTab = 'submissions' | 'fields';

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
  const [fields, setFields] = useState<FormField[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const stats = useMemo(() => calculateAdminStats(submissions), [submissions]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextSubmissions, nextFields] = await Promise.all([fetchSubmissions(), fetchAllFormFields()]);
      setSubmissions(nextSubmissions);
      setFields(nextFields);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : '관리자 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
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
      setFields([]);
      setPhase('login');
    }
  }

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

        <section className="admin-stats" aria-label="신청 통계">
          <article><span>후원 의향</span><strong>{stats.sponsorCount}<small>명</small></strong></article>
          <article><span>후원 구좌</span><strong>{stats.sponsorshipUnits}<small>구좌</small></strong></article>
          <article><span>예상 후원액</span><strong>{formatWon(stats.expectedAmount)}</strong></article>
          <article><span>참석 예정</span><strong>{stats.attendingCount}<small>명</small></strong></article>
        </section>

        {error ? <div className="admin-banner" role="alert">{error}</div> : null}

        <nav className="admin-tabs" aria-label="관리자 메뉴">
          <button type="button" className={tab === 'submissions' ? 'is-active' : ''} aria-current={tab === 'submissions' ? 'page' : undefined} onClick={() => setTab('submissions')}>신청 내역</button>
          <button type="button" className={tab === 'fields' ? 'is-active' : ''} aria-current={tab === 'fields' ? 'page' : undefined} onClick={() => setTab('fields')}>폼 항목 관리</button>
        </nav>

        {tab === 'submissions' ? (
          <SubmissionsPanel submissions={submissions} fields={fields} onRefresh={refresh} onError={setError} />
        ) : (
          <FormFieldsPanel fields={fields} onRefresh={refresh} onError={setError} />
        )}
      </main>
    </div>
  );
}
