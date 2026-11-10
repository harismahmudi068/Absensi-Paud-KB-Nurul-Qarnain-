// ============================================================
// NOTIFIKASI ALPA OTOMATIS
// Supabase -> Vercel -> Fonnte -> WhatsApp Admin
// ============================================================
//
// Penerima:
//   - Kepala Sekolah (nomor di Pengaturan > Koneksi) SELALU menjadi penerima utama.
//     Hasil pengirimannya menentukan status sent / failed (dan percobaan ulang).
//   - LIBUR: setelah kepala berhasil, pesan yang sama dikirim ke semua anggota aktif
//     sekolah (kepala, wakil, operator, guru) yang punya nomor WhatsApp di profil.
//   - ALPA: setelah kepala berhasil, setiap wali kelas menerima daftar alpa KELASNYA SAJA.
//     Wakil, operator, dan guru lain tidak menerima notifikasi alpa.
//   - Kegagalan pesan tambahan TIDAK membuat notifikasi dianggap gagal (agar kepala tidak
//     menerima pesan dobel saat percobaan ulang); hanya dicatat di terakhir_error.
//   - JEDA BERTAHAP: pesan ke kepala langsung dikirim. Pesan tambahan TIDAK dikirim sekaligus,
//     tetapi dijadwalkan di Fonnte (parameter schedule) dengan jeda acak 30-60 detik antar
//     penerima. Server hanya mendaftarkan jadwal (cepat), Fonnte yang mengirim sesuai jam.
//     Status tambahan = "terjadwal" (diterima Fonnte), bukan "sudah sampai".

// ============================================================
// TUJUAN NOTIFIKASI
// Nomor kepala sekolah dan token Fonnte diatur per sekolah di menu Pengaturan > Koneksi
// (tabel pengaturan_rahasia). Masa transisi: FONNTE_TOKEN lama hanya cadangan untuk sekolah pertama.
// ============================================================
const SEKOLAH_PERTAMA = 1;

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================
const crypto = require('crypto');
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENV_FONNTE = process.env.FONNTE_TOKEN || '';
const ALPA_SECRET = process.env.ALPA_NOTIF_SECRET;


// ============================================================
// FUNGSI SUPABASE
// ============================================================
async function supabase(path, options = {}) {
  const {
    method = 'GET',
    body,
    prefer
  } = options;

  const headers = {
    apikey: KEY,
    Authorization: 'Bearer ' + KEY,
    'Content-Type': 'application/json'
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(
    `${SB}/rest/v1/${path}`,
    {
      method,
      headers,
      body: body !== undefined
        ? JSON.stringify(body)
        : undefined
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase ${response.status}: ${text}`
    );
  }

  return text ? JSON.parse(text) : null;
}


// ============================================================
// VALIDASI KONFIGURASI
// ============================================================
function cekKonfigurasi() {
  if (!SB) {
    throw new Error('SUPABASE_URL belum dikonfigurasi di Vercel');
  }

  if (!KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Vercel'
    );
  }

  if (!ALPA_SECRET) {
    throw new Error(
      'ALPA_NOTIF_SECRET belum dikonfigurasi di Vercel'
    );
  }

}


// ============================================================
// FORMAT TANGGAL
// ============================================================
function formatTanggal(tanggal) {
  if (!tanggal) return '';

  return new Date(`${tanggal}T00:00:00+07:00`)
    .toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
}


// ============================================================
// KIRIM WHATSAPP MELALUI FONNTE
// ============================================================
// jadwal (opsional) = unix timestamp dalam detik; bila diisi, Fonnte mengirim pada jam itu.
async function kirimFonnte(token, nomorTujuan, teks, jadwal) {

  const isi = {
    target: nomorTujuan,
    message: teks
  };

  if (jadwal) {
    isi.schedule = Math.floor(Number(jadwal));
  }

  const response = await fetch(
    'https://api.fonnte.com/send',
    {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(isi)
    }
  );

  const hasil = await response.json().catch(() => ({}));

  if (!response.ok || hasil.status === false) {
    throw new Error(
      hasil.reason ||
      hasil.message ||
      'Fonnte menolak pengiriman pesan'
    );
  }

  return hasil;
}


// ============================================================
// PENERIMA TAMBAHAN (staf untuk libur, wali kelas untuk alpa)
// ============================================================
const RE_WA = /^628\d{8,12}$/;
const bersihNomor = (n) => String(n || '').replace(/\D/g, '');
const RE_ID = /^[0-9a-f-]{36}$/i;

// Jeda antar penerima (detik), dipilih ACAK agar tidak berpola tetap.
const JEDA_MIN = 30;
const JEDA_MAX = 60;
const jedaAcak = () => JEDA_MIN + Math.floor(Math.random() * (JEDA_MAX - JEDA_MIN + 1));

// ------------------------------------------------------------
// RIWAYAT KIRIM (tabel kirim_log, lihat langkah-kirim-log.sql)
// Gagal mencatat TIDAK boleh menggagalkan notifikasi.
// ------------------------------------------------------------
const idFonnte = (j) => {
  const v = j && j.id;
  const a = Array.isArray(v) ? v[0] : v;
  return a == null || a === '' ? null : String(a);
};

function barisLog(lg, nama, nomor, status, resp, err, waktu) {
  return {
    sekolah_id: lg.sekolahId,
    batch_id: lg.batch,
    oleh_developer: !!lg.olehDev,   // true = pesan uji dari tombol Developer: tersembunyi dari staf sekolah
    jenis: lg.jenis,
    judul: String(lg.judul || '').slice(0, 120),
    label: String(nama || '').slice(0, 120),
    nomor: String(nomor || '').slice(0, 20) || '-',
    fonnte_id: idFonnte(resp),
    status,
    error: err ? String(err).slice(0, 300) : null,
    jadwal_pada: status === 'terjadwal' && waktu ? new Date(waktu * 1000).toISOString() : null
  };
}

async function catatLog(baris) {
  if (!baris.length) return;
  try {
    await supabase('kirim_log', { method: 'POST', body: baris, prefer: 'return=minimal' });
  } catch (e) {
    console.error('Catat riwayat kirim gagal:', e && e.message);
  }
}

// Jadwalkan banyak pesan di Fonnte: penerima pertama 30-60 detik dari sekarang, penerima
// berikutnya 30-60 detik setelah penerima sebelumnya. Pendaftaran jadwal dilakukan 5 sekaligus
// (hanya mendaftar, bukan mengirim) agar cepat dan tidak melewati batas waktu fungsi.
// Mengembalikan daftar kegagalan pendaftaran (teks) dan jumlah yang berhasil dijadwalkan.
async function kirimBanyak(token, daftar, lg) {
  const gagal = [];
  const baris = [];
  let ok = 0;
  let waktu = Math.floor(Date.now() / 1000);
  const berjadwal = daftar.map((x) => {
    waktu += jedaAcak();
    return { ...x, waktu };
  });
  for (let i = 0; i < berjadwal.length; i += 5) {
    const bagian = berjadwal.slice(i, i + 5);
    const hasil = await Promise.allSettled(
      bagian.map((x) => kirimFonnte(token, x.nomor, x.teks, x.waktu))
    );
    hasil.forEach((h, j) => {
      const x = bagian[j];
      if (h.status === 'fulfilled') {
        ok++;
        if (lg) baris.push(barisLog(lg, x.nama, x.nomor, 'terjadwal', h.value, null, x.waktu));
      } else {
        const alasan = String((h.reason && h.reason.message) || h.reason);
        gagal.push(`${x.nama || x.nomor}: ${alasan}`);
        if (lg) baris.push(barisLog(lg, x.nama, x.nomor, 'gagal', null, alasan, null));
      }
    });
  }
  if (lg) await catatLog(baris);
  return { ok, gagal };
}

// Anggota aktif sekolah beserta nomor WhatsApp dari profil.
async function anggotaAktif(sekolahId, hanyaIds) {
  let url = `keanggotaan?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=profil_id`;
  if (hanyaIds) url += `&profil_id=in.(${hanyaIds.join(',')})`;
  const ang = (await supabase(url)) || [];
  const ids = [...new Set(ang.map((a) => a.profil_id).filter((x) => RE_ID.test(String(x))))];
  if (!ids.length) return [];
  const prof = (await supabase(`profil?id=in.(${ids.join(',')})&aktif=eq.true&select=id,nama,no_wa`)) || [];
  return prof.map((p) => ({ id: p.id, nama: p.nama || '', nomor: bersihNomor(p.no_wa) }));
}

// LIBUR: semua anggota aktif sekolah (selain nomor kepala yang sudah menerima).
async function kirimStafLibur(token, sekolahId, nomorKepala, teks, lg) {
  const pesan = teks.replace('Bapak/Ibu Kepala Sekolah', 'Bapak/Ibu');
  const sudah = new Set([nomorKepala]);
  const tujuan = [];
  for (const a of await anggotaAktif(sekolahId)) {
    if (!RE_WA.test(a.nomor) || sudah.has(a.nomor)) continue;
    sudah.add(a.nomor);
    tujuan.push({ nama: a.nama, nomor: a.nomor, teks: pesan });
  }
  return kirimBanyak(token, tujuan, lg);
}

// LIBUR: kirim satu pesan ke setiap grup yang terhubung dengan kelas yang benar-benar libur.
// Kelas harus memiliki sebab libur yang sama dengan pemeriksaan database dan seluruh siswanya
// sudah berstatus Libur pada tanggal tersebut.
async function dataKelasLibur(sekolahId, tanggal) {
  const [kelas, siswa, nasional, khusus, pengaturan] = await Promise.all([
    supabase(`kelas?sekolah_id=eq.${sekolahId}&select=id,nama&limit=5000`),
    supabase(`siswa?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=id,kelas_id&limit=5000`),
    supabase(`libur_nasional?tanggal=eq.${encodeURIComponent(tanggal)}&select=keterangan&limit=1`),
    supabase(`libur_tanggal?sekolah_id=eq.${sekolahId}&mulai=lte.${encodeURIComponent(tanggal)}&sampai=gte.${encodeURIComponent(tanggal)}&select=kelas_id,keterangan,masuk_kembali`),
    supabase(`pengaturan?sekolah_id=eq.${sekolahId}&select=notif_libur_mingguan,nama_sekolah&limit=1`)
  ]);
  const semuaSiswa = siswa || [];
  if (!kelas?.length || !semuaSiswa.length) return { kelas: [], namaSekolah: pengaturan?.[0]?.nama_sekolah || '' };
  const ids = semuaSiswa.map(x => Number(x.id)).filter(Number.isInteger);
  const hadirLibur = await supabase(`absensi?siswa_id=in.(${ids.map(encodeURIComponent).join(',')})&tanggal=eq.${encodeURIComponent(tanggal)}&status=eq.libur&select=siswa_id&limit=10000`);
  const setLibur = new Set((hadirLibur || []).map(x => String(x.siswa_id)));
  const hari = new Date(tanggal + 'T00:00:00Z').getUTCDay();
  const mingguan = pengaturan?.[0]?.notif_libur_mingguan
    ? await supabase(`libur_mingguan?sekolah_id=eq.${sekolahId}&hari=eq.${hari}&select=hari&limit=1`)
    : [];
  const hasil = [];
  for (const k of kelas) {
    const anak = semuaSiswa.filter(s => Number(s.kelas_id) === Number(k.id));
    if (!anak.length || !anak.every(s => setLibur.has(String(s.id)))) continue;
    let sebab = null;
    if (nasional?.length) {
      const ket = String(nasional[0].keterangan || '').trim();
      sebab = !ket || ket.toLowerCase() === 'libur nasional' ? 'Libur nasional' : 'Libur nasional (' + ket + ')';
    } else {
      const l = (khusus || []).filter(x => x.kelas_id == null || Number(x.kelas_id) === Number(k.id))
        .sort((a,b) => Number(a.kelas_id == null) - Number(b.kelas_id == null))[0];
      if (l) sebab = 'Libur sekolah' + (String(l.keterangan || '').trim() ? ' (' + String(l.keterangan).trim() + ')' : '');
      else if (mingguan?.length) sebab = hari === 0 || hari === 6 ? 'Akhir pekan' : 'Libur mingguan';
    }
    if (sebab) hasil.push({ id: Number(k.id), nama: k.nama, sebab });
  }
  return { kelas: hasil, namaSekolah: pengaturan?.[0]?.nama_sekolah || '' };
}

function pesanGrupLibur(sekolah, tanggal, daftarKelas) {
  const nama = [...new Set(daftarKelas.map(x => x.nama))].sort((a,b) => a.localeCompare(b, 'id'));
  const sebab = [...new Set(daftarKelas.map(x => x.sebab))];
  return [
    '🌸 *INFORMASI LIBUR SEKOLAH*',
    '',
    'Assalamu’alaikum warahmatullahi wabarakatuh.',
    '',
    'Yth. Bapak/Ibu Wali Murid,',
    '',
    'Kami informasikan bahwa kegiatan belajar mengajar pada:',
    '',
    '📅 Hari/Tanggal: *' + formatTanggal(tanggal) + '*',
    '',
    '🏫 Kelas yang diliburkan: *' + nama.join(', ') + '*',
    '📝 Keterangan: *' + sebab.join('; ') + '*',
    '',
    'Kegiatan belajar mengajar pada kelas tersebut diliburkan. Kegiatan belajar kembali dilaksanakan sesuai jadwal sekolah.',
    '',
    'Terima kasih atas perhatian dan kerja sama Bapak/Ibu. 😊',
    '',
    'Wassalamu’alaikum warahmatullahi wabarakatuh.',
    '',
    '🏫 *' + (sekolah || 'Sekolah') + '*'
  ].join('\n');
}

async function kirimGrupLibur(tokenUtama, sekolahId, tanggal, lg) {
  const data = await dataKelasLibur(sekolahId, tanggal);
  if (!data.kelas.length) return { ok: 0, gagal: [] };
  const kelasIds = data.kelas.map(x => x.id);
  const relasi = await supabase(`kelas_grup_wa?sekolah_id=eq.${sekolahId}&kelas_id=in.(${kelasIds.join(',')})&select=kelas_id,grup_wa_id`);
  if (!relasi?.length) return { ok: 0, gagal: [] };
  const grupIds = [...new Set(relasi.map(x => Number(x.grup_wa_id)).filter(Number.isInteger))];
  const [grupRows, tokenRows] = await Promise.all([
    supabase(`grup_wa?sekolah_id=eq.${sekolahId}&id=in.(${grupIds.join(',')})&select=id,grup_id,label,token_id`),
    supabase(`fonnte_token?sekolah_id=eq.${sekolahId}&select=id,token`)
  ]);
  const kelasById = new Map(data.kelas.map(x => [String(x.id), x]));
  const grupById = new Map((grupRows || []).map(x => [String(x.id), x]));
  const tokenById = new Map((tokenRows || []).map(x => [String(x.id), x.token]));
  const perGrup = new Map();
  for (const r of relasi) {
    const g = grupById.get(String(r.grup_wa_id));
    const k = kelasById.get(String(r.kelas_id));
    if (!g || !k || !g.grup_id) continue;
    if (!perGrup.has(String(g.id))) perGrup.set(String(g.id), { grup:g, kelas:[] });
    perGrup.get(String(g.id)).kelas.push(k);
  }
  const daftar = [...perGrup.values()].map(x => {
    const token = x.grup.token_id ? tokenById.get(String(x.grup.token_id)) : tokenUtama;
    return {
      nama: 'Grup ' + (x.grup.label || x.grup.grup_id),
      nomor: String(x.grup.grup_id),
      token,
      teks: pesanGrupLibur(data.namaSekolah, tanggal, x.kelas)
    };
  });
  const gagal = [], logs = [];
  let ok = 0, waktu = Math.floor(Date.now() / 1000);
  const antre = [];
  for (const x of daftar) {
    if (!x.token) {
      gagal.push(x.nama + ': token Fonnte grup tidak ditemukan');
      logs.push(barisLog(lg, x.nama, x.nomor, 'gagal', null, 'Token Fonnte grup tidak ditemukan', null));
      continue;
    }
    waktu += jedaAcak();
    antre.push({ ...x, waktu });
  }
  for (let i = 0; i < antre.length; i += 5) {
    const bagian = antre.slice(i, i + 5);
    const hasil = await Promise.allSettled(bagian.map(x => kirimFonnte(x.token, x.nomor, x.teks, x.waktu)));
    hasil.forEach((h, j) => {
      const x = bagian[j];
      if (h.status === 'fulfilled') {
        ok++;
        logs.push(barisLog(lg, x.nama, x.nomor, 'terjadwal', h.value, null, x.waktu));
      } else {
        const alasan = String((h.reason && h.reason.message) || h.reason);
        gagal.push(x.nama + ': ' + alasan);
        logs.push(barisLog(lg, x.nama, x.nomor, 'gagal', null, alasan, null));
      }
    });
  }
  await catatLog(logs);
  return { ok, gagal };
}

// ALPA: pesan khusus wali kelas, memakai kepala dan penutup pesan untuk kepala sekolah.
function pesanWali(teks, tanggal, daftarKelas) {
  const total = daftarKelas.reduce((n, k) => n + k.siswa.length, 0);
  const iHeader = teks.indexOf('Berikut daftar anak');
  const iFooter = teks.lastIndexOf('Terimakasih');
  let atas;
  if (iHeader > 0) {
    atas = teks
      .slice(0, iHeader)
      .replace('Bapak/Ibu Kepala Sekolah', 'Bapak/Ibu Wali Kelas')
      .replace(/Total: \d+ siswa/, `Total: ${total} siswa`);
  } else {
    atas =
      "_Assalamu'alaikum, Bapak/Ibu Wali Kelas_\n\n🔔 NOTIFIKASI ALPA OTOMATIS\n\n" +
      `📅 Tanggal: ${formatTanggal(tanggal)}\n👥 Total: ${total} siswa\n`;
  }
  const bawah = iFooter >= 0 ? teks.slice(iFooter) : 'Terimakasih 🌹';
  let daftar = 'Berikut daftar anak yang *DI ALPA* :\n\n';
  daftarKelas.forEach((k, idx) => {
    if (idx > 0) daftar += '\n';
    daftar += `📚 ${k.nama}\n`;
    k.siswa.forEach((n, i) => {
      daftar += `${i + 1}. ${n}\n`;
    });
  });
  return atas + daftar + '\n' + bawah;
}

async function kirimWaliAlpa(token, sekolahId, nomorKepala, teks, tanggal, alpa, lg) {
  if (!Array.isArray(alpa) || !alpa.length) return { ok: 0, gagal: [] };

  // Kelompokkan siswa alpa per kelas
  const perKelas = new Map();
  for (const x of alpa) {
    const kid = Number(x && x.kelas_id);
    if (!Number.isInteger(kid) || kid <= 0) continue;
    if (!perKelas.has(kid)) perKelas.set(kid, []);
    perKelas.get(kid).push(String(x.nama || '').trim());
  }
  if (!perKelas.size) return { ok: 0, gagal: [] };

  // Kelas harus milik sekolah ini; ambil wali kelasnya
  const kelas =
    (await supabase(
      `kelas?sekolah_id=eq.${sekolahId}&id=in.(${[...perKelas.keys()].join(',')})&select=id,nama,wali_profil_id`
    )) || [];
  const waliIds = [...new Set(kelas.map((k) => k.wali_profil_id).filter((x) => x && RE_ID.test(String(x))))];
  if (!waliIds.length) return { ok: 0, gagal: [] };

  // Wali harus anggota aktif sekolah ini dan punya nomor WhatsApp yang valid
  const wali = new Map((await anggotaAktif(sekolahId, waliIds)).map((a) => [a.id, a]));

  const perNomor = new Map();
  for (const k of kelas.slice().sort((a, b) => String(a.nama).localeCompare(String(b.nama)))) {
    const w = wali.get(k.wali_profil_id);
    if (!w || !RE_WA.test(w.nomor) || w.nomor === nomorKepala) continue;
    if (!perNomor.has(w.nomor)) perNomor.set(w.nomor, { nama: w.nama, kelas: [] });
    perNomor.get(w.nomor).kelas.push({ nama: k.nama, siswa: perKelas.get(Number(k.id)) || [] });
  }

  const tujuan = [...perNomor.entries()].map(([nomor, v]) => ({
    nama: `${v.nama} (wali ${v.kelas.map((k) => k.nama).join(', ')})`,
    nomor,
    teks: pesanWali(teks, tanggal, v.kelas)
  }));
  return kirimBanyak(token, tujuan, lg);
}


// ============================================================
// UPDATE STATUS NOTIFIKASI
// ============================================================
async function updateNotifikasi(id, data, tabel = 'notifikasi_alpa') {

  await supabase(
    `${tabel}?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: data,
      prefer: 'return=minimal'
    }
  );
}


// ============================================================
// ENDPOINT
// ============================================================
module.exports = async (req, res) => {

  // ----------------------------------------------------------
  // GET = TES ENDPOINT
  // ----------------------------------------------------------
  if (req.method === 'GET') {

    return res.status(200).json({
      ok: true,
      service: 'notifikasi-alpa',
      message: 'Endpoint notifikasi Alpa aktif'
    });
  }


  // ----------------------------------------------------------
  // HANYA POST
  // ----------------------------------------------------------
  if (req.method !== 'POST') {

    return res.status(405).json({
      ok: false,
      error: 'Metode tidak diizinkan'
    });
  }


  let id = null;
  // Endpoint yang sama dipakai untuk notifikasi alpa dan notifikasi libur.
  let tabel = 'notifikasi_alpa';

  try {

    cekKonfigurasi();


    // --------------------------------------------------------
    // CEK SECRET DARI SUPABASE
    // --------------------------------------------------------
    const secret =
      String(
        req.headers['x-alpa-secret'] || ''
      ).trim();

    if (!secret || secret !== ALPA_SECRET) {

      return res.status(401).json({
        ok: false,
        error: 'Tidak diizinkan'
      });
    }


    // --------------------------------------------------------
    // DATA DARI SUPABASE
    // --------------------------------------------------------
    const body = req.body || {};

    tabel = body.jenis === 'libur' ? 'notifikasi_libur' : 'notifikasi_alpa';

    id = body.id
      ? String(body.id)
      : null;

    const teks = String(
      body.teks || ''
    ).trim();

    const tanggal = String(
      body.tanggal || ''
    ).trim();


    if (!id) {

      return res.status(400).json({
        ok: false,
        error: 'ID notifikasi tidak ada'
      });
    }


    if (!teks) {

      return res.status(400).json({
        ok: false,
        error: 'Pesan kosong'
      });
    }


    // --------------------------------------------------------
    // CEK DATA NOTIFIKASI DI SUPABASE
    // --------------------------------------------------------
    const data = await supabase(
      `${tabel}?id=eq.${encodeURIComponent(id)}&select=id,sekolah_id,tanggal,pesan,status,percobaan,terkirim,terakhir_error`
    );


    if (!data || !data.length) {

      return res.status(404).json({
        ok: false,
        error: 'Notifikasi tidak ditemukan'
      });
    }


    const notif = data[0];


    // --------------------------------------------------------
    // JIKA SUDAH TERKIRIM, JANGAN KIRIM ULANG
    // --------------------------------------------------------
    if (
      notif.status === 'sent' ||
      notif.terkirim
    ) {

      return res.status(200).json({
        ok: true,
        duplicate: true,
        message: 'Notifikasi sudah pernah terkirim'
      });
    }


    // --------------------------------------------------------
    // TAMBAH JUMLAH PERCOBAAN
    // --------------------------------------------------------
    const percobaan =
      Number(notif.percobaan || 0) + 1;


    await updateNotifikasi(id, {
      status: 'processing',
      percobaan,
      terakhir_error: null
    }, tabel);


    // --------------------------------------------------------
    // KIRIM WHATSAPP
    // --------------------------------------------------------
    const sekolahId = Number(notif.sekolah_id);
    const rahasia = (await supabase(
      `pengaturan_rahasia?sekolah_id=eq.${sekolahId}&select=nomor_kepala`
    ) || [])[0] || {};
    const tokenUtama = (await supabase(
      `fonnte_token?sekolah_id=eq.${sekolahId}&select=token&order=id.asc&limit=1`
    ) || [])[0] || {};

    const token = tokenUtama.token ||
      (sekolahId === SEKOLAH_PERTAMA ? ENV_FONNTE : '');
    const nomorTujuan = String(rahasia.nomor_kepala || '').replace(/\D/g, '');

    if (!token) {
      throw new Error('Token Fonnte sekolah belum diisi di Pengaturan > Koneksi');
    }
    if (!/^628\d{8,12}$/.test(nomorTujuan)) {
      throw new Error('Nomor kepala sekolah belum diisi atau tidak valid di Pengaturan > Koneksi');
    }

    const jenisNotif = tabel === 'notifikasi_libur' ? 'libur' : 'alpa';
    const lg = {
      sekolahId,
      jenis: jenisNotif,
      judul: 'Notifikasi ' + jenisNotif + (tanggal ? ' ' + tanggal : ''),
      batch: tabel === 'notifikasi_libur' ? `libur-auto-${sekolahId}-${tanggal}-${id}` : crypto.randomUUID(),
      // 'uji' hanya dikirim fungsi database developer_uji_notif_libur (dilindungi X-Alpa-Secret)
      olehDev: body.uji === true
    };

    const balasanKepala = await kirimFonnte(token, nomorTujuan, teks);
    await catatLog([barisLog(lg, 'Kepala Sekolah', nomorTujuan, 'terjadwal', balasanKepala, null, null)]);


    // --------------------------------------------------------
    // BERHASIL
    // --------------------------------------------------------
    await updateNotifikasi(id, {
      status: 'sent',
      terkirim: new Date().toISOString(),
      terakhir_error: null
    }, tabel);


    // --------------------------------------------------------
    // PESAN TAMBAHAN (setelah kepala berhasil; kegagalan tidak membatalkan 'sent')
    // libur -> semua anggota aktif sekolah; alpa -> wali kelas (kelasnya saja)
    // --------------------------------------------------------
    let tambahan = { ok: 0, gagal: [] };
    try {
      if (tabel === 'notifikasi_libur') {
        let staf = { ok: 0, gagal: [] };
        let grup = { ok: 0, gagal: [] };
        try {
          staf = await kirimStafLibur(token, sekolahId, nomorTujuan, teks, lg);
        } catch (e) {
          staf.gagal.push('Notifikasi staf: ' + String(e.message || e));
        }
        if (body.uji !== true) {
          try {
            grup = await kirimGrupLibur(token, sekolahId, tanggal || String(notif.tanggal || ''), lg);
          } catch (e) {
            grup.gagal.push('Notifikasi grup: ' + String(e.message || e));
          }
        }
        tambahan = { ok: staf.ok + grup.ok, gagal: [...staf.gagal, ...grup.gagal] };
      } else {
        tambahan = await kirimWaliAlpa(token, sekolahId, nomorTujuan, teks, tanggal, body.alpa, lg);
      }

      if (tambahan.gagal.length) {
        await updateNotifikasi(id, {
          terakhir_error: ('Sebagian pesan tambahan gagal dijadwalkan: ' + tambahan.gagal.join('; ')).slice(0, 500)
        }, tabel);
      }
    } catch (e) {
      console.error('NOTIFIKASI TAMBAHAN ERROR:', e);
      tambahan.gagal.push(String(e.message || e));
      try {
        await updateNotifikasi(id, {
          terakhir_error: ('Pesan tambahan gagal dijadwalkan: ' + String(e.message || e)).slice(0, 500)
        }, tabel);
      } catch (_) {}
    }


    return res.status(200).json({
      ok: true,
      sent: true,
      id,
      tanggal,
      tambahan_terkirim: tambahan.ok,
      tambahan_terjadwal: tambahan.ok,
      tambahan_gagal: tambahan.gagal.length
    });


  } catch (error) {

    console.error(
      'NOTIFIKASI ALPA ERROR:',
      error
    );


    // --------------------------------------------------------
    // JIKA ID SUDAH TERSEDIA, SIMPAN ERROR
    // --------------------------------------------------------
    if (id) {

      try {

        await updateNotifikasi(id, {
          status: 'failed',
          terakhir_error: String(
            error.message || error
          ).slice(0, 500)
        }, tabel);

      } catch (updateError) {

        console.error(
          'Gagal menyimpan error notifikasi:',
          updateError
        );
      }
    }


    return res.status(500).json({
      ok: false,
      error: String(
        error.message || error
      )
    });
  }
};
