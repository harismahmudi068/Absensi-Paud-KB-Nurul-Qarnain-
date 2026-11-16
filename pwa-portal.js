/* PWA Portal Siswa — tombol instalasi dan penangkap prompt.
   Tidak mendaftarkan Service Worker baru; memakai /sw.js yang sudah digunakan portal. */
(function () {
  'use strict';
  var media = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
  var api = window.PortalPWA = window.PortalPWA || {};
  api.promptEvent = null;
  api.installed = !!((media && media.matches) || window.navigator.standalone === true);
  api.isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;

  api.isInstalled = function () {
    return !!((media && media.matches) || window.navigator.standalone === true);
  };

  api.updateButton = function () {
    var box = document.getElementById('portalPwaInstall');
    if (!box) return;
    api.installed = api.isInstalled();
    // Tampilkan tombol di Android/browser lain walau prompt otomatis tidak tersedia.
    box.hidden = api.installed;
    var btn = box.querySelector('button');
    if (btn) btn.textContent = api.isIOS ? 'Cara Instal' : 'Instal Aplikasi';
  };

  window.pasangPortalPWA = async function () {
    if (api.isInstalled()) { api.updateButton(); return; }
    if (api.isIOS) {
      alert('Untuk memasang Portal Siswa di iPhone/iPad:\n1. Buka melalui Safari.\n2. Ketuk tombol Bagikan.\n3. Pilih “Tambahkan ke Layar Utama”, lalu ketuk Tambahkan.');
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
    window.dispatchEvent(new Event('portal-pwa-available'));
    api.updateButton();
  });

  window.addEventListener('appinstalled', function () {
    api.installed = true;
    api.promptEvent = null;
    api.updateButton();
    window.dispatchEvent(new Event('portal-pwa-installed'));
  });

  function syncDisplayMode() {
    api.installed = api.isInstalled();
    if (api.installed) api.promptEvent = null;
    api.updateButton();
  }

  if (media) {
    if (typeof media.addEventListener === 'function') media.addEventListener('change', syncDisplayMode);
    else if (typeof media.addListener === 'function') media.addListener(syncDisplayMode);
  }
  window.addEventListener('portal-pwa-available', api.updateButton);
  window.addEventListener('portal-pwa-installed', api.updateButton);
})();
