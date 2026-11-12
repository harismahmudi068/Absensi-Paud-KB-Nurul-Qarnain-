// AI.js
// Modul khusus untuk memahami pesan WhatsApp orang tua menggunakan Gemini.
// Menggunakan SDK resmi Google GenAI (@google/genai).
//
// Dependency yang diperlukan:
// npm install @google/genai

const { GoogleGenAI, Type } = require('@google/genai');
const { generateContentDenganPengaman, klasifikasiErrorGemini } = require('./_geminiGuard');

// ============================================================
// KONFIGURASI AI — MUDAH DIUBAH
// ============================================================
// Jangan menulis API key langsung di kode. Isi di Vercel: Settings > Environment Variables > GEMINI_API_KEY
// Kunci API dibaca per sekolah dan dikirim oleh Webhook lewat parameter kunciAi.
const AI_MODEL = 'gemini-3.5-flash-lite';

const SYSTEM_PROMPT = `
Anda adalah AI untuk klasifikasi absensi PAUD dari pesan WhatsApp orang tua.

KATEGORI:
- "izin_sakit": ketidakhadiran karena sakit (status "sakit") atau alasan lain (status "izin").
- "bukan_izin_sakit": bukan laporan ketidakhadiran (status "tidak_ada").
- "ragu": maksud atau nama anak tidak jelas.
- Jika hanya waktu yang ambigu, tetap gunakan "izin_sakit" dan biarkan waktu kosong.

ATURAN WAKTU:
- Untuk status sakit, pilih tanggal anak TIDAK MASUK SEKOLAH, bukan semata-mata tanggal mulai gejala sakit.
- Contoh: "besok Riko tidak bisa masuk karena sakit demam" berarti waktu besok, walaupun demam mulai hari ini.
- Jika orang tua hanya menyatakan anak sakit/tidak masuk tanpa menyebut tanggal lain, gunakan hari ini.
- Bandingkan semua waktu dengan tanggal_hari_ini.
- Hari ini → tipe "hari_ini".
- Tanggal yang sama dengan hari ini, misalnya "hari ini (06 Oktober)" → tetap "hari_ini",
  KECUALI pesan juga menulis nama hari (mis. "Hari: Kamis, Tanggal: 6 November 2026"). Dalam kasus itu
  gunakan tipe "tanggal" dan isi nama_hari persis seperti tertulis, apa pun hari ini.
- Tanggal berbeda → tipe "tanggal".
- Hari yang disebut terpisah dibuat sebagai entri terpisah.
- Jangan mengubah daftar hari menjadi rentang kecuali pesan jelas menyatakan rentang.
- "Senin, Rabu dan Kamis" → 3 entri.
- "Senin sampai Kamis" → 1 entri dengan "sampai".
- "izin sampai Rabu" → mulai hari ini, berakhir Rabu.
- Durasi seperti "3 hari" atau "seminggu" → gunakan jumlah_hari.
- Hari yang disebut "masuk", "hadir", atau "sekolah" bukan hari izin.
- Contoh: "izin Senin, Rabu dan Kamis tapi Selasa masuk" → hanya Senin, Rabu, Kamis.
- Gabungkan hari dan tanggal yang merujuk waktu yang sama.
- Jika pesan menyebut nama hari DAN tanggal sekaligus (misalnya "Hari: Jumat, Tanggal: 6 November 2026"), buat SATU entri bertipe "tanggal" dan isi juga nama_hari persis seperti yang tertulis di pesan. Jangan memperbaiki atau menyesuaikan nama hari walaupun tidak cocok dengan tanggalnya; sistem yang memeriksa kecocokannya.
- "Ahad" sama dengan hari Minggu; tulis nama_hari "minggu".
- Bersihkan simbol WhatsApp (*, _, ~).
- Tanggal bisa ditulis dengan angka. Urutannya selalu HARI/BULAN/TAHUN (kebiasaan Indonesia), bukan bulan/hari:
  "08/10/2026", "8-10-2026", "08.10.26", "8/10" → tanggal 8, bulan 10.
  Tahun 2 digit ("26") berarti 2026. Jika tahun tidak ditulis, kosongkan tahun.
- Isi "bulan" hanya jika pesan menyebutnya (nama bulan seperti "Oktober", "okt", atau tanggal berbentuk angka seperti di atas). Jika tidak disebut, kosongkan bulan; jangan menebak.
- Tanggal yang ditulis jelas tetap tipe "tanggal" dan diisi lengkap walaupun sudah lewat dari tanggal_hari_ini; sistem yang menilai.
- Ungkapan waktu lampau tanpa tanggal jelas (mis. "kemarin", "minggu lalu") yang DILAPORKAN sebagai tidak masuk → tipe "lampau".
- Jika waktu lampau hanya konteks (mis. "kemarin demam, hari ini belum bisa masuk"), jangan buat entri lampau; catat hanya waktu yang masih berlaku.

ATURAN NAMA:
- daftar_nama hanya berisi nama anak yang benar-benar disebut dalam pesan.
- Jangan mengambil nama dari anak_wali jika nama tersebut tidak disebut.
- Jika tidak ada nama anak dalam pesan, daftar_nama harus kosong.
- Jangan mengganti nama yang disebut dengan nama anak terdaftar jika tidak cocok.
- Abaikan penanda kurung yang hanya mengapit nama. Contoh: "[Putra]", "(Putra)", atau "【Putra】" harus dibaca sebagai nama "Putra".
- Tanda kurung bukan bagian dari nama; baca dan cocokkan kata di dalamnya seperti teks biasa.
- Penentuan anak yang tidak disebut dalam pesan dilakukan oleh sistem berdasarkan data anak wali.

PESAN:
- Pahami maksud keseluruhan pesan, termasuk surat atau pesan formal yang panjang.
- Abaikan salam, kop surat, emoji, dan teks yang tidak berkaitan dengan absensi.

BAHASA:
- Isi dengan nama bahasa asli pesan, misalnya "Indonesia", "Jawa", atau "Inggris".
- Default "Indonesia".

JAWAB HANYA DENGAN JSON SESUAI SCHEMA.
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
  // Perbaiki: Izinkan 1 salah huruf (typo) asalkan panjang kata minimal 4 huruf (misal: "alip" dan "alif")
  if (a.length >= 4 && b.length >= 4 && jarakEdit(a, b) <= 1) return true;
  return a.length >= minSingkat && b.length > a.length && b.startsWith(a);
}

function adaKemiripan(namaPesan, siswa) {
  const tp = tokenNama(namaPesan);
  const namaSiswa = tokenNama(siswa?.nama);
  const panggilanSiswa = tokenNama(siswa?.nama_panggilan);
  
  // Jika teks pesan hanya berisi "ananda sakit" (tanpa menyebut nama), maka array tp kosong.
  // Ini otomatis cocok dan aman.
  if (!tp.length) return true;

  // Pencocokan diperketat (min 3 huruf). Fungsi includes() dihapus agar "Hanum" tidak nyangkut ke "Alif Putra"
  return tp.some(t => 
    namaSiswa.some(n => tokenSama(t, n, 3)) || 
    panggilanSiswa.some(p => tokenSama(t, p, 3))
  );
}

// Merapikan 1 penanda waktu (hari pertama maupun "sampai"). Mengembalikan null jika tidak valid.
// Nama hari dari AI/pesan -> bentuk baku. Tanda baca dibuang ("jum’at" / "jum'at" -> "jumat"),
// "ahad" dibaca "minggu". Mengembalikan '' jika bukan nama hari.
function normHari(x) {
  let hari = String(x || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  if (hari === 'ahad') hari = 'minggu';
  return ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'].includes(hari) ? hari : '';
}

function rapikanPenanda(w) {
  const tipe = ['hari_ini', 'besok', 'lusa', 'nama_hari', 'tanggal', 'lampau'].includes(w?.tipe) ? w.tipe : null;
  if (!tipe) return null;

  const hasil = { tipe };

  if (tipe === 'nama_hari') {
    const hari = normHari(w?.nama_hari);
    if (!hari) return null;
    hasil.nama_hari = hari;
    hasil.pekan_depan = w?.pekan_depan === true;
  }

  if (tipe === 'tanggal') {
    const d = Number(w?.tanggal);
    if (!Number.isInteger(d) || d < 1 || d > 31) return null;
    hasil.tanggal = d;

    // Nama hari yang ikut tertulis bersama tanggal (apa adanya). Webhook mencocokkannya dengan
    // hari sebenarnya dari tanggal itu; jika berbeda, pesan ditolak dan wali diminta memeriksa.
    const hariTertulis = normHari(w?.nama_hari);
    if (hariTertulis) hasil.hari_tertulis = hariTertulis;

    const bulan = Number(w?.bulan);
    if (Number.isInteger(bulan) && bulan >= 1 && bulan <= 12) hasil.bulan = bulan;

    const tahun = Number(w?.tahun);
    if (Number.isInteger(tahun) && tahun >= 2000 && tahun <= 2100) hasil.tahun = tahun;
  }

  return hasil;
}

// Pesan yang jelas menunjuk SEMUA anak ("kedua anak saya", "keduanya", "semua").
const SEMUA_ANAK = /\b(kedua|keduanya|kedua-duanya|dua-duanya|duaduanya|berdua|bertiga|semua|semuanya|anak-anak|anak2|kakak\s*(dan|&)?\s*adik|adik\s*(dan|&)?\s*kakak)\b/i;

function normalisasi(raw, anak, pesan = '') {
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
  const nama_tidak_cocok = [];

  if (daftar_nama.length > 0) {
    const idCocok = new Set();
    for (const x of daftar_nama) {
      const siswa = daftar.find(s => String(s.id) === x.siswa_id) || 
                    daftar.find(s => adaKemiripan(x.nama, s));
      
      if (siswa) {
        idCocok.add(String(siswa.id));
      } else {
        // PERBAIKAN: Jika nama tidak mirip sama sekali (misal diketik "Hanum", tapi yang terdaftar "Alif Putra"),
        // maka status langsung ditandai beda, meskipun wali murid tersebut hanya punya 1 anak.
        nama_beda = true;
        if (!nama_tidak_cocok.includes(x.nama)) nama_tidak_cocok.push(x.nama);
      }
    }
    siswa_ids = [...idCocok];
  } else {
    // Jika AI tidak menemukan nama satupun di dalam pesan (misal hanya: "sakit pak"), 
    // dan anak wali hanya 1, maka sistem akan menggunakan id anak tunggal tersebut.
    if (daftar.length === 1) {
      siswa_ids = [String(daftar[0].id)];
    } else {
      // Anak lebih dari satu dan tidak ada nama di pesan: tebakan AI TIDAK dipakai, kecuali pesan
      // jelas menunjuk semua anak ("kedua anak saya") dan AI memilih semua anak terdaftar.
      // Selain itu hasilnya kosong -> "anak tidak jelas" -> wali diminta menyebut nama.
      const dariAI = Array.isArray(raw?.siswa_ids)
        ? [...new Set(raw.siswa_ids.map(String).filter(id => validIds.has(id)))]
        : [];
      siswa_ids = (SEMUA_ANAK.test(String(pesan || '')) && dariAI.length === daftar.length) ? dariAI : [];
    }
  }

  const waktu = (Array.isArray(raw?.waktu) ? raw.waktu : [])
    .map(w => {
      const hasil = rapikanPenanda(w);
      if (!hasil) return null;

      hasil.jumlah_hari = Math.max(1, Number(w?.jumlah_hari) || 1);

      // Rentang "sampai hari X": penanda hari terakhir dirapikan sama seperti hari pertama.
      // Jika AI mengisi "sampai" tetapi tidak valid, ditandai gagal agar Webhook tidak diam-diam
      // mencatat 1 hari saja (hasilnya jatuh ke "ragu" dan diteruskan ke kepala sekolah).
      if (w?.sampai) {
        const akhir = rapikanPenanda(w.sampai);
        if (akhir) hasil.sampai = akhir;
        else hasil.sampai_gagal = true;
      }

      return hasil;
    })
    .filter(Boolean);

  // Pengaman deterministik: jika pesan menulis SATU nama hari dan SATU tanggal lengkap (mis. "Hari: Kamis",
  // "Tanggal: 6 November 2026"), pastikan nama hari ikut terbawa sebagai hari_tertulis, walaupun AI
  // menyederhanakannya menjadi "hari_ini". Webhook lalu memeriksa kecocokan hari dan tanggalnya.
  {
    const NAMA_BLN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    const teks = String(pesan || '');
    const hariCocok = [...teks.matchAll(/\bhari\s*[:\-]?\s*(senin|selasa|rabu|kamis|jum['’`]?at|sabtu|minggu|ahad)\b/gi)];
    const tglCocok = [...teks.matchAll(new RegExp(`\\b(\\d{1,2})\\s+(${NAMA_BLN.join('|')})\\s+(\\d{4})\\b`, 'gi'))];
    if (hariCocok.length === 1 && tglCocok.length === 1) {
      const hari = normHari(hariCocok[0][1]);
      const bulan = NAMA_BLN.indexOf(tglCocok[0][2].toLowerCase()) + 1;
      if (hari && bulan) {
        const entri = {
          tipe: 'tanggal',
          tanggal: Number(tglCocok[0][1]),
          bulan,
          tahun: Number(tglCocok[0][3]),
          hari_tertulis: hari,
          jumlah_hari: 1
        };
        const i = waktu.findIndex(w => (w.tipe === 'hari_ini' || w.tipe === 'tanggal') && !w.hari_tertulis);
        if (i >= 0) waktu[i] = entri;
        else if (waktu.length === 0) waktu.push(entri);
      }
    }
  }

  const waktu_final = waktu.length > 0 ? waktu : (kategori === 'izin_sakit' ? [{ tipe: 'hari_ini', jumlah_hari: 1 }] : []);
  const status_dugaan = status;

  if (status === 'sakit') kategori = 'izin_sakit';
  if (kategori === 'bukan_izin_sakit') status = 'tidak_ada';

  let alasan_ragu = '';
  // Sebagian nama cocok: anak yang cocok tetap dicatat (izin_sakit), nama yang salah ditolak oleh Webhook.
  // Semua nama salah: seluruh pesan ditolak (ragu).
  const nama_sebagian = nama_beda && kategori === 'izin_sakit' && siswa_ids.length > 0;
  if (nama_beda && kategori === 'izin_sakit' && !nama_sebagian) {
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
    nama_tidak_cocok,
    nama_sebagian,
    alasan_ragu,
    alasan: typeof raw?.alasan === 'string' ? raw.alasan.trim() : '',
    confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
    // Nama bahasa ditulis apa adanya oleh AI (tanpa daftar kode). Kosong = Indonesia.
    bahasa: String(raw?.bahasa || '').trim().slice(0, 40) || 'Indonesia'
  };
}


async function simpanPemakaianAI(catat, response, status, kodeError) {
  if (typeof catat !== 'function') return;
  const u = response && response.usageMetadata ? response.usageMetadata : {};
  const angka = v => Number.isFinite(Number(v)) && v !== null && v !== undefined ? Math.max(0, Math.trunc(Number(v))) : null;
  const adaMetadata = u.promptTokenCount != null || u.candidatesTokenCount != null || u.totalTokenCount != null;
  try {
    await catat({
      layanan: 'analisis',
      model: AI_MODEL,
      input_tokens: angka(u.promptTokenCount),
      output_tokens: angka(u.candidatesTokenCount),
      total_tokens: angka(u.totalTokenCount),
      status: status === 'gagal' ? 'gagal' : (adaMetadata ? 'berhasil' : 'metadata_tidak_tersedia'),
      kode_error: kodeError || null
    });
  } catch (e) {
    console.warn('Pencatatan pemakaian AI dilewati:', e && e.message ? e.message : 'gagal');
  }
}

function buatErrorAI(error) {
  const hasil = new Error(error?.message || 'Kesalahan Gemini tidak diketahui');
  if (error && typeof error === 'object') {
    for (const k of ['code','status','statusCode','geminiInfo','attempts','semuaSementara','permanen','isGeminiFailover','isGeminiGuard']) {
      if (error[k] !== undefined) hasil[k] = error[k];
    }
  }
  return hasil;
}

async function analisisPesan({ pesan, anak, tanggalHariIni, kunciAi, catatPemakaian, pengamanGemini }) {
  // Hapus karakter penanda kurung, tetapi pertahankan teks di dalamnya agar nama tetap terbaca.
  const pesanUntukAnalisis = String(pesan || '').replace(/[\[\](){}（）［］｛｝【】〔〕]/g, ' ');
  const daftarKunci = Array.isArray(kunciAi)
    ? kunciAi.filter(x => x && String(x.api_key || '').trim())
    : (String(kunciAi || '').trim() ? [{ id: null, label: 'API Key sekolah', api_key: String(kunciAi).trim() }] : []);
  if (!daftarKunci.length) {
    const e = new Error('Kunci API AI sekolah belum diisi di menu Pengaturan');
    e.code = 'GEMINI_KEY_EMPTY'; e.permanen = true; e.semuaSementara = false;
    e.isGeminiFailover = true; e.attempts = [{ label: 'Konfigurasi API Key', kode: 'GEMINI_KEY_EMPTY', detail: e.message, permanen: true, sementara: false, perluNotifikasi: true }];
    throw e;
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
            tipe: { type: Type.STRING, enum: ['hari_ini', 'besok', 'lusa', 'nama_hari', 'tanggal', 'lampau'] },
            nama_hari: { type: Type.STRING },
            pekan_depan: { type: Type.BOOLEAN },
            tanggal: { type: Type.INTEGER },
            bulan: { type: Type.INTEGER },
            tahun: { type: Type.INTEGER },
            jumlah_hari: { type: Type.INTEGER },
            // Hari TERAKHIR dari rentang ("sampai hari Rabu"). Diisi hanya jika akhir rentang disebut.
            sampai: {
              type: Type.OBJECT,
              properties: {
                tipe: { type: Type.STRING, enum: ['hari_ini', 'besok', 'lusa', 'nama_hari', 'tanggal'] },
                nama_hari: { type: Type.STRING },
                pekan_depan: { type: Type.BOOLEAN },
                tanggal: { type: Type.INTEGER },
                bulan: { type: Type.INTEGER },
                tahun: { type: Type.INTEGER }
              },
              required: ['tipe']
            }
          },
          required: ['tipe', 'jumlah_hari'],
          additionalProperties: false
        }
      },
      alasan: { type: Type.STRING },
      confidence: { type: Type.NUMBER },
      bahasa: { type: Type.STRING }
    },
    required: ['kategori', 'status', 'siswa_ids', 'daftar_nama', 'waktu', 'alasan', 'confidence', 'bahasa'],
    additionalProperties: false
  };

  const input = {
    tanggal_hari_ini: String(tanggalHariIni || ''),
    pesan_asli: pesanUntukAnalisis,
    anak_wali: daftarAnak(anak)
  };

  const percobaan = [];
  let errorTerakhir = null;

  for (const kunci of daftarKunci) {
    let response = null;
    const label = String(kunci.label || ('Akun Gemini ' + (percobaan.length + 1))).slice(0,60);
    try {
      const ai = new GoogleGenAI({ apiKey: String(kunci.api_key).trim() });
      response = await generateContentDenganPengaman({
        model: AI_MODEL,
        apiKeyId: kunci.id,
        pengamanGemini,
        generate: () => ai.models.generateContent({
          model: AI_MODEL,
          contents: JSON.stringify(input),
          config: {
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: 'application/json',
            responseSchema,
            maxOutputTokens: 512,
            abortSignal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(6000) : undefined
          }
        })
      });

      const content = String(response?.text || '').trim();
      if (!content) {
        const e = new Error('Respons Gemini kosong'); e.code = 'RESPONSE_INVALID'; throw e;
      }
      let hasil;
      try { hasil = JSON.parse(content); }
      catch (_) {
        const e = new Error(`Respons Gemini bukan JSON valid: ${content.slice(0,1000)}`);
        e.code = 'RESPONSE_INVALID'; throw e;
      }

      const hasilAkhir = normalisasi(hasil, anak, pesanUntukAnalisis);
      await simpanPemakaianAI(catatPemakaian, response, 'berhasil', null);
      hasilAkhir.gangguanApiKeys = percobaan.filter(x => x.permanen && x.perluNotifikasi);
      return hasilAkhir;
    } catch (e) {
      const info = e?.geminiInfo || klasifikasiErrorGemini(e);
      const permanen = info.permanen === true;
      let perluNotifikasi = !!info.perluNotifikasi;

      if (!e?.geminiInfo && kunci.id && typeof pengamanGemini?.catatHasilKey === 'function') {
        try {
          perluNotifikasi = await pengamanGemini.catatHasilKey({
            id: Number(kunci.id), model: AI_MODEL, status: 'gagal',
            httpStatus: info.httpStatus || 200, kode: info.kode || 'RESPONSE_INVALID',
            detail: e?.message || String(e), retryAfter: info.retryAfter || null,
            permanen
          });
        } catch (_) {}
      }

      const kodeLog = (info.kode || 'AI_REQUEST_FAILED') + ':' + label;
      if (!e?.isGeminiGuard) await simpanPemakaianAI(catatPemakaian, response, 'gagal', kodeLog);
      percobaan.push({
        key_id: kunci.id || null,
        label,
        http_status: info.httpStatus || null,
        kode: info.kode || 'AI_REQUEST_FAILED',
        detail: String(e?.message || e || 'Kesalahan tidak diketahui').slice(0,500),
        sementara: info.sementara === true,
        retry_after_seconds: info.retryAfter || null,
        permanen,
        perluNotifikasi
      });
      errorTerakhir = e;
    }
  }

  const gagal = new Error('Seluruh API Key Gemini sekolah gagal memproses pesan.');
  gagal.code = 'ALL_GEMINI_KEYS_FAILED';
  gagal.attempts = percobaan;
  gagal.semuaSementara = percobaan.length > 0 && percobaan.every(x => x.sementara);
  gagal.permanen = percobaan.some(x => x.permanen);
  gagal.isGeminiFailover = true;
  gagal.cause = errorTerakhir || null;
  throw buatErrorAI(gagal);
}

module.exports = { analisisPesan };
