// Fungsi server: data Portal Orang Tua (tanpa login).
// GET  /api/portal?k=<kode_qr siswa>&v=<halaman>  : baca data (tidak mengubah apa pun).
// POST /api/portal  {k, status: izin|sakit, catatan}  : orang tua melaporkan izin/sakit HARI INI
//      (satu-satunya penulisan; cara = 'Dashboard Siswa').
// Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (lihat api/_lib.js)
//
// Aturan pemisahan sekolah:
//  - Satu-satunya masukan dari pengunjung adalah kode QR (UUID).
//  - sekolah_id DIAMBIL dari baris siswa hasil pencarian kode, tidak pernah dari input.
//  - Setiap query lanjutan memakai siswa_id DAN sekolah_id dari baris itu.
//  - Parameter v (dashboard|siswa|absensi|tabungan|libur) membatasi data yang dimuat per menu.
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

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method === 'POST') return kirimLaporan(req, res);
  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan' });

  const k = String((req.query && req.query.k) || '').trim();
  if (!RE_KODE.test(k)) return res.status(404).json(TIDAK_ADA);
  // Halaman yang diminta: dashboard | siswa | absensi | tabungan | libur
  const HALAMAN = ['dashboard', 'siswa', 'absensi', 'tabungan', 'libur'];
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

    // 2. Sekolah harus aktif
    const sek = ((await L.panggil(`/rest/v1/sekolah?id=eq.${sid}&select=id,nama,status&limit=1`, 'GET')) || [])[0];
    if (!sek || sek.status !== 'aktif') return res.status(404).json(TIDAK_ADA);

    // 3. Pengaturan + kelas (ringan, selalu dimuat)
    const [pengRows, kelasRows] = await Promise.all([
      L.panggil(
        `/rest/v1/pengaturan?sekolah_id=eq.${sid}&select=nama_sekolah,alamat,kota,tahun_ajaran,tabungan_aktif&limit=1`,
        'GET'
      ),
      s.kelas_id
        ? L.panggil(`/rest/v1/kelas?id=eq.${Number(s.kelas_id)}&sekolah_id=eq.${sid}&select=nama&limit=1`, 'GET')
        : Promise.resolve([])
    ]);
    const peng = (pengRows || [])[0] || {};
    const kelas = (kelasRows || [])[0] || {};
    const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });

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
        tahun_ajaran: peng.tahun_ajaran || ''
      }
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
      const trx = await semua(
        `/rest/v1/tabungan_transaksi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&select=id,tanggal,jenis,jumlah&order=tanggal.asc,id.asc`
      );
      let saldo = 0;
      const riwayat = trx.map((t) => {
        const j = Number(t.jumlah) || 0;
        saldo += t.jenis === 'setor' ? j : -j;
        return { tanggal: t.tanggal, jenis: t.jenis === 'setor' ? 'setor' : 'tarik', jumlah: j, saldo };
      });
      return { aktif: true, saldo, riwayat: riwayat.reverse() };
    };

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

    // 4. Data per halaman: hanya yang diminta menu yang dimuat
    if (v === 'dashboard') {
      const abs = (await L.panggil(
        `/rest/v1/absensi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&tanggal=eq.${hariIni}&select=tanggal,status,jam_datang,catatan&order=id.desc&limit=1`,
        'GET'
      )) || [];
      out.absen_hari_ini = abs[0] ? petaAbs(abs[0]) : null;
      const [tb, lib] = await Promise.all([muatTabungan(), muatLibur()]);
      out.libur = lib;
      if (tb.aktif) {
        tb.hari_ini = tb.riwayat.filter((t) => t.tanggal === hariIni);
        delete tb.riwayat;
      }
      out.tabungan = tb;
    } else if (v === 'absensi') {
      const absensi = await semua(
        `/rest/v1/absensi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&select=tanggal,status,jam_datang,catatan&order=tanggal.desc,id.desc`
      );
      out.absensi = (absensi || []).map(petaAbs);
    } else if (v === 'tabungan') {
      out.tabungan = await muatTabungan();
    } else if (v === 'libur') {
      out.libur = await muatLibur();
    }
    return res.status(200).json(out);
  } catch (e) {
    console.error('portal.js', e.message);
    return res.status(500).json({ error: 'Terjadi kendala, coba lagi beberapa saat' });
  }
};
