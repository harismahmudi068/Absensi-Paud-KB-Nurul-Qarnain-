// Webhook Fonnte PAUD
// Memproses laporan izin/sakit dari chat pribadi dan GRUP PAUD.
// AI dipisahkan ke _AI.js agar mudah diperbaiki tanpa mengubah alur utama.
//
// Variabel Vercel yang dibutuhkan:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Per sekolah (diisi di menu Pengaturan, tabel pengaturan_rahasia): token Fonnte, kunci AI,
// ID grup, nomor kepala sekolah, dan kunci Webhook. Alamat: /api/webhook?key=<kunci sekolah>
// Satu sekolah boleh punya BANYAK token Fonnte (tabel fonnte_token) dan BANYAK ID grup (tabel grup_wa),
// semuanya memakai satu alamat Webhook. Token balasan dipilih dari: token milik grup, lalu nomor
// perangkat pada pesan masuk (field device), lalu token pertama (utama).
// Masa transisi: FONNTE_TOKEN, GEMINI_API_KEY, WEBHOOK_SECRET lama hanya dipakai sebagai
// cadangan untuk sekolah pertama sampai kolomnya diisi di Pengaturan.

const crypto = require('crypto');
const { analisisPesan } = require('./_AI');
const { terjemahkanBalasan } = require('./_AITerjemah');

// ============================================================
// KONFIGURASI WHATSAPP PAUD — MUDAH DIGANTI
// ============================================================
// ID grup dan nomor kepala sekolah dibaca per sekolah dari tabel pengaturan_rahasia.

// Libur mingguan dibaca dari tabel Supabase `libur_mingguan`, dan libur tanggal tertentu
// dari tabel `libur_tanggal`. Daftar di bawah HANYA cadangan jika tabel libur_mingguan
// tidak terbaca (0 = Minggu, 6 = Sabtu).
const HARI_LIBUR_MINGGUAN_CADANGAN = [0, 6];

// Sakit otomatis dicatat selama sekian hari sekolah aktif.
const HARI_SAKIT_OTOMATIS = 3;

// Pesan yang sama dari nomor yang sama dalam rentang ini diabaikan.
const JENDELA_DUPLIKAT_MENIT = 5;

// Izin ke depan hanya diterima sampai sekian hari dari hari ini, maksimal sekian hari berurutan.
const BATAS_HARI_KE_DEPAN = 60;
const BATAS_JUMLAH_HARI_IZIN = 30; // izin lebih dari ini tidak dicatat otomatis; kepala sekolah diberi tahu

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SEKOLAH_PERTAMA = 1;
const ENV_FONNTE = process.env.FONNTE_TOKEN || '';
const ENV_GEMINI = (process.env.GEMINI_API_KEY || '').trim();
const WEBHOOK_SECRET = (process.env.WEBHOOK_SECRET || '').trim();

// Konteks per permintaan (aman untuk permintaan bersamaan): sekolahId, tokens, grup, tokenFonnte, kunciAi, nomorKepala
const { AsyncLocalStorage } = require('async_hooks');
const konteks = new AsyncLocalStorage();
const K = () => konteks.getStore() || {};

function normDevice(x) {
  let d = String(x || '').replace(/\D/g, '');
  if (d[0] === '0') d = '62' + d.slice(1);
  return d;
}

// Memilih token Fonnte yang dipakai untuk membalas pesan ini
function pilihToken(b, groupId) {
  const c = K();
  const g = groupId ? (c.grup || []).find((x) => x.grup_id === groupId) : null;
  if (g && g.token_id) {
    const t = (c.tokens || []).find((x) => x.id === g.token_id);
    if (t) return t.token;
  }
  const dev = normDevice(b.device);
  if (dev) {
    const t = (c.tokens || []).find((x) => x.perangkat && normDevice(x.perangkat) === dev);
    if (t) return t.token;
  }
  return c.tokenFonnte;
}

function nomor(value) { return String(value || '').replace(/\D/g, ''); }

async function sb(path, { method = 'GET', body, prefer } = {}) {
  if (!SB || !KEY) throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum tersedia');
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + KEY;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

async function kirimFonnte(target, teks) {
  const tokenFonnte = K().tokenFonnte;
  if (!target || !tokenFonnte) return false;
  try {
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: tokenFonnte, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ target: String(target), message: teks })
    });
    const raw = await r.text();
    if (!r.ok) { console.error('Fonnte HTTP error:', r.status, raw); return false; }
    try { if (JSON.parse(raw).status === false) return false; } catch (_) {}
    return true;
  } catch (e) {
    console.error('Gagal mengirim Fonnte:', e);
    return false;
  }
}

// ============================================================
// BALASAN KE WALI DALAM BAHASA PENGIRIM
// Format balasan tetap disusun dalam Bahasa Indonesia, lalu diterjemahkan oleh _AITerjemah.js
// jika bahasa pesan bukan Indonesia. Jika terjemahan gagal, balasan Indonesia tetap dikirim.
// Jalur cepat (tanpa AI) tidak punya `bahasa`, sehingga dibalas langsung dalam Bahasa Indonesia.
// Notifikasi ke kepala sekolah TIDAK memakai fungsi ini (tetap Bahasa Indonesia).
// ============================================================
function perluTerjemah(bahasa) {
  const b = String(bahasa || '').trim().toLowerCase();
  return !!b && !b.startsWith('indonesia');
}

async function kirimBalasanWali(target, teks, bahasa) {
  let isi = teks;
  if (perluTerjemah(bahasa)) {
    try {
      isi = await terjemahkanBalasan({ teks, bahasa, kunciAi: K().kunciAi });
    } catch (e) {
      console.error(`Terjemahan ke ${bahasa} gagal, balasan dikirim dalam Bahasa Indonesia:`, e.message);
      isi = teks;
    }
  }
  return kirimFonnte(target, isi);
}

function salam() { return 'Assalamu’alaikum warahmatullahi wabarakatuh.'; }
function penutup() { return 'Wassalamu’alaikum warahmatullahi wabarakatuh.'; }

function daftarTanggal(list) {
  return list.map(d => `• *${formatTanggal(d)}*`).join('\n');
}

// Setiap balasan hanya punya SATU salam pembuka dan SATU salam penutup,
// walaupun terdiri dari beberapa bagian (mis. dua anak dengan hasil berbeda).
function bungkusBalasan(bagian) {
  return [salam(), '', bagian.join('\n\n'), '', penutup()].join('\n');
}

function isiSakit(nama, tgl, lanjut = null) {
  const n = tgl.length;
  return [
    `Baik, Bunda. Laporan bahwa *${nama}* hari ini sakit sudah kami terima dan telah dicatat. 🤒`, '',
    `Semoga *${nama}* segera diberikan kesembuhan, kesehatan, dan kekuatan, serta dapat kembali beraktivitas bersama teman-teman di sekolah. 🌷`, '',
    `📌 *Catatan:* *${nama}* kini tercatat sakit selama ${n} hari sekolah:`,
    daftarTanggal(tgl), '',
    `Jika dalam ${n} hari tersebut *${nama}* belum sembuh, mohon Bunda mengirimkan laporan sakit kembali pada *${lanjut ? `(${formatTanggal(lanjut)})` : ''}*. Namun jika *${nama}* sembuh sebelum *${lanjut ? `(${formatTanggal(lanjut)})` : ''}* dan masuk sekolah, status sakit akan otomatis diganti menjadi hadir, jadi Bunda tidak perlu khawatir. 😊`
  ].join('\n');
}

function isiIzin(nama, tgl, tidakAktif = []) {
  const T = tanggal();
  const kalimat = tgl.length === 1
    ? `Baik, Bunda. Laporan izin untuk *${nama}* pada hari *${formatTanggal(tgl[0])}*${tgl[0] === T ? ' (hari ini)' : ''} sudah kami terima dan telah dicatat. 📝`
    : `Baik, Bunda. Laporan izin untuk *${nama}* pada hari berikut sudah kami terima dan telah dicatat: 📝\n${daftarTanggal(tgl)}`;
  const baris = [kalimat];
  if (tidakAktif.length) {
    baris.push('', `ℹ️ *Catatan:* ${tidakAktif.map(formatTanggal).join('; ')} bukan hari sekolah (libur), sehingga tidak dicatat.`);
  }
  baris.push('', `Semoga segala keperluan Bunda dan *${nama}* diberikan kelancaran, kemudahan, dan keberkahan. 🤲`);
  return baris.join('\n');
}

function isiSudahHadir(nama) {
  return `⚠️ *${nama}* sudah tercatat hadir di sekolah, jadi data tidak diubah. Guru akan mengecek.`;
}

function isiBukanHariSekolah(tidakAktif) {
  return `Baik, Bunda. Pesan sudah kami terima. Namun ${tidakAktif.map(formatTanggal).join('; ')} bukan hari sekolah (libur), sehingga tidak perlu dicatat izin. 🙏`;
}

function balasanSakit(nama, tgl, lanjut = null) { return bungkusBalasan([isiSakit(nama, tgl, lanjut)]); }
function balasanIzin(nama, tgl, tidakAktif = []) { return bungkusBalasan([isiIzin(nama, tgl, tidakAktif)]); }
function balasanBukanHariSekolah(tidakAktif) { return bungkusBalasan([isiBukanHariSekolah(tidakAktif)]); }

// Nama pada pesan yang tidak mirip dengan nama anak terdaftar (perbandingan per kata)
function namaYangBerbeda(namaDiPesan, namaTerdaftar) {
  const kata = String(namaTerdaftar || '').toLowerCase().split(/[\s|]+/).filter(x => x.length > 2);
  return (namaDiPesan || []).filter(n => {
    const w = String(n || '').toLowerCase().split(/\s+/).filter(x => x.length > 2);
    return w.length > 0 && !w.some(x => kata.some(k => k.includes(x) || x.includes(k)));
  });
}

// Notifikasi "ragu" untuk kepala sekolah: menjelaskan hasil analisis, penyebab keraguan,
// dan apa yang perlu dikonfirmasi, sehingga kepala sekolah tidak perlu menebak.
function notifikasiRaguDetail(pengirim, namaAnak, pesan, opsi = {}) {
  const {
    namaDiPesan = [], statusDugaan = '', alasanRagu = '', jumlahHari = 0,
    alasanAI = '', keyakinan = 0, detailWaktu = ''
  } = opsi;
  const teksAnak = namaAnak || 'Belum berhasil diidentifikasi';
  const anakTerdaftar = !!namaAnak && namaAnak !== 'Belum berhasil diidentifikasi';
  const beda = namaYangBerbeda(namaDiPesan, namaAnak);
  const dugaan = statusDugaan === 'sakit' ? 'Sakit' : statusDugaan === 'izin' ? 'Izin' : 'Belum bisa ditentukan';

  let penyebab, konfirmasi;
  if (alasanRagu === 'izin_panjang') {
    penyebab = `Izin melebihi ${BATAS_JUMLAH_HARI_IZIN} hari${jumlahHari ? ` (sekitar ${jumlahHari} hari)` : ''}, sehingga tidak dicatat otomatis.`;
    konfirmasi = ['Lama izin yang sebenarnya, konfirmasikan kepada wali murid', 'Setelah dikonfirmasi, catat secara manual di menu Absensi'];
  } else if (alasanRagu === 'waktu') {
    penyebab = 'Tanggal atau waktu yang dimaksud belum jelas atau tidak dapat dihitung otomatis.' + (detailWaktu ? ` (${String(detailWaktu).slice(0, 200)})` : '');
    konfirmasi = ['Tanggal atau hari anak tidak masuk', 'Lama izin/sakit (berapa hari)', 'Setelah dikonfirmasi, catat secara manual di menu Absensi'];
  } else if (alasanRagu === 'anak_tidak_jelas') {
    penyebab = anakTerdaftar
      ? 'Pesan mengarah ke izin/sakit, tetapi sistem belum bisa memastikan anak mana yang dimaksud.'
      : 'Pesan mengarah ke izin/sakit, tetapi tidak ada anak terdaftar yang cocok dengan nomor pengirim atau nama di pesan.';
    konfirmasi = ['Anak mana yang dimaksud' + (anakTerdaftar ? ` (terdaftar di nomor ini: ${teksAnak})` : ''), 'Status yang benar (izin atau sakit)', 'Setelah dikonfirmasi, catat secara manual di menu Absensi'];
  } else {
    penyebab = 'Maksud pesan belum jelas: bisa berupa izin atau sakit, bisa juga informasi lain yang tidak berkaitan dengan absensi.';
    konfirmasi = ['Apakah pesan ini memang izin atau sakit', 'Jika ya, status yang benar (izin atau sakit), anak yang dimaksud, dan tanggalnya', 'Setelah dikonfirmasi, catat secara manual di menu Absensi'];
  }

  const baris = [
    salam(), '',
    '⚠️ *Pemberitahuan: Pesan Perlu Dicek*', '',
    'Sistem menerima pesan dari wali murid, tetapi belum yakin sehingga tidak mencatat absensi otomatis.', '',
    `👤 *Pengirim:* ${pengirim || '-'}`,
    `👧 *Nama anak${anakTerdaftar ? ' (terdaftar di nomor ini)' : ''}:* *${teksAnak}*`
  ];
  if (beda.length) baris.push(`📝 *Nama di pesan (berbeda dari data terdaftar):* *${beda.join(' | ')}*`);
  baris.push('', `💬 *Pesan:* "${String(pesan || '').slice(0, 1000)}"`, '', '🔎 *Hasil analisis sistem*', `• Dugaan: ${dugaan}`);
  if (keyakinan > 0) baris.push(`• Tingkat keyakinan: ${Math.round(keyakinan * 100)}%`);
  if (alasanAI) baris.push(`• Catatan analisis: ${String(alasanAI).slice(0, 300)}`);
  baris.push('', `❓ *Alasan ragu:* ${penyebab}`, '', '✅ *Yang perlu dikonfirmasi:*', ...konfirmasi.map(x => `• ${x}`), '', penutup());
  return baris.join('\n');
}

function notifikasiRagu(pengirim, namaAnak, pesan, opsi = {}) {
  if (!opsi.namaBeda) return notifikasiRaguDetail(pengirim, namaAnak, pesan, opsi);
  const { namaDiPesan = [], namaBeda = false, statusDugaan = '', tampilkanPesan = true, alasanRagu = '', jumlahHari = 0 } = opsi;
  const intro = namaBeda
    ? 'Sistem menginformasikan bahwa nama anak yang tertulis di pesan *berbeda* dengan anak yang terdaftar di nomor pengirim.'
    : alasanRagu === 'izin_panjang'
      ? `Sistem menerima laporan izin yang *melebihi ${BATAS_JUMLAH_HARI_IZIN} hari*${jumlahHari ? ` (sekitar ${jumlahHari} hari)` : ''}, sehingga izin ini belum dicatat otomatis.`
    : alasanRagu === 'waktu'
      ? 'Sistem menerima laporan izin/sakit, tetapi tanggal atau waktu yang dimaksud belum jelas atau tidak dapat dihitung secara otomatis.'
      : 'Sistem menerima pesan yang kemungkinan berkaitan dengan izin/sakit, tetapi belum dapat memastikan maksudnya.';
  const baris = [
    salam(), '',
    // Judul hanya untuk notifikasi ke kepala sekolah; versi nama beda (grup/pribadi) tanpa judul.
    ...(namaBeda ? [] : ['⚠️ *Pemberitahuan: Pesan Perlu Dicek*', '']),
    intro, '',
    `👤 *Pengirim:* ${pengirim || '-'}`,
    `👧 *Nama anak${namaBeda ? ' (terdaftar di nomor ini)' : ''}:* *${namaAnak || 'Belum berhasil diidentifikasi'}*`
  ];
  if (namaBeda && namaDiPesan.length) baris.push(`📝 *Nama di pesan:* *${namaDiPesan.join(' | ')}*`);
  // Dugaan isi pesan ikut disembunyikan jika isi pesan tidak ditampilkan (grup/pribadi).
  if (tampilkanPesan && (statusDugaan === 'sakit' || statusDugaan === 'izin')) baris.push(`🔎 *Dugaan isi pesan:* ${statusDugaan}`);
  if (tampilkanPesan) baris.push(`💬 *Pesan:* "${String(pesan || '').slice(0, 1000)}"`);
  baris.push(
    '',
    namaBeda
      ? `Mohon perbaiki nama anak pada pesan sesuai data yang terdaftar: *${namaAnak || '-'}*. 🙏`
      : alasanRagu === 'izin_panjang'
        ? `📌 *Catatan:* Izin melebihi ${BATAS_JUMLAH_HARI_IZIN} hari. Mohon dikonfirmasi kepada wali murid dan dicatat secara manual. 🙏`
        : 'Mohon dilakukan pengecekan secara manual. 🙏',
    '',
    penutup()
  );
  return baris.join('\n');
}

function notifikasiAIGagal(pengirim, namaAnak, pesan, error) {
  const detail = String(error?.message || error || 'Kesalahan tidak diketahui').slice(0, 500);
  return [
    salam(),
    '',
    '🚨 *Pemberitahuan: AI Tidak Dapat Memproses Pesan*',
    '',
    'Sistem menerima pesan dari wali, tetapi layanan Gemini sedang mengalami kendala sehingga pesan belum dapat dianalisis secara otomatis.',
    '',
    `👤 *Pengirim:* ${pengirim || '-'}`,
    `👧 *Nama anak:* *${namaAnak || 'Belum berhasil diidentifikasi'}*`,
    '',
    '⚠️ Absensi belum diubah secara otomatis. Mohon dilakukan pengecekan dan pencatatan secara manual jika diperlukan. 🙏',
    '',
    `🔧 *Status sistem:* ${detail}`,
    '',
    penutup()
  ].join('\n');
}

function daftarNama(list) {
  const n = list.map(s => s.nama || s.nama_panggilan).filter(Boolean);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' dan ' + n[n.length - 1] : (n[0] || '');
}

function tanggal() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
}

// ============================================================
// HITUNG TANGGAL & HARI SEKOLAH
// ============================================================
const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const NAMA_BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const INDEKS_HARI = { minggu: 0, senin: 1, selasa: 2, rabu: 3, kamis: 4, jumat: 5, sabtu: 6 };

function isoKeUtc(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}
function tambahHari(iso, n) {
  const dt = isoKeUtc(iso);
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function indeksHari(iso) { return isoKeUtc(iso).getUTCDay(); }
function formatTanggal(iso) {
  const dt = isoKeUtc(iso);
  return `${NAMA_HARI[dt.getUTCDay()]}, ${dt.getUTCDate()} ${NAMA_BULAN[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
}
function tanggalValid(y, m, d) {
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
    ? dt.toISOString().slice(0, 10)
    : null;
}
// kelasId opsional: libur_tanggal dengan kelas_id tertentu hanya berlaku untuk kelas itu;
// kelas_id kosong (null) berlaku untuk semua kelas.
function hariSekolah(iso, libur, kelasId = null) {
  if (libur.mingguan.has(indeksHari(iso))) return false;
  if (libur.tanggalUmum.has(iso)) return false;
  if (kelasId !== null && kelasId !== undefined) {
    const khusus = libur.tanggalKelas.get(String(kelasId));
    if (khusus && khusus.has(iso)) return false;
  }
  return true;
}

// ---- Pembacaan tabel libur (toleran terhadap nama kolom) ----
const HARI_DARI_NAMA = {
  minggu: 0, ahad: 0, sunday: 0, sun: 0,
  senin: 1, monday: 1, mon: 1,
  selasa: 2, tuesday: 2, tue: 2,
  rabu: 3, wednesday: 3, wed: 3,
  kamis: 4, thursday: 4, thu: 4,
  jumat: 5, "jum'at": 5, jumaat: 5, friday: 5, fri: 5,
  sabtu: 6, saturday: 6, sat: 6
};
const KOLOM_ABAI = /(^id$|created|updated|dibuat|diubah|keterangan|catatan|nama|deskripsi|alasan|note)/i;

function barisNonaktif(r) {
  return ['aktif', 'is_active', 'active', 'berlaku'].some(k => r[k] === false || r[k] === 0 || r[k] === 'false');
}

// Mengubah baris tabel libur_mingguan menjadi himpunan indeks hari JS (0=Minggu ... 6=Sabtu).
function parseLiburMingguan(rows) {
  const nilai = [];
  for (const r of rows) {
    if (barisNonaktif(r)) continue;
    for (const [k, v] of Object.entries(r)) {
      if (KOLOM_ABAI.test(k) || v === null || v === undefined || typeof v === 'boolean') continue;
      const t = String(v).trim().toLowerCase();
      if (t in HARI_DARI_NAMA) { nilai.push({ hari: HARI_DARI_NAMA[t], nama: true }); break; }
      if (/^\d+$/.test(t) && Number(t) <= 7) { nilai.push({ angka: Number(t) }); break; }
    }
  }
  const angka = nilai.filter(n => n.angka !== undefined).map(n => n.angka);
  // Angka 7 = format ISO (1=Senin..7=Minggu); angka 0 = format JS (0=Minggu..6=Sabtu).
  const iso = angka.includes(7) && !angka.includes(0);
  const hasil = new Set();
  for (const n of nilai) {
    if (n.nama) hasil.add(n.hari);
    else hasil.add(iso ? n.angka % 7 : n.angka);
  }
  return hasil;
}

// Mengubah baris tabel libur_tanggal (kolom: mulai, sampai, kelas_id, keterangan) menjadi:
//   umum  : tanggal libur untuk semua kelas (kelas_id kosong)
//   kelas : Map kelas_id -> tanggal libur khusus kelas itu
// `sampai` boleh kosong (libur satu hari).
function parseLiburTanggal(rows, dari, sampai) {
  const umum = new Set();
  const kelas = new Map();
  for (const r of rows) {
    if (barisNonaktif(r)) continue;
    const ambilTgl = v => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v) ? v.slice(0, 10) : null);
    let awal = ambilTgl(r.mulai);
    let akhir = ambilTgl(r.sampai) || awal;
    if (!awal) {
      // Cadangan jika nama kolom berbeda: pakai semua kolom bertanggal pada baris itu.
      const tgl = Object.entries(r)
        .filter(([k]) => !KOLOM_ABAI.test(k))
        .map(([, v]) => ambilTgl(v)).filter(Boolean).sort();
      if (!tgl.length) continue;
      awal = tgl[0]; akhir = tgl[tgl.length - 1];
    }
    if (akhir < awal) akhir = awal;

    const tujuan = (r.kelas_id === null || r.kelas_id === undefined || r.kelas_id === '')
      ? umum
      : (kelas.get(String(r.kelas_id)) || kelas.set(String(r.kelas_id), new Set()).get(String(r.kelas_id)));

    let d = awal < dari ? dari : awal;
    for (let i = 0; i < 400 && d <= akhir && d <= sampai; i++, d = tambahHari(d, 1)) tujuan.add(d);
  }
  return { umum, kelas };
}

// Libur sekolah: tabel `libur_mingguan` (kolom hari: 0=Minggu ... 6=Sabtu) dan
// `libur_tanggal` (mulai, sampai, kelas_id, keterangan).
async function ambilLibur(dari, sampai) {
  let mingguan = new Set(HARI_LIBUR_MINGGUAN_CADANGAN);
  let tanggalLibur = { umum: new Set(), kelas: new Map() };

  try {
    const rows = await sb(`libur_mingguan?sekolah_id=eq.${K().sekolahId}&select=*`);
    if (Array.isArray(rows) && rows.length === 0) {
      mingguan = new Set(); // tabel terbaca dan kosong: tidak ada libur mingguan
    } else {
      const hasil = parseLiburMingguan(rows || []);
      if (hasil.size) mingguan = hasil;
      else console.error('Isi libur_mingguan tidak dikenali, memakai cadangan Sabtu-Minggu');
    }
  } catch (e) {
    console.error('Tabel libur_mingguan tidak terbaca, memakai cadangan Sabtu-Minggu:', e.message);
  }

  try {
    const rows = await sb(`libur_tanggal?sekolah_id=eq.${K().sekolahId}&select=*`);
    tanggalLibur = parseLiburTanggal(rows || [], dari, sampai);
  } catch (e) {
    console.error('Tabel libur_tanggal tidak terbaca, libur tanggal diabaikan:', e.message);
  }

  // Libur nasional: satu tabel `libur_nasional` (tanggal, keterangan) untuk semua sekolah dan semua kelas.
  try {
    const rows = await sb(`libur_nasional?tanggal=gte.${dari}&tanggal=lte.${sampai}&select=tanggal`);
    for (const r of (rows || [])) {
      const t = String(r.tanggal || '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(t)) tanggalLibur.umum.add(t);
    }
  } catch (e) {
    console.error('Tabel libur_nasional tidak terbaca, libur nasional diabaikan:', e.message);
  }

  return { mingguan, tanggalUmum: tanggalLibur.umum, tanggalKelas: tanggalLibur.kelas };
}

// Mengubah penanda waktu dari AI menjadi tanggal ISO. Mengembalikan null jika tidak bisa dihitung.
function hitungTanggal(w, T, tanpaBatasDepan = false) {
  const tipe = w?.tipe;
  let hasil = null;

  if (tipe === 'hari_ini') hasil = T;
  else if (tipe === 'besok') hasil = tambahHari(T, 1);
  else if (tipe === 'lusa') hasil = tambahHari(T, 2);
  else if (tipe === 'nama_hari') {
    const target = INDEKS_HARI[w.nama_hari];
    if (target === undefined) return null;
    const sekarang = indeksHari(T);
    if (w.pekan_depan) {
      // Senin pekan depan + selisih hari dalam pekan (Senin = 0 ... Minggu = 6)
      let keSenin = (8 - sekarang) % 7;
      if (keSenin === 0) keSenin = 7;
      hasil = tambahHari(T, keSenin + ((target + 6) % 7));
    } else {
      let selisih = (target - sekarang + 7) % 7;
      if (selisih === 0) selisih = 7; // nama hari yang sama dengan hari ini dianggap pekan depan
      hasil = tambahHari(T, selisih);
    }
  } else if (tipe === 'tanggal') {
    const d = Number(w.tanggal);
    if (!Number.isInteger(d) || d < 1 || d > 31) return null;
    const [Y, M, D] = T.split('-').map(Number);
    if (w.bulan) {
      let y = w.tahun || Y;
      hasil = tanggalValid(y, w.bulan, d);
      if (hasil && hasil < T && !w.tahun) hasil = tanggalValid(y + 1, w.bulan, d);
    } else {
      hasil = d >= D ? tanggalValid(Y, M, d) : tanggalValid(M === 12 ? Y + 1 : Y, M === 12 ? 1 : M + 1, d);
    }
  } else {
    return null; // lampau / tidak_jelas
  }

  if (!hasil || hasil < T || (!tanpaBatasDepan && hasil > tambahHari(T, BATAS_HARI_KE_DEPAN))) return null;
  return hasil;
}

// Hari masuk sekolah pertama SETELAH tanggal `iso` (+1 hari; jika libur dilewati sampai ketemu hari masuk).
function hariMasukBerikutnya(iso, libur, kelasId = null) {
  let d = tambahHari(iso, 1);
  for (let i = 0; i < 60; i++, d = tambahHari(d, 1)) {
    if (hariSekolah(d, libur, kelasId)) return d;
  }
  return null;
}

function selisihHari(a, b) {
  return Math.round((isoKeUtc(b) - isoKeUtc(a)) / 86400000);
}

// Hari TERAKHIR sebuah rentang ("sampai hari Rabu"). Nama hari dihitung dari hari PERTAMA rentang
// (bukan dari hari ini), dan hari yang sama dengan hari pertama dianggap 1 hari saja.
function hitungAkhir(s, mulai, T) {
  if (s?.tipe === 'nama_hari' && !s.pekan_depan) {
    const target = INDEKS_HARI[s.nama_hari];
    if (target === undefined) return null;
    return tambahHari(mulai, (target - indeksHari(mulai) + 7) % 7);
  }
  // Hari terakhir boleh jauh ke depan: yang dibatasi adalah panjang rentang, bukan jaraknya dari hari ini.
  return hitungTanggal(s, T, true);
}

// Menyusun tanggal yang akan dicatat. Hasilnya `untuk(kelasId)` karena libur_tanggal bisa khusus per kelas.
// - sakit : HARI_SAKIT_OTOMATIS hari sekolah aktif mulai hari ini (hanya jika pesan bicara hari ini).
// - izin  : sesuai tanggal/hari yang disebut (tanpa penanda waktu = hari ini).
async function buatRencana(status, waktu) {
  const T = tanggal();
  const entri = Array.isArray(waktu) ? waktu : [];
  const libur = await ambilLibur(T, tambahHari(T, BATAS_HARI_KE_DEPAN + BATAS_JUMLAH_HARI_IZIN + 15));

  if (status === 'sakit') {
    if (entri.some(w => w.tipe !== 'hari_ini')) {
      return { ok: false, alasan: 'sakit untuk waktu selain hari ini' };
    }
    return {
      ok: true,
      untuk: kelasId => {
        const tanggalSakit = [];
        let d = T;
        for (let i = 0; i < 40 && tanggalSakit.length < HARI_SAKIT_OTOMATIS; i++, d = tambahHari(d, 1)) {
          if (hariSekolah(d, libur, kelasId)) tanggalSakit.push(d);
        }
        const terakhir = tanggalSakit[tanggalSakit.length - 1];
        return { tanggal: tanggalSakit, tidakAktif: [], lanjut: terakhir ? hariMasukBerikutnya(terakhir, libur, kelasId) : null };
      }
    };
  }

  const sumber = entri.length ? entri : [{ tipe: 'hari_ini', jumlah_hari: 1 }];
  const semua = new Set();
  for (const w of sumber) {
    if (w.sampai_gagal) return { ok: false, alasan: 'tanggal akhir rentang tidak dapat dihitung' };
    const mulai = hitungTanggal(w, T);
    if (!mulai) return { ok: false, alasan: `waktu tidak dapat dihitung (${w.tipe})` };

    let jumlah = Math.max(1, Number(w.jumlah_hari) || 1);
    if (w.sampai) {
      // Rentang "sampai hari X": jumlah hari dihitung sistem (hari terakhir ikut dihitung).
      const akhir = hitungAkhir(w.sampai, mulai, T);
      if (!akhir || akhir < mulai) return { ok: false, alasan: 'tanggal akhir rentang tidak valid' };
      jumlah = selisihHari(mulai, akhir) + 1;
    }
    if (jumlah > BATAS_JUMLAH_HARI_IZIN) return { ok: false, alasan: 'jumlah hari terlalu panjang', izinPanjang: jumlah };
    for (let i = 0; i < jumlah; i++) semua.add(tambahHari(mulai, i));
  }

  const urut = [...semua].sort();
  return {
    ok: true,
    untuk: kelasId => ({
      tanggal: urut.filter(d => hariSekolah(d, libur, kelasId)),
      tidakAktif: urut.filter(d => !hariSekolah(d, libur, kelasId))
    })
  };
}

async function catatPesan(dari, isi, hasil, cek) {
  await sb('pesan_masuk', { method: 'POST', body: { sekolah_id: K().sekolahId, dari_nomor: dari, isi, hasil, perlu_dicek: cek }, prefer: 'return=minimal' });
}

async function simpan(dari, pesan, anak, status, catatan, rencana) {
  // Tanggal dihitung per anak, karena libur_tanggal bisa khusus kelas tertentu.
  const per = anak.map(s => ({ s, ...rencana.untuk(s.kelas_id) }));
  const aktif = per.filter(p => p.tanggal.length);
  const liburSaja = per.filter(p => !p.tanggal.length);

  const bagian = [];
  const sudahHadir = [];
  const rows = [];
  const kelompok = new Map();
  const diubah = new Date().toISOString();
  const catatanDb = status === 'sakit'
    ? `${(catatan || '').slice(0, 150)} | sakit otomatis ${HARI_SAKIT_OTOMATIS} hari sekolah`
    : (catatan || '').slice(0, 200);

  if (aktif.length) {
    const semuaTgl = [...new Set(aktif.flatMap(p => p.tanggal))];
    const ids = aktif.map(p => p.s.id).join(',');
    const ada = await sb(`absensi?tanggal=in.(${semuaTgl.join(',')})&siswa_id=in.(${ids})&sekolah_id=eq.${K().sekolahId}&select=siswa_id,tanggal,status`);

    for (const p of aktif) {
      const hadirDi = new Set(ada.filter(a => a.siswa_id === p.s.id && a.status === 'hadir').map(a => a.tanggal));
      let tulis = p.tanggal.filter(d => !hadirDi.has(d));
      if (status === 'sakit' && hadirDi.size) tulis = []; // sudah hadir: sakit tidak dicatat
      if (!tulis.length) { sudahHadir.push(p.s); continue; }

      tulis.forEach(d => rows.push({
        sekolah_id: K().sekolahId, siswa_id: p.s.id, tanggal: d, status, cara: 'whatsapp', jam_datang: null,
        catatan: catatanDb, diubah
      }));
      const k = `${tulis.join(',')}|${p.tidakAktif.join(',')}|${p.lanjut || ''}`;
      if (!kelompok.has(k)) kelompok.set(k, { anak: [], tanggal: tulis, tidakAktif: p.tidakAktif, lanjut: p.lanjut || null });
      kelompok.get(k).anak.push(p.s);
    }

    if (rows.length) {
      await sb('absensi?on_conflict=siswa_id,tanggal', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
    }
  }

  const ubah = [...kelompok.values()].flatMap(g => g.anak);
  const semuaDicatat = [...new Set(rows.map(r => r.tanggal))].sort();
  await catatPesan(
    dari,
    pesan,
    (ubah.length || sudahHadir.length
      ? `${status}: ${daftarNama(ubah.length ? ubah : sudahHadir)} [${semuaDicatat.join(', ')}]${sudahHadir.length ? ' (sebagian sudah hadir)' : ''}`
      : `${status}: ${daftarNama(anak)} - tanggal bukan hari sekolah`).slice(0, 300),
    sudahHadir.length > 0
  );

  for (const g of kelompok.values()) {
    const nm = daftarNama(g.anak);
    bagian.push(status === 'sakit' ? isiSakit(nm, g.tanggal, g.lanjut) : isiIzin(nm, g.tanggal, g.tidakAktif));
  }

  // Anak yang tanggal izinnya jatuh seluruhnya pada hari libur.
  const liburKelompok = new Map();
  for (const p of liburSaja) {
    const k = p.tidakAktif.join(',');
    if (!liburKelompok.has(k)) liburKelompok.set(k, { anak: [], tidakAktif: p.tidakAktif });
    liburKelompok.get(k).anak.push(p.s);
  }
  for (const g of liburKelompok.values()) {
    bagian.push(`Baik, Bunda. Pesan untuk *${daftarNama(g.anak)}* sudah kami terima. Namun ${g.tidakAktif.map(formatTanggal).join('; ')} bukan hari sekolah (libur), sehingga tidak perlu dicatat izin. 🙏`);
  }

  const namaHadir = daftarNama(sudahHadir);
  if (namaHadir) bagian.push(isiSudahHadir(namaHadir));

  // Satu salam pembuka dan satu salam penutup untuk seluruh balasan.
  return { balasan: bungkusBalasan(bagian) };
}

// Menghitung tanggal, mencatat, lalu membalas. Waktu yang tidak jelas -> ragu ke kepala sekolah.
async function catatDanBalas({ dari, pesan, target, anak, status, catatan, waktu, bahasa }) {
  const rencana = await buatRencana(status, waktu);
  if (!rencana.ok) {
    await catatPesan(dari, pesan, `Ragu: ${rencana.alasan}`.slice(0, 300), true);
    const info = {
      statusDugaan: status,
      alasanAI: catatan && catatan !== pesan ? catatan : '',
      detailWaktu: rencana.alasan || ''
    };
    await kirimRagu(target, dari, daftarNama(anak), pesan, rencana.izinPanjang
      ? { ...info, alasanRagu: 'izin_panjang', jumlahHari: rencana.izinPanjang }
      : { ...info, alasanRagu: 'waktu' });
    return;
  }
  const hasil = await simpan(dari, pesan, anak, status, catatan, rencana);
  if (hasil.balasan) await kirimBalasanWali(target, hasil.balasan, bahasa);
}

function getGroupId(b) {
  if (b?.sender && String(b.sender).includes('@g.us')) return String(b.sender);
  if (b?.group_id && String(b.group_id).includes('@g.us')) return String(b.group_id);
  if (b?.groupId && String(b.groupId).includes('@g.us')) return String(b.groupId);
  if (b?.chat_id && String(b.chat_id).includes('@g.us')) return String(b.chat_id);
  if (b?.chatId && String(b.chatId).includes('@g.us')) return String(b.chatId);
  return '';
}

function getPengirim(b) {
  const groupId = getGroupId(b);
  return nomor(groupId ? b.member : b.sender);
}

function getTargetBalasan(b) {
  const groupId = getGroupId(b);
  return groupId || getPengirim(b);
}

// kelas_id anak dibutuhkan agar libur_tanggal khusus kelas bisa diterapkan.
// Jika kolom kelas_id tidak ada di tabel siswa, sistem tetap jalan (libur khusus kelas diabaikan).
let SISWA_PUNYA_KELAS_ID = null;

async function cariAnak(dari) {
  const ambil = async kolom => sb(`wali?sekolah_id=eq.${K().sekolahId}&no_wa=eq.${encodeURIComponent(dari)}&select=id,no_wa,siswa_wali(siswa(${kolom}))`);
  let wali;
  if (SISWA_PUNYA_KELAS_ID !== false) {
    try {
      wali = await ambil('id,nama,nama_panggilan,aktif,kelas_id');
      SISWA_PUNYA_KELAS_ID = true;
    } catch (e) {
      console.error('Kolom siswa.kelas_id tidak terbaca, libur khusus kelas diabaikan:', e.message);
      SISWA_PUNYA_KELAS_ID = false;
    }
  }
  if (!wali) wali = await ambil('id,nama,nama_panggilan,aktif');
  return ((wali[0] && wali[0].siswa_wali) || [])
    .map(x => x.siswa)
    .filter(s => s && s.aktif)
    .sort((a, b) => String(a.nama || '').localeCompare(String(b.nama || '')));
}

const SAKIT = /\b(sakit|demam|flu|batuk|pilek|panas|diare|muntah|pusing|cacar|tipes|dbd|opname|kurang sehat|kurang enak badan|tidak enak badan|tidak fit|nggak enak badan|gak enak badan|tidak sehat|kurang fit)\b/i;
const IZIN = /\b(izin|ijin|permisi|tidak masuk|ga masuk|gak masuk|nggak masuk|ngga masuk|libur|acara|keluar kota|mudik|keperluan keluarga)\b/i;

// Frasa ini membuat konteks perlu dianalisis AI, agar pesan lama/masa depan/penyangkalan
// tidak salah dicatat sebagai absensi hari ini.
const KONTEKS_TIDAK_HARI_INI = /\b(kemarin|kemaren|tadi malam|tadi pagi|sebelumnya|dulu|besok|lusa|nanti|minggu depan|minggu lalu|bulan depan|bulan lalu|hari lain)\b/i;
const PENYANGKALAN = /\b(bukan|tidak|nggak|gak|ga|jangan)\b.{0,30}\b(sakit|demam|flu|batuk|pilek|panas|kurang sehat|kurang enak badan|tidak enak badan)\b|\b(sakit|demam|flu|batuk|pilek|panas|kurang sehat|kurang enak badan|tidak enak badan)\b.{0,30}\b(bukan|tidak|nggak|gak|ga)\b/i;
const KONTEKS_RUMIT = /\b(kalau|jika|seandainya|tapi|namun|sedangkan|padahal|karena|sebab|soalnya)\b/i;

// Pesan yang memuat label "Nama :" atau berbentuk surat panjang harus dicek AI,
// karena nama anak di pesan perlu dibandingkan dengan anak yang terdaftar.
const ADA_LABEL_NAMA = /\bnama\s*(lengkap|anak|ananda|siswa)?\s*[:=]/i;

// Tanggal, nama hari, atau durasi ("tanggal 10", "hari Rabu", "3 hari", "sampai Jumat")
// harus dihitung lewat AI + hitung tanggal, bukan dicatat sebagai hari ini.
const ADA_PENANDA_WAKTU = /\b(tanggal|tgl)\b|\b(senin|selasa|rabu|kamis|jumat|jum'at|sabtu|minggu|pekan)\b|\b\d{1,2}\s*(jan|feb|mar|apr|mei|jun|jul|agu|sep|okt|nov|des)[a-z]*\b|\b\d{1,2}\s*[\/-]\s*\d{1,2}\b|\b\d+\s*(hari|hr)\b|\b(sampai|s\/d|selama|mulai)\b/i;

function deteksiCepat(t) {
  if (ADA_LABEL_NAMA.test(t) || t.length > 300) return null;
  if (ADA_PENANDA_WAKTU.test(t)) return null;
  if (KONTEKS_TIDAK_HARI_INI.test(t)) return null;
  if (PENYANGKALAN.test(t)) return null;
  if (KONTEKS_RUMIT.test(t)) {
    // Kalimat yang memakai "karena" tetap aman untuk pola laporan sederhana
    // seperti "izin karena demam"; pola lain diserahkan ke AI.
    const sederhana = /\b(izin|ijin|permisi|tidak masuk|nggak masuk|gak masuk|ga masuk)\b.{0,80}\b(sakit|demam|flu|batuk|pilek|panas|kurang sehat|kurang enak badan|tidak enak badan)\b/i.test(t)
      || /\b(sakit|demam|flu|batuk|pilek|panas|kurang sehat|kurang enak badan|tidak enak badan)\b.{0,80}\b(izin|ijin|permisi|tidak masuk|nggak masuk|gak masuk|ga masuk)\b/i.test(t);
    if (!sederhana) return null;
  }
  if (SAKIT.test(t)) return 'sakit';
  if (IZIN.test(t)) return 'izin';
  return null;
}

function cariAnakDariNama(pesan, anak) {
  const t = pesan.toLowerCase();
  return anak.filter(s => {
    const nama = String(s.nama_panggilan || s.nama || '').toLowerCase().trim();
    return nama && new RegExp('\\b' + nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t);
  });
}

async function notifikasiKeKepala(dari, nama, pesan, jenis = 'ragu', error = null, opsi = {}) {
  const nomorKepala = K().nomorKepala;
  if (!nomorKepala) return;
  const teks = jenis === 'ai_error'
    ? notifikasiAIGagal(dari, nama, pesan, error)
    : notifikasiRagu(dari, nama, pesan, opsi);
  await kirimFonnte(nomor(nomorKepala), teks);
}

// Notifikasi "ragu" (aturan sama untuk grup dan chat pribadi):
// - Ragu karena NAMA BERBEDA -> dibalas langsung ke tempat pesan masuk
//   (grup PAUD jika dari grup, chat pribadi pengirim jika dari chat pribadi).
// - Semua ragu lainnya (maksud/waktu tidak jelas, anak tidak teridentifikasi)
//   -> dikirim ke kepala sekolah saja.
async function kirimRagu(target, dari, nama, pesan, opsi = {}) {
  if (opsi.namaBeda) {
    // Ke grup/chat pribadi: isi pesan asli TIDAK ditampilkan.
    await kirimBalasanWali(target, notifikasiRagu(dari, nama, pesan, { ...opsi, tampilkanPesan: false }), opsi.bahasa);
  } else {
    await notifikasiKeKepala(dari, nama, pesan, 'ragu', null, opsi);
  }
}

// ============================================================
// ANTI-DUPLIKAT
// Pesan yang sama (nomor pengirim + isi) dalam JENDELA_DUPLIKAT_MENIT menit diabaikan.
// Membutuhkan tabel Supabase: pesan_dedup(kunci text primary key, dibuat timestamptz default now()).
// Jika tabel belum ada, sistem tetap berjalan tanpa anti-duplikat (dan mencatat peringatan di log).
// ============================================================
function kunciDuplikat(dari, pesan) {
  const isi = String(pesan || '').toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(`${K().sekolahId}|${dari}|${isi}`).digest('hex');
}

// true = pesan baru (boleh diproses), false = duplikat (abaikan)
async function klaimPesan(kunci) {
  try {
    try {
      await sb('pesan_dedup', { method: 'POST', body: { kunci, sekolah_id: K().sekolahId }, prefer: 'return=minimal' });
    } catch (e) {
      if (!String(e.message).startsWith('409')) throw e;
      // Kunci sudah ada: boleh diambil alih hanya jika sudah lewat dari jendela waktu.
      const batas = new Date(Date.now() - JENDELA_DUPLIKAT_MENIT * 60000).toISOString();
      const diambil = await sb(`pesan_dedup?kunci=eq.${kunci}&dibuat=lt.${encodeURIComponent(batas)}`, {
        method: 'PATCH', body: { dibuat: new Date().toISOString() }, prefer: 'return=representation'
      });
      return Array.isArray(diambil) && diambil.length > 0;
    }
    // Bersihkan data lama sesekali agar tabel tidak membesar.
    if (Math.random() < 0.05) {
      const lama = new Date(Date.now() - 24 * 3600000).toISOString();
      await sb(`pesan_dedup?dibuat=lt.${encodeURIComponent(lama)}`, { method: 'DELETE' }).catch(() => {});
    }
    return true;
  } catch (e) {
    console.error('Anti-duplikat tidak aktif (cek tabel pesan_dedup):', e.message);
    return true;
  }
}

// Dipakai saat pemrosesan gagal, agar kiriman ulang dari Fonnte/wali tidak ikut terblokir.
async function lepasKlaim(kunci) {
  try { await sb(`pesan_dedup?kunci=eq.${kunci}`, { method: 'DELETE' }); } catch (_) {}
}

async function proses(b) {
  const pesan = String(b.message || b.text || '').trim();
  if (!pesan) return;

  const groupId = getGroupId(b);
  const dari = getPengirim(b);
  const target = getTargetBalasan(b);

  // 1. Jika pesan berasal dari grup, hanya grup yang terdaftar di sekolah ini yang boleh masuk.
  const ctx = K();
  if (groupId && !(ctx.grup || []).some((g) => g.grup_id === groupId)) return;
  ctx.tokenFonnte = pilihToken(b, groupId);

  // 2. Hanya nomor wali terdaftar yang boleh diproses.
  if (!dari) return;
  const anak = await cariAnak(dari);
  if (!anak.length) return;

  // 3. Anti-duplikat: nomor + isi pesan sama dalam 5 menit -> diabaikan total.
  const kunci = kunciDuplikat(dari, pesan);
  if (!(await klaimPesan(kunci))) {
    console.log('Pesan duplikat diabaikan');
    return;
  }

  try {
    await prosesPesan({ pesan, dari, target, anak, kunci });
  } catch (e) {
    await lepasKlaim(kunci);
    throw e;
  }
}

async function prosesPesan({ pesan, dari, target, anak, kunci }) {
  // 4. Deteksi cepat hanya untuk kalimat yang cukup aman. SAKIT tetap menang atas IZIN.
  const cepat = deteksiCepat(pesan);
  if (cepat) {
    let pilih = [];
    if (anak.length === 1) pilih = anak;
    else if (/\b(keduanya|semua|dua-duanya|duaduanya|semuanya)\b/i.test(pesan)) pilih = anak;
    else pilih = cariAnakDariNama(pesan, anak);

    if (pilih.length) {
      await catatDanBalas({ dari, pesan, target, anak: pilih, status: cepat, catatan: pesan, waktu: [] });
      return;
    }
  }

  // 5. Bahasa bebas/ambigu masuk ke AI.js.
  let hasilAI;
  try {
    hasilAI = await analisisPesan({ pesan, anak, tanggalHariIni: tanggal(), kunciAi: K().kunciAi });
  } catch (e) {
    // Kegagalan Gemini tidak boleh membuat absensi berubah otomatis.
    console.error('AI error:', e);
    await lepasKlaim(kunci); // pesan yang dikirim ulang nanti tetap boleh diproses
    await catatPesan(dari, pesan, 'Gemini error - belum dianalisis, perlu pengecekan manual', true).catch(() => {});
    const nama = anak.length === 1 ? (anak[0].nama || anak[0].nama_panggilan) : 'Belum berhasil diidentifikasi';
    await notifikasiKeKepala(dari, nama, pesan, 'ai_error', e).catch(err => console.error('Gagal notifikasi AI error:', err));
    return;
  }

  if (hasilAI.kategori === 'bukan_izin_sakit') {
    await catatPesan(dari, pesan, 'Bukan izin/sakit', false);
    return;
  }

  if (hasilAI.kategori === 'ragu' || hasilAI.nama_beda) {
    // Nama anak SELALU dari data terdaftar di nomor pengirim, bukan dari isi pesan.
    const nama = hasilAI.nama_anak
      || (anak.length === 1 ? anak[0].nama : '')
      || 'Belum berhasil diidentifikasi';
    const catatan = hasilAI.nama_beda
      ? `Ragu: nama di pesan (${(hasilAI.nama_di_pesan || []).join(' | ')}) berbeda dengan anak terdaftar (${nama})`
      : 'Ragu: perlu pengecekan guru';
    await catatPesan(dari, pesan, catatan.slice(0, 300), true);
    await kirimRagu(target, dari, nama, pesan, {
      namaDiPesan: hasilAI.nama_di_pesan || [],
      namaBeda: !!hasilAI.nama_beda,
      statusDugaan: hasilAI.status_dugaan || '',
      bahasa: hasilAI.bahasa,
      alasanRagu: hasilAI.alasan_ragu === 'anak_tidak_jelas' ? 'anak_tidak_jelas' : '',
      alasanAI: hasilAI.alasan || '',
      keyakinan: hasilAI.confidence || 0
    });
    return;
  }

  // 6. AI yakin. Validasi siswa sekali lagi sebelum menyimpan.
  let pilih = (hasilAI.siswa_ids || [])
    .map(id => anak.find(s => String(s.id) === String(id)))
    .filter(Boolean);
  if (!pilih.length && anak.length === 1) pilih = anak;

  if (!pilih.length) {
    await catatPesan(dari, pesan, 'Ragu: anak tidak teridentifikasi', true);
    await kirimRagu(target, dari, 'Belum berhasil diidentifikasi', pesan, {
      alasanRagu: 'anak_tidak_jelas',
      namaDiPesan: hasilAI.nama_di_pesan || [],
      statusDugaan: hasilAI.status_dugaan || hasilAI.status || '',
      alasanAI: hasilAI.alasan || '',
      keyakinan: hasilAI.confidence || 0
    });
    return;
  }

  const status = hasilAI.status === 'sakit' ? 'sakit' : 'izin';
  await catatDanBalas({
    dari, pesan, target, anak: pilih, status,
    catatan: hasilAI.alasan || pesan,
    waktu: hasilAI.waktu || [],
    bahasa: hasilAI.bahasa
  });
}

// Mencari sekolah dari kunci di alamat Webhook, lalu memuat konfigurasinya.
async function cariSekolah(kunci) {
  if (!kunci) return null;
  let id = null, r = null;
  const rows = await sb(`pengaturan_rahasia?webhook_kunci=eq.${encodeURIComponent(kunci)}&select=*`);
  if (Array.isArray(rows) && rows[0]) { r = rows[0]; id = r.sekolah_id; }
  else if (WEBHOOK_SECRET && kunci === WEBHOOK_SECRET) {
    // Masa transisi: kunci lama milik sekolah pertama
    id = SEKOLAH_PERTAMA;
    const x = await sb(`pengaturan_rahasia?sekolah_id=eq.${id}&select=*`);
    r = (Array.isArray(x) && x[0]) || {};
  }
  if (!id) return null;

  const sk = await sb(`sekolah?id=eq.${id}&select=status`);
  if (!Array.isArray(sk) || !sk[0] || sk[0].status !== 'aktif') return { nonaktif: true, sekolahId: id };

  const cadangan = id === SEKOLAH_PERTAMA;
  const [tk, gp] = await Promise.all([
    sb(`fonnte_token?sekolah_id=eq.${id}&select=id,label,token,perangkat&order=id.asc`),
    sb(`grup_wa?sekolah_id=eq.${id}&select=grup_id,token_id`)
  ]);
  const tokens = Array.isArray(tk) ? tk : [];
  let grup = Array.isArray(gp) ? gp : [];
  if (!grup.length && r.id_grup) grup = [{ grup_id: r.id_grup, token_id: null }];
  return {
    sekolahId: id,
    tokens,
    grup,
    tokenFonnte: (tokens[0] && tokens[0].token) || (cadangan ? ENV_FONNTE : '') || '',
    kunciAi: r.kunci_ai || (cadangan ? ENV_GEMINI : '') || '',
    nomorKepala: r.nomor_kepala || ''
  };
}

module.exports = async (req, res) => {
  const kunci = String((req.query && req.query.key) || '').trim();

  if (req.method !== 'POST') {
    if (!kunci) return res.status(200).send('Webhook aktif');
    try {
      const c = await cariSekolah(kunci);
      return res.status(200).send(c && !c.nonaktif ? 'Kunci cocok' : 'Kunci salah');
    } catch (e) {
      console.error('Cek kunci Webhook gagal:', e);
      return res.status(200).send('Kunci tidak dapat diperiksa');
    }
  }

  let ctx;
  try { ctx = await cariSekolah(kunci); }
  catch (e) { console.error('Webhook: gagal memuat sekolah:', e); return res.status(200).json({ ok: false }); }
  if (!ctx) return res.status(401).send('Tidak diizinkan');
  if (ctx.nonaktif) return res.status(200).json({ ok: true });

  try { await konteks.run(ctx, () => proses(req.body || {})); }
  catch (e) { console.error('Webhook error:', e); }

  return res.status(200).json({ ok: true });
};

// Dipakai oleh cek-libur.js untuk menguji pembacaan tabel libur (tidak memengaruhi webhook).
module.exports._uji = { sb, ambilLibur, hariSekolah, formatTanggal, tanggal, tambahHari, indeksHari, NAMA_HARI };
