/* PWA Portal Siswa — penangkap prompt instalasi.
   Tidak mendaftarkan Service Worker baru; memakai /sw.js yang sudah digunakan portal. */
(function () {
  'use strict';
  var media = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
  var api = window.PortalPWA = window.PortalPWA || {};
  api.promptEvent = null;
  api.installed = !!((media && media.matches) || window.navigator.standalone === true);

  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    api.promptEvent = event;
    window.dispatchEvent(new Event('portal-pwa-available'));
  });

  window.addEventListener('appinstalled', function () {
    api.installed = true;
    api.promptEvent = null;
    window.dispatchEvent(new Event('portal-pwa-installed'));
  });

  function syncDisplayMode() {
    api.installed = !!((media && media.matches) || window.navigator.standalone === true);
    if (api.installed) api.promptEvent = null;
  }

  if (media) {
    if (typeof media.addEventListener === 'function') media.addEventListener('change', syncDisplayMode);
    else if (typeof media.addListener === 'function') media.addListener(syncDisplayMode);
  }

  api.isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
  api.isInstalled = function () {
    return !!((media && media.matches) || window.navigator.standalone === true);
  };
})();
