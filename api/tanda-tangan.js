// API tanda tangan guru. Semua file berada di bucket privat dan hanya dilayani server.
const L = require('./_lib');
const crypto = require('crypto');

const BUCKET = 'ttd-guru';
const RE_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ROLE_KELOLA = ['kepala_sekolah', 'wakil_kepala', 'pengelola', 'operator'];
const MIME_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const pathAman = (p, id) => typeof p === 'string' && p.startsWith(id + '/') && /^[0-9a-f-]{36}\/[0-9]+-[a-f0-9]{8}\.(png|jpg|webp)$/i.test(p);
const encPath = p => String(p || '').split('/').map(encodeURIComponent).join('/');

async function storage(method, path, body, mime) {
  const r = await fetch(L.SB.replace(/\/+$/, '') + '/storage/v1/object/' + BUCKET + '/' + encPath(path), {
    method,
    headers: {
      apikey: L.KEY,
      Authorization: 'Bearer ' + L.KEY,
      ...(mime ? { 'Content-Type': mime } : {}),
      ...(method === 'POST' ? { 'x-upsert': 'false', 'cache-control': '31536000' } : {})
    },
    body
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    throw new Error('Storage tanda tangan gagal (' + r.status + ')' + (t ? ': ' + t.slice(0, 180) : ''));
  }
  return r;
}
async function anggota(id, sid) {
  const a = await L.panggil('/rest/v1/keanggotaan?profil_id=eq.' + encodeURIComponent(id) +
    '&sekolah_id=eq.' + sid + '&aktif=eq.true&select=role,aktif', 'GET');
  return (a || [])[0] || null;
}
async function anggotaTarget(id, sid) {
  const a = await L.panggil('/rest/v1/keanggotaan?profil_id=eq.' + encodeURIComponent(id) + '&sekolah_id=eq.' + sid + '&select=role,aktif', 'GET');
  return (a || [])[0] || null;
}
async function profil(id) {
  const a = await L.panggil('/rest/v1/profil?id=eq.' + encodeURIComponent(id) + '&select=id,nama,ttd_path,aktif', 'GET');
  return (a || [])[0] || null;
}
async function fileData(path) {
  const r = await storage('GET', path);
  const type = String(r.headers.get('content-type') || 'image/png').split(';')[0];
  if (!MIME_EXT[type]) throw new Error('Format tanda tangan tidak didukung');
  const buf = Buffer.from(await r.arrayBuffer());
  if (!buf.length || buf.length > 524288) throw new Error('Ukuran tanda tangan tidak valid');
  return 'data:' + type + ';base64,' + buf.toString('base64');
}
module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).send('API tanda tangan aktif');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Belum login' });
    const user = await L.panggil('/auth/v1/user', 'GET', null, { Authorization: 'Bearer ' + token });
    const p = await profil(user.id);
    if (!p || !p.aktif) return res.status(403).json({ error: 'Akun tidak aktif atau profil tidak ditemukan' });
    const isDev = (await L.panggil('/rest/v1/profil?id=eq.' + user.id + '&select=role,aktif', 'GET'))[0]?.role === 'developer';
    const b = req.body || {};
    const aksi = String(b.aksi || '');
    const sid = Number(b.sekolah_id);
    const punyaSid = Number.isInteger(sid) && sid > 0;

    if (!['lihat','daftar','ambil','ambil_banyak','simpan','hapus'].includes(aksi))
      return res.status(400).json({ error: 'Aksi tanda tangan tidak dikenal' });

    if (aksi === 'lihat') {
      if (punyaSid && !isDev) {
        const own = await anggota(user.id, sid);
        if (!own) return res.status(403).json({ error: 'Keanggotaan sekolah tidak aktif' });
      }
      const own = await profil(user.id);
      return res.status(200).json({ ok: true, ada: !!(own && own.ttd_path), data: own && own.ttd_path && pathAman(own.ttd_path, user.id) ? await fileData(own.ttd_path) : null });
    }

    const targetId = String(b.id || user.id);
    if (!RE_UUID.test(targetId)) return res.status(400).json({ error: 'ID guru tidak valid' });
    const aksiDeveloperNoSchool = isDev && !punyaSid && ['ambil','simpan','hapus'].includes(aksi);
    if (!punyaSid && !aksiDeveloperNoSchool) return res.status(400).json({ error: 'Sekolah tidak valid' });
    const anggotaSaya = isDev || !punyaSid ? null : await anggota(user.id, sid);
    if (!isDev && !anggotaSaya) return res.status(403).json({ error: 'Anda tidak memiliki akses aktif ke sekolah ini' });
    const bolehKelolaLain = isDev || !!(anggotaSaya && ROLE_KELOLA.includes(anggotaSaya.role));

    if (aksi === 'daftar_dev') {
      if (!isDev) return res.status(403).json({ error: 'Hanya Developer yang boleh' });
      const rows = await L.panggil('/rest/v1/profil?role=neq.developer&select=id,ttd_path&order=nama.asc', 'GET');
      return res.status(200).json({ ok: true, daftar: (rows || []).map(x => ({ id: x.id, ada: !!x.ttd_path })) });
    }

    if (aksi === 'daftar') {
      const rows = await L.panggil('/rest/v1/keanggotaan?sekolah_id=eq.' + sid +
        '&select=profil_id,role,aktif,profil(id,nama,ttd_path)&order=id.asc', 'GET');
      const daftar = (rows || []).filter(x => x.profil).map(x => ({
        id: x.profil_id, ada: !!x.profil.ttd_path, role: x.role
      }));
      return res.status(200).json({ ok: true, daftar });
    }

    if (aksi === 'ambil_banyak') {
      const ids = [...new Set((Array.isArray(b.ids) ? b.ids : []).map(String))];
      if (ids.length > 40 || ids.some(id => !RE_UUID.test(id)))
        return res.status(400).json({ error: 'Daftar guru tidak valid' });
      const rows = await L.panggil('/rest/v1/keanggotaan?sekolah_id=eq.' + sid +
        '&profil_id=in.(' + ids.join(',') + ')&select=profil_id', 'GET');
      const valid = new Set((rows || []).map(x => x.profil_id));
      if (ids.some(id => !valid.has(id))) return res.status(403).json({ error: 'Guru tidak terdaftar di sekolah ini' });
      const out = {};
      await Promise.all(ids.map(async id => {
        const q = await profil(id);
        out[id] = q && q.ttd_path && pathAman(q.ttd_path, id) ? await fileData(q.ttd_path) : null;
      }));
      return res.status(200).json({ ok: true, tanda_tangan: out });
    }

    if (targetId !== user.id && !bolehKelolaLain)
      return res.status(403).json({ error: 'Hanya Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, Operator, atau Developer yang boleh mengelola tanda tangan guru lain' });
    const targetAnggota = punyaSid ? await anggotaTarget(targetId, sid) : null;
    if (punyaSid && !targetAnggota) return res.status(404).json({ error: 'Guru tidak ditemukan atau tidak aktif di sekolah ini' });
    const target = await profil(targetId);
    if (!target) return res.status(404).json({ error: 'Profil guru tidak ditemukan' });

    if (aksi === 'ambil')
      return res.status(200).json({ ok: true, ada: !!target.ttd_path, data: target.ttd_path && pathAman(target.ttd_path, targetId) ? await fileData(target.ttd_path) : null });

    if (aksi === 'simpan') {
      const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.data || ''));
      if (!m) return res.status(400).json({ error: 'File harus berupa PNG, JPG, atau WEBP' });
      const buf = Buffer.from(m[2], 'base64');
      if (!buf.length || buf.length > 524288) return res.status(400).json({ error: 'Ukuran file maksimal 512 KB' });
      const ext = MIME_EXT[m[1]], path = targetId + '/' + Date.now() + '-' + crypto.randomBytes(4).toString('hex') + '.' + ext;
      await storage('POST', path, buf, m[1]);
      try {
        await L.panggil('/rest/v1/profil?id=eq.' + targetId, 'PATCH', { ttd_path: path }, { Prefer: 'return=minimal' });
      } catch (e) {
        await storage('DELETE', path).catch(() => {});
        throw e;
      }
      if (target.ttd_path && pathAman(target.ttd_path, targetId)) await storage('DELETE', target.ttd_path).catch(() => {});
      await L.catatLog({ pelaku: user.id, sekolah_id: punyaSid ? sid : null, aksi: 'tanda_tangan_simpan', rincian: 'Tanda tangan ' + (target.nama || targetId) + (targetId === user.id ? ' diperbarui sendiri' : ' diperbarui pengelola') });
      return res.status(200).json({ ok: true });
    }

    if (aksi === 'hapus') {
      await L.panggil('/rest/v1/profil?id=eq.' + targetId, 'PATCH', { ttd_path: null }, { Prefer: 'return=minimal' });
      if (target.ttd_path && pathAman(target.ttd_path, targetId)) await storage('DELETE', target.ttd_path).catch(() => {});
      await L.catatLog({ pelaku: user.id, sekolah_id: punyaSid ? sid : null, aksi: 'tanda_tangan_hapus', rincian: 'Tanda tangan ' + (target.nama || targetId) + ' dihapus' });
      return res.status(200).json({ ok: true });
    }
    return res.status(400).json({ error: 'Aksi tidak valid' });
  } catch (e) {
    console.error('api/tanda-tangan:', e && e.message);
    return res.status(500).json({ error: (e && e.message) || 'Terjadi kendala saat mengelola tanda tangan' });
  }
};
