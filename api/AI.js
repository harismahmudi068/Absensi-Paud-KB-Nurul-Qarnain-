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
const AI_API_KEY = 'AQ.Ab8RN6L-g2X4kAvnFOVtKOO8RJLKPPC89O4mpKT8vE82ZMXe3A';
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

7. Jangan mengarang nama anak. Gunakan hanya nama yang ada di daftar anak wali.

8. "Tidak sakit" atau "bukan karena sakit" berarti jangan pilih sakit.

9. "Kemarin", "besok", atau tanggal selain hari ini tidak boleh otomatis dicatat sebagai absensi hari ini. Jika masih berkaitan dengan absensi, pilih ragu.

10. Jika informasi tidak cukup jelas, pilih ragu daripada menebak.

11. Jika kategori izin_sakit, isi nama_anak dengan nama anak yang disebutkan atau yang dapat dipastikan dari daftar anak wali. Jika lebih dari satu anak, tuliskan semua nama yang dimaksud dipisahkan dengan " | ". Jangan mengarang nama.

JAWAB HANYA DENGAN JSON sesuai struktur yang diberikan.
`;

function daftarAnak(anak) {
  return (Array.isArray(anak) ? anak : []).map(s => ({
    id: String(s?.id ?? ''),
    nama: s?.nama || '',
    nama_panggilan: s?.nama_panggilan || ''
  }));
}

function normalisasi(raw, anak) {
  let kategori = ['izin_sakit', 'bukan_izin_sakit', 'ragu'].includes(raw?.kategori)
    ? raw.kategori
    : 'ragu';

  let status = ['izin', 'sakit', 'tidak_ada'].includes(raw?.status)
    ? raw.status
    : 'tidak_ada';

  const validIds = new Set(
    (Array.isArray(anak) ? anak : []).map(s => String(s.id))
  );

  const siswa_ids = Array.isArray(raw?.siswa_ids)
    ? raw.siswa_ids.map(String).filter(id => validIds.has(id))
    : [];

  // Pengaman inti: sakit selalu menang.
  if (status === 'sakit') {
    kategori = 'izin_sakit';
  }

  if (kategori === 'bukan_izin_sakit') {
    status = 'tidak_ada';
  }

  // Kategori yakin tanpa anak yang valid tidak boleh otomatis diproses.
  if (kategori === 'izin_sakit' && siswa_ids.length === 0) {
    kategori = 'ragu';
  }

  const confidence = Number(raw?.confidence);

  return {
    kategori,
    status,
    siswa_ids,
    nama_anak:
      typeof raw?.nama_anak === 'string'
        ? raw.nama_anak.trim()
        : '',
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
  if (
    !AI_API_KEY ||
    AI_API_KEY === 'ISI_API_KEY_AI_DI_SINI'
  ) {
    throw new Error(
      'AI_API_KEY di AI.js belum diisi'
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

      nama_anak: {
        type: Type.STRING
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
      'nama_anak',
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
