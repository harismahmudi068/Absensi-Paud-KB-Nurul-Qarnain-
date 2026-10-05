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

module.exports = {
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
  cekOtp
};
