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
    + '.pmd{color:var(--rd);font-weight:800;margin:6px 0}';
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
  if (!rows.length) throw new Error('Tempelan kosong');
  const col = pmKolom(rows); if (!col) throw new Error('Tempelan minimal 2 kolom: Aspek, Kategori (boleh kosong), Indikator, KD (boleh kosong)');
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
  PKME.M = pmNorm(row ? pmKlon(row.isi) : { aspek: [], kd: {} }); PKME.versi = row ? (row.versi || 0) : 0; PKME.dirty = false; PKME.ring = '';
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
      + pmIn(`pmSetA(${ai},this.value)`, a.n, 'Nama aspek', ro) + subs + (ro ? '' : `<div class="tb"><button class="btn soft sm" onclick="pmTambah('s',${ai})">➕ Kategori</button></div>`));
  }).join('') + (ro ? '' : '<div class="tb"><button class="btn soft sm" onclick="pmTambah(\'a\')">➕ Aspek</button></div>');
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
  const kd = Object.keys(M.kd).map(id => `<div class="pmh">${pmIn(`pmSetKd('${esc(id)}',this.value)`, M.kd[id].k, 'Kode KD, misalnya 3.1', ro)}${pmBtn(`pmHapusKd('${esc(id)}')`, '🗑', ro)}</div>`).join('') + (ro ? '' : '<div class="tb"><button class="btn soft sm" onclick="pmTambahKd()">➕ KD</button></div>');
  const tempel = ro ? '<div class="mu">Hanya pemilik hak ubah yang dapat menempel.</div>' : '<div class="mu">Salin dari Excel kolom <b>Aspek | Kategori | Indikator | KD</b> (Kategori dan KD boleh kosong; sel Aspek/Kategori yang kosong ikut baris di atasnya; baris judul boleh disertakan), lalu tempel di sini.</div>'
    + '<textarea id="pmPaste" class="input" rows="6" placeholder="Tempel di sini"></textarea><div class="fd"><label class="l">Cara</label><select id="pmMode" class="select"><option value="tambah">Tambahkan ke master (indikator yang sudah ada dilewati)</option><option value="ganti">Ganti seluruh isi master (indikator bertuliskan sama tetap memakai nilai lamanya)</option></select></div><div class="tb"><button class="btn success" onclick="pmTerapkanTempel()">📋 Terapkan ke layar</button></div>';
  let h = `<div class="note">Kelompok <b>${esc(k.nama || '')}</b> · ${PKME.versi ? 'versi ' + PKME.versi : 'belum ada master'}${ro ? ' · <b>hanya lihat</b>' : ''}<br>Perubahan memengaruhi draf. Raport yang sudah terbit tetap memakai salinan lamanya sampai diterbitkan ulang dengan indikator terbaru.</div>`;
  if (!ro) h += `<div class="pmd" id="pmDirty" style="${PKME.dirty ? '' : 'display:none'}">● Ada perubahan yang belum disimpan</div><div class="fd"><input class="input" maxlength="120" placeholder="Ringkasan perubahan (opsional)" value="${esc(PKME.ring)}" onchange="PKME.ring=this.value"></div><div class="tb" style="flex-wrap:wrap"><button class="btn success grow" onclick="pmSimpan()">💾 Simpan master</button><button class="btn soft grow" onclick="pmBuang()">↩️ Buang perubahan</button></div>`;
  h += pmDet('aspek', 'Aspek, kategori, dan indikator', pmHtmlAspek(M, ro)) + pmDet('kd', 'Kompetensi Dasar (KD)', kd + '<div class="mu">KD dipilih per indikator dan tampil pada kolom KD raport.</div>') + pmDet('nomor', 'Penomoran', nomor)
    + pmDet('set', 'Teks otomatis (kalimat capaian dan catatan)', pmHtmlSet(M, ro)) + pmDet('tempel', 'Tempel dari Excel', tempel) + pmDet('riw', 'Riwayat perubahan', pmHtmlRiwayat(M));
  $('#mt').textContent = 'Indikator · ' + (k.nama || ''); $('#ms').style.display = 'none'; $('#mbd').innerHTML = h; $('#md').classList.add('besar'); $('#md').classList.add('show');
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
function pmTerapkanTempel() {
  let hasil; try { hasil = pmTempel(PKME.M, pmTsv($('#pmPaste').value), $('#pmMode').value); } catch (e) { return toast(e.message, false); }
  const st = hasil.st; guard(async () => {
    const t = 'Terbaca ' + st.baris + ' indikator: ' + st.baru + ' baru' + (st.dipakai ? ', ' + st.dipakai + ' memakai nilai lama' : '') + (st.lewat ? ', ' + st.lewat + ' dilewati (sudah ada)' : '') + (st.kdBaru ? ', ' + st.kdBaru + ' KD baru' : '')
      + (st.dibuang ? '. ' + st.dibuang + ' indikator lama tidak ada di tempelan dan akan dibuang' : '') + '. Terapkan ke layar? (Belum tersimpan sampai Anda menekan Simpan master.)';
    if (!await konfirmasi(t, { judul: 'Tempel dari Excel', ya: 'Terapkan', ikon: '📋', bahaya: st.dibuang ? 1 : 0 })) return;
    PKME.M = hasil.M; PKME.buka.add('aspek'); pmUbah(); pmRender(); toast('Diterapkan ke layar. Tekan Simpan master untuk menyimpan.');
  });
}
function pmSimpan() {
  if (PKME.ro) return; let M; try { M = pmCek(PKME.M); } catch (e) { return toast(e.message, false); }
  const ring = String(PKME.ring || '').trim().slice(0, 120) || 'Diubah lewat editor';
  guard(async () => {
    try { await pnTry(() => dbq(db.rpc('rapor_master_simpan', { p_kelompok: PKME.kid, p_isi: M, p_versi: PKME.versi, p_ringkas: ring }))); }
    catch (e) {
      if (/versi|version|konflik|diubah/i.test(e.message || '')) throw new Error('Master sudah diubah orang lain. Tekan "Buang perubahan" untuk memuat versi terbaru, lalu ulangi perubahan Anda. (' + e.message + ')');
      throw e;
    }
    PKME.dirty = false; await pkMuat(); pmMuatDari(PKR.mas.get(PKME.kid), PKME.kid); pmRender(); renderV(); toast('Master disimpan (versi ' + PKME.versi + ')');
  });
}
