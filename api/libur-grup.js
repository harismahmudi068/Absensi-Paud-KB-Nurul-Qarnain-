// Antrean notifikasi libur ke grup WhatsApp per kelas.
// Token Fonnte hanya dibaca di server. Endpoint cron dipanggil setiap menit.
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CRON_SECRET = process.env.ALPA_NOTIF_SECRET;

function headers(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...extra };
  if (KEY && KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY;
  return h;
}
async function db(path, method='GET', body, extra={}) {
  const r = await fetch(SB + path, {
    method, headers: headers(extra),
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const raw = await r.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch (_) { data = { message: raw }; }
  if (!r.ok) throw new Error((data && (data.message || data.msg || data.error)) || ('Supabase HTTP ' + r.status));
  return data;
}
const enc = v => encodeURIComponent(String(v));
const todayWIB = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const timeWIB = () => new Date().toLocaleTimeString('en-GB', { timeZone: 'Asia/Jakarta', hour12: false }).slice(0,5);
const atWIB = (date, time) => new Date(date + 'T' + time + ':00+07:00');
const randomGap = () => 30000 + Math.floor(Math.random() * 30001);
const HARI = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const BULAN = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function tanggalID(date) {
  const [tahun, bulan, hari] = String(date).split('-').map(Number);
  const d = new Date(Date.UTC(tahun, bulan - 1, hari));
  return HARI[d.getUTCDay()] + ', ' + String(hari).padStart(2,'0') + ' ' + BULAN[bulan - 1] + ' ' + tahun;
}
function pesanLibur({ sekolah, tanggal, kelas, jenis, alasan, masuk }) {
  const daftar = [...new Set(kelas || [])].filter(Boolean).join(', ') || 'Seluruh kelas';
  const barisAlasan = alasan ? '\n📝 Keterangan: *' + alasan + '*' : '';
  const barisMasuk = masuk ? '\n📚 Masuk kembali: *' + tanggalID(masuk) + '*' :
    '\n📚 Kegiatan belajar mengajar kembali dilaksanakan sesuai jadwal yang berlaku.';
  const judul = jenis === 'nasional' ? 'INFORMASI LIBUR NASIONAL' : 'INFORMASI LIBUR SEKOLAH';
  const pembuka = jenis === 'nasional'
    ? 'Dalam rangka memperingati *' + (alasan || 'Hari Libur Nasional') + '*, kami informasikan bahwa kegiatan belajar mengajar pada:'
    : 'Kami informasikan bahwa kegiatan belajar mengajar pada:';
  return '🌸 *' + judul + '*\n\n' +
    'Assalamu’alaikum warahmatullahi wabarakatuh.\n\n' +
    'Yth. Bapak/Ibu Wali Murid,\n\n' +
    '📢 ' + pembuka + '\n\n' +
    '📅 Hari/Tanggal: *' + tanggalID(tanggal) + '*\n\n' +
    '🏫 Kelas yang diliburkan: *' + daftar + '*' +
    (jenis === 'nasional' ? '' : barisAlasan) +
    '\n\nKegiatan belajar mengajar pada kelas tersebut diliburkan.' +
    barisMasuk + '\n\n' +
    'Terima kasih atas perhatian, pengertian, dan kerja sama Bapak/Ibu. 😊\n\n' +
    'Wassalamu’alaikum warahmatullahi wabarakatuh.\n\n' +
    '🏫 *' + sekolah + '*';
}
async function authUser(req) {
  const bearer = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!bearer) throw Object.assign(new Error('Belum login'), { status: 401 });
  const u = await db('/auth/v1/user', 'GET', undefined, { Authorization: 'Bearer ' + bearer });
  return u;
}
async function anggotaAktif(userId, sekolahId) {
  const rows = await db('/rest/v1/keanggotaan?profil_id=eq.' + enc(userId) +
    '&sekolah_id=eq.' + enc(sekolahId) + '&aktif=eq.true&select=role');
  return rows && rows[0];
}
async function pengaturanSekolah(sekolahId) {
  const rows = await db('/rest/v1/pengaturan?sekolah_id=eq.' + enc(sekolahId) +
    '&select=nama_sekolah,notif_libur_grup_jam');
  const s = rows && rows[0] || {};
  return { nama: s.nama_sekolah || '', jam: String(s.notif_libur_grup_jam || '05:00').slice(0,5) };
}
async function namaSekolah(sekolahId, fallback) {
  const s = await db('/rest/v1/sekolah?id=eq.' + enc(sekolahId) + '&select=nama');
  return (s && s[0] && s[0].nama) || fallback || 'Sekolah';
}
async function relasiGrup(sekolahId, kelasIds) {
  if (!kelasIds.length) return [];
  const map = await db('/rest/v1/kelas_grup_wa?sekolah_id=eq.' + enc(sekolahId) +
    '&kelas_id=in.(' + kelasIds.map(enc).join(',') + ')&select=kelas_id,grup_wa_id');
  if (!map || !map.length) return [];
  const groupIds = [...new Set(map.map(x => x.grup_wa_id))];
  const groups = await db('/rest/v1/grup_wa?sekolah_id=eq.' + enc(sekolahId) +
    '&id=in.(' + groupIds.map(enc).join(',') + ')&select=id,grup_id,label,token_id');
  const byId = new Map((groups || []).map(g => [String(g.id), g]));
  const classNames = await db('/rest/v1/kelas?sekolah_id=eq.' + enc(sekolahId) +
    '&id=in.(' + kelasIds.map(enc).join(',') + ')&select=id,nama');
  const nameById = new Map((classNames || []).map(k => [String(k.id), k.nama]));
  const grouped = new Map();
  for (const m of map) {
    const g = byId.get(String(m.grup_wa_id));
    if (!g) continue;
    const k = nameById.get(String(m.kelas_id));
    if (!k) continue;
    const key = String(g.id);
    if (!grouped.has(key)) grouped.set(key, { group: g, kelas_ids: [], kelas_nama: [] });
    const row = grouped.get(key);
    if (!row.kelas_ids.includes(m.kelas_id)) row.kelas_ids.push(m.kelas_id);
    if (!row.kelas_nama.includes(k)) row.kelas_nama.push(k);
  }
  return [...grouped.values()];
}
async function tokenUntuk(sekolahId, group) {
  let rows;
  if (group.token_id) {
    rows = await db('/rest/v1/fonnte_token?sekolah_id=eq.' + enc(sekolahId) +
      '&id=eq.' + enc(group.token_id) + '&select=id,token&limit=1');
  } else {
    rows = await db('/rest/v1/fonnte_token?sekolah_id=eq.' + enc(sekolahId) +
      '&select=id,token&order=id.asc&limit=1');
  }
  return rows && rows[0] || null;
}
async function buatAntrean({ sekolahId, tanggal, jenis, kelasIds, alasan, masuk, refId, batchKey, jadwal }) {
  const validIds = [...new Set((kelasIds || []).map(Number).filter(Number.isInteger))];
  if (!validIds.length) return { dibuat: 0, tanpaPemetaan: 0 };
  const [relasi, cfg] = await Promise.all([relasiGrup(sekolahId, validIds), pengaturanSekolah(sekolahId)]);
  const sekolah = await namaSekolah(sekolahId, cfg.nama);
  if (!relasi.length) return { dibuat: 0, tanpaPemetaan: validIds.length };
  const rows = relasi.map((r, i) => ({
    sekolah_id: sekolahId,
    grup_wa_id: r.group.id,
    token_id: r.group.token_id || null,
    target: r.group.grup_id,
    tanggal,
    jenis,
    ref_libur_id: refId || null,
    batch_key: batchKey,
    kelas_ids: r.kelas_ids,
    kelas_nama: r.kelas_nama,
    pesan: pesanLibur({ sekolah, tanggal, kelas: r.kelas_nama, jenis, alasan, masuk }),
    status: 'menunggu',
    jadwal_pada: new Date(jadwal.getTime() + (i ? Array.from({length:i}, randomGap).reduce((a,b)=>a+b,0) : 0)).toISOString()
  }));
  const inserted = await db('/rest/v1/notifikasi_libur_grup?on_conflict=sekolah_id,grup_wa_id,tanggal,jenis,batch_key',
    'POST', rows, { Prefer: 'resolution=ignore-duplicates,return=representation' });
  return { dibuat: (inserted || []).length, tanpaPemetaan: 0 };
}
async function siapkanLiburHariIni() {
  const tanggal = todayWIB();
  const sekolahRows = await db('/rest/v1/sekolah?status=eq.aktif&select=id,nama');
  let total = 0;
  const nasional = await db('/rest/v1/libur_nasional?tanggal=eq.' + enc(tanggal) + '&select=tanggal,keterangan');
  for (const sekolah of (sekolahRows || [])) {
    const cfg = await pengaturanSekolah(sekolah.id);
    if (timeWIB() < cfg.jam) continue;
    const kelas = await db('/rest/v1/kelas?sekolah_id=eq.' + enc(sekolah.id) + '&aktif=eq.true&select=id,nama');
    if (!kelas || !kelas.length) continue;
    if (nasional && nasional.length) {
      const alasan = nasional[0].keterangan || 'Hari Libur Nasional';
      const r = await buatAntrean({
        sekolahId: sekolah.id, tanggal, jenis: 'nasional',
        kelasIds: kelas.map(k=>k.id), alasan, masuk: null, refId: null,
        batchKey: 'nasional-' + tanggal, jadwal: new Date()
      });
      total += r.dibuat;
    }
    const khusus = await db('/rest/v1/libur_tanggal?sekolah_id=eq.' + enc(sekolah.id) +
      '&mulai=eq.' + enc(tanggal) + '&select=id,kelas_id,keterangan,masuk_kembali');
    for (const libur of (khusus || [])) {
      const kelasIds = libur.kelas_id ? [libur.kelas_id] : kelas.map(k=>k.id);
      const r = await buatAntrean({
        sekolahId: sekolah.id, tanggal, jenis: 'sekolah', kelasIds,
        alasan: libur.keterangan || '', masuk: libur.masuk_kembali || null,
        refId: libur.id, batchKey: 'sekolah-' + libur.id + '-' + tanggal,
        jadwal: new Date()
      });
      total += r.dibuat;
    }
  }
  return total;
}
async function prosesSatu() {
  const rows = await db('/rest/v1/rpc/ambil_notifikasi_libur_grup', 'POST', {});
  const item = rows && rows[0];
  if (!item) return { diproses: false };
  try {
    const t = await tokenUntuk(item.sekolah_id, { token_id: item.token_id });
    if (!t || !t.token) throw new Error('Token Fonnte untuk grup ini tidak ditemukan');
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: t.token, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ target: item.target, message: item.pesan })
    });
    const raw = await r.text();
    let j = {}; try { j = raw ? JSON.parse(raw) : {}; } catch (_) {}
    if (!r.ok || j.status === false) throw new Error(j.reason || ('Fonnte HTTP ' + r.status));
    await db('/rest/v1/notifikasi_libur_grup?id=eq.' + enc(item.id) + '&status=eq.mengirim',
      'PATCH', { status: 'terkirim', fonnte_id: j.id || j.detail || null, error: null,
        terkirim: new Date().toISOString(), diubah: new Date().toISOString() },
      { Prefer: 'return=minimal' });
    return { diproses: true, status: 'terkirim', id: item.id };
  } catch (e) {
    await db('/rest/v1/notifikasi_libur_grup?id=eq.' + enc(item.id) + '&status=eq.mengirim',
      'PATCH', { status: 'gagal', error: String(e.message || e).slice(0,500), diubah: new Date().toISOString() },
      { Prefer: 'return=minimal' });
    return { diproses: true, status: 'gagal', id: item.id, error: e.message || String(e) };
  }
}
module.exports = async (req, res) => {
  if (!SB || !KEY) return res.status(500).json({ error: 'Konfigurasi server belum lengkap' });
  try {
    if (req.method === 'GET') {
      const auth = String(req.headers['x-libur-secret'] || '');
      if (!CRON_SECRET || auth !== CRON_SECRET)
        return res.status(401).json({ error: 'Cron tidak diizinkan' });
      const dibuat = await siapkanLiburHariIni();
      const hasil = await prosesSatu();
      return res.status(200).json({ ok: true, antreanBaru: dibuat, hasil });
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
    const body = req.body || {};
    const user = await authUser(req);
    const sekolahId = Number(body.sekolah_id);
    if (!Number.isInteger(sekolahId) || sekolahId <= 0)
      return res.status(400).json({ error: 'Sekolah tidak valid' });
    const anggota = await anggotaAktif(user.id, sekolahId);
    if (!anggota || !['kepala_sekolah','wakil_kepala','pengelola','operator','guru'].includes(anggota.role))
      return res.status(403).json({ error: 'Anda bukan anggota aktif sekolah ini' });

    if (body.aksi === 'antrikan_manual') {
      const tanggal = String(body.tanggal || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ error: 'Tanggal tidak valid' });
      const today = todayWIB();
      if (tanggal < today) return res.status(200).json({ ok: true, dilewati: true, alasan: 'Tanggal sudah lewat' });
      const kelasIds = [...new Set((body.kelas_ids || []).map(Number).filter(Number.isInteger))];
      if (!kelasIds.length) return res.status(400).json({ error: 'Kelas tidak dipilih' });
      const kelas = await db('/rest/v1/kelas?sekolah_id=eq.' + enc(sekolahId) +
        '&id=in.(' + kelasIds.map(enc).join(',') + ')&select=id');
      if (!kelas || kelas.length !== kelasIds.length) return res.status(403).json({ error: 'Ada kelas yang bukan milik sekolah ini' });
      const cfg = await pengaturanSekolah(sekolahId);
      const jadwal = tanggal === today ? new Date() : atWIB(tanggal, cfg.jam);
      const key = String(body.batch_key || '');
      if (!/^[A-Za-z0-9_-]{8,80}$/.test(key)) return res.status(400).json({ error: 'Kunci antrean tidak valid' });
      const hasil = await buatAntrean({ sekolahId, tanggal, jenis: 'manual', kelasIds,
        alasan: '', masuk: null, refId: null, batchKey: key, jadwal });
      let kirim = null;
      if (tanggal === today && hasil.dibuat) kirim = await prosesSatu();
      return res.status(200).json({ ok: true, ...hasil, kirim });
    }
    if (body.aksi === 'batalkan_libur') {
      const refId = Number(body.ref_id);
      if (!Number.isInteger(refId) || refId <= 0) return res.status(400).json({ error: 'Referensi libur tidak valid' });
      await db('/rest/v1/notifikasi_libur_grup?sekolah_id=eq.' + enc(sekolahId) +
        '&ref_libur_id=eq.' + enc(refId) + '&status=eq.menunggu', 'PATCH',
        { status: 'dibatalkan', diubah: new Date().toISOString() }, { Prefer: 'return=minimal' });
      return res.status(200).json({ ok: true });
    }
    if (body.aksi === 'ulang_gagal') {
      const id = Number(body.id);
      if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Notifikasi tidak valid' });
      const rows = await db('/rest/v1/notifikasi_libur_grup?id=eq.' + enc(id) +
        '&sekolah_id=eq.' + enc(sekolahId) + '&status=eq.gagal&select=id');
      if (!rows || !rows.length) return res.status(404).json({ error: 'Hanya notifikasi gagal yang dapat dicoba ulang' });
      await db('/rest/v1/notifikasi_libur_grup?id=eq.' + enc(id) +
        '&sekolah_id=eq.' + enc(sekolahId) + '&status=eq.gagal', 'PATCH',
        { status: 'menunggu', jadwal_pada: new Date().toISOString(), error: null, diubah: new Date().toISOString() },
        { Prefer: 'return=minimal' });
      const hasil = await prosesSatu();
      return res.status(200).json({ ok: true, hasil });
    }
    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('libur-grup.js', e);
    return res.status(e.status || 400).json({ error: e.message || String(e) });
  }
};
