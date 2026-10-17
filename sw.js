/* Service worker Halaman Siswa: khusus notifikasi push (pengingat piket, absensi, tabungan).
   Tidak menyimpan cache dan tidak menangani fetch, jadi tidak mengubah perilaku halaman.
   - badge : siluet putih transparan di bilah status HP (/ikon-badge.png)
   - icon  : gambar sesuai jenis notifikasi (/notif-<jenis>.png), hanya nama yang dikenal yang dipakai */
const IKON_DIKENAL = ['piket', 'hadir', 'terlambat', 'alpa', 'sakit', 'izin', 'libur', 'tabungan-masuk', 'tabungan-keluar'];

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { judul: 'Pemberitahuan', isi: e.data ? e.data.text() : '' }; }
  const judul = String(d.judul || 'Pemberitahuan').slice(0, 80);
  const ikon = IKON_DIKENAL.indexOf(String(d.ikon || '')) >= 0 ? String(d.ikon) : 'piket';
  const tag = String(d.tag || 'piket');
  e.waitUntil(self.registration.showNotification(judul, {
    body: String(d.isi || '').slice(0, 300),
    icon: '/notif-' + ikon + '.png',
    badge: '/ikon-badge.png',
    tag: tag,
    renotify: true, // notifikasi dengan tag sama menggantikan yang lama dan tetap berbunyi
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
