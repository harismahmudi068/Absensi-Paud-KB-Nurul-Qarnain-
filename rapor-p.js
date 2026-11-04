/* =====================================================================
   rapor-p.js  -  input raport PERKEMBANGAN (aspek > kategori > indikator) untuk index.html
   Dimuat setelah rapor.js. Fungsi berawalan "pk" dipanggil dari index (menu Penilaian Siswa).
   Desain PDF tetap di rapor.js. Kelompok = usia atau kelas (Penilaian > tab Kelompok).
   Data siswa hanya berisi level per indikator; kalimat capaian dan catatan dibuat otomatis
   oleh Rapor.cap / Rapor.catI dan bisa ditimpa per indikator.
   ===================================================================== */
const PKR = { kel: [], mas: new Map(), sal: new Map(), ed: null, loaded: false, galat: false };
const PKLV = ['BB', 'MB', 'BSH', 'BSB'];
(function () {
  const st = document.createElement('style');
  st.textContent = '.pkas{border:1px solid var(--bd);border-radius:12px;margin:8px 0;background:var(--card)}'
    + '.pkas>summary{padding:11px 14px;font-weight:800;cursor:pointer;display:flex;justify-content:space-between;gap:8px}'
    + '.pkb{padding:0 14px 10px}.pkk{display:flex;justify-content:space-between;align-items:center;gap:8px;font-weight:800;font-size:13px;margin:12px 0 2px}'
    + '.pki{padding:9px 0;border-top:1px solid var(--bd)}.pkt{font-size:13px;margin-bottom:6px}'
    + '.pklv{display:flex;gap:6px}.pklv button{flex:1;padding:7px 0;border-radius:9px;border:1px solid var(--bd);background:var(--card);color:var(--mu);font-weight:800;font-size:12px}'
    + '.pklv button.on{background:var(--g);border-color:var(--g);color:#fff}.pklv button:disabled{opacity:.6}'
    + '.pkc{font-size:12px;margin-top:6px;color:var(--tx2)}.pkc textarea,.pkc input{margin-bottom:4px}'
    + '.pktw{overflow-x:auto}.pktbl{border-collapse:collapse;min-width:100%}.pktbl th,.pktbl td{padding:3px;font-size:12px;text-align:center;border:1px solid var(--bd)}'
    + '.pktbl td:first-child{text-align:left;font-weight:700;white-space:nowrap;padding:3px 6px}.pktbl input{width:62px;padding:5px;text-align:center}'
    + '.pkprog{position:sticky;top:0;background:var(--card);padding:6px 0;z-index:2;font-weight:800}';
  document.head.appendChild(st);
})();

/* ---------------- Pemuatan data ---------------- */
async function pkMuat() {
  PKR.kel = []; PKR.mas = new Map(); PKR.galat = false;
  try {
    PKR.kel = (await dbq(db.from('rapor_kelompok').select('*').order('urutan').order('id'))) || [];
    if (PKR.kel.length) {
      ((await dbq(db.from('rapor_master').select('id,kelompok_id,isi,versi'))) || []).forEach(m => PKR.mas.set(m.kelompok_id, m));
      const hs = [...new Set((typeof pnRap !== 'undefined' ? pnRap : []).map(r => r.salinan_hash).filter(h => h && !PKR.sal.has(h)))];
      if (hs.length) ((await dbq(db.from('rapor_salinan').select('hash,isi').in('hash', hs))) || []).forEach(x => PKR.sal.set(x.hash, x.isi));
    }
  } catch (e) { PKR.kel = []; PKR.mas = new Map(); PKR.galat = true; }
  PKR.loaded = true;
}

/* ---------------- Kelompok siswa ---------------- */
const pkOkTgl = x => /^\d{4}-\d\d-\d\d$/.test(String(x || ''));
const pkMode = () => (S.set && S.set.kelompok_mode) || 'kelas';
function pkAcuan() {
  const ta = String((S.set && S.set.tahun_ajaran) || ''), m = ta.match(/(\d{4})/), y = m ? +m[1] : +String(TODAY).slice(0, 4);
  const a = ((S.set && S.set.acuan_usia) || {})[ta + '-' + pnSem];
  return pkOkTgl(a) ? a : (pnSem === 1 ? y + '-07-01' : (y + 1) + '-01-01');
}
function pkUmur(tgl, acuan) {
  const a = String(tgl).split('-').map(Number), b = String(acuan).split('-').map(Number);
  if (a.length < 3 || b.length < 3 || a.some(isNaN) || b.some(isNaN)) return null;
  return (b[0] - a[0]) * 12 + (b[1] - a[1]) - (b[2] < a[2] ? 1 : 0);
}
function pkKel(s) {
  if (!s || !PKR.kel.length) return null;
  if (s.km) { const k = PKR.kel.find(x => x.id === s.km); if (k) return k; }
  const ak = PKR.kel.filter(k => k.aktif);
  if (pkMode() === 'usia') {
    if (!s.tgl) return null; const b = pkUmur(s.tgl, pkAcuan()); if (b == null) return null;
    return ak.find(k => k.aturan && k.aturan.min != null && b >= k.aturan.min && b <= k.aturan.max) || null;
  }
  return ak.find(k => k.aturan && Array.isArray(k.aturan.kelas) && k.aturan.kelas.includes(s.kelas_id)) || null;
}
const pkRap = sid => (typeof pnRap !== 'undefined' ? pnRap : []).find(r => r.siswa_id === sid) || null;
/* true bila raport siswa ini memakai format perkembangan (sudah tersimpan begitu, atau kelompoknya punya master) */
function pkFmtS(s) {
  if (!s) return false; const r = pkRap(s.id); if (r) return r.fmt === 'perkembangan';
  const k = pkKel(s); return !!(k && PKR.mas.has(k.id));
}
function pkMasterS(s, r) {
  if (r && r.salinan_hash && PKR.sal.has(r.salinan_hash)) return PKR.sal.get(r.salinan_hash);
  const kid = (r && r.kelompok_id) || (pkKel(s) || {}).id, m = PKR.mas.get(kid); return m ? m.isi : null;
}
const pkIndAll = M => { const a = []; Rapor.pohon(M).forEach(x => x.kat.forEach(k => k.ind.forEach(i => a.push(i.i)))); return a; };
function pkHitung(M, n) { const all = pkIndAll(M); return { tot: all.length, isi: all.filter(i => +n[i.id] >= 1 && +n[i.id] <= 4).length }; }

/* ---------------- Baris daftar siswa ---------------- */
function pkInfo(s, r, i, b) {
  const M = pkMasterS(s, r), n = (r && r.data && r.data.n) || {}, h = M ? pkHitung(M, n) : { tot: 0, isi: 0 };
  const kg = PKR.kel.find(k => k.id === ((r && r.kelompok_id) || (pkKel(s) || {}).id)) || {}, terbit = !!r && r.status === 'terbit';
  const stt = terbit ? '<span class="badge hadir">Terbit</span>' : r ? '<span class="badge terlambat">Draf</span>' + (h.tot && h.isi === h.tot ? '<div class="mu">Lengkap</div>' : '') : '<span class="mu">Belum diisi</span>';
  const siap = !!r && !terbit && h.tot > 0 && h.isi === h.tot, bt = b && siap ? `<button class="btn pnk success" onclick="pnTerbit([${r.id}])">🚀 Terbitkan</button>` : '';
  const tr = `<tr><td>${i + 1}</td><td><b>${esc(s.nama)}</b><div class="mu">${esc(kg.nama || '')}</div></td><td>${h.isi} / ${h.tot}</td><td>${stt}</td><td><div class="pnka"><button class="btn pnk ${terbit || !b ? 'soft' : 'success'}" onclick="pnBuka(${s.id})">${terbit || !b ? '👁 Lihat' : '✍️ Isi'}</button>${bt}${r ? `<button class="btn pnk soft" onclick="pnPdf([${r.id}],this)">📄 PDF</button>` : ''}</div></td></tr>`;
  return { terbit, tr, siap: siap ? r.id : 0 };
}

/* ---------------- Lembar input per siswa ---------------- */
const pkNama = () => { const s = S.siswa.find(x => x.id === PKR.ed.sid) || {}; return String(s.pan || '').trim() || String(s.nama || '').trim().split(/\s+/)[0]; };
const pkSet_ = () => Rapor.pengaturan(PKR.ed.M);
function pkTb(tb) { const o = []; for (let i = 0; i < 4; i++) { o.push([]); for (let j = 0; j < 6; j++) o[i].push(String(((tb || [])[i] || [])[j] == null ? '' : tb[i][j])); } return o; }
function pkBuka(sid) {
  const s = S.siswa.find(x => x.id === sid), kl = pnKl(pnK); if (!s || !kl) return;
  const r = pkRap(sid), kunci = !!r && r.status === 'terbit', b = pnBoleh(kl) && !kunci;
  const kg = (r && r.kelompok_id && PKR.kel.find(k => k.id === r.kelompok_id)) || pkKel(s), M = pkMasterS(s, r);
  if (!kg || !M) return info('Kelompok belum tersedia', '<div class="note">Siswa ini belum punya kelompok atau master indikator. Atur di tab <b>Kelompok</b>.</div>');
  const d = (r && r.data) || {}, keh = pnKeh[sid] || { sakit: 0, izin: 0, alpa: 0 };
  PKR.ed = { sid, kid: kg.id, M, b, kunci, r, n: Object.assign({}, d.n), o: Object.assign({}, d.o), oc: Object.assign({}, d.oc), tb: pkTb(d.tb), keh: r ? { sakit: r.sakit, izin: r.izin, alpa: r.alpa } : { sakit: keh.sakit, izin: keh.izin, alpa: keh.alpa }, cat: r ? (r.catatan || '') : '' };
  pkRender();
}
function pkRender() {
  const e = PKR.ed, s = S.siswa.find(x => x.id === e.sid), kl = pnKl(pnK), dis = e.b ? '' : ' disabled', P = Rapor.pohon(e.M), kg = PKR.kel.find(k => k.id === e.kid) || {};
  const pil = PKR.kel.filter(k => k.aktif && PKR.mas.has(k.id));
  let h = `<div class="note">Kelas ${esc(kl.nama)} · ${pnSem === 1 ? 'Semester 1' : 'Semester 2'} · ${pnJenis} · ${esc(S.set.tahun_ajaran || '')}${e.kunci ? ' · <b>Terbit (terkunci)</b>' : e.r ? ' · Draf' : ''}</div>`;
  h += `<div class="fd"><label class="l">${pkMode() === 'kelas' ? 'Kelompok' : 'Kelompok usia'}</label>` + (e.b && pil.length > 1
    ? `<select class="select" onchange="pkGantiKel(this.value)"><option value="">(otomatis) ${esc((pkKel(s) || {}).nama || '')}</option>${pil.map(k => `<option value="${k.id}"${s.km === k.id ? ' selected' : ''}>${esc(k.nama)}</option>`).join('')}</select>` : `<input class="input" value="${esc(kg.nama || '')}" readonly>`) + '</div>';
  h += '<div class="pkprog" id="pkprog"></div>';
  h += P.map((a, ai) => `<details class="pkas" id="pka_${ai}" ontoggle="pkIsi(${ai})"><summary><span>${esc(a.no ? a.no + '. ' : '')}${esc(a.n)}</span><span class="mu" id="pks_${ai}"></span></summary><div class="pkb" id="pkb_${ai}"></div></details>`).join('');
  const bln = pnSem === 1 ? ['Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'] : ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun'];
  h += `<div class="tbkh">Pertumbuhan fisik</div><div class="pktw"><table class="pktbl"><thead><tr><th></th>${bln.map(m => `<th>${m}</th>`).join('')}</tr></thead><tbody>${pkSet_().tumbuh.map((lab, ri) => `<tr><td>${esc(lab)}</td>${bln.map((_, ci) => `<td><input class="input" maxlength="8" value="${esc(e.tb[ri][ci])}"${dis} oninput="pkTbSet(${ri},${ci},this.value)"></td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  h += `<div class="tbkh">Kehadiran <span class="mu">(hari)</span></div><div class="tb" style="flex-wrap:wrap;align-items:flex-end"><div class="fd" style="flex:1;min-width:80px"><label class="l">Sakit</label><input id="pkSk" class="input" inputmode="numeric" maxlength="3" value="${e.keh.sakit}"${dis}></div><div class="fd" style="flex:1;min-width:80px"><label class="l">Izin</label><input id="pkIz" class="input" inputmode="numeric" maxlength="3" value="${e.keh.izin}"${dis}></div><div class="fd" style="flex:1;min-width:80px"><label class="l">Tanpa keterangan</label><input id="pkAl" class="input" inputmode="numeric" maxlength="3" value="${e.keh.alpa}"${dis}></div></div>`;
  if (e.b) h += `<div class="tb" style="flex-wrap:wrap;align-items:center"><button class="btn soft sm" onclick="pkAmbilKeh()">↻ Ambil dari absensi</button><span class="mu">${fmt(pnRange()[0])} sampai ${fmt(pnRange()[1])}</span></div>`;
  h += `<div class="tbkh">Catatan dan rekomendasi pendidik</div><textarea id="pkCat" class="input" rows="4" maxlength="600" placeholder=""${dis}>${esc(e.cat)}</textarea><div class="mu">Dikosongkan = dibuat otomatis dari nilai (lihat contoh di kolom ini). Isi bila ingin menulis sendiri.</div>`;
  const lama = e.r && e.r.salinan_hash && PKR.sal.has(e.r.salinan_hash) && PKR.mas.has(e.kid) && JSON.stringify(PKR.sal.get(e.r.salinan_hash)) !== JSON.stringify(PKR.mas.get(e.kid).isi);
  if (e.b) h += '<div class="tb" style="flex-wrap:wrap;margin-top:12px"><button class="btn success grow" onclick="pkSimpan(false)">💾 Simpan draf</button><button class="btn soft grow" onclick="pkSimpan(true)">Simpan &amp; berikutnya ➜</button></div><div class="tb"><button class="btn success grow" onclick="pkSimpan(\'terbit\')">🚀 Simpan &amp; terbitkan</button></div>' + (lama ? '<div class="note">Draf ini masih memakai indikator lama (salinan saat terbit sebelumnya). Indikator master sudah berubah.</div><div class="tb"><button class="btn soft sm" onclick="pkPakaiBaru()">🔄 Pakai indikator terbaru</button></div>' : '');
  else if (e.kunci && pnBoleh(kl) && e.r) h += `<div class="note">Raport ini sudah terbit dan terkunci. Indikatornya memakai salinan yang dibekukan saat terbit.</div><div class="tb" style="flex-wrap:wrap"><button class="btn soft grow" onclick="closeM();pnTerbitUlang([${e.r.id}])">🔄 Terbitkan ulang (indikator lama)</button><button class="btn soft grow" onclick="closeM();pnTerbitUlang([${e.r.id}],true)">🔄 Terbitkan ulang, pakai indikator terbaru</button></div><div class="tb"><button class="btn danger" onclick="pnBatal(${e.r.id})">Batalkan penerbitan</button></div>`;
  else h += '<div class="note">Anda hanya dapat melihat raport ini.</div>';
  if (e.r) h += `<div class="tb"><button class="btn soft sm" onclick="pnPdf([${e.r.id}],this)">📄 Unduh PDF (data yang tersimpan)</button></div>`;
  $('#mt').textContent = (e.kunci ? 'Raport ' : 'Nilai ') + s.nama; $('#ms').style.display = 'none'; $('#mbd').innerHTML = h; $('#md').classList.add('besar'); $('#md').classList.add('show');
  const a0 = $('#pka_0'); if (a0) { a0.open = true; pkIsi(0); } pkProg();
}
function pkRowHTML(x) {
  const e = PKR.ed, i = x.i, lv = +e.n[i.id] || 0, dis = e.b ? '' : ' disabled';
  return `<div class="pki" id="pkr_${i.id}"><div class="pkt"><span class="mu">${x.no ? esc(x.no) + '.' : ''}</span> ${esc(i.t)}${x.kd ? ` <span class="mu">[KD ${esc(x.kd)}]</span>` : ''}</div><div class="pklv">${PKLV.map((t, k) => `<button type="button" class="${lv === k + 1 ? 'on' : ''}"${dis} onclick="pkSetLv('${i.id}',${k + 1})">${t}</button>`).join('')}</div><div class="pkc" id="pkc_${i.id}">${pkPrev(i)}</div></div>`;
}
function pkPrev(i) {
  const e = PKR.ed, lv = +e.n[i.id] || 0; if (!lv) return '<span class="mu">Pilih level untuk mengisi capaian otomatis</span>';
  const S_ = pkSet_(), c = e.o[i.id] != null && e.o[i.id] !== '' ? e.o[i.id] : Rapor.cap(i, lv, pkNama(), S_), t = e.oc[i.id] != null && e.oc[i.id] !== '' ? e.oc[i.id] : Rapor.catI(i, lv, S_);
  return esc(c) + `<div class="mu"><i>Catatan: ${esc(t)}</i>${e.b ? ` · <a href="#" onclick="pkUbahTeks('${i.id}');return false">✎ ubah teks</a>` : ''}</div>`;
}
function pkIsi(ai) {
  const d = $('#pka_' + ai), bd = $('#pkb_' + ai); if (!d || !bd || !d.open || bd.dataset.ok) return; bd.dataset.ok = '1';
  const a = Rapor.pohon(PKR.ed.M)[ai]; if (!a) return;
  bd.innerHTML = a.kat.map(k => `${k.n ? `<div class="pkk"><span>${esc(k.no)} ${esc(k.n)}</span>${PKR.ed.b ? `<button type="button" class="btn soft sm" onclick="pkSemua(${ai},'${k.id}')">Kosong → BSH</button>` : ''}</div>` : ''}${k.ind.map(pkRowHTML).join('')}`).join('');
}
function pkTampil(id) {
  const row = $('#pkr_' + id); if (!row) return; const e = PKR.ed, lv = +e.n[id] || 0, i = pkIndAll(e.M).find(x => x.id === id);
  row.querySelectorAll('.pklv button').forEach((b, k) => b.classList.toggle('on', lv === k + 1)); $('#pkc_' + id).innerHTML = pkPrev(i);
}
function pkProg() {
  const e = PKR.ed; if (!e) return; const tot = pkHitung(e.M, e.n); const pg = $('#pkprog'); if (pg) pg.textContent = `Terisi ${tot.isi} dari ${tot.tot} indikator`;
  Rapor.pohon(e.M).forEach((a, ai) => { const el = $('#pks_' + ai); if (!el) return; let t = 0, n = 0; a.kat.forEach(k => k.ind.forEach(x => { t++; if (+e.n[x.i.id] >= 1) n++; })); el.textContent = n + '/' + t; });
  const c = $('#pkCat'); if (c) c.placeholder = Rapor.pendidik(e.M, e.n, pkNama(), pkSet_()) || 'Dibuat otomatis setelah level diisi';
}
function pkSetLv(id, lv) {
  const e = PKR.ed; if (!e || !e.b) return;
  if (+e.n[id] === lv) delete e.n[id]; else e.n[id] = lv;
  delete e.o[id]; delete e.oc[id]; pkTampil(id); pkProg();
}
function pkSemua(ai, kid) {
  const e = PKR.ed; if (!e || !e.b) return; const k = Rapor.pohon(e.M)[ai].kat.find(x => x.id === kid); if (!k) return;
  k.ind.forEach(x => { if (!(+e.n[x.i.id] >= 1)) { e.n[x.i.id] = 3; pkTampil(x.i.id); } }); pkProg();
}
function pkUbahTeks(id) {
  const e = PKR.ed, i = pkIndAll(e.M).find(x => x.id === id), el = $('#pkc_' + id); if (!i || !el) return;
  const lv = +e.n[id] || 0, S_ = pkSet_(), c = e.o[id] != null && e.o[id] !== '' ? e.o[id] : Rapor.cap(i, lv, pkNama(), S_), t = e.oc[id] != null && e.oc[id] !== '' ? e.oc[id] : Rapor.catI(i, lv, S_);
  el.innerHTML = `<textarea class="input" rows="3" maxlength="300" oninput="pkTeks('${id}','o',this.value)">${esc(c)}</textarea><input class="input" maxlength="200" value="${esc(t)}" placeholder="Catatan" oninput="pkTeks('${id}','oc',this.value)"><button type="button" class="btn soft sm" onclick="pkResetTeks('${id}')">↺ Kembali otomatis</button>`;
}
function pkTeks(id, k, v) { const e = PKR.ed; if (!e || !e.b) return; const t = String(v || '').trim(); if (t) e[k][id] = t; else delete e[k][id]; }
function pkResetTeks(id) { const e = PKR.ed; delete e.o[id]; delete e.oc[id]; $('#pkc_' + id).innerHTML = pkPrev(pkIndAll(e.M).find(x => x.id === id)); }
function pkTbSet(ri, ci, v) { if (PKR.ed && PKR.ed.b) PKR.ed.tb[ri][ci] = String(v || '').trim(); }
function pkAmbilKeh() { const k = pnKeh[PKR.ed.sid] || { sakit: 0, izin: 0, alpa: 0 }; $('#pkSk').value = k.sakit; $('#pkIz').value = k.izin; $('#pkAl').value = k.alpa; toast('Kehadiran diisi dari absensi. Tekan Simpan untuk menyimpan'); }
async function pkGantiKel(v) {
  const e = PKR.ed, s = S.siswa.find(x => x.id === e.sid); if (!e || !s || !e.b) return;
  const km = v ? +v : null;
  if (Object.keys(e.n).length && !await konfirmasi('Mengganti kelompok akan membuang level yang sudah diisi pada form ini. Lanjutkan?', { judul: 'Ganti kelompok', ya: 'Ganti', ikon: '🔄' })) { pkRender(); return; }
  try {
    const rr = await dbq(db.from('siswa').update({ kelompok_manual: km }).eq('id', s.id).select('id')); if (!rr || !rr.length) throw new Error('Tidak diizinkan mengubah kelompok siswa ini');
    s.km = km; const k = pkKel(s), M = k ? pkMasterS(s, null) : null; if (!k || !M) throw new Error('Kelompok belum punya master indikator');
    e.kid = k.id; e.M = M; e.n = {}; e.o = {}; e.oc = {}; if (e.r) e.r = Object.assign({}, e.r, { salinan_hash: null }); pkRender();
  } catch (x) { toast(x.message || String(x), false); pkRender(); }
}
function pkBaca() {
  const e = PKR.ed, ang = id => { const v = String($(id).value).trim() || '0'; if (!/^\d{1,3}$/.test(v)) throw new Error('Jumlah hari kehadiran harus berupa angka bulat'); return +v; };
  return { sakit: ang('#pkSk'), izin: ang('#pkIz'), alpa: ang('#pkAl'), cat: ($('#pkCat').value || '').trim(), tb: e.tb.map(r => r.slice()) };
}
function pkSimpan(lanjut) {
  const e = PKR.ed, kl = pnKl(pnK); if (!e || !e.b || !kl) return; let k; try { k = pkBaca(); } catch (x) { return toast(x.message, false); }
  const ids = new Set(pkIndAll(e.M).map(i => i.id)), n = {}, o = {}, oc = {};
  ids.forEach(id => { const v = +e.n[id]; if (v >= 1 && v <= 4) n[id] = v; if (e.o[id]) o[id] = e.o[id]; if (e.oc[id]) oc[id] = e.oc[id]; });
  if (lanjut === 'terbit') { const h = pkHitung(e.M, n); if (h.isi < h.tot) return toast('Masih ada indikator yang belum dinilai (' + h.isi + ' / ' + h.tot + ')', false); }
  const data = { n }; if (Object.keys(o).length) data.o = o; if (Object.keys(oc).length) data.oc = oc; if (k.tb.some(r => r.some(v => v))) data.tb = k.tb;
  const sis = pnDaftar().filter(pkFmtS), nxt = sis[sis.findIndex(x => x.id === e.sid) + 1];
  guard(async () => {
    await pnTry(() => dbq(db.from('rapor').upsert({ siswa_id: e.sid, kelas_id: kl.id, kelas_nama: kl.nama, tahun_ajaran: S.set.tahun_ajaran, semester: pnSem, jenis: pnJenis, status: 'draf', fmt: 'perkembangan', kelompok_id: e.kid, salinan_hash: (e.r && e.r.salinan_hash) || null, nilai: [], data, sakit: k.sakit, izin: k.izin, alpa: k.alpa, catatan: k.cat || null }, { onConflict: 'siswa_id,tahun_ajaran,semester,jenis' })));
    await pnMuat();
    if (lanjut === 'terbit') { closeM(); renderV(); const rr = pkRap(e.sid); if (rr) pnTerbit([rr.id]); return; }
    if (lanjut && nxt) { renderV(); pnBuka(nxt.id); toast('Tersimpan. Lanjut ke ' + nxt.nama); } else { closeM(); renderV(); toast('Draf tersimpan'); }
  });
}

/* ---------------- PDF ---------------- */
function pkPengelola() { const g = (S.guru || []).find(x => x.role === 'pengelola' && x.aktif); return g ? { nama: g.nama, nip: fmtNip(g.nip) } : null; }
function pkSusun(r, logo) {
  const s = S.siswa.find(x => x.id === r.siswa_id) || {}, kg = PKR.kel.find(k => k.id === r.kelompok_id) || pkKel(s) || {};
  return Rapor.susun(r, { logo, sekolah: ns(), alamat: (S.set && S.set.alamat) || '', kota: kotaTtd(), nama: s.nama, panggilan: s.pan, nisn: s.nisn, kelas: r.kelas_nama, tempatLahir: s.tempat, tglLahir: s.tgl,
    kelompok: kg.nama || '', kelompokLabel: pkMode() === 'kelas' ? 'Kelompok' : 'Kelompok Usia', master: pkMasterS(s, r), wali: ttdWali(r.kelas_nama) || {}, kepsek: ttdKepsek(), pengelola: pkPengelola() });
}

/* ---------------- Tahap 4: terbit raport perkembangan ---------------- */
/* rpc rapor_salinan_buat(p_kelompok bigint) -> text (hash): server membekukan master kelompok itu saat ini */
const pkSalNorm = x => { let v = Array.isArray(x) ? x[0] : x; if (v && typeof v === 'object') v = v.hash || v.salinan_hash || Object.values(v)[0]; return String(v == null ? '' : v).trim(); };
async function pkSalinanBuat(kid) {
  const h = pkSalNorm(await dbq(db.rpc('rapor_salinan_buat', { p_kelompok: kid })));
  if (!h) throw new Error('Salinan indikator gagal dibuat');
  if (!PKR.sal.has(h)) {
    const x = ((await dbq(db.from('rapor_salinan').select('hash,isi').eq('hash', h))) || [])[0];
    if (!x) throw new Error('Salinan indikator tidak terbaca setelah dibuat');
    PKR.sal.set(h, x.isi);
  }
  return h;
}
function pkPakaiBaru() {
  const e = PKR.ed; if (!e || !e.b || !e.r || !e.r.salinan_hash) return;
  const m = PKR.mas.get(e.kid); if (!m) return toast('Master indikator tidak ditemukan', false);
  try { const k = pkBaca(); e.keh = { sakit: k.sakit, izin: k.izin, alpa: k.alpa }; e.cat = k.cat; e.tb = k.tb; } catch (x) { return toast(x.message, false); }
  e.r = Object.assign({}, e.r, { salinan_hash: null }); e.M = m.isi; pkRender(); toast('Memakai indikator terbaru. Tekan Simpan draf untuk menyimpan.');
}
/* nama siswa yang indikatornya belum lengkap; baru=true -> dihitung terhadap master terbaru */
function pkKurang(rows, baru) {
  const o = [];
  rows.filter(r => r.fmt === 'perkembangan').forEach(r => {
    const s = S.siswa.find(x => x.id === r.siswa_id) || {}, M = baru ? (PKR.mas.get(r.kelompok_id) || {}).isi : pkMasterS(s, r);
    if (!M) return o.push((s.nama || '') + ' (master tidak ada)');
    const h = pkHitung(M, (r.data && r.data.n) || {}); if (h.isi < h.tot) o.push((s.nama || '') + ' (' + h.isi + '/' + h.tot + ')');
  });
  return o;
}
async function pkTerbitInti(rows, ttd, baru) {
  rows = rows.filter(r => r.fmt === 'perkembangan'); if (!rows.length) return;
  const kur = pkKurang(rows, baru); if (kur.length) throw new Error('Indikator belum lengkap: ' + kur.join(', '));
  const pg = pkPengelola(), per = { pengelola_nama: pg ? pg.nama : null, pengelola_nip: pg ? (pg.nip || null) : null };
  const cache = new Map(), grup = new Map();
  for (const r of rows) {
    let h = null;
    if (!baru && r.salinan_hash) { if (!PKR.sal.has(r.salinan_hash)) throw new Error('Salinan indikator lama tidak ditemukan. Gunakan pilihan indikator terbaru'); h = r.salinan_hash; }
    if (!h) {
      const m = PKR.mas.get(r.kelompok_id); if (!m) throw new Error('Master indikator kelompok tidak ditemukan');
      if (!cache.has(r.kelompok_id)) cache.set(r.kelompok_id, await pkSalinanBuat(r.kelompok_id));
      h = cache.get(r.kelompok_id);
    }
    if (!grup.has(h)) grup.set(h, []); grup.get(h).push(r.id);
  }
  for (const [h, ids] of grup) await pnTry(() => dbq(db.from('rapor').update(Object.assign({ status: 'terbit', salinan_hash: h }, ttd, per)).in('id', ids)));
}

/* ---------------- Tab Kelompok ---------------- */
const pkAturanTxt = k => { const a = k.aturan || {}; if (a.min != null) return a.min + '-' + a.max + ' bulan'; if (Array.isArray(a.kelas) && a.kelas.length) return 'Kelas: ' + a.kelas.map(id => (S.kelas.find(c => c.id === id) || {}).nama || '?').join(', '); return '-'; };
function pkKelHTML() {
  if (!PKR.loaded) { pkMuat().then(() => renderV()); return '<div class="note">⏳ Memuat...</div>'; }
  if (PKR.galat) return '<div class="note">Fitur raport perkembangan belum siap di database. Jalankan 01_rapor_perkembangan.sql lebih dulu.</div>';
  const kl = role !== 'Guru', mode = pkMode(), dis = kl ? '' : ' disabled', aktif = S.siswa.filter(s => s.aktif);
  let h = '<div class="note">Kelompok menentukan aspek, kategori, dan indikator pada raport perkembangan. Pilih pengelompokan siswa per usia (misalnya PAUD) atau per kelas (misalnya SD).' + (kl ? '' : '<br>Anda hanya dapat melihat pengaturan ini.') + '</div>';
  h += `<div class="fd"><label class="l">Pengelompokan siswa</label><select class="select" onchange="pkSetMode(this.value)"${dis}><option value="kelas"${mode === 'kelas' ? ' selected' : ''}>Per kelas</option><option value="usia"${mode === 'usia' ? ' selected' : ''}>Per usia (dari tanggal lahir)</option></select></div>`;
  if (mode === 'usia') h += pnPeriode() + `<div class="fd"><label class="l">Tanggal acuan hitung usia · Semester ${pnSem} · TA ${esc(S.set.tahun_ajaran || '-')}</label><input type="date" class="input" value="${pkAcuan()}" onchange="pkSetAcuan(this.value)"${dis}><div class="mu">Usia siswa dihitung pada tanggal ini. Bawaan: awal semester.</div></div>`;
  const cnt = new Map(), tanpa = []; aktif.forEach(s => { const k = pkKel(s); if (k) cnt.set(k.id, (cnt.get(k.id) || 0) + 1); else tanpa.push(s.nama); });
  const bisaSalin = PKR.kel.filter(k => PKR.mas.has(k.id));
  h += PKR.kel.length ? tab(['Kelompok', 'Aturan', 'Master', 'Siswa', 'Aksi'], PKR.kel.map(k => `<tr><td><b>${esc(k.nama)}</b>${k.aktif ? '' : '<div class="mu">Nonaktif</div>'}</td><td>${esc(pkAturanTxt(k))}</td><td>${PKR.mas.has(k.id) ? 'v' + PKR.mas.get(k.id).versi : '<span class="mu">Belum ada</span>'}</td><td>${cnt.get(k.id) || 0}</td><td><div class="pnka"><button class="btn pnk soft" onclick="pmBuka(${k.id})">📝 ${PKR.mas.has(k.id) ? 'Indikator' : 'Buat master'}</button>${kl ? `<button class="btn pnk soft" onclick="pkFormKel(${k.id})">Ubah</button>${!PKR.mas.has(k.id) && bisaSalin.length ? `<button class="btn pnk soft" onclick="pkSalinMaster(${k.id})">Salin master</button>` : ''}<button class="btn pnk soft" onclick="pkToggleKel(${k.id})">${k.aktif ? 'Nonaktifkan' : 'Aktifkan'}</button><button class="btn pnk soft" onclick="pkHapusKel(${k.id})">Hapus</button>` : ''}</div></td></tr>`)) : '<div class="note">Belum ada kelompok.</div>';
  if (kl) h += '<div class="tb"><button class="btn success" onclick="pkFormKel(0)">➕ Tambah kelompok</button></div>';
  if (PKR.kel.length && tanpa.length) h += `<div class="note"><b>${tanpa.length} siswa aktif belum punya kelompok</b>${mode === 'usia' ? ' (tanggal lahir kosong atau di luar rentang usia)' : ' (kelasnya belum dimasukkan ke kelompok)'}:<div class="mu">${tanpa.slice(0, 12).map(esc).join(', ')}${tanpa.length > 12 ? ', ...' : ''}</div></div>`;
  return h;
}
async function pkUbahPengaturan(kol) { const r = await dbq(db.from('pengaturan').update(kol).select('id')); if (!r || !r.length) throw new Error('Tidak diizinkan mengubah pengaturan ini'); Object.assign(S.set, kol); }
function pkSetMode(v) { if (role === 'Guru') return; guard(async () => { await pkUbahPengaturan({ kelompok_mode: v === 'usia' ? 'usia' : 'kelas' }); renderV(); toast('Pengelompokan disimpan'); }); }
function pkSetAcuan(v) { if (role === 'Guru' || !pkOkTgl(v)) return; const a = Object.assign({}, S.set.acuan_usia || {}); a[(S.set.tahun_ajaran || '') + '-' + pnSem] = v; guard(async () => { await pkUbahPengaturan({ acuan_usia: a }); renderV(); toast('Tanggal acuan disimpan'); }); }
function pkFormKel(id) {
  if (role === 'Guru') return; const k = id ? PKR.kel.find(x => x.id === id) : null, mode = pkMode(), a = (k && k.aturan) || {};
  resetTutup(); $('#mt').textContent = k ? 'Ubah kelompok' : 'Tambah kelompok';
  let h = `<div class="fg"><div class="fd"><label class="l">Nama kelompok</label><input id="pkfN" class="input" maxlength="60" value="${esc(k ? k.nama : '')}"></div>`;
  if (mode === 'usia') h += `<div class="fd"><label class="l">Usia minimum (bulan)</label><input id="pkfMin" class="input" inputmode="numeric" maxlength="3" value="${a.min == null ? '' : a.min}"></div><div class="fd"><label class="l">Usia maksimum (bulan)</label><input id="pkfMax" class="input" inputmode="numeric" maxlength="3" value="${a.max == null ? '' : a.max}"></div><div class="mu">Contoh: kelompok 3-4 tahun = 36 sampai 59 bulan.</div>`;
  else h += `<div class="fd"><label class="l">Kelas yang memakai kelompok ini</label>${S.kelas.map(c => `<label style="display:flex;gap:8px;align-items:center;padding:4px 0"><input type="checkbox" class="pkfK" value="${c.id}"${(a.kelas || []).includes(c.id) ? ' checked' : ''}> ${esc(c.nama)}</label>`).join('')}</div>`;
  $('#mbd').innerHTML = h + '</div>'; $('#ms').textContent = 'Simpan'; $('#ms').style.display = '';
  $('#ms').onclick = () => { Promise.resolve().then(() => pkSimpanKel(id)).then(() => closeM()).catch(e => toast(e.message || String(e), false)); };
  $('#md').classList.add('show');
}
async function pkSimpanKel(id) {
  const nama = ($('#pkfN').value || '').trim(); if (!nama) throw new Error('Nama kelompok wajib diisi'); let aturan;
  if (pkMode() === 'usia') { const mn = Number($('#pkfMin').value), mx = Number($('#pkfMax').value); if (!Number.isInteger(mn) || !Number.isInteger(mx) || mn < 0 || mx < mn || mx > 240) throw new Error('Rentang usia (bulan) tidak valid'); aturan = { min: mn, max: mx }; }
  else aturan = { kelas: [...document.querySelectorAll('.pkfK:checked')].map(x => +x.value) };
  if (id) await pnTry(() => dbq(db.from('rapor_kelompok').update({ nama, aturan }).eq('id', id)));
  else await pnTry(() => dbq(db.from('rapor_kelompok').insert({ nama, aturan, urutan: Math.max(0, ...PKR.kel.map(k => k.urutan || 0)) + 1 })));
  await pkMuat(); renderV(); toast('Kelompok tersimpan');
}
function pkToggleKel(id) { const k = PKR.kel.find(x => x.id === id); if (!k || role === 'Guru') return; guard(async () => { await pnTry(() => dbq(db.from('rapor_kelompok').update({ aktif: !k.aktif }).eq('id', id))); await pkMuat(); renderV(); toast(k.aktif ? 'Kelompok dinonaktifkan' : 'Kelompok diaktifkan'); }); }
async function pkHapusKel(id) {
  const k = PKR.kel.find(x => x.id === id); if (!k || role === 'Guru') return;
  if (!await konfirmasi('Hapus kelompok ' + k.nama + ' beserta master indikatornya? Kelompok yang sudah dipakai raport tidak bisa dihapus (nonaktifkan saja).', { bahaya: 1, judul: 'Hapus kelompok', ya: 'Hapus', ikon: '🗑️' })) return;
  guard(async () => { await pnTry(() => dbq(db.from('rapor_kelompok').delete().eq('id', id))); await pkMuat(); renderV(); toast('Kelompok dihapus'); });
}
function pkSalinMaster(id) {
  const k = PKR.kel.find(x => x.id === id), sumber = PKR.kel.filter(x => PKR.mas.has(x.id)); if (!k || role === 'Guru' || !sumber.length) return;
  form('Salin master ke ' + k.nama, [{ k: 'dari', l: 'Salin indikator dari kelompok', o: sumber.map(x => x.nama), v: sumber[0].nama }], async v => {
    const src = sumber.find(x => x.nama === v.dari); if (!src) throw new Error('Kelompok sumber tidak ditemukan');
    await pnTry(() => dbq(db.rpc('rapor_master_simpan', { p_kelompok: id, p_isi: PKR.mas.get(src.id).isi, p_versi: 0, p_ringkas: 'Disalin dari ' + src.nama })));
    await pkMuat(); renderV(); toast('Master disalin dari ' + src.nama);
  });
}
