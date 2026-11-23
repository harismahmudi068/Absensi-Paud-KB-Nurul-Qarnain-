/* PWA Absensi 1486 — tombol instalasi untuk halaman index.
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
    // Tombol tetap tersedia meski browser tidak mengirim beforeinstallprompt.
    box.hidden = api.installed;
    var btn = box.querySelector('button');
    if (btn) btn.textContent = ios ? 'Cara Instal' : 'Instal Aplikasi';
  };

  window.pasangAbsensiPWA = async function () {
    if (isInstalled()) { api.updateButton(); return; }
    if (ios) {
      alert('Untuk memasang Absensi 1486 di iPhone/iPad:\n1. Buka melalui Safari.\n2. Ketuk tombol Bagikan.\n3. Pilih “Tambahkan ke Layar Utama”, lalu ketuk Tambahkan.');
      return;
    }
    var ev = api.promptEvent;
    if (ev) {
      api.promptEvent = null;
      try {
        await ev.prompt();
        await ev.userChoice;
        api.updateButton();
        return;
      } catch (e) {}
    }
    alert('Jika jendela instalasi tidak muncul:\n1. Buka menu browser (⋮).\n2. Pilih “Instal aplikasi” atau “Tambahkan ke layar utama”.\n3. Ikuti petunjuk sampai selesai.\n\nJika pilihan belum tersedia, buka alamat ini melalui Chrome dan coba lagi.');
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

  // Tetap memakai Service Worker notifikasi yang sudah ada.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(function () {});
    });
  }
  window.addEventListener('absensi-pwa-available', api.updateButton);
  window.addEventListener('absensi-pwa-installed', api.updateButton);
})();
