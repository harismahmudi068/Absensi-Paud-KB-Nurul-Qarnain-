// Fungsi server: kirim laporan kehadiran ke WhatsApp orang tua lewat Fonnte.
// Butuh Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FONNTE_TOKEN.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FONNTE = process.env.FONNTE_TOKEN;

async function sb(path, token) {
  const h = { apikey: KEY };
  h.Authorization = 'Bearer ' + (token || KEY);
  const r = await fetch(SB + path, { headers: h });
  if (!r.ok) throw new Error('Sesi tidak valid');
  return r.json();
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).send(FONNTE ? 'API kirim aktif' : 'API kirim belum dikonfigurasi (FONNTE_TOKEN kosong)');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Belum login' });
    const user = await sb('/auth/v1/user', token);
    const p = (await sb(`/rest/v1/profil?id=eq.${user.id}&select=aktif`))[0];
    if (!p || !p.aktif) return res.status(403).json({ error: 'Akun tidak aktif' });
    if (!FONNTE) return res.status(500).json({ error: 'FONNTE_TOKEN belum diisi di Vercel' });
    const b = req.body || {};
    const nomor = String(b.nomor || '').replace(/\D/g, '');
    const teks = String(b.teks || '');
    if (!/^628\d{8,12}$/.test(nomor)) return res.status(400).json({ error: 'Nomor tidak valid' });
    if (!teks) return res.status(400).json({ error: 'Pesan kosong' });
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: FONNTE, 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: nomor, message: teks })
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.status === false) return res.status(502).json({ error: j.reason || 'Fonnte menolak pesan' });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
