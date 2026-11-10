/* =====================================================================
   rapor.js  -  SATU-SATUNYA tempat desain raport.
   Dipakai bersama oleh index.html (guru) dan portal.html (orang tua), sama seperti kartu.js.
   Dua format: 'nilai' (angka, gambarN) dan 'perkembangan' (aspek > kategori > indikator, gambarP); gambar() memilih sesuai r.fmt.
   MENGUBAH DESAIN RAPORT = cukup mengubah fungsi gambarN()/gambarP() di bawah, lalu unggah file ini saja.

   Cara kerja: gambar() hanya memakai perintah sederhana (rect, line, text, addImage, ...)
   yang namanya sama dengan jsPDF. Untuk PDF dipakai jsPDF asli, untuk pratinjau layar dipakai
   penggambar kanvas buatan sendiri (kanvasDoc). Karena fungsi gambarnya SAMA, hasil PDF dan
   pratinjau selalu sama persis. Satuan semua ukuran: milimeter, kertas A4 tegak (210 x 297).
   ===================================================================== */
const Rapor = (() => {
  'use strict';
  const NV = [30, 58, 95], GD = [201, 150, 43], GR = [90, 100, 115], TX = [40, 48, 60], LN = [196, 205, 218], SH = [241, 244, 249];
  const PT = 0.3528;            // 1 pt = 0.3528 mm
  const imgC = {};              // gambar logo yang sudah siap (untuk pratinjau kanvas)
  let logoC = { k: '', v: null };

  /* ---------------- Data dan aturan nilai ---------------- */
  const pred = (n, k) => { if (n == null) return ''; const i = (100 - k) / 3; return n < k ? 'D' : n < k + i ? 'C' : n < k + 2 * i ? 'B' : 'A'; };
  const desk = (p, m) => ({
    A: 'Sangat baik dalam memahami materi ' + m + '.',
    B: 'Baik dalam memahami materi ' + m + '.',
    C: 'Cukup memahami materi ' + m + ', perlu ditingkatkan.',
    D: 'Belum mencapai ketuntasan pada materi ' + m + ', perlu bimbingan lebih lanjut.'
  })[p] || '';
  /* pengelompokan baris nilai per aspek: urutan aspek = urutan kemunculan pertama; yang tanpa aspek ("Lainnya") paling akhir.
     Hasil: [{a, rows:[{x, i}]}], i = indeks asli baris. */
  function aspekGrup(rows) {
    const g = [], mp = new Map();
    (rows || []).forEach((x, i) => { const a = String((x && x.a) || '').trim(), k = a.toLowerCase(); let o = mp.get(k); if (!o) { o = { a, rows: [] }; mp.set(k, o); g.push(o); } o.rows.push({ x, i }); });
    const li = g.findIndex(o => !o.a); if (li >= 0 && li < g.length - 1) g.push(g.splice(li, 1)[0]);
    return g;
  }
  const nip = s => { const a = String(s || '').replace(/\D/g, ''); return a.length === 18 ? a.slice(0, 8) + ' ' + a.slice(8, 14) + ' ' + a.slice(14, 15) + ' ' + a.slice(15) : String(s || '').trim(); };
  /* wali kelas yang tampil di raport. Bila pemanggil mengirim o.wali (halaman guru: wali kelas yang SEKARANG menjabat di kelas raport itu,
     kosong bila kelas tidak punya wali), itulah satu-satunya yang dipakai dan salinan nama di baris raport (wali_nama) diabaikan.
     Salinan itu hanya dipakai bila o.wali tidak dikirim sama sekali (halaman portal orang tua). */
  const waliTampil = (r, o) => {
    if (o.wali !== undefined) return o.wali && o.wali.nama ? Object.assign({}, o.wali) : {};
    return r.wali_nama ? { nama: r.wali_nama, nip: nip(r.wali_nip) } : {};
  };

  /* ---------------- Raport perkembangan: aturan teks otomatis ---------------- */
  const BLN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const tglIndo = (s, pad) => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '')); return m ? (pad ? m[3] : String(+m[3])) + ' ' + BLN[+m[2] - 1] + ' ' + m[1] : ''; };
  const hariJkt = ts => { try { return new Date(ts || Date.now()).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' }); } catch (e) { return ''; } };
  const romawi = n => { let r = ''; [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']].forEach(([v, t]) => { while (n >= v) { r += t; n -= v; } }); return r; };
  const huruf = n => { let r = ''; while (n > 0) { n--; r = String.fromCharCode(65 + n % 26) + r; n = Math.floor(n / 26); } return r; };
  /* gaya nomor: 'A' huruf besar, 'a' huruf kecil, '1' angka, 'I' romawi besar, 'i' romawi kecil, '' tanpa nomor */
  const nomorFmt = (g, n) => g === 'A' ? huruf(n) : g === 'a' ? huruf(n).toLowerCase() : g === 'I' ? romawi(n) : g === 'i' ? romawi(n).toLowerCase() : g === '1' ? String(n) : '';
  const kecil1 = t => { t = String(t || '').trim(); return t ? t.charAt(0).toLowerCase() + t.slice(1) : ''; };
  const besar1 = t => { t = String(t || '').trim(); return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''; };
  const judulKata = t => String(t || '').toLowerCase().replace(/(^|\s)(\S)/g, (m, a, b) => a + b.toUpperCase()).replace(/\b(Dan|Atau|Untuk|Dengan|Yang|Di|Ke|Dari)\b/g, k => k.toLowerCase());
  const rata = v => v.reduce((a, b) => a + b, 0) / v.length;

  /* pengaturan bawaan teks otomatis; master.set (per kelompok) menimpa ini */
  const DEF = {
    lv: { 1: 'BB', 2: 'MB', 3: 'BSH', 4: 'BSB' },
    aw: { 1: 'belum', 2: 'mulai', 3: 'sudah', 4: 'sangat baik dalam' }, bisa: 'bisa',
    u: { 1: '{F} Ananda {N} belum sesuai dengan {A}', 2: '{F} Ananda {N} mulai mendekati kesesuaian dengan {A}', 3: '{F} Ananda {N} sudah sesuai dengan {A}', 4: '{F} Ananda {N} sangat baik dan ideal sesuai {A}' },
    cat: { 1: 'Mohon bimbingan di rumah', 2: 'Mohon untuk terus dilatih di rumah', 3: 'Mohon untuk ditingkatkan', 4: 'Mohon dipertahankan' },
    cat_u: { 1: 'Mohon perbanyak makanan bergizi dan konsultasikan ke tenaga kesehatan', 2: 'Mohon perbanyak makanan bergizi dan pantau pertumbuhannya', 3: 'Mohon tetap dijaga pola makan bergizi', 4: 'Mohon dipertahankan' },
    pend: { batas: [1.75, 2.5, 3.5], umum: ['masih memerlukan banyak pendampingan', 'sedang mulai berkembang', 'sudah berkembang dengan baik', 'berkembang sangat baik'], unggul: 'Aspek yang sudah sangat baik: {X}.', perhatian: 'Aspek yang perlu diperhatikan: {X}.', penutup: ['Jangan lupa belajar di rumah.', 'Tetap semangat belajarnya ya.'] },
    tumbuh: ['Berat Badan', 'Tinggi Badan', 'Lingkar Lengan', 'Lingkar Kepala']
  };
  const pengaturan = M => Object.assign({}, DEF, (M && M.set) || {});

  /* kalimat capaian satu indikator pada satu level (i = indikator master, lv 1-4) */
  function cap(i, lv, nama, S) {
    S = S || DEF; lv = +lv; if (!(lv >= 1 && lv <= 4)) return '';
    if (i.x && i.x[lv]) return String(i.x[lv]).replace(/\{n\}/gi, nama);
    if (i.j === 'u') return S.u[lv].replace('{F}', besar1(i.f)).replace('{N}', nama).replace('{A}', i.a || '') + '.';
    return 'Ananda ' + nama + ' ' + S.aw[lv] + (i.j !== 'p' && lv < 4 ? ' ' + S.bisa : '') + ' ' + (i.f || kecil1(i.t)) + '.';
  }
  /* catatan satu indikator pada satu level */
  function catI(i, lv, S) { S = S || DEF; lv = +lv; if (!(lv >= 1 && lv <= 4)) return ''; return (i.j === 'u' ? S.cat_u : S.cat)[lv] || ''; }
  /* catatan pendidik otomatis dari rata-rata level per aspek (N = {id_indikator: level}) */
  function pendidik(M, N, nama, S) {
    S = S || DEF; const P = S.pend, b = P.batas, asp = [], all = [];
    ((M && M.aspek) || []).forEach(a => {
      const v = []; (a.sub || []).forEach(s => (s.ind || []).forEach(i => { const x = +N[i.id]; if (x >= 1 && x <= 4) { v.push(x); all.push(x); } }));
      if (v.length) asp.push([judulKata(a.n), rata(v)]);
    });
    if (!all.length) return '';
    const k = b.filter(x => rata(all) >= x).length, out = ['Ananda ' + nama + ' ' + P.umum[k] + '.'];
    const top = asp.filter(x => x[1] >= b[2]).sort((p, q) => q[1] - p[1]).slice(0, 2).map(x => x[0]);
    const low = asp.filter(x => x[1] < b[1]).sort((p, q) => p[1] - q[1]).slice(0, 2).map(x => x[0]);
    if (top.length) out.push(P.unggul.replace('{X}', top.join(' dan ')));
    if (low.length) out.push(P.perhatian.replace('{X}', low.join(' dan ')));
    out.push(P.penutup[k < 2 ? 0 : 1]);
    return out.map(t => '- ' + t).join('\n');
  }

  /* pohon bernomor dari master: [{id,no,n,kat:[{id,no,n,ind:[{i (indikator master), no, kd}]}]}]; dipakai PDF dan layar input */
  function pohon(M) {
    const nm = Object.assign({ a: 'A', s: '1', i: '1', gabung: true }, (M && M.nomor) || {});
    return ((M && M.aspek) || []).map((a, ai) => {
      const na = nomorFmt(nm.a, ai + 1); let ik = 0;
      return { id: a.id, no: na, n: a.n || '', kat: (a.sub || []).map(s => {
        const jdl = !!(s.n && String(s.n).trim()); if (jdl) ik++;
        return { id: s.id, no: jdl ? (nm.gabung && na ? na + '.' : '') + nomorFmt(nm.s, ik) : '', n: jdl ? String(s.n).trim() : '',
          ind: (s.ind || []).map((i, ii) => ({ i, no: nomorFmt(nm.i, ii + 1), kd: i.kd && M.kd && M.kd[i.kd] ? M.kd[i.kd].k : '' })) };
      }) };
    });
  }

  /* r = baris rapor (fmt 'perkembangan'). o = {logo, sekolah, alamat, kota, nama, panggilan, nisn, kelas, tempatLahir, tglLahir (yyyy-mm-dd),
       kelompok, kelompokLabel, master (salinan beku atau master terbaru), wali, kepsek, pengelola} */
  function susunP(r, o) {
    o = o || {};
    const M = o.master || { aspek: [] }, S = pengaturan(M), d = r.data || {}, N = d.n || {}, OV = d.o || {}, OC = d.oc || {};
    const nama = String(o.panggilan || '').trim() || String(o.nama || '').trim().split(/\s+/)[0] || '';
    const aspek = pohon(M).map(a => ({ no: a.no, n: a.n, kat: a.kat.map(k => ({ no: k.no, n: k.n, ind: k.ind.map(x => {
      const i = x.i, lv = +N[i.id] || 0;
      return { no: x.no, kd: x.kd || '-', t: i.t || '', lv, cap: OV[i.id] != null && OV[i.id] !== '' ? String(OV[i.id]) : cap(i, lv, nama, S), cat: OC[i.id] != null && OC[i.id] !== '' ? String(OC[i.id]) : catI(i, lv, S) };
    }) })) }));
    const w = waliTampil(r, o);
    const kp = r.kepsek_nama ? { nama: r.kepsek_nama, nip: nip(r.kepsek_nip) } : (o.kepsek || {});
    if (o.wali && o.wali.ttd) w.ttd = o.wali.ttd;
    if (o.kepsek && o.kepsek.ttd) kp.ttd = o.kepsek.ttd;
    /* pengelola: rapor terbit memakai nama yang dibekukan saat terbit; kosong = tidak ada tempat tanda tangan */
    const pgAktif = o.pengelola && o.pengelola.nama ? o.pengelola : null;
    const pg = !pgAktif ? null : (r.status === 'terbit' ? (r.pengelola_nama ? { nama: r.pengelola_nama, nip: nip(r.pengelola_nip) } : pgAktif) : pgAktif);
    if (pg && o.pengelola && o.pengelola.ttd) pg.ttd = o.pengelola.ttd;
    /* kolom bulan: data.bl (kunci 'YYYY-MM', maksimal 12) bila valid; data lama tanpa bl = 6 bulan bawaan semester */
    const blOk = Array.isArray(d.bl) && d.bl.length > 0 && d.bl.length <= 12 && d.bl.every(k => /^\d{4}-(0[1-9]|1[0-2])$/.test(k));
    const bulan = blOk ? d.bl.map(k => d.bl.length > 6 ? BLN[+k.slice(5) - 1].slice(0, 3) : BLN[+k.slice(5) - 1]) : (r.semester === 1 ? BLN.slice(6) : BLN.slice(0, 6)), tb = d.tb || [];
    const jns = { UTS: 'Ujian Tengah Semester', UAS: 'Ujian Akhir Semester' };
    /* keputusan akhir tahun (opsional): hanya UAS semester 2; raport terbit memakai yang dibekukan, draf memakai o.keputusan */
    const uas2 = r.jenis === 'UAS' && +r.semester === 2, kj = r.status === 'terbit' ? r.keputusan : (o.keputusan || r.keputusan), kt = r.status === 'terbit' ? r.kelas_tujuan : (o.kelasTujuan || r.kelas_tujuan);
    const kep = uas2 && ['naik', 'tinggal', 'lulus'].includes(kj) ? { j: kj, t: kj === 'naik' ? String(kt || '') : '' } : { j: '', t: '' };
    return {
      fmt: 'perkembangan', logo: o.logo || null, stempel: o.stempel || null, sekolah: o.sekolah || '', alamat: o.alamat || '',
      nama: o.nama || '', nisn: o.nisn || '', kelas: r.kelas_nama || o.kelas || '',
      ttl: [o.tempatLahir, tglIndo(o.tglLahir, true)].filter(Boolean).join(', '),
      kelompokLabel: o.kelompokLabel || 'Kelompok Usia', kelompok: o.kelompok || '',
      semTxt: r.semester + ' ' + r.jenis + ' (' + (jns[r.jenis] || r.jenis) + ')', ta: r.tahun_ajaran || '',
      wali: w, kepsek: kp, pengelola: pg, aspek,
      tb: { bulan, baris: (S.tumbuh || DEF.tumbuh).map((lab, i) => [lab].concat(bulan.map((_, j) => String(((tb[i] || [])[j]) == null ? '' : tb[i][j])))) },
      sakit: r.sakit || 0, izin: r.izin || 0, alpa: r.alpa || 0,
      keputusan: kep.j, kelasTujuan: kep.t,
      catatan: String(r.catatan || '').trim() || pendidik(M, N, nama, S),
      kota: o.kota || '', tgl: tglIndo(r.status === 'terbit' && r.diterbitkan_pada ? hariJkt(r.diterbitkan_pada) : hariJkt()), draf: r.status === 'draf'
    };
  }
  const susun = (r, o) => r && r.fmt === 'perkembangan' ? susunP(r, o) : susunN(r, o);

  /* r = baris tabel rapor. o = {logo, sekolah, alamat, nama, nisn, kelas, wali:{nama,nip}, kepsek:{nama,nip}}
     (wali dari o menjadi satu-satunya wali yang tampil bila dikirim; kepsek dari o hanya dipakai bila raport belum menyimpan salinannya) */
  function susunN(r, o) {
    o = o || {};
    const w = waliTampil(r, o);
    const kp = r.kepsek_nama ? { nama: r.kepsek_nama, nip: nip(r.kepsek_nip) } : (o.kepsek || {});
    if (o.wali && o.wali.ttd) w.ttd = o.wali.ttd;
    if (o.kepsek && o.kepsek.ttd) kp.ttd = o.kepsek.ttd;
    return {
      logo: o.logo || null, stempel: o.stempel || null, sekolah: o.sekolah || '', alamat: o.alamat || '',
      nama: o.nama || '', nisn: o.nisn || '', kelas: r.kelas_nama || o.kelas || '',
      semTxt: r.semester + ' (' + (r.semester === 1 ? 'Ganjil' : 'Genap') + ') - ' + r.jenis, ta: r.tahun_ajaran || '',
      wali: w, kepsek: kp,
      rows: (r.nilai || []).map(x => { const p = pred(x.n, x.k); return { m: x.m, n: x.n, k: x.k, a: String(x.a || '').trim(), p, d: x.d || (p ? desk(p, x.m) : '') }; }),
      sakit: r.sakit || 0, izin: r.izin || 0, alpa: r.alpa || 0, catatan: r.catatan || '',
      keputusan: r.keputusan || '', kelasTujuan: r.kelas_tujuan || '', draf: r.status === 'draf'
    };
  }

  /* alat gambar bersama untuk kedua format raport */
  function alat(doc) {
    const L = 14, R = 196, W = 182, BAWAH = 283;
    const bingkai = () => { doc.setDrawColor(...NV); doc.setLineWidth(1.6); doc.rect(3, 3, 204, 291); doc.setDrawColor(...GD); doc.setLineWidth(.5); doc.rect(6, 6, 198, 285); };
    const judul = (t, x, y) => { doc.setFillColor(...GD); doc.rect(x, y - 3.6, 1.4, 4.6, 'F'); doc.setFont('times', 'bold'); doc.setFontSize(10); doc.setTextColor(...NV); doc.text(t, x + 3.4, y); };
    const muat = (t, w, mx, mn) => { let f = mx; doc.setFontSize(f); while (f > mn && doc.getTextWidth(t) > w) { f -= .3; doc.setFontSize(f); } };
    const titik = (x1, x2, y) => { doc.setDrawColor(...GR); doc.setLineWidth(.25); for (let x = x1; x < x2; x += 1.1) doc.line(x, y, Math.min(x + .35, x2), y); };
    const spasi = (t, cx, y, cs) => { let w = -cs; for (const ch of t) w += doc.getTextWidth(ch) + cs; let x = cx - w / 2; for (const ch of t) { doc.text(ch, x, y); x += doc.getTextWidth(ch) + cs; } };
    return { L, R, W, BAWAH, bingkai, judul, muat, titik, spasi };
  }

  /* kop surat (logo, tajuk, nama sekolah, alamat, garis ganda); mengembalikan posisi y garis */
  function kop(doc, A, D, tajuk) {
    const { L, R, spasi } = A;
    const LY = 17, LM = 24, pusatLogo = LY + LM / 2;
    doc.setFont('times', 'bold'); doc.setFontSize(15);
    const nl = doc.splitTextToSize(String(D.sekolah || '').toUpperCase(), 118);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const al = D.alamat ? doc.splitTextToSize(String(D.alamat), 118) : [];
    /* seluruh blok teks kop (judul + nama sekolah + alamat) dipusatkan vertikal terhadap logo */
    const JARAK = 7.5; /* judul -> nama sekolah */
    const tinggi = JARAK + (nl.length - 1) * 6.5 + (al.length ? 5.5 + (al.length - 1) * 4 : 0);
    const ty = Math.max(14, pusatLogo - (tinggi - 2.7) / 2);
    doc.setFont('times', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...NV);
    spasi(tajuk, 105, ty, 1.1);
    if (D.logo) { const m = LM, sc = Math.min(m / D.logo.w, m / D.logo.h), w = D.logo.w * sc, h = D.logo.h * sc; doc.addImage(D.logo.url, 'PNG', L + 2 + (m - w) / 2, LY + (m - h) / 2, w, h); }
    const y0 = ty + JARAK;
    doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...NV);
    nl.forEach((t, i) => doc.text(t, 105, y0 + i * 6.5, { align: 'center' }));
    const yy = y0 + (nl.length - 1) * 6.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GR);
    al.forEach((t, i) => doc.text(t, 105, yy + 5.5 + i * 4, { align: 'center' }));
    const ry = Math.max(44, yy + 5.5 + al.length * 4 + 3);
    doc.setDrawColor(...NV); doc.setLineWidth(.8); doc.line(L, ry, R, ry); doc.setLineWidth(.25); doc.line(L, ry + 1.6, R, ry + 1.6);
    return ry;
  }

  /* ---------------- DESAIN RAPORT NILAI ANGKA (format lama) ---------------- */
  function ttdTampil(doc,url,cx,y,mw,mh){const im=imgC[url];if(!im)return;const iw=im.naturalWidth||im.width||1,ih=im.naturalHeight||im.height||1,sc=Math.min(mw/iw,mh/ih),w=iw*sc,h=ih*sc;doc.addImage(url,'PNG',cx-w/2,y+(mh-h)/2,w,h)}

  function gambarN(doc, D) {
    const A = alat(doc), { L, R, W, BAWAH } = A, { bingkai, judul, muat, titik, spasi } = A;
    const halBaru = () => { doc.addPage(); bingkai(); return 18; };

    /* tabel sederhana: kol=[{w,al:'l'|'c',b}], baris=[[teks,...]], o={head,fs,lh,pad,min,z,page} */
    function tbl(x, y, kol, baris, o) {
      const fs = o.fs || 8, lh = o.lh || 3.5, pad = o.pad || 2, mn = o.min || 9;
      const kepala = () => {
        if (!o.head) return;
        let cx = x; doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
        kol.forEach((k, i) => { doc.setFillColor(...NV); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(cx, y, k.w, 8, 'FD'); doc.setTextColor(255, 255, 255); doc.text(o.head[i], cx + k.w / 2, y + 5.3, { align: 'center' }); cx += k.w; });
        y += 8;
      };
      kepala();
      baris.forEach((b, ri) => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(fs);
        const sel = b.map((t, i) => { doc.setFont('helvetica', kol[i].b ? 'bold' : 'normal'); return doc.splitTextToSize(String(t == null ? '' : t), kol[i].w - 2 * pad); });
        const h = Math.max(mn, Math.max(...sel.map(s => s.length)) * lh + 2 * pad);
        if (o.page && y + h > BAWAH) { y = halBaru(); kepala(); }
        let cx = x;
        kol.forEach((k, i) => {
          const abu = (ri % 2 === (o.z ? 1 : 0));
          if (abu) doc.setFillColor(...SH); else doc.setFillColor(255, 255, 255);
          doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(cx, y, k.w, h, 'FD');
          doc.setFont('helvetica', k.b ? 'bold' : 'normal'); doc.setFontSize(fs); doc.setTextColor(...TX);
          const ty = y + (h - sel[i].length * lh) / 2 + lh * .75;
          sel[i].forEach((t, li) => { if (k.al === 'c') doc.text(t, cx + k.w / 2, ty + li * lh, { align: 'center' }); else doc.text(t, cx + pad, ty + li * lh); });
          cx += k.w;
        });
        y += h;
      });
      return y;
    }

    bingkai();
    if (D.draf) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 50, 50); doc.text('DRAF', R, 12, { align: 'right' }); }

    const ry = kop(doc, A, D, 'LAPORAN HASIL PENILAIAN UJIAN');

    /* --- Identitas siswa --- */
    const iy = ry + 12, F = [['Nama Siswa', D.nama, 'NISN / NIS', D.nisn], ['Kelas', D.kelas, 'Semester', D.semTxt], ['Tahun Ajaran', D.ta, 'Nama Wali Kelas', (D.wali || {}).nama]];
    F.forEach((x, i) => {
      const y = iy + i * 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...NV); doc.text(x[0], L, y); doc.text(x[2], L + 96, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
      muat(String(x[1] || ''), 57, 9, 6.5); doc.text(String(x[1] || ''), L + 30, y - 1.2);
      muat(String(x[3] || ''), 55, 9, 6.5); doc.text(String(x[3] || ''), L + 126, y - 1.2);
      titik(L + 30, L + 88, y); titik(L + 126, R, y);
    });

    /* --- A. Nilai --- */
    const ay = iy + 3 * 7 + 4; judul('A. Nilai Mata Pelajaran', L, ay);
    /* satu tabel per aspek (judul aspek di atasnya); tanpa aspek sama sekali = satu tabel polos */
    const gr = aspekGrup(D.rows), bernama = gr.some(g => g.a); let y = ay + 3;
    gr.forEach((g, gi) => {
      if (bernama) {
        if (y + 25 > BAWAH) y = halBaru();
        doc.setFillColor(...SH); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(L, y, W, 7, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NV); doc.text(String.fromCharCode(65 + gi) + '. ' + (g.a || 'Lainnya'), L + 2, y + 4.8); y += 7;
      }
      y = tbl(L, y, [{ w: 10, al: 'c' }, { w: 50 }, { w: 14, al: 'c' }, { w: 14, al: 'c' }, { w: 17, al: 'c', b: 1 }, { w: 77 }],
        g.rows.map(({ x }, i) => [i + 1, x.m, x.n == null ? '' : String(x.n).replace('.', ','), x.k == null ? '' : String(x.k), x.p, x.d]),
        { head: ['No', 'Mata Pelajaran', 'Nilai', 'KKM', 'Predikat', 'Deskripsi'], page: true }) + (gi < gr.length - 1 ? 3 : 0);
    });
    y += 7;

    /* --- B. Kehadiran dan C. Catatan --- */
    if (y + 36 > BAWAH) y = halBaru();
    judul('B. Kehadiran', L, y); judul('C. Catatan Wali Kelas', L + 78, y);
    const ye = tbl(L, y + 3, [{ w: 38 }, { w: 34, al: 'c' }], [['Sakit', D.sakit + ' hari'], ['Izin', D.izin + ' hari'], ['Tanpa Keterangan', D.alpa + ' hari']], { fs: 8.5, min: 9.5, z: 1 });
    const bh = ye - (y + 3); doc.setFillColor(...SH); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(L + 78, y + 3, W - 78, bh, 'FD');
    if (D.catatan) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TX); const mx = Math.max(1, Math.floor((bh - 5) / 4)); doc.splitTextToSize(D.catatan, W - 78 - 6).slice(0, mx).forEach((t, i) => doc.text(t, L + 81, y + 8.5 + i * 4)); }
    y = ye + 6;

    /* --- Keputusan (hanya bila ada) --- */
    if (D.keputusan) {
      const P = D.keputusan === 'naik' ? ['Keputusan: siswa ditetapkan ', 'NAIK', ' ke kelas ' + (D.kelasTujuan || '........')]
        : D.keputusan === 'tinggal' ? ['Keputusan: siswa ditetapkan ', 'TIDAK NAIK', ' (tetap di kelas ' + (D.kelas || '') + ')']
          : ['Keputusan: siswa dinyatakan ', 'LULUS', ' dari ' + (D.sekolah || '')];
      doc.setFillColor(250, 246, 235); doc.setDrawColor(...GD); doc.setLineWidth(.4); doc.rect(L, y, W, 10, 'FD'); doc.setFontSize(9); let x = L + 5;
      P.forEach((t, i) => { doc.setFont('helvetica', i === 1 ? 'bold' : 'normal'); doc.setTextColor(30, 30, 30); doc.text(t, x, y + 6.2); x += doc.getTextWidth(t); });
      y += 16;
    }

    /* --- Tanda tangan --- */
    let sy = Math.max(y + 4, 238); if (sy + 32 > 288) sy = halBaru() + 6;
    const wl0 = D.wali || {}, kp0 = D.kepsek || {}, PT = [{ l: 'Orang Tua / Wali', ot: 1 }];
    if (wl0.nama) PT.push({ l: 'Wali Kelas', n: wl0.nama, p: wl0.nip, ttd: wl0.ttd });
    if (kp0.nama) PT.push({ l: 'Kepala Sekolah', n: kp0.nama, p: kp0.nip, ttd: kp0.ttd });
    const sx = PT.length === 3 ? [L + 30, 105, R - 30] : PT.length === 2 ? [L + 45, R - 45] : [105];
    PT.forEach((q, i) => {
      const x = sx[i];
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...TX); doc.text(q.l, x, sy, { align: 'center' });
      if (q.ttd) ttdTampil(doc, q.ttd, x, sy + 7, 22, 13);
      const ny = sy + 26; doc.text('( ' + (q.n || '............................') + ' )', x, ny, { align: 'center' });
      if (!q.ot) { doc.setFontSize(8); doc.setTextColor(...GR); doc.text('NIP. ' + (q.p || '...............'), x, ny + 4.5, { align: 'center' }); }
    });
    const school=PT.map((q,i)=>({q,x:sx[i]})).filter(x=>!x.q.ot),scx=school.length>1?(school[0].x+school[school.length-1].x)/2:(school[0]&&school[0].x);
    if(school.length){doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...TX);doc.text('Mengetahui:',scx,sy-6,{align:'center'});}
    if(D.stempel&&D.stempel.url&&school.length)doc.addImage(D.stempel.url,'PNG',scx-12,sy+3,24,20);
  }

  /* ---------------- DESAIN RAPORT PERKEMBANGAN (aspek > kategori > indikator) ---------------- */
  function gambarP(doc, D) {
    const A = alat(doc), { L, R, W, BAWAH } = A;
    let hal = 1;
    const draf = () => { if (D.draf) { doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(200, 50, 50); doc.text('DRAF', R, 12, { align: 'right' }); } };
    const kaki = () => { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GR); doc.text('Laporan Perkembangan Peserta Didik - Halaman ' + hal, 105, 288.6, { align: 'center' }); };
    const halBaru = () => { kaki(); doc.addPage(); A.bingkai(); hal++; draf(); return 18; };

    A.bingkai(); draf();
    const ry = kop(doc, A, D, 'LAPORAN PERKEMBANGAN PESERTA DIDIK');

    /* --- Identitas --- */
    const iy = ry + 11;
    [['Nama Peserta Didik', D.nama, 'NISN / NIS', D.nisn], ['Tempat, Tanggal Lahir', D.ttl, D.kelompokLabel, D.kelompok],
      ['Kelas', D.kelas, 'Semester', D.semTxt], ['Tahun Pelajaran', D.ta, 'Wali Kelas', (D.wali || {}).nama]].forEach((x, i) => {
      const y = iy + i * 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...NV); doc.text(x[0], L, y); doc.text(x[2], L + 96, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
      A.muat(String(x[1] || ''), 54, 9, 6.5); doc.text(String(x[1] || ''), L + 35, y - 1.2);
      A.muat(String(x[3] || ''), 55, 9, 6.5); doc.text(String(x[3] || ''), L + 126, y - 1.2);
      A.titik(L + 35, L + 90, y); A.titik(L + 126, R, y);
    });

    /* --- Tabel indikator --- */
    const KOL = [11, 56, 85, 7.5, 7.5, 7.5, 7.5], X = [L]; KOL.forEach((w, i) => X.push(X[i] + w));
    const FS = 7.5, LH = 3.3, PAD = 1.8;
    let y = iy + 4 * 7 + 3, ctxK = null;
    const kepalaTabel = () => {
      ['KD', 'LINGKUP PERKEMBANGAN / INDIKATOR', 'CAPAIAN PERKEMBANGAN', 'BB', 'MB', 'BSH', 'BSB'].forEach((t, i) => {
        doc.setFillColor(...NV); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(X[i], y, KOL[i], 7, 'FD');
        doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255); A.muat(t, KOL[i] - 2, 7, 5.5); doc.text(t, X[i] + KOL[i] / 2, y + 4.6, { align: 'center' });
      });
      y += 7;
    };
    const barA = a => { doc.setFillColor(...NV); doc.rect(L, y, W, 6.5, 'F'); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255, 255, 255); doc.text((a.no ? a.no + '. ' : '') + String(a.n).toUpperCase(), L + 3, y + 4.5); y += 6.5; };
    const barK = (k, lanjut) => {
      doc.setFillColor(...SH); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(L, y, W, 5.5, 'FD'); doc.setFillColor(...GD); doc.rect(L, y, 1.4, 5.5, 'F');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...NV); doc.text((k.no ? k.no + ' ' : '') + k.n + (lanjut ? ' (lanjutan)' : ''), L + 3.5, y + 3.9); y += 5.5;
    };
    const ukur = x => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(FS);
      const tI = doc.splitTextToSize((x.no ? x.no + '. ' : '') + x.t, KOL[1] - 2 * PAD), tC = x.cap ? doc.splitTextToSize(x.cap, KOL[2] - 2 * PAD) : [];
      doc.setFont('helvetica', 'italic'); const tN = x.cat ? doc.splitTextToSize('Catatan: ' + x.cat, KOL[2] - 2 * PAD) : []; doc.setFont('helvetica', 'normal');
      return { tI, tC, tN, h: Math.max(9.5, Math.max(tI.length, tC.length + tN.length) * LH + 2 * PAD) };
    };
    const baris = (x, m, abu) => {
      const h = m.h; doc.setLineWidth(.2); doc.setDrawColor(...LN);
      KOL.forEach((w, i) => { if (abu) doc.setFillColor(...SH); else doc.setFillColor(255, 255, 255); doc.rect(X[i], y, w, h, 'FD'); });
      doc.setTextColor(...TX); doc.setFont('helvetica', 'normal'); doc.setFontSize(FS);
      doc.text(x.kd, X[0] + KOL[0] / 2, y + h / 2 + 1, { align: 'center' });
      m.tI.forEach((t, li) => doc.text(t, X[1] + PAD, y + PAD + LH * .75 + li * LH));
      m.tC.forEach((t, li) => doc.text(t, X[2] + PAD, y + PAD + LH * .75 + li * LH));
      doc.setFont('helvetica', 'italic'); doc.setTextColor(...GR);
      m.tN.forEach((t, li) => doc.text(t, X[2] + PAD, y + PAD + LH * .75 + (m.tC.length + li) * LH));
      doc.setFont('helvetica', 'normal');
      for (let k = 0; k < 4; k++) {
        const bx = X[3 + k] + (KOL[3 + k] - 3.2) / 2, by = y + (h - 3.2) / 2, on = x.lv === k + 1;
        doc.setLineWidth(.3); doc.setDrawColor(...(on ? NV : GR)); if (on) doc.setFillColor(...NV); else doc.setFillColor(255, 255, 255);
        doc.rect(bx, by, 3.2, 3.2, 'FD');
        if (on) { doc.setDrawColor(255, 255, 255); doc.setLineWidth(.5); doc.line(bx + .7, by + 1.7, bx + 1.4, by + 2.4); doc.line(bx + 1.4, by + 2.4, bx + 2.6, by + .9); }
      }
      y += h;
    };
    D.aspek.forEach(a => {
      if (y + 33 > BAWAH) y = halBaru();
      barA(a); kepalaTabel(); ctxK = null;
      a.kat.forEach(k => {
        if (k.n) { if (y + 19 > BAWAH) { y = halBaru(); kepalaTabel(); } barK(k, false); ctxK = k; } else ctxK = null;
        k.ind.forEach((x, ri) => {
          const m = ukur(x);
          if (y + m.h > BAWAH) { y = halBaru(); kepalaTabel(); if (ctxK) barK(ctxK, true); }
          baris(x, m, ri % 2 === 1);
        });
      });
      y += 4;
    });

    /* --- Pertumbuhan fisik --- */
    y += 2; if (y + 46 > BAWAH) y = halBaru();
    A.judul('Pertumbuhan Fisik', L, y + 3); y += 5;
    const nb = D.tb.bulan.length, TW = [38].concat(Array(nb).fill(144 / nb)), TX0 = [L], TF = nb > 9 ? 7 : 8.5; TW.forEach((w, i) => TX0.push(TX0[i] + w));
    ['Aspek'].concat(D.tb.bulan).forEach((t, i) => {
      doc.setFillColor(...NV); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(TX0[i], y, TW[i], 7, 'FD');
      doc.setFont('helvetica', 'bold'); doc.setFontSize(TF); doc.setTextColor(255, 255, 255); doc.text(t, TX0[i] + TW[i] / 2, y + 4.7, { align: 'center' });
    });
    y += 7;
    D.tb.baris.forEach((b, ri) => {
      b.forEach((t, i) => {
        if (ri % 2 === 1) doc.setFillColor(...SH); else doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(TX0[i], y, TW[i], 7, 'FD');
        doc.setFont('helvetica', i ? 'normal' : 'bold'); doc.setFontSize(TF); doc.setTextColor(...TX);
        if (i) doc.text(String(t), TX0[i] + TW[i] / 2, y + 4.8, { align: 'center' }); else doc.text(String(t), TX0[i] + 2, y + 4.8);
      });
      y += 7;
    });
    y += 5;

    /* --- Kehadiran dan catatan pendidik --- */
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    const cl = D.catatan ? doc.splitTextToSize(D.catatan, W - 78 - 6) : [], bh = Math.max(28.5, cl.length * 4 + 6);
    if (y + 5 + bh > BAWAH) y = halBaru();
    A.judul('Kehadiran', L, y + 3); A.judul('Catatan dan Rekomendasi Pendidik', L + 78, y + 3); y += 5;
    [['Sakit', D.sakit + ' hari'], ['Izin', D.izin + ' hari'], ['Tanpa Keterangan', D.alpa + ' hari']].forEach((b, ri) => {
      [38, 34].forEach((w, i) => {
        const x0 = i ? L + 38 : L; if (ri % 2 === 1) doc.setFillColor(...SH); else doc.setFillColor(255, 255, 255);
        doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(x0, y + ri * 9.5, w, 9.5, 'FD');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TX);
        if (i) doc.text(b[i], x0 + w / 2, y + ri * 9.5 + 6, { align: 'center' }); else doc.text(b[i], x0 + 2, y + ri * 9.5 + 6);
      });
    });
    doc.setFillColor(...SH); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(L + 78, y, W - 78, bh, 'FD');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...TX); cl.forEach((t, i) => doc.text(t, L + 81, y + 5.5 + i * 4));
    y += bh + 5;

    /* --- Catatan orang tua / wali (diisi tangan) --- */
    if (y + 25 > BAWAH) y = halBaru();
    A.judul('Catatan Orang Tua / Wali', L, y + 3);
    doc.setFillColor(255, 255, 255); doc.setDrawColor(...LN); doc.setLineWidth(.2); doc.rect(L, y + 5, W, 18, 'FD');
    for (let i = 0; i < 3; i++) A.titik(L + 3, R - 3, y + 11 + i * 5.5);
    y += 28;

    /* --- Keputusan akhir tahun (hanya bila ada) --- */
    if (D.keputusan) {
      if (y + 14 > BAWAH) y = halBaru();
      const P = D.keputusan === 'naik' ? ['Keputusan: siswa ditetapkan ', 'NAIK', ' ke kelas ' + (D.kelasTujuan || '........')]
        : D.keputusan === 'tinggal' ? ['Keputusan: siswa ditetapkan ', 'TIDAK NAIK', ' (tetap di kelas ' + (D.kelas || '') + ')']
          : ['Keputusan: siswa dinyatakan ', 'LULUS', ' dari ' + (D.sekolah || '')];
      doc.setFillColor(250, 246, 235); doc.setDrawColor(...GD); doc.setLineWidth(.4); doc.rect(L, y, W, 10, 'FD'); doc.setFontSize(9); let x = L + 5;
      P.forEach((s, i) => { doc.setFont('helvetica', i === 1 ? 'bold' : 'normal'); doc.setTextColor(30, 30, 30); doc.text(s, x, y + 6.2); x += doc.getTextWidth(s); });
      y += 14;
    }

    /* --- Tanggal dan tanda tangan: satu baris; Pengelola/Pengasuh hanya bila sekolah punya akunnya --- */
    if (y + 45 > 285) y = halBaru() + 2;
    if (D.tgl) { doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...TX); doc.text('Diterbitkan: ' + (D.kota ? D.kota + ', ' : '') + D.tgl + '.', R, y + 4, { align: 'right' }); }
    const pg = D.pengelola && D.pengelola.nama ? D.pengelola : null, wl = D.wali || {}, kp = D.kepsek || {};
    const P = [['Orang Tua / Wali', '', '', true, null]];
    if (wl.nama) P.push(['Wali Kelas', wl.nama, wl.nip, false, wl.ttd]);
    if (pg) P.push(['Pengelola/Pengasuh', pg.nama, pg.nip, false, pg.ttd]);
    if (kp.nama) P.push(['Kepala Sekolah', kp.nama, kp.nip, false, kp.ttd]);
    const nP = P.length, CX = nP === 4 ? [0, 1, 2, 3].map(i => L + 22.75 + i * 45.5) : nP === 3 ? [L + 30, 105, R - 30] : nP === 2 ? [L + 45, R - 45] : [105], yl = y + 18;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...TX);
    if (nP > 1) doc.text('Mengetahui:', nP === 4 ? (CX[2] + CX[3]) / 2 : CX[nP - 1], yl - 6, { align: 'center' });
    P.forEach((p, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...TX); doc.text(p[0], CX[i], yl, { align: 'center' });
      if (p[4]) ttdTampil(doc, p[4], CX[i], yl + 3, 22, 11);
      A.muat('( ' + (p[1] || '..........................') + ' )', 44, 9, 6.5); doc.text('( ' + (p[1] || '..........................') + ' )', CX[i], yl + 17, { align: 'center' });
      if (!p[3]) { doc.setFontSize(8); doc.setTextColor(...GR); doc.text('NIP. ' + (p[2] || '...............'), CX[i], yl + 21.5, { align: 'center' }); }
    });
    if(D.stempel&&D.stempel.url){const cx=nP===4?(CX[2]+CX[3])/2:CX[nP-1];doc.addImage(D.stempel.url,'PNG',cx-12,yl+3,24,13);}
    kaki();
  }
  const gambar = (doc, D) => D && D.fmt === 'perkembangan' ? gambarP(doc, D) : gambarN(doc, D);

  /* ---------------- Penggambar kanvas (pratinjau layar) ---------------- */
  function bagi(doc, t, w) {
    const out = []; String(t).split('\n').forEach(par => {
      let baris = '';
      par.split(/\s+/).filter(Boolean).forEach(kata => {
        while (doc.getTextWidth(kata) > w && kata.length > 1) {      // kata terlalu panjang: potong
          let n = kata.length - 1; while (n > 1 && doc.getTextWidth(kata.slice(0, n)) > w) n--;
          if (baris) { out.push(baris); baris = ''; }
          out.push(kata.slice(0, n)); kata = kata.slice(n);
        }
        const coba = baris ? baris + ' ' + kata : kata;
        if (baris && doc.getTextWidth(coba) > w) { out.push(baris); baris = kata; } else baris = coba;
      });
      out.push(baris);
    });
    return out;
  }
  function kanvasDoc(wadah, lebarCss) {
    const S = 4, hal = []; let c, x, fam = 'helvetica', sty = 'normal', fs = 10, tc = '#000', fc = '#000', dc = '#000', lw = .2;
    const rgb = (a, b, e) => b === undefined ? `rgb(${a},${a},${a})` : `rgb(${a},${b},${e})`;
    const fnt = () => { x.font = (sty === 'bold' ? 'bold ' : sty === 'italic' ? 'italic ' : '') + (fs * PT * S).toFixed(2) + 'px ' + (fam === 'times' ? '"Times New Roman",Times,"Liberation Serif","Noto Serif",serif' : 'Helvetica,Arial,"Liberation Sans",Roboto,sans-serif'); };
    const baru = () => {
      c = document.createElement('canvas'); c.width = 210 * S; c.height = 297 * S; c.className = 'rpc';
      c.style.width = lebarCss + 'px'; c.style.height = (297 / 210 * lebarCss) + 'px';
      x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); wadah.appendChild(c); hal.push(c);
    };
    const d = {
      setFont(f, s) { fam = f; sty = s || 'normal'; return d; }, setFontSize(n) { fs = n; return d; },
      setTextColor(a, b, e) { tc = rgb(a, b, e); return d; }, setFillColor(a, b, e) { fc = rgb(a, b, e); return d; }, setDrawColor(a, b, e) { dc = rgb(a, b, e); return d; },
      setLineWidth(w) { lw = w; return d; },
      rect(px, py, w, h, st) {
        const f = st === 'F' || st === 'FD' || st === 'DF', s = !st || st === 'S' || st === 'FD' || st === 'DF';
        if (f) { x.fillStyle = fc; x.fillRect(px * S, py * S, w * S, h * S); }
        if (s) { x.strokeStyle = dc; x.lineWidth = lw * S; x.strokeRect(px * S, py * S, w * S, h * S); }
        return d;
      },
      line(a, b, e, g) { x.strokeStyle = dc; x.lineWidth = lw * S; x.beginPath(); x.moveTo(a * S, b * S); x.lineTo(e * S, g * S); x.stroke(); return d; },
      text(t, px, py, o) { t = String(t); fnt(); x.fillStyle = tc; x.textBaseline = 'alphabetic'; const w = x.measureText(t).width / S, al = o && o.align; if (al === 'center') px -= w / 2; else if (al === 'right') px -= w; x.fillText(t, px * S, py * S); return d; },
      getTextWidth(t) { fnt(); return x.measureText(String(t)).width / S; },
      splitTextToSize(t, w) { return bagi(d, t, w); },
      addImage(u, f, px, py, w, h) { const im = imgC[u]; if (im) x.drawImage(im, px * S, py * S, w * S, h * S); return d; },
      addPage() { baru(); return d; }
    };
    baru(); return d;
  }

  /* ---------------- Fungsi untuk dipakai halaman ---------------- */
  function logoPng(src) {
    if (!(typeof src === 'string' && /^data:image\/(png|webp|jpeg);base64,/.test(src))) return Promise.resolve(null);
    if (logoC.k === src) return Promise.resolve(logoC.v);
    return new Promise(ok => {
      const im = new Image();
      im.onload = () => {
        try {
          const sc = Math.min(1, 300 / Math.max(im.width, im.height)), c = document.createElement('canvas');
          c.width = Math.max(1, Math.round(im.width * sc)); c.height = Math.max(1, Math.round(im.height * sc)); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
          const url = c.toDataURL('image/png'), i2 = new Image();
          i2.onload = () => { imgC[url] = i2; const v = { url, w: c.width, h: c.height }; logoC = { k: src, v }; ok(v); };
          i2.onerror = () => ok(null); i2.src = url;
        } catch (e) { ok(null); }
      };
      im.onerror = () => ok(null); im.src = src;
    });
  }
  function muatSkrip(u) { return new Promise((ok, gagal) => { const s = document.createElement('script'); s.src = u; s.onload = ok; s.onerror = () => gagal(new Error('Pustaka PDF gagal dimuat, periksa koneksi internet')); document.head.appendChild(s); }); }
  async function muatPdf() { if (window.jspdf && window.jspdf.jsPDF) return; await muatSkrip('https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'); }
  /* Ds = daftar data hasil susun(); satu data = satu raport. Hasilnya diunduh sebagai PDF. */
  async function pdf(Ds, namaFile) {
    await muatPdf();
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4', compress: true });   // compress: file PDF lebih kecil, tampilan sama
    for (let i = 0; i < Ds.length; i++) {
      if (i) doc.addPage(); gambar(doc, Ds[i]);
      if (i % 3 === 2) await new Promise(r => setTimeout(r, 0));   // beri jeda supaya layar HP tidak macet saat membuat PDF satu kelas
    }
    doc.save(String(namaFile || 'Raport').replace(/\.pdf$/i, '') + '.pdf');
  }
  /* Pratinjau di layar (kanvas), bisa digeser/diperbesar oleh halaman pemanggil */
  function pratinjau(wadah, Ds, lebarCss) {
    wadah.innerHTML = ''; const doc = kanvasDoc(wadah, lebarCss || 640);
    Ds.forEach((D, i) => { if (i) doc.addPage(); gambar(doc, D); });
  }
  function lebar(wadah, px) { wadah.querySelectorAll('canvas').forEach(c => { c.style.width = px + 'px'; c.style.height = (297 / 210 * px) + 'px'; }); }

  return { versi: '2', pred, desk, nip, susun, gambar, aspekGrup, pdf, pratinjau, lebar, logoPng, muatPdf, cap, catI, pendidik, pengaturan, pohon, nomorFmt, tglIndo, hariJkt };
})();
