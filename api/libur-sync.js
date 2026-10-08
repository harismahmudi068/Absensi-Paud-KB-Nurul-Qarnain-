// api/libur-sync.js
// Sinkron libur nasional + cuti bersama BULAN BERJALAN ke semua sekolah aktif.
// - Cron Vercel (GET, Authorization: Bearer CRON_SECRET): jalan sekali per bulan.
// - Developer (POST, token login role developer): ?dry=1 = simulasi saja.
import { timingSafeEqual } from 'crypto';

const BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON = process.env.CRON_SECRET || '';
const H = { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json' };

const pad = n => String(n).padStart(2, '0');
const norm = s => { const m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? m[1] + '-' + pad(m[2]) + '-' + pad(m[3]) : ''; };
const hariKe = t => new Date(t + 'T00:00:00Z').getUTCDay(); // 0 = Minggu (sama dengan extract(dow))

async function rest(path, opt = {}) {
  const r = await fetch(BASE + '/rest/v1/' + path, { ...opt, headers: { ...H, ...(opt.headers || {}) } });
  const t = await r.text();
  if (!r.ok) throw new Error(path.split('?')[0] + ' ' + r.status + ' ' + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
async function semua(path) { // halaman 1000 baris
  let out = [];
  for (let i = 0; ; i += 1000) {
    const rows = await rest(path, { headers: { 'Range-Unit': 'items', Range: i + '-' + (i + 999) } });
    out = out.concat(rows || []);
    if (!rows || rows.length < 1000) return out;
  }
}
function samaRahasia(a, b) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}
async function otorisasi(req) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  if (CRON && samaRahasia(token, CRON)) return 'cron';
  const r = await fetch(BASE + '/auth/v1/user', { headers: { apikey: KEY, Authorization: 'Bearer ' + token } });
  if (!r.ok) return null;
  const u = await r.json();
  const p = await rest('profil?id=eq.' + encodeURIComponent(u.id) + '&select=role,aktif');
  return p && p[0] && p[0].role === 'developer' && p[0].aktif ? 'developer' : null;
}

export default async function handler(req, res) {
  try {
    if (!BASE || !KEY) return res.status(500).json({ error: 'SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY belum diatur' });
    const peran = await otorisasi(req);
    if (!peran) return res.status(401).json({ error: 'Tidak diizinkan' });
    const dry = !!(req.query && req.query.dry === '1');

    const wib = new Date(Date.now() + 7 * 3600e3);
    const tahun = wib.getUTCFullYear();
    const bulan = tahun + '-' + pad(wib.getUTCMonth() + 1);
    const awal = bulan + '-01';
    const akhir = new Date(Date.UTC(tahun, wib.getUTCMonth() + 1, 0)).toISOString().slice(0, 10);
    const hariIni = wib.toISOString().slice(0, 10);

    if (peran === 'cron') {
      const s = await rest('libur_sinkron?bulan=eq.' + bulan + '&select=bulan');
      if (s && s.length) return res.status(200).json({ lewati: true, bulan });
    }

    // 1. Daftar libur (nasional + cuti bersama). Gagal / tidak lengkap = berhenti, tidak ada yang diubah.
    const ar = await fetch('https://api-harilibur.vercel.app/api?year=' + tahun);
    if (!ar.ok) throw new Error('API libur gagal (' + ar.status + ')');
    const data = await ar.json();
    if (!Array.isArray(data) || data.length < 5) throw new Error('Data libur dari API tidak lengkap, sinkron dibatalkan');
    const nama = new Map();
    for (const h of data) {
      const t = norm(h.holiday_date);
      if (!t || t < awal || t > akhir) continue;
      const ada = nama.get(t);
      nama.set(t, ada && ada !== h.holiday_name ? ada + ' / ' + h.holiday_name : h.holiday_name);
    }

    // 2. Data sekolah
    const ids = (await semua('sekolah?status=eq.aktif&select=id&order=id')).map(s => s.id);
    const [mingRows, nasRows, manRows] = await Promise.all([
      semua('libur_mingguan?select=sekolah_id,hari&order=sekolah_id,hari'),
      semua('libur_tanggal?sumber=eq.nasional&select=id,sekolah_id,mulai,keterangan&order=id'),
      semua('libur_tanggal?sumber=is.null&kelas_id=is.null&mulai=lte.' + akhir + '&sampai=gte.' + awal + '&select=sekolah_id,mulai,sampai&order=sekolah_id,mulai')
    ]);
    const grup = (rows, f) => { const m = new Map(); rows.forEach(r => { if (!m.has(r.sekolah_id)) m.set(r.sekolah_id, []); m.get(r.sekolah_id).push(f ? f(r) : r); }); return m; };
    const ming = grup(mingRows, r => r.hari), nas = grup(nasRows), man = grup(manRows);

    // 3. Selisih per sekolah
    const tambah = [], ubah = [], hapus = [], bersih = [], tglUbah = new Set();
    for (const sid of ids) {
      const hariLibur = new Set(ming.get(sid) || []);
      const manual = man.get(sid) || [];
      const target = new Map();
      for (const [t, ket] of nama) {
        if (hariLibur.has(hariKe(t))) continue;                       // sudah libur mingguan
        if (manual.some(m => m.mulai <= t && t <= m.sampai)) continue; // sudah libur "Semua" buatan sekolah
        target.set(t, ket);
      }
      const sudah = new Set();
      for (const row of nas.get(sid) || []) {
        if (row.mulai < awal) { bersih.push(row.id); continue; }       // bulan lalu: dibersihkan
        if (row.mulai > akhir) continue;
        if (!target.has(row.mulai)) { hapus.push(row.id); tglUbah.add(row.mulai); }
        else {
          if (row.keterangan !== target.get(row.mulai)) { ubah.push({ id: row.id, keterangan: target.get(row.mulai) }); tglUbah.add(row.mulai); }
          sudah.add(row.mulai);
        }
      }
      for (const [t, ket] of target) {
        if (!sudah.has(t)) { tambah.push({ sekolah_id: sid, mulai: t, sampai: t, kelas_id: null, keterangan: ket, sumber: 'nasional' }); tglUbah.add(t); }
      }
    }
    const ringkas = { bulan, sekolah: ids.length, tambah: tambah.length, ubah: ubah.length, hapus: hapus.length, bersih: bersih.length };
    if (dry) return res.status(200).json({ ...ringkas, dry: true });

    // 4. Tulis
    const min = { Prefer: 'return=minimal' };
    for (let i = 0; i < tambah.length; i += 500)
      await rest('libur_tanggal', { method: 'POST', headers: min, body: JSON.stringify(tambah.slice(i, i + 500)) });
    for (const u of ubah)
      await rest('libur_tanggal?id=eq.' + u.id, { method: 'PATCH', headers: min, body: JSON.stringify({ keterangan: u.keterangan }) });
    const buang = hapus.concat(bersih);
    for (let i = 0; i < buang.length; i += 200)
      await rest('libur_tanggal?id=in.(' + buang.slice(i, i + 200).join(',') + ')', { method: 'DELETE', headers: min });
    await rest('libur_sinkron', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ bulan, waktu: new Date().toISOString(), ringkas }) });

    // 5. Bentuk status Libur hari ini. Dari tombol developer di siang hari dilewati bila libur hari ini ikut
    //    berubah, karena segarkan_libur_data menghapus absensi lain di hari libur.
    let peringatan = '';
    if (peran === 'developer' && tglUbah.has(hariIni)) {
      peringatan = 'Libur hari ini ikut berubah. Status Libur di absensi tidak diproses sekarang agar absensi yang sudah masuk tidak terhapus; jadwal tetap berlaku.';
    } else {
      try { await rest('rpc/segarkan_libur_data', { method: 'POST', body: '{}' }); }
      catch (e) { peringatan = 'Libur tersimpan, tetapi pembaruan status gagal: ' + e.message; }
    }
    return res.status(200).json({ ...ringkas, peringatan });
  } catch (e) {
    return res.status(500).json({ error: String(e.message || e) });
  }
}
