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
// Nomor WhatsApp developer untuk laporan error sistem (mis. Gemini gagal), dibaca dari variabel
// Vercel DEV_WA. Boleh satu nomor, atau beberapa nomor dipisah koma/titik koma/spasi.
// Format 08xxx, 628xxx, atau +62 8xx diterima; nomor tidak valid diabaikan.
const NOMOR_DEVELOPER = String(process.env.DEV_WA || '')
  .split(/[,;\s]+/)
  .map(x => x.replace(/\D/g, '').replace(/^0/, '62'))
  .filter(x => /^628\d{8,12}$/.test(x));

// Status yang TIDAK boleh ditimpa pesan izin/sakit wali, lalu dibalas "sudah tercatat".
// Alpa boleh ditimpa. Libur juga tidak ditimpa, tetapi dibalas seperti hari libur biasa (lihat simpan()).
const STATUS_DILINDUNGI = new Set(['hadir', 'terlambat']);
const LABEL_STATUS = { hadir: 'Hadir', terlambat: 'Terlambat' };

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

async function sb(path, { method = 'GET', body, prefer, signal } = {}) {
  if (!SB || !KEY) throw new Error('SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum tersedia');
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + KEY;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined, signal
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

// Versi rinci: mengembalikan { ok, id, error } agar balasan ke wali bisa dicatat di kirim_log.
// jadwal (opsional) = unix timestamp detik; bila diisi, Fonnte yang mengirim pada jam tersebut.

async function catatPemakaianAI(data) {
  const sekolahId = Number(K().sekolahId);
  if (!Number.isSafeInteger(sekolahId) || sekolahId <= 0) return;
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(1500) : undefined;
  await sb('rpc/catat_pemakaian_ai', {
    method: 'POST',
    signal,
    body: {
      p_sekolah_id: sekolahId,
      p_layanan: data.layanan,
      p_model: data.model,
      p_input_tokens: data.input_tokens,
      p_output_tokens: data.output_tokens,
      p_total_tokens: data.total_tokens,
      p_status: data.status,
      p_kode_error: data.kode_error || null
    }
  });
}

// Reservasi dan status pengaman dipisah dari catatan token; tidak menyimpan isi pesan atau API key.
async function ambilIzinGemini(model) {
  const sekolahId = Number(K().sekolahId);
  if (!Number.isSafeInteger(sekolahId) || sekolahId <= 0) throw new Error('Sekolah pengaman Gemini tidak valid');
  return sb('rpc/gemini_ambil_izin', {
    method: 'POST',
    body: { p_sekolah_id: sekolahId, p_model: model }
  });
}

async function catatHasilGemini(data) {
  const sekolahId = Number(K().sekolahId);
  if (!Number.isSafeInteger(sekolahId) || sekolahId <= 0) return;
  const signal = typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(1500) : undefined;
  await sb('rpc/gemini_catat_hasil', {
    method: 'POST',
    signal,
    body: {
      p_sekolah_id: sekolahId,
      p_model: data.model,
      p_status: data.status,
      p_http_status: data.httpStatus,
      p_kode_error: data.kode,
      p_retry_after_seconds: data.retryAfter
    }
  });
}

async function ambilIzinKeyGemini(id) {
  const sekolahId = Number(K().sekolahId);
  return sb('rpc/gemini_key_ambil_izin', { method: 'POST', body: { p_sekolah_id: sekolahId, p_id: Number(id) } });
}
async function catatHasilKeyGemini(data) {
  const sekolahId = Number(K().sekolahId);
  return sb('rpc/gemini_key_catat_hasil', {
    method: 'POST',
    body: {
      p_sekolah_id: sekolahId, p_id: Number(data.id), p_status: data.status,
      p_http_status: data.httpStatus, p_kode_error: data.kode,
      p_detail: data.detail || null, p_retry_after_seconds: data.retryAfter,
      p_permanen: !!data.permanen
    }
  });
}
async function tandaiTerakhirKeyGemini(id, model) {
  return sb('rpc/gemini_key_tandai_terakhir', {
    method: 'POST', body: { p_sekolah_id: Number(K().sekolahId), p_id: Number(id), p_model: model }
  });
}
async function ambilKunciAiRotasi() {
  const sekolahId = Number(K().sekolahId);
  if (!Number.isSafeInteger(sekolahId) || sekolahId <= 0) return K().kunciAi || '';
  const daftar = await sb('rpc/gemini_key_daftar_rotasi', {
    method: 'POST',
    body: { p_sekolah_id: sekolahId, p_model: 'gemini-3.5-flash-lite' }
  });
  return Array.isArray(daftar) && daftar.length ? daftar : (K().kunciAi || '');
}
const pengamanGemini = {
  ambilIzin: ambilIzinGemini,
  catatHasil: catatHasilGemini,
  ambilIzinKey: ambilIzinKeyGemini,
  catatHasilKey: catatHasilKeyGemini,
  tandaiTerakhirKey: tandaiTerakhirKeyGemini
};

async function kirimFonnteRinci(target, teks, jadwal) {
  const tokenFonnte = K().tokenFonnte;
  if (!target || !tokenFonnte) return { ok: false, id: null, error: 'Token atau nomor tujuan kosong' };
  try {
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: tokenFonnte, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(jadwal
        ? { target: String(target), message: teks, schedule: String(Math.floor(Number(jadwal))) }
        : { target: String(target), message: teks })
    });
    const raw = await r.text();
    if (!r.ok) { console.error('Fonnte HTTP error:', r.status, raw); return { ok: false, id: null, error: 'Fonnte HTTP ' + r.status }; }
    let j = null;
    try { j = JSON.parse(raw); } catch (_) {}
    if (j && j.status === false) return { ok: false, id: null, error: String(j.reason || 'Fonnte menolak pesan').slice(0, 300) };
    const v = j && j.id;
    const a = Array.isArray(v) ? v[0] : v;
    return { ok: true, id: a == null || a === '' ? null : String(a), error: null };
  } catch (e) {
    console.error('Gagal mengirim Fonnte:', e);
    return { ok: false, id: null, error: 'Gagal terhubung ke Fonnte' };
  }
}

async function kirimFonnte(target, teks, jadwal) {
  return (await kirimFonnteRinci(target, teks, jadwal)).ok;
}

// Mencatat balasan ke wali di kirim_log (jenis 'balasan') supaya statusnya (terkirim/sampai/terbaca)
// ikut diperbarui oleh status-kirim.js dan tampil di menu Pesan WA. Gagal mencatat TIDAK boleh
// menggagalkan balasan. Kolom nomor selalu diisi nomor PENGIRIM (bukan ID grup) agar cocok dengan
// dari_nomor di pesan_masuk; label membedakan balasan pribadi dan balasan grup.
async function catatBalasan(target, hasil) {
  try {
    const c = K();
    if (!c.sekolahId || !c.pengirim) return;
    await sb('kirim_log', {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        sekolah_id: c.sekolahId,
        batch_id: crypto.randomUUID(),
        jenis: 'balasan',
        judul: 'Balasan pesan wali',
        label: ('Balasan' + (c.dariGrup ? ' (grup)' : '') + (c.namaAnak ? ' · ' + c.namaAnak : '')).slice(0, 120),
        nomor: String(c.pengirim).replace(/\D/g, '').slice(0, 20) || '-',
        fonnte_id: hasil.id,
        status: hasil.ok ? 'terjadwal' : 'gagal',
        error: hasil.ok ? null : hasil.error
      }
    });
  } catch (e) {
    console.error('Catat balasan ke kirim_log gagal:', e.message || e);
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
      isi = await terjemahkanBalasan({
        teks, bahasa, kunciAi: await ambilKunciAiRotasi(),
        catatPemakaian: catatPemakaianAI, pengamanGemini,
        onGangguan: x => notifikasiGangguanKeyDeveloper([x], target, 'Terjemahan balasan')
      });
    } catch (e) {
      console.error(`Terjemahan ke ${bahasa} gagal, balasan dikirim dalam Bahasa Indonesia:`, e.message);
      isi = teks;
    }
  }
  const hasil = await kirimFonnteRinci(target, isi);
  if (hasil.ok) await tandaiPesanDibalas();
  await catatBalasan(target, hasil);
  return hasil.ok;
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

function isiIzin(nama, tgl, tidakAktif = [], terlindung = []) {
  const T = tanggal();
  const kalimat = tgl.length === 1
    ? `Baik, Bunda. Laporan izin untuk *${nama}* pada hari *${formatTanggal(tgl[0])}*${tgl[0] === T ? ' (hari ini)' : ''} sudah kami terima dan telah dicatat. 📝`
    : `Baik, Bunda. Laporan izin untuk *${nama}* pada hari berikut sudah kami terima dan telah dicatat: 📝\n${daftarTanggal(tgl)}`;
  const baris = [kalimat];
  if (tidakAktif.length) {
    baris.push('', `ℹ️ *Catatan:* ${tidakAktif.map(formatTanggal).join('; ')} bukan hari sekolah (libur), sehingga tidak dicatat.`);
  }
  if (terlindung.length) {
    baris.push('', `ℹ️ *Catatan:* ${terlindung.map(t => `${formatTanggal(t.tgl)} sudah tercatat ${t.label}`).join('; ')}, sehingga data tidak diubah.`);
  }
  baris.push('', `Semoga segala keperluan Bunda dan *${nama}* diberikan kelancaran, kemudahan, dan keberkahan. 🤲`);
  return baris.join('\n');
}

function isiSudahTercatat(nama, label) {
  return `⚠️ *${nama}* sudah tercatat *${label}* di sekolah, jadi data tidak diubah. Silahkan laporkan kepada ( *wali kelas/kepala sekolah* ) untuk mengkoreksi.`;
}

function isiBukanHariSekolah(tidakAktif) {
  return `Baik, Bunda. Pesan sudah kami terima. Namun ${tidakAktif.map(formatTanggal).join('; ')} bukan hari sekolah (libur), sehingga tidak perlu dicatat izin. 🙏`;
}

function balasanSakit(nama, tgl, lanjut = null) { return bungkusBalasan([isiSakit(nama, tgl, lanjut)]); }
function balasanIzin(nama, tgl, tidakAktif = []) { return bungkusBalasan([isiIzin(nama, tgl, tidakAktif)]); }
function balasanBukanHariSekolah(tidakAktif) { return bungkusBalasan([isiBukanHariSekolah(tidakAktif)]); }
function balasanTanggalLampau(tambahan = []) {
  return bungkusBalasan([
    'Mohon maaf, Bunda. Tanggal yang disebutkan pada pesan Bunda sudah lewat, sehingga laporan belum kami catat. 🙏',
    `📅 *Hari ini:* ${formatTanggal(tanggal())}`,
    'Mohon periksa kembali tanggal dan harinya, kemudian kirim kembali pesannya. 😊',
    ...tambahan
  ]);
}

// Balasan jika nama hari pada pesan tidak cocok dengan tanggalnya (mis. "Kamis, 6 November 2026"
// padahal 6 November 2026 hari Jumat). Tidak ada yang dicatat; wali diminta memeriksa dan mengirim ulang.
function balasanHariTanggalBeda(beda, tambahan = []) {
  const [Y, M, D] = beda.iso.split('-').map(Number);
  const tertulis = `${NAMA_HARI[INDEKS_HARI[beda.hari]]}, ${D} ${NAMA_BULAN[M - 1]} ${Y}`;
  return bungkusBalasan([
    `Mohon maaf, Bunda. Hari dan tanggal pada pesan Bunda tidak sesuai: *${tertulis}* (${D} ${NAMA_BULAN[M - 1]} ${Y} jatuh pada hari *${NAMA_HARI[indeksHari(beda.iso)]}*), sehingga laporan belum dicatat. 🙏`,
    `📅 *Hari ini:* ${formatTanggal(tanggal())}`,
    'Mohon periksa kembali hari dan tanggalnya, kemudian kirim kembali pesannya. 😊',
    ...tambahan
  ]);
}

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

// Notifikasi ragu untuk kepala sekolah. Pesan nama salah/anak tidak jelas untuk wali:
// lihat balasanNamaBeda() dan balasanMintaNamaAnak().
function notifikasiRagu(pengirim, namaAnak, pesan, opsi = {}) {
  return notifikasiRaguDetail(pengirim, namaAnak, pesan, opsi);
}

function notifikasiAIGagal(pengirim, namaAnak, pesan, error, devDiberitahu = false) {
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
    ...(devDiberitahu ? ['', '📨 Hal ini sudah diinformasikan kepada developer.'] : []),
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
  // Pembatalan libur (tabel libur_batal) menang atas semua jenis libur.
  // kelas_id = 0 berarti semua kelas; selain itu hanya kelas tersebut.
  if (libur.batalSemua && libur.batalSemua.has(iso)) return true;
  if (kelasId !== null && kelasId !== undefined && libur.batalKelas) {
    const batal = libur.batalKelas.get(String(kelasId));
    if (batal && batal.has(iso)) return true;
  }
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

  // Pembatalan libur: libur_batal (tanggal, kelas_id; kelas_id 0 = semua kelas).
  const batalSemua = new Set();
  const batalKelas = new Map();
  try {
    const rows = await sb(`libur_batal?sekolah_id=eq.${K().sekolahId}&tanggal=gte.${dari}&tanggal=lte.${sampai}&select=tanggal,kelas_id`);
    for (const r of (rows || [])) {
      const t = String(r.tanggal || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) continue;
      if (r.kelas_id === null || r.kelas_id === undefined || Number(r.kelas_id) === 0) batalSemua.add(t);
      else {
        const k = String(r.kelas_id);
        if (!batalKelas.has(k)) batalKelas.set(k, new Set());
        batalKelas.get(k).add(t);
      }
    }
  } catch (e) {
    console.error('Tabel libur_batal tidak terbaca, pembatalan libur diabaikan:', e.message);
  }

  return { mingguan, tanggalUmum: tanggalLibur.umum, tanggalKelas: tanggalLibur.kelas, batalSemua, batalKelas };
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

// true jika penanda waktu dari AI menunjuk tanggal yang SUDAH LEWAT (mis. "izin tanggal 8" padahal hari ini tanggal 9).
// Tanggal tanpa tahun/bulan dibaca sebagai kemunculan terdekat: lebih dekat ke masa lalu -> lampau,
// lebih dekat ke depan (mis. "tanggal 2" ditulis tanggal 28) -> dianggap bulan/tahun depan.
function waktuLampau(w, T) {
  if (!w) return false;
  if (w.tipe === 'lampau') return true;
  if (w.tipe !== 'tanggal') return false;
  const d = Number(w.tanggal);
  if (!Number.isInteger(d) || d < 1 || d > 31) return false;
  const [Y, M] = T.split('-').map(Number);

  if (w.bulan && w.tahun) {
    const t = tanggalValid(Number(w.tahun), Number(w.bulan), d);
    return !!t && t < T;
  }
  const ini = w.bulan ? tanggalValid(Y, Number(w.bulan), d) : tanggalValid(Y, M, d);
  if (!ini || ini >= T) return false;
  const depan = w.bulan
    ? tanggalValid(Y + 1, Number(w.bulan), d)
    : tanggalValid(M === 12 ? Y + 1 : Y, M === 12 ? 1 : M + 1, d);
  return !depan || selisihHari(ini, T) <= selisihHari(T, depan);
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
// - sakit : HARI_SAKIT_OTOMATIS hari sekolah aktif mulai tanggal sakit yang disebut (maksimal dua hari sekolah aktif ke depan).
// - izin  : sesuai tanggal/hari yang disebut (tanpa penanda waktu = hari ini).
// Mencari penanda tanggal yang nama harinya tidak cocok dengan hari sebenarnya dari tanggal itu.
function cariHariTanggalBeda(entri, T) {
  for (const w of entri) {
    for (const x of [w, w && w.sampai]) {
      if (!x || x.tipe !== 'tanggal' || !x.hari_tertulis) continue;
      const iso = hitungTanggal(x, T, true);
      if (iso && indeksHari(iso) !== INDEKS_HARI[x.hari_tertulis]) return { hari: x.hari_tertulis, iso };
    }
  }
  return null;
}

async function buatRencana(status, waktu, anak = []) {
  const T = tanggal();
  const entri = Array.isArray(waktu) ? waktu : [];
  // Tanggal sudah lewat: tidak dicatat, wali diminta memeriksa dan mengirim ulang.
  if (entri.some(w => waktuLampau(w, T))) {
    return { ok: false, lampau: true, alasan: 'tanggal sudah lampau' };
  }
  // Nama hari dan tanggal pada pesan saling bertentangan: tidak dicatat, wali diminta memeriksa.
  const beda = cariHariTanggalBeda(entri, T);
  if (beda) return { ok: false, hariTanggalBeda: beda, alasan: 'hari dan tanggal tidak cocok' };
  const libur = await ambilLibur(T, tambahHari(T, BATAS_HARI_KE_DEPAN + BATAS_JUMLAH_HARI_IZIN + 15));

  if (status === 'sakit') {
    // Tanggal mulai sakit boleh hari pesan dikirim atau dua hari sekolah aktif berikutnya.
    // Jika tanggal yang disebut jatuh pada hari libur, geser ke hari sekolah aktif berikutnya.
    // Hitungan dilakukan per kelas karena libur tertentu dapat berlaku khusus untuk satu kelas.
    const buatRencanaSakit = kelasId => {
      const batasMulai = [];
      const jumlahBatas = hariSekolah(T, libur, kelasId) ? 3 : 2;
      let d = T;
      for (let i = 0; i < 60 && batasMulai.length < jumlahBatas; i++, d = tambahHari(d, 1)) {
        if (hariSekolah(d, libur, kelasId)) batasMulai.push(d);
      }

      const sumber = entri.length ? entri : [{ tipe: 'hari_ini' }];
      const calonMulai = [];
      for (const x of sumber) {
        let diminta;
        // Nama hari yang sama dengan hari pesan berarti hari ini, bukan pekan depan.
        if (x.tipe === 'nama_hari' && !x.pekan_depan && INDEKS_HARI[x.nama_hari] === indeksHari(T)) {
          diminta = T;
        } else {
          diminta = hitungTanggal(x, T, true);
        }
        if (!diminta || diminta < T) {
          return { valid: false, alasan: 'tanggal mulai sakit tidak dapat ditentukan' };
        }

        let aktif = diminta;
        for (let i = 0; i < 60 && !hariSekolah(aktif, libur, kelasId); i++) {
          aktif = tambahHari(aktif, 1);
        }
        if (!hariSekolah(aktif, libur, kelasId) || !batasMulai.includes(aktif)) {
          return { valid: false, alasan: 'tanggal sakit melewati batas dua hari sekolah aktif' };
        }
        calonMulai.push(aktif);
      }

      const mulai = calonMulai.sort()[0] || batasMulai[0];
      if (!mulai) return { valid: false, alasan: 'tidak ditemukan hari sekolah aktif' };

      const tanggalSakit = [];
      d = mulai;
      for (let i = 0; i < 60 && tanggalSakit.length < HARI_SAKIT_OTOMATIS; i++, d = tambahHari(d, 1)) {
        if (hariSekolah(d, libur, kelasId)) tanggalSakit.push(d);
      }
      const terakhir = tanggalSakit[tanggalSakit.length - 1];
      return {
        valid: true,
        hasil: {
          tanggal: tanggalSakit,
          tidakAktif: [],
          lanjut: terakhir ? hariMasukBerikutnya(terakhir, libur, kelasId) : null
        }
      };
    };

    const rencanaPerKelas = new Map();
    for (const siswa of (anak || [])) {
      const k = String(siswa.kelas_id ?? '');
      if (!rencanaPerKelas.has(k)) {
        const hasil = buatRencanaSakit(siswa.kelas_id);
        if (!hasil.valid) return { ok: false, alasan: hasil.alasan };
        rencanaPerKelas.set(k, hasil.hasil);
      }
    }
    const cadangan = rencanaPerKelas.size ? null : buatRencanaSakit(null);
    if (cadangan && !cadangan.valid) return { ok: false, alasan: cadangan.alasan };

    return {
      ok: true,
      untuk: kelasId => rencanaPerKelas.get(String(kelasId ?? '')) || cadangan?.hasil
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
  // Simpan ID setiap catatan pesan pada konteks request ini agar balasan Fonnte
  // dapat memperbarui baris pesan yang tepat (termasuk bila ada catatan tambahan).
  const rows = await sb('pesan_masuk', {
    method: 'POST',
    body: { sekolah_id: K().sekolahId, dari_nomor: dari, isi, hasil, perlu_dicek: cek },
    prefer: 'return=representation'
  });
  const ids = (Array.isArray(rows) ? rows : [])
    .map(r => Number(r && r.id))
    .filter(id => Number.isSafeInteger(id) && id > 0);
  const c = K();
  if (!Array.isArray(c.pesanMasukIds)) c.pesanMasukIds = [];
  c.pesanMasukIds.push(...ids);
  return ids;
}

async function tandaiPesanDibalas() {
  const c = K();
  const ids = [...new Set((c.pesanMasukIds || [])
    .map(Number)
    .filter(id => Number.isSafeInteger(id) && id > 0))];
  if (!ids.length || !c.sekolahId) return;

  try {
    await sb(`pesan_masuk?id=in.(${ids.join(',')})&sekolah_id=eq.${c.sekolahId}`, {
      method: 'PATCH',
      body: { sudah_dibalas: true, dibalas_pada: new Date().toISOString() },
      prefer: 'return=minimal'
    });
    c.pesanMasukIds = (c.pesanMasukIds || []).filter(id => !ids.includes(Number(id)));
  } catch (e) {
    // Kegagalan sinkronisasi tidak boleh mengubah status keberhasilan kirim WhatsApp.
    console.error('Gagal memperbarui status pesan_masuk setelah balasan terkirim:', e.message || e);
  }
}

async function simpan(dari, pesan, anak, status, catatan, rencana, tambahan = []) {
  // Tanggal dihitung per anak, karena libur_tanggal bisa khusus kelas tertentu.
  const per = anak.map(s => ({ s, ...rencana.untuk(s.kelas_id) }));
  const aktif = per.filter(p => p.tanggal.length);
  const liburSaja = per.filter(p => !p.tanggal.length);

  const bagian = [];
  const sudahTercatat = []; // { s, labels } : seluruh tanggal sudah terisi status terlindungi
  let sebagianTerlindung = false;
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
      // Hanya tanggal yang memang akan ditulis untuk anak ini yang diperiksa.
      const adaAnak = ada.filter(a => a.siswa_id === p.s.id && p.tanggal.includes(a.tanggal));
      const lindung = new Map(adaAnak.filter(a => STATUS_DILINDUNGI.has(a.status)).map(a => [a.tanggal, a.status]));
      // Libur yang diisi guru: tidak ditimpa, dibalas seperti hari libur biasa.
      const liburManual = adaAnak.filter(a => a.status === 'libur').map(a => a.tanggal);
      const tidakAktif = [...new Set([...p.tidakAktif, ...liburManual])].sort();
      let tulis = p.tanggal.filter(d => !lindung.has(d) && !liburManual.includes(d));
      if (status === 'sakit' && lindung.size) tulis = []; // sakit tidak dicatat bila ada tanggal yang terlindungi
      if (!tulis.length) {
        if (lindung.size) sudahTercatat.push({ s: p.s, labels: [...new Set(lindung.values())].map(x => LABEL_STATUS[x] || x) });
        else liburSaja.push({ s: p.s, tidakAktif });
        continue;
      }
      const terlindung = [...lindung.entries()].sort().map(([tgl, st]) => ({ tgl, label: LABEL_STATUS[st] || st }));
      if (terlindung.length) sebagianTerlindung = true;

      tulis.forEach(d => rows.push({
        sekolah_id: K().sekolahId, siswa_id: p.s.id, tanggal: d, status, cara: 'whatsapp', jam_datang: null,
        catatan: catatanDb || null, diubah, diubah_oleh: null
      }));
      const k = `${tulis.join(',')}|${tidakAktif.join(',')}|${p.lanjut || ''}|${terlindung.map(t => t.tgl + t.label).join(',')}`;
      if (!kelompok.has(k)) kelompok.set(k, { anak: [], tanggal: tulis, tidakAktif, lanjut: p.lanjut || null, terlindung });
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
    (ubah.length || sudahTercatat.length
      ? `${status}: ${daftarNama(ubah.length ? ubah : sudahTercatat.map(x => x.s))} [${semuaDicatat.join(', ')}]${sudahTercatat.length || sebagianTerlindung ? ' (sebagian sudah tercatat hadir/terlambat, tidak diubah)' : ''}`
      : `${status}: ${daftarNama(anak)} - tanggal bukan hari sekolah`).slice(0, 300),
    sudahTercatat.length > 0 || sebagianTerlindung
  );

  for (const g of kelompok.values()) {
    const nm = daftarNama(g.anak);
    bagian.push(status === 'sakit' ? isiSakit(nm, g.tanggal, g.lanjut) : isiIzin(nm, g.tanggal, g.tidakAktif, g.terlindung));
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

  // Anak yang seluruh tanggalnya sudah terisi status terlindungi: dikelompokkan per status agar pesannya akurat.
  const tercatatKelompok = new Map();
  for (const x of sudahTercatat) {
    const label = x.labels.join(' / ');
    if (!tercatatKelompok.has(label)) tercatatKelompok.set(label, []);
    tercatatKelompok.get(label).push(x.s);
  }
  for (const [label, daftar] of tercatatKelompok) bagian.push(isiSudahTercatat(daftarNama(daftar), label));

  // Satu salam pembuka dan satu salam penutup untuk seluruh balasan.
  // Bagian tambahan (mis. nama yang ditolak) ikut dalam pesan yang sama.
  bagian.push(...tambahan);
  return { balasan: bungkusBalasan(bagian) };
}

// Menghitung tanggal, mencatat, lalu membalas. Waktu yang tidak jelas -> ragu ke kepala sekolah.
async function catatDanBalas({ dari, pesan, target, anak, status, catatan, waktu, bahasa, namaSalah = [], namaTerdaftar = '' }) {
  K().namaAnak = daftarNama(anak);
  const rencana = await buatRencana(status, waktu, anak);
  // Nama yang tidak cocok (sebagian nama di pesan cocok): ditolak SETELAH tanggal/waktu diperiksa.
  // Teksnya digabung ke balasan wali; ragam kalimat bergantung pada hasil pemeriksaan tanggal.
  const bagianNama = (mode, cocok = '') => namaSalah.length ? [bagianNamaSalah(namaSalah, namaTerdaftar, mode, cocok)] : [];
  const catatNama = async () => {
    if (namaSalah.length) {
      await catatPesan(dari, pesan, `Nama tidak cocok ditolak: ${namaSalah.join(' | ')}`.slice(0, 300), true).catch(() => {});
    }
  };
  if (!rencana.ok && rencana.lampau) {
    await catatPesan(dari, pesan, 'Ditolak: tanggal sudah lampau, wali diminta memeriksa dan mengirim ulang', false);
    await catatNama();
    await kirimBalasanWali(target, balasanTanggalLampau(bagianNama('netral')), bahasa);
    return;
  }
  if (!rencana.ok && rencana.hariTanggalBeda) {
    await catatPesan(dari, pesan, 'Ditolak: hari dan tanggal pada pesan tidak cocok, wali diminta memeriksa dan mengirim ulang', false);
    await catatNama();
    await kirimBalasanWali(target, balasanHariTanggalBeda(rencana.hariTanggalBeda, bagianNama('netral')), bahasa);
    return;
  }
  if (!rencana.ok) {
    await catatPesan(dari, pesan, `Ragu: ${rencana.alasan}`.slice(0, 300), true);
    await catatNama();
    const info = {
      statusDugaan: status,
      alasanAI: catatan && catatan !== pesan ? catatan : '',
      detailWaktu: rencana.alasan || '',
      anakTerkait: anak
    };
    await kirimRagu(target, dari, daftarNama(anak), pesan, rencana.izinPanjang
      ? { ...info, alasanRagu: 'izin_panjang', jumlahHari: rencana.izinPanjang }
      : { ...info, alasanRagu: 'waktu' });
    // Tidak ada balasan sukses untuk digabung, jadi penolakan nama dikirim sendiri ke wali.
    const tambahan = bagianNama('netral', daftarNama(anak));
    if (tambahan.length) await kirimBalasanWali(target, bungkusBalasan(tambahan), bahasa);
    return;
  }
  const hasil = await simpan(dari, pesan, anak, status, catatan, rencana, bagianNama('sebagian'));
  await catatNama();
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

// Penyaring awal KHUSUS pesan grup: percakapan umum tidak perlu memakai kuota Gemini.
// Pemicu hanya mengarahkan pesan ke deteksi cepat/AI, bukan otomatis mencatat absensi.
// Pemicu grup harus menunjukkan maksud ketidakhadiran, bukan sekadar menyebut penyakit.
// Kata "sakit/demam/flu/batuk" tanpa konteks tidak cukup (mis. doa untuk teman yang sakit).
const PEMICU_PESAN_GRUP = /\b(izin(?:\s+(?:tidak\s+masuk|tidak\s+hadir|tidak\s+bisa\s+masuk|tidak\s+bisa\s+hadir|sekolah|karena))|ijin(?:\s+(?:tidak\s+masuk|tidak\s+hadir|tidak\s+bisa\s+masuk|tidak\s+bisa\s+hadir|sekolah|karena))|permisi(?:\s+(?:tidak\s+masuk|tidak\s+hadir|tidak\s+bisa\s+hadir))|tidak\s+masuk(?:\s+sekolah)?|ga\s+masuk|gak\s+masuk|nggak\s+masuk|ngga\s+masuk|tidak\s+bisa\s+masuk(?:\s+sekolah)?|tidak\s+dapat\s+masuk(?:\s+sekolah)?|ga\s+bisa\s+masuk|gak\s+bisa\s+masuk|nggak\s+bisa\s+masuk|tidak\s+hadir|tidak\s+bisa\s+hadir|tidak\s+dapat\s+hadir|tidak\s+bisa\s+berangkat|tidak\s+dapat\s+berangkat|tidak\s+bisa\s+sekolah|tidak\s+dapat\s+sekolah|belum\s+bisa\s+masuk|belum\s+bisa\s+sekolah|belum\s+bisa\s+berangkat|berhalangan\s+hadir|tidak\s+mengikuti\s+(?:pembelajaran|kegiatan|sekolah)|tidak\s+masuk\s+karena|tidak\s+masuk\s+akibat)\b/i;

function adaPemicuPesanGrup(pesan) {
  return PEMICU_PESAN_GRUP.test(String(pesan || ''));
}

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

// Mendeteksi kemungkinan nama anak yang TIDAK terdaftar di nomor pengirim.
// Cara kerja: kata kunci izin/sakit dibuang, lalu setiap kata yang tersisa harus berupa
// nama anak terdaftar atau kata umum. Kata lain dianggap "asing" -> pesan dianalisis AI.
// Salah deteksi hanya berakibat pesan diproses AI (lebih lambat), bukan salah catat.
const KATA_UMUM = new Set((
  'assalamualaikum assalamu alaikum alaikumsalam waalaikumsalam wassalamualaikum wassalam wr wb ' +
  'warahmatullahi wabarakatuh salam selamat pagi siang sore malam bu ibu bunda pak bapak bang kak mas mbak ' +
  'ustadzah ustazah ustadz ustaz guru kepala sekolah kelas wali ortu orang tua mama papa mami papi umi abi ' +
  'mohon maaf izin ijin terima kasih makasih terimakasih trims thanks tks ya yah yaa dong nih ini itu hari ' +
  'saya aku kami kita kakak adik anak anaknya ananda putra putri nya tidak tak nggak gak ga ngga bisa dapat ' +
  'masuk hadir belajar karena sebab dan atau dengan untuk dari di ke yg yang sedang lagi besok lusa tadi nanti ' +
  'ada jadi sudah belum mau akan pada hanya juga sih deh pun lah kah doa doanya semoga cepat sembuh segera ' +
  'ok oke baik siap tolong sampaikan kepada pesan laporan lapor info informasi pemberitahuan kurang enak badan ' +
  'sehat fit keduanya kedua semua semuanya dua berdua duaduanya sakit demam flu batuk pilek panas diare muntah ' +
  'pusing cacar tipes dbd opname acara keluar kota mudik keperluan keluarga permisi libur sampai selama mulai ' +
  'tanggal tgl senin selasa rabu kamis jumat sabtu minggu pekan depan lalu bulan hari'
).split(/\s+/));

function tokenKata(teks) {
  return String(teks || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function adaNamaAsing(pesan, anak) {
  const dikenal = new Set();
  for (const s of anak) {
    tokenKata(s.nama).forEach(t => dikenal.add(t));
    tokenKata(s.nama_panggilan).forEach(t => dikenal.add(t));
  }
  const bersih = String(pesan || '')
    .replace(new RegExp(SAKIT.source, 'gi'), ' ')
    .replace(new RegExp(IZIN.source, 'gi'), ' ');
  return tokenKata(bersih).some(t => t.length >= 2 && !dikenal.has(t) && !KATA_UMUM.has(t));
}

function cariAnakDariNama(pesan, anak) {
  const t = pesan.toLowerCase();
  return anak.filter(s => {
    const nama = String(s.nama_panggilan || s.nama || '').toLowerCase().trim();
    return nama && new RegExp('\\b' + nama.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i').test(t);
  });
}

const RE_WA = /^628\d{8,12}$/;
const JEDA_MIN = 30; // detik, jeda acak antar penerima notifikasi ragu
const JEDA_MAX = 60;
const RE_UUID = /^[0-9a-f-]{36}$/i;

// Pesan untuk developer: error Gemini lengkap dengan konteks teknis (bukan untuk kepala sekolah).
function notifikasiAIGagalDeveloper(pengirim, namaAnak, pesan, error) {
  const detail = String(error?.message || error || 'Kesalahan tidak diketahui').slice(0, 500);
  const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'medium' });
  return [
    salam(), '',
    '🚨 *[DEVELOPER] Gemini Error di Webhook*',
    '',
    `🏫 *Sekolah ID:* ${K().sekolahId || '-'}`,
    `🕒 *Waktu:* ${waktu} WIB`,
    `👤 *Pengirim:* ${pengirim || '-'}`,
    `👧 *Anak:* ${namaAnak || '-'}`,
    `💬 *Pesan:* "${String(pesan || '').slice(0, 300)}"`,
    '',
    `🔧 *Error:* ${detail}`,
    '',
    'Absensi tidak diubah otomatis. Pesan perlu dicek manual.',
    '', penutup()
  ].join('\n');
}

async function notifikasiGangguanKeyDeveloper(daftar, pengirim, namaAnak) {
  if (!NOMOR_DEVELOPER.length) {
    console.warn('DEV_WA belum diisi/valid: laporan gangguan API Key dilewati');
    return;
  }
  const sk = await sb(`sekolah?id=eq.${K().sekolahId}&select=nama`).catch(() => []);
  const namaSekolah = sk?.[0]?.nama || ('Sekolah ID ' + K().sekolahId);
  for (const x of daftar || []) {
    if (!x.perluNotifikasi) continue;
    const waktu = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'medium' });
    const teks = [
      salam(), '',
      '🚨 *[DEVELOPER] Gangguan API Key Gemini Sekolah*', '',
      `🏫 *Sekolah:* ${namaSekolah}`,
      `🔑 *Nama API Key:* ${x.label || 'Tidak diketahui'}`,
      `🧾 *Kode error:* ${x.kode || '-'} (${x.http_status || '-'})`,
      `🕒 *Waktu:* ${waktu} WIB`,
      `👤 *Pengirim:* ${pengirim || '-'}`,
      `👧 *Anak:* ${namaAnak || '-'}`,
      `🔧 *Detail:* ${String(x.detail || '').slice(0,500)}`, '',
      'Sistem akan mengalihkan percobaan ke API Key lain jika tersedia. Mohon periksa akun Gemini tersebut di menu Pemantauan AI.',
      '', penutup()
    ].join('\n');
    const batch = crypto.randomUUID();
    await Promise.allSettled(NOMOR_DEVELOPER.map(n =>
      kirimDanCatat(n, teks, { batch, judul: 'Gangguan API Key Gemini', label: x.label || 'API Key', olehDev: true })
    ));
  }
}

// Mengirim notifikasi ragu ke wali kelas dari anak yang dimaksud (hanya jika kelasnya punya wali).
// Wali harus anggota aktif sekolah ini, profil aktif, dan punya nomor WhatsApp valid.
// Gagal di sini TIDAK boleh mengganggu alur utama.
// Kirim satu pesan lewat Fonnte (langsung atau terjadwal) dan catat ke kirim_log supaya statusnya
// (terjadwal/terkirim/sampai/terbaca/gagal) muncul di menu Pesan WA dan diperbarui status-kirim.js.
// Gagal mencatat TIDAK boleh menggagalkan pengiriman. Mengembalikan true bila Fonnte menerima pesan.
async function kirimDanCatat(target, teks, lg) {
  const hasil = await kirimFonnteRinci(target, teks, lg.jadwal);
  try {
    const c = K();
    if (c.sekolahId) {
      await sb('kirim_log', {
        method: 'POST',
        prefer: 'return=minimal',
        body: {
          sekolah_id: c.sekolahId,
          batch_id: lg.batch,
          oleh_developer: !!lg.olehDev, // true = tersembunyi dari staf sekolah
          jenis: 'lainnya',
          judul: String(lg.judul || '').slice(0, 120),
          label: String(lg.label || '').slice(0, 120),
          nomor: String(target || '').replace(/\D/g, '').slice(0, 20) || '-',
          fonnte_id: hasil.id,
          status: hasil.ok ? 'terjadwal' : 'gagal',
          error: hasil.ok ? null : String(hasil.error || '').slice(0, 300),
          jadwal_pada: hasil.ok && lg.jadwal ? new Date(lg.jadwal * 1000).toISOString() : null
        }
      });
    }
  } catch (e) {
    console.error('Catat riwayat kirim gagal:', e && e.message);
  }
  return hasil.ok;
}

const jedaAcak = () => JEDA_MIN + Math.floor(Math.random() * (JEDA_MAX - JEDA_MIN + 1));

// Mengirim notifikasi ragu ke wali kelas dari anak yang dimaksud (hanya jika kelasnya punya wali).
// Wali harus anggota aktif sekolah ini, profil aktif, dan punya nomor WhatsApp valid.
// Gagal di sini TIDAK boleh mengganggu alur utama.
async function kirimKeWaliKelas(anakTerkait, teks, nomorKepala, batch) {
  try {
    const sekolahId = K().sekolahId;
    const kelasIds = [...new Set((anakTerkait || [])
      .map(s => Number(s && s.kelas_id))
      .filter(n => Number.isInteger(n) && n > 0))];
    if (!sekolahId || !kelasIds.length) return;

    const kelas = (await sb(`kelas?sekolah_id=eq.${sekolahId}&id=in.(${kelasIds.join(',')})&select=id,nama,wali_profil_id`)) || [];
    const waliIds = [...new Set(kelas.map(k => k.wali_profil_id).filter(x => x && RE_UUID.test(String(x))))];
    if (!waliIds.length) return; // kelas belum punya wali

    const ang = (await sb(`keanggotaan?sekolah_id=eq.${sekolahId}&aktif=eq.true&profil_id=in.(${waliIds.join(',')})&select=profil_id`)) || [];
    const aktifIds = [...new Set(ang.map(a => a.profil_id).filter(x => RE_UUID.test(String(x))))];
    if (!aktifIds.length) return;

    const prof = (await sb(`profil?id=in.(${aktifIds.join(',')})&aktif=eq.true&select=id,nama,no_wa`)) || [];
    const sudah = new Set([normDevice(nomorKepala)]); // kepala sudah menerima, hindari pesan dobel
    const tujuan = [];
    for (const p of prof) {
      const n = normDevice(p.no_wa);
      if (!RE_WA.test(n) || sudah.has(n)) continue;
      sudah.add(n);
      const namaKelas = kelas.filter(k => k.wali_profil_id === p.id).map(k => k.nama).join(', ');
      tujuan.push({ label: `${p.nama || n} (wali ${namaKelas || 'kelas'})`, nomor: n });
    }
    // Jeda: wali kelas pertama 30-60 detik dari sekarang (setelah pesan kepala), berikutnya
    // 30-60 detik setelah wali sebelumnya. Dijadwalkan di Fonnte, server tidak menunggu.
    let waktu = Math.floor(Date.now() / 1000);
    tujuan.forEach(t => { waktu += jedaAcak(); t.waktu = waktu; });
    const hasil = await Promise.allSettled(tujuan.map(t =>
      kirimDanCatat(t.nomor, teks, { jadwal: t.waktu, batch, judul: 'Notifikasi ragu', label: t.label })));
    hasil.forEach((h, i) => {
      if (h.status !== 'fulfilled' || h.value !== true) console.error('Gagal kirim notifikasi ragu ke wali kelas:', tujuan[i].label);
    });
  } catch (e) {
    console.error('Notifikasi ragu ke wali kelas error:', e && e.message);
  }
}

async function notifikasiKeKepala(dari, nama, pesan, jenis = 'ragu', error = null, opsi = {}) {
  const nomorKepala = K().nomorKepala;
  const batch = crypto.randomUUID();

  if (jenis === 'ai_error') {
    // Developer diberi tahu lebih dulu. Catatan "sudah diinformasikan" hanya dicantumkan
    // di pesan kepala sekolah bila pesan ke developer benar-benar diterima Fonnte.
    let devDiberitahu = false;
    if (NOMOR_DEVELOPER.length) {
      const teksDev = notifikasiAIGagalDeveloper(dari, nama, pesan, error);
      const hasil = await Promise.allSettled(NOMOR_DEVELOPER.map(n =>
        kirimDanCatat(n, teksDev, { batch, judul: 'Gemini error', label: 'Developer', olehDev: true })));
      devDiberitahu = hasil.some(h => h.status === 'fulfilled' && h.value === true);
      if (!devDiberitahu) console.error('Gagal kirim notifikasi Gemini error ke developer');
    } else {
      console.warn('DEV_WA belum diisi/valid: notifikasi Gemini error ke developer dilewati');
    }
    if (nomorKepala) {
      // Pesan kepala dijadwalkan 30-60 detik setelah pesan developer (nomor sama atau beda),
      // supaya tidak masuk bersamaan. Bila developer tidak dikirimi, tidak perlu jeda.
      const jadwal = NOMOR_DEVELOPER.length ? Math.floor(Date.now() / 1000) + jedaAcak() : undefined;
      await kirimDanCatat(nomor(nomorKepala), notifikasiAIGagal(dari, nama, pesan, error, devDiberitahu),
        { jadwal, batch, judul: 'Gemini error', label: 'Kepala Sekolah' });
    }
    return;
  }

  const teks = notifikasiRagu(dari, nama, pesan, opsi);
  if (nomorKepala) await kirimDanCatat(nomor(nomorKepala), teks, { batch, judul: 'Notifikasi ragu', label: 'Kepala Sekolah' });
  // Ragu untuk kepala sekolah (waktu, izin panjang, maksud tidak jelas) juga ke wali kelas.
  await kirimKeWaliKelas(opsi.anakTerkait, teks, nomorKepala, batch);
}

// Notifikasi "ragu" (aturan sama untuk grup dan chat pribadi):
// - Ragu karena NAMA BERBEDA, atau ANAK TIDAK JELAS (anak lebih dari satu tetapi nama tidak disebut)
//   -> dibalas langsung ke tempat pesan masuk (grup PAUD jika dari grup, chat pribadi pengirim
//   jika dari chat pribadi). Kepala sekolah TIDAK diberi notifikasi untuk dua kasus ini.
// - Semua ragu lainnya (maksud/waktu tidak jelas, izin terlalu panjang)
//   -> dikirim ke kepala sekolah saja.
function balasanMintaNamaAnak(daftar) {
  return bungkusBalasan([
    'Mohon maaf, Bunda. Kami belum bisa memastikan anak mana yang dimaksud pada pesan Bunda, sehingga laporan belum dicatat. 🙏',
    `👧 *Anak terdaftar di nomor ini:* ${daftar || '-'}`,
    'Mohon kirim kembali pesannya dengan menyebutkan nama anak sesuai data di atas. 😊'
  ]);
}

// Bagian pesan untuk nama yang tidak cocok dengan data terdaftar. Ragam (mode):
// - 'semua'    : semua nama di pesan salah, tidak ada yang dicatat.
// - 'sebagian' : sebagian nama cocok dan SUDAH dicatat; hanya nama yang salah ditolak.
// - 'netral'   : anak yang cocok BELUM dicatat (tanggal/waktu perlu dicek atau sudah lampau).
//                Jika namaCocok diisi, wali diberi tahu laporan anak tersebut sedang diperiksa.
function bagianNamaSalah(namaSalah, daftar, mode = 'semua', namaCocok = '') {
  const n = (namaSalah || []).filter(Boolean).join(', ') || '-';
  const akhiran = mode === 'sebagian' ? ' untuk nama tersebut' : '';
  const baris = [
    `Mohon maaf, Bunda. Nama *${n}* pada pesan Bunda tidak sesuai dengan data anak yang terdaftar, sehingga${mode === 'netral' ? '' : ' laporan'}${akhiran} belum dicatat. 🙏`
  ];
  if (mode === 'netral' && namaCocok) baris.push('', `Laporan untuk *${namaCocok}* sedang kami periksa terlebih dahulu.`);
  baris.push(
    '',
    `👧 *Anak terdaftar di nomor ini:* ${daftar || '-'}`,
    '',
    mode === 'semua'
      ? 'Mohon kirim kembali pesannya dengan menyebutkan nama anak sesuai data di atas. 😊'
      : 'Mohon kirim kembali laporannya untuk anak yang dimaksud dengan nama sesuai data di atas. 😊'
  );
  return baris.join('\n');
}

function balasanNamaBeda(namaSalah, daftar) {
  return bungkusBalasan([bagianNamaSalah(namaSalah, daftar, 'semua')]);
}

async function kirimRagu(target, dari, nama, pesan, opsi = {}) {
  if (opsi.namaBeda) {
    K().namaAnak = opsi.namaTerdaftar || nama || '';
    // Ke grup/chat pribadi: isi pesan asli TIDAK ditampilkan.
    await kirimBalasanWali(target, balasanNamaBeda(opsi.namaSalah || opsi.namaDiPesan, opsi.namaTerdaftar || nama), opsi.bahasa);
  } else if (opsi.alasanRagu === 'anak_tidak_jelas') {
    K().namaAnak = 'Anak belum teridentifikasi';
    await kirimBalasanWali(target, balasanMintaNamaAnak(opsi.namaTerdaftar), opsi.bahasa);
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
  ctx.pengirim = dari;
  ctx.dariGrup = !!groupId;

  // 2. Hanya nomor wali terdaftar yang boleh diproses.
  if (!dari) return;
  const anak = await cariAnak(dari);
  if (!anak.length) return;

  // Pesan grup tanpa indikasi izin/sakit/ketidakhadiran berhenti di sini tanpa Gemini.
  // Pesan pribadi tidak melewati filter ini dan tetap memakai alur lama.
  if (ctx.dariGrup && !adaPemicuPesanGrup(pesan)) {
    console.log('Pesan grup tanpa pemicu absensi diabaikan tanpa AI');
    return;
  }

  // 3. Anti-duplikat: nomor + isi pesan sama dalam 5 menit -> diabaikan total.
  const replay = b.__ai_retry_replay === true;
  const kunci = replay ? String(b.__ai_dedup_key || kunciDuplikat(dari,pesan)) : kunciDuplikat(dari,pesan);
  if (!replay && !(await klaimPesan(kunci))) {
    console.log('Pesan duplikat diabaikan');
    return;
  }

  try {
    await prosesPesan({ pesan, dari, target, anak, kunci, payload: b });
    if (replay && K().antrianId) {
      const q = await sb(`pesan_ai_antrean?id=eq.${Number(K().antrianId)}&sekolah_id=eq.${K().sekolahId}&select=status`);
      if (q?.[0]?.status === 'diproses') {
        await sb(`pesan_ai_antrean?id=eq.${Number(K().antrianId)}&sekolah_id=eq.${K().sekolahId}`, { method: 'DELETE', prefer: 'return=minimal' });
      }
    }
  } catch (e) {
    if (!replay) await lepasKlaim(kunci);
    throw e;
  }
}

function payloadUntukAntrean(b, pesan) {
  const x = b || {};
  return {
    message: String(pesan || ''),
    sender: x.sender || '',
    member: x.member || '',
    group_id: x.group_id || '',
    groupId: x.groupId || '',
    chat_id: x.chat_id || '',
    chatId: x.chatId || '',
    device: x.device || ''
  };
}

async function bacaStatusGangguanAI() {
  const rows = await sb(`gemini_pengaman_sekolah?sekolah_id=eq.${K().sekolahId}&model=eq.gemini-3.5-flash-lite&select=status_gangguan,next_retry_at,gangguan_mulai,developer_notified_at,sekolah_notified_at`);
  return Array.isArray(rows) && rows[0] ? rows[0] : { status_gangguan: 'normal' };
}

function hanyaGangguanGuardSingkat(error) {
  const a=Array.isArray(error?.attempts)?error.attempts:[];
  return a.length>0&&a.every(x=>{
    const kode=String(x.kode||'');
    return kode==='GEMINI_GUARD_BATAS_LOKAL_PER_MENIT' ||
      kode==='GEMINI_GUARD_JEDA_ANTAR_PERMINTAAN' ||
      (kode==='GEMINI_GUARD_COOLDOWN'&&Number(x.retry_after_seconds||0)<=60);
  });
}

async function simpanAntrianAI({ pesan, dari, payload, kunci, error, cobaLagiPada }) {
  const sekolahId = Number(K().sekolahId);
  const hanyaGuardLokal = hanyaGangguanGuardSingkat(error);
  const jedaMenit = hanyaGuardLokal ? 1 : 15;
  const isi = {
    sekolah_id: sekolahId,
    kunci_duplikat: String(kunci || kunciDuplikat(dari,pesan)),
    payload: payloadUntukAntrean(payload,pesan),
    dari_nomor: String(dari || ''),
    isi: String(pesan || ''),
    status: 'menunggu',
    coba_lagi_pada: cobaLagiPada || new Date(Date.now()+jedaMenit*60000).toISOString(),
    klaim_sampai: null,
    error_terakhir: error ? String(error.message || error).slice(0,1000) : null,
    diperbarui: new Date().toISOString()
  };
  if (K().antrianId) {
    await sb(`pesan_ai_antrean?id=eq.${Number(K().antrianId)}&sekolah_id=eq.${sekolahId}`, {
      method: 'PATCH', body: isi, prefer: 'return=minimal'
    });
    return Number(K().antrianId);
  }
  const rows = await sb('pesan_ai_antrean?on_conflict=sekolah_id,kunci_duplikat', {
    method: 'POST', body: isi, prefer: 'resolution=merge-duplicates,return=representation'
  });
  return Number(rows?.[0]?.id) || null;
}

async function kirimNotifikasiGangguanSekolah(sementara, detail) {
  const sekolahId = Number(K().sekolahId), batch = crypto.randomUUID();
  const sk = await sb(`sekolah?id=eq.${sekolahId}&select=nama`).catch(()=>[]);
  const namaSekolah = sk?.[0]?.nama || 'Sekolah';
  const teks = [
    salam(), '',
    sementara ? '⚠️ *PEMBERITAHUAN GANGGUAN SEMENTARA AI*' : '🚨 *PEMBERITAHUAN GANGGUAN LAYANAN AI*',
    '',
    `Layanan AI sekolah *${namaSekolah}* saat ini belum dapat digunakan karena seluruh akun Gemini mengalami kendala.`,
    '',
    'Untuk sementara, pengelola, kepala sekolah, dan wali kelas dimohon melakukan pencatatan absensi secara manual.',
    '',
    sementara
      ? hanyaGangguanGuardSingkat(detail)
          ? 'Sistem sedang membatasi lonjakan permintaan secara otomatis. Percobaan ulang berikutnya dijadwalkan sekitar 1 menit lagi.'
          : 'Gangguan terdeteksi bersifat sementara. Sistem akan mencoba kembali secara otomatis sekitar 15 menit ke depan. Waktu pemulihan dapat berubah mengikuti kondisi layanan Gemini.')
      : 'Gangguan memerlukan pemeriksaan developer. Developer sudah diberi tahu dan sedang menangani. Kami akan mengirim pemberitahuan kembali setelah perbaikan diuji dan layanan normal.',
    '',
    'Pesan WhatsApp yang masuk tetap disimpan dalam antrean dan akan diproses setelah AI kembali tersedia.',
    '', penutup()
  ].join('\n');

  const tujuan = new Map();
  const anggota = await sb(`keanggotaan?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=profil_id,role,profil(nama,no_wa,aktif,role)`).catch(()=>[]);
  for (const a of anggota || []) {
    const p = Array.isArray(a.profil) ? a.profil[0] : a.profil;
    const role = String(a.role || '');
    if (role !== 'kepala_sekolah' && role !== 'pengelola' && p?.role !== 'pengelola') continue;
    const n = normDevice(p?.no_wa);
    if (p?.aktif !== false && RE_WA.test(n)) tujuan.set(n,{nomor:n,label:p?.nama || role || 'Pengelola'});
  }
  const kelas = await sb(`kelas?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=id,nama,wali_profil_id`).catch(()=>[]);
  const waliIds = [...new Set((kelas||[]).map(x=>x.wali_profil_id).filter(x=>RE_UUID.test(String(x||''))))];
  if (waliIds.length) {
    const ang = await sb(`keanggotaan?sekolah_id=eq.${sekolahId}&aktif=eq.true&profil_id=in.(${waliIds.join(',')})&select=profil_id`).catch(()=>[]);
    const ids = [...new Set((ang||[]).map(x=>x.profil_id))];
    if (ids.length) {
      const prof = await sb(`profil?id=in.(${ids.join(',')})&aktif=eq.true&select=id,nama,no_wa`).catch(()=>[]);
      for (const p of prof || []) {
        const n = normDevice(p.no_wa);
        if (RE_WA.test(n) && !tujuan.has(n)) {
          const namaKelas = (kelas||[]).filter(k=>k.wali_profil_id===p.id).map(k=>k.nama).join(', ');
          tujuan.set(n,{nomor:n,label:(p.nama||n)+' (wali '+(namaKelas||'kelas')+')'});
        }
      }
    }
  }
  const kepala = normDevice(K().nomorKepala);
  if (RE_WA.test(kepala)) tujuan.set(kepala,{nomor:kepala,label:'Kepala Sekolah'});
  let waktu = Math.floor(Date.now()/1000);
  const daftar = [...tujuan.values()];
  const hasil = await Promise.allSettled(daftar.map(t=>{
    waktu += jedaAcak();
    return kirimDanCatat(t.nomor,teks,{jadwal:waktu,batch,judul:'Gangguan AI sekolah',label:t.label});
  }));
  hasil.forEach((h,i)=>{if(h.status!=='fulfilled'||h.value!==true)console.error('Notifikasi gangguan AI gagal ke:',daftar[i].label)});
  return true;
}

async function kirimNotifikasiAIKembaliNormal() {
  const sekolahId=Number(K().sekolahId),batch=crypto.randomUUID();
  const sk=await sb(`sekolah?id=eq.${sekolahId}&select=nama`).catch(()=>[]);
  const teks=[
    salam(),'','✅ *PEMBERITAHUAN: LAYANAN AI KEMBALI NORMAL*','',
    `Layanan Gemini sekolah *${sk?.[0]?.nama||'Sekolah'}* telah berhasil diuji dan dapat digunakan kembali.`,
    '',
    'Pesan absensi yang sempat tertunda sedang/akan diproses kembali oleh sistem. Pencatatan absensi manual dapat dihentikan setelah guru memastikan data yang diperlukan sudah lengkap.',
    '',penutup()
  ].join('\n');
  const tujuan=new Map();
  const anggota=await sb(`keanggotaan?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=profil_id,role,profil(nama,no_wa,aktif,role)`).catch(()=>[]);
  for(const a of anggota||[]){const p=Array.isArray(a.profil)?a.profil[0]:a.profil;const role=String(a.role||'');if(role!=='kepala_sekolah'&&role!=='pengelola'&&p?.role!=='pengelola')continue;const n=normDevice(p?.no_wa);if(p?.aktif!==false&&RE_WA.test(n))tujuan.set(n,{nomor:n,label:p?.nama||role||'Pengelola'})}
  const kelas=await sb(`kelas?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=wali_profil_id,nama`).catch(()=>[]);
  const wali=[...new Set((kelas||[]).map(x=>x.wali_profil_id).filter(x=>RE_UUID.test(String(x||''))))];
  if(wali.length){const ang=await sb(`keanggotaan?sekolah_id=eq.${sekolahId}&aktif=eq.true&profil_id=in.(${wali.join(',')})&select=profil_id`).catch(()=>[]);const ids=[...new Set((ang||[]).map(x=>x.profil_id))];if(ids.length){const ps=await sb(`profil?id=in.(${ids.join(',')})&aktif=eq.true&select=id,nama,no_wa`).catch(()=>[]);for(const p of ps||[]){const n=normDevice(p.no_wa);if(RE_WA.test(n)&&!tujuan.has(n))tujuan.set(n,{nomor:n,label:p.nama||n})}}}
  const kepala=normDevice(K().nomorKepala);if(RE_WA.test(kepala))tujuan.set(kepala,{nomor:kepala,label:'Kepala Sekolah'});
  let waktu=Math.floor(Date.now()/1000);const daftar=[...tujuan.values()];
  await Promise.allSettled(daftar.map(t=>{waktu+=jedaAcak();return kirimDanCatat(t.nomor,teks,{jadwal:waktu,batch,judul:'AI kembali normal',label:t.label})}));
}

async function perbaruiStatusGangguanAI(error) {
  const sebelum=await bacaStatusGangguanAI();
  const permanen=error?.permanen===true || (Array.isArray(error?.attempts)&&error.attempts.some(x=>x.permanen));
  const statusBaru=permanen?'perlu_developer':'gangguan_sementara';
  const statusLama=sebelum.status_gangguan||'normal';
  const naikKePermanen=statusLama==='gangguan_sementara'&&permanen;
  const statusSimpan=statusLama==='perlu_developer'?'perlu_developer':statusBaru;
  const body={
    status_gangguan:statusSimpan,
    gangguan_mulai:sebelum.gangguan_mulai||new Date().toISOString(),
    detail_gangguan:{attempts:error?.attempts||[],kode:error?.code||'AI_REQUEST_FAILED',sementara:!!error?.semuaSementara},
    diperbarui:new Date().toISOString()
  };
  await sb(`gemini_pengaman_sekolah?sekolah_id=eq.${K().sekolahId}&model=eq.gemini-3.5-flash-lite`,{method:'PATCH',body,prefer:'return=minimal'});
  const baru=statusLama==='normal';
  // Jadwal bersifat satu kali dan dibuat ulang hanya setelah percobaan gagal.
  const hanyaGuardLokal=hanyaGangguanGuardSingkat(error);
  await sb('rpc/gemini_jadwalkan_retry',{method:'POST',body:{p_sekolah_id:Number(K().sekolahId),p_delay_menit:hanyaGuardLokal?0:15}})
    .catch(e=>console.error('Jadwal uji ulang Gemini gagal:',e.message));
  return {baru,naikKePermanen,permanen};
}

async function prosesPesan({ pesan, dari, target, anak, kunci, payload }) {
  // 4. Deteksi cepat hanya untuk kalimat yang cukup aman. SAKIT tetap menang atas IZIN.
  // Jika ada kata yang bukan nama anak terdaftar dan bukan kata umum (kemungkinan nama anak lain
  // atau nama salah), pesan diserahkan ke AI supaya nama dibandingkan dengan data terdaftar.
  const cepat = adaNamaAsing(pesan, anak) ? null : deteksiCepat(pesan);
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

  // 5. Jika sekolah sedang dalam status gangguan, jangan panggil Gemini lagi.
  // Pesan disimpan agar diproses setelah uji pemulihan berhasil.
  const statusGangguan = await bacaStatusGangguanAI();
  if (statusGangguan.status_gangguan !== 'normal' &&
      (!statusGangguan.next_retry_at || Date.now() < new Date(statusGangguan.next_retry_at).getTime())) {
    await simpanAntrianAI({ pesan, dari, payload, kunci, cobaLagiPada: statusGangguan.next_retry_at || null });
    return;
  }

  // 6. Bahasa bebas/ambigu masuk ke AI.js dengan rotasi API Key.
  let hasilAI;
  try {
    const daftarKunciAi = await ambilKunciAiRotasi();
    hasilAI = await analisisPesan({ pesan, anak, tanggalHariIni: tanggal(), kunciAi: daftarKunciAi, catatPemakaian: catatPemakaianAI, pengamanGemini });
    if (Array.isArray(hasilAI.gangguanApiKeys) && hasilAI.gangguanApiKeys.length) {
      await notifikasiGangguanKeyDeveloper(hasilAI.gangguanApiKeys, dari, anak.length === 1 ? anak[0].nama : 'Belum berhasil diidentifikasi')
        .catch(e => console.error('Pemberitahuan gangguan API Key ke developer gagal:', e.message || e));
    }
  } catch (e) {
    // Kegagalan seluruh akun tidak boleh mengubah absensi. Simpan pesan ke antrean.
    console.error('AI error:', e);
    const nama = anak.length === 1 ? (anak[0].nama || anak[0].nama_panggilan) : 'Belum berhasil diidentifikasi';
    if (e && e.isGeminiFailover) {
      await simpanAntrianAI({ pesan, dari, payload, kunci, error: e }).catch(err => console.error('Gagal menyimpan antrean AI:', err.message));
      const status = await perbaruiStatusGangguanAI(e).catch(err => {
        console.error('Gagal memperbarui status gangguan AI:', err.message);
        return { baru: false, permanen: !!e.permanen };
      });
      let keyBermasalah = (e.attempts || []).filter(x => x.perluNotifikasi);
      if (!keyBermasalah.length && !e.semuaSementara) {
        keyBermasalah = [{
          label: 'Konfigurasi AI sekolah', kode: e.code || 'AI_CONFIGURATION_ERROR',
          http_status: null, detail: e.message || 'Konfigurasi seluruh API Key perlu diperiksa',
          perluNotifikasi: true
        }];
      }
      if (keyBermasalah.length) {
        await notifikasiGangguanKeyDeveloper(keyBermasalah, dari, nama)
          .catch(err => console.error('Gagal melaporkan error API Key ke developer:', err.message));
        await sb(`gemini_pengaman_sekolah?sekolah_id=eq.${K().sekolahId}&model=eq.gemini-3.5-flash-lite`,{
          method:'PATCH',body:{developer_notified_at:new Date().toISOString()},prefer:'return=minimal'
        }).catch(()=>{});
      }
      if (status.baru || status.naikKePermanen) {
        await kirimNotifikasiGangguanSekolah(!!e.semuaSementara && !status.naikKePermanen, e)
          .then(async()=>sb(`gemini_pengaman_sekolah?sekolah_id=eq.${K().sekolahId}&model=eq.gemini-3.5-flash-lite`,{
            method:'PATCH',body:{sekolah_notified_at:new Date().toISOString()},prefer:'return=minimal'
          }))
          .catch(err=>console.error('Gagal mengirim pemberitahuan gangguan sekolah:',err.message));
      }
      return;
    }

    await lepasKlaim(kunci);
    await catatPesan(dari, pesan, 'Gemini error - belum dianalisis, perlu pengecekan manual', true).catch(() => {});
    await notifikasiKeKepala(dari, nama, pesan, 'ai_error', e).catch(err => console.error('Gagal notifikasi AI error:', err));
    return;
  }

  if (hasilAI.kategori === 'bukan_izin_sakit') {
    await catatPesan(dari, pesan, 'Bukan izin/sakit', false);
    return;
  }

  if (hasilAI.kategori === 'ragu' || (hasilAI.nama_beda && !hasilAI.nama_sebagian)) {
    // Nama anak SELALU dari data terdaftar di nomor pengirim, bukan dari isi pesan.
    const nama = hasilAI.nama_anak
      || (anak.length === 1 ? anak[0].nama : '')
      || 'Belum berhasil diidentifikasi';
    const catatan = hasilAI.nama_beda
      ? `Ragu: nama di pesan (${(hasilAI.nama_di_pesan || []).join(' | ')}) berbeda dengan anak terdaftar (${nama})`
      : (hasilAI.alasan_ragu === 'anak_tidak_jelas'
        ? 'Ragu: anak tidak jelas, wali diminta mengirim ulang dengan menyebut nama'
        : 'Ragu: perlu pengecekan guru');
    await catatPesan(dari, pesan, catatan.slice(0, 300), true);
    // Anak yang dimaksud (untuk mencari wali kelas): pilihan AI, lalu nama di pesan, lalu semua anak di nomor ini.
    const idAI = (hasilAI.siswa_ids || []).map(String);
    let anakTerkait = anak.filter(s => idAI.includes(String(s.id)));
    if (!anakTerkait.length) anakTerkait = cariAnakDariNama(pesan, anak);
    if (!anakTerkait.length) anakTerkait = anak;
    await kirimRagu(target, dari, nama, pesan, {
      anakTerkait,
      namaDiPesan: hasilAI.nama_di_pesan || [],
      namaBeda: !!hasilAI.nama_beda,
      statusDugaan: hasilAI.status_dugaan || '',
      bahasa: hasilAI.bahasa,
      namaTerdaftar: daftarNama(anak),
      namaSalah: hasilAI.nama_tidak_cocok || [],
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
      namaTerdaftar: daftarNama(anak),
      bahasa: hasilAI.bahasa,
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
    bahasa: hasilAI.bahasa,
    // Sebagian nama cocok: yang cocok dicatat, yang salah ditolak dalam pesan yang sama.
    namaSalah: hasilAI.nama_beda ? (hasilAI.nama_tidak_cocok || []) : [],
    namaTerdaftar: daftarNama(anak)
  });
}

// Mencari sekolah dari kunci di alamat Webhook, lalu memuat konfigurasinya.
async function cariSekolah(kunci) {
  if (!kunci) return null;
  let id = null, r = null;
  const rows = await sb(`pengaturan_rahasia?webhook_kunci=eq.${encodeURIComponent(kunci)}&select=*`);
  if (Array.isArray(rows) && rows[0]) { r = rows[0]; id = r.sekolah_id; }
  if (!id) return null;

  const sk = await sb(`sekolah?id=eq.${id}&select=status`);
  if (!Array.isArray(sk) || !sk[0] || sk[0].status !== 'aktif') return { nonaktif: true, sekolahId: id };

  const [tk, gp] = await Promise.all([
    sb(`fonnte_token?sekolah_id=eq.${id}&select=id,label,token,perangkat&order=id.asc`),
    sb(`grup_wa?sekolah_id=eq.${id}&select=grup_id,token_id`)
  ]);
  const tokens = Array.isArray(tk) ? tk : [];
  const grup = Array.isArray(gp) ? gp : [];
  return {
    sekolahId: id,
    tokens,
    grup,
    tokenFonnte: (tokens[0] && tokens[0].token) || '',
    kunciAi: r.kunci_ai || '',
    nomorKepala: r.nomor_kepala || ''
  };
}

// [STATUS KIRIM] Apakah ini KABAR STATUS pesan keluar dari Fonnte (bukan pesan masuk dari wali)?
// Ya hanya bila TIDAK ada isi pesan, TIDAK ada pengirim, dan ada id/stateid. Pesan biasa tidak
// pernah memenuhi syarat ini sehingga alur di bawahnya tidak berubah sama sekali.
function adalKabarStatus(b) {
  try {
    if (!b || typeof b !== 'object') return false;
    const k = {};
    for (const x of Object.keys(b)) k[String(x).toLowerCase()] = b[x];
    if (String(k.message || k.text || '').trim()) return false;
    if (k.sender) return false;
    return Boolean(k.stateid || (k.id && k.status !== undefined));
  } catch (e) { return false; }
}

async function prosesAntrianAI() {
  const sekolahId=Number(K().sekolahId);
  const statusAwal=await bacaStatusGangguanAI();
  if(statusAwal.status_gangguan==='normal') return {diproses:0,tersisa:0,status:'normal'};

  const sekarang=new Date().toISOString();
  // Pulihkan klaim yang tertinggal bila eksekusi sebelumnya terhenti.
  await sb(`pesan_ai_antrean?sekolah_id=eq.${sekolahId}&status=eq.diproses&klaim_sampai=lt.${encodeURIComponent(sekarang)}`,{
    method:'PATCH',body:{status:'menunggu',klaim_sampai:null,diperbarui:sekarang},prefer:'return=minimal'
  }).catch(()=>{});

  const rows=await sb(`pesan_ai_antrean?sekolah_id=eq.${sekolahId}&status=eq.menunggu&coba_lagi_pada=lte.${encodeURIComponent(sekarang)}&order=dibuat.asc&limit=1`);
  let diproses=0,macet=false;
  for(const row of rows||[]){
    const klaim=await sb(`pesan_ai_antrean?id=eq.${row.id}&sekolah_id=eq.${sekolahId}&status=eq.menunggu`,{
      method:'PATCH',
      body:{status:'diproses',klaim_sampai:new Date(Date.now()+120000).toISOString(),jumlah_percobaan:(Number(row.jumlah_percobaan)||0)+1,diperbarui:new Date().toISOString()},
      prefer:'return=representation'
    });
    if(!Array.isArray(klaim)||!klaim.length)continue;
    K().antrianId=Number(row.id);
    try {
      const payload={...(row.payload||{}),__ai_retry_replay:true,__ai_dedup_key:row.kunci_duplikat};
      await proses(payload);
      const cek=await sb(`pesan_ai_antrean?id=eq.${row.id}&sekolah_id=eq.${sekolahId}&select=status`);
      if(!Array.isArray(cek)||!cek.length) {
        diproses++;
      } else if(cek[0].status==='diproses') {
        await sb(`pesan_ai_antrean?id=eq.${row.id}&sekolah_id=eq.${sekolahId}`,{method:'DELETE',prefer:'return=minimal'});
        diproses++;
      } else {macet=true;break;}
    } catch(e) {
      await sb(`pesan_ai_antrean?id=eq.${row.id}&sekolah_id=eq.${sekolahId}`,{
        method:'PATCH',body:{status:'menunggu',klaim_sampai:null,coba_lagi_pada:new Date(Date.now()+15*60000).toISOString(),error_terakhir:String(e?.message||e).slice(0,1000),diperbarui:new Date().toISOString()},prefer:'return=minimal'
      }).catch(()=>{});
      macet=true;break;
    } finally { K().antrianId=null; }
  }

  const sisa=await sb(`pesan_ai_antrean?sekolah_id=eq.${sekolahId}&select=id,status,coba_lagi_pada&limit=500`);
  if(Array.isArray(sisa)&&sisa.length){
    // Saat AI sudah berhasil, antrean dilanjutkan dengan pemanggilan satu kali berikutnya.
    // Ini bukan cron yang terus berjalan; job menghapus dirinya setelah setiap pemanggilan.
    const jedaMenit=diproses>0&&!macet?0:15;
    await sb('rpc/gemini_jadwalkan_retry',{method:'POST',body:{p_sekolah_id:sekolahId,p_delay_menit:jedaMenit}})
      .catch(e=>console.error('Jadwal antrean AI berikutnya gagal:',e.message));
    return {diproses,tersisa:sisa.length,status:'menunggu'};
  }

  // Bila tidak ada pesan tertunda, lakukan satu uji koneksi AI sebelum menyatakan normal.
  if(diproses===0){
    try{
      const keys=await ambilKunciAiRotasi();
      await analisisPesan({
        pesan:'Ini adalah pengujian koneksi AI internal, bukan laporan absensi.',
        anak:[{id:'uji-ai-internal',nama:'Uji Sistem',nama_panggilan:'Uji Sistem'}],
        tanggalHariIni:tanggal(),kunciAi:keys,catatPemakaian:catatPemakaianAI,pengamanGemini
      });
    }catch(e){
      if(e?.isGeminiFailover){
        const st=await perbaruiStatusGangguanAI(e).catch(()=>({}));
        const k=(e.attempts||[]).filter(x=>x.perluNotifikasi);
        if(k.length)await notifikasiGangguanKeyDeveloper(k,'Sistem','Uji pemulihan AI').catch(()=>{});
      }
      return {diproses,tersisa:0,status:'masih_gangguan'};
    }
  }

  await sb(`gemini_pengaman_sekolah?sekolah_id=eq.${sekolahId}&model=eq.gemini-3.5-flash-lite`,{
    method:'PATCH',body:{status_gangguan:'normal',next_retry_at:null,detail_gangguan:null,sekolah_notified_at:null,developer_notified_at:null,diperbarui:new Date().toISOString()},prefer:'return=minimal'
  });
  await kirimNotifikasiAIKembaliNormal().catch(e=>console.error('Pemberitahuan AI normal gagal:',e.message));
  return {diproses,tersisa:0,status:'normal'};
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

  // [STATUS KIRIM] Kabar status dialihkan ke status-kirim.js; pesan biasa lanjut seperti semula.
  if (adalKabarStatus(req.body)) {
    try { return await require('./status-kirim')(req, res); }
    catch (e) { console.error('Pengalihan status gagal:', e); return res.status(200).json({ ok: true }); }
  }

  let ctx;
  try { ctx = await cariSekolah(kunci); }
  catch (e) { console.error('Webhook: gagal memuat sekolah:', e); return res.status(200).json({ ok: false }); }
  if (!ctx) return res.status(401).send('Tidak diizinkan');
  if (ctx.nonaktif) return res.status(200).json({ ok: true });

  if (req.body && req.body.__ai_retry === true) {
    try {
      const hasil = await konteks.run(ctx, () => prosesAntrianAI());
      return res.status(200).json({ ok: true, retry_ai: true, hasil });
    } catch (e) {
      console.error('Retry antrean AI gagal:', e);
      return res.status(200).json({ ok: false, retry_ai: true });
    }
  }

  try { await konteks.run(ctx, () => proses(req.body || {})); }
  catch (e) { console.error('Webhook error:', e); }

  return res.status(200).json({ ok: true });
};

// Dipakai oleh cek-libur.js untuk menguji pembacaan tabel libur (tidak memengaruhi webhook).
module.exports._uji = { sb, ambilLibur, hariSekolah, formatTanggal, tanggal, tambahHari, indeksHari, NAMA_HARI };
