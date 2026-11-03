import { useEffect, useState, type FormEvent } from 'react';
import { Toast } from '../components/Toast';
import { isSupabaseConfigured } from '../services/supabase';
import { restoreAdminSession, signInAdmin, signOutAdmin } from './adminService';
import { AdminDataForm } from './AdminDataForm';

type AdminDataPhase = 'checking' | 'login' | 'ready';

function ConfigurationNotice() {
  return (
    <main className="admin-centered">
      <div className="admin-auth-panel">
        <p className="admin-brand">ACCOUNTING 50 · ADMIN</p>
        <h1>Supabase 설정이 필요합니다.</h1>
        <p><code>VITE_SUPABASE_URL</code>과 <code>VITE_SUPABASE_ANON_KEY</code>를 설정해주세요.</p>
        <a className="admin-button" href="../">관리자 페이지로 돌아가기</a>
      </div>
    </main>
  );
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
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
      <form className="admin-auth-panel" onSubmit={(event) => void submit(event)}>
        <p className="admin-brand">ACCOUNTING 50 · ADMIN</p>
        <h1>관리자 데이터 입력</h1>
        <p>등록된 관리자 계정으로 로그인해주세요.</p>
        <label>이메일<input type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label>비밀번호<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {error ? <p className="admin-form-error" role="alert">{error}</p> : null}
        <button className="admin-button" type="submit" disabled={submitting}>{submitting ? '확인 중' : '로그인'}</button>
      </form>
    </main>
  );
}

export function AdminDataApp() {
  const configured = isSupabaseConfigured();
  const [phase, setPhase] = useState<AdminDataPhase>('checking');
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

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
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(''), 3_000);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  async function logout() {
    try {
      await signOutAdmin();
    } finally {
      setPhase('login');
    }
  }

  if (!configured) return <ConfigurationNotice />;
  if (phase === 'checking') return <main className="admin-centered"><p className="admin-loading">관리자 권한을 확인하고 있습니다.</p></main>;
  if (phase === 'login') return <Login onSuccess={() => setPhase('ready')} />;

  return (
    <div className="admin-shell admin-data-shell">
      <header className="admin-header">
        <div><p>ACCOUNTING 50</p><strong>ADMIN DATA</strong></div>
        <button type="button" onClick={() => void logout()}>로그아웃</button>
      </header>
      <main className="admin-main admin-data-main">
        <div className="admin-title-row">
          <div><p>DONGGUK UNIVERSITY</p><h1>데이터 직접 입력</h1></div>
          <a className="admin-button admin-button--secondary" href="../">관리자 페이지로 돌아가기</a>
        </div>
        <p className="admin-data-intro">공개 설문을 거치지 않고 관리자 권한으로 응답을 직접 등록합니다. 입력하지 않은 항목은 미입력 상태로 보존됩니다.</p>
        {error ? <div className="admin-banner" role="alert">{error}</div> : null}
        <AdminDataForm
          onCreated={(message) => {
            setError('');
            setToastMessage(message);
          }}
          onError={setError}
        />
      </main>
      <Toast message={toastMessage} />
    </div>
  );
}
