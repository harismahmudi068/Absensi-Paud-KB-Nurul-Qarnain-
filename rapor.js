/* =====================================================================
   rapor.js  -  SATU-SATUNYA tempat desain raport.
   Dipakai bersama oleh index.html (guru) dan portal.html (orang tua), sama seperti kartu.js.
   MENGUBAH DESAIN RAPORT = cukup mengubah fungsi gambar() di bawah, lalu unggah file ini saja.

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
  const nip = s => { const a = String(s || '').replace(/\D/g, ''); return a.length === 18 ? a.slice(0, 8) + ' ' + a.slice(8, 14) + ' ' + a.slice(14, 15) + ' ' + a.slice(15) : String(s || '').trim(); };

  /* r = baris tabel rapor. o = {logo, sekolah, alamat, nama, nisn, kelas, wali:{nama,nip}, kepsek:{nama,nip}}
     (wali/kepsek dari o hanya dipakai bila raport belum menyimpan salinannya) */
  function susun(r, o) {
    o = o || {};
    const w = r.wali_nama ? { nama: r.wali_nama, nip: nip(r.wali_nip) } : (o.wali || {});
    const kp = r.kepsek_nama ? { nama: r.kepsek_nama, nip: nip(r.kepsek_nip) } : (o.kepsek || {});
    return {
      logo: o.logo || null, sekolah: o.sekolah || '', alamat: o.alamat || '',
      nama: o.nama || '', nisn: o.nisn || '', kelas: r.kelas_nama || o.kelas || '',
      semTxt: r.semester + ' (' + (r.semester === 1 ? 'Ganjil' : 'Genap') + ') - ' + r.jenis, ta: r.tahun_ajaran || '',
      wali: w, kepsek: kp,
      rows: (r.nilai || []).map(x => { const p = pred(x.n, x.k); return { m: x.m, n: x.n, p, d: x.d || (p ? desk(p, x.m) : '') }; }),
      sakit: r.sakit || 0, izin: r.izin || 0, alpa: r.alpa || 0, catatan: r.catatan || '',
      keputusan: r.keputusan || '', kelasTujuan: r.kelas_tujuan || '', draf: r.status === 'draf'
    };
  }

  /* ---------------- DESAIN RAPORT (ubah di sini) ---------------- */
  function gambar(doc, D) {
    const L = 14, R = 196, W = 182, BAWAH = 283;
    const bingkai = () => { doc.setDrawColor(...NV); doc.setLineWidth(1.6); doc.rect(3, 3, 204, 291); doc.setDrawColor(...GD); doc.setLineWidth(.5); doc.rect(6, 6, 198, 285); };
    const judul = (t, x, y) => { doc.setFillColor(...GD); doc.rect(x, y - 3.6, 1.4, 4.6, 'F'); doc.setFont('times', 'bold'); doc.setFontSize(10); doc.setTextColor(...NV); doc.text(t, x + 3.4, y); };
    const muat = (t, w, mx, mn) => { let f = mx; doc.setFontSize(f); while (f > mn && doc.getTextWidth(t) > w) { f -= .3; doc.setFontSize(f); } };
    const titik = (x1, x2, y) => { doc.setDrawColor(...GR); doc.setLineWidth(.25); for (let x = x1; x < x2; x += 1.1) doc.line(x, y, Math.min(x + .35, x2), y); };
    const spasi = (t, cx, y, cs) => { let w = -cs; for (const ch of t) w += doc.getTextWidth(ch) + cs; let x = cx - w / 2; for (const ch of t) { doc.text(ch, x, y); x += doc.getTextWidth(ch) + cs; } };
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

    /* --- Kop: judul atas, nama sekolah tepat di tengah halaman, alamat --- */
    doc.setFont('times', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...NV);
    spasi('LAPORAN HASIL PENILAIAN UJIAN', 105, 15, 1.1);
    if (D.logo) { const m = 24, sc = Math.min(m / D.logo.w, m / D.logo.h), w = D.logo.w * sc, h = D.logo.h * sc; doc.addImage(D.logo.url, 'PNG', L + 2 + (m - w) / 2, 17 + (m - h) / 2, w, h); }
    doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...NV);
    const nl = doc.splitTextToSize(String(D.sekolah || '').toUpperCase(), 118);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const al = D.alamat ? doc.splitTextToSize(String(D.alamat), 118) : [];
    /* blok teks (nama sekolah + alamat) dipusatkan vertikal terhadap logo (pusat logo y = 29) */
    const LY = 17, LM = 24, pusatLogo = LY + LM / 2;
    const tinggi = (nl.length - 1) * 6.5 + (al.length ? 5.5 + (al.length - 1) * 4 : 0);
    const y0 = Math.max(24, pusatLogo - (tinggi - 3.8) / 2);
    doc.setFont('times', 'bold'); doc.setFontSize(15); doc.setTextColor(...NV);
    nl.forEach((t, i) => doc.text(t, 105, y0 + i * 6.5, { align: 'center' }));
    const yy = y0 + (nl.length - 1) * 6.5;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...GR);
    al.forEach((t, i) => doc.text(t, 105, yy + 5.5 + i * 4, { align: 'center' }));
    const ry = Math.max(44, yy + 5.5 + al.length * 4 + 3);
    doc.setDrawColor(...NV); doc.setLineWidth(.8); doc.line(L, ry, R, ry); doc.setLineWidth(.25); doc.line(L, ry + 1.6, R, ry + 1.6);

    /* --- Bilah judul --- */
    const by = ry + 6; doc.setFillColor(...NV); doc.rect(L, by, W, 9, 'F');
    doc.setFont('times', 'bold'); doc.setFontSize(11); doc.setTextColor(255, 255, 255); spasi('LAPORAN HASIL BELAJAR SISWA', 105, by + 6.1, 1.6);

    /* --- Identitas siswa --- */
    const iy = by + 16, F = [['Nama Siswa', D.nama, 'NISN / NIS', D.nisn], ['Kelas', D.kelas, 'Semester', D.semTxt], ['Tahun Ajaran', D.ta, 'Nama Wali Kelas', (D.wali || {}).nama]];
    F.forEach((x, i) => {
      const y = iy + i * 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...NV); doc.text(x[0], L, y); doc.text(x[2], L + 96, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(30, 30, 30);
      muat(String(x[1] || ''), 57, 9, 6.5); doc.text(String(x[1] || ''), L + 30, y - 1.2);
      muat(String(x[3] || ''), 55, 9, 6.5); doc.text(String(x[3] || ''), L + 126, y - 1.2);
      titik(L + 30, L + 88, y); titik(L + 126, R, y);
    });

    /* --- A. Nilai --- */
    const ay = iy + 3 * 7 + 4; judul('A. Nilai Mata Pelajaran', L, ay);
    let y = tbl(L, ay + 3, [{ w: 10, al: 'c' }, { w: 52 }, { w: 14, al: 'c' }, { w: 17, al: 'c', b: 1 }, { w: 89 }],
      D.rows.map((x, i) => [i + 1, x.m, x.n == null ? '' : String(x.n).replace('.', ','), x.p, x.d]),
      { head: ['No', 'Mata Pelajaran', 'Nilai', 'Predikat', 'Deskripsi'], page: true }) + 7;

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
    const sx = [L + 30, 105, R - 30], lab = ['Orang Tua / Wali', 'Wali Kelas', 'Kepala Sekolah'], nm = ['', (D.wali || {}).nama, (D.kepsek || {}).nama], np = ['', (D.wali || {}).nip, (D.kepsek || {}).nip];
    sx.forEach((x, i) => {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...TX); doc.text(lab[i], x, sy, { align: 'center' });
      const ny = sy + 26; doc.text('( ' + (nm[i] || '............................') + ' )', x, ny, { align: 'center' });
      if (i > 0) { doc.setFontSize(8); doc.setTextColor(...GR); doc.text('NIP. ' + (np[i] || '...............'), x, ny + 4.5, { align: 'center' }); }
    });
  }

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
    const fnt = () => { x.font = (sty === 'bold' ? 'bold ' : '') + (fs * PT * S).toFixed(2) + 'px ' + (fam === 'times' ? '"Times New Roman",Times,"Liberation Serif","Noto Serif",serif' : 'Helvetica,Arial,"Liberation Sans",Roboto,sans-serif'); };
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
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    Ds.forEach((D, i) => { if (i) doc.addPage(); gambar(doc, D); });
    doc.save(String(namaFile || 'Raport').replace(/\.pdf$/i, '') + '.pdf');
  }
  /* Pratinjau di layar (kanvas), bisa digeser/diperbesar oleh halaman pemanggil */
  function pratinjau(wadah, Ds, lebarCss) {
    wadah.innerHTML = ''; const doc = kanvasDoc(wadah, lebarCss || 640);
    Ds.forEach((D, i) => { if (i) doc.addPage(); gambar(doc, D); });
  }
  function lebar(wadah, px) { wadah.querySelectorAll('canvas').forEach(c => { c.style.width = px + 'px'; c.style.height = (297 / 210 * px) + 'px'; }); }

  return { versi: '1', pred, desk, nip, susun, gambar, pdf, pratinjau, lebar, logoPng, muatPdf };
})();
