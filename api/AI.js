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
Anda adalah AI klasifikasi absensi PAUD.

Tugas: tentukan apakah pesan orang tua merupakan laporan anak SAKIT, IZIN, bukan absensi, atau masih RAGU.

ATURAN:
1. Hanya gunakan 3 kategori: izin_sakit, bukan_izin_sakit, ragu.

2. Jika anak tidak masuk karena alasan kesehatan (sakit, demam, batuk, flu, kurang sehat, dll), pilih:
   kategori = izin_sakit
   status = sakit
   SAKIT lebih utama daripada IZIN, walaupun pesan menggunakan kata "izin".

3. Jika anak tidak masuk karena alasan selain sakit (acara keluarga, keperluan keluarga, bepergian, dll), pilih:
   kategori = izin_sakit
   status = izin.

4. Jika bukan laporan ketidakhadiran, pilih:
   kategori = bukan_izin_sakit
   status = tidak_ada.

5. Jika berkaitan dengan absensi tetapi maksud, anak, atau waktunya tidak jelas, pilih:
   kategori = ragu
   status = tidak_ada.

6. Pesan panjang atau berbentuk surat formal tetap diproses jika isinya jelas.

7. Jangan mengarang nama anak. Daftar anak_wali adalah anak yang terdaftar di nomor pengirim.

8. "Tidak sakit" atau "bukan karena sakit" berarti jangan pilih sakit.

9. "Kemarin", "besok", atau tanggal selain hari ini tidak boleh otomatis dicatat sebagai absensi hari ini. Jika masih berkaitan dengan absensi, pilih ragu.

10. Jika informasi tidak cukup jelas, pilih ragu daripada menebak.

11. daftar_nama: untuk SETIAP anak yang namanya disebut di pesan, isi satu entri:
   - nama = tulisan nama persis seperti di pesan (jangan diubah).
   - siswa_id = id anak di anak_wali yang dimaksud, atau "" (kosong) jika tidak ada anak terdaftar yang dimaksud.
   Jika pesan tidak menyebut nama anak sama sekali, daftar_nama = [].

12. Cara mencocokkan nama pesan dengan anak_wali:
   - Anggap SAMA jika hanya beda penulisan: singkatan (mis. "Moh." = Mohammad, "Sy" = Syaputra, "M. Rofiqih"), inisial, variasi ejaan (Muhammad/Mohamad/Muhamad, Achmad/Ahmad), huruf salah ketik, urutan kata, ada kata yang dihilangkan, atau memakai nama_panggilan.
   - Anggap BEDA (siswa_id = "") jika orangnya tampak berbeda: kata khas nama berbeda (mis. "Rizky" vs "Rofiqih" walau nama belakang sama), atau tidak ada kemiripan sama sekali.
   - Jangan memaksakan cocok. Jika ragu apakah itu anak yang sama, kosongkan siswa_id.

13. siswa_ids: isi hanya jika daftar_nama kosong dan anak_wali hanya berisi satu anak (pesan tidak menyebut nama), maka pilih anak tersebut. Jika daftar_nama tidak kosong, siswa_ids dikosongkan (diisi oleh sistem dari siswa_id di daftar_nama).

JAWAB HANYA DENGAN JSON sesuai struktur yang diberikan.
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

// Variasi penulisan nama yang sangat umum dianggap sama.
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

// a = kata dari pesan, b = kata dari data terdaftar.
// minSingkat: panjang minimal singkatan (awalan) yang diterima.
function tokenSama(a, b, minSingkat) {
  if (a === b) return true;
  // salah ketik 1 huruf, hanya untuk kata yang cukup panjang
  if (a.length >= 5 && b.length >= 5 && jarakEdit(a, b) <= 1) return true;
  // singkatan/awalan, mis. "sy" untuk "syaputra"
  return a.length >= minSingkat && b.length > a.length && b.startsWith(a);
}

// Pengaman anti-halusinasi (bukan penentu utama):
// Pencocokan nama dilakukan oleh AI. Kode hanya menolak jika nama di pesan
// sama sekali tidak mirip dengan nama/panggilan anak yang dipilih AI.
function adaKemiripan(namaPesan, siswa) {
  const tp = tokenNama(namaPesan);
  const kumpulan = [...tokenNama(siswa?.nama), ...tokenNama(siswa?.nama_panggilan)];
  if (!tp.length) return true; // hanya inisial: percayai AI
  return tp.some(t => kumpulan.some(n => tokenSama(t, n, 2)));
}

function normalisasi(raw, anak) {
  const daftar = Array.isArray(anak) ? anak : [];

  let kategori = ['izin_sakit', 'bukan_izin_sakit', 'ragu'].includes(raw?.kategori)
    ? raw.kategori
    : 'ragu';

  let status = ['izin', 'sakit', 'tidak_ada'].includes(raw?.status)
    ? raw.status
    : 'tidak_ada';

  const validIds = new Set(daftar.map(s => String(s.id)));

  // Daftar nama dari AI: tulisan di pesan + id anak terdaftar yang dimaksud.
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
      const siswa = daftar.find(s => String(s.id) === x.siswa_id);
      // Cocok hanya jika AI memilih id yang valid dan namanya tidak sama sekali asing.
      if (siswa && adaKemiripan(x.nama, siswa)) {
        idCocok.add(String(siswa.id));
      } else {
        nama_beda = true; // nama di pesan bukan anak terdaftar di nomor ini
      }
    }
    siswa_ids = [...idCocok];
  } else {
    // Pesan tidak menyebut nama: pakai pilihan AI yang valid
    siswa_ids = Array.isArray(raw?.siswa_ids)
      ? raw.siswa_ids.map(String).filter(id => validIds.has(id))
      : [];
  }

  // Simpan dugaan sebelum dipaksa ragu, supaya notifikasi bisa menyebutnya.
  const status_dugaan = status;

  // Pengaman inti: sakit selalu menang.
  if (status === 'sakit') {
    kategori = 'izin_sakit';
  }

  if (kategori === 'bukan_izin_sakit') {
    status = 'tidak_ada';
  }

  let alasan_ragu = '';

  // Nama di pesan berbeda dengan anak yang terdaftar -> wajib dicek manual.
  if (nama_beda && kategori === 'izin_sakit') {
    kategori = 'ragu';
    status = 'tidak_ada';
    alasan_ragu = 'nama_beda';
  }

  // Kategori yakin tanpa anak yang valid tidak boleh otomatis diproses.
  if (kategori === 'izin_sakit' && siswa_ids.length === 0) {
    kategori = 'ragu';
    status = 'tidak_ada';
    alasan_ragu = alasan_ragu || 'anak_tidak_jelas';
  }

  // nama_anak SELALU nama terdaftar di nomor pengirim, bukan nama dari pesan.
  const terdaftar = daftar.filter(s => siswa_ids.includes(String(s.id)));
  const sumber = terdaftar.length > 0 ? terdaftar : daftar;
  const nama_anak = sumber
    .map(s => String(s.nama || '').trim())
    .filter(Boolean)
    .join(' | ');

  const confidence = Number(raw?.confidence);

  return {
    kategori,
    status,
    status_dugaan,
    siswa_ids,
    nama_anak,        // nama terdaftar di nomor pengirim
    nama_di_pesan,    // nama yang tertulis di pesan (array)
    nama_beda,        // true jika nama di pesan tidak cocok dengan anak terdaftar
    alasan_ragu,      // '', 'nama_beda', atau 'anak_tidak_jelas'
    alasan:
      typeof raw?.alasan === 'string'
        ? raw.alasan.trim()
        : '',
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : 0
  };
}

function buatErrorAI(error) {
  if (error?.message) {
    return new Error(error.message);
  }

  try {
    return new Error(JSON.stringify(error));
  } catch (_) {
    return new Error('Kesalahan Gemini tidak diketahui');
  }
}

async function analisisPesan({
  pesan,
  anak,
  tanggalHariIni
}) {
  if (!AI_API_KEY) {
    throw new Error(
      'GEMINI_API_KEY belum diisi di Environment Variables Vercel'
    );
  }

  let ai;

  try {
    ai = new GoogleGenAI({
      apiKey: AI_API_KEY
    });
  } catch (e) {
    throw buatErrorAI(e);
  }

  const responseSchema = {
    type: Type.OBJECT,

    properties: {
      kategori: {
        type: Type.STRING,
        enum: [
          'izin_sakit',
          'bukan_izin_sakit',
          'ragu'
        ]
      },

      status: {
        type: Type.STRING,
        enum: [
          'izin',
          'sakit',
          'tidak_ada'
        ]
      },

      siswa_ids: {
        type: Type.ARRAY,
        items: {
          type: Type.STRING
        }
      },

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

      alasan: {
        type: Type.STRING
      },

      confidence: {
        type: Type.NUMBER
      }
    },

    required: [
      'kategori',
      'status',
      'siswa_ids',
      'daftar_nama',
      'alasan',
      'confidence'
    ],

    additionalProperties: false
  };

  const input = {
    tanggal_hari_ini: String(
      tanggalHariIni || ''
    ),

    pesan_asli: String(
      pesan || ''
    ),

    anak_wali: daftarAnak(anak)
  };

  try {
    const response =
      await ai.models.generateContent({
        model: AI_MODEL,

        contents: JSON.stringify(input),

        config: {
          systemInstruction:
            SYSTEM_PROMPT,

          responseMimeType:
            'application/json',

          responseSchema,

          maxOutputTokens: 512
        }
      });

    const content =
      String(response?.text || '').trim();

    if (!content) {
      throw new Error(
        'Respons Gemini kosong'
      );
    }

    let hasil;

    try {
      hasil = JSON.parse(content);
    } catch (_) {
      throw new Error(
        `Respons Gemini bukan JSON valid: ${content.slice(
          0,
          1000
        )}`
      );
    }

    return normalisasi(
      hasil,
      anak
    );

  } catch (e) {
    throw buatErrorAI(e);
  }
}

module.exports = {
  analisisPesan
};
