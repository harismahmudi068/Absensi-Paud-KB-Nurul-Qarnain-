/* PWA Absensi 1486 — fondasi instalasi untuk halaman index.
   Tidak mengubah alur login, absensi, cache, atau notifikasi yang sudah ada. */
(function () {
  'use strict';
  var api = window.AbsensiPWA = window.AbsensiPWA || {};
  var media = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  function isInstalled() {
    return !!((media && media.matches) || window.navigator.standalone === true);
  }

  api.installed = isInstalled();
  api.promptEvent = null;

  api.updateButton = function () {
    var box = document.getElementById('absensiPwaInstall');
    if (!box) return;
    api.installed = isInstalled();
    box.hidden = api.installed || (!api.promptEvent && !ios);
    var btn = box.querySelector('button');
    if (btn) btn.textContent = ios ? 'Cara Instal' : 'Instal Aplikasi';
  };

  window.pasangAbsensiPWA = async function () {
    if (isInstalled()) { api.updateButton(); return; }
    if (ios) {
      alert('Untuk memasang Absensi 1486 di iPhone/iPad:\n1. Ketuk tombol Bagikan di Safari.\n2. Pilih “Tambahkan ke Layar Utama”.\n3. Ketuk Tambahkan.');
      return;
    }
    var ev = api.promptEvent;
    if (!ev) { api.updateButton(); return; }
    api.promptEvent = null;
    try {
      await ev.prompt();
      await ev.userChoice;
    } catch (e) {}
    api.updateButton();
  };

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    api.promptEvent = event;
    window.dispatchEvent(new Event('absensi-pwa-available'));
    api.updateButton();
  });

  window.addEventListener('appinstalled', function () {
    api.installed = true;
    api.promptEvent = null;
    api.updateButton();
    window.dispatchEvent(new Event('absensi-pwa-installed'));
  });

  function syncDisplayMode() {
    api.installed = isInstalled();
    if (api.installed) api.promptEvent = null;
    api.updateButton();
  }

  if (media) {
    if (typeof media.addEventListener === 'function') media.addEventListener('change', syncDisplayMode);
    else if (typeof media.addListener === 'function') media.addListener(syncDisplayMode);
  }

  // Pakai service worker notifikasi yang sudah ada; jangan membuat SW kedua.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }
  window.addEventListener('absensi-pwa-available', api.updateButton);
  window.addEventListener('absensi-pwa-installed', api.updateButton);
})();
