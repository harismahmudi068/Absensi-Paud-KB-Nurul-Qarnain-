// Fungsi server: data Portal Orang Tua (tanpa login).
// GET  /api/portal?k=<kode_qr siswa>&v=<halaman>  : baca data (tidak mengubah apa pun).
// POST /api/portal  {k, status: izin|sakit, catatan}  : orang tua melaporkan izin/sakit HARI INI
//      (cara = 'Dashboard Siswa').
// PATCH /api/portal  {k, nama, pan, tgl, jk, alamat, wa}  : orang tua mengubah profil anak.
//      Kelas, NISN, dan tahun masuk TIDAK PERNAH diubah lewat jalur ini. Nomor WA berlaku per anak
//      (satu nomor boleh dipakai beberapa anak, atau tiap anak memakai nomor berbeda).
// Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (lihat api/_lib.js)
//
// Aturan pemisahan sekolah:
//  - Satu-satunya masukan dari pengunjung adalah kode QR (UUID).
//  - sekolah_id DIAMBIL dari baris siswa hasil pencarian kode, tidak pernah dari input.
//  - Setiap query lanjutan memakai siswa_id DAN sekolah_id dari baris itu.
//  - Parameter v (dashboard|siswa|absensi|tabungan|piket|hafalan|libur) membatasi data yang dimuat per menu.
//  - Kode tidak dikenal, siswa nonaktif, atau sekolah nonaktif dijawab 404 yang sama.

const L = require('./_lib');

const RE_KODE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIDAK_ADA = { error: 'Kartu tidak ditemukan' };

// Ambil semua baris (per 1000) dengan urutan yang stabil
async function semua(path) {
  const hasil = [];
  for (let i = 0; i < 30; i++) {
    const r = (await L.panggil(`${path}&limit=1000&offset=${i * 1000}`, 'GET')) || [];
    hasil.push(...r);
    if (r.length < 1000) break;
  }
  return hasil;
}

const CARA = 'Dashboard Siswa';

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const dowOf = (t) => new Date(t + 'T00:00:00Z').getUTCDay();
const tglPlus = (t, n) => new Date(Date.parse(t + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);

// Kunci publik VAPID untuk pengingat piket (push). Kunci privat hanya dipakai api/piket-notif.js
const VAPID_PUB = String(process.env.VAPID_PUBLIC_KEY || '').trim();
const RE_B64URL = /^[A-Za-z0-9_-]{16,200}$/;
// Alamat tujuan push hanya boleh milik layanan push resmi browser (mencegah server dipakai menembak alamat lain)
function endpointAman(u) {
  try {
    const x = new URL(String(u));
    if (x.protocol !== 'https:' || x.username || x.password || x.port) return false;
    const h = x.hostname.toLowerCase();
    return (
      h === 'fcm.googleapis.com' ||
      h === 'android.googleapis.com' ||
      h.endsWith('.push.services.mozilla.com') ||
      h === 'updates.push.services.mozilla.com' ||
      h.endsWith('.push.apple.com') ||
      h.endsWith('.notify.windows.com')
    );
  } catch (e) {
    return false;
  }
}

// Apakah hari ini libur untuk kelas anak (mingguan + nasional + tanggal, dikurangi libur_batal)?
async function liburHariIni(sid, kid, hariIni) {
  const dow = new Date(hariIni + 'T00:00:00Z').getUTCDay();
  const [mg, nas, tg, bt] = await Promise.all([
    L.panggil(`/rest/v1/libur_mingguan?sekolah_id=eq.${sid}&select=hari`, 'GET'),
    L.panggil(`/rest/v1/libur_nasional?tanggal=eq.${hariIni}&select=tanggal&limit=1`, 'GET'),
    L.panggil(`/rest/v1/libur_tanggal?sekolah_id=eq.${sid}&mulai=lte.${hariIni}&or=(sampai.gte.${hariIni},sampai.is.null)&select=kelas_id`, 'GET'),
    L.panggil(`/rest/v1/libur_batal?sekolah_id=eq.${sid}&tanggal=eq.${hariIni}&select=kelas_id`, 'GET')
  ]);
  const semuaAtauKelas = (x) => x.kelas_id == null || Number(x.kelas_id) === 0 || Number(x.kelas_id) === kid;
  if ((bt || []).some(semuaAtauKelas)) return false;
  return (
    (mg || []).some((x) => Number(x.hari) === dow) ||
    (nas || []).length > 0 ||
    (tg || []).some((x) => x.kelas_id == null || Number(x.kelas_id) === kid)
  );
}

// Orang tua melaporkan izin/sakit hari ini. Tanggal, sekolah, dan siswa ditentukan server.
async function kirimLaporan(req, res) {
  if (!/^application\/json/i.test(String(req.headers['content-type'] || '')))
    return res.status(415).json({ error: 'Format permintaan tidak didukung' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const k = String(b.k || '').trim();
  if (!RE_KODE.test(k)) return res.status(404).json(TIDAK_ADA);
  const status = b.status;
  if (status !== 'izin' && status !== 'sakit') return res.status(400).json({ error: 'Pilih Izin atau Sakit' });
  const catatan = String(b.catatan || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (catatan.length > 200) return res.status(400).json({ error: 'Keterangan maksimal 200 karakter' });

  try {
    const cari = (await L.panggil(`/rest/v1/siswa?kode_qr=eq.${encodeURIComponent(k)}&select=id,sekolah_id,kelas_id,aktif&limit=2`, 'GET')) || [];
    if (cari.length !== 1 || !cari[0].aktif) return res.status(404).json(TIDAK_ADA);
    const sid = Number(cari[0].sekolah_id), id = Number(cari[0].id);
    const kid = cari[0].kelas_id ? Number(cari[0].kelas_id) : null;
    if (!Number.isInteger(sid) || !Number.isInteger(id)) return res.status(404).json(TIDAK_ADA);
    const sek = ((await L.panggil(`/rest/v1/sekolah?id=eq.${sid}&select=status&limit=1`, 'GET')) || [])[0];
    if (!sek || sek.status !== 'aktif') return res.status(404).json(TIDAK_ADA);

    const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    if (await liburHariIni(sid, kid, hariIni))
      return res.status(409).json({ error: 'Hari ini libur, tidak perlu mengirim izin atau sakit.' });

    const isi = { status, cara: CARA, jam_datang: null, catatan: catatan || null, diubah: new Date().toISOString(), diubah_oleh: null };
    // 1) Belum ada baris hari ini: tambah. Sudah ada: dilewati (tidak menimpa).
    let hasil = await L.panggil('/rest/v1/absensi?on_conflict=siswa_id,tanggal', 'POST',
      { sekolah_id: sid, siswa_id: id, tanggal: hariIni, ...isi },
      { Prefer: 'resolution=ignore-duplicates,return=representation' });
    // 2) Sudah ada: hanya alpa/izin/sakit (dan libur usang) yang boleh diganti. Hadir/terlambat tidak.
    if (!Array.isArray(hasil) || !hasil.length) {
      hasil = await L.panggil(
        `/rest/v1/absensi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&tanggal=eq.${hariIni}&status=in.(alpa,izin,sakit,libur)`,
        'PATCH', isi, { Prefer: 'return=representation' });
      if (!Array.isArray(hasil) || !hasil.length)
        return res.status(409).json({ error: 'Anak sudah tercatat hadir hari ini, laporan tidak dapat diubah.' });
    }
    await L.catatLog({ pelaku: null, sekolah_id: sid, aksi: 'laporan_dashboard_siswa', rincian: `${status} siswa ${id} ${hariIni}` });
    return res.status(200).json({ ok: true, absen_hari_ini: { tanggal: hariIni, status, jam: null, catatan } });
  } catch (e) {
    console.error('portal.js POST', e.message);
    return res.status(500).json({ error: 'Terjadi kendala, coba lagi beberapa saat' });
  }
}

// ---- Ubah profil oleh orang tua (kecuali kelas, NISN, tahun masuk) ----
const normWA = (n) => {
  let d = String(n || '').replace(/\D/g, '');
  if (d[0] === '0') d = '62' + d.slice(1);
  else if (d[0] === '8') d = '62' + d;
  return d;
};
const bersih = (x) => String(x == null ? '' : x).replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim();
const tglValid = (t) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return false;
  const y = +m[1], mo = +m[2], d = +m[3], x = new Date(Date.UTC(y, mo - 1, d));
  return x.getUTCFullYear() === y && x.getUTCMonth() === mo - 1 && x.getUTCDate() === d;
};

// Jenis notifikasi push yang tersedia di sekolah (piket, absensi, tabungan)
function notifTersedia(p) {
  const piket = !!(p.piket_aktif && p.notif_piket_aktif);
  const absensi = !!p.notif_absensi_aktif;
  const tabungan = !!(p.tabungan_aktif && p.notif_tabungan_aktif);
  return { piket, absensi, tabungan, ada: piket || absensi || tabungan };
}

// Pendaftaran dan pencabutan HP untuk notifikasi push. Satu HP boleh terdaftar untuk beberapa anak.
async function aksiPush(req, res) {
  if (!/^application\/json/i.test(String(req.headers['content-type'] || '')))
    return res.status(415).json({ error: 'Format permintaan tidak didukung' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const k = String(b.k || '').trim();
  if (!RE_KODE.test(k)) return res.status(404).json(TIDAK_ADA);
  try {
    const cari = (await L.panggil(`/rest/v1/siswa?kode_qr=eq.${encodeURIComponent(k)}&select=id,sekolah_id,aktif&limit=2`, 'GET')) || [];
    if (cari.length !== 1 || !cari[0].aktif) return res.status(404).json(TIDAK_ADA);
    const sid = Number(cari[0].sekolah_id), id = Number(cari[0].id);
    if (!Number.isInteger(sid) || !Number.isInteger(id)) return res.status(404).json(TIDAK_ADA);
    const sek = ((await L.panggil(`/rest/v1/sekolah?id=eq.${sid}&select=status&limit=1`, 'GET')) || [])[0];
    if (!sek || sek.status !== 'aktif') return res.status(404).json(TIDAK_ADA);

    if (b.aksi === 'push_cabut') {
      const ep = String(b.endpoint || '');
      if (!ep || ep.length > 600) return res.status(400).json({ error: 'Data tidak valid' });
      await L.panggil(`/rest/v1/push_langganan?siswa_id=eq.${id}&sekolah_id=eq.${sid}&endpoint=eq.${encodeURIComponent(ep)}`, 'DELETE');
      return res.status(200).json({ ok: true });
    }

    const peng = ((await L.panggil(`/rest/v1/pengaturan?sekolah_id=eq.${sid}&select=piket_aktif,notif_piket_aktif,notif_absensi_aktif,tabungan_aktif,notif_tabungan_aktif&limit=1`, 'GET')) || [])[0] || {};
    if (!notifTersedia(peng).ada)
      return res.status(409).json({ error: 'Notifikasi belum diaktifkan oleh sekolah' });
    const lg = b.langganan && typeof b.langganan === 'object' ? b.langganan : {};
    const ep = String(lg.endpoint || '');
    const kk = lg.keys && typeof lg.keys === 'object' ? lg.keys : {};
    const p256dh = String(kk.p256dh || ''), auth = String(kk.auth || '');
    if (!ep || ep.length > 600 || !endpointAman(ep) || !RE_B64URL.test(p256dh) || !RE_B64URL.test(auth))
      return res.status(400).json({ error: 'Data pengingat dari browser tidak valid' });
    const agen = String(b.agen || '').replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, 120);
    // Pilihan jenis notifikasi per HP (hanya ditimpa bila dikirim oleh halaman)
    const pil = b.terima && typeof b.terima === 'object' ? b.terima : null;
    const baris = { sekolah_id: sid, siswa_id: id, endpoint: ep, p256dh, auth, agen: agen || null, gagal: 0 };
    if (pil) {
      baris.terima_piket = pil.piket !== false;
      baris.terima_absensi = pil.absensi !== false;
      baris.terima_tabungan = pil.tabungan !== false;
    }
    await L.panggil('/rest/v1/push_langganan?on_conflict=siswa_id,endpoint', 'POST', baris,
      { Prefer: 'resolution=merge-duplicates,return=minimal' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('portal push:', e && e.message);
    return res.status(500).json({ error: 'Gagal memproses pengingat. Coba lagi' });
  }
}

async function ubahProfil(req, res) {
  if (!/^application\/json/i.test(String(req.headers['content-type'] || '')))
    return res.status(415).json({ error: 'Format permintaan tidak didukung' });
  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const k = String(b.k || '').trim();
  if (!RE_KODE.test(k)) return res.status(404).json(TIDAK_ADA);

  const nama = bersih(b.nama), pan = bersih(b.pan), alamat = bersih(b.alamat);
  const tgl = String(b.tgl || '').trim(), jk = String(b.jk || '').trim();
  const waMasuk = String(b.wa == null ? '' : b.wa).trim();
  const wa = waMasuk ? normWA(waMasuk) : '';
  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

  if (nama.length < 2 || nama.length > 100) return res.status(400).json({ error: 'Nama lengkap wajib diisi (maksimal 100 karakter)' });
  if (!pan || pan.length > 30) return res.status(400).json({ error: 'Nama panggilan wajib diisi (maksimal 30 karakter)' });
  if (alamat.length > 200) return res.status(400).json({ error: 'Alamat maksimal 200 karakter' });
  if (jk !== '' && jk !== 'L' && jk !== 'P') return res.status(400).json({ error: 'Jenis kelamin tidak valid' });
  if (tgl && (!tglValid(tgl) || tgl < '1990-01-01' || tgl > hariIni)) return res.status(400).json({ error: 'Tanggal lahir tidak valid' });
  if (waMasuk && !/^62\d{8,13}$/.test(wa)) return res.status(400).json({ error: 'Nomor WhatsApp tidak valid. Contoh: 081234567890' });

  try {
    const cari = (await L.panggil(
      `/rest/v1/siswa?kode_qr=eq.${encodeURIComponent(k)}` +
        '&select=id,sekolah_id,aktif,nama,nama_panggilan,tgl_lahir,jenis_kelamin,alamat,siswa_wali(wali_id,wali(no_wa))&limit=2',
      'GET')) || [];
    if (cari.length !== 1 || !cari[0].aktif) return res.status(404).json(TIDAK_ADA);
    const s = cari[0];
    const sid = Number(s.sekolah_id), id = Number(s.id);
    if (!Number.isInteger(sid) || !Number.isInteger(id)) return res.status(404).json(TIDAK_ADA);
    const sek = ((await L.panggil(`/rest/v1/sekolah?id=eq.${sid}&select=status&limit=1`, 'GET')) || [])[0];
    if (!sek || sek.status !== 'aktif') return res.status(404).json(TIDAK_ADA);

    const links = s.siswa_wali || [];
    const lama = (links.map((w) => w.wali && w.wali.no_wa).filter(Boolean))[0] || '';
    if (!wa && lama) return res.status(400).json({ error: 'Nomor WhatsApp tidak boleh dikosongkan' });

    const hasilSiswa = { nama, pan, tgl, jk, alamat, wa };
    const ubah = [];
    if (nama !== s.nama) ubah.push('nama');
    if (pan !== (s.nama_panggilan || '')) ubah.push('panggilan');
    if (tgl !== (s.tgl_lahir || '')) ubah.push('tgl_lahir');
    if (jk !== (s.jenis_kelamin || '')) ubah.push('jenis_kelamin');
    if (alamat !== (s.alamat || '')) ubah.push('alamat');
    const dataBerubah = ubah.length > 0;
    if (wa !== lama) ubah.push(`wa ${lama || '-'} ke ${wa}`);
    if (!ubah.length) return res.status(200).json({ ok: true, tidak_berubah: true, siswa: hasilSiswa });

    // 1) Data anak. Kelas, NISN, dan tahun masuk sengaja tidak ada di sini.
    if (dataBerubah) {
      const r = await L.panggil(`/rest/v1/siswa?id=eq.${id}&sekolah_id=eq.${sid}`, 'PATCH',
        { nama, nama_panggilan: pan, tgl_lahir: tgl || null, jenis_kelamin: jk || null, alamat: alamat || null },
        { Prefer: 'return=representation' });
      if (!Array.isArray(r) || !r.length) return res.status(404).json(TIDAK_ADA);
    }

    // 2) Nomor WA per anak: nomor yang sama boleh dipakai beberapa anak (baris wali dipakai bersama),
    //    nomor berbeda membuat/memakai baris wali lain. Baris wali milik anak lain tidak diubah.
    if (wa !== lama) {
      const w = await L.panggil('/rest/v1/wali?on_conflict=sekolah_id,no_wa', 'POST',
        { sekolah_id: sid, no_wa: wa }, { Prefer: 'resolution=merge-duplicates,return=representation' });
      const wid = Array.isArray(w) && w[0] ? w[0].id : null;
      if (wid == null) throw new Error('wali tidak tersimpan');
      if (!links.some((x) => String(x.wali_id) === String(wid)))
        await L.panggil('/rest/v1/siswa_wali', 'POST', { siswa_id: id, wali_id: wid }, { Prefer: 'return=representation' });
      await L.panggil(`/rest/v1/siswa_wali?siswa_id=eq.${id}&wali_id=neq.${encodeURIComponent(wid)}`, 'DELETE');
    }

    await L.catatLog({ pelaku: null, sekolah_id: sid, aksi: 'ubah_profil_dashboard_siswa', rincian: `siswa ${id} ubah: ${ubah.join(', ')}` });
    return res.status(200).json({ ok: true, siswa: hasilSiswa });
  } catch (e) {
    console.error('portal.js PATCH', e.message);
    return res.status(500).json({ error: 'Terjadi kendala, coba lagi beberapa saat' });
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method === 'POST') {
    const a = req.body && typeof req.body === 'object' ? req.body.aksi : '';
    if (a === 'push_daftar' || a === 'push_cabut') return aksiPush(req, res);
    return kirimLaporan(req, res);
  }
  if (req.method === 'PATCH') return ubahProfil(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan' });

  const k = String((req.query && req.query.k) || '').trim();
  if (!RE_KODE.test(k)) return res.status(404).json(TIDAK_ADA);
  // Manifest aplikasi (agar halaman ini bisa dipasang di Layar Utama, syarat push di iPhone). Tanpa data siswa.
  if (String((req.query && req.query.v) || '') === 'manifest') {
    res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    return res.status(200).send(JSON.stringify({
      name: 'Halaman Siswa',
      short_name: 'Halaman Siswa',
      lang: 'id',
      start_url: '/p/' + k,
      scope: '/p/',
      display: 'standalone',
      background_color: '#eaf6ee',
      theme_color: '#14693a',
      icons: [
        { src: '/ikon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/ikon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/ikon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    }));
  }
  // Halaman yang diminta: dashboard | siswa | absensi | tabungan | piket | hafalan | libur
  const HALAMAN = ['dashboard', 'siswa', 'absensi', 'tabungan', 'piket', 'hafalan', 'libur'];
  const v = HALAMAN.includes(String((req.query && req.query.v) || '')) ? String(req.query.v) : 'dashboard';

  try {
    // 1. Cari siswa dari kode QR
    const cari =
      (await L.panggil(
        `/rest/v1/siswa?kode_qr=eq.${encodeURIComponent(k)}` +
          `&select=id,sekolah_id,nama,nama_panggilan,nisn,kelas_id,aktif,tgl_lahir,jenis_kelamin,alamat,tahun_masuk,siswa_wali(wali(no_wa))&limit=2`,
        'GET'
      )) || [];
    if (cari.length !== 1) {
      if (cari.length > 1) console.error('portal: kode_qr ganda, ditolak');
      return res.status(404).json(TIDAK_ADA);
    }
    const s = cari[0];
    if (!s.aktif) return res.status(404).json(TIDAK_ADA);

    const sid = Number(s.sekolah_id);
    const id = Number(s.id);
    if (!Number.isInteger(sid) || !Number.isInteger(id)) return res.status(404).json(TIDAK_ADA);

    const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
    // Hari libur sesuai kelas siswa: mingguan + nasional + libur_tanggal, dikurangi libur_batal.
    const muatLibur = async () => {
      const th = Number(hariIni.slice(0, 4));
      const awal = `${th - 1}-01-01`, akhir = `${th + 1}-12-31`;
      const kid = s.kelas_id ? Number(s.kelas_id) : null;
      const [mg, nas, tg, bt] = await Promise.all([
        L.panggil(`/rest/v1/libur_mingguan?sekolah_id=eq.${sid}&select=hari`, 'GET'),
        semua(`/rest/v1/libur_nasional?tanggal=gte.${awal}&tanggal=lte.${akhir}&select=tanggal,keterangan&order=tanggal.asc`),
        semua(`/rest/v1/libur_tanggal?sekolah_id=eq.${sid}&sampai=gte.${awal}&mulai=lte.${akhir}&select=id,mulai,sampai,kelas_id,keterangan&order=mulai.asc,id.asc`),
        semua(`/rest/v1/libur_batal?sekolah_id=eq.${sid}&tanggal=gte.${awal}&tanggal=lte.${akhir}&select=tanggal,kelas_id`)
      ]);
      const lib = {};
      const hr = new Set((mg || []).map((x) => Number(x.hari)));
      for (let t = Date.UTC(th - 1, 0, 1); t <= Date.UTC(th + 1, 11, 31); t += 864e5) {
        const d = new Date(t);
        if (hr.has(d.getUTCDay())) lib[d.toISOString().slice(0, 10)] = { ket: 'Libur mingguan', jenis: 'mingguan' };
      }
      nas.forEach((n) => { lib[n.tanggal] = { ket: n.keterangan || 'Libur nasional', jenis: 'nasional' }; });
      tg.filter((x) => x.kelas_id == null || Number(x.kelas_id) === kid).forEach((x) => {
        const a = Date.parse(x.mulai + 'T00:00:00Z'), b = Date.parse(x.sampai + 'T00:00:00Z');
        for (let t = a, n = 0; t <= b && n < 400; t += 864e5, n++) {
          lib[new Date(t).toISOString().slice(0, 10)] = { ket: x.keterangan || 'Libur', jenis: 'tanggal' };
        }
      });
      bt.filter((x) => x.kelas_id == null || Number(x.kelas_id) === 0 || Number(x.kelas_id) === kid).forEach((x) => { delete lib[x.tanggal]; });
      return Object.keys(lib).sort().map((t) => ({ tanggal: t, ket: lib[t].ket, jenis: lib[t].jenis }));
    };

    // Filter jadwal piket dan daftar hafalan: kelas anak ATAU seluruh kelas (kelas_id kosong).
    const kidS = s.kelas_id ? Number(s.kelas_id) : null;
    const fKelas = kidS ? `or=(kelas_id.is.null,kelas_id.eq.${kidS})` : 'kelas_id=is.null';
    // Dashboard hanya perlu baris milik anak ini + piket seluruh kelas; halaman Piket memuat satu kelas penuh.
    const fPiket = v === 'piket'
      ? fKelas
      : (kidS
        ? `and=(or(kelas_id.is.null,kelas_id.eq.${kidS}),or(siswa_id.is.null,siswa_id.eq.${id}))`
        : `and=(kelas_id.is.null,or(siswa_id.is.null,siswa_id.eq.${id}))`);
    const kolPiket = v === 'piket'
      ? 'id,hari,catatan,siswa_id,kelas_id,siswa:siswa(nama,nama_panggilan),jenis:piket_jenis(id,nama,cakupan,urutan)'
      : 'hari,catatan,siswa_id,jenis:piket_jenis(nama,cakupan)';

    // Logo sekolah: hanya untuk halaman kartu (siswa), diambil terpisah agar halaman tetap jalan
    // walau kolom pengaturan.logo belum ada. Hanya data URL gambar yang diterima.
    const logoP = v === 'siswa'
      ? L.panggil(`/rest/v1/pengaturan?sekolah_id=eq.${sid}&select=logo&limit=1`, 'GET')
          .then(r => { const x = r && r[0] && r[0].logo; return (typeof x === 'string' && x.length <= 150000 && /^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+\/=]+$/.test(x)) ? x : ''; })
          .catch(() => '')
      : Promise.resolve('');
    // 2-3. Sekolah, pengaturan, kelas, dan data halaman diambil BERSAMAAN (satu putaran ke database).
    const [sekRows, pengRows, kelasRows, trxData, absData, liburData, pkRows, jnData, itemData, setData] = await Promise.all([
      L.panggil(`/rest/v1/sekolah?id=eq.${sid}&select=id,nama,status&limit=1`, 'GET'),
      L.panggil(
        `/rest/v1/pengaturan?sekolah_id=eq.${sid}&select=nama_sekolah,alamat,kota,tahun_ajaran,tabungan_aktif,piket_aktif,hafalan_aktif,notif_piket_aktif,notif_absensi_aktif,notif_tabungan_aktif&limit=1`,
        'GET'
      ),
      s.kelas_id
        ? L.panggil(`/rest/v1/kelas?id=eq.${Number(s.kelas_id)}&sekolah_id=eq.${sid}&select=nama&limit=1`, 'GET')
        : Promise.resolve([]),
      v === 'dashboard' || v === 'tabungan'
        ? semua(`/rest/v1/tabungan_transaksi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&select=id,tanggal,jenis,jumlah&order=tanggal.asc,id.asc`)
        : null,
      v === 'dashboard'
        ? L.panggil(`/rest/v1/absensi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&tanggal=eq.${hariIni}&select=tanggal,status,jam_datang,catatan&order=id.desc&limit=1`, 'GET')
        : v === 'absensi'
          ? semua(`/rest/v1/absensi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&select=tanggal,status,jam_datang,catatan&order=tanggal.desc,id.desc`)
          : null,
      v === 'dashboard' || v === 'libur' || v === 'piket' ? muatLibur() : null,
      v === 'dashboard' || v === 'piket'
        ? semua(`/rest/v1/piket_jadwal?sekolah_id=eq.${sid}&${fPiket}&select=${kolPiket}&order=id.asc`)
        : null,
      v === 'hafalan' ? L.panggil(`/rest/v1/hafalan_jenis?sekolah_id=eq.${sid}&select=id,nama,cakupan,urutan&order=urutan.asc,id.asc`, 'GET') : null,
      v === 'dashboard' || v === 'hafalan'
        ? semua(`/rest/v1/hafalan_item?sekolah_id=eq.${sid}&${fKelas}&select=id,jenis_id,judul,target&order=urutan.asc,id.asc`)
        : null,
      v === 'dashboard' || v === 'hafalan'
        ? semua(`/rest/v1/hafalan_setoran?siswa_id=eq.${id}&sekolah_id=eq.${sid}&hafalan_id=not.is.null&select=hafalan_id,hasil,tanggal&order=id.asc`)
        : null
    ]);
    const sek = (sekRows || [])[0];
    if (!sek || sek.status !== 'aktif') return res.status(404).json(TIDAK_ADA);
    const peng = (pengRows || [])[0] || {};
    const kelas = (kelasRows || [])[0] || {};

    const wa = ((s.siswa_wali || []).map((w) => w.wali && w.wali.no_wa).filter(Boolean))[0] || '';
    const out = {
      v,
      hari_ini: hariIni,
      siswa: {
        nama: s.nama,
        pan: s.nama_panggilan || '',
        nisn: s.nisn || '',
        kelas: kelas.nama || '',
        tgl: s.tgl_lahir || '',
        jk: s.jenis_kelamin || '',
        alamat: s.alamat || '',
        masuk: s.tahun_masuk || '',
        wa,
        kode_qr: k
      },
      sekolah: {
        nama: String(peng.nama_sekolah || '').trim() || sek.nama || '',
        alamat: peng.alamat || '',
        kota: peng.kota || '',
        tahun_ajaran: peng.tahun_ajaran || '',
        logo: await logoP
      },
      // Pengingat push piket: kunci publik hanya dikirim bila sekolah mengaktifkannya
      push: v === 'dashboard' || v === 'piket'
        ? (notifTersedia(peng).ada && VAPID_PUB ? { aktif: true, vapid: VAPID_PUB, jenis: { piket: notifTersedia(peng).piket, absensi: notifTersedia(peng).absensi, tabungan: notifTersedia(peng).tabungan } } : { aktif: false })
        : undefined,
      // Fitur yang aktif di sekolah ini (menentukan menu Piket dan Hafalan di halaman siswa)
      fitur: { piket: !!peng.piket_aktif, hafalan: !!peng.hafalan_aktif, notif_piket: !!peng.notif_piket_aktif }
    };

    const petaAbs = (a) => ({
      tanggal: a.tanggal,
      status: a.status,
      jam: a.jam_datang || null,
      catatan: a.catatan || ''
    });

    // Tabungan: setor menambah, selain itu mengurangi (sama dengan tabungan_saldo()).
    const muatTabungan = async () => {
      if (!peng.tabungan_aktif) return { aktif: false };
      const trx = trxData || [];
      let saldo = 0;
      const riwayat = trx.map((t) => {
        const j = Number(t.jumlah) || 0;
        saldo += t.jenis === 'setor' ? j : -j;
        return { tanggal: t.tanggal, jenis: t.jenis === 'setor' ? 'setor' : 'tarik', jumlah: j, saldo };
      });
      return { aktif: true, saldo, riwayat: riwayat.reverse() };
    };

    // Piket: ringkasan dashboard (hari ini + giliran berikutnya milik anak ini)
    const butirPiket = (r) => ({ jenis: (r.jenis && r.jenis.nama) || 'Piket', semua: !r.siswa_id, catatan: r.catatan || '' });
    const muatPiketRingkas = () => {
      if (!peng.piket_aktif) return { aktif: false };
      const rows = pkRows || [];
      const lib = new Set((liburData || []).map((x) => x.tanggal));
      const pada = (t) => rows.filter((r) => Number(r.hari) === dowOf(t)).map(butirPiket);
      const libur = lib.has(hariIni);
      let berikut = null;
      for (let n = 1; n <= 14 && !berikut; n++) {
        const t = tglPlus(hariIni, n);
        if (lib.has(t)) continue;
        const item = pada(t);
        if (item.length) berikut = { tanggal: t, hari: dowOf(t), item };
      }
      return { aktif: true, libur, hari_ini: libur ? [] : pada(hariIni), berikut, ada: rows.length > 0 };
    };
    // Piket: jadwal satu pekan (Senin sampai Minggu) untuk kelas anak, lengkap dengan hari libur pekan ini
    // dan libur 30 hari ke depan. Nama anak memakai nama panggilan.
    const muatPiketHalaman = () => {
      if (!peng.piket_aktif) return { aktif: false };
      const rows = pkRows || [];
      const lib = new Map((liburData || []).map((x) => [x.tanggal, x]));
      const senin = tglPlus(hariIni, -((dowOf(hariIni) + 6) % 7));
      const hari = [1, 2, 3, 4, 5, 6, 0].map((d, ix) => {
        const tanggal = tglPlus(senin, ix);
        const lb = lib.get(tanggal) || null;
        const grup = new Map();
        rows.filter((r) => Number(r.hari) === d).forEach((r) => {
          const jn = r.jenis || {};
          const key = jn.id == null ? 'x' : String(jn.id);
          if (!grup.has(key)) grup.set(key, { jenis: jn.nama || 'Piket', urut: Number(jn.urutan) || 0, semua: jn.cakupan === 'semua', anak: [], entri: [] });
          const g = grup.get(key);
          if (r.siswa_id) {
            const sw = r.siswa || {};
            const nm = String(sw.nama_panggilan || '').trim() || String(sw.nama || '').trim().split(' ')[0] || '-';
            g.anak.push({ nama: nm, saya: Number(r.siswa_id) === id });
            if (r.catatan && !g.entri.some((e) => e.catatan === r.catatan)) g.entri.push({ kelas: null, catatan: r.catatan });
          } else {
            g.entri.push({ kelas: r.kelas_id == null ? null : (kelas.nama || ''), catatan: r.catatan || '' });
          }
        });
        const item = [...grup.values()].sort((a, b) => a.urut - b.urut || a.jenis.localeCompare(b.jenis, 'id')).map((g) => {
          g.anak.sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
          return g;
        });
        return { hari: d, nama: NAMA_HARI[d], tanggal, hari_ini: tanggal === hariIni, libur: lb ? { ket: lb.ket, jenis: lb.jenis } : null, item };
      });
      const batas = tglPlus(hariIni, 30);
      const libur_depan = (liburData || [])
        .filter((x) => x.jenis !== 'mingguan' && x.tanggal > hariIni && x.tanggal <= batas)
        .slice(0, 8)
        .map((x) => ({ tanggal: x.tanggal, ket: x.ket }));
      return { aktif: true, hari, libur_depan };
    };
    // Hafalan: hafalan wajib semua kelas + hafalan kelas anak, lengkap dengan status tiap hafalan
    const muatHafalanData = (rinci) => {
      if (!peng.hafalan_aktif) return { aktif: false };
      const items = itemData || [];
      const st = new Map((setData || []).map((x) => [Number(x.hafalan_id), x]));
      let lancar = 0, ulang = 0;
      items.forEach((i) => { const x = st.get(Number(i.id)); if (x) { if (x.hasil === 'lancar') lancar++; else ulang++; } });
      const hasil = { aktif: true, lancar, ulang, total: items.length };
      if (!rinci) return hasil;
      hasil.jenis = (jnData || []).map((j) => ({
        nama: j.nama,
        cakupan: j.cakupan,
        item: items.filter((i) => Number(i.jenis_id) === Number(j.id)).map((i) => {
          const x = st.get(Number(i.id));
          return { judul: i.judul, target: i.target || '', status: x ? x.hasil : 'belum', tanggal: x ? x.tanggal : null };
        })
      })).filter((g) => g.item.length);
      return hasil;
    };

    // 4. Data per halaman: hanya yang diminta menu yang dimuat
    if (v === 'dashboard') {
      const abs = absData || [];
      out.absen_hari_ini = abs[0] ? petaAbs(abs[0]) : null;
      const tb = await muatTabungan();
      out.libur = liburData;
      if (tb.aktif) {
        tb.hari_ini = tb.riwayat.filter((t) => t.tanggal === hariIni);
        delete tb.riwayat;
      }
      out.tabungan = tb;
      out.piket = muatPiketRingkas();
      out.hafalan = muatHafalanData(false);
    } else if (v === 'absensi') {
      out.absensi = (absData || []).map(petaAbs);
    } else if (v === 'tabungan') {
      out.tabungan = await muatTabungan();
    } else if (v === 'piket') {
      out.piket = muatPiketHalaman();
    } else if (v === 'hafalan') {
      out.hafalan = muatHafalanData(true);
    } else if (v === 'libur') {
      out.libur = liburData;
    }
    return res.status(200).json(out);
  } catch (e) {
    console.error('portal.js', e.message);
    return res.status(500).json({ error: 'Terjadi kendala, coba lagi beberapa saat' });
  }
};
