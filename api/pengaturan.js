// Fungsi server: pengaturan rahasia per sekolah (kunci AI, token Fonnte,
// ID grup, nomor kepala sekolah) dan alamat Webhook WhatsApp.
// Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Boleh dipakai oleh Kepala Sekolah sekolah itu atau Developer.
// Aksi: baca, simpan (kunci AI dan nomor kepala sekolah),
//       token_tambah, token_hapus, grup_tambah, grup_hapus (banyak token Fonnte dan ID grup per sekolah),
//       tes_fonnte, tes_ai (kirim pesan tes ke nomor Kepala Sekolah),
//       webhook (butuh sandi), buat_ulang_webhook (butuh sandi)

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
const AI_MODEL = 'gemini-3.5-flash-lite';

// Kirim satu pesan lewat Fonnte; mengembalikan { ok, alasan }
async function kirimFonnte(token, target, pesan) {
  try {
    const r = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ target: String(target), message: pesan })
    });
    const t = await r.text();
    let j = {};
    try { j = JSON.parse(t); } catch (_) {}
    if (!r.ok) return { ok: false, alasan: j.reason || 'HTTP ' + r.status };
    if (j.status === false) return { ok: false, alasan: j.reason || 'Ditolak Fonnte' };
    return { ok: true };
  } catch (e) {
    return { ok: false, alasan: e.message };
  }
}

// Tes kunci Gemini dengan satu permintaan singkat
async function tesGemini(kunci) {
  const ac = new AbortController();
  const waktu = setTimeout(() => ac.abort(), 15000);
  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': kunci },
        body: JSON.stringify({ contents: [{ parts: [{ text: 'Balas hanya dengan satu kata: OK' }] }] }),
        signal: ac.signal
      }
    );
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error((j.error && j.error.message) || 'HTTP ' + r.status);
    const bagian = (((j.candidates || [])[0] || {}).content || {}).parts || [];
    return String((bagian[0] && bagian[0].text) || 'OK').trim().slice(0, 60);
  } catch (e) {
    throw new Error('Tes AI gagal: ' + (e.name === 'AbortError' ? 'waktu habis' : e.message));
  } finally {
    clearTimeout(waktu);
  }
}

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
  return `https://${host}/api/webhook?key=${kunci}`;
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
      if (!m || !m.aktif || !['kepala_sekolah','wakil_kepala'].includes(m.role))
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

    const ambilToken = async () =>
      (await panggil(
        `/rest/v1/fonnte_token?sekolah_id=eq.${sekolahId}&select=id,label,token,perangkat&order=id.asc`,
        'GET'
      )) || [];
    const ambilGrup = async () =>
      (await panggil(
        `/rest/v1/grup_wa?sekolah_id=eq.${sekolahId}&select=id,grup_id,label,token_id&order=id.asc`,
        'GET'
      )) || [];
    const namaSekolah = async () => {
      const x = await panggil(`/rest/v1/sekolah?id=eq.${sekolahId}&select=nama`, 'GET');
      return (x && x[0] && x[0].nama) || 'Sekolah';
    };

    // ---------------------------------------------------------
    // BACA
    // ---------------------------------------------------------
    if (b.aksi === 'baca') {
      const [r, tk, gp] = await Promise.all([ambil(), ambilToken(), ambilGrup()]);
      const tampil = !!b.tampilkan && isDev;
      if (tampil) await catat(user.id, sekolahId, 'lihat_rahasia', 'kunci AI dan token Fonnte');
      return res.status(200).json({
        ok: true,
        kunci_ai: { ada: !!r.kunci_ai, tampil: samar(r.kunci_ai), nilai: tampil ? r.kunci_ai || '' : undefined },
        tokens: tk.map((t) => ({
          id: t.id,
          label: t.label,
          perangkat: t.perangkat || '',
          tampil: samar(t.token),
          nilai: tampil ? t.token : undefined
        })),
        grup: gp.map((g) => ({ id: g.id, grup_id: g.grup_id, label: g.label || '', token_id: g.token_id })),
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

      // Token Fonnte dan ID grup diatur lewat aksi token_tambah / grup_tambah (boleh banyak).

      if (b.nomor_kepala !== undefined) {
        const n = normWA(b.nomor_kepala);
        if (String(b.nomor_kepala || '').trim() && !RE_WA.test(n))
          throw new Error('Nomor kepala sekolah tidak valid');
        isi.nomor_kepala = String(b.nomor_kepala || '').trim() ? n : null;
        diubah.push('nomor_kepala');
      }

      if (Array.isArray(b.hapus)) {
        for (const f of b.hapus) {
          if (f === 'kunci_ai') {
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
    // TOKEN FONNTE (boleh banyak per sekolah)
    // ---------------------------------------------------------
    if (b.aksi === 'token_tambah') {
      const tokenF = String(b.token || '').trim();
      if (tokenF.length < 6 || /\s/.test(tokenF)) throw new Error('Token Fonnte tidak valid');
      const label = String(b.label || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      const perangkat = String(b.perangkat || '').trim() ? normWA(b.perangkat) : null;
      if (perangkat && !RE_WA.test(perangkat)) throw new Error('Nomor perangkat tidak valid');
      const ada = await ambilToken();
      if (ada.length >= 10) throw new Error('Maksimal 10 token Fonnte per sekolah');
      try {
        await panggil(
          '/rest/v1/fonnte_token',
          'POST',
          { sekolah_id: sekolahId, label: label || 'Token ' + (ada.length + 1), token: tokenF, perangkat },
          { Prefer: 'return=minimal' }
        );
      } catch (e) {
        if (/duplicate|unique|already/i.test(e.message)) throw new Error('Token ini sudah terdaftar');
        throw e;
      }
      await catat(user.id, sekolahId, 'token_fonnte_tambah', label || null);
      return res.status(200).json({ ok: true });
    }

    if (b.aksi === 'token_hapus') {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error('Token tidak valid');
      await panggil(`/rest/v1/fonnte_token?id=eq.${id}&sekolah_id=eq.${sekolahId}`, 'DELETE');
      await catat(user.id, sekolahId, 'token_fonnte_hapus', String(id));
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // ID GRUP WHATSAPP (boleh banyak per sekolah)
    // ---------------------------------------------------------
    if (b.aksi === 'grup_tambah') {
      const gid = String(b.grup_id || '').trim();
      if (!RE_GRUP.test(gid))
        throw new Error('ID grup tidak valid. Contoh: 120363410620341838@g.us');
      const label = String(b.label || '').replace(/\s+/g, ' ').trim().slice(0, 40);
      let tokenId = null;
      if (b.token_id !== null && b.token_id !== undefined && b.token_id !== '') {
        tokenId = Number(b.token_id);
        const tk = await ambilToken();
        if (!Number.isInteger(tokenId) || !tk.some((t) => t.id === tokenId))
          throw new Error('Token tidak ditemukan');
      }
      const ada = await ambilGrup();
      if (ada.length >= 40) throw new Error('Maksimal 40 ID grup per sekolah');
      try {
        await panggil(
          '/rest/v1/grup_wa',
          'POST',
          { sekolah_id: sekolahId, grup_id: gid, label: label || null, token_id: tokenId },
          { Prefer: 'return=minimal' }
        );
      } catch (e) {
        if (/duplicate|unique|already/i.test(e.message)) throw new Error('ID grup ini sudah terdaftar');
        throw e;
      }
      await catat(user.id, sekolahId, 'grup_wa_tambah', label || gid);
      return res.status(200).json({ ok: true });
    }

    if (b.aksi === 'grup_hapus') {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error('Grup tidak valid');
      await panggil(`/rest/v1/grup_wa?id=eq.${id}&sekolah_id=eq.${sekolahId}`, 'DELETE');
      await catat(user.id, sekolahId, 'grup_wa_hapus', String(id));
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // TES TOKEN FONNTE dan API AI (pesan tes ke nomor Kepala Sekolah)
    // ---------------------------------------------------------
    if (b.aksi === 'tes_fonnte') {
      const id = Number(b.id);
      const t = (await ambilToken()).find((x) => x.id === id);
      if (!t) throw new Error('Token tidak ditemukan');
      const r = await ambil();
      const tujuan = String(r.nomor_kepala || '');
      if (!RE_WA.test(tujuan))
        throw new Error('Isi nomor Kepala Sekolah lalu simpan dulu sebelum tes');
      const h = await kirimFonnte(
        t.token,
        tujuan,
        `✅ *TES TOKEN FONNTE*\nSekolah: ${await namaSekolah()}\nToken: ${t.label}\n\nPesan ini dikirim dari menu Pengaturan > Konfigurasi.`
      );
      await catat(user.id, sekolahId, 'tes_fonnte', `${t.label}: ${h.ok ? 'berhasil' : h.alasan}`);
      if (!h.ok) throw new Error('Tes gagal: ' + h.alasan);
      return res.status(200).json({ ok: true, pesan: 'Pesan tes terkirim ke nomor Kepala Sekolah' });
    }

    if (b.aksi === 'tes_ai') {
      const r = await ambil();
      if (!r.kunci_ai) throw new Error('Kunci API AI belum diisi');
      const balasan = await tesGemini(r.kunci_ai);
      let tambahan = '';
      const tujuan = String(r.nomor_kepala || '');
      const tk = await ambilToken();
      if (tk.length && RE_WA.test(tujuan)) {
        const h = await kirimFonnte(
          tk[0].token,
          tujuan,
          `✅ *TES API AI*\nSekolah: ${await namaSekolah()}\nBalasan AI: ${balasan}\n\nPesan ini dikirim dari menu Pengaturan > Konfigurasi.`
        );
        tambahan = h.ok
          ? ' Pesan tes dikirim ke nomor Kepala Sekolah.'
          : ' Pesan WhatsApp gagal dikirim: ' + h.alasan;
      } else {
        tambahan = ' (Pesan WhatsApp tidak dikirim: belum ada token atau nomor Kepala Sekolah.)';
      }
      await catat(user.id, sekolahId, 'tes_ai', 'berhasil');
      return res.status(200).json({ ok: true, pesan: 'API AI berfungsi. Balasan: ' + balasan + '.' + tambahan });
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
