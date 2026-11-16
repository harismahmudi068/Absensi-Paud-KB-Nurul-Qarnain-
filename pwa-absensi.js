/* PWA Absensi 1486 — fondasi instalasi untuk halaman index.
   Tidak mengubah alur login, absensi, cache, atau notifikasi yang sudah ada. */
(function () {
  'use strict';

  var api = window.AbsensiPWA = window.AbsensiPWA || {};
  var media = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;

  function isInstalled() {
    return !!((media && media.matches) || window.navigator.standalone === true);
  }

  api.installed = isInstalled();
  api.promptEvent = null;

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    api.promptEvent = event;
    window.dispatchEvent(new Event('absensi-pwa-available'));
  });

  window.addEventListener('appinstalled', function () {
    api.installed = true;
    api.promptEvent = null;
    window.dispatchEvent(new Event('absensi-pwa-installed'));
  });

  function syncDisplayMode() {
    api.installed = isInstalled();
    if (api.installed) api.promptEvent = null;
  }

  if (media) {
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', syncDisplayMode);
    } else if (typeof media.addListener === 'function') {
      media.addListener(syncDisplayMode);
    }
  }

  // Pakai service worker notifikasi yang sudah ada; jangan membuat SW kedua.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {
        // Instalasi tetap dapat dicoba ulang saat halaman dibuka kembali.
      });
    });
  }
})();
