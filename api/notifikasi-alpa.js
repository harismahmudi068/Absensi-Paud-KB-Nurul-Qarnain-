// ============================================================
// NOTIFIKASI ALPA OTOMATIS
// Supabase -> Vercel -> Fonnte -> WhatsApp Admin
// ============================================================

// ============================================================
// TUJUAN NOTIFIKASI
// Nomor kepala sekolah dan token Fonnte diatur per sekolah di menu Pengaturan > Koneksi
// (tabel pengaturan_rahasia). Masa transisi: FONNTE_TOKEN lama hanya cadangan untuk sekolah pertama.
// ============================================================
const SEKOLAH_PERTAMA = 1;

// ============================================================
// ENVIRONMENT VARIABLES
// ============================================================
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENV_FONNTE = process.env.FONNTE_TOKEN || '';
const ALPA_SECRET = process.env.ALPA_NOTIF_SECRET;


// ============================================================
// FUNGSI SUPABASE
// ============================================================
async function supabase(path, options = {}) {
  const {
    method = 'GET',
    body,
    prefer
  } = options;

  const headers = {
    apikey: KEY,
    Authorization: 'Bearer ' + KEY,
    'Content-Type': 'application/json'
  };

  if (prefer) {
    headers.Prefer = prefer;
  }

  const response = await fetch(
    `${SB}/rest/v1/${path}`,
    {
      method,
      headers,
      body: body !== undefined
        ? JSON.stringify(body)
        : undefined
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `Supabase ${response.status}: ${text}`
    );
  }

  return text ? JSON.parse(text) : null;
}


// ============================================================
// VALIDASI KONFIGURASI
// ============================================================
function cekKonfigurasi() {
  if (!SB) {
    throw new Error('SUPABASE_URL belum dikonfigurasi di Vercel');
  }

  if (!KEY) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di Vercel'
    );
  }

  if (!ALPA_SECRET) {
    throw new Error(
      'ALPA_NOTIF_SECRET belum dikonfigurasi di Vercel'
    );
  }

}


// ============================================================
// FORMAT TANGGAL
// ============================================================
function formatTanggal(tanggal) {
  if (!tanggal) return '';

  return new Date(`${tanggal}T00:00:00+07:00`)
    .toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Jakarta'
    });
}


// ============================================================
// KIRIM WHATSAPP MELALUI FONNTE
// ============================================================
async function kirimFonnte(token, nomorTujuan, teks) {

  const response = await fetch(
    'https://api.fonnte.com/send',
    {
      method: 'POST',
      headers: {
        Authorization: token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: nomorTujuan,
        message: teks
      })
    }
  );

  const hasil = await response.json().catch(() => ({}));

  if (!response.ok || hasil.status === false) {
    throw new Error(
      hasil.reason ||
      hasil.message ||
      'Fonnte menolak pengiriman pesan'
    );
  }

  return hasil;
}


// ============================================================
// UPDATE STATUS NOTIFIKASI
// ============================================================
async function updateNotifikasi(id, data) {

  await supabase(
    `notifikasi_alpa?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      body: data,
      prefer: 'return=minimal'
    }
  );
}


// ============================================================
// ENDPOINT
// ============================================================
module.exports = async (req, res) => {

  // ----------------------------------------------------------
  // GET = TES ENDPOINT
  // ----------------------------------------------------------
  if (req.method === 'GET') {

    return res.status(200).json({
      ok: true,
      service: 'notifikasi-alpa',
      message: 'Endpoint notifikasi Alpa aktif'
    });
  }


  // ----------------------------------------------------------
  // HANYA POST
  // ----------------------------------------------------------
  if (req.method !== 'POST') {

    return res.status(405).json({
      ok: false,
      error: 'Metode tidak diizinkan'
    });
  }


  let id = null;

  try {

    cekKonfigurasi();


    // --------------------------------------------------------
    // CEK SECRET DARI SUPABASE
    // --------------------------------------------------------
    const secret =
      String(
        req.headers['x-alpa-secret'] || ''
      ).trim();

    if (!secret || secret !== ALPA_SECRET) {

      return res.status(401).json({
        ok: false,
        error: 'Tidak diizinkan'
      });
    }


    // --------------------------------------------------------
    // DATA DARI SUPABASE
    // --------------------------------------------------------
    const body = req.body || {};

    id = body.id
      ? String(body.id)
      : null;

    const teks = String(
      body.teks || ''
    ).trim();

    const tanggal = String(
      body.tanggal || ''
    ).trim();


    if (!id) {

      return res.status(400).json({
        ok: false,
        error: 'ID notifikasi tidak ada'
      });
    }


    if (!teks) {

      return res.status(400).json({
        ok: false,
        error: 'Pesan kosong'
      });
    }


    // --------------------------------------------------------
    // CEK DATA NOTIFIKASI DI SUPABASE
    // --------------------------------------------------------
    const data = await supabase(
      `notifikasi_alpa?id=eq.${encodeURIComponent(id)}&select=id,sekolah_id,tanggal,pesan,status,percobaan,terkirim,terakhir_error`
    );


    if (!data || !data.length) {

      return res.status(404).json({
        ok: false,
        error: 'Notifikasi tidak ditemukan'
      });
    }


    const notif = data[0];


    // --------------------------------------------------------
    // JIKA SUDAH TERKIRIM, JANGAN KIRIM ULANG
    // --------------------------------------------------------
    if (
      notif.status === 'sent' ||
      notif.terkirim
    ) {

      return res.status(200).json({
        ok: true,
        duplicate: true,
        message: 'Notifikasi sudah pernah terkirim'
      });
    }


    // --------------------------------------------------------
    // TAMBAH JUMLAH PERCOBAAN
    // --------------------------------------------------------
    const percobaan =
      Number(notif.percobaan || 0) + 1;


    await updateNotifikasi(id, {
      status: 'processing',
      percobaan,
      terakhir_error: null
    });


    // --------------------------------------------------------
    // KIRIM WHATSAPP
    // --------------------------------------------------------
    const sekolahId = Number(notif.sekolah_id);
    const rahasia = (await supabase(
      `pengaturan_rahasia?sekolah_id=eq.${sekolahId}&select=token_fonnte,nomor_kepala`
    ) || [])[0] || {};

    const token = rahasia.token_fonnte ||
      (sekolahId === SEKOLAH_PERTAMA ? ENV_FONNTE : '');
    const nomorTujuan = String(rahasia.nomor_kepala || '').replace(/\D/g, '');

    if (!token) {
      throw new Error('Token Fonnte sekolah belum diisi di Pengaturan > Koneksi');
    }
    if (!/^628\d{8,12}$/.test(nomorTujuan)) {
      throw new Error('Nomor kepala sekolah belum diisi atau tidak valid di Pengaturan > Koneksi');
    }

    await kirimFonnte(token, nomorTujuan, teks);


    // --------------------------------------------------------
    // BERHASIL
    // --------------------------------------------------------
    await updateNotifikasi(id, {
      status: 'sent',
      terkirim: new Date().toISOString(),
      terakhir_error: null
    });


    return res.status(200).json({
      ok: true,
      sent: true,
      id,
      tanggal
    });


  } catch (error) {

    console.error(
      'NOTIFIKASI ALPA ERROR:',
      error
    );


    // --------------------------------------------------------
    // JIKA ID SUDAH TERSEDIA, SIMPAN ERROR
    // --------------------------------------------------------
    if (id) {

      try {

        await updateNotifikasi(id, {
          status: 'failed',
          terakhir_error: String(
            error.message || error
          ).slice(0, 500)
        });

      } catch (updateError) {

        console.error(
          'Gagal menyimpan error notifikasi:',
          updateError
        );
      }
    }


    return res.status(500).json({
      ok: false,
      error: String(
        error.message || error
      )
    });
  }
};
