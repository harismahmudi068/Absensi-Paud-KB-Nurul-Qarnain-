/* Diagnostik PWA sementara — hanya membaca status, tidak mengubah instalasi/SW/notifikasi. */
(function () {
  'use strict';
  if (window.__PWA_DIAG_INSTALLED__) return;
  window.__PWA_DIAG_INSTALLED__ = true;

  var rows = {};
  var eventSeen = false;
  var panel, body;
  var checks = [
    ['origin', 'Domain / HTTPS'],
    ['manifest', 'Manifest'],
    ['identity', 'Identitas aplikasi'],
    ['icons', 'Ikon aplikasi'],
    ['sw', 'Service Worker'],
    ['controller', 'Kontrol halaman'],
    ['installEvent', 'Event instalasi Chrome']
  ];

  function el(tag, attrs, text) {
    var node = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (text != null) node.textContent = text;
    return node;
  }
  function set(id, value, detail) {
    rows[id] = { value: value, detail: detail || '' };
    render();
  }
  function render() {
    if (!body) return;
    body.textContent = '';
    checks.forEach(function (item) {
      var r = rows[item[0]] || { value: 'Memeriksa…', detail: '' };
      var card = el('div', { class: 'pwa-diag-row' });
      var top = el('div', { class: 'pwa-diag-top' });
      top.appendChild(el('strong', {}, item[1]));
      var good = /OK|TERSEDIA|DITERIMA|AKTIF|TERKENDALI/i.test(r.value);
      top.appendChild(el('span', { class: 'pwa-diag-status ' + (good ? 'ok' : 'wait') }, r.value));
      card.appendChild(top);
      if (r.detail) card.appendChild(el('div', { class: 'pwa-diag-detail' }, r.detail));
      body.appendChild(card);
    });
    var note = el('p', { class: 'pwa-diag-note' },
      'Catatan: Chrome tidak menyediakan API halaman web untuk membaca seluruh alasan internal penolakan instalasi. Event instalasi dan status komponen di atas menjadi petunjuk diagnosis, bukan keputusan final Chrome.');
    body.appendChild(note);
  }
  function makePanel() {
    var style = el('style');
    style.textContent = '#pwaDiagToggle{position:fixed;right:12px;bottom:18px;z-index:2147483000;border:0;border-radius:24px;padding:11px 15px;background:#14532d;color:#fff;font:700 13px system-ui;box-shadow:0 3px 14px #0004}#pwaDiagPanel{position:fixed;inset:auto 10px 70px 10px;max-height:72vh;overflow:auto;z-index:2147483001;background:#fff;color:#17251c;border:1px solid #cbd8ce;border-radius:16px;padding:14px;box-shadow:0 8px 32px #0005;font:14px/1.4 system-ui}#pwaDiagPanel[hidden]{display:none}.pwa-diag-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:10px}.pwa-diag-head strong{font-size:16px}.pwa-diag-head button,.pwa-diag-actions button{border:1px solid #cbd8ce;background:#f4f7f4;color:#17251c;border-radius:9px;padding:7px 10px;font-weight:700}.pwa-diag-row{padding:9px 0;border-bottom:1px solid #e4ebe5}.pwa-diag-top{display:flex;justify-content:space-between;align-items:center;gap:8px}.pwa-diag-status{font-size:11px;font-weight:800;border-radius:20px;padding:3px 8px;background:#eef2f0;color:#47564c}.pwa-diag-status.ok{background:#dcfce7;color:#166534}.pwa-diag-detail{font-size:12px;color:#526257;margin-top:4px;overflow-wrap:anywhere}.pwa-diag-note{font-size:11px;color:#647067;margin:12px 0}.pwa-diag-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}';
    document.head.appendChild(style);
    var toggle = el('button', { id: 'pwaDiagToggle', type: 'button' }, '🔎 Diagnostik PWA');
    panel = el('section', { id: 'pwaDiagPanel', hidden: '' });
    var head = el('div', { class: 'pwa-diag-head' });
    head.appendChild(el('strong', {}, 'Pemeriksaan PWA — Preview'));
    var close = el('button', { type: 'button' }, 'Tutup');
    close.addEventListener('click', function () { panel.hidden = true; });
    head.appendChild(close);
    panel.appendChild(head);
    body = el('div');
    panel.appendChild(body);
    var actions = el('div', { class: 'pwa-diag-actions' });
    var refresh = el('button', { type: 'button' }, 'Periksa ulang');
    refresh.addEventListener('click', runChecks);
    var copy = el('button', { type: 'button' }, 'Salin hasil');
    copy.addEventListener('click', function () {
      var lines = ['PWA DIAGNOSTIK', 'Domain: ' + location.origin];
      checks.forEach(function (item) {
        var r = rows[item[0]] || {};
        lines.push(item[1] + ': ' + (r.value || '-') + (r.detail ? ' — ' + r.detail : ''));
      });
      var output = lines.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(output).then(function () { copy.textContent = 'Tersalin ✓'; })
          .catch(function () { window.prompt('Salin hasil pemeriksaan:', output); });
      } else window.prompt('Salin hasil pemeriksaan:', output);
    });
    actions.appendChild(refresh);
    actions.appendChild(copy);
    panel.appendChild(actions);
    toggle.addEventListener('click', function () { panel.hidden = !panel.hidden; });
    document.body.appendChild(toggle);
    document.body.appendChild(panel);
    render();
  }
  function imageCheck(src) {
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () { resolve(src + ' (' + img.naturalWidth + '×' + img.naturalHeight + ')'); };
      img.onerror = function () { resolve(src + ' GAGAL DIMUAT'); };
      img.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'pwa_diag=' + Date.now();
    });
  }
  async function runChecks() {
    set('origin', window.isSecureContext ? 'OK' : 'GAGAL', location.origin + ' | secure context: ' + window.isSecureContext);
    var link = document.querySelector('link[rel="manifest"]');
    if (!link) {
      set('manifest', 'TIDAK DITEMUKAN', 'Halaman tidak memiliki link rel=manifest.');
      set('identity', 'TIDAK TERSEDIA', 'Tidak dapat membaca identitas tanpa manifest.');
      set('icons', 'TIDAK TERSEDIA', '');
    } else {
      var manifestUrl = link.href;
      try {
        var response = await fetch(manifestUrl, { cache: 'no-store' });
        if (!response.ok) throw new Error('HTTP ' + response.status);
        var m = await response.json();
        set('manifest', 'OK', manifestUrl + ' | HTTP ' + response.status + ' | MIME: ' + (response.headers.get('content-type') || 'tidak diketahui'));
        set('identity', m.name ? 'OK' : 'PERLU DIPERIKSA',
          'name=' + (m.name || '(kosong)') + ' | id=' + (m.id || '(tidak ada)') +
          ' | start_url=' + (m.start_url || '(kosong)') + ' | scope=' + (m.scope || '(kosong)') +
          ' | display=' + (m.display || '(kosong)'));
        var icons = Array.isArray(m.icons) ? m.icons : [];
        var results = await Promise.all(icons.map(function (ic) { return imageCheck(new URL(ic.src, manifestUrl).href); }));
        set('icons', icons.length ? (results.every(function (x) { return x.indexOf('GAGAL') < 0; }) ? 'OK' : 'SEBAGIAN GAGAL') : 'TIDAK ADA',
          results.length ? results.join(' | ') : 'Manifest tidak memiliki daftar ikon.');
      } catch (err) {
        set('manifest', 'GAGAL', String(err));
        set('identity', 'TIDAK TERSEDIA', 'Manifest gagal dibaca.');
        set('icons', 'TIDAK TERSEDIA', '');
      }
    }
    if (!('serviceWorker' in navigator)) {
      set('sw', 'TIDAK DIDUKUNG', 'Browser tidak menyediakan Service Worker.');
      set('controller', 'TIDAK TERKENDALI', 'Tidak ada API Service Worker.');
    } else {
      try {
        var regs = await navigator.serviceWorker.getRegistrations();
        var details = regs.map(function (r) {
          return 'scope=' + r.scope + ', active=' + (r.active ? r.active.scriptURL : 'tidak ada') +
            ', waiting=' + !!r.waiting + ', installing=' + !!r.installing;
        });
        set('sw', regs.length ? 'AKTIF / TERDAFTAR' : 'BELUM TERDAFTAR',
          details.length ? details.join(' | ') : 'Belum ditemukan registrasi Service Worker pada origin ini.');
        set('controller', navigator.serviceWorker.controller ? 'TERKENDALI' : 'BELUM TERKENDALI',
          navigator.serviceWorker.controller ? navigator.serviceWorker.controller.scriptURL :
            'Halaman ini belum dikendalikan Service Worker. Coba muat ulang setelah registrasi selesai.');
      } catch (err) {
        set('sw', 'GAGAL MEMERIKSA', String(err));
        set('controller', 'TIDAK DIKETAHUI', '');
      }
    }
    set('installEvent', eventSeen ? 'DITERIMA' : 'BELUM TERDETEKSI',
      eventSeen ? 'Chrome telah mengirim beforeinstallprompt pada sesi halaman ini.' :
        'Belum ada beforeinstallprompt yang diterima sejak halaman dibuka.');
  }

  window.addEventListener('beforeinstallprompt', function () {
    eventSeen = true;
    set('installEvent', 'DITERIMA', 'Chrome telah mengirim beforeinstallprompt pada sesi halaman ini.');
  });
  window.addEventListener('appinstalled', function () {
    set('installEvent', 'APLIKASI TERPASANG', 'Browser mengirim event appinstalled.');
  });
  function start() {
    makePanel();
    runChecks();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();