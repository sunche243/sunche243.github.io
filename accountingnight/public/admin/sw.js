const ADMIN_PATH = '/accountingnight/admin/';

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = typeof payload.title === 'string' ? payload.title : '회계인의 밤 관리자';
  const targetUrl = typeof payload.url === 'string' && payload.url.startsWith(ADMIN_PATH)
    ? payload.url
    : ADMIN_PATH;

  event.waitUntil(self.registration.showNotification(title, {
    body: typeof payload.body === 'string' ? payload.body : '새 회신이 접수되었습니다.',
    icon: typeof payload.icon === 'string' ? payload.icon : '/accountingnight/apple-touch-icon.png',
    badge: typeof payload.badge === 'string' ? payload.badge : '/accountingnight/apple-touch-icon.png',
    tag: typeof payload.tag === 'string' ? payload.tag : 'accountingnight-response',
    renotify: true,
    data: { url: targetUrl },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetPath = typeof event.notification.data?.url === 'string'
    && event.notification.data.url.startsWith(ADMIN_PATH)
    ? event.notification.data.url
    : ADMIN_PATH;
  const targetUrl = new URL(targetPath, self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const adminWindow = windows.find((client) => new URL(client.url).pathname.startsWith(ADMIN_PATH));
    if (adminWindow) {
      await adminWindow.navigate(targetUrl);
      return adminWindow.focus();
    }
    return self.clients.openWindow(targetUrl);
  })());
});
