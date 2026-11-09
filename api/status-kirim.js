// Fungsi server: menerima KABAR STATUS pesan keluar dari Fonnte (webhook status) dan
// memperbarui tabel kirim_log. TIDAK pernah membalas siapa pun dan tidak menyentuh data lain.
//
// Alamat: /api/status-kirim?key=<kunci Webhook sekolah> (kunci SAMA dengan /api/webhook).
// Kabar status yang masuk ke /api/webhook juga dialihkan ke sini oleh webhook.js.
//
// Fonnte mengirim tiga bentuk kabar:
//   1. id + stateid -> status (dan state) pesan itu
//   2. id saja      -> status pesan itu
//   3. stateid saja -> state pesan itu (kabar lanjutan)
// Nilai asli dari Fonnte disimpan apa adanya (status_fonnte, state_fonnte).
//
// Jam tiap tahap (centang) disimpan per pesan: waktu_terkirim (sent / state 2),
// waktu_sampai (delivered / state 3), waktu_terbaca (read / state 4). Jam = saat server menerima kabar.
// Tiap jam diisi SEKALI. Kabar yang datang terlambat (tahapnya lebih rendah dari yang sudah tersimpan,
// mis. state 2 setelah read) tidak menimpa state, tidak mengubah jam, dan tidak menurunkan tanda.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB}/rest/v1/${path}`, {
    method, headers, body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`Supabase ${r.status}: ${t}`);
  return t ? JSON.parse(t) : null;
}

async function cariSekolahId(kunci) {
  if (!kunci) return null;
  const rows = await sb(`pengaturan_rahasia?webhook_kunci=eq.${encodeURIComponent(kunci)}&select=sekolah_id`);
  return Array.isArray(rows) && rows[0] ? rows[0].sekolah_id : null;
}

// Tingkat tahap: 1 terkirim (sent / 2), 2 sampai (delivered / 3), 3 terbaca (read / 4); 0 = belum atau tidak dikenal.
function tingkat(nilai) {
  const v = String(nilai === undefined || nilai === null ? '' : nilai).toLowerCase().trim();
  if (v === 'read' || v === '4') return 3;
  if (v === 'delivered' || v === '3') return 2;
  if (v === 'sent' || v === '2') return 1;
  return 0;
}

// Arti nilai Fonnte -> status di riwayat. null = tidak mengubah status (menunggu, belum dikenal).
function petaStatus(status, state) {
  const s = String(status || '').toLowerCase().trim();
  const t = String(state || '').toLowerCase().trim();
  if (t === '0') return { status: 'gagal', error: 'Tidak sampai ke penerima (dibatasi WhatsApp)' };
  if (['sent', 'delivered', 'read'].includes(s)) return { status: 'terkirim' };
  if (['invalid', 'expired', 'failed', 'fail', 'error', 'rejected'].includes(s)) return { status: 'gagal', error: 'Fonnte: ' + s };
  if (Math.max(tingkat(s), tingkat(t)) >= 1) return { status: 'terkirim' };   // kabar lanjutan tanpa status (delivered/read/state angka)
  return null;
}

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));
const teks = (x) => (x === undefined || x === null ? '' : String(x).trim());

async function terapkan(sekolahId, b) {
  const id = teks(b.id);
  const stateid = teks(b.stateid);
  const status = teks(b.status);
  const state = teks(b.state);
  if (!id && !stateid) return;

  const saring = id ? `fonnte_id=eq.${encodeURIComponent(id)}` : `stateid=eq.${encodeURIComponent(stateid)}`;
  const cari = () => sb(`kirim_log?sekolah_id=eq.${sekolahId}&${saring}&select=id,status,stateid,status_fonnte,state_fonnte,waktu_terkirim,waktu_sampai,waktu_terbaca`);

  let rows = (await cari()) || [];
  if (!rows.length) {            // kabar kadang tiba sebelum riwayat tersimpan
    await tunggu(2000);
    rows = (await cari()) || [];
  }
  if (!rows.length) return;      // bukan pesan dari sistem ini (mis. balasan webhook): abaikan

  const peta = petaStatus(status, state);
  const tahap = Math.max(tingkat(status), tingkat(state));
  for (const row of rows) {
    const sekarang = new Date().toISOString();
    const tersimpan = Math.max(
      tingkat(row.status_fonnte), tingkat(row.state_fonnte),
      row.waktu_terbaca ? 3 : row.waktu_sampai ? 2 : row.waktu_terkirim ? 1 : 0
    );
    // Kabar lama yang datang terlambat (mis. state 2 sesudah read): jangan timpa. state 0 (gagal) selalu diterapkan.
    const mundur = state !== '0' && tahap < tersimpan;
    const patch = { diubah: sekarang };
    if (id && stateid) patch.stateid = stateid;
    if (!mundur) {
      if (status) patch.status_fonnte = status;
      if (state) patch.state_fonnte = state;
      if (tahap === 1 && !row.waktu_terkirim) patch.waktu_terkirim = sekarang;
      if (tahap === 2 && !row.waktu_sampai) patch.waktu_sampai = sekarang;
      if (tahap === 3 && !row.waktu_terbaca) patch.waktu_terbaca = sekarang;
    }
    if (peta) {
      if (peta.status === 'gagal') { patch.status = 'gagal'; patch.error = peta.error; }
      else if (peta.status === 'terkirim' && row.status !== 'gagal') { patch.status = 'terkirim'; patch.error = null; }
    }
    await sb(`kirim_log?id=eq.${row.id}`, { method: 'PATCH', body: patch, prefer: 'return=minimal' });
  }
}

function normalBody(raw) {
  let b = raw;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = {}; } }
  const o = {};
  if (b && typeof b === 'object') for (const [k, v] of Object.entries(b)) o[String(k).toLowerCase()] = v;
  return o;
}

module.exports = async (req, res) => {
  const kunci = String((req.query && req.query.key) || '').trim();

  if (req.method !== 'POST') {
    if (!kunci) return res.status(200).send('Status webhook aktif');
    try {
      return res.status(200).send((await cariSekolahId(kunci)) ? 'Kunci cocok' : 'Kunci salah');
    } catch (e) {
      console.error('Cek kunci status gagal:', e);
      return res.status(200).send('Kunci tidak dapat diperiksa');
    }
  }

  let sekolahId;
  try { sekolahId = await cariSekolahId(kunci); }
  catch (e) { console.error('Status kirim: gagal memuat sekolah:', e); return res.status(200).json({ ok: false }); }
  if (!sekolahId) return res.status(401).send('Tidak diizinkan');

  try { await terapkan(sekolahId, normalBody(req.body)); }
  catch (e) { console.error('Status kirim error:', e); }

  return res.status(200).json({ ok: true });
};
