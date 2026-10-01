// Webhook Fonnte PAUD
// Memproses laporan izin/sakit dari chat pribadi dan GRUP PAUD.
// AI dipisahkan ke AI.js agar mudah diperbaiki tanpa mengubah alur utama.
//
// Variabel Vercel yang dibutuhkan:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FONNTE_TOKEN, WEBHOOK_SECRET

const { analisisPesan } = require('./AI');

// ============================================================
// KONFIGURASI WHATSAPP PAUD — MUDAH DIGANTI
// ============================================================
const PAUD_GROUP_ID = '120363410620341838@g.us';
const KEPALA_SEKOLAH_NUMBER = '6285117441486';

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FONNTE_TOKEN = process.env.FONNTE_TOKEN;
const WEBHOOK_SECRET = (process.env.WEBHOOK_SECRET || '').trim();

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
  if (!target || !FONNTE_TOKEN) return false;
  try {
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: FONNTE_TOKEN, 'Content-Type': 'application/x-www-form-urlencoded' },
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

function salam() { return 'Assalamu’alaikum warahmatullahi wabarakatuh.'; }
function penutup() { return 'Wassalamu’alaikum warahmatullahi wabarakatuh.'; }

function balasanSakit(nama) {
  return [salam(), '', `Baik, Bunda. Laporan bahwa *${nama}* hari ini sakit sudah kami terima dan telah dicatat. 🤒`, '', `Semoga *${nama}* segera diberikan kesembuhan, kesehatan, dan kekuatan, serta dapat kembali beraktivitas bersama teman-teman di sekolah. 🌷`, '', penutup()].join('\n');
}

function balasanIzin(nama) {
  return [salam(), '', `Baik, Bunda. Laporan izin untuk *${nama}* hari ini sudah kami terima dan telah dicatat. 📝`, '', `Semoga segala keperluan Bunda dan *${nama}* diberikan kelancaran, kemudahan, dan keberkahan. 🤲`, '', penutup()].join('\n');
}

function notifikasiRagu(pengirim, namaAnak, pesan, opsi = {}) {
  const { namaDiPesan = [], namaBeda = false, statusDugaan = '' } = opsi;
  const intro = namaBeda
    ? 'Sistem menerima pesan yang kemungkinan berkaitan dengan izin/sakit, tetapi nama anak yang tertulis di pesan *berbeda* dengan anak yang terdaftar di nomor pengirim. Absensi tidak diubah secara otomatis.'
    : 'Sistem menerima pesan yang kemungkinan berkaitan dengan izin/sakit, tetapi belum dapat memastikan maksudnya.';
  const baris = [
    salam(), '',
    '⚠️ *Pemberitahuan: Pesan Perlu Dicek*', '',
    intro, '',
    `👤 *Pengirim:* ${pengirim || '-'}`,
    `👧 *Nama anak${namaBeda ? ' (terdaftar di nomor ini)' : ''}:* *${namaAnak || 'Belum berhasil diidentifikasi'}*`
  ];
  if (namaBeda && namaDiPesan.length) baris.push(`📝 *Nama di pesan:* *${namaDiPesan.join(' | ')}*`);
  if (statusDugaan === 'sakit' || statusDugaan === 'izin') baris.push(`🔎 *Dugaan isi pesan:* ${statusDugaan}`);
  baris.push(
    `💬 *Pesan:* "${String(pesan || '').slice(0, 1000)}"`, '',
    namaBeda
      ? `Mohon perbaiki nama anak pada pesan sesuai data yang terdaftar: *${namaAnak || '-'}*. 🙏`
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
    `💬 *Pesan:* "${String(pesan || '').slice(0, 1000)}"`,
    '',
    '⚠️ Absensi belum diubah secara otomatis. Mohon dilakukan pengecekan dan pencatatan secara manual jika diperlukan. 🙏',
    '',
    `🔧 *Status sistem:* ${detail}`,
    '',
    penutup()
  ].join('\n');
}

function daftarNama(list) {
  const n = list.map(s => s.nama_panggilan || s.nama).filter(Boolean);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' dan ' + n[n.length - 1] : (n[0] || '');
}

function tanggal() {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
}

async function catatPesan(dari, isi, hasil, cek) {
  await sb('pesan_masuk', { method: 'POST', body: { dari_nomor: dari, isi, hasil, perlu_dicek: cek }, prefer: 'return=minimal' });
}

async function simpan(dari, pesan, anak, status, catatan) {
  const T = tanggal();
  const ids = anak.map(s => s.id).join(',');
  const ada = await sb(`absensi?tanggal=eq.${T}&siswa_id=in.(${ids})&select=siswa_id,status,jam_datang`);
  const sudahHadir = anak.filter(s => ada.some(a => a.siswa_id === s.id && a.status === 'hadir'));
  const ubah = anak.filter(s => !sudahHadir.includes(s));

  if (ubah.length) {
    const rows = ubah.map(s => ({
      siswa_id: s.id, tanggal: T, status, cara: 'whatsapp', jam_datang: null,
      catatan: (catatan || '').slice(0, 200), diubah: new Date().toISOString()
    }));
    await sb('absensi?on_conflict=siswa_id,tanggal', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
  }

  await catatPesan(
    dari,
    pesan,
    `${status}: ${daftarNama(ubah.length ? ubah : sudahHadir)}${sudahHadir.length ? ' (sebagian sudah hadir)' : ''}`,
    sudahHadir.length > 0
  );

  const namaBerubah = daftarNama(ubah);
  const namaHadir = daftarNama(sudahHadir);
  let balasan = '';

  if (namaBerubah) {
    balasan = status === 'sakit' ? balasanSakit(namaBerubah) : balasanIzin(namaBerubah);
  }

  if (namaHadir) {
    const tambahan = [
      salam(),
      '',
      `⚠️ *${namaHadir}* sudah tercatat hadir di sekolah, jadi data tidak diubah. Guru akan mengecek.`,
      '',
      penutup()
    ].join('\n');
    balasan = balasan ? `${balasan}\n\n${tambahan}` : tambahan;
  }

  return { balasan };
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

async function cariAnak(dari) {
  const wali = await sb(`wali?no_wa=eq.${encodeURIComponent(dari)}&select=id,no_wa,siswa_wali(siswa(id,nama,nama_panggilan,aktif))`);
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

function deteksiCepat(t) {
  if (ADA_LABEL_NAMA.test(t) || t.length > 300) return null;
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
  if (!KEPALA_SEKOLAH_NUMBER || KEPALA_SEKOLAH_NUMBER.includes('ISI_')) return;
  const teks = jenis === 'ai_error'
    ? notifikasiAIGagal(dari, nama, pesan, error)
    : notifikasiRagu(dari, nama, pesan, opsi);
  await kirimFonnte(nomor(KEPALA_SEKOLAH_NUMBER), teks);
}

// Notifikasi "ragu" (aturan sama untuk grup dan chat pribadi):
// - Ragu karena NAMA BERBEDA -> dibalas langsung ke tempat pesan masuk
//   (grup PAUD jika dari grup, chat pribadi pengirim jika dari chat pribadi).
// - Semua ragu lainnya (maksud/waktu tidak jelas, anak tidak teridentifikasi)
//   -> dikirim ke kepala sekolah saja.
async function kirimRagu(target, dari, nama, pesan, opsi = {}) {
  if (opsi.namaBeda) {
    await kirimFonnte(target, notifikasiRagu(dari, nama, pesan, opsi));
  } else {
    await notifikasiKeKepala(dari, nama, pesan, 'ragu', null, opsi);
  }
}

async function proses(b) {
  const pesan = String(b.message || b.text || '').trim();
  if (!pesan) return;

  const groupId = getGroupId(b);
  const dari = getPengirim(b);
  const target = getTargetBalasan(b);

  // 1. Jika payload menyatakan pesan berasal dari grup, hanya grup PAUD yang boleh masuk.
  if (groupId && groupId !== PAUD_GROUP_ID) return;

  // 2. Hanya nomor wali terdaftar yang boleh diproses.
  if (!dari) return;
  const anak = await cariAnak(dari);
  if (!anak.length) return;

  // 3. Deteksi cepat hanya untuk kalimat yang cukup aman. SAKIT tetap menang atas IZIN.
  const cepat = deteksiCepat(pesan);
  if (cepat) {
    let pilih = [];
    if (anak.length === 1) pilih = anak;
    else if (/\b(keduanya|semua|dua-duanya|duaduanya|semuanya)\b/i.test(pesan)) pilih = anak;
    else pilih = cariAnakDariNama(pesan, anak);

    if (pilih.length) {
      const hasil = await simpan(dari, pesan, pilih, cepat, pesan);
      if (hasil.balasan) await kirimFonnte(target, hasil.balasan);
      return;
    }
  }

  // 4. Bahasa bebas/ambigu masuk ke AI.js.
  let hasilAI;
  try {
    hasilAI = await analisisPesan({ pesan, anak, tanggalHariIni: tanggal() });
  } catch (e) {
    // Kegagalan Gemini tidak boleh membuat absensi berubah otomatis.
    console.error('AI error:', e);
    await catatPesan(dari, pesan, 'Gemini error - belum dianalisis, perlu pengecekan manual', true).catch(() => {});
    const nama = anak.length === 1 ? (anak[0].nama_panggilan || anak[0].nama) : 'Belum berhasil diidentifikasi';
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
      statusDugaan: hasilAI.status_dugaan || ''
    });
    return;
  }

  // 5. AI yakin. Validasi siswa sekali lagi sebelum menyimpan.
  let pilih = (hasilAI.siswa_ids || [])
    .map(id => anak.find(s => String(s.id) === String(id)))
    .filter(Boolean);
  if (!pilih.length && anak.length === 1) pilih = anak;

  if (!pilih.length) {
    await catatPesan(dari, pesan, 'Ragu: anak tidak teridentifikasi', true);
    await kirimRagu(target, dari, 'Belum berhasil diidentifikasi', pesan);
    return;
  }

  const status = hasilAI.status === 'sakit' ? 'sakit' : 'izin';
  const hasil = await simpan(dari, pesan, pilih, status, hasilAI.alasan || pesan);
  if (hasil.balasan) await kirimFonnte(target, hasil.balasan);
}

module.exports = async (req, res) => {
  const kunci = String((req.query && req.query.key) || '').trim();

  if (req.method !== 'POST') {
    if (!kunci) return res.status(200).send('Webhook aktif');
    if (!WEBHOOK_SECRET) return res.status(200).send('WEBHOOK_SECRET belum terbaca di Vercel');
    return res.status(200).send(kunci === WEBHOOK_SECRET ? 'Kunci cocok' : 'Kunci salah');
  }

  if (!WEBHOOK_SECRET || kunci !== WEBHOOK_SECRET) return res.status(401).send('Tidak diizinkan');

  try { await proses(req.body || {}); }
  catch (e) { console.error('Webhook error:', e); }

  return res.status(200).json({ ok: true });
};
