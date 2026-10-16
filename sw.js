/* Service worker Halaman Siswa: khusus notifikasi push pengingat piket.
   Tidak menyimpan cache dan tidak menangani fetch, jadi tidak mengubah perilaku halaman. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { judul: 'Pengingat', isi: e.data ? e.data.text() : '' }; }
  const judul = String(d.judul || 'Pengingat piket').slice(0, 80);
  e.waitUntil(self.registration.showNotification(judul, {
    body: String(d.isi || '').slice(0, 300),
    icon: '/ikon-192.png',
    badge: '/ikon-192.png',
    tag: String(d.tag || 'piket'),
    data: { url: String(d.url || '/') }
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const tujuan = new URL((e.notification.data && e.notification.data.url) || '/', self.location.origin);
  // hanya alamat di situs ini yang boleh dibuka
  if (tujuan.origin !== self.location.origin) return;
  e.waitUntil((async () => {
    const semua = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of semua) {
      try {
        if (new URL(c.url).pathname === tujuan.pathname) {
          await c.focus();
          if ('navigate' in c) await c.navigate(tujuan.href);
          return;
        }
      } catch (_) { /* lanjut */ }
    }
    await self.clients.openWindow(tujuan.href);
  })());
});
