// Modul bersama untuk fungsi server (BUKAN fungsi sendiri: awalan garis bawah
// membuat Vercel tidak menghitungnya sebagai fungsi).
// Environment Variables:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   DEV_FONNTE_TOKEN  token perangkat Fonnte milik developer (untuk OTP dan notifikasi)
//   DEV_WA            nomor WhatsApp developer (628...) penerima notifikasi pendaftaran
//   OTP_RAHASIA       (opsional) kata acak panjang untuk mengamankan kode OTP; bila kosong
//                     dipakai SUPABASE_SERVICE_ROLE_KEY

const crypto = require('crypto');

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEV_TOKEN = process.env.DEV_FONNTE_TOKEN || '';
const DEV_WA = String(process.env.DEV_WA || '').replace(/\D/g, '');
const OTP_RAHASIA = process.env.OTP_RAHASIA || KEY || '';

const RE_UUID = /^[0-9a-f-]{36}$/i;
const RE_USER = /^[a-z0-9._-]{3,20}$/;
const RE_WA = /^628\d{8,12}$/;
const PESAN_USER =
  'Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah';

const OTP_BERLAKU_MENIT = 5;
const OTP_JEDA_DETIK = 60;
const OTP_MAKS_PER_NOMOR_JAM = 5;
const OTP_MAKS_PER_IP_JAM = 15;
const OTP_MAKS_SALAH = 5;

function kepala(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...extra };
  if (KEY && KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY;
  return h;
}

async function panggil(path, method, body, extra) {
  if (!SB || !KEY) throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum tersedia');
  const r = await fetch(SB + path, {
    method,
    headers: kepala(extra),
    body: body ? JSON.stringify(body) : undefined
  });
  const t = await r.text();
  let j = null;
  try {
    j = t ? JSON.parse(t) : null;
  } catch (e) {
    j = { pesan: t };
  }
  if (!r.ok) {
    throw new Error(
      (j && (j.msg || j.message || j.error_description || j.pesan)) ||
        'Kesalahan ' + r.status
    );
  }
  return j;
}

function normWA(n) {
  let d = String(n || '').replace(/\D/g, '');
  if (d[0] === '0') d = '62' + d.slice(1);
  else if (d[0] === '8') d = '62' + d;
  return d;
}

function pesanDuplikat(e) {
  return /already|registered|exists|duplicate|unique/i.test((e && e.message) || '');
}

function ipDari(req) {
  const x = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return x || String((req.socket && req.socket.remoteAddress) || '');
}

// ------------------------------------------------------------
// WhatsApp lewat perangkat Fonnte developer
// ------------------------------------------------------------
async function kirimDev(target, pesan) {
  if (!DEV_TOKEN) throw new Error('DEV_FONNTE_TOKEN belum diisi di Vercel');
  const r = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: DEV_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ target: String(target), message: pesan })
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) {
    throw new Error(j.reason || j.message || 'Fonnte menolak pengiriman pesan');
  }
  return true;
}

async function kabariDeveloper(pesan) {
  if (!DEV_WA) {
    console.error('DEV_WA belum diisi, notifikasi developer tidak dikirim');
    return false;
  }
  try {
    await kirimDev(DEV_WA, pesan);
    return true;
  } catch (e) {
    console.error('Gagal memberi tahu developer:', e.message);
    return false;
  }
}

// ------------------------------------------------------------
// OTP
// ------------------------------------------------------------
function hashKode(nomor, keperluan, kode) {
  return crypto
    .createHmac('sha256', OTP_RAHASIA)
    .update(`${nomor}|${keperluan}|${kode}`)
    .digest('hex');
}

// Membuat dan mengirim OTP ke nomor. Melempar error berpesan ramah bila ditolak.
async function kirimOtp({ nomor, keperluan, ip, pembuka, kosong }) {
  const sejam = new Date(Date.now() - 3600000).toISOString();

  const terakhir =
    (await panggil(
      `/rest/v1/otp_kode?tujuan=eq.${nomor}&dibuat=gt.${encodeURIComponent(sejam)}&select=dibuat&order=dibuat.desc&limit=${OTP_MAKS_PER_NOMOR_JAM}`,
      'GET'
    )) || [];
  if (terakhir.length >= OTP_MAKS_PER_NOMOR_JAM)
    throw new Error('Terlalu banyak permintaan kode untuk nomor ini. Coba lagi dalam satu jam');
  if (
    terakhir.length &&
    Date.now() - new Date(terakhir[0].dibuat).getTime() < OTP_JEDA_DETIK * 1000
  )
    throw new Error('Tunggu satu menit sebelum meminta kode lagi');

  if (ip) {
    const dariIp =
      (await panggil(
        `/rest/v1/otp_kode?ip=eq.${encodeURIComponent(ip)}&dibuat=gt.${encodeURIComponent(sejam)}&select=id&limit=${OTP_MAKS_PER_IP_JAM}`,
        'GET'
      )) || [];
    if (dariIp.length >= OTP_MAKS_PER_IP_JAM)
      throw new Error('Terlalu banyak permintaan kode dari perangkat ini. Coba lagi nanti');
  }

  // Kode lama untuk keperluan yang sama tidak berlaku lagi
  await panggil(
    `/rest/v1/otp_kode?tujuan=eq.${nomor}&keperluan=eq.${keperluan}&terpakai=eq.false`,
    'PATCH',
    { terpakai: true },
    { Prefer: 'return=minimal' }
  );

  const kode = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const baris = await panggil(
    '/rest/v1/otp_kode',
    'POST',
    {
      tujuan: nomor,
      keperluan,
      kode_hash: hashKode(nomor, keperluan, kode),
      kedaluwarsa: new Date(Date.now() + OTP_BERLAKU_MENIT * 60000).toISOString(),
      ip: ip || null
    },
    { Prefer: 'return=representation' }
  );
  const id = baris && baris[0] && baris[0].id;

  // Nomor tidak terdaftar: tetap dihitung agar respons tidak bisa dipakai menebak nomor
  if (kosong) {
    if (id) {
      await panggil(`/rest/v1/otp_kode?id=eq.${id}`, 'PATCH', { terpakai: true }, {
        Prefer: 'return=minimal'
      });
    }
    return true;
  }

  try {
    await kirimDev(
      nomor,
      `${pembuka || 'Kode verifikasi Anda'}: *${kode}*\n\nBerlaku ${OTP_BERLAKU_MENIT} menit. Jangan berikan kode ini kepada siapa pun.`
    );
  } catch (e) {
    if (id) {
      try {
        await panggil(`/rest/v1/otp_kode?id=eq.${id}`, 'DELETE');
      } catch (_) {}
    }
    console.error('Gagal mengirim OTP:', e.message);
    throw new Error('Kode gagal dikirim. Pastikan nomor WhatsApp aktif lalu coba lagi');
  }

  // Bersihkan kode lama sesekali
  if (Math.random() < 0.05) {
    const lama = new Date(Date.now() - 24 * 3600000).toISOString();
    panggil(`/rest/v1/otp_kode?dibuat=lt.${encodeURIComponent(lama)}`, 'DELETE').catch(() => {});
  }
  return true;
}

// Memeriksa kode. Sukses = kode langsung hangus (sekali pakai).
async function cekOtp(nomor, keperluan, kode) {
  const bersih = String(kode || '').replace(/\D/g, '');
  if (bersih.length !== 6) throw new Error('Kode harus 6 angka');

  const sekarang = new Date().toISOString();
  const r = await panggil(
    `/rest/v1/otp_kode?tujuan=eq.${nomor}&keperluan=eq.${keperluan}&terpakai=eq.false&kedaluwarsa=gt.${encodeURIComponent(sekarang)}&select=id,kode_hash,percobaan&order=dibuat.desc&limit=1`,
    'GET'
  );
  const o = r && r[0];
  if (!o) throw new Error('Kode tidak ditemukan atau sudah kedaluwarsa. Minta kode baru');
  if (o.percobaan >= OTP_MAKS_SALAH)
    throw new Error('Terlalu banyak percobaan salah. Minta kode baru');

  const dihitung = Buffer.from(hashKode(nomor, keperluan, bersih), 'hex');
  const tersimpan = Buffer.from(String(o.kode_hash), 'hex');
  const cocok =
    dihitung.length === tersimpan.length && crypto.timingSafeEqual(dihitung, tersimpan);

  if (!cocok) {
    await panggil(`/rest/v1/otp_kode?id=eq.${o.id}`, 'PATCH', { percobaan: o.percobaan + 1 }, {
      Prefer: 'return=minimal'
    });
    throw new Error('Kode salah');
  }

  await panggil(`/rest/v1/otp_kode?id=eq.${o.id}`, 'PATCH', { terpakai: true }, {
    Prefer: 'return=minimal'
  });
  return true;
}

// Memeriksa kode TANPA menghanguskannya (tombol Verifikasi sebelum submit).
// Salah tetap dihitung sebagai percobaan.
async function lihatOtp(nomor, keperluan, kode) {
  const bersih = String(kode || '').replace(/\D/g, '');
  if (bersih.length !== 6) throw new Error('Kode harus 6 angka');
  const sekarang = new Date().toISOString();
  const r = await panggil(
    `/rest/v1/otp_kode?tujuan=eq.${nomor}&keperluan=eq.${keperluan}&terpakai=eq.false&kedaluwarsa=gt.${encodeURIComponent(sekarang)}&select=id,kode_hash,percobaan&order=dibuat.desc&limit=1`,
    'GET'
  );
  const o = r && r[0];
  if (!o) throw new Error('Kode tidak ditemukan atau sudah kedaluwarsa. Minta kode baru');
  if (o.percobaan >= OTP_MAKS_SALAH) throw new Error('Terlalu banyak percobaan salah. Minta kode baru');
  const dihitung = Buffer.from(hashKode(nomor, keperluan, bersih), 'hex');
  const tersimpan = Buffer.from(String(o.kode_hash), 'hex');
  if (!(dihitung.length === tersimpan.length && crypto.timingSafeEqual(dihitung, tersimpan))) {
    await panggil(`/rest/v1/otp_kode?id=eq.${o.id}`, 'PATCH', { percobaan: o.percobaan + 1 }, {
      Prefer: 'return=minimal'
    });
    throw new Error('Kode salah');
  }
  return true;
}

// ------------------------------------------------------------
// Enkripsi (AES-256-GCM) untuk data yang harus bisa dibuka lagi oleh server,
// misalnya kata sandi baru pada permintaan nomor hilang sebelum disetujui.
// ------------------------------------------------------------
function kunciEnkripsi() {
  return crypto.scryptSync(OTP_RAHASIA || 'tanpa-rahasia', 'sandi-permintaan-v1', 32);
}
function enkripsi(teks) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv('aes-256-gcm', kunciEnkripsi(), iv);
  const isi = Buffer.concat([c.update(String(teks), 'utf8'), c.final()]);
  return [iv.toString('hex'), c.getAuthTag().toString('hex'), isi.toString('hex')].join('.');
}
function dekripsi(kode) {
  const [iv, tag, isi] = String(kode || '').split('.');
  if (!iv || !tag || !isi) throw new Error('Data terenkripsi rusak');
  const d = crypto.createDecipheriv('aes-256-gcm', kunciEnkripsi(), Buffer.from(iv, 'hex'));
  d.setAuthTag(Buffer.from(tag, 'hex'));
  return Buffer.concat([d.update(Buffer.from(isi, 'hex')), d.final()]).toString('utf8');
}

// ------------------------------------------------------------
// Mode bantuan (Developer "Masuk sebagai"): token bertanda tangan yang hanya
// diterbitkan oleh aksi masuk_sebagai (wajib Developer + verifikasi 2 langkah).
// Dengan token ini, permintaan atas nama akun tersebut tidak diminta sandi,
// passkey, atau kode OTP pemilik akun. Terikat ke satu akun dan satu sekolah.
// ------------------------------------------------------------
const BANTUAN_JAM = 6;
function tandaBantuan(teks) {
  return crypto.createHmac('sha256', OTP_RAHASIA).update(teks).digest('hex');
}
function bantuanBuat(devId, targetId, sekolahId) {
  const p = `${devId}.${targetId}.${sekolahId}.${Date.now() + BANTUAN_JAM * 3600000}`;
  return p + '.' + tandaBantuan('bantuan:' + p);
}
// Mengembalikan true/false (tidak pernah melempar error)
function bantuanCek(token, userId, sekolahId) {
  try {
    const a = String(token || '').split('.');
    if (a.length !== 5) return false;
    const p = a.slice(0, 4).join('.');
    const b1 = Buffer.from(tandaBantuan('bantuan:' + p), 'hex');
    const b2 = Buffer.from(a[4], 'hex');
    if (b1.length !== b2.length || !crypto.timingSafeEqual(b1, b2)) return false;
    if (a[1] !== String(userId)) return false;
    if (sekolahId !== undefined && Number(a[2]) !== Number(sekolahId)) return false;
    return Number(a[3]) >= Date.now();
  } catch (e) {
    return false;
  }
}

// ------------------------------------------------------------
// Verifikasi passkey: metode login terakhir pada token harus passkey/webauthn
// dan terjadi dalam PASSKEY_MENIT terakhir. Token bisa token sesi itu sendiri,
// atau "bukti_passkey" (token sesi passkey terpisah milik akun yang sama) agar
// sesi utama, termasuk verifikasi 2 langkah Developer, tidak tergantikan.
// ------------------------------------------------------------
const PASSKEY_MENIT = 5;
function jwtAmr(token) {
  try {
    const p = JSON.parse(Buffer.from(String(token).split('.')[1], 'base64url').toString('utf8'));
    return Array.isArray(p.amr) ? p.amr : [];
  } catch (e) {
    return [];
  }
}
function passkeyBaru(token) {
  const batas = Date.now() / 1000 - PASSKEY_MENIT * 60;
  return jwtAmr(token).some((x) => {
    const m = String((x && (x.method || x)) || '');
    return /passkey|webauthn/i.test(m) && Number(x && x.timestamp) >= batas;
  });
}
async function verifPasskey(tokenUtama, b, userId) {
  let tk = tokenUtama;
  if (b && b.bukti_passkey) {
    tk = String(b.bukti_passkey);
    let u = null;
    try {
      u = await panggil('/auth/v1/user', 'GET', null, { Authorization: 'Bearer ' + tk });
    } catch (e) {}
    if (!u || u.id !== userId)
      throw new Error('Verifikasi passkey tidak valid. Ulangi, atau pakai kata sandi');
  }
  if (!passkeyBaru(tk))
    throw new Error('Verifikasi passkey tidak valid atau sudah lewat 5 menit. Ulangi, atau pakai kata sandi');
}

// Catatan audit (gagal mencatat tidak boleh menggagalkan aksi utama)
async function catatLog({ pelaku, sekolah_id, aksi, rincian }) {
  try {
    await panggil(
      '/rest/v1/log_audit',
      'POST',
      { pelaku: pelaku || null, sekolah_id: sekolah_id || null, aksi, rincian: rincian || null },
      { Prefer: 'return=minimal' }
    );
  } catch (e) {
    console.error('catatLog gagal:', e.message);
  }
}

// Ganti username akun: email di Auth dan tabel profil harus berubah bersamaan.
async function ubahUsernameAkun(userId, usernameLama, usernameBaru) {
  if (usernameBaru === usernameLama) return;
  const ada = await panggil(
    `/rest/v1/profil?username=eq.${encodeURIComponent(usernameBaru)}&select=id`,
    'GET'
  );
  if (ada && ada.length && ada[0].id !== userId) throw new Error('Username sudah dipakai');
  await panggil('/auth/v1/admin/users/' + userId, 'PUT', {
    email: usernameBaru + '@absensi.local',
    email_confirm: true
  });
  try {
    await panggil(`/rest/v1/profil?id=eq.${userId}`, 'PATCH', { username: usernameBaru }, {
      Prefer: 'return=minimal'
    });
  } catch (e) {
    try {
      await panggil('/auth/v1/admin/users/' + userId, 'PUT', {
        email: usernameLama + '@absensi.local',
        email_confirm: true
      });
    } catch (_) {}
    throw new Error(pesanDuplikat(e) ? 'Username sudah dipakai' : e.message);
  }
}

// ------------------------------------------------------------
// Notifikasi laporan izin/sakit ke orang tua, kepala sekolah, dan wali kelas.
// Tidak memakai RPC/fungsi database; seluruh operasi memakai REST API yang sudah ada.
// Di deployment Preview, PAUD AN-NAJAH (ID 10) sengaja dikecualikan dari pengiriman.
// ------------------------------------------------------------
async function kirimNotifikasiLaporan({ sekolahId, siswaIds, status, tanggal, catatan, nomorOrtu, sumber = 'Portal Wali Murid', kirimKeOrtu = false }) {
  const sid = Number(sekolahId);
  const ids = [...new Set((siswaIds || []).map(Number).filter(x => Number.isSafeInteger(x) && x > 0))];
  if (!sid || !ids.length || !['izin', 'sakit'].includes(status)) return { dilewati: true };
  if (process.env.VERCEL_ENV === 'preview' && sid === 10) {
    console.log('Notifikasi laporan Preview dilewati untuk PAUD AN-NAJAH (sekolah_id=10).');
    return { dilewati: true, alasan: 'sekolah_produksi' };
  }

  const [siswa, rahasia, tokenRows] = await Promise.all([
    panggil(`/rest/v1/siswa?sekolah_id=eq.${sid}&id=in.(${ids.join(',')})&select=id,nama,kelas_id`, 'GET'),
    panggil(`/rest/v1/pengaturan_rahasia?sekolah_id=eq.${sid}&select=nomor_kepala,token_fonnte&limit=1`, 'GET'),
    panggil(`/rest/v1/fonnte_token?sekolah_id=eq.${sid}&select=token&limit=1`, 'GET')
  ]);
  const daftar = Array.isArray(siswa) ? siswa : [];
  const konfigurasi = rahasia?.[0] || {};
  const token = String(tokenRows?.[0]?.token || konfigurasi.token_fonnte || process.env.FONNTE_TOKEN || '').trim();
  if (!token) throw new Error('Token Fonnte sekolah tidak ditemukan untuk notifikasi laporan.');

  const kelasIds = [...new Set(daftar.map(x => Number(x.kelas_id)).filter(x => Number.isSafeInteger(x) && x > 0))];
  const kelas = kelasIds.length
    ? await panggil(`/rest/v1/kelas?sekolah_id=eq.${sid}&id=in.(${kelasIds.join(',')})&select=id,nama,wali_profil_id`, 'GET')
    : [];
  const keanggotaan = await panggil(`/rest/v1/keanggotaan?sekolah_id=eq.${sid}&aktif=eq.true&select=profil_id,role`, 'GET');
  const roleById = new Map((keanggotaan || []).map(x => [String(x.profil_id), String(x.role || '').toLowerCase()]));
  const waliIds = [...new Set((kelas || []).map(x => x.wali_profil_id).filter(x => x && roleById.has(String(x))))];
  const kepalaIds = (keanggotaan || []).filter(x => String(x.role || '').toLowerCase() === 'kepala_sekolah').map(x => x.profil_id);
  const profilIds = [...new Set([...waliIds, ...kepalaIds].filter(Boolean))];
  const profil = profilIds.length
    ? await panggil(`/rest/v1/profil?id=in.(${profilIds.join(',')})&aktif=eq.true&select=id,nama,no_wa`, 'GET')
    : [];
  const profilById = new Map((profil || []).map(x => [String(x.id), x]));
  const namaStatus = status === 'sakit' ? 'SAKIT' : 'IZIN';
  const tgl = (tanggal || []).filter(Boolean);
  const formatTgl = t => new Date(t + 'T00:00:00+07:00').toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Jakarta' });
  const detail = daftar.map(x => {
    const k = (kelas || []).find(y => Number(y.id) === Number(x.kelas_id));
    return { nama: x.nama || 'Siswa', kelas: k?.nama || 'Kelas' };
  });
  const labelStatus = status === 'sakit' ? 'sakit' : 'izin';
  const durasi = tgl.length;
  const teksDurasi = durasi + ' hari';
  const daftarTanggal = tgl.map(formatTgl).join(' • ');
  const buatIsi = (daftarAnak, sapaan) => [
    "🌹 Assalamu'alaikum warahmatullahi wabarakatuh.",
    '',
    sapaan,
    `Kami ingin menyampaikan bahwa orang tua dari ananda ${daftarAnak} telah menginformasikan bahwa ananda tercatat *${labelStatus}* tidak masuk sekolah selama *${teksDurasi}*.`,
    '',
    ...(catatan ? [`📝 Keterangan orang tua: ${String(catatan).slice(0, 200)}.`, ''] : []),
    `📅 Tanggal ${labelStatus}: • ${tgl.map(formatTgl).join(' • ')}.`,
    '',
    `📌 Sumber laporan: ${sumber}.`,
    '',
    'Terima kasih atas perhatian dan kerja sama Bapak/Ibu. 🙏',
    '',
    "Wassalamu'alaikum warahmatullahi wabarakatuh."
  ].join('\n');
  const isi = buatIsi(
    detail.map(x => `*${x.nama}* (Kelas ${x.kelas})`).join(', '),
    'Yth. Bapak/Ibu.'
  );

  const tujuan = new Map();
  const tambah = (nomor, pesan, label) => {
    const n = normWA(nomor);
    if (!/^628\d{8,12}$/.test(n)) return;
    if (!tujuan.has(n)) tujuan.set(n, { nomor: n, pesan, label });
  };

  // Orang tua diberi notifikasi langsung untuk laporan dari Portal.
  // Pada jalur WhatsApp, balasan otomatis webhook sudah menjadi konfirmasi orang tua,
  // sehingga pesan laporan terpisah tidak dikirim dua kali.
  if (kirimKeOrtu) {
    const relasi = await panggil(`/rest/v1/siswa_wali?siswa_id=in.(${ids.join(',')})&select=siswa_id,wali_id`, 'GET');
    const waliData = relasi?.length
      ? await panggil(`/rest/v1/wali?sekolah_id=eq.${sid}&id=in.(${[...new Set(relasi.map(x => Number(x.wali_id)).filter(Number.isSafeInteger))].join(',')})&select=id,no_wa`, 'GET')
      : [];
    for (const w of waliData || []) tambah(w.no_wa, isi, 'Orang tua');
    if (nomorOrtu) tambah(nomorOrtu, isi, 'Orang tua');
  }

  // Kepala sekolah menerima seluruh laporan sekolah.
  const profilKepala = (profil || []).find(x => roleById.get(String(x.id)) === 'kepala_sekolah');
  const nomorKepala = normWA(konfigurasi.nomor_kepala || profilKepala?.no_wa);
  if (nomorKepala) tambah(nomorKepala, isi, 'Kepala sekolah');

  // Wali kelas hanya menerima siswa dari kelas yang menjadi tanggung jawabnya.
  for (const k of kelas || []) {
    const p = profilById.get(String(k.wali_profil_id));
    if (!p) continue;
    const anakKelas = detail.filter((x, i) => Number(daftar[i]?.kelas_id) === Number(k.id));
    if (!anakKelas.length) continue;
    const pesanWali = buatIsi(
      anakKelas.map(x => `*${x.nama}* (Kelas ${k.nama})`).join(', '),
      'Yth. Bapak/Ibu Wali Kelas,'
    );
    tambah(p.no_wa, pesanWali, 'Wali kelas ' + k.nama);
  }

  // Pola penjadwalan meniru kirimBanyak() pada api/notifikasi-alpa.js:
  // semua timestamp ditentukan lebih dahulu, lalu didaftarkan ke Fonnte per kelompok.
  // Jeda tetap 30 detik sesuai alur laporan: kepala sekolah lalu wali kelas.
  const semuaTujuan = [...tujuan.values()];
  const orangTua = semuaTujuan.filter(x => x.label === 'Orang tua');
  const sekolah = semuaTujuan.filter(x => x.label !== 'Orang tua');
  const gagal = [];
  const logs = [];
  const batchId = crypto.randomUUID();
  const judulLog = 'Laporan ' + (status === 'sakit' ? 'Sakit' : 'Izin') + ' dari Orang Tua';
  let terkirim = 0;

  const catatHasil = (x, hasil, error, jadwal) => {
    const fonnte = hasil || {};
    const id = Array.isArray(fonnte.id) ? fonnte.id[0] : fonnte.id;
    return {
      sekolah_id: sid,
      oleh_developer: false,
      batch_id: batchId,
      jenis: 'laporan',
      judul: judulLog,
      label: String(x.label || 'Penerima').slice(0, 120),
      nomor: String(x.nomor || '').slice(0, 20) || '-',
      fonnte_id: id == null || id === '' ? null : String(id),
      state_fonnte: fonnte.detail && fonnte.detail.id ? String(fonnte.detail.id) : null,
      status: error ? 'gagal' : 'terjadwal',
      status_fonnte: !error && fonnte.status != null ? String(fonnte.status) : null,
      error: error ? String(error).slice(0, 300) : null,
      jadwal_pada: !error && jadwal ? new Date(jadwal * 1000).toISOString() : null,
      siswa_ids: ids.slice(0, 10)
    };
  };

  const kirimSatu = async (x, jadwal) => {
    const isiKirim = { target: x.nomor, message: x.pesan };
    if (jadwal) isiKirim.schedule = Math.floor(Number(jadwal));
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify(isiKirim)
    });
    const hasil = await response.json().catch(() => ({}));
    if (!response.ok || hasil.status === false) {
      throw new Error(hasil.reason || hasil.message || 'Fonnte menolak pengiriman pesan');
    }
    return hasil;
  };

  // Portal: kirim pemberitahuan kepada orang tua sekarang, dan tunggu Fonnte menerima.
  // Webhook: orang tua sudah menerima balasan otomatis sebelum fungsi ini dipanggil.
  const hasilOrtu = await Promise.allSettled(orangTua.map(x => kirimSatu(x)));
  hasilOrtu.forEach((h, i) => {
    const x = orangTua[i];
    if (h.status === 'fulfilled') {
      terkirim++;
      logs.push(catatHasil(x, h.value, null, null));
    } else {
      const alasan = String(h.reason?.message || h.reason);
      gagal.push(alasan);
      logs.push(catatHasil(x, null, alasan, null));
    }
  });

  // Jadwal staf dihitung SETELAH pesan langsung orang tua selesai diproses.
  // Ini mengikuti pola stabil: hitung jadwal berurutan, lalu daftarkan per batch (maks. 5).
  let waktu = Math.floor(Date.now() / 1000);
  const berjadwal = sekolah.map(x => {
    waktu += 30;
    return { ...x, waktu };
  });
  for (let i = 0; i < berjadwal.length; i += 5) {
    const bagian = berjadwal.slice(i, i + 5);
    const hasil = await Promise.allSettled(bagian.map(x => kirimSatu(x, x.waktu)));
    hasil.forEach((h, j) => {
      const x = bagian[j];
      const infoJadwal = {
        penerima: x.label,
        nomor_akhir: String(x.nomor).slice(-4),
        jadwal_unix: x.waktu,
        jadwal_iso: new Date(x.waktu * 1000).toISOString(),
        detail_fonnte: h.status === 'fulfilled' ? (h.value.detail || null) : null,
        fonnte_id: h.status === 'fulfilled' ? (h.value.id || null) : null
      };
      if (h.status === 'fulfilled') {
        terkirim++;
        logs.push(catatHasil(x, h.value, null, x.waktu));
        console.log('Notifikasi laporan berhasil didaftarkan ke jadwal Fonnte:', JSON.stringify(infoJadwal));
      } else {
        const alasan = String(h.reason?.message || h.reason);
        gagal.push((x.label || 'Penerima sekolah') + ': ' + alasan);
        logs.push(catatHasil(x, null, alasan, null));
        console.error('Gagal mendaftarkan jadwal notifikasi laporan:', JSON.stringify({ ...infoJadwal, error: alasan }));
      }
    });
  }

  if (logs.length) {
    try {
      // Samakan key seluruh baris agar bulk insert PostgREST konsisten.
      await panggil('/rest/v1/kirim_log', 'POST', logs, { Prefer: 'return=minimal' });
    } catch (e) {
      console.error('Riwayat notifikasi laporan gagal dicatat:', e && e.message);
      gagal.push('Riwayat status pesan gagal disimpan ke database');
    }
  }

  if (gagal.length) console.error('Sebagian notifikasi laporan gagal dikirim:', gagal);
  return { terkirim, gagal, batch_id: batchId };
}

module.exports = {
  bantuanBuat,
  bantuanCek,
  verifPasskey,
  lihatOtp,
  enkripsi,
  dekripsi,
  catatLog,
  ubahUsernameAkun,
  SB,
  KEY,
  DEV_WA,
  RE_UUID,
  RE_USER,
  RE_WA,
  PESAN_USER,
  panggil,
  normWA,
  pesanDuplikat,
  ipDari,
  kirimDev,
  kabariDeveloper,
  kirimOtp,
  cekOtp,
  kirimNotifikasiLaporan
};
