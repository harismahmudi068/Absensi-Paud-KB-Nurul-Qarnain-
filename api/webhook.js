const crypto = require('crypto');
const { analisisPesan } = require('./AI');
const { terjemahkanBalasan } = require('./AITerjemah');

const PAUD_GROUP_ID = '120363410620341838@g.us';
const KEPALA_SEKOLAH_NUMBER = '6285117441486';
const HARI_LIBUR_MINGGUAN_CADANGAN = [0, 6];
const HARI_SAKIT_OTOMATIS = 3;
const DUPLIKAT_WINDOW_MS = 5 * 60 * 1000;
const MAKS_HARI_IZIN_KEDEPAN = 30;

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, options = {}) {
  const url = `${SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }

  return data;
}

const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

async function kirimFonnte(target, message) {
  if (!target || !message) return false;

  const res = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: {
      Authorization: FONNTE_TOKEN,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ target, message })
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Fonnte ${res.status}: ${text}`);
  }

  return true;
}

async function kirimBalasanWali(target, message) {
  try {
    const hasil = await terjemahkanBalasan(message);
    await kirimFonnte(target, hasil || message);
  } catch (e) {
    console.error('Gagal menerjemahkan balasan:', e);
    await kirimFonnte(target, message);
  }
}

function normalisasiNomor(nomor) {
  if (!nomor) return '';
  let n = String(nomor).replace(/\D/g, '');
  if (n.startsWith('0')) {
    n = '62' + n.slice(1);
  }
  if (n.startsWith('8')) {
    n = '62' + n;
  }
  return n;
}

function tanggalLokal(date = new Date()) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseTanggal(tanggal) {
  if (!tanggal) return null;
  const m = String(tanggal).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;

  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (
    d.getFullYear() !== Number(m[1]) ||
    d.getMonth() !== Number(m[2]) - 1 ||
    d.getDate() !== Number(m[3])
  ) {
    return null;
  }

  return d;
}

function formatTanggal(tanggal) {
  const d = parseTanggal(tanggal);
  if (!d) return tanggal;

  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  return `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}`;
}

function tambahHari(tanggal, jumlah) {
  const d = parseTanggal(tanggal);
  if (!d) return null;
  d.setDate(d.getDate() + jumlah);
  return tanggalLokal(d);
}

function normalisasiNama(nama) {
  return String(nama || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function bersihkanPesan(pesan) {
  return String(pesan || '').trim().replace(/\s+/g, ' ');
}

const SALAM = 'Assalamu’alaikum warahmatullahi wabarakatuh.';
const PENUTUP = 'Wassalamu’alaikum warahmatullahi wabarakatuh.';

function balasanDenganSalam(isi) {
  return [SALAM, '', isi, '', PENUTUP].join('\n');
}

function daftarTanggal(tanggal) {
  return tanggal.map(t => `• *${formatTanggal(t)}*`).join('\n');
}

function isiSakit(nama, tgl, lanjut = null) {
  const n = tgl.length;
  return [
    `Baik, Bunda. Laporan bahwa *${nama}* hari ini sakit sudah kami terima dan telah dicatat. 🤒`,
    '',
    `Semoga *${nama}* segera diberikan kesembuhan, kesehatan, dan kekuatan, serta dapat kembali beraktivitas bersama teman-teman di sekolah. 🌷`,
    '',
    `📌 *Catatan:* *${nama}* kini tercatat sakit selama ${n} hari sekolah:`,
    daftarTanggal(tgl),
    '',
    `Jika dalam ${n} hari tersebut *${nama}* belum sembuh, mohon Bunda mengirimkan laporan sakit kembali${lanjut ? ` pada (${formatTanggal(lanjut)})` : ''}. Jika *${nama}* sembuh sebelum${lanjut ? ` (${formatTanggal(lanjut)})` : ''} dan masuk sekolah, status sakit akan otomatis diganti menjadi hadir, jadi Bunda tidak perlu khawatir. 😊`
  ].join('\n');
}

function balasanSakit(nama, tgl, lanjut = null) {
  return balasanDenganSalam(isiSakit(nama, tgl, lanjut));
}

function isiIzin(nama, tanggal, alasan) {
  return [
    `Baik, Bunda. Laporan izin untuk *${nama}* pada *${formatTanggal(tanggal)}* sudah kami terima dan telah dicatat. 😊`,
    '',
    alasan ? `📝 *Alasan:* ${alasan}` : '',
    '',
    `Semoga *${nama}* selalu dalam keadaan sehat dan dapat kembali beraktivitas bersama teman-teman di sekolah. 🌷`
  ].filter(Boolean).join('\n');
}

function balasanIzin(nama, tanggal, alasan) {
  return balasanDenganSalam(isiIzin(nama, tanggal, alasan));
}

async function ambilLiburMingguan() {
  try {
    const data = await sb('/rest/v1/libur_mingguan?select=hari&aktif=eq.true');
    if (Array.isArray(data) && data.length) {
      return data.map(x => Number(x.hari)).filter(x => Number.isInteger(x));
    }
  } catch (e) {
    console.error('Gagal membaca libur mingguan:', e);
  }
  return HARI_LIBUR_MINGGUAN_CADANGAN;
}

async function ambilLiburTanggal() {
  try {
    const data = await sb('/rest/v1/libur_tanggal?select=tanggal');
    if (Array.isArray(data)) {
      return new Set(data.map(x => x.tanggal).filter(Boolean));
    }
  } catch (e) {
    console.error('Gagal membaca libur tanggal:', e);
  }
  return new Set();
}

async function isHariSekolah(tanggal, liburMingguan, liburTanggal) {
  const d = parseTanggal(tanggal);
  if (!d) return false;
  if (liburMingguan.includes(d.getDay())) return false;
  if (liburTanggal.has(tanggal)) return false;
  return true;
}

async function buatRencana(jenis, mulaiTanggal, jumlahHari = null) {
  const liburMingguan = await ambilLiburMingguan();
  const liburTanggal = await ambilLiburTanggal();

  if (jenis === 'sakit') {
    const jumlah = HARI_SAKIT_OTOMATIS;
    const tanggal = [];
    let cursor = mulaiTanggal;

    while (tanggal.length < jumlah) {
      if (await isHariSekolah(cursor, liburMingguan, liburTanggal)) {
        tanggal.push(cursor);
      }
      cursor = tambahHari(cursor, 1);
    }

    let lanjut = cursor;
    while (!(await isHariSekolah(lanjut, liburMingguan, liburTanggal))) {
      lanjut = tambahHari(lanjut, 1);
    }

    return { tanggal, lanjut };
  }

  const jumlah = Math.max(1, Number(jumlahHari || 1));
  const tanggal = [];
  let cursor = mulaiTanggal;

  while (tanggal.length < jumlah) {
    if (await isHariSekolah(cursor, liburMingguan, liburTanggal)) {
      tanggal.push(cursor);
    }
    cursor = tambahHari(cursor, 1);
  }

  return { tanggal, lanjut: null };
}

async function cariWaliByNomor(nomor) {
  const n = normalisasiNomor(nomor);
  if (!n) return [];
  const data = await sb(`/rest/v1/wali?select=*&nomor=eq.${encodeURIComponent(n)}`);
  return Array.isArray(data) ? data : [];
}

async function cariSiswaByNama(nama) {
  const n = normalisasiNama(nama);
  if (!n) return [];
  const data = await sb(`/rest/v1/siswa?select=*&order=nama.asc`);
  if (!Array.isArray(data)) return [];
  return data.filter(x => normalisasiNama(x.nama) === n);
}

async function cariSiswaUntukWali(waliId) {
  if (!waliId) return [];
  const data = await sb(`/rest/v1/siswa?select=*&wali_id=eq.${encodeURIComponent(waliId)}&order=nama.asc`);
  return Array.isArray(data) ? data : [];
}

async function sudahDiproses(messageId) {
  if (!messageId) return false;
  try {
    const data = await sb(`/rest/v1/pesan_diproses?select=id,waktu&message_id=eq.${encodeURIComponent(messageId)}&limit=1`);
    if (Array.isArray(data) && data.length) {
      const waktu = new Date(data[0].waktu).getTime();
      if (Number.isFinite(waktu) && Date.now() - waktu < DUPLIKAT_WINDOW_MS) {
        return true;
      }
    }
  } catch (e) {
    console.error('Gagal cek duplikat:', e);
  }
  return false;
}

async function tandaiSudahDiproses(messageId, nomor, pesan) {
  if (!messageId) return;
  try {
    await sb('/rest/v1/pesan_diproses', {
      method: 'POST',
      headers: { Prefer: 'resolution=ignore-duplicates' },
      body: JSON.stringify({
        message_id: messageId,
        nomor,
        pesan,
        waktu: new Date().toISOString()
      })
    });
  } catch (e) {
    console.error('Gagal menyimpan pesan diproses:', e);
  }
}

async function simpanAbsensi({ siswaId, tanggal, status, alasan = null }) {
  if (!siswaId || !tanggal || !status) return null;

  const existing = await sb(`/rest/v1/absensi?select=*&siswa_id=eq.${encodeURIComponent(siswaId)}&tanggal=eq.${encodeURIComponent(tanggal)}&limit=1`);
  if (Array.isArray(existing) && existing.length) {
    return { inserted: false, existing: existing[0] };
  }

  const data = await sb('/rest/v1/absensi', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({ siswa_id: siswaId, tanggal, status, alasan })
  });

  return {
    inserted: true,
    data: Array.isArray(data) ? data[0] : data
  };
}

async function simpanSakit(siswaId, tanggal, alasan = null) {
  return simpanAbsensi({ siswaId, tanggal, status: 'sakit', alasan });
}

async function simpanIzin(siswaId, tanggal, alasan = null) {
  return simpanAbsensi({ siswaId, tanggal, status: 'izin', alasan });
}

async function simpan({ jenis, siswa, rencana, alasan = null }) {
  if (!siswa || !rencana || !Array.isArray(rencana.tanggal)) {
    return { berhasil: [], gagal: [] };
  }

  const berhasil = [];
  const gagal = [];

  for (const tanggal of rencana.tanggal) {
    try {
      let hasil;
      if (jenis === 'sakit') {
        hasil = await simpanSakit(siswa.id, tanggal, alasan);
      } else if (jenis === 'izin') {
        hasil = await simpanIzin(siswa.id, tanggal, alasan);
      } else {
        throw new Error(`Jenis absensi tidak dikenal: ${jenis}`);
      }

      if (hasil?.inserted) {
        berhasil.push(tanggal);
      } else {
        gagal.push(tanggal);
      }
    } catch (e) {
      console.error('Gagal menyimpan absensi:', e);
      gagal.push(tanggal);
    }
  }

  return { berhasil, gagal };
}

function deteksiSakitCepat(pesan) {
  const p = bersihkanPesan(pesan).toLowerCase();
  const kataSakit = ['sakit', 'demam', 'flu', 'batuk', 'pilek', 'muntah', 'diare', 'kurang enak badan', 'tidak enak badan'];
  return kataSakit.some(k => p.includes(k));
}

function deteksiIzinCepat(pesan) {
  const p = bersihkanPesan(pesan).toLowerCase();
  const kataIzin = ['izin', 'tidak masuk', 'tidak dapat masuk', 'tidak bisa masuk', 'berhalangan'];
  return kataIzin.some(k => p.includes(k));
}

function ekstrakNamaSederhana(pesan) {
  const teks = bersihkanPesan(pesan);
  const pola = [
    /(?:nama|anak|ananda)\s*[:=-]\s*([A-Za-zÀ-ÿ.' -]+)/i,
    /(?:untuk|atas nama)\s+([A-Za-zÀ-ÿ.' -]+)/i
  ];

  for (const regex of pola) {
    const m = teks.match(regex);
    if (m?.[1]) {
      return m[1].trim();
    }
  }

  return null;
}

async function prosesDenganAI({ pesan, siswa }) {
  try {
    return await analisisPesan({ pesan, siswa });
  } catch (e) {
    console.error('Gagal analisis AI:', e);
    return { jenis: null, tanggal: null, alasan: null, nama: null };
  }
}

function bentukBalasan({ jenis, nama, tanggal, lanjut, alasan }) {
  if (jenis === 'sakit') {
    return balasanSakit(nama, tanggal, lanjut);
  }
  if (jenis === 'izin') {
    return balasanIzin(nama, tanggal[0], alasan);
  }
  return balasanDenganSalam(`Baik, Bunda. Pesan terkait *${nama || 'Ananda'}* sudah kami terima dan akan kami proses. 😊`);
}

function buatLaporanGagal(nama, gagal) {
  if (!gagal?.length) return '';
  return [
    `⚠️️ Beberapa tanggal untuk *${nama}* belum dapat dicatat:`,
    daftarTanggal(gagal)
  ].join('\n');
}

async function prosesPesanWali({ nomor, pesan, siswa }) {
  const hariIni = tanggalLokal();
  let jenis = null;
  let nama = siswa?.nama || ekstrakNamaSederhana(pesan);
  let alasan = null;
  let tanggalMulai = hariIni;
  let jumlahHari = null;

  const sakitCepat = deteksiSakitCepat(pesan);
  const izinCepat = deteksiIzinCepat(pesan);

  if (sakitCepat) {
    jenis = 'sakit';
  } else if (izinCepat) {
    jenis = 'izin';
  }

  if (!jenis) {
    const ai = await prosesDenganAI({ pesan, siswa });
    jenis = ai?.jenis || null;
    alasan = ai?.alasan || null;
    nama = ai?.nama || nama;
    tanggalMulai = ai?.tanggal || hariIni;
    jumlahHari = ai?.jumlahHari || null;
  }

  if (!jenis) {
    return balasanDenganSalam(`Mohon maaf, Bunda. Pesan belum dapat kami pahami sebagai laporan sakit atau izin. Silakan sampaikan kembali laporan untuk *${siswa?.nama || 'Ananda'}* dengan lebih jelas. 🙏`);
  }

  if (!nama && siswa?.nama) {
    nama = siswa.nama;
  }
  if (!nama) {
    nama = 'Ananda';
  }

  const siswaDiproses = siswa;
  if (!siswaDiproses) {
    return balasanDenganSalam(`Mohon maaf, Bunda. Data anak belum dapat ditemukan. Silakan periksa kembali nama Ananda yang dilaporkan. 🙏`);
  }

  const rencana = await buatRencana(jenis, tanggalMulai, jumlahHari);
  const hasil = await simpan({ jenis, siswa: siswaDiproses, rencana, alasan });

  let balasan = bentukBalasan({
    jenis,
    nama: siswaDiproses.nama,
    tanggal: rencana.tanggal,
    lanjut: rencana.lanjut,
    alasan
  });

  if (hasil.gagal.length) {
    balasan += `\n\n${buatLaporanGagal(siswaDiproses.nama, hasil.gagal)}`;
  }

  return balasan;
}

async function tentukanSiswaWali(wali, pesan) {
  const siswa = await cariSiswaUntukWali(wali.id);
  if (!siswa.length) return null;
  if (siswa.length === 1) return siswa[0];

  const nama = ekstrakNamaSederhana(pesan);
  if (nama) {
    const target = normalisasiNama(nama);
    const cocok = siswa.find(s => normalisasiNama(s.nama) === target);
    if (cocok) return cocok;

    const sebagian = siswa.find(s => normalisasiNama(s.nama).includes(target) || target.includes(normalisasiNama(s.nama)));
    if (sebagian) return sebagian;
  }

  return null;
}

function adalahGrup(body) {
  return (
    body?.chat?.endsWith('@g.us') ||
    body?.target?.endsWith('@g.us') ||
    body?.from?.endsWith('@g.us')
  );
}

function nomorPengirim(body) {
  return normalisasiNomor(body?.sender || body?.author || body?.from || '');
}

function isiPesan(body) {
  return String(body?.message || body?.text || body?.body || '').trim();
}

function idPesan(body) {
  return body?.id || body?.messageId || body?.message_id || body?.metadata?.id || '';
}
