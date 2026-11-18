/* Asisten AI Absensi 1486 — Preview bertahap
 * Navigasi terlihat, pembacaan terbatas, dan pengisian formulir tanpa menyimpan.
 * Semua navigasi memakai tombol menu aplikasi yang sudah ada.
 */
(function () {
  'use strict';
  if (window.__absensiAiPreviewInstalled) return;
  window.__absensiAiPreviewInstalled = true;

  var css = [
    '#ai1486-launch{position:fixed;right:18px;bottom:calc(18px + env(safe-area-inset-bottom));z-index:190;display:none;align-items:center;gap:9px;border:0;border-radius:999px;padding:11px 16px;background:linear-gradient(135deg,#176b3a,#7650b8);color:#fff;font-weight:800;box-shadow:0 8px 28px rgba(24,74,47,.28);cursor:pointer}',
    '#ai1486-launch .ai1486-orb{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,.2);font-size:17px}',
    '#ai1486-panel{position:fixed;right:16px;bottom:calc(78px + env(safe-area-inset-bottom));z-index:191;width:min(390px,calc(100vw - 24px));height:min(590px,calc(100dvh - 108px));min-height:390px;display:none;flex-direction:column;overflow:hidden;border:1px solid #d8e6dc;border-radius:20px;background:#fff;color:#20352a;box-shadow:0 18px 60px rgba(15,40,25,.24);font:14px/1.45 system-ui,-apple-system,"Segoe UI",sans-serif}',
    '#ai1486-panel.ai1486-open{display:flex}',
    '.ai1486-head{display:flex;align-items:center;gap:10px;padding:14px 15px;background:linear-gradient(110deg,#176b3a,#7650b8);color:#fff}',
    '.ai1486-avatar{width:38px;height:38px;flex:0 0 38px;border-radius:13px;display:grid;place-items:center;background:rgba(255,255,255,.17);font-size:21px}',
    '.ai1486-head-main{flex:1;min-width:0}.ai1486-head-main b{display:block;font-size:15px}.ai1486-head-main small{display:block;font-size:11px;opacity:.88}',
    '.ai1486-head button{border:0;background:rgba(255,255,255,.15);color:#fff;border-radius:9px;width:34px;height:34px;font-size:18px}',
    '.ai1486-context{padding:8px 13px;background:#f5faf6;border-bottom:1px solid #e5eee7;color:#557060;font-size:11px;display:flex;justify-content:space-between;gap:8px}',
    '.ai1486-context span:last-child{font-weight:800;color:#168447}',
    '.ai1486-feed{flex:1;min-height:0;overflow:auto;padding:13px;display:flex;flex-direction:column;gap:10px;background:#fbfdfb}',
    '.ai1486-msg{max-width:91%;padding:10px 12px;border-radius:14px;white-space:pre-wrap;overflow-wrap:anywhere}',
    '.ai1486-msg.ai{align-self:flex-start;background:#eef6ef;border:1px solid #e0ece2;border-bottom-left-radius:5px}',
    '.ai1486-msg.user{align-self:flex-end;background:#eee8fa;border:1px solid #e3d9f5;border-bottom-right-radius:5px}',
    '.ai1486-msg small{display:block;margin-top:5px;color:#718276;font-size:10px}',
    '.ai1486-quick{display:flex;gap:7px;flex-wrap:wrap;padding:9px 12px;border-top:1px solid #edf2ee;background:#fff}',
    '.ai1486-quick button{border:1px solid #d9e8dc;background:#f7fbf7;color:#315b40;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:750}',
    '.ai1486-compose{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:7px;padding:10px 11px calc(11px + env(safe-area-inset-bottom));border-top:1px solid #e8efe9;background:#fff;box-sizing:border-box;width:100%;min-width:0}',
    '.ai1486-compose textarea{display:block;width:100%;min-width:0;max-width:100%;box-sizing:border-box;max-height:100px;min-height:42px;resize:none;border:1px solid #d6e4d9;border-radius:12px;padding:10px 11px;font:inherit;outline:none;color:#20352a}',
    '.ai1486-compose textarea:focus{border-color:#7650b8;box-shadow:0 0 0 3px rgba(118,80,184,.1)}',
    '.ai1486-send,.ai1486-stop{display:block;box-sizing:border-box;flex:none;min-width:58px;white-space:nowrap;border:0;border-radius:11px;padding:10px 12px;min-height:42px;font-weight:800;color:#fff;background:#168b47}',
    '.ai1486-stop{display:none;background:#c43b48}.ai1486-stop.on{display:block}',
    '.ai1486-activity{padding:8px 12px;background:#fff8e8;border-top:1px solid #f0e4c6;color:#805d1b;font-size:11px;display:none}',
    '.ai1486-activity.on{display:block}',
    '.ai1486-focus{outline:3px solid #e9b949!important;outline-offset:3px!important;box-shadow:0 0 0 7px rgba(233,185,73,.22)!important;z-index:2!important}',
    '@media(max-width:600px){#ai1486-panel{right:8px;bottom:calc(72px + env(safe-area-inset-bottom));width:calc(100vw - 16px);height:min(70dvh,620px);min-height:360px;border-radius:18px}#ai1486-launch{right:12px;bottom:calc(12px + env(safe-area-inset-bottom));padding:9px 13px}}',
    '@media(prefers-reduced-motion:no-preference){#ai1486-launch{transition:box-shadow .15s ease,transform .15s ease}#ai1486-launch:active{transform:scale(.97)}}'
  ].join('');
  var style = document.createElement('style');
  style.id = 'ai1486-preview-style';
  style.textContent = css;
  document.head.appendChild(style);

  /* Posisi ringkas: tombol tepat di bawah header, panel hanya seperlunya. */
  var compactStyle = document.createElement('style');
  compactStyle.textContent = [
    '#ai1486-launch{top:calc(env(safe-area-inset-top) + 70px);bottom:auto;right:12px;z-index:160;padding:7px 11px;gap:7px;font-size:12px;box-shadow:0 3px 12px rgba(24,74,47,.2)}',
    '#ai1486-launch .ai1486-orb{width:23px;height:23px;font-size:14px}',
    '#ai1486-panel{top:calc(env(safe-area-inset-top) + 112px);bottom:auto;right:10px;width:min(340px,calc(100vw - 20px));height:auto;max-height:min(42dvh,330px);min-height:0;border-radius:14px;box-shadow:0 8px 28px rgba(15,40,25,.18)}',
    '.ai1486-head{padding:8px 10px}.ai1486-avatar{width:29px;height:29px;flex-basis:29px;border-radius:10px;font-size:16px}.ai1486-head-main b{font-size:13px}.ai1486-head-main small{font-size:10px}',
    '.ai1486-context{padding:5px 9px;font-size:10px}.ai1486-feed{flex:0 1 auto;min-height:0;max-height:100px;padding:8px;gap:6px}.ai1486-msg{padding:7px 9px;font-size:12px}',
    '.ai1486-quick{display:none!important}.ai1486-compose{grid-template-columns:minmax(0,1fr) auto;width:100%;padding:7px 8px calc(8px + env(safe-area-inset-bottom));gap:6px}.ai1486-compose textarea{width:100%;min-width:0;min-height:36px;max-height:70px;padding:8px;font-size:12px}.ai1486-send,.ai1486-stop{min-width:58px;min-height:36px;padding:7px 9px;font-size:12px}',
    '.ai1486-activity{display:none!important}',
    '@media(max-width:600px){#ai1486-launch{top:calc(env(safe-area-inset-top) + 68px);right:9px;padding:6px 9px}#ai1486-panel{top:calc(env(safe-area-inset-top) + 105px);right:7px;width:calc(100vw - 14px);max-height:38dvh;min-height:0;border-radius:13px}}',
    '#ai1486-panel{resize:none}',
    '.ai1486-msg{font-size:15px;line-height:1.55}.ai1486-msg small{font-size:11px}',
    '.ai1486-compose textarea{font-size:15px!important;line-height:1.45;min-height:48px!important}',
    '.ai1486-send,.ai1486-stop{font-size:14px!important;min-height:46px!important}',
    '.ai1486-resize{height:22px;flex:0 0 22px;display:flex;align-items:center;justify-content:center;background:#fff;border-top:1px solid #edf2ee;touch-action:none;cursor:ns-resize;user-select:none}',
    '.ai1486-resize:after{content:"";width:54px;height:5px;border-radius:8px;background:#b7c7bb}',
    '@media(max-width:600px){.ai1486-msg{font-size:15px}.ai1486-context{font-size:11px}.ai1486-head-main b{font-size:14px}.ai1486-compose textarea{font-size:15px!important}}'
  ].join('');
  document.head.appendChild(compactStyle);
  var resizeLayoutStyle=document.createElement('style');
  resizeLayoutStyle.textContent='.ai1486-feed{flex:1 1 auto!important;max-height:none!important;min-height:70px}.ai1486-panel{box-sizing:border-box}';
  document.head.appendChild(resizeLayoutStyle);

  var launcher = document.createElement('button');
  launcher.id = 'ai1486-launch';
  launcher.type = 'button';
  launcher.innerHTML = '<span class="ai1486-orb">✦</span><span>Asisten AI</span>';
  launcher.setAttribute('aria-label', 'Buka Asisten AI');

  var panel = document.createElement('section');
  panel.id = 'ai1486-panel';
  panel.setAttribute('aria-label', 'Asisten AI Absensi 1486');
  panel.innerHTML =
    '<div class="ai1486-head"><div class="ai1486-avatar">✦</div><div class="ai1486-head-main"><b>Asisten Absensi 1486</b><small>Mode terlihat · Baca sesuai izin</small></div><button type="button" id="ai1486-close" aria-label="Tutup">×</button></div>' +
    '<div class="ai1486-context"><span id="ai1486-role">Memeriksa sesi...</span><span>Mode terlihat</span></div>' +
    '<div class="ai1486-feed" id="ai1486-feed" aria-live="polite"></div>' +
    '<div class="ai1486-activity" id="ai1486-activity"></div>' +
    '<div class="ai1486-quick" id="ai1486-quick"></div>' +
    '<form class="ai1486-compose" id="ai1486-form"><textarea id="ai1486-input" rows="1" maxlength="300" placeholder="Tanya halaman, cari siswa/guru, atau absensi..." aria-label="Perintah untuk asisten"></textarea><button class="ai1486-send" type="submit">Kirim</button><button class="ai1486-stop" id="ai1486-stop" type="button">Hentikan</button></form>';
  var resizeHandle = document.createElement('div');
  resizeHandle.className = 'ai1486-resize';
  resizeHandle.setAttribute('role','separator');
  resizeHandle.setAttribute('aria-label','Geser untuk mengubah tinggi obrolan AI');
  resizeHandle.setAttribute('title','Geser untuk memperpanjang atau memendekkan obrolan');
  panel.appendChild(resizeHandle);
  document.body.appendChild(launcher);
  document.body.appendChild(panel);

  var feed = document.getElementById('ai1486-feed');
  var input = document.getElementById('ai1486-input');
  var activity = document.getElementById('ai1486-activity');
  var stopButton = document.getElementById('ai1486-stop');
  var quick = document.getElementById('ai1486-quick');
  var busy = false;
  var stopRequested = false;
  var resizeStartY = 0, resizeStartH = 0, resizing = false;
  resizeHandle.addEventListener('pointerdown', function (e) {
    resizing = true; resizeStartY = e.clientY;
    resizeStartH = panel.getBoundingClientRect().height;
    try { resizeHandle.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
  });
  resizeHandle.addEventListener('pointermove', function (e) {
    if (!resizing) return;
    var maxH = Math.max(220, window.innerHeight - panel.getBoundingClientRect().top - 12);
    var next = Math.max(220, Math.min(maxH, resizeStartH + (e.clientY - resizeStartY)));
    panel.style.height = next + 'px';
    panel.style.maxHeight = maxH + 'px';
  });
  function endResize() { resizing = false; }
  resizeHandle.addEventListener('pointerup', endResize);
  resizeHandle.addEventListener('pointercancel', endResize);


  function loggedIn() {
    var app = document.getElementById('ap');
    try {
      return !!(app && !app.classList.contains('hid') && typeof me !== 'undefined' && me && typeof SEK !== 'undefined' && SEK);
    } catch (e) { return false; }
  }
  function currentRole() {
    try { return typeof role !== 'undefined' ? role : 'Pengguna'; }
    catch (e) { return 'Pengguna'; }
  }
  function currentView() {
    try { return typeof view !== 'undefined' ? view : ''; }
    catch (e) { return ''; }
  }
  function canOpen(id) {
    try { return typeof allowed === 'function' && !!allowed(id); }
    catch (e) { return false; }
  }
  function menus() {
    try { return typeof MENUS !== 'undefined' ? MENUS : []; }
    catch (e) { return []; }
  }
  function safeText(s) { return String(s == null ? '' : s); }
  var chatHistory = [];
  var activeRequestController = null;
  function addMessage(text, who, meta) {
    var content = safeText(text);
    var item = document.createElement('div');
    item.className = 'ai1486-msg ' + (who === 'user' ? 'user' : 'ai');
    item.textContent = content;
    if (meta) {
      var sm = document.createElement('small');
      sm.textContent = meta;
      item.appendChild(sm);
    }
    feed.appendChild(item);
    // Hanya pesan pengguna yang dikirim kembali sebagai konteks; hasil data siswa/absensi
    // dari aplikasi tidak ikut dikirim ke Gemini pada percakapan berikutnya.
    if (who === 'user') {
      chatHistory.push({ role: 'user', content: content.slice(0, 1000) });
      if (chatHistory.length > 8) chatHistory = chatHistory.slice(-8);
    }
    feed.scrollTop = feed.scrollHeight;
  }
  function setActivity(text, on) {
    activity.textContent = text || '';
    activity.classList.toggle('on', !!on);
    stopButton.classList.toggle('on', !!on);
  }
  function syncContext() {
    var el = document.getElementById('ai1486-role');
    if (el) el.textContent = loggedIn() ? currentRole() + ' · ' + (menuLabel(currentView()) || 'Sekolah aktif') : 'Belum masuk';
  }
  function menuLabel(id) {
    var m = menus().find(function (x) { return x[0] === id; });
    return m ? m[1] : id;
  }
  var aliases = {
    'beranda': 'dashboard', 'halaman utama': 'dashboard', 'utama': 'dashboard',
    'absensi': 'absensi', 'kehadiran': 'absensi', 'presensi': 'absensi',
    'scan': 'scan', 'pemindai': 'scan',
    'tabungan': 'tabungan', 'saldo': 'tabungan',
    'piket': 'piket', 'jadwal piket': 'piket',
    'hafalan': 'hafalan', 'setoran hafalan': 'hafalan',
    'kartu': 'kartu', 'kartu siswa': 'kartu',
    'siswa': 'siswa', 'data siswa': 'siswa',
    'kelola siswa': 'kelola', 'pendaftaran siswa': 'kelola',
    'alumni': 'alumni',
    'kelas': 'kelasjam', 'kelas dan jam masuk': 'kelasjam',
    'guru': 'guru', 'data guru': 'guru',
    'penilaian': 'penilaian', 'nilai': 'penilaian',
    'raport': 'raport', 'rapor': 'raport',
    'rekap': 'rekap', 'rekap absensi': 'rekap',
    'laporan ortu': 'laporanortu', 'laporan orang tua': 'laporanortu',
    'pesan wa': 'pesan', 'whatsapp': 'pesan', 'pesan': 'pesan',
    'jadwal libur': 'libur', 'libur': 'libur',
    'profil': 'profil', 'profil saya': 'profil',
    'tahun ajaran baru': 'tahunajaran', 'tahun ajaran': 'tahunajaran',
    'pengaturan': 'pengaturan', 'developer': 'developer'
  };
  function resolveMenu(command) {
    var q = safeText(command).toLowerCase().replace(/[.,!?]/g, ' ').replace(/\s+/g, ' ').trim();
    q = q.replace(/^(tolong|mohon|bantu saya|bisa|silakan)\s+/, '');
    q = q.replace(/^(bukakan|bukakanlah|buka|masuk ke|pergi ke|tampilkan menu|tampilkan|menu)\s+/, '');
    if (aliases[q]) return aliases[q];
    var keys = Object.keys(aliases).sort(function (a, b) { return b.length - a.length; });
    for (var i = 0; i < keys.length; i++) {
      if (q === keys[i] || q.indexOf(keys[i]) >= 0) return aliases[keys[i]];
    }
    var list = menus();
    for (var j = 0; j < list.length; j++) {
      var label = safeText(list[j][1]).toLowerCase();
      if (label && q.indexOf(label) >= 0) return list[j][0];
    }
    return '';
  }
  function findMenuButton(id, root) {
    if (!root) return null;
    var buttons = root.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
      var action = buttons[i].getAttribute('onclick') || '';
      if (action.indexOf("go('" + id + "')") >= 0) return buttons[i];
    }
    return null;
  }
  function wait(ms) { return new Promise(function (resolve) { window.setTimeout(resolve, ms); }); }
  async function visibleNavigationClick(id) {
    if (!loggedIn()) throw new Error('Sesi login tidak ditemukan. Silakan masuk kembali.');
    if (!canOpen(id)) throw new Error('Menu ' + menuLabel(id) + ' tidak tersedia untuk role ' + currentRole() + ' atau fiturnya sedang nonaktif.');
    if (stopRequested) return false;

    var mobile = window.matchMedia && window.matchMedia('(max-width:760px)').matches;
    var target = null;
    if (mobile) {
      if (typeof drw === 'function') drw(1);
      setActivity('Membuka daftar menu agar proses terlihat...', true);
      await wait(320);
      if (stopRequested) return false;
      target = findMenuButton(id, document.getElementById('dn'));
    } else {
      target = findMenuButton(id, document.getElementById('sn'));
    }
    if (!target) throw new Error('Tombol menu ' + menuLabel(id) + ' tidak ditemukan pada layar. Saya tidak akan menjalankan navigasi tersembunyi.');
    target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    target.classList.add('ai1486-focus');
    setActivity('Menekan tombol "' + menuLabel(id) + '"...', true);
    await wait(180);
    if (stopRequested) {
      target.classList.remove('ai1486-focus');
      return false;
    }
    target.click();
    await wait(650);
    if (stopRequested) return false;
    if (currentView() !== id) throw new Error('Aplikasi belum berpindah ke menu ' + menuLabel(id) + '. Mungkin ada formulir yang meminta konfirmasi atau navigasi dibatalkan.');
    var active = findMenuButton(id, document.getElementById('sn')) || findMenuButton(id, document.getElementById('dn')) || findMenuButton(id, document.getElementById('bn'));
    if (active) {
      active.classList.add('ai1486-focus');
      window.setTimeout(function () { active.classList.remove('ai1486-focus'); }, 1400);
    }
    return true;
  }

  function normAI(s) {
    return safeText(s).toLocaleLowerCase('id').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
  }
  function pageContextText() {
    var id = currentView(), title = menuLabel(id);
    var root = document.getElementById('v');
    var headings = [], actions = [];
    if (root) {
      root.querySelectorAll('.ph,h1,h2,h3').forEach(function (el) {
        var t = safeText(el.textContent).replace(/\s+/g, ' ').trim();
        if (t && headings.indexOf(t) < 0 && headings.length < 5) headings.push(t.slice(0, 90));
      });
      root.querySelectorAll('button').forEach(function (el) {
        if (actions.length >= 10 || el.disabled || !el.getClientRects().length) return;
        var t = safeText(el.innerText || el.textContent).replace(/\s+/g, ' ').trim();
        if (t && t.length <= 55 && actions.indexOf(t) < 0) actions.push(t);
      });
    }
    var available = menus().filter(function (m) { return canOpen(m[0]); }).map(function (m) { return m[1]; });
    return 'Halaman aktif: ' + (title || 'Tidak diketahui') + '.\n' +
      'Judul/bagian yang terlihat: ' + (headings.join('; ') || 'Belum ada judul yang terdeteksi') + '.\n' +
      'Tombol yang terlihat: ' + (actions.join('; ') || 'Belum ada tombol yang terdeteksi') + '.\n' +
      'Menu yang diizinkan untuk akun ini: ' + (available.join(', ') || 'Tidak ada') + '.';
  }

  function visibleFormLabels() {
    var modal = document.getElementById('md');
    var open = !!(modal && modal.classList.contains('show'));
    var root = open ? document.getElementById('mbd') : document.getElementById('v');
    if (!root) return [];
    return Array.prototype.slice.call(root.querySelectorAll('.fd')).map(function (field) {
      var label = field.querySelector('.l,label');
      return label ? safeText(label.textContent).replace(/\s+/g, ' ').trim().slice(0, 100) : '';
    }).filter(Boolean).slice(0, 40);
  }
  async function interpretWithGemini(command) {
    if (typeof apiPengaturan !== 'function') throw new Error('Jalur API pengaturan tidak tersedia.');
    var modal = document.getElementById('md');
    var popupOpen = !!(modal && modal.classList.contains('show'));
    var data = await apiPengaturan({
      aksi: 'asisten_ai',
      sekolah_id: Number(SEK),
      pesan: command,
      riwayat: chatHistory.slice(-8),
      halaman_aktif: currentView(),
      konteks_halaman: pageContextText(),
      menu_tersedia: menus().filter(function (m) { return canOpen(m[0]); }).map(function (m) { return { id: m[0], nama: m[1] }; }),
      popup_terbuka: popupOpen,
      form_fields: popupOpen ? visibleFormLabels() : []
    });
    if (!data || !data.ok || !data.result) throw new Error('Respons Gemini tidak lengkap.');
    return data.result;
  }

  function parseFillTask(command) {
    var q = safeText(command).trim();
    var m = q.match(/^(?:isi|isikan|bantu isi|lengkapi)\s+(?:formulir|form|kolom)(?:\s+ini)?\s*(?:dengan|:)\s*(.+)$/i);
    if (!m) return null;
    var pairs = m[1].split(/[;\n,]+/).map(function (part) {
      var p = part.match(/^\s*([^:=]+?)\s*[:=]\s*(.*?)\s*$/);
      return p && p[1].trim() && p[2].trim() ? { label:p[1].trim(), value:p[2].trim() } : null;
    }).filter(Boolean);
    return pairs.length ? {type:'fill',pairs:pairs} : null;
  }
  function fillVisibleForm(task) {
    if (!loggedIn()) throw new Error('Sesi sekolah tidak aktif.');
    var modal = document.getElementById('md');
    var modalOpen = !!(modal && modal.classList.contains('show'));
    var root = modalOpen ? document.getElementById('mbd') : document.getElementById('v');
    if (!root || !root.getClientRects().length) throw new Error('Area formulir tidak ditemukan.');
    var controls = Array.prototype.slice.call(root.querySelectorAll('input,textarea,select'))
      .filter(function (el) {
        var type = (el.type || '').toLowerCase();
        if (el.disabled || el.readOnly || ['hidden','submit','button','reset','password','file'].indexOf(type) >= 0) return false;
        // Select native pada popup dapat disembunyikan oleh dropdown kustom, tetapi tetap menjadi sumber nilai formulir.
        return el.tagName.toLowerCase() === 'select' || el.getClientRects().length;
      });
    var done=[], missing=[];
    task.pairs.forEach(function (pair) {
      var wanted=normAI(pair.label), el=null;
      for(var i=0;i<controls.length;i++){
        var c=controls[i], labels=[];
        var field=c.closest('.fd');
        if(field){
          var label=field.querySelector('.l,label');
          if(label) labels.push(label.textContent);
        }
        if(c.id){
          var lab=root.querySelector('label[for="'+CSS.escape(c.id)+'"]');
          if(lab) labels.push(lab.textContent);
          labels.push(c.id.replace(/^f_/, '').replace(/[_-]+/g,' '));
        }
        var parent=c.closest('label'); if(parent) labels.push(parent.textContent);
        labels.push(c.getAttribute('aria-label'),c.getAttribute('placeholder'),c.getAttribute('name'));
        var candidates=labels.filter(Boolean).map(normAI);
        if(candidates.some(function(x){return x===wanted;})){el=c;break;}
      }
      if(!el){missing.push(pair.label);return;}
      var tag=el.tagName.toLowerCase(), type=(el.type||'').toLowerCase(), value=pair.value;
      if(tag==='select'){
        var option=Array.prototype.slice.call(el.options).find(function(o){return normAI(o.textContent)===normAI(value)||normAI(o.value)===normAI(value);});
        if(!option){missing.push(pair.label+' (pilihan '+value+' tidak tersedia)');return;}
        el.value=option.value;
        el.dispatchEvent(new Event('change',{bubbles:true}));
      } else if(type==='checkbox'){
        var yes=/^(ya|yes|benar|aktif|centang|true|1)$/i.test(value);
        var no=/^(tidak|no|salah|nonaktif|hapus centang|false|0)$/i.test(value);
        if(!yes&&!no){missing.push(pair.label+' (isi ya/tidak)');return;}
        el.checked=yes;
      } else if(type==='radio'){
        var group=controls.filter(function(c){return c.type==='radio'&&c.name===el.name;});
        var radio=group.find(function(c){return normAI(c.value)===normAI(value);});
        if(!radio){missing.push(pair.label+' (opsi tidak tersedia)');return;}
        radio.checked=true;el=radio;
      } else {
        // Form() aplikasi membaca nilai DOM saat tombol Simpan ditekan.
        // Tidak kirim event input/change untuk mencegah handler halaman berjalan atau merender ulang daftar.
        var setter=Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el),'value');
        if(setter&&setter.set)setter.set.call(el,value);else el.value=value;
      }
      done.push(pair.label+': '+pair.value);
    });
    var msg=done.length?'Formulir popup berhasil diisi pada '+done.length+' kolom (belum disimpan):\\n'+done.map(function(x){return '• '+x;}).join('\\n'):'Tidak ada kolom yang berhasil diisi.';
    if(missing.length)msg+='\\n\\nKolom yang belum cocok:\\n'+missing.map(function(x){return '• '+x;}).join('\\n');
    msg+='\\n\\nPopup tetap terbuka. Tidak ada tombol Simpan/Kirim yang ditekan.';
    return msg;
  }
  function parseReadTask(command) {
    var q = normAI(command);
    if (/^(halaman apa|menu apa|saya sedang di mana|sedang di halaman apa|apa yang sedang terbuka|jelaskan halaman ini|apa saja fitur di halaman ini|apa yang bisa dilakukan di sini)/.test(q)) return { type: 'context' };
    var profil = q.match(/^(?:buka|bukakan|lihat|tampilkan|perlihatkan|cek)\\s+(?:profil|detail|data lengkap)\\s+(?:siswa|anak|murid)\\s+(.+)$/) || q.match(/^(?:profil|detail)\\s+(?:siswa|anak|murid)\\s+(.+)$/);
    if (profil) return { type: 'profil_siswa', query: profil[1].trim() };
    if (/^(?:daftar|list|tampilkan|lihat|perlihatkan)\\s+(?:(?:semua|seluruh)\\s+)?(?:data\\s+)?(?:siswa|anak|murid)(?:\\s+(?:semua|seluruh))?$/.test(q) || /^(?:tampilkan|perlihatkan)\\s+daftar\\s+(?:siswa|anak|murid)$/.test(q)) return { type: 'siswa', query: '' };
    var m = q.match(/^(?:cari|temukan|carikan|tampilkan data|data)\s+(?:data\s+)?(siswa|anak|murid|guru|kelas)\s*(.*)$/);
    if (m) return { type: m[1] === 'anak' || m[1] === 'murid' ? 'siswa' : m[1], query: (m[2] || '').replace(/^(?:bernama|yang bernama|atas nama)\s+/, '').trim() };
    if (/^(daftar|tampilkan)\s+kelas(?:\s+semua)?$/.test(q)) return { type: 'kelas', query: '' };
    if (/^(ringkasan|rekap|jumlah)\s+absensi(?:\s+hari ini)?$/.test(q) || /^absensi hari ini$/.test(q)) return { type: 'attendance', query: '' };
    m = q.match(/^(?:cek|lihat|cari)\s+absensi\s+(.+?)(?:\s+hari ini)?$/);
    if (m) return { type: 'attendance', query: m[1] };
    m = q.match(/^absensi\s+(.+?)\s+hari ini$/);
    if (m) return { type: 'attendance', query: m[1] };
    return null;
  }

  async function bukaBacaProfilSiswa(query) {
    if (!loggedIn()) throw new Error('Sesi sekolah tidak aktif. Silakan masuk kembali.');
    if (!canOpen('siswa')) throw new Error('Akun ini tidak memiliki izin membaca Data Siswa.');
    var q = safeText(query).trim();
    if (!q) return 'Sebutkan nama lengkap atau nama panggilan siswa yang ingin dibuka profilnya.';
    if (currentView() !== 'siswa') {
      setActivity('Membuka menu Data Siswa melalui tombol aplikasi...', true);
      var pindah = await visibleNavigationClick('siswa');
      if (!pindah || stopRequested) return 'Pembukaan profil dihentikan.';
    }
    var root = document.getElementById('v');
    if (!root) throw new Error('Halaman Data Siswa tidak ditemukan.');
    var cocok = readStudentMatches(q);
    if (!cocok.length) return 'Tidak ditemukan siswa dengan nama atau nama panggilan "' + q + '".';
    if (cocok.length > 1) return 'Ada ' + cocok.length + ' siswa yang cocok dengan "' + q + '". Mohon sebutkan nama yang lebih lengkap:\\n' + cocok.map(function(s,i){return (i+1)+'. '+s.nama+' · Kelas '+(s.kelas||'-');}).join('\\n');
    var siswa = cocok[0];
    var pilihKelas = root.querySelector('select.select');
    if (pilihKelas) {
      var semua = Array.prototype.slice.call(pilihKelas.options).find(function(o){return normAI(o.textContent).replace(/[^a-z0-9 ]/g,'').trim()==='semua kelas';});
      if (semua && pilihKelas.value !== semua.value) {
        pilihKelas.classList.add('ai1486-focus');
        setActivity('Memilih Semua kelas pada filter Data Siswa...', true);
        pilihKelas.value = semua.value;
        pilihKelas.dispatchEvent(new Event('change',{bubbles:true}));
        await wait(220);
        pilihKelas.classList.remove('ai1486-focus');
      }
    }
    root = document.getElementById('v');
    var cari = root && root.querySelector('#q');
    if (cari) { cari.value = siswa.nama; cari.dispatchEvent(new Event('input',{bubbles:true})); await wait(100); }
    if (stopRequested) return 'Pembukaan profil dihentikan.';
    root = document.getElementById('v');
    var rows = root ? Array.prototype.slice.call(root.querySelectorAll('#sb tr')) : [];
    var target = rows.find(function(tr){return Array.prototype.some.call(tr.querySelectorAll('td'),function(td){return normAI(td.textContent).indexOf(normAI(siswa.nama))>=0;});});
    if (!target) return 'Data ' + siswa.nama + ' ditemukan, tetapi barisnya belum tampil pada tabel. Periksa filter kelas lalu coba lagi.';
    target.classList.add('ai1486-focus');
    setActivity('Membuka baris ' + siswa.nama + ' untuk melihat profil...', true);
    await wait(120);
    if (stopRequested) { target.classList.remove('ai1486-focus'); return 'Pembukaan profil dihentikan.'; }
    target.click();
    await wait(260);
    target.classList.remove('ai1486-focus');
    var modal=document.getElementById('md'),title=document.getElementById('mt');
    if(!modal||!modal.classList.contains('show')||!title||normAI(title.textContent)!=='ubah siswa') throw new Error('Popup profil siswa tidak berhasil dibuka melalui baris yang terlihat.');
    var body=document.getElementById('mbd'),details=[];
    Array.prototype.slice.call(body.querySelectorAll('.fd')).forEach(function(field){
      var label=field.querySelector('.l,label'),control=field.querySelector('input,select,textarea');
      if(!label||!control)return;
      var value=control.tagName.toLowerCase()==='select'?(control.options[control.selectedIndex]?control.options[control.selectedIndex].textContent:control.value):control.value;
      details.push(label.textContent.replace(/\\s+/g,' ').trim()+': '+(String(value||'').trim()||'-'));
    });
    return 'Profil siswa berhasil dibuka dan dibaca (tanpa perubahan):\\nNama: '+siswa.nama+'\\nKelas: '+(siswa.kelas||'-')+'\\nStatus: '+(siswa.aktif?'Aktif':'Nonaktif')+(details.length?'\\n'+details.join('\\n'):'')+'\\n\\nPopup profil tetap terbuka. Tidak ada kolom yang diubah dan tombol Simpan tidak ditekan.';
  }

  function readStudentMatches(query) {
    var q = normAI(query);
    if (!q) return [];
    return (S.siswa || []).filter(function (s) {
      return normAI(s.nama).indexOf(q) >= 0 || normAI(s.pan).indexOf(q) >= 0;
    }).sort(function (a, b) {
      var aa = normAI(a.nama), bb = normAI(b.nama);
      return (aa.indexOf(q) === 0 ? 0 : 1) - (bb.indexOf(q) === 0 ? 0 : 1) || aa.localeCompare(bb, 'id');
    }).slice(0, 8);
  }
  function readTaskResult(task) {
    if (!loggedIn()) throw new Error('Sesi sekolah tidak aktif. Silakan masuk kembali.');
    if (task.type === 'context') return pageContextText();
    if (task.type === 'profil_siswa') return bukaBacaProfilSiswa(task.query);
    if (task.type === 'siswa') {
      if (!canOpen('siswa')) throw new Error('Akun ini tidak memiliki izin membaca Data Siswa.');
      if (!task.query) {
        var semuaSiswa = (S.siswa || []).slice().sort(function (a, b) {
          return normAI(a.nama).localeCompare(normAI(b.nama), 'id');
        });
        if (!semuaSiswa.length) return 'Belum ada data siswa yang tersedia pada sesi ini. Pastikan menu Data Siswa sudah dimuat.';
        var batasSiswa = 20;
        return 'Daftar siswa terdaftar (' + semuaSiswa.length + ' siswa):\\n' +
          semuaSiswa.slice(0, batasSiswa).map(function (s, i) {
            return (i + 1) + '. ' + s.nama + ' · Kelas ' + (s.kelas || '-') + ' · ' + (s.aktif ? 'Aktif' : 'Nonaktif');
          }).join('\\n') +
          (semuaSiswa.length > batasSiswa ? '\\n… dan ' + (semuaSiswa.length - batasSiswa) + ' siswa lainnya.' : '') +
          '\\n\\nUntuk menemukan anak berdasarkan nama panggilan, minta saya: “Cari siswa [nama panggilan]”.';
      }
      var sis = readStudentMatches(task.query);
      if (!sis.length) return 'Tidak ditemukan siswa dengan nama atau nama panggilan “' + task.query + '”.';
      return 'Hasil pencarian siswa (' + sis.length + (sis.length === 8 ? ' atau lebih' : '') + '):\n' + sis.map(function (s, i) {
        return (i + 1) + '. ' + s.nama + ' · Kelas ' + (s.kelas || '-') + ' · ' + (s.aktif ? 'Aktif' : 'Nonaktif');
      }).join('\n');
    }
    if (task.type === 'guru') {
      if (!canOpen('guru')) throw new Error('Akun ini tidak memiliki izin membaca Data Guru.');
      if (!task.query) return 'Sebutkan nama guru yang ingin dicari. Contoh: “cari guru Ernietha”.';
      var gs = (S.guru || []).filter(function (g) {
        return normAI(g.nama).indexOf(normAI(task.query)) >= 0;
      }).sort(function (a, b) { return normAI(a.nama).localeCompare(normAI(b.nama), 'id'); }).slice(0, 8);
      if (!gs.length) return 'Tidak ditemukan guru dengan nama “' + task.query + '”.';
      return 'Hasil pencarian guru:\n' + gs.map(function (g, i) {
        return (i + 1) + '. ' + g.nama + ' · ' + (LBL[g.role] || g.role || 'Peran tidak diketahui') + ' · ' + (g.aktif ? 'Aktif' : 'Nonaktif');
      }).join('\n');
    }
    if (task.type === 'kelas') {
      if (!canOpen('kelasjam')) throw new Error('Akun ini tidak memiliki izin membaca data kelas.');
      var ks = (S.kelas || []).filter(function (k) { return !task.query || normAI(k.nama).indexOf(normAI(task.query)) >= 0; });
      if (!ks.length) return 'Kelas yang diminta tidak ditemukan.';
      return 'Data kelas:\n' + ks.map(function (k) {
        var n = (S.siswa || []).filter(function (s) { return s.aktif && s.kelas_id === k.id; }).length;
        return '• ' + k.nama + ' · ' + n + ' siswa aktif · Jam masuk ' + (k.jam || '-');
      }).join('\n');
    }
    if (task.type === 'attendance') {
      if (!canOpen('absensi')) throw new Error('Akun ini tidak memiliki izin membaca Absensi.');
      var date = TODAY;
      return muatRange(date, date).then(function () {
        var list = (S.siswa || []).filter(function (s) { return s.aktif; });
        if (task.query) {
          var found = readStudentMatches(task.query);
          if (!found.length) return 'Tidak ditemukan siswa dengan nama “' + task.query + '”.';
          return 'Status absensi ' + date + ':\n' + found.map(function (s) {
            return '• ' + s.nama + ' · Kelas ' + (s.kelas || '-') + ' · ' + dayStat(s, date);
          }).join('\n');
        }
        var counts = { Hadir: 0, Terlambat: 0, Izin: 0, Sakit: 0, Alpa: 0, Libur: 0, Belum: 0 };
        list.forEach(function (s) { var st = dayStat(s, date); counts[st] = (counts[st] || 0) + 1; });
        return 'Ringkasan absensi hari ini (' + date + '):\n' +
          'Total siswa aktif: ' + list.length + '\n' +
          Object.keys(counts).map(function (k) { return '• ' + k + ': ' + counts[k]; }).join('\n');
      });
    }
    throw new Error('Jenis pencarian belum didukung.');
  }

  async function handleCommand(raw) {
    var command = safeText(raw).trim();
    if (!command || busy) return;
    input.value = '';
    addMessage(command, 'user');
    panel.classList.remove('ai1486-open');
    busy = true;
    stopRequested = false;
    launcher.textContent = '✦ AI · Memahami…';
    launcher.setAttribute('aria-label', 'Hentikan proses Asisten AI');
    try {
      var interpreted = null, aiError = null;
      setActivity('Memahami maksud perintah dengan Gemini...', true);
      try {
        interpreted = await interpretWithGemini(command);
      } catch (e) {
        aiError = e;
      }
      if (stopRequested) {
        addMessage('Permintaan dihentikan. Tidak ada tindakan lanjutan yang dijalankan.');
        return;
      }

      var popup = document.getElementById('md');
      var popupActive = !!(popup && popup.classList.contains('show'));
      var fillTask = parseFillTask(command);
      if (!fillTask && interpreted && interpreted.intent === 'fill_form' && Array.isArray(interpreted.fields) && interpreted.fields.length) {
        fillTask = {
          type: 'fill',
          pairs: interpreted.fields.map(function (x) { return { label: safeText(x.label), value: safeText(x.value) }; })
            .filter(function (x) { return x.label.trim() && x.value.trim(); })
        };
      }
      if (popupActive && !fillTask) {
        addMessage('Popup formulir masih terbuka. Saya hanya akan mengisi kolom yang terlihat agar halaman tidak berpindah tanpa sengaja. Tutup popup secara manual jika ingin menjalankan perintah lain.');
        return;
      }

      if (fillTask) {
        setActivity('Mencocokkan kolom formulir yang terlihat...', true);
        var hasilIsi = fillVisibleForm(fillTask);
        if (stopRequested) addMessage('Permintaan dihentikan. Tidak ada tindakan lanjutan yang dijalankan.');
        else addMessage(hasilIsi, 'ai', 'Dipahami dengan Gemini atau pola perintah lokal. Tidak ada penyimpanan data.');
        return;
      }

      if (interpreted && interpreted.intent === 'navigate') {
        var idAI = safeText(interpreted.menu_id).trim() || resolveMenu(command);
        if (!idAI || !menus().some(function (m) { return m[0] === idAI; })) {
          addMessage(interpreted.reply || 'Saya belum dapat memastikan menu yang Anda maksud. Menu apa yang ingin dibuka?');
          return;
        }
        setActivity('Memeriksa hak akses ' + currentRole() + '...', true);
        if (!canOpen(idAI)) {
          addMessage('Menu ' + menuLabel(idAI) + ' tidak tersedia untuk role ' + currentRole() + ' atau fiturnya sedang nonaktif.');
          return;
        }
        var okAI = await visibleNavigationClick(idAI);
        if (stopRequested || !okAI) addMessage('Perintah dihentikan. Tidak ada tindakan lanjutan yang dijalankan.');
        else addMessage('Berhasil membuka menu ' + menuLabel(idAI) + '.', 'ai', 'Navigasi melalui tombol aplikasi dan halaman aktif telah diverifikasi.');
        return;
      }

      if (interpreted && interpreted.intent === 'read') {
        var mapRead = { context: 'context', siswa: 'siswa', profil_siswa: 'profil_siswa', guru: 'guru', kelas: 'kelas', attendance: 'attendance' };
        var tipeBaca = mapRead[interpreted.read_type];
        if (tipeBaca) {
          var queryBaca = safeText(interpreted.query);
          // Pengaman deterministik: permintaan daftar siswa tidak boleh berubah menjadi pencarian nama literal.
          if (tipeBaca === 'siswa' && /\\b(daftar|list)\\b.*\\b(siswa|anak|murid)\\b|\\b(tampilkan|perlihatkan|lihat)\\b.*\\b(semua|seluruh|daftar)\\b.*\\b(siswa|anak|murid)\\b|\\b(siswa|anak|murid)\\b.*\\b(semua|seluruh)\\b/.test(normAI(command))) queryBaca = '';
          setActivity('Memeriksa izin baca dan mengambil informasi dari aplikasi...', true);
          var hasilBaca = await readTaskResult({ type: tipeBaca, query: queryBaca });
          if (stopRequested) addMessage('Permintaan dihentikan. Tidak ada tindakan lanjutan yang dijalankan.');
          else addMessage(hasilBaca, 'ai', 'Sumber data: aplikasi Absensi 1486. Tidak ada data yang diubah.');
          return;
        }
      }

      if (interpreted && (interpreted.intent === 'answer' || interpreted.intent === 'clarify' || interpreted.intent === 'unknown')) {
        addMessage(interpreted.reply || 'Bisa dijelaskan sedikit lagi maksud permintaan Anda?');
        return;
      }

      // Cadangan deterministik: perintah lama tetap dapat digunakan bila Gemini sedang tidak tersedia.
      var taskLokal = parseReadTask(command);
      if (taskLokal) {
        setActivity('Mengambil informasi dari aplikasi...', true);
        var hasilLokal = await readTaskResult(taskLokal);
        if (stopRequested) addMessage('Permintaan dihentikan. Tidak ada tindakan lanjutan yang dijalankan.');
        else addMessage(hasilLokal, 'ai', 'Mode cadangan lokal. Tidak ada data yang diubah.');
        return;
      }
      var idLokal = resolveMenu(command);
      if (idLokal) {
        setActivity('Memeriksa hak akses ' + currentRole() + '...', true);
        if (!canOpen(idLokal)) {
          addMessage('Menu ' + menuLabel(idLokal) + ' tidak tersedia untuk role ' + currentRole() + ' atau fiturnya sedang nonaktif.');
          return;
        }
        var okLokal = await visibleNavigationClick(idLokal);
        if (stopRequested || !okLokal) addMessage('Perintah dihentikan. Tidak ada tindakan lanjutan yang dijalankan.');
        else addMessage('Berhasil membuka menu ' + menuLabel(idLokal) + '.', 'ai', 'Mode cadangan lokal. Navigasi diverifikasi.');
        return;
      }
      if (aiError) {
        addMessage('Gemini belum dapat dihubungi: ' + (aiError.message || 'terjadi kendala') + ' Perintah sederhana yang sudah dikenal masih dapat dijalankan dengan mode cadangan.');
      } else {
        addMessage('Saya belum yakin maksud permintaan tersebut. Bisa dijelaskan dengan kalimat lain?');
      }
    } catch (e) {
      if (stopRequested) addMessage('Permintaan dihentikan. Tidak ada tindakan lanjutan yang dijalankan.');
      else addMessage('Belum berhasil: ' + (e && e.message ? e.message : String(e)));
    } finally {
      activeRequestController = null;
      busy = false;
      stopRequested = false;
      launcher.innerHTML = '<span class="ai1486-orb">✦</span><span>Asisten AI</span>';
      launcher.setAttribute('aria-label', 'Buka Asisten AI');
      setActivity('', false);
      syncContext();
      panel.classList.add('ai1486-open');
      feed.scrollTop = feed.scrollHeight;
    }
  }
  function renderQuick() {
    quick.innerHTML = '';
    var ids = ['absensi', 'siswa', 'tabungan', 'rekap', 'profil'].filter(canOpen);
    ids.slice(0, 4).forEach(function (id) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = 'Buka ' + menuLabel(id);
      b.addEventListener('click', function () { handleCommand('Buka ' + menuLabel(id)); });
      quick.appendChild(b);
    });
  }

  launcher.addEventListener('click', function () {
    if (busy) {
      stopRequested = true;
      if (activeRequestController) activeRequestController.abort();
      launcher.textContent = 'Menghentikan…';
      launcher.setAttribute('aria-label', 'Menghentikan perintah');
      return;
    }
    panel.classList.toggle('ai1486-open');
    if (panel.classList.contains('ai1486-open')) {
      syncContext();
      input.focus();
    }
  });
  document.getElementById('ai1486-close').addEventListener('click', function () {
    panel.classList.remove('ai1486-open');
  });
  document.getElementById('ai1486-form').addEventListener('submit', function (e) {
    e.preventDefault();
    handleCommand(input.value);
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCommand(input.value);
    }
  });
  stopButton.addEventListener('click', function () {
    if (!busy) return;
    stopRequested = true;
    if (activeRequestController) activeRequestController.abort();
    setActivity('Permintaan berhenti diterima. Tidak ada tindakan berikutnya yang akan dijalankan.', true);
  });

  function syncVisibility() {
    var on = loggedIn();
    launcher.style.display = on ? 'inline-flex' : 'none';
    if (!on) panel.classList.remove('ai1486-open');
    syncContext();
    renderQuick();
  }
  var app = document.getElementById('ap');
  if (app && window.MutationObserver) {
    new MutationObserver(syncVisibility).observe(app, { attributes: true, attributeFilter: ['class'] });
  }
  var who = document.getElementById('who');
  if (who && window.MutationObserver) new MutationObserver(syncVisibility).observe(who, { childList: true, subtree: true, characterData: true });
  document.addEventListener('visibilitychange', syncVisibility);
  window.addEventListener('focus', syncVisibility);
  window.addEventListener('resize', renderQuick);
  syncVisibility();
})();