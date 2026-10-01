// AI.js
// Modul khusus untuk memahami pesan WhatsApp orang tua menggunakan Gemini.
// API key dan model sengaja diletakkan di bagian paling atas agar mudah diganti.

// ============================================================
// KONFIGURASI AI — MUDAH DIUBAH
// ============================================================
const AI_API_KEY = 'AQ.Ab8RN6IC1ZfTHYIwJTEBmOlwMr1IJ2-BLvRucrSZ52FGMuQK2A';
const AI_MODEL = 'gemini-3.5-flash-lite';
const AI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`;

const SYSTEM_PROMPT = `
Anda adalah mesin klasifikasi pesan WhatsApp orang tua untuk sistem absensi PAUD di Indonesia.

TUGAS UTAMA:
Tentukan apakah pesan adalah laporan izin/sakit untuk HARI INI, percakapan biasa, atau pesan yang masih meragukan.

HANYA ADA 3 KATEGORI:
1. izin_sakit = benar-benar yakin pesan adalah laporan izin/sakit untuk hari ini.
2. bukan_izin_sakit = yakin pesan adalah percakapan/pesan sehari-hari dan bukan laporan izin/sakit.
3. ragu = ada indikasi kuat berkaitan dengan izin/sakit atau ketidakhadiran, tetapi belum cukup jelas untuk dicatat otomatis.

ATURAN PALING PENTING:
- SAKIT SELALU PRIORITAS DI ATAS IZIN.
- "izin karena sakit", "izin karena demam", "izin karena batuk", "mohon izin karena anak kurang sehat" dan kalimat sejenis harus menjadi izin_sakit dengan status sakit.
- Kondisi kesehatan seperti sakit, demam, flu, batuk, pilek, panas, diare, muntah, pusing, cacar, tipes, DBD, opname, kurang sehat, kurang enak badan, tidak enak badan, tidak fit, atau makna kesehatan sejenis = status sakit walaupun ada kata izin.
- Kata "izin" TIDAK otomatis berarti status izin. Pahami alasan dan konteksnya.
- Status izin digunakan untuk ketidakhadiran bukan karena sakit, misalnya acara keluarga, keperluan keluarga, bepergian, keluar kota, atau urusan lain.
- Jangan mengarang nama anak dan jangan memilih anak yang tidak ada dalam daftar anak wali.
- Jika wali memiliki satu anak dan pesan jelas merujuk pada anaknya, gunakan anak tunggal tersebut.
- Jika wali memiliki beberapa anak dan pesan tidak cukup jelas untuk menentukan anak mana, pilih ragu.
- Jika pesan membicarakan kemarin, sebelumnya, besok, lusa, minggu depan, atau waktu selain hari ini, jangan mencatatnya sebagai absensi hari ini. Jika berkaitan dengan izin/sakit, pilih ragu.
- Jika pesan menyangkal kondisi sakit (misalnya "tidak sakit" atau "bukan karena sakit") jangan memilih sakit hanya karena ada kata sakit; pahami konteks keseluruhan.
- Salam, ucapan terima kasih, pertanyaan sekolah, pengumuman, dan percakapan umum = bukan_izin_sakit.
- Untuk izin_sakit harus benar-benar yakin. Jika ada keraguan, pilih ragu.
- Jangan membuat balasan kepada orang tua. Hanya keluarkan hasil klasifikasi terstruktur.
`;

function daftarAnak(anak) {
  return anak.map(s => ({
    id: String(s.id),
    nama: s.nama || '',
    nama_panggilan: s.nama_panggilan || ''
  }));
}

function parseContent(data) {
  const content = data?.candidates?.[0]?.content?.parts?.map(p => p?.text || '').join('').trim();
  if (!content) {
    const block = data?.promptFeedback?.blockReason || data?.candidates?.[0]?.finishReason || 'tidak diketahui';
    throw new Error(`Respons Gemini kosong (${block})`);
  }
  const bersih = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  return JSON.parse(bersih);
}

function normalisasi(raw, anak) {
  let kategori = ['izin_sakit', 'bukan_izin_sakit', 'ragu'].includes(raw?.kategori)
    ? raw.kategori : 'ragu';
  let status = ['izin', 'sakit', 'tidak_ada'].includes(raw?.status)
    ? raw.status : 'tidak_ada';

  const validIds = new Set(anak.map(s => String(s.id)));
  const siswa_ids = Array.isArray(raw?.siswa_ids)
    ? raw.siswa_ids.map(String).filter(id => validIds.has(id)) : [];

  // Pengaman inti: sakit selalu menang.
  if (status === 'sakit') kategori = 'izin_sakit';
  if (kategori === 'bukan_izin_sakit') status = 'tidak_ada';

  // Kategori yakin tanpa anak yang valid tidak boleh otomatis diproses.
  if (kategori === 'izin_sakit' && siswa_ids.length === 0) kategori = 'ragu';

  const confidence = Number(raw?.confidence);
  return {
    kategori,
    status,
    siswa_ids,
    nama_anak: typeof raw?.nama_anak === 'string' ? raw.nama_anak.trim() : '',
    alasan: typeof raw?.alasan === 'string' ? raw.alasan.trim() : '',
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0
  };
}

async function analisisPesan({ pesan, anak, tanggalHariIni }) {
  if (!AI_API_KEY || AI_API_KEY === 'ISI_API_KEY_AI_DI_SINI') {
    throw new Error('AI_API_KEY di AI.js belum diisi');
  }

  const responseSchema = {
    type: 'OBJECT',
    properties: {
      kategori: { type: 'STRING', enum: ['izin_sakit', 'bukan_izin_sakit', 'ragu'] },
      status: { type: 'STRING', enum: ['izin', 'sakit', 'tidak_ada'] },
      siswa_ids: { type: 'ARRAY', items: { type: 'STRING' } },
      nama_anak: { type: 'STRING' },
      alasan: { type: 'STRING' },
      confidence: { type: 'NUMBER' }
    },
    required: ['kategori', 'status', 'siswa_ids', 'nama_anak', 'alasan', 'confidence'],
    additionalProperties: false
  };

  const body = {
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents: [{
      role: 'user',
      parts: [{ text: JSON.stringify({
        tanggal_hari_ini: tanggalHariIni,
        pesan_asli: String(pesan || ''),
        anak_wali: daftarAnak(anak)
      }) }]
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      maxOutputTokens: 512
    }
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(AI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': AI_API_KEY
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const raw = await r.text();
    if (!r.ok) throw new Error(`Gemini HTTP ${r.status}: ${raw.slice(0, 1000)}`);
    return normalisasi(parseContent(JSON.parse(raw)), anak);
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { analisisPesan };
