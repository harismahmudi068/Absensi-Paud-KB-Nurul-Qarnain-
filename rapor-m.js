/* =====================================================================
   rapor-m.js  -  Tahap 5: editor master indikator raport perkembangan.
   Dimuat setelah rapor-p.js. Memakai PKR/pkMuat (rapor-p.js), Rapor (rapor.js) dan variabel index
   (S, SEK, db, dbq, guard, toast, konfirmasi, esc, $, renderV, pnTry).
   Menyimpan lewat rpc rapor_master_simpan(p_kelompok, p_isi, p_versi, p_ringkas) (penjaga versi).
   Isi master: {aspek:[{n, sub:[{n, ind:[{id,t,kd,j,f,a,x}]}]}], kd:{id:{k}}, nomor, set, riwayat, ...}.
   Kunci lain (riwayat, v, skala, label, kelompok) dibiarkan apa adanya.
   ===================================================================== */
const PKME = { kid: 0, M: null, versi: 0, dirty: false, boleh: null, ro: true, buka: new Set(['aspek']), ring: '' };
(function () {
  const st = document.createElement('style');
  st.textContent = '.pmh{display:flex;justify-content:space-between;align-items:center;gap:6px;margin-bottom:4px;font-weight:800;font-size:13px}'
    + '.pmb{display:flex;gap:4px}.pmb button{padding:4px 9px;border-radius:8px;border:1px solid var(--bd);background:var(--card);color:var(--mu);font-weight:800}'
    + '.pmk{border-left:3px solid var(--bd);padding-left:8px;margin:10px 0}.pmx{margin-top:6px}.pmx textarea,.pmx input{margin-bottom:4px}'
    + '.pmd{color:var(--rd);font-weight:800;margin:6px 0}'
    + '.pmk .input,.pmk .select,.pki .input,.pki .select,.pkb>.input,.pkb>.select{display:block;width:100%;box-sizing:border-box;margin:0 0 12px}'
    + '.pmk textarea,.pki textarea,.pkb textarea{resize:vertical}'
    + '.pmk .pki{padding:12px 0}.pmx .mu{margin:10px 0 4px}.pmx label.l,.pkb label.l{display:block;margin:12px 0 4px;font-weight:800;font-size:12px}'
    + '.pmh{margin:10px 0 8px}.pkb .tb{margin-top:12px}.pmk>.pmh+.input{margin-top:0}'
    + '.pmpil{border:1px dashed var(--bd);border-radius:12px;padding:10px;margin:10px 0}.pmpr{display:flex;gap:8px;align-items:flex-start;padding:6px 0}.pmpr input{margin-top:3px}';
  document.head.appendChild(st);
})();

/* ---------------- Fungsi murni (diuji terpisah) ---------------- */
const pmKlon = o => JSON.parse(JSON.stringify(o));
const pmStr = v => String(v == null ? '' : v);
function pmNorm(M) {
  M = M && typeof M === 'object' && !Array.isArray(M) ? M : {};
  if (!Array.isArray(M.aspek)) M.aspek = [];
  M.aspek.forEach(a => { if (!Array.isArray(a.sub)) a.sub = []; a.sub.forEach(s => { if (!Array.isArray(s.ind)) s.ind = []; }); });
  if (!M.kd || typeof M.kd !== 'object' || Array.isArray(M.kd)) M.kd = {};
  M.nomor = Object.assign({ a: 'A', s: '1', i: '1', gabung: true }, M.nomor || {});
  return M;
}
/* id baru tidak pernah memakai ulang id yang pernah ada (penghitung ni/nk), supaya level lama di draf tidak menempel ke indikator baru */
function pmIdBaru(M, pre) {
  const key = pre === 'k' ? 'nk' : 'ni', re = new RegExp('^' + pre + '(\\d+)$'); let mx = +M[key] || 0;
  const cek = id => { const m = re.exec(String(id)); if (m) mx = Math.max(mx, +m[1]); };
  if (pre === 'k') Object.keys(M.kd).forEach(cek); else M.aspek.forEach(a => a.sub.forEach(s => s.ind.forEach(i => cek(i.id))));
  const n = mx + 1; M[key] = n; return pre + (n < 10 ? '0' + n : String(n));
}
/* tempelan Excel (TSV, sel berkutip untuk teks bertanda kutip atau baris baru) -> baris */
function pmTsv(t) {
  const rows = []; let r = [], c = '', q = false; t = String(t || '').replace(/\r\n?/g, '\n');
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { c += '"'; i++; } else q = false; } else c += ch; }
    else if (ch === '"' && c === '') q = true;
    else if (ch === '\t') { r.push(c); c = ''; }
    else if (ch === '\n') { r.push(c); rows.push(r); r = []; c = ''; }
    else c += ch;
  }
  if (c !== '' || r.length) { r.push(c); rows.push(r); }
  return rows.filter(r => r.some(x => x.trim() !== ''));
}
function pmKolom(rows) {
  const h = rows[0].map(x => x.trim().toLowerCase()), f = (...k) => h.findIndex(x => k.some(y => x.startsWith(y)));
  const iA = f('aspek'), iI = f('indikator'), iK = f('kategori', 'sub'), iD = f('kd', 'kompetensi');
  if (iA >= 0 && iI >= 0) return { head: true, a: iA, k: iK, i: iI, d: iD };
  const n = Math.max(...rows.map(r => r.length));
  if (n >= 4) return { head: false, a: 0, k: 1, i: 2, d: 3 };
  if (n === 3) return { head: false, a: 0, k: 1, i: 2, d: -1 };
  if (n === 2) return { head: false, a: 0, k: -1, i: 1, d: -1 };
  return null;
}
/* mode 'tambah': menambah ke master (indikator yang sama teksnya dilewati). mode 'ganti': isi master diganti, indikator berteks sama memakai id lama (nilai di draf tidak hilang) */
function pmTempel(M0, rows, mode) {
  if (!rows.length) throw new Error('File kosong');
  const col = pmKolom(rows); if (!col) throw new Error('File minimal 2 kolom: Aspek, Kategori (boleh kosong), Indikator, KD (boleh kosong)');
  const data = col.head ? rows.slice(1) : rows, M = pmNorm(pmKlon(M0));
  const cl = x => pmStr(x).replace(/\s*\n\s*/g, ' ').trim(), nk = x => cl(x).toLowerCase().replace(/\s+/g, ' ');
  const lama = new Map(); M.aspek.forEach(a => a.sub.forEach(s => s.ind.forEach(i => lama.set(nk(i.t), i))));
  const st = { baris: 0, baru: 0, dipakai: 0, lewat: 0, dibuang: 0, kdBaru: 0, aspek: 0, kat: 0 };
  const kdId = lab => {
    lab = cl(lab); if (!lab) return '';
    const ada = Object.keys(M.kd).find(k => nk(M.kd[k].k) === nk(lab)); if (ada) return ada;
    const id = pmIdBaru(M, 'k'); M.kd[id] = { k: lab }; st.kdBaru++; return id;
  };
  const out = mode === 'ganti' ? [] : M.aspek, lihat = new Set(), pakai = new Set();
  let pa = '', pk = '';
  data.forEach(r => {
    const t = cl(r[col.i]); if (!t) return; st.baris++;
    let an = col.a >= 0 ? cl(r[col.a]) : '', kn = col.k >= 0 ? cl(r[col.k]) : '';
    const aBaru = !!an && nk(an) !== nk(pa); if (!an) an = pa;
    if (!an) throw new Error('Indikator "' + t.slice(0, 40) + '" belum punya aspek');
    if (!kn && !aBaru) kn = pk; pa = an; pk = kn;
    const key = nk(t); if (lihat.has(key)) { st.lewat++; return; } lihat.add(key);
    const L = lama.get(key), kdl = col.d >= 0 ? kdId(r[col.d]) : '';
    if (mode !== 'ganti' && L) { st.lewat++; return; }
    let a = out.find(x => nk(x.n) === nk(an)); if (!a) { a = { n: an, sub: [] }; out.push(a); st.aspek++; }
    let s = a.sub.find(x => nk(x.n) === nk(kn)); if (!s) { s = { n: kn, ind: [] }; a.sub.push(s); st.kat++; }
    if (mode === 'ganti' && L && !pakai.has(L.id)) { pakai.add(L.id); const c = pmKlon(L); c.t = t; if (kdl) c.kd = kdl; s.ind.push(c); st.dipakai++; }
    else { const c = { id: pmIdBaru(M, 'i'), t }; if (kdl) c.kd = kdl; s.ind.push(c); st.baru++; }
  });
  if (!st.baris) throw new Error('Tidak ada baris indikator yang terbaca');
  if (mode === 'ganti') { st.dibuang = lama.size - st.dipakai; M.aspek = out; }
  return { M, st };
}
/* validasi dan pembersihan sebelum disimpan; melempar Error berisi daftar masalah */
function pmCek(M0) {
  const M = pmNorm(pmKlon(M0)), err = [], ids = new Set();
  if (!M.aspek.length) throw new Error('Master belum punya aspek');
  let jml = 0;
  M.aspek.forEach((a, ai) => {
    a.n = pmStr(a.n).trim(); if (!a.n) err.push('Aspek ke-' + (ai + 1) + ' belum bernama');
    a.sub.forEach(s => {
      s.n = pmStr(s.n).trim(); if (!s.ind.length) err.push('Kategori kosong pada aspek ' + (a.n || ai + 1));
      s.ind.forEach(i => {
        jml++; i.t = pmStr(i.t).trim(); if (!i.t) err.push('Ada indikator tanpa teks pada aspek ' + (a.n || ai + 1));
        if (!i.id || ids.has(i.id)) err.push('ID indikator ganda atau kosong'); ids.add(i.id);
        if (i.kd && !M.kd[i.kd]) delete i.kd; if (!i.kd) delete i.kd;
        ['f', 'a'].forEach(k => { i[k] = pmStr(i[k]).trim(); if (!i[k]) delete i[k]; });
        if (i.j !== 'p' && i.j !== 'u') delete i.j;
        if (i.x && typeof i.x === 'object') { Object.keys(i.x).forEach(l => { i.x[l] = pmStr(i.x[l]).trim(); if (!i.x[l]) delete i.x[l]; }); if (!Object.keys(i.x).length) delete i.x; } else delete i.x;
      });
    });
  });
  if (!jml) err.push('Master belum punya indikator');
  Object.keys(M.kd).forEach(k => { M.kd[k].k = pmStr(M.kd[k].k).trim(); if (!M.kd[k].k) err.push('Ada KD tanpa kode'); });
  const ok = new Set(['A', 'a', '1', 'I', 'i', '']);
  ['a', 's', 'i'].forEach(k => { if (!ok.has(M.nomor[k])) err.push('Gaya penomoran tidak dikenal'); });
  M.nomor.gabung = !!M.nomor.gabung;
  const b = M.set && M.set.pend && M.set.pend.batas;
  if (b && !(b.length === 3 && b.every(x => x >= 1 && x <= 4) && b[0] < b[1] && b[1] < b[2])) err.push('Batas rata-rata catatan harus 3 angka naik antara 1 dan 4');
  if (M.set && !Object.keys(M.set).length) delete M.set;
  if (err.length) throw new Error([...new Set(err)].slice(0, 4).join('. '));
  return M;
}

/* ---------------- Keadaan dan pembuka ---------------- */
function pmMuatDari(row, kid) {
  if (kid) PKME.kid = kid;
  PKME.M = pmNorm(row ? pmKlon(row.isi) : { aspek: [], kd: {} }); PKME.versi = row ? (row.versi || 0) : 0; PKME.dirty = false; PKME.ring = ''; PKME.pil = null; PKME.pilKd = null;
  PKME.kd0 = {}; Object.keys(PKME.M.kd).forEach(id => { PKME.kd0[id] = pmStr(PKME.M.kd[id].k).trim(); });
}
const pmUbah = () => { PKME.dirty = true; const e = $('#pmDirty'); if (e) e.style.display = ''; };
function pmBuka(kid) {
  if (!PKR.kel.find(x => x.id === kid)) return;
  guard(async () => {
    if (PKME.boleh === null) { try { PKME.boleh = !!(await dbq(db.rpc('rapor_master_boleh_tulis', { p_sekolah: SEK }))); } catch (e) { PKME.boleh = false; } }
    if (!(PKME.dirty && PKME.kid === kid && PKME.M)) { await pkMuat(); pmMuatDari(PKR.mas.get(kid), kid); PKME.buka = new Set(['aspek']); }
    PKME.ro = !PKME.boleh; pmRender();
  });
}
function pmBuang() {
  guard(async () => {
    if (PKME.dirty && !await konfirmasi('Buang semua perubahan yang belum disimpan dan muat versi terbaru dari server?', { judul: 'Buang perubahan', ya: 'Buang', bahaya: 1, ikon: '↩️' })) return;
    await pkMuat(); pmMuatDari(PKR.mas.get(PKME.kid), PKME.kid); pmRender();
  });
}
const pmTog = (k, o) => { if (o) PKME.buka.add(k); else PKME.buka.delete(k); };

/* ---------------- Tampilan ---------------- */
const pmIn = (js, v, ph, ro) => `<input class="input" value="${esc(pmStr(v))}" placeholder="${esc(ph || '')}" onchange="${js}"${ro ? ' disabled' : ''}>`;
const pmTa = (js, v, r, ro, ph) => `<textarea class="input" rows="${r || 2}" placeholder="${esc(ph || '')}" onchange="${js}"${ro ? ' disabled' : ''}>${esc(pmStr(v))}</textarea>`;
const pmDet = (k, judul, isi) => `<details class="pkas" ontoggle="pmTog('${k}',this.open)"${PKME.buka.has(k) ? ' open' : ''}><summary><span>${judul}</span></summary><div class="pkb">${isi}</div></details>`;
const pmBtn = (js, t, ro) => ro ? '' : `<button type="button" onclick="${js}">${t}</button>`;
const PM_NOM = [['A', 'A, B, C'], ['a', 'a, b, c'], ['1', '1, 2, 3'], ['I', 'I, II, III'], ['i', 'i, ii, iii'], ['', 'Tanpa nomor']];
const PM_JENIS = [['', 'Biasa (belum/mulai/sudah bisa ...)'], ['p', 'Perilaku (tanpa kata "bisa")'], ['u', 'Ukuran (pertumbuhan, memakai acuan)']];

function pmHtmlInd(M, ai, si, ii, i, ro, no) {
  const kd = '<option value="">(tanpa KD)</option>' + Object.keys(M.kd).map(id => `<option value="${esc(id)}"${i.kd === id ? ' selected' : ''}>${esc(M.kd[id].k)}</option>`).join('');
  const sel = (js, o, v) => `<select class="select" onchange="${js}"${ro ? ' disabled' : ''}>${o.map(x => `<option value="${esc(x[0])}"${(v || '') === x[0] ? ' selected' : ''}>${esc(x[1])}</option>`).join('')}</select>`;
  const S = Rapor.pengaturan(M), x = i.x || {};
  const lanjut = `<div class="pmx"><label class="l">Jenis kalimat capaian</label>${sel(`pmSetI(${ai},${si},${ii},'j',this.value)`, PM_JENIS, i.j)}`
    + `<label class="l">Frasa capaian (kosong = diambil dari teks indikator)</label>${pmTa(`pmSetI(${ai},${si},${ii},'f',this.value)`, i.f, 2, ro)}`
    + (i.j === 'u' ? `<label class="l">Acuan (jenis Ukuran)</label>${pmIn(`pmSetI(${ai},${si},${ii},'a',this.value)`, i.a, 'contoh: standar WHO', ro)}` : '')
    + `<label class="l">Kalimat khusus per level (boleh kosong; {n} = nama anak)</label>`
    + [1, 2, 3, 4].map(l => `<div class="mu">${esc(S.lv[l])}</div>${pmTa(`pmSetX(${ai},${si},${ii},${l},this.value)`, x[l], 2, ro)}`).join('') + '</div>';
  return `<div class="pki"><div class="pmh"><span>${esc(no)}</span><span class="pmb">${pmBtn(`pmGeser('i',${ai},${si},${ii},-1)`, '↑', ro)}${pmBtn(`pmGeser('i',${ai},${si},${ii},1)`, '↓', ro)}${pmBtn(`pmHapus('i',${ai},${si},${ii})`, '🗑', ro)}</span></div>`
    + pmTa(`pmSetI(${ai},${si},${ii},'t',this.value)`, i.t, 3, ro, 'Teks indikator') + `<select class="select" onchange="pmSetI(${ai},${si},${ii},'kd',this.value)"${ro ? ' disabled' : ''}>${kd}</select>`
    + pmDet('l' + i.id, 'Lanjutan', lanjut) + '</div>';
}
function pmHtmlAspek(M, ro) {
  const nm = M.nomor;
  return M.aspek.map((a, ai) => {
    const na = Rapor.nomorFmt(nm.a, ai + 1); let ik = 0, jml = 0;
    const subs = a.sub.map((s, si) => {
      const jdl = !!pmStr(s.n).trim(); if (jdl) ik++;
      const nk = jdl ? (nm.gabung && na ? na + '.' : '') + Rapor.nomorFmt(nm.s, ik) : '';
      jml += s.ind.length;
      return `<div class="pmk"><div class="pmh"><span>Kategori ${esc(nk)}</span><span class="pmb">${pmBtn(`pmGeser('s',${ai},${si},0,-1)`, '↑', ro)}${pmBtn(`pmGeser('s',${ai},${si},0,1)`, '↓', ro)}${pmBtn(`pmHapus('s',${ai},${si})`, '🗑', ro)}</span></div>`
        + pmIn(`pmSetS(${ai},${si},this.value)`, s.n, 'Judul kategori (kosongkan bila tanpa judul)', ro)
        + s.ind.map((i, ii) => pmHtmlInd(M, ai, si, ii, i, ro, Rapor.nomorFmt(nm.i, ii + 1) || '•')).join('')
        + (ro ? '' : `<div class="tb"><button class="btn soft sm" onclick="pmTambah('i',${ai},${si})">➕ Indikator</button></div>`) + '</div>';
    }).join('');
    return pmDet('a' + ai, `${esc(na ? na + '. ' : '')}${esc(a.n || '(belum bernama)')} <span class="mu">${jml} indikator</span>`,
      `<div class="pmh"><span>Nama aspek</span><span class="pmb">${pmBtn(`pmGeser('a',${ai},0,0,-1)`, '↑', ro)}${pmBtn(`pmGeser('a',${ai},0,0,1)`, '↓', ro)}${pmBtn(`pmHapus('a',${ai})`, '🗑', ro)}</span></div>`
      + pmIn(`pmSetA(${ai},this.value)`, a.n, 'Nama aspek', ro) + subs + (ro ? '' : `<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm" onclick="pmTambah('s',${ai})">➕ Kategori</button><button class="btn soft sm" onclick="pmPilBuka('s',${ai})">📋 Pilih dari yang ada</button></div>` + pmPilHtml('s', ai)));
  }).join('') + (ro ? '' : '<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm" onclick="pmTambah(\'a\')">➕ Aspek</button><button class="btn soft sm" onclick="pmPilBuka(\'a\')">📋 Pilih dari yang ada</button></div>' + pmPilHtml('a'));
}
const PM_CFG = [
  ['Singkatan level', [['lv', 4, 0]]],
  ['Kata capaian (Ananda ... {kata} bisa ...)', [['aw', 4, 0], ['bisa', 0, 0]]],
  ['Kalimat capaian jenis Ukuran ({F} fokus, {N} nama, {A} acuan)', [['u', 4, 1]]],
  ['Catatan per indikator', [['cat', 4, 1]]],
  ['Catatan per indikator jenis Ukuran', [['cat_u', 4, 1]]],
  ['Catatan pendidik otomatis', [['pend.batas', 3, 0, 'Batas rata-rata (3 angka naik antara 1 dan 4)'], ['pend.umum', 4, 1, 'Kalimat umum per rentang'], ['pend.unggul', 0, 1, 'Aspek unggul ({X} = daftar aspek)'], ['pend.perhatian', 0, 1, 'Aspek perlu perhatian ({X})'], ['pend.penutup', 2, 1, 'Kalimat penutup (rendah, tinggi)']]],
  ['Baris pertumbuhan fisik', [['tumbuh', 4, 0]]]
];
function pmHtmlSet(M, ro) {
  const S = Rapor.pengaturan(M), get = p => p.split('.').reduce((o, k) => o[k], S);
  let h = '<div class="mu">Teks ini membentuk kalimat capaian dan catatan otomatis. Isi semua kolom; tombol Kembalikan bawaan di bawah mengulang dari awal.</div>';
  PM_CFG.forEach(g => {
    h += `<div class="tbkh">${esc(g[0])}</div>`;
    g[1].forEach(([p, n, ta, jdl]) => {
      const path = p.split('.'), v = get(p); if (jdl) h += `<div class="mu">${esc(jdl)}</div>`;
      const js = idx => `pmSetCfg(${JSON.stringify(path.concat(idx === null ? [] : [idx])).replace(/"/g, "'")},this.value)`;
      if (!n) h += ta ? pmTa(js(null), v, 2, ro) : pmIn(js(null), v, '', ro);
      else { const keys = Array.isArray(v) ? v.map((_, i) => i) : [1, 2, 3, 4]; keys.forEach(k => { h += `<div class="mu">${p === 'pend.batas' ? 'Batas ' + (k + 1) : (p.startsWith('pend.') || p === 'tumbuh') ? 'Ke-' + (+k + 1) : esc(S.lv[k])}</div>` + (ta ? pmTa(js(k), v[k], 2, ro) : pmIn(js(k), v[k], '', ro)); }); }
    });
  });
  let i0 = null; M.aspek.some(a => a.sub.some(s => s.ind.some(i => (i0 = i, true))));
  i0 = i0 || { t: 'Contoh indikator' };
  h += '<div class="tbkh">Pratinjau (indikator pertama)</div>' + [1, 2, 3, 4].map(l => `<div class="pkc"><b>${esc(S.lv[l])}</b> ${esc(Rapor.cap(i0, l, 'Rani', S))}<br><span class="mu">${esc(Rapor.catI(i0, l, S))}</span></div>`).join('');
  return h + (ro ? '' : '<div class="tb"><button class="btn soft sm" onclick="pmResetSet()">↺ Kembalikan bawaan</button></div>');
}
function pmHtmlRiwayat(M) {
  const r = Array.isArray(M.riwayat) ? M.riwayat.slice() : []; if (!r.length) return '<div class="mu">Belum ada riwayat.</div>';
  const nv = e => +(e && (e.v != null ? e.v : e.versi)) || 0; if (r.some(nv)) r.sort((a, b) => nv(b) - nv(a));
  const f = (e, ks) => { for (const k of ks) if (e && e[k] != null && e[k] !== '') return pmStr(e[k]); return ''; };
  return r.map(e => { const t = f(e, ['t', 'tgl', 'waktu', 'at', 'diubah']), isi = [nv(e) ? 'v' + nv(e) : '', t ? fmt(t.slice(0, 10)) : '', f(e, ['oleh', 'o', 'nama']), f(e, ['ringkas', 'r', 'ket'])].filter(Boolean).join(' · '); return `<div class="pki">${esc(isi || JSON.stringify(e))}</div>`; }).join('');
}
function pmRender() {
  const M = PKME.M, ro = PKME.ro, k = PKR.kel.find(x => x.id === PKME.kid) || {}, nm = M.nomor;
  const sc = [$('#mbd').scrollTop, $('#md').scrollTop];
  const sel = (js, v) => `<select class="select" onchange="${js}"${ro ? ' disabled' : ''}>${PM_NOM.map(o => `<option value="${esc(o[0])}"${(v || '') === o[0] ? ' selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`;
  const ex = `${Rapor.nomorFmt(nm.a, 1)}${nm.gabung && nm.a ? '.' : ''}${Rapor.nomorFmt(nm.s, 1)}`;
  const nomor = `<div class="fd"><label class="l">Nomor aspek</label>${sel("pmSetNom('a',this.value)", nm.a)}</div><div class="fd"><label class="l">Nomor kategori</label>${sel("pmSetNom('s',this.value)", nm.s)}</div><div class="fd"><label class="l">Nomor indikator</label>${sel("pmSetNom('i',this.value)", nm.i)}</div>`
    + `<label class="l"><input type="checkbox" onchange="pmSetNom('gabung',this.checked)"${nm.gabung ? ' checked' : ''}${ro ? ' disabled' : ''}> Nomor kategori digabung dengan nomor aspek (contoh ${esc(ex || '-')})</label>`;
  const kd = Object.keys(M.kd).map(id => `<div class="pmh">${pmIn(`pmSetKd('${esc(id)}',this.value)`, M.kd[id].k, 'Kode KD, misalnya 3.1', ro)}${pmBtn(`pmHapusKd('${esc(id)}')`, '🗑', ro)}</div>`).join('') + (ro ? '' : '<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm" onclick="pmTambahKd()">➕ KD</button><button class="btn soft sm" onclick="pmPilKdBuka()">📋 Pilih dari KD kelompok lain</button></div>' + pmPilKdHtml());
  const tempel = ro ? '<div class="mu">Hanya pemilik hak ubah yang dapat mengimpor.</div>'
    : '<div class="mu">1. Unduh template, lalu isi kolom <b>Aspek | Kategori | Indikator | KD</b> (Kategori dan KD boleh kosong; sel Aspek/Kategori yang kosong ikut baris di atasnya). Bila master sudah berisi indikator, template ikut memuatnya.<br>2. Pilih cara, lalu impor file Excel yang sudah diisi. Hasilnya diterapkan ke layar dulu dan baru tersimpan setelah Anda menekan Simpan.</div>'
    + '<div class="tb" style="margin:10px 0"><button class="btn soft" onclick="pmUnduhTemplate()">⬇ Unduh template XLSX</button></div>'
    + '<div class="fd"><label class="l">Cara</label><select id="pmMode" class="select tanpa-cari"><option value="tambah">Tambahkan ke master (lewati yang sudah ada)</option><option value="ganti">Ganti seluruh isi master (nilai lama tetap dipakai)</option></select></div>'
    + '<div class="tb"><button class="btn success" onclick="pmPilihFile()">📂 Impor dari Excel</button></div><input type="file" id="pmFile" accept=".xlsx,.xls" class="hid" onchange="pmImporFile(this)">';
  let h = `<div class="note">Kelompok <b>${esc(k.nama || '')}</b> · ${PKME.versi ? 'versi ' + PKME.versi : 'belum ada master'}${ro ? ' · <b>hanya lihat</b>' : ''}<br>Perubahan memengaruhi draf. Raport yang sudah terbit tetap memakai salinan lamanya sampai diterbitkan ulang dengan indikator terbaru.</div>`;
  if (!ro && (PKME.sinkron || []).length) h += `<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ Perubahan kode KD belum terterapkan di: <b>${esc([...new Set(PKME.sinkron.map(g => g.nama))].join(', '))}</b>.<br>${esc(PKME.sinkron[0].pesan || '')}<div class="tb" style="margin-top:8px"><button class="btn soft sm" onclick="pmKdSebarUlang()">🔄 Ulangi</button></div></div>`;
  if (!ro) h += `<div class="pmd" id="pmDirty" style="${PKME.dirty ? '' : 'display:none'}">● Ada perubahan yang belum disimpan</div><div class="fd" style="margin-bottom:14px"><input class="input" style="margin-bottom:0" maxlength="120" placeholder="Ringkasan perubahan (opsional)" value="${esc(PKME.ring)}" onchange="PKME.ring=this.value"></div><div class="tb" style="flex-wrap:wrap;gap:10px;margin-bottom:16px"><button class="btn success grow" onclick="pmSimpan()">💾 Simpan master</button><button class="btn soft grow" onclick="pmBuang()">↩️ Buang perubahan</button></div>`;
  h += pmDet('aspek', 'Aspek, kategori, dan indikator', pmHtmlAspek(M, ro)) + pmDet('kd', 'Kompetensi Dasar (KD)', kd + '<div class="mu">KD dipilih per indikator dan tampil pada kolom KD raport. KD bersifat bersama satu sekolah: mengubah kode KD di sini (lalu Simpan master) otomatis mengubah KD yang sama di semua kelompok lain.</div>') + pmDet('nomor', 'Penomoran', nomor)
    + pmDet('set', 'Teks otomatis (kalimat capaian dan catatan)', pmHtmlSet(M, ro)) + pmDet('tempel', 'Impor dan template XLSX', tempel) + pmDet('riw', 'Riwayat perubahan', pmHtmlRiwayat(M));
  $('#mt').textContent = 'Indikator · ' + (k.nama || ''); const ms = $('#ms'); if (ms) { if (!ro) { ms.style.display = ''; ms.textContent = '💾 Simpan'; ms.className = 'btn success'; ms.disabled = false; ms.onclick = () => pmSimpan(); } else ms.style.display = 'none'; } $('#mbd').innerHTML = h; $('#mbd').querySelectorAll('select[disabled]').forEach(x => { x.dataset.cselReady = '1'; }); if (typeof enhanceCustomSelects === 'function') enhanceCustomSelects($('#mbd')); $('#md').classList.add('besar'); $('#md').classList.add('show');
  if (!ro) jagaKhusus({ ket: 'Master indikator', kotor: () => PKME.dirty, simpan: () => pmSimpan(), abaikan: () => { PKME.dirty = false; } }); else jagaModal(0, 0, false);
  $('#mbd').scrollTop = sc[0]; $('#md').scrollTop = sc[1];
}

/* ---------------- Pengubah ---------------- */
const pmA = ai => PKME.M.aspek[ai], pmS = (ai, si) => PKME.M.aspek[ai].sub[si], pmI = (ai, si, ii) => PKME.M.aspek[ai].sub[si].ind[ii];
function pmSetA(ai, v) { pmA(ai).n = v; pmUbah(); }
function pmSetS(ai, si, v) { pmS(ai, si).n = v; pmUbah(); }
function pmSetI(ai, si, ii, k, v) { const i = pmI(ai, si, ii); if (k === 'kd' && !v) delete i.kd; else i[k] = v; pmUbah(); if (k === 'j') pmRender(); }
function pmSetX(ai, si, ii, l, v) { const i = pmI(ai, si, ii); i.x = i.x || {}; i.x[l] = v; pmUbah(); }
function pmSetKd(id, v) { PKME.M.kd[id].k = v; pmUbah(); }
function pmSetNom(k, v) { PKME.M.nomor[k] = v; pmUbah(); pmRender(); }
function pmSetCfg(path, v) {
  const M = PKME.M, S0 = Rapor.pengaturan(M); M.set = M.set || {};
  if (M.set[path[0]] === undefined) M.set[path[0]] = pmKlon(S0[path[0]]);
  let o = M.set; for (let i = 0; i < path.length - 1; i++) o = o[path[i]];
  const last = path[path.length - 1];
  o[last] = path[0] === 'pend' && path[1] === 'batas' ? parseFloat(String(v).replace(',', '.')) : v; pmUbah();
}
function pmResetSet() { guard(async () => { if (!await konfirmasi('Kembalikan semua teks otomatis ke bawaan?', { judul: 'Teks otomatis', ya: 'Kembalikan', ikon: '↺' })) return; delete PKME.M.set; pmUbah(); pmRender(); }); }
function pmTambah(t, ai, si) {
  const M = PKME.M;
  if (t === 'a') { M.aspek.push({ n: 'Aspek baru', sub: [{ n: '', ind: [] }] }); PKME.buka.add('a' + (M.aspek.length - 1)); }
  else if (t === 's') pmA(ai).sub.push({ n: 'Kategori baru', ind: [] });
  else { const i = { id: pmIdBaru(M, 'i'), t: '' }; pmS(ai, si).ind.push(i); PKME.buka.add('a' + ai); }
  pmUbah(); pmRender();
}
function pmTambahKd() { const id = pmIdBaru(PKME.M, 'k'); PKME.M.kd[id] = { k: '' }; pmUbah(); pmRender(); }
function pmHapusKd(id) {
  guard(async () => {
    const dipakai = []; PKME.M.aspek.forEach(a => a.sub.forEach(s => s.ind.forEach(i => { if (i.kd === id) dipakai.push(i); })));
    if (dipakai.length && !await konfirmasi('KD ini dipakai ' + dipakai.length + ' indikator. Hapus KD dan lepaskan dari indikator tersebut?', { judul: 'Hapus KD', ya: 'Hapus', bahaya: 1 })) return;
    dipakai.forEach(i => { delete i.kd; }); delete PKME.M.kd[id]; pmUbah(); pmRender();
  });
}
/* ---- Pilih aspek/kategori dari yang sudah ada (kelompok ini dan kelompok lain). Struktur saja; indikator (beserta KD) opsional ---- */
function pmPilSumber() {
  const L = PKR.kel.filter(k => k.id === PKME.kid || PKR.mas.has(k.id));
  L.sort((a, b) => (b.id === PKME.kid) - (a.id === PKME.kid));
  return L.map(k => ({ kid: k.id, nama: k.nama, M: k.id === PKME.kid ? PKME.M : pmNorm(pmKlon(PKR.mas.get(k.id).isi)) }));
}
const pmPilRow = (key, judul, ket, p) => `<label class="pmpr"><input type="checkbox" onchange="pmPilCek('${esc(key)}',this.checked)"${p.sel.has(key) ? ' checked' : ''}> <span><b>${esc(judul)}</b><span class="mu"> · ${esc(ket)}</span></span></label>`;
function pmPilHtml(t, ai) {
  const p = PKME.pil; if (PKME.ro || !p || p.t !== t || (t === 's' && p.ai !== ai)) return '';
  let h = '';
  pmPilSumber().forEach(g => {
    let rows = '';
    g.M.aspek.forEach((a, i2) => {
      if (t === 'a') rows += pmPilRow(g.kid + '|' + i2, pmStr(a.n).trim() || '(belum bernama)', a.sub.filter(s => pmStr(s.n).trim()).length + ' kategori · ' + a.sub.reduce((x, s) => x + s.ind.length, 0) + ' indikator', p);
      else a.sub.forEach((s, s2) => { if (pmStr(s.n).trim()) rows += pmPilRow(g.kid + '|' + i2 + '|' + s2, s.n, (pmStr(a.n).trim() || '(aspek)') + ' · ' + s.ind.length + ' indikator', p); });
    });
    if (rows) h += `<div class="mu" style="margin:10px 0 4px"><b>${esc(g.nama)}</b>${g.kid === PKME.kid ? ' (kelompok ini)' : ''}</div>` + rows;
  });
  if (!h) h = '<div class="mu">Belum ada ' + (t === 'a' ? 'aspek' : 'kategori') + ' di kelompok ini maupun kelompok lain.</div>';
  return `<div class="pmpil"><div class="pmh"><span>Pilih ${t === 'a' ? 'aspek' : 'kategori'} yang sudah ada</span></div>${h}<label class="l"><input type="checkbox" onchange="PKME.pil.ind=this.checked"${p.ind ? ' checked' : ''}> Ikut salin indikator (beserta KD)</label><div class="mu">Tanpa centang ini hanya nama ${t === 'a' ? 'aspek dan kategorinya' : 'kategori'} yang disalin. Nama yang sudah ada dilewati.</div><div class="tb" style="flex-wrap:wrap;gap:10px"><button class="btn success grow" onclick="pmPilTambah()">➕ Tambahkan yang dipilih</button><button class="btn soft grow" onclick="pmPilTutup()">Batal</button></div></div>`;
}
function pmPilBuka(t, ai) {
  if (PKME.ro) return;
  const p = PKME.pil; if (p && p.t === t && (t === 'a' || p.ai === ai)) PKME.pil = null;
  else { PKME.pil = { t, ai: t === 's' ? ai : 0, sel: new Set(), ind: false }; PKME.buka.add('aspek'); if (t === 's') PKME.buka.add('a' + ai); }
  pmRender();
}
function pmPilTutup() { PKME.pil = null; pmRender(); }
function pmPilCek(key, on) { if (!PKME.pil) return; if (on) PKME.pil.sel.add(key); else PKME.pil.sel.delete(key); }
function pmPilTambah() {
  const p = PKME.pil, M = PKME.M; if (!p || PKME.ro) return;
  if (!p.sel.size) return toast('Centang dulu yang ingin ditambahkan', false);
  const src = pmPilSumber(), norm = x => pmStr(x).replace(/\s+/g, ' ').trim().toLowerCase();
  let nA = 0, nS = 0, nI = 0, lewat = 0;
  /* KD ikut terbawa: dicocokkan dengan kode yang sama di master ini, bila belum ada dibuat baru */
  const kdId = (SM, id) => {
    const k = SM.kd[id]; if (!k) return null;
    const ada = norm(k.k) ? Object.keys(M.kd).find(x => norm(M.kd[x].k) === norm(k.k)) : null;
    if (ada) return ada;
    const nid = pmIdBaru(M, 'k'); M.kd[nid] = pmKlon(k); return nid;
  };
  const salinSub = (SM, s) => {
    const o = { n: s.n, ind: [] };
    if (p.ind) s.ind.forEach(i => { const c = pmKlon(i); c.id = pmIdBaru(M, 'i'); if (i.kd) { const nk = kdId(SM, i.kd); if (nk) c.kd = nk; else delete c.kd; } o.ind.push(c); nI++; });
    return o;
  };
  const cari = kid => src.find(g => g.kid === +kid);
  [...p.sel].forEach(key => {
    const [kid, i2, s2] = key.split('|'), g = cari(kid), a = g && g.M.aspek[+i2]; if (!a) return;
    if (p.t === 'a') {
      if (M.aspek.some(x => norm(x.n) === norm(a.n))) { lewat++; return; }
      const subs = a.sub.filter(s => p.ind || pmStr(s.n).trim()).map(s => salinSub(g.M, s));
      if (!subs.length) subs.push({ n: '', ind: [] });
      M.aspek.push({ n: a.n, sub: subs }); nA++; nS += subs.filter(s => pmStr(s.n).trim()).length; PKME.buka.add('a' + (M.aspek.length - 1));
    } else {
      const s = a.sub[+s2], T = pmA(p.ai); if (!s || !T) return;
      if (T.sub.some(x => norm(x.n) === norm(s.n))) { lewat++; return; }
      T.sub.push(salinSub(g.M, s)); nS++;
    }
  });
  PKME.pil = null;
  if (nA || nS || nI) pmUbah();
  pmRender();
  toast((nA ? nA + ' aspek, ' : '') + nS + ' kategori, ' + nI + ' indikator ditambahkan' + (lewat ? '. ' + lewat + ' dilewati karena namanya sudah ada' : '') + '. Tekan Simpan master untuk menyimpan', !!(nA || nS || nI));
}
/* ---- Master KD bersama: ambil KD dari kelompok lain (gabungan semua kelompok), tanpa mengetik satu per satu ---- */
const pmNormKd = x => pmStr(x).replace(/\s+/g, ' ').trim().toLowerCase();
function pmKdSumber() {
  const ada = new Set(Object.values(PKME.M.kd).map(x => pmNormKd(x.k))), m = new Map();
  PKR.kel.forEach(k => {
    if (k.id === PKME.kid || !PKR.mas.has(k.id)) return;
    Object.values(pmNorm(pmKlon(PKR.mas.get(k.id).isi)).kd).forEach(x => {
      const c = pmNormKd(x.k); if (!c || ada.has(c)) return;
      if (!m.has(c)) m.set(c, { d: pmKlon(x), dari: [] });
      const e = m.get(c); if (!e.dari.includes(k.nama)) e.dari.push(k.nama);
    });
  });
  return [...m.values()].sort((a, b) => pmStr(a.d.k).localeCompare(pmStr(b.d.k), 'id', { numeric: true }));
}
function pmPilKdHtml() {
  const p = PKME.pilKd; if (PKME.ro || !p) return '';
  const rows = p.list.map((e, i) => `<label class="pmpr"><input type="checkbox" onchange="pmPilKdCek(${i},this.checked)"${p.sel.has(i) ? ' checked' : ''}> <span><b>${esc(e.d.k)}</b><span class="mu"> · dari ${esc(e.dari.join(', '))}</span></span></label>`).join('');
  return `<div class="pmpil"><div class="pmh"><span>KD dari kelompok lain (${p.list.length})</span></div>${rows}<div class="mu">Hanya KD yang kodenya belum ada di master ini. KD disalin ke master ini; indikator tidak ikut.</div><div class="tb" style="flex-wrap:wrap;gap:10px"><button class="btn soft grow" onclick="pmPilKdSemua()">${p.sel.size === p.list.length ? 'Hapus semua centang' : 'Pilih semua'}</button><button class="btn success grow" onclick="pmPilKdTambah()">➕ Tambahkan yang dipilih</button><button class="btn soft grow" onclick="pmPilKdTutup()">Batal</button></div></div>`;
}
function pmPilKdBuka() {
  if (PKME.ro) return;
  if (PKME.pilKd) { PKME.pilKd = null; return pmRender(); }
  const list = pmKdSumber(); if (!list.length) return toast('Tidak ada KD baru di kelompok lain (semua sudah ada di master ini)', false);
  PKME.pilKd = { list, sel: new Set() }; PKME.buka.add('kd'); pmRender();
}
function pmPilKdTutup() { PKME.pilKd = null; pmRender(); }
function pmPilKdCek(i, on) { if (!PKME.pilKd) return; if (on) PKME.pilKd.sel.add(i); else PKME.pilKd.sel.delete(i); }
function pmPilKdSemua() { const p = PKME.pilKd; if (!p) return; p.sel = p.sel.size === p.list.length ? new Set() : new Set(p.list.map((_, i) => i)); pmRender(); }
function pmPilKdTambah() {
  const p = PKME.pilKd; if (!p || PKME.ro) return;
  if (!p.sel.size) return toast('Centang dulu KD yang ingin ditambahkan', false);
  const ada = new Set(Object.values(PKME.M.kd).map(x => pmNormKd(x.k))); let n = 0;
  [...p.sel].sort((a, b) => a - b).forEach(i => { const e = p.list[i]; if (!e || ada.has(pmNormKd(e.d.k))) return; PKME.M.kd[pmIdBaru(PKME.M, 'k')] = pmKlon(e.d); ada.add(pmNormKd(e.d.k)); n++; });
  PKME.pilKd = null; if (n) pmUbah(); pmRender();
  toast(n + ' KD ditambahkan. Tekan Simpan master untuk menyimpan', !!n);
}
function pmGeser(t, ai, si, ii, d) {
  const L = t === 'a' ? PKME.M.aspek : t === 's' ? pmA(ai).sub : pmS(ai, si).ind, i = t === 'a' ? ai : t === 's' ? si : ii, j = i + d;
  if (j < 0 || j >= L.length) return; [L[i], L[j]] = [L[j], L[i]]; pmUbah(); pmRender();
}
function pmHapus(t, ai, si, ii) {
  guard(async () => {
    const L = t === 'a' ? PKME.M.aspek : t === 's' ? pmA(ai).sub : pmS(ai, si).ind, i = t === 'a' ? ai : t === 's' ? si : ii, o = L[i]; if (!o) return;
    const n = t === 'a' ? o.sub.reduce((x, s) => x + s.ind.length, 0) : t === 's' ? o.ind.length : 0;
    if (n && !await konfirmasi('Hapus ' + (t === 'a' ? 'aspek' : 'kategori') + ' ini beserta ' + n + ' indikator di dalamnya? (Raport terbit tidak terpengaruh.)', { judul: 'Hapus', ya: 'Hapus', bahaya: 1 })) return;
    L.splice(i, 1); pmUbah(); pmRender();
  });
}
async function pmTerapkanRows(rows, mode) {
  let hasil; try { hasil = pmTempel(PKME.M, rows, mode); } catch (e) { return toast(e.message, false); }
  const st = hasil.st;
  const t = 'Terbaca ' + st.baris + ' indikator: ' + st.baru + ' baru' + (st.dipakai ? ', ' + st.dipakai + ' memakai nilai lama' : '') + (st.lewat ? ', ' + st.lewat + ' dilewati (sudah ada)' : '') + (st.kdBaru ? ', ' + st.kdBaru + ' KD baru' : '')
    + (st.dibuang ? '. ' + st.dibuang + ' indikator lama tidak ada di file dan akan dibuang' : '') + '. Terapkan ke layar? (Belum tersimpan sampai Anda menekan Simpan master.)';
  if (!await konfirmasi(t, { judul: 'Impor dari Excel', ya: 'Terapkan', ikon: '📋', bahaya: st.dibuang ? 1 : 0 })) return;
  PKME.M = hasil.M; PKME.buka.add('aspek'); pmUbah(); pmRender(); toast('Diterapkan ke layar. Tekan Simpan master untuk menyimpan.');
}
function pmPilihFile() { const f = $('#pmFile'); if (!f) return; f.value = ''; f.click(); }
function pmImporFile(inp) {
  const f = inp.files && inp.files[0]; if (!f) return;
  const mode = $('#pmMode') ? $('#pmMode').value : 'tambah';
  guard(async () => {
    await muatLib('xlsx');
    let wb; try { wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }); } catch (e) { throw new Error('File Excel tidak bisa dibaca. Pastikan formatnya .xlsx'); }
    const baca = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false });
    const cocok = n => { const h = (baca(n)[0] || []).map(x => String(x).trim().toLowerCase()); return h.some(x => x.startsWith('aspek')) && h.some(x => x.startsWith('indikator')); };
    const nm = wb.SheetNames.find(n => String(n).toLowerCase() === 'data') || wb.SheetNames.find(cocok) || wb.SheetNames[0];
    const rows = baca(nm).map(r => r.map(c => String(c == null ? '' : c))).filter(r => r.some(x => x.trim() !== ''));
    if (!rows.length) throw new Error('File Excel kosong');
    await pmTerapkanRows(rows, mode);
  });
}
async function pmUnduhTemplate() {
  try {
    await muatLib('exceljs');
    if (typeof ExcelJS === 'undefined') throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
    const M = PKME.M, k = PKR.kel.find(x => x.id === PKME.kid) || {};
    const ln = { style: 'thin', color: { argb: 'FFCFD9D3' } }, wb = new ExcelJS.Workbook(), ws = wb.addWorksheet('Data'), pt = wb.addWorksheet('Petunjuk');
    wb.creator = typeof ns === 'function' ? ns() : 'Absensi';
    const gayaHead = r => { r.height = 24; r.eachCell(c => { c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } }; c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF176B3A' } }; c.alignment = { horizontal: 'center', vertical: 'middle' }; c.border = { top: ln, left: ln, bottom: ln, right: ln }; }); };
    ws.columns = [{ width: 28 }, { width: 28 }, { width: 64 }, { width: 14 }];
    ws.addRow(['Aspek', 'Kategori (Opsional)', 'Indikator', 'KD (Opsional)']); gayaHead(ws.getRow(1));
    let n = 0;
    M.aspek.forEach(a => a.sub.forEach(s => s.ind.forEach(i => { ws.addRow([pmStr(a.n), pmStr(s.n), pmStr(i.t), i.kd && M.kd[i.kd] ? pmStr(M.kd[i.kd].k) : '']); n++; })));
    const akhir = Math.max(500, n + 100);
    for (let r = 2; r <= akhir; r++) for (let c = 1; c <= 4; c++) { const x = ws.getCell(r, c); x.numFmt = '@'; x.alignment = { vertical: 'top', wrapText: true }; }
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    pt.columns = [{ width: 28 }, { width: 28 }, { width: 64 }, { width: 14 }];
    ['Petunjuk pengisian · Indikator ' + (k.nama || ''), '', 'Isi sheet "Data" mulai baris 2. Satu baris = satu indikator.', 'Aspek: wajib pada baris pertama. Bila kosong, ikut baris di atasnya.', 'Kategori: boleh kosong. Bila kosong, ikut baris di atasnya (dalam aspek yang sama).', 'KD: boleh kosong. Tulis kodenya, misalnya 3.1.', 'Indikator dengan tulisan yang sama dianggap satu indikator.', n ? 'Sheet "Data" sudah berisi indikator master saat ini.' : 'Master belum berisi indikator. Contoh pengisian ada di bawah.']
      .forEach((t, i) => { const r = pt.addRow([t]); r.getCell(1).font = { name: 'Arial', size: 10, bold: i === 0 }; });
    if (!n) {
      pt.addRow([]); const h = pt.addRow(['Aspek', 'Kategori', 'Indikator', 'KD']); gayaHead(h);
      [['A. NILAI AGAMA DAN MORAL', 'Ibadah', 'Anak mau mengikuti doa sebelum dan sesudah kegiatan', '1.1'], ['A. NILAI AGAMA DAN MORAL', '', 'Anak mengenal huruf hijaiyah', ''], ['B. FISIK MOTORIK', 'Motorik kasar', 'Anak mampu melompat dengan dua kaki', '3.3']]
        .forEach(x => { const r = pt.addRow(x); r.eachCell(c => { c.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF7A8B80' } }; }); });
    }
    const slug = String(k.nama || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    await tulisXlsx(wb, 'template-indikator' + (slug ? '-' + slug : '') + '.xlsx');
  } catch (e) { toast('Gagal membuat template: ' + (e.message || e), false); }
}
function pmSimpan() {
  if (PKME.ro) return; let M; try { M = pmCek(PKME.M); } catch (e) { return toast(e.message, false); }
  const ring = String(PKME.ring || '').trim().slice(0, 120) || 'Diubah lewat editor';
  const kdUbah = pmKdPerubahan(M), asal = (PKR.kel.find(x => x.id === PKME.kid) || {}).nama || '';
  return guard(async () => {
    /* KD bersama satu sekolah: kode KD yang diubah ikut berubah di semua kelompok lain yang memakai KD itu */
    const ter = kdUbah.length ? pmKdTerdampak(kdUbah) : [];
    if (ter.length && !await konfirmasi('KD diubah: ' + kdUbah.map(c => c.lama + ' → ' + c.baru).join(', ') + '.\n\nPerubahan ini juga akan mengubah KD yang sama pada ' + ter.length + ' kelompok lain:\n' + ter.slice(0, 8).map(t => '- ' + t.nama + ' (' + t.ind + ' indikator)').join('\n') + (ter.length > 8 ? '\n... dan ' + (ter.length - 8) + ' lainnya' : '') + '\n\nRaport yang sudah terbit tidak berubah sampai diterbitkan ulang.', { judul: 'Ubah KD di semua kelompok', ya: 'Simpan dan ubah semua', ikon: '🔁' })) return;
    try { await pnTry(() => dbq(db.rpc('rapor_master_simpan', { p_kelompok: PKME.kid, p_isi: M, p_versi: PKME.versi, p_ringkas: ring }))); }
    catch (e) {
      if (/versi|version|konflik|diubah/i.test(e.message || '')) throw new Error('Master sudah diubah orang lain. Tekan "Buang perubahan" untuk memuat versi terbaru, lalu ulangi perubahan Anda. (' + e.message + ')');
      throw e;
    }
    PKME.dirty = false; await pkMuat();
    let sebar = null;
    if (kdUbah.length) { sebar = await pmKdSebar(kdUbah, null, asal); PKME.sinkron = (PKME.sinkron || []).concat(sebar.gagal); if (sebar.ok.length) await pkMuat(); }
    pmMuatDari(PKR.mas.get(PKME.kid), PKME.kid); pmRender(); renderV();
    toast('Master disimpan (versi ' + PKME.versi + ')' + (sebar && sebar.ok.length ? '. KD ikut diubah di ' + sebar.ok.length + ' kelompok lain' : '') + (sebar && sebar.gagal.length ? '. GAGAL diubah di: ' + [...new Set(sebar.gagal.map(g => g.nama))].join(', ') + ' (tekan Ulangi di bagian atas editor)' : ''), !(sebar && sebar.gagal.length));
    return true;
  });
}
/* ---- KD bersama: identitas KD = kode (tanpa beda huruf besar/spasi). Ubah kode di satu kelompok, ubah di semua ---- */
function pmKdPerubahan(M) {
  const out = [];
  Object.keys(M.kd).forEach(id => {
    const lama = pmStr((PKME.kd0 || {})[id]).trim(), baru = pmStr(M.kd[id].k).trim();
    if (lama && baru && pmNormKd(lama) !== pmNormKd(baru) && !out.some(c => pmNormKd(c.lama) === pmNormKd(lama))) out.push({ lama, baru });
  });
  return out;
}
function pmKdTerdampak(chg, only) {
  const r = [];
  PKR.kel.forEach(k => {
    if (k.id === PKME.kid || !PKR.mas.has(k.id) || (only && !only.includes(k.id))) return;
    const M = pmNorm(pmKlon(PKR.mas.get(k.id).isi)), ids = new Set();
    Object.keys(M.kd).forEach(id => { if (chg.some(c => pmNormKd(c.lama) === pmNormKd(M.kd[id].k))) ids.add(id); });
    if (!ids.size) return;
    let ind = 0; M.aspek.forEach(a => a.sub.forEach(s => s.ind.forEach(i => { if (i.kd && ids.has(i.kd)) ind++; })));
    r.push({ kid: k.id, nama: k.nama, ind });
  });
  return r;
}
/* satu simpan per kelompok terdampak; aman diulang (yang sudah berubah tidak cocok lagi). Mengembalikan {ok:[nama], gagal:[{kid,nama,lama,baru,pesan}]} */
async function pmKdSebar(chg, only, asal) {
  const ok = [], gagal = [];
  for (const k of PKR.kel) {
    if (k.id === PKME.kid || !PKR.mas.has(k.id) || (only && !only.includes(k.id))) continue;
    const row = PKR.mas.get(k.id), M = pmNorm(pmKlon(row.isi)), ren = new Set(), idx = new Map();
    Object.keys(M.kd).forEach(id => { const c = pmNormKd(M.kd[id].k); if (!idx.has(c)) idx.set(c, []); idx.get(c).push(id); });
    chg.forEach(c => (idx.get(pmNormKd(c.lama)) || []).forEach(id => { M.kd[id].k = c.baru; ren.add(id); }));
    if (!ren.size) continue;
    /* bila kode baru sudah dimiliki KD lain di master itu: indikatornya dialihkan, KD ganda dihapus */
    ren.forEach(id => {
      if (!M.kd[id]) return;
      const o = Object.keys(M.kd).find(x => x !== id && pmNormKd(M.kd[x].k) === pmNormKd(M.kd[id].k)); if (!o) return;
      M.aspek.forEach(a => a.sub.forEach(s => s.ind.forEach(i => { if (i.kd === id) i.kd = o; }))); delete M.kd[id];
    });
    const ring = ('KD ' + chg.map(c => c.lama + ' → ' + c.baru).join(', ') + (asal ? ' (dari ' + asal + ')' : '')).slice(0, 120);
    try { await pnTry(() => dbq(db.rpc('rapor_master_simpan', { p_kelompok: k.id, p_isi: M, p_versi: row.versi || 0, p_ringkas: ring }))); ok.push(k.nama); }
    catch (e) { chg.forEach(c => gagal.push({ kid: k.id, nama: k.nama, lama: c.lama, baru: c.baru, pesan: (e && e.message) || String(e) })); }
  }
  return { ok, gagal };
}
function pmKdSebarUlang() {
  const p = PKME.sinkron || []; if (!p.length || PKME.ro) return;
  guard(async () => {
    await pkMuat();
    const chg = [], kids = [...new Set(p.map(x => x.kid))]; p.forEach(x => { if (!chg.some(c => c.lama === x.lama && c.baru === x.baru)) chg.push({ lama: x.lama, baru: x.baru }); });
    const r = await pmKdSebar(chg, kids, (PKR.kel.find(x => x.id === PKME.kid) || {}).nama || '');
    PKME.sinkron = r.gagal; if (r.ok.length) await pkMuat(); pmRender();
    toast(r.gagal.length ? 'Masih gagal di: ' + [...new Set(r.gagal.map(g => g.nama))].join(', ') + '. ' + r.gagal[0].pesan : 'KD sudah sama di semua kelompok (' + r.ok.length + ' kelompok diubah)', !r.gagal.length);
  });
}
