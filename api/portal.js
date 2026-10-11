// Fungsi server: data Portal Orang Tua (tanpa login). HANYA BACA.
// Dipanggil dari portal.html:  GET /api/portal?k=<kode_qr siswa>
// Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (lihat api/_lib.js)
//
// Aturan pemisahan sekolah:
//  - Satu-satunya masukan dari pengunjung adalah kode QR (UUID).
//  - sekolah_id DIAMBIL dari baris siswa hasil pencarian kode, tidak pernah dari input.
//  - Setiap query lanjutan memakai siswa_id DAN sekolah_id dari baris itu.
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

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Referrer-Policy', 'no-referrer');

  if (req.method !== 'GET') return res.status(405).json({ error: 'Metode tidak diizinkan' });

  const k = String((req.query && req.query.k) || '').trim();
  if (!RE_KODE.test(k)) return res.status(404).json(TIDAK_ADA);

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

    // 3. Pengaturan, kelas, absensi (semuanya dibatasi sekolah_id milik siswa)
    const [pengRows, kelasRows, absensi] = await Promise.all([
      L.panggil(
        `/rest/v1/pengaturan?sekolah_id=eq.${sid}&select=nama_sekolah,alamat,kota,tahun_ajaran,tabungan_aktif&limit=1`,
        'GET'
      ),
      s.kelas_id
        ? L.panggil(`/rest/v1/kelas?id=eq.${Number(s.kelas_id)}&sekolah_id=eq.${sid}&select=nama&limit=1`, 'GET')
        : Promise.resolve([]),
      semua(
        `/rest/v1/absensi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&select=tanggal,status,jam_datang,catatan&order=tanggal.desc,id.desc`
      )
    ]);
    const peng = (pengRows || [])[0] || {};
    const kelas = (kelasRows || [])[0] || {};

    // 4. Tabungan (hanya bila diaktifkan sekolah). Rumus saldo sama dengan tabungan_saldo():
    //    setor menambah, selain itu mengurangi.
    let tabungan = { aktif: false };
    if (peng.tabungan_aktif) {
      const trx = await semua(
        `/rest/v1/tabungan_transaksi?siswa_id=eq.${id}&sekolah_id=eq.${sid}&select=id,tanggal,jenis,jumlah&order=tanggal.asc,id.asc`
      );
      let saldo = 0;
      const riwayat = trx.map((t) => {
        const j = Number(t.jumlah) || 0;
        saldo += t.jenis === 'setor' ? j : -j;
        return { tanggal: t.tanggal, jenis: t.jenis === 'setor' ? 'setor' : 'tarik', jumlah: j, saldo };
      });
      tabungan = { aktif: true, saldo, riwayat: riwayat.reverse() };
    }

    const wa = ((s.siswa_wali || []).map((w) => w.wali && w.wali.no_wa).filter(Boolean))[0] || '';

    return res.status(200).json({
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
      },
      absensi: (absensi || []).map((a) => ({
        tanggal: a.tanggal,
        status: a.status,
        jam: a.jam_datang || null,
        catatan: a.catatan || ''
      })),
      tabungan
    });
  } catch (e) {
    console.error('portal.js', e.message);
    return res.status(500).json({ error: 'Terjadi kendala, coba lagi beberapa saat' });
  }
};
