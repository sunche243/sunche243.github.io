import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20261025153542_admin_web_push_notifications.sql', import.meta.url),
  'utf8',
);
const schema = readFileSync(new URL('../../supabase/schema.sql', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('../../public/admin/sw.js', import.meta.url), 'utf8');
const manifest = JSON.parse(readFileSync(
  new URL('../../public/admin/manifest.webmanifest', import.meta.url),
  'utf8',
)) as Record<string, unknown>;

describe('administrator Web Push infrastructure', () => {
  it('stores subscriptions behind administrator-only row-level security', () => {
    expect(migration).toContain('create table if not exists public.admin_push_subscriptions');
    expect(migration).toContain('alter table public.admin_push_subscriptions enable row level security;');
    expect(migration).toContain('user_id = (select auth.uid())');
    expect(migration).toContain('and (select public.is_admin())');
    expect(migration).toContain('revoke all on table public.push_notification_events from public, anon, authenticated;');
  });

  it('queues only generic notification copy and skips authenticated administrator edits', () => {
    expect(migration).toContain('if public.is_admin() then');
    expect(migration).toContain("when 'submissions' then");
    expect(migration).toContain("when 'attendance_responses' then");
    expect(migration).toContain("when 'student_attendance_responses' then");
    expect(migration).not.toMatch(/jsonb_build_object\([^)]*(?:name|phone)/i);
    expect(migration).toContain("where name = 'accountingnight_web_push_dispatch_secret'");
    expect(migration).toContain("'x-webhook-secret', v_dispatch_secret");
  });

  it('keeps the canonical schema in sync with the migration', () => {
    expect(schema).toContain('create table if not exists public.admin_push_subscriptions');
    expect(schema).toContain('create or replace function private.queue_admin_push_notification()');
    expect(schema).toContain('create trigger push_notification_events_dispatch');
  });

  it('installs as a standalone admin web app and handles push notification clicks', () => {
    expect(manifest).toMatchObject({
      id: '/accountingnight/admin/',
      start_url: '/accountingnight/admin/',
      scope: '/accountingnight/admin/',
      display: 'standalone',
    });
    expect(serviceWorker).toContain("self.addEventListener('push'");
    expect(serviceWorker).toContain("self.addEventListener('notificationclick'");
    expect(serviceWorker).toContain("startsWith(ADMIN_PATH)");
  });
});
