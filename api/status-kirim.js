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

// Arti nilai Fonnte -> status di riwayat. null = tidak mengubah status (menunggu, belum dikenal).
function petaStatus(status, state) {
  const s = String(status || '').toLowerCase().trim();
  const t = String(state || '').toLowerCase().trim();
  if (t === '0') return { status: 'gagal', error: 'Tidak sampai ke penerima (dibatasi WhatsApp)' };
  if (['sent', 'delivered', 'read'].includes(s)) return { status: 'terkirim' };
  if (['invalid', 'expired', 'failed', 'fail', 'error', 'rejected'].includes(s)) return { status: 'gagal', error: 'Fonnte: ' + s };
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
  const cari = () => sb(`kirim_log?sekolah_id=eq.${sekolahId}&${saring}&select=id,status,stateid`);

  let rows = (await cari()) || [];
  if (!rows.length) {            // kabar kadang tiba sebelum riwayat tersimpan
    await tunggu(2000);
    rows = (await cari()) || [];
  }
  if (!rows.length) return;      // bukan pesan dari sistem ini (mis. balasan webhook): abaikan

  const peta = petaStatus(status, state);
  for (const row of rows) {
    const patch = { diubah: new Date().toISOString() };
    if (id && stateid) patch.stateid = stateid;
    if (status) patch.status_fonnte = status;
    if (state) patch.state_fonnte = state;
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
