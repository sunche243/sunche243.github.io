import { getSupabase, SupabaseConfigurationError } from '../services/supabase';

const vapidPublicKey = import.meta.env.VITE_WEB_PUSH_VAPID_PUBLIC_KEY?.trim() ?? '';
const serviceWorkerUrl = `${import.meta.env.BASE_URL}admin/sw.js`;
const serviceWorkerScope = `${import.meta.env.BASE_URL}admin/`;

export type AdminPushStatus =
  | 'checking'
  | 'unsupported'
  | 'unconfigured'
  | 'blocked'
  | 'inactive'
  | 'active';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new SupabaseConfigurationError();
  return supabase;
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let index = 0; index < rawData.length; index += 1) output[index] = rawData.charCodeAt(index);
  return output;
}

export function supportsAdminPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

async function getRegistration() {
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl, { scope: serviceWorkerScope });
  await navigator.serviceWorker.ready;
  return registration;
}

async function saveSubscription(subscription: PushSubscription) {
  const supabase = requireSupabase();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) throw new Error('관리자 로그인이 필요합니다.');

  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;
  if (!p256dh || !auth) throw new Error('기기 알림 정보를 확인하지 못했습니다.');

  const { error } = await supabase.from('admin_push_subscriptions').upsert({
    user_id: userData.user.id,
    endpoint: subscription.endpoint,
    p256dh,
    auth,
    expiration_time: subscription.expirationTime,
    user_agent: navigator.userAgent.slice(0, 512),
    enabled: true,
    last_error: null,
  }, { onConflict: 'endpoint' });

  if (error) throw new Error('푸시 알림 기기를 등록하지 못했습니다. 새 migration 적용 여부를 확인해주세요.');
}

export async function getAdminPushStatus(): Promise<AdminPushStatus> {
  if (!supportsAdminPush()) return 'unsupported';
  if (!vapidPublicKey) return 'unconfigured';
  if (Notification.permission === 'denied') return 'blocked';

  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return 'inactive';
  await saveSubscription(subscription);
  return 'active';
}

export async function enableAdminPush(): Promise<AdminPushStatus> {
  if (!supportsAdminPush()) return 'unsupported';
  if (!vapidPublicKey) return 'unconfigured';

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return permission === 'denied' ? 'blocked' : 'inactive';

  const registration = await getRegistration();
  const existing = await registration.pushManager.getSubscription();
  const subscription = existing ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
  });
  await saveSubscription(subscription);
  return 'active';
}

export async function disableAdminPush(): Promise<AdminPushStatus> {
  if (!supportsAdminPush()) return 'unsupported';
  const registration = await getRegistration();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return 'inactive';

  const supabase = requireSupabase();
  const { error } = await supabase
    .from('admin_push_subscriptions')
    .delete()
    .eq('endpoint', subscription.endpoint);

  await subscription.unsubscribe();
  if (error) throw new Error('서버의 알림 기기 정보를 삭제하지 못했습니다.');
  return 'inactive';
}
