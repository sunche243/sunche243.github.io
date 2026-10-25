import { useEffect, useState } from 'react';
import {
  disableAdminPush,
  enableAdminPush,
  getAdminPushStatus,
  type AdminPushStatus,
} from './pushNotifications';

interface PushNotificationControlProps {
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}

const statusMessages: Record<AdminPushStatus, string> = {
  checking: '알림 상태 확인 중',
  unsupported: '아이폰에서는 Safari로 홈 화면에 추가한 뒤 실행해야 알림을 받을 수 있습니다.',
  unconfigured: '배포 환경에 Web Push 공개 키 설정이 필요합니다.',
  blocked: '아이폰 설정에서 이 웹 앱의 알림을 허용해주세요.',
  inactive: '새 회신이 접수되면 이 기기로 알림을 받을 수 있습니다.',
  active: '이 기기에서 새 회신 알림을 받고 있습니다.',
};

export function PushNotificationControl({ onError, onSuccess }: PushNotificationControlProps) {
  const [status, setStatus] = useState<AdminPushStatus>('checking');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    void getAdminPushStatus()
      .then((nextStatus) => {
        if (active) setStatus(nextStatus);
      })
      .catch(() => {
        if (active) setStatus('inactive');
      });
    return () => {
      active = false;
    };
  }, []);

  async function toggle() {
    if (submitting || !['active', 'inactive'].includes(status)) return;
    setSubmitting(true);
    onError('');
    try {
      const nextStatus = status === 'active'
        ? await disableAdminPush()
        : await enableAdminPush();
      setStatus(nextStatus);
      if (nextStatus === 'active') onSuccess('이 기기에서 푸시 알림을 받습니다.');
      if (nextStatus === 'inactive') onSuccess('이 기기의 푸시 알림을 해제했습니다.');
    } catch (error) {
      onError(error instanceof Error ? error.message : '푸시 알림 설정을 변경하지 못했습니다.');
    } finally {
      setSubmitting(false);
    }
  }

  const actionable = status === 'active' || status === 'inactive';
  const buttonLabel = submitting
    ? '처리 중'
    : status === 'active'
      ? '푸시 알림 끄기'
      : '푸시 알림 받기';

  return (
    <section className={`admin-push-control admin-push-control--${status}`} aria-label="푸시 알림 설정">
      <div>
        <strong>{status === 'active' ? '알림 켜짐' : '푸시 알림'}</strong>
        <span aria-live="polite">{statusMessages[status]}</span>
      </div>
      <button type="button" onClick={() => void toggle()} disabled={!actionable || submitting}>
        {buttonLabel}
      </button>
    </section>
  );
}
