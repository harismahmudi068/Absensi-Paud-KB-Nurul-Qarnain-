// AI.js
// Modul khusus untuk memahami pesan WhatsApp orang tua menggunakan Gemini.
// Menggunakan SDK resmi Google GenAI (@google/genai).
//
// Dependency yang diperlukan:
// npm install @google/genai

const { GoogleGenAI, Type } = require('@google/genai');

// ============================================================
// KONFIGURASI AI — MUDAH DIUBAH
// ============================================================
// Jangan menulis API key langsung di kode. Isi di Vercel: Settings > Environment Variables > GEMINI_API_KEY
const AI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const AI_MODEL = 'gemini-3.5-flash-lite';

const SYSTEM_PROMPT = `
Anda adalah AI klasifikasi absensi PAUD untuk menganalisis pesan WhatsApp dari orang tua.

TUGAS UTAMA:
1. Tentukan kategori: "izin_sakit", "bukan_izin_sakit", atau "ragu".
2. Tentukan status: "izin", "sakit", atau "tidak_ada".
3. Identifikasi nama anak yang disebut di pesan dan waktu/tanggal absensinya.

ATURAN KATEGORI & STATUS:
1. Kategori hanya 3: "izin_sakit", "bukan_izin_sakit", "ragu".
2. Alasan kesehatan (sakit, demam, batuk, flu, dll): kategori = "izin_sakit", status = "sakit". Status sakit selalu lebih utama daripada kata "izin".
3. Alasan selain sakit (acara/keperluan keluarga, bepergian, dll): kategori = "izin_sakit", status = "izin".
4. Bukan laporan ketidakhadiran: kategori = "bukan_izin_sakit", status = "tidak_ada".
5. Maksud, anak, atau waktu tidak jelas/tidak dapat ditentukan: kategori = "ragu", status = "tidak_ada".
6. "Tidak sakit" atau "bukan karena sakit" berarti jangan pilih status sakit.
7. Jangan mengarang nama anak. Daftar anak_wali adalah anak yang terdaftar di nomor pengirim.

ATURAN WAKTU/TANGGAL:
- Jika tidak disebut, anggap hari ini: waktu = [{ "tipe": "hari_ini", "jumlah_hari": 1 }].
- "hari ini" -> tipe "hari_ini", "besok" -> tipe "besok", "lusa" -> tipe "lusa".
- Nama hari ("Senin", "Selasa", dll) -> tipe "nama_hari", nama_hari (huruf kecil: minggu/senin/selasa/rabu/kamis/jumat/sabtu).
- "Senin depan" -> tipe "nama_hari", nama_hari = "senin", pekan_depan = true.
- Format surat formal/panjang ("*Tanggal : 02 Oktober 2026*", "10 Oktober", "10/10") -> tipe "tanggal". Abaikan semua simbol WhatsApp (*, _, ~). 
- Ekstrak tanggal, bulan, dan tahun menjadi ANGKA murni (integer). Contoh: "02 Oktober 2026" menjadi tanggal = 2, bulan = 10, tahun = 2026. Jangan gunakan string "02".
- Durasi: "selama 3 hari mulai besok" -> tipe "besok", jumlah_hari = 3. "3 hari mulai Senin" -> tipe "nama_hari", nama_hari = "senin", jumlah_hari = 3.
- "besok dan lusa" -> keluarkan dua entri waktu: besok dan lusa.
- Waktu masa depan valid dan harus diproses (jangan diubah menjadi ragu hanya karena di masa depan). Waktu lampau (seperti "kemarin") jadikan ragu.

ATURAN PENCOCOKAN NAMA (daftar_nama):
- Untuk SETIAP anak yang disebut di pesan, buat 1 entri: nama (teks persis di pesan) dan siswa_id (id dari anak_wali, atau "" jika tidak ada/tidak cocok).
- Jika pesan tidak menyebut nama anak sama sekali, daftar_nama = [].
- Jika daftar_nama kosong dan anak_wali hanya 1 anak, sistem akan memakai anak tersebut. Jika daftar_nama ada, siswa_ids dikosongkan karena akan dicocokkan otomatis oleh kode.

JAWAB HANYA DENGAN JSON sesuai struktur skema.
`;

function daftarAnak(anak) {
  return (Array.isArray(anak) ? anak : []).map(s => ({
    id: String(s?.id ?? ''),
    nama: s?.nama || '',
    nama_panggilan: s?.nama_panggilan || ''
  }));
}

// ============================================================
// PENCOCOKAN NAMA (deterministik, tidak bergantung pada AI)
// ============================================================
const KATA_ABAI = new Set([
  'ananda', 'anak', 'adik', 'dik', 'nak', 'sdr', 'sdri', 'bin', 'binti'
]);

const VARIAN_NAMA = [
  ['muhammad', 'mohammad', 'muhamad', 'mohamad', 'mohd', 'muhd', 'muh', 'moh', 'mhd', 'mochammad', 'mochamad', 'mokhamad', 'mukhammad'],
  ['ahmad', 'achmad', 'akhmad', 'ahmed'],
  ['abdul', 'abdl', 'abdu', 'abd']
];
const KANONIK = {};
VARIAN_NAMA.forEach(g => g.forEach(v => { KANONIK[v] = g[0]; }));

function tokenNama(teks) {
  return String(teks || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 2 && !KATA_ABAI.has(t))
    .map(t => KANONIK[t] || t);
}

function jarakEdit(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[a.length][b.length];
}

function tokenSama(a, b, minSingkat) {
  if (a === b) return true;
  if (a.length >= 5 && b.length >= 5 && jarakEdit(a, b) <= 1) return true;
  return a.length >= minSingkat && b.length > a.length && b.startsWith(a);
}

function adaKemiripan(namaPesan, siswa) {
  const tp = tokenNama(namaPesan);
  const namaSiswa = tokenNama(siswa?.nama);
  const panggilanSiswa = tokenNama(siswa?.nama_panggilan);
  
  if (!tp.length) return true;

  return tp.some(t => 
    namaSiswa.some(n => tokenSama(t, n, 2)) || 
    panggilanSiswa.some(p => tokenSama(t, p, 2)) ||
    namaSiswa.some(n => n.includes(t) || t.includes(n))
  );
}

function normalisasi(raw, anak) {
  const daftar = Array.isArray(anak) ? anak : [];
  let kategori = ['izin_sakit', 'bukan_izin_sakit', 'ragu'].includes(raw?.kategori) ? raw.kategori : 'ragu';
  let status = ['izin', 'sakit', 'tidak_ada'].includes(raw?.status) ? raw.status : 'tidak_ada';
  const validIds = new Set(daftar.map(s => String(s.id)));

  const daftar_nama = (Array.isArray(raw?.daftar_nama) ? raw.daftar_nama : [])
    .map(x => ({
      nama: String(x?.nama || '').trim(),
      siswa_id: String(x?.siswa_id ?? '').trim()
    }))
    .filter(x => x.nama);

  const nama_di_pesan = daftar_nama.map(x => x.nama);
  let siswa_ids = [];
  let nama_beda = false;

  if (daftar_nama.length > 0) {
    const idCocok = new Set();
    for (const x of daftar_nama) {
      const siswa = daftar.find(s => String(s.id) === x.siswa_id) || 
                    daftar.find(s => adaKemiripan(x.nama, s));
      
      if (siswa && adaKemiripan(x.nama, siswa)) {
        idCocok.add(String(siswa.id));
      } else {
        if (daftar.length === 1) {
          idCocok.add(String(daftar[0].id));
        } else {
          nama_beda = true;
        }
      }
    }
    siswa_ids = [...idCocok];
  } else {
    if (daftar.length === 1) {
      siswa_ids = [String(daftar[0].id)];
    } else {
      siswa_ids = Array.isArray(raw?.siswa_ids)
        ? raw.siswa_ids.map(String).filter(id => validIds.has(id))
        : [];
    }
  }

  const waktu = (Array.isArray(raw?.waktu) ? raw.waktu : [])
    .map(w => {
      const tipe = ['hari_ini', 'besok', 'lusa', 'nama_hari', 'tanggal'].includes(w?.tipe) ? w.tipe : null;
      if (!tipe) return null;

      const hasil = {
        tipe,
        jumlah_hari: Math.max(1, Number(w?.jumlah_hari) || 1)
      };

      if (tipe === 'nama_hari') {
        const hari = String(w?.nama_hari || '').trim().toLowerCase();
        if (!['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'].includes(hari)) return null;
        hasil.nama_hari = hari;
        hasil.pekan_depan = w?.pekan_depan === true;
      }

      if (tipe === 'tanggal') {
        const d = Number(w?.tanggal);
        if (!Number.isInteger(d) || d < 1 || d > 31) return null;
        hasil.tanggal = d;

        const bulan = Number(w?.bulan);
        if (Number.isInteger(bulan) && bulan >= 1 && bulan <= 12) hasil.bulan = bulan;

        const tahun = Number(w?.tahun);
        if (Number.isInteger(tahun) && tahun >= 2000 && tahun <= 2100) hasil.tahun = tahun;
      }

      return hasil;
    })
    .filter(Boolean);

  const waktu_final = waktu.length > 0 ? waktu : (kategori === 'izin_sakit' ? [{ tipe: 'hari_ini', jumlah_hari: 1 }] : []);
  const status_dugaan = status;

  if (status === 'sakit') kategori = 'izin_sakit';
  if (kategori === 'bukan_izin_sakit') status = 'tidak_ada';

  let alasan_ragu = '';
  if (nama_beda && kategori === 'izin_sakit') {
    kategori = 'ragu';
    status = 'tidak_ada';
    alasan_ragu = 'nama_beda';
  }

  if (kategori === 'izin_sakit' && siswa_ids.length === 0) {
    kategori = 'ragu';
    status = 'tidak_ada';
    alasan_ragu = alasan_ragu || 'anak_tidak_jelas';
  }

  const terdaftar = daftar.filter(s => siswa_ids.includes(String(s.id)));
  const sumber = terdaftar.length > 0 ? terdaftar : daftar;
  const nama_anak = sumber.map(s => String(s.nama || '').trim()).filter(Boolean).join(' | ');
  const confidence = Number(raw?.confidence);

  return {
    kategori,
    status,
    status_dugaan,
    siswa_ids,
    waktu: waktu_final,
    nama_anak,
    nama_di_pesan,
    nama_beda,
    alasan_ragu,
    alasan: typeof raw?.alasan === 'string' ? raw.alasan.trim() : '',
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0
  };
}

function buatErrorAI(error) {
  if (error?.message) return new Error(error.message);
  try {
    return new Error(JSON.stringify(error));
  } catch (_) {
    return new Error('Kesalahan Gemini tidak diketahui');
  }
}

async function analisisPesan({ pesan, anak, tanggalHariIni }) {
  if (!AI_API_KEY) {
    throw new Error('GEMINI_API_KEY belum diisi di Environment Variables Vercel');
  }

  let ai;
  try {
    ai = new GoogleGenAI({ apiKey: AI_API_KEY });
  } catch (e) {
    throw buatErrorAI(e);
  }

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      kategori: { type: Type.STRING, enum: ['izin_sakit', 'bukan_izin_sakit', 'ragu'] },
      status: { type: Type.STRING, enum: ['izin', 'sakit', 'tidak_ada'] },
      siswa_ids: { type: Type.ARRAY, items: { type: Type.STRING } },
      daftar_nama: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            nama: { type: Type.STRING },
            siswa_id: { type: Type.STRING }
          },
          required: ['nama', 'siswa_id']
        }
      },
      waktu: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            tipe: { type: Type.STRING, enum: ['hari_ini', 'besok', 'lusa', 'nama_hari', 'tanggal'] },
            nama_hari: { type: Type.STRING },
            pekan_depan: { type: Type.BOOLEAN },
            tanggal: { type: Type.INTEGER },
            bulan: { type: Type.INTEGER },
            tahun: { type: Type.INTEGER },
            jumlah_hari: { type: Type.INTEGER }
          },
          required: ['tipe', 'jumlah_hari'],
          additionalProperties: false
        }
      },
      alasan: { type: Type.STRING },
      confidence: { type: Type.NUMBER }
    },
    required: ['kategori', 'status', 'siswa_ids', 'daftar_nama', 'waktu', 'alasan', 'confidence'],
    additionalProperties: false
  };

  const input = {
    tanggal_hari_ini: String(tanggalHariIni || ''),
    pesan_asli: String(pesan || ''),
    anak_wali: daftarAnak(anak)
  };

  try {
    const response = await ai.models.generateContent({
      model: AI_MODEL,
      contents: JSON.stringify(input),
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseSchema,
        maxOutputTokens: 512
      }
    });

    const content = String(response?.text || '').trim();
    if (!content) throw new Error('Respons Gemini kosong');

    let hasil;
    try {
      hasil = JSON.parse(content);
    } catch (_) {
      throw new Error(`Respons Gemini bukan JSON valid: ${content.slice(0, 1000)}`);
    }

    return normalisasi(hasil, anak);
  } catch (e) {
    throw buatErrorAI(e);
  }
}

module.exports = { analisisPesan };
