// Fungsi server: pengaturan rahasia per sekolah (kunci AI, token Fonnte,
// ID grup, nomor kepala sekolah) dan alamat Webhook WhatsApp.
// Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Boleh dipakai oleh Kepala Sekolah sekolah itu atau Developer.
// Aksi: baca, simpan, webhook (butuh sandi), buat_ulang_webhook (butuh sandi)

const crypto = require('crypto');

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RE_WA = /^628\d{8,12}$/;
const RE_GRUP = /^[0-9]+(-[0-9]+)?@g\.us$/;

function kepala(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...extra };
  if (KEY && KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY;
  return h;
}

async function panggil(path, method, body, extra) {
  const r = await fetch(SB + path, {
    method,
    headers: kepala(extra),
    body: body ? JSON.stringify(body) : undefined
  });
  const t = await r.text();
  let j = null;
  try {
    j = t ? JSON.parse(t) : null;
  } catch (e) {
    j = { pesan: t };
  }
  if (!r.ok) {
    throw new Error(
      (j && (j.msg || j.message || j.error_description || j.pesan)) ||
        'Kesalahan ' + r.status
    );
  }
  return j;
}

function normWA(n) {
  let d = String(n || '').replace(/\D/g, '');
  if (d[0] === '0') d = '62' + d.slice(1);
  else if (d[0] === '8') d = '62' + d;
  return d;
}

const samar = (v) => (v ? '••••' + String(v).slice(-4) : null);

async function catat(pelaku, sekolahId, aksi, rincian) {
  try {
    await panggil(
      '/rest/v1/log_audit',
      'POST',
      { pelaku, sekolah_id: sekolahId, aksi, rincian: rincian || null },
      { Prefer: 'return=minimal' }
    );
  } catch (e) {
    console.error('log_audit gagal:', e.message);
  }
}

async function sandiBenar(email, sandi) {
  try {
    await panggil('/auth/v1/token?grant_type=password', 'POST', {
      email,
      password: String(sandi || '')
    });
    return true;
  } catch (e) {
    return false;
  }
}

function urlWebhook(req, kunci) {
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  return `https://${host}/api/Webhook?key=${kunci}`;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!SB || !KEY)
      return res
        .status(200)
        .send('API pengaturan belum dikonfigurasi (Environment Variables kosong)');
    return res.status(200).send('API pengaturan aktif');
  }
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' });

  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Belum login' });

    const user = await panggil('/auth/v1/user', 'GET', null, {
      Authorization: 'Bearer ' + token
    });

    const p = await panggil(
      `/rest/v1/profil?id=eq.${user.id}&select=role,aktif`,
      'GET'
    );
    const pemanggil = p && p[0];
    if (!pemanggil || !pemanggil.aktif)
      return res.status(403).json({ error: 'Akun tidak aktif' });

    const isDev = pemanggil.role === 'developer';
    const b = req.body || {};

    const sekolahId = Number(b.sekolah_id);
    if (!Number.isInteger(sekolahId) || sekolahId <= 0)
      return res.status(400).json({ error: 'Sekolah tidak valid' });

    if (!isDev) {
      const k = await panggil(
        `/rest/v1/keanggotaan?profil_id=eq.${user.id}&sekolah_id=eq.${sekolahId}&select=role,aktif`,
        'GET'
      );
      const m = k && k[0];
      if (!m || !m.aktif || m.role !== 'kepala_sekolah')
        return res.status(403).json({
          error: 'Hanya Kepala Sekolah sekolah ini atau Developer yang boleh'
        });
    }

    const ambil = async () => {
      const r = await panggil(
        `/rest/v1/pengaturan_rahasia?sekolah_id=eq.${sekolahId}&select=*`,
        'GET'
      );
      return (r && r[0]) || {};
    };

    // ---------------------------------------------------------
    // BACA
    // ---------------------------------------------------------
    if (b.aksi === 'baca') {
      const r = await ambil();
      const tampil = !!b.tampilkan && isDev;
      if (tampil) await catat(user.id, sekolahId, 'lihat_rahasia', 'kunci AI dan token Fonnte');
      return res.status(200).json({
        ok: true,
        kunci_ai: { ada: !!r.kunci_ai, tampil: samar(r.kunci_ai), nilai: tampil ? r.kunci_ai || '' : undefined },
        token_fonnte: { ada: !!r.token_fonnte, tampil: samar(r.token_fonnte), nilai: tampil ? r.token_fonnte || '' : undefined },
        id_grup: r.id_grup || '',
        nomor_kepala: r.nomor_kepala || ''
      });
    }

    // ---------------------------------------------------------
    // SIMPAN
    // ---------------------------------------------------------
    if (b.aksi === 'simpan') {
      const isi = {};
      const diubah = [];

      const kunciAi = String(b.kunci_ai || '').trim();
      if (kunciAi) {
        if (kunciAi.length < 10 || /\s/.test(kunciAi)) throw new Error('Kunci AI tidak valid');
        isi.kunci_ai = kunciAi;
        diubah.push('kunci_ai');
      }

      const tokenF = String(b.token_fonnte || '').trim();
      if (tokenF) {
        if (tokenF.length < 6 || /\s/.test(tokenF)) throw new Error('Token Fonnte tidak valid');
        isi.token_fonnte = tokenF;
        diubah.push('token_fonnte');
      }

      if (b.id_grup !== undefined) {
        const g = String(b.id_grup || '').trim();
        if (g && !RE_GRUP.test(g))
          throw new Error('ID grup tidak valid. Contoh: 120363410620341838@g.us');
        isi.id_grup = g || null;
        diubah.push('id_grup');
      }

      if (b.nomor_kepala !== undefined) {
        const n = normWA(b.nomor_kepala);
        if (String(b.nomor_kepala || '').trim() && !RE_WA.test(n))
          throw new Error('Nomor kepala sekolah tidak valid');
        isi.nomor_kepala = String(b.nomor_kepala || '').trim() ? n : null;
        diubah.push('nomor_kepala');
      }

      if (Array.isArray(b.hapus)) {
        for (const f of b.hapus) {
          if (['kunci_ai', 'token_fonnte'].includes(f)) {
            isi[f] = null;
            if (!diubah.includes(f)) diubah.push(f);
          }
        }
      }

      if (!Object.keys(isi).length)
        return res.status(200).json({ ok: true, tidak_ada_perubahan: true });

      isi.sekolah_id = sekolahId;
      isi.diubah = new Date().toISOString();

      await panggil('/rest/v1/pengaturan_rahasia?on_conflict=sekolah_id', 'POST', isi, {
        Prefer: 'resolution=merge-duplicates,return=minimal'
      });
      await catat(user.id, sekolahId, 'ubah_pengaturan_rahasia', diubah.join(', '));
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // WEBHOOK (butuh sandi akun)
    // ---------------------------------------------------------
    if (b.aksi === 'webhook' || b.aksi === 'buat_ulang_webhook') {
      if (!(await sandiBenar(user.email, b.sandi)))
        return res.status(403).json({ error: 'Kata sandi salah' });

      if (b.aksi === 'buat_ulang_webhook') {
        const baru = crypto.randomBytes(32).toString('hex');
        await panggil('/rest/v1/pengaturan_rahasia?on_conflict=sekolah_id', 'POST', {
          sekolah_id: sekolahId,
          webhook_kunci: baru,
          diubah: new Date().toISOString()
        }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
        await catat(user.id, sekolahId, 'buat_ulang_webhook', null);
        return res.status(200).json({ ok: true, url: urlWebhook(req, baru) });
      }

      let r = await ambil();
      if (!r.webhook_kunci) {
        // Sekolah belum punya baris: biarkan database membuat kunci bawaan
        await panggil('/rest/v1/pengaturan_rahasia?on_conflict=sekolah_id', 'POST', {
          sekolah_id: sekolahId
        }, { Prefer: 'resolution=merge-duplicates,return=minimal' });
        r = await ambil();
      }
      await catat(user.id, sekolahId, 'lihat_webhook', null);
      return res.status(200).json({ ok: true, url: urlWebhook(req, r.webhook_kunci) });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('pengaturan.js', e);
    return res.status(400).json({ error: e.message });
  }
};
