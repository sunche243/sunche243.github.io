import { createClient } from 'npm:@supabase/supabase-js@2.116.0';
import webpush from 'npm:web-push@3.6.7';

interface DispatchRequest {
  event_id?: unknown;
}

interface PushEvent {
  id: string;
  category: 'sponsorship' | 'attendance' | 'student_attendance';
  title: string;
  body: string;
  target_url: string;
}

interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface WebPushError extends Error {
  statusCode?: number;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

function getSecretKey() {
  const configuredKeys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (configuredKeys) {
    try {
      const keys = JSON.parse(configuredKeys) as Record<string, string>;
      if (keys.default) return keys.default;
    } catch {
      // Fall back to the legacy secret when the optional JSON value is malformed.
    }
  }

  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
}

export default {
  async fetch(request: Request) {
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const secretKey = getSecretKey();
    const vapidPublicKey = Deno.env.get('WEB_PUSH_VAPID_PUBLIC_KEY') ?? '';
    const vapidPrivateKey = Deno.env.get('WEB_PUSH_VAPID_PRIVATE_KEY') ?? '';
    const vapidSubject = Deno.env.get('WEB_PUSH_VAPID_SUBJECT') ?? 'https://sunche.me';
    const dispatchSecret = Deno.env.get('WEB_PUSH_DISPATCH_SECRET') ?? '';
    if (!supabaseUrl || !secretKey || !vapidPublicKey || !vapidPrivateKey || !dispatchSecret) {
      return json({ error: 'Push service is not configured' }, 503);
    }

    if (request.headers.get('x-webhook-secret') !== dispatchSecret) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let payload: DispatchRequest;
    try {
      payload = await request.json() as DispatchRequest;
    } catch {
      return json({ error: 'Invalid JSON' }, 400);
    }

    const eventId = typeof payload.event_id === 'string' ? payload.event_id : '';
    if (!UUID_PATTERN.test(eventId)) return json({ error: 'Invalid event' }, 400);

    const supabase = createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: claimedEvents, error: claimError } = await supabase
      .from('push_notification_events')
      .update({ delivery_started_at: new Date().toISOString(), last_error: null })
      .eq('id', eventId)
      .is('delivery_started_at', null)
      .is('delivered_at', null)
      .select('id,category,title,body,target_url');

    if (claimError) return json({ error: 'Unable to claim event' }, 500);
    const event = claimedEvents?.[0] as PushEvent | undefined;
    if (!event) return json({ ok: true, duplicate: true });

    const { data: subscriptionRows, error: subscriptionError } = await supabase
      .from('admin_push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .eq('enabled', true);

    if (subscriptionError) {
      await supabase.from('push_notification_events').update({
        delivery_started_at: null,
        last_error: 'Unable to load subscriptions',
      }).eq('id', event.id);
      return json({ error: 'Unable to load subscriptions' }, 500);
    }

    const subscriptions = (subscriptionRows ?? []) as PushSubscriptionRow[];
    webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    const notificationPayload = JSON.stringify({
      title: event.title,
      body: event.body,
      icon: '/accountingnight/apple-touch-icon.png',
      badge: '/accountingnight/apple-touch-icon.png',
      tag: `accountingnight-${event.id}`,
      url: event.target_url,
    });

    const results = await Promise.all(subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification({
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth },
        }, notificationPayload, { TTL: 300, urgency: 'high' });
        await supabase.from('admin_push_subscriptions').update({
          last_success_at: new Date().toISOString(),
          last_error: null,
        }).eq('id', subscription.id);
        return { ok: true, permanentFailure: false };
      } catch (error) {
        const pushError = error as WebPushError;
        const permanentFailure = pushError.statusCode === 404 || pushError.statusCode === 410;
        await supabase.from('admin_push_subscriptions').update({
          enabled: permanentFailure ? false : true,
          last_error: pushError.message.slice(0, 1000),
        }).eq('id', subscription.id);
        return { ok: false, permanentFailure };
      }
    }));

    const successCount = results.filter((result) => result.ok).length;
    const failureCount = results.length - successCount;
    const lastError = failureCount > 0
      ? `${failureCount}개 기기에 알림을 전송하지 못했습니다.`
      : null;

    const { error: completionError } = await supabase.from('push_notification_events').update({
      delivered_at: new Date().toISOString(),
      success_count: successCount,
      failure_count: failureCount,
      last_error: lastError,
    }).eq('id', event.id);

    if (completionError) return json({ error: 'Unable to complete event' }, 500);
    return json({ ok: true, successCount, failureCount });
  },
};
