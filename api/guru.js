// Fungsi server akun guru (multi-sekolah).
// Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Aksi untuk Kepala Sekolah / Wakil Kepala Sekolah sekolah itu atau Developer (wajib kirim sekolah_id):
//   otp_kelola_kirim, otp_kelola_verifikasi (bukti kepemilikan: OTP ke nomor pengelola sendiri)
//   cek_nomor, tautkan, tambah, tambah_batch (wajib izin dari OTP, kecuali Developer)
//   ubah_role, aktif, hapus
// Aksi untuk pemilik akun sendiri: akun_sendiri, nomor_otp_kirim, nomor_simpan, otp_cek
// Ganti Kepala Sekolah: Kepala Sekolah lama, Wakil, atau Developer; kepala lama otomatis menjadi Guru
// (fungsi database ganti_kepala_sekolah, satu transaksi).
// Aksi khusus Developer:
//   reset (atur sandi baru), hapus_akun (hapus akun seluruhnya)
// Aksi untuk pemilik akun sendiri (semua pengguna aktif):
//   akun_sendiri (ganti username dan/atau sandi, wajib sandi saat ini)

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const crypto = require('crypto');
const { kirimOtp, cekOtp, lihatOtp, ipDari } = require('./_lib');

const RE_UUID = /^[0-9a-f-]{36}$/i;
const RE_USER = /^[a-z0-9._-]{3,20}$/;
const RE_WA = /^628\d{8,12}$/;
const ROLE_SEKOLAH = ['guru', 'wakil_kepala', 'kepala_sekolah'];
const ROLE_PENGELOLA = ['kepala_sekolah', 'wakil_kepala'];
const IZIN_MENIT = 15;

// Izin singkat setelah OTP pengelola benar (dipakai tambah guru dan impor)
function tandaTangan(teks) {
  return crypto
    .createHmac('sha256', process.env.OTP_RAHASIA || KEY || '')
    .update(teks)
    .digest('hex');
}
function izinBuat(uid, sid) {
  const p = `${uid}.${sid}.${Date.now() + IZIN_MENIT * 60000}`;
  return p + '.' + tandaTangan('izin:' + p);
}
function izinCek(token, uid, sid) {
  const a = String(token || '').split('.');
  if (a.length !== 4) throw new Error('Verifikasi kode diperlukan. Minta kode ke nomor WhatsApp Anda');
  const p = a.slice(0, 3).join('.');
  const b1 = Buffer.from(tandaTangan('izin:' + p), 'hex');
  const b2 = Buffer.from(a[3], 'hex');
  const sah = b1.length === b2.length && crypto.timingSafeEqual(b1, b2);
  if (!sah || a[0] !== uid || Number(a[1]) !== Number(sid) || Number(a[2]) < Date.now())
    throw new Error('Verifikasi kode sudah berakhir. Minta kode baru');
}
const PESAN_USER =
  'Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah';

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

function pesanDuplikat(e) {
  return /already|registered|exists|duplicate|unique/i.test(e.message || '');
}

// ---------------------------------------------------------------
// Pembantu data
// ---------------------------------------------------------------
async function cariProfilByWA(wa) {
  const r = await panggil(
    `/rest/v1/profil?no_wa=eq.${encodeURIComponent(wa)}&select=id,nama,aktif`,
    'GET'
  );
  return (r && r[0]) || null;
}

async function ambilKeanggotaan(profilId, sekolahId) {
  const r = await panggil(
    `/rest/v1/keanggotaan?profil_id=eq.${profilId}&sekolah_id=eq.${sekolahId}&select=id,role,aktif`,
    'GET'
  );
  return (r && r[0]) || null;
}

async function adaKepalaLain(sekolahId, kecualiProfilId) {
  const r =
    (await panggil(
      `/rest/v1/keanggotaan?sekolah_id=eq.${sekolahId}&role=eq.kepala_sekolah&aktif=eq.true&select=profil_id`,
      'GET'
    )) || [];
  return r.some((x) => x.profil_id !== kecualiProfilId);
}

// Kepala lama menjadi Guru dan guru terpilih menjadi Kepala Sekolah dalam satu transaksi database.
async function jadikanKepala(sekolahId, profilId, olehId) {
  try {
    await panggil('/rest/v1/rpc/ganti_kepala_sekolah', 'POST', {
      p_sekolah: sekolahId,
      p_baru: profilId,
      p_oleh: olehId
    });
  } catch (e) {
    throw new Error('Gagal mengganti Kepala Sekolah: ' + e.message);
  }
}

async function tambahKeanggotaan(profilId, sekolahId, role) {
  await panggil(
    '/rest/v1/keanggotaan',
    'POST',
    { profil_id: profilId, sekolah_id: sekolahId, role, aktif: true },
    { Prefer: 'return=minimal' }
  );
}

// Buat akun baru (Auth + profil) lalu keanggotaan di sekolah.
// role 'developer' hanya boleh dibuat Developer dan tidak punya keanggotaan.
async function buatAkun({ username, nama, nip, sandi, role, no_wa, sekolahId }) {
  const baru = await panggil('/auth/v1/admin/users', 'POST', {
    email: username + '@absensi.local',
    password: sandi,
    email_confirm: true,
    user_metadata: { nama }
  });

  let profilDibuat = false;
  try {
    await panggil(
      '/rest/v1/profil',
      'POST',
      {
        id: baru.id,
        nama,
        username,
        role,
        aktif: true,
        no_wa: no_wa || null,
        nip: nip || null
      },
      { Prefer: 'return=minimal' }
    );
    profilDibuat = true;
    if (role !== 'developer') await tambahKeanggotaan(baru.id, sekolahId, role);
  } catch (e) {
    if (profilDibuat) {
      try {
        await panggil(`/rest/v1/profil?id=eq.${baru.id}`, 'DELETE');
      } catch (_) {}
    }
    try {
      await panggil('/auth/v1/admin/users/' + baru.id, 'DELETE');
    } catch (_) {}
    const m = e.message || '';
    if (/no_wa/i.test(m) && pesanDuplikat(e))
      throw new Error('Nomor WhatsApp sudah dipakai akun lain');
    throw new Error(pesanDuplikat(e) ? 'Username sudah dipakai' : m);
  }
  return baru.id;
}

function periksaDataAkun(x, { wajibWA }) {
  const username = String(x.username || '').trim().toLowerCase();
  const nama = String(x.nama || '').trim();
  const nip = String(x.nip || '').trim();
  const sandi = String(x.sandi || '');
  const role = String(x.role || 'guru');
  const no_wa = x.no_wa ? normWA(x.no_wa) : '';

  if (!RE_USER.test(username)) throw new Error(PESAN_USER);
  if (!nama) throw new Error('Nama wajib diisi');
  if (sandi.length < 6) throw new Error('Kata sandi minimal 6 karakter');
  if (![...ROLE_SEKOLAH, 'developer'].includes(role))
    throw new Error('Role tidak valid');
  if (wajibWA && !no_wa) throw new Error('Nomor WhatsApp wajib diisi');
  if (no_wa && !RE_WA.test(no_wa)) throw new Error('Nomor WhatsApp tidak valid');

  return { username, nama, nip, sandi, role, no_wa };
}

// ---------------------------------------------------------------
module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!SB || !KEY)
      return res
        .status(200)
        .send('API guru belum dikonfigurasi (Environment Variables kosong)');
    return res.status(200).send('API guru aktif');
  }
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' });

  try {
    // 1. Login
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Belum login' });

    const user = await panggil('/auth/v1/user', 'GET', null, {
      Authorization: 'Bearer ' + token
    });

    const p = await panggil(
      `/rest/v1/profil?id=eq.${user.id}&select=role,aktif,username,no_wa`,
      'GET'
    );
    const pemanggil = p && p[0];
    if (!pemanggil || !pemanggil.aktif)
      return res.status(403).json({ error: 'Akun tidak aktif' });

    const isDev = pemanggil.role === 'developer';
    const b = req.body || {};

    // =============================================================
    // AKUN SENDIRI (semua pengguna aktif)
    // =============================================================
    if (b.aksi === 'akun_sendiri') {
      const usernameBaru = String(b.username || '').trim().toLowerCase();
      const sandiBaru = String(b.sandi_baru || '');

      if (!RE_USER.test(usernameBaru)) throw new Error(PESAN_USER);
      if (sandiBaru && sandiBaru.length < 6)
        throw new Error('Kata sandi minimal 6 karakter');

      // Wajib sandi saat ini
      try {
        await panggil('/auth/v1/token?grant_type=password', 'POST', {
          email: user.email,
          password: String(b.sandi_sekarang || '')
        });
      } catch (e) {
        throw new Error('Kata sandi saat ini salah');
      }

      const perubahan = {};
      const usernameLama = pemanggil.username;
      if (usernameBaru !== usernameLama) {
        const ada = await panggil(
          `/rest/v1/profil?username=eq.${encodeURIComponent(usernameBaru)}&select=id`,
          'GET'
        );
        if (ada && ada.length && ada[0].id !== user.id)
          throw new Error('Username sudah dipakai');
        perubahan.email = usernameBaru + '@absensi.local';
        perubahan.email_confirm = true;
      }
      if (sandiBaru) perubahan.password = sandiBaru;

      if (!Object.keys(perubahan).length) return res.status(200).json({ ok: true });

      await panggil('/auth/v1/admin/users/' + user.id, 'PUT', perubahan);

      if (perubahan.email) {
        try {
          await panggil(`/rest/v1/profil?id=eq.${user.id}`, 'PATCH', { username: usernameBaru }, {
            Prefer: 'return=minimal'
          });
        } catch (e) {
          // Kembalikan email agar login tidak rusak
          try {
            await panggil('/auth/v1/admin/users/' + user.id, 'PUT', {
              email: usernameLama + '@absensi.local',
              email_confirm: true
            });
          } catch (_) {}
          throw new Error(pesanDuplikat(e) ? 'Username sudah dipakai' : e.message);
        }
      }
      return res.status(200).json({ ok: true });
    }

    // =============================================================
    // CEK KODE (tombol Verifikasi): tidak menghanguskan kode
    // =============================================================
    if (b.aksi === 'otp_cek') {
      const jenis = String(b.jenis || '');
      if (!['ganti_baru', 'ganti_lama', 'kelola_guru'].includes(jenis))
        throw new Error('Permintaan tidak valid');
      const tujuan = jenis === 'ganti_baru' ? normWA(b.no_wa_baru) : pemanggil.no_wa || '';
      if (!RE_WA.test(tujuan)) throw new Error('Nomor WhatsApp tidak valid');
      await lihatOtp(tujuan, jenis, b.kode);
      return res.status(200).json({ ok: true });
    }

    // =============================================================
    // GANTI NOMOR WHATSAPP SENDIRI (OTP ke nomor lama dan nomor baru)
    // =============================================================
    if (b.aksi === 'nomor_otp_kirim' || b.aksi === 'nomor_simpan') {
      const baru = normWA(b.no_wa_baru);
      if (!RE_WA.test(baru)) throw new Error('Nomor WhatsApp baru tidak valid');
      const lama = pemanggil.no_wa || '';
      if (baru === lama) throw new Error('Nomor baru sama dengan nomor sekarang');

      if (b.aksi === 'nomor_otp_kirim') {
        try {
          await panggil('/auth/v1/token?grant_type=password', 'POST', {
            email: user.email,
            password: String(b.sandi_sekarang || '')
          });
        } catch (e) {
          throw new Error('Kata sandi saat ini salah');
        }
        const ada = await cariProfilByWA(baru);
        if (ada && ada.id !== user.id) throw new Error('Nomor WhatsApp sudah dipakai akun lain');
        const ip = ipDari(req);
        await kirimOtp({ nomor: baru, keperluan: 'ganti_baru', ip, pembuka: 'Kode untuk menautkan nomor ini ke akun absensi Anda' });
        if (lama)
          await kirimOtp({ nomor: lama, keperluan: 'ganti_lama', ip, pembuka: 'Kode untuk mengganti nomor WhatsApp akun absensi Anda' });
        return res.status(200).json({ ok: true, perlu_kode_lama: !!lama });
      }

      await cekOtp(baru, 'ganti_baru', b.kode_baru);
      if (lama) await cekOtp(lama, 'ganti_lama', b.kode_lama);
      try {
        await panggil(`/rest/v1/profil?id=eq.${user.id}`, 'PATCH', { no_wa: baru }, { Prefer: 'return=minimal' });
      } catch (e) {
        throw new Error(pesanDuplikat(e) ? 'Nomor WhatsApp sudah dipakai akun lain' : e.message);
      }
      return res.status(200).json({ ok: true });
    }

    // =============================================================
    // AKSI KHUSUS DEVELOPER (tanpa sekolah_id)
    // =============================================================
    if (b.aksi === 'reset' || b.aksi === 'hapus_akun') {
      if (!isDev)
        return res.status(403).json({ error: 'Hanya Developer yang boleh' });
      const id = String(b.id || '');
      if (!RE_UUID.test(id)) return res.status(400).json({ error: 'ID tidak valid' });

      if (b.aksi === 'reset') {
        const sandi = String(b.sandi || '');
        if (sandi.length < 6)
          return res.status(400).json({ error: 'Kata sandi minimal 6 karakter' });
        await panggil('/auth/v1/admin/users/' + id, 'PUT', { password: sandi });
        return res.status(200).json({ ok: true });
      }

      if (id === user.id)
        return res.status(400).json({ error: 'Tidak bisa menghapus akun sendiri' });
      const tp = (await panggil(`/rest/v1/profil?id=eq.${id}&select=role`, 'GET')) || [];
      if (tp[0] && tp[0].role === 'developer')
        return res.status(400).json({ error: 'Akun Developer tidak dapat dihapus dari sini' });
      const aktifDi =
        (await panggil(`/rest/v1/keanggotaan?profil_id=eq.${id}&aktif=eq.true&select=sekolah_id`, 'GET')) || [];
      if (aktifDi.length)
        return res.status(400).json({
          error: 'Guru ini masih aktif di ' + aktifDi.length + ' sekolah. Nonaktifkan atau keluarkan dulu dari semua sekolah'
        });
      await panggil(`/rest/v1/profil?id=eq.${id}`, 'DELETE');
      await panggil('/auth/v1/admin/users/' + id, 'DELETE');
      return res.status(200).json({ ok: true });
    }

    // =============================================================
    // AKSI SEKOLAH: Kepala Sekolah sekolah itu atau Developer
    // =============================================================
    const sekolahId = Number(b.sekolah_id);
    if (!Number.isInteger(sekolahId) || sekolahId <= 0)
      return res.status(400).json({ error: 'Sekolah tidak valid' });

    if (!isDev) {
      const k = await ambilKeanggotaan(user.id, sekolahId);
      if (!k || !k.aktif || !ROLE_PENGELOLA.includes(k.role))
        return res
          .status(403)
          .json({ error: 'Hanya Kepala Sekolah atau Wakil Kepala Sekolah sekolah ini, atau Developer, yang boleh' });
    }

    // ---------- OTP pengelola (bukti kepemilikan) ----------
    if (b.aksi === 'otp_kelola_kirim' || b.aksi === 'otp_kelola_verifikasi') {
      if (isDev) return res.status(200).json({ ok: true, izin: izinBuat(user.id, sekolahId) });
      const nomorSaya = pemanggil.no_wa || '';
      if (!RE_WA.test(nomorSaya))
        throw new Error('Isi nomor WhatsApp Anda dulu di Data Guru > Ubah profil saya > Nomor WhatsApp');
      if (b.aksi === 'otp_kelola_kirim') {
        await kirimOtp({
          nomor: nomorSaya,
          keperluan: 'kelola_guru',
          ip: ipDari(req),
          pembuka: 'Kode untuk menambah atau mengimpor guru di absensi'
        });
        return res.status(200).json({ ok: true, nomor: '••••' + nomorSaya.slice(-4) });
      }
      await cekOtp(nomorSaya, 'kelola_guru', b.kode);
      return res.status(200).json({ ok: true, izin: izinBuat(user.id, sekolahId), menit: IZIN_MENIT });
    }

    // ---------- cek nomor (hanya nama yang dibuka) ----------
    if (b.aksi === 'cek_nomor') {
      const wa = normWA(b.no_wa);
      if (!RE_WA.test(wa)) throw new Error('Nomor WhatsApp tidak valid');
      const t = await cariProfilByWA(wa);
      if (!t) return res.status(200).json({ ok: true, ada: false });
      if (!t.aktif)
        throw new Error('Akun dengan nomor ini sedang dinonaktifkan. Hubungi admin');
      const k = await ambilKeanggotaan(t.id, sekolahId);
      return res
        .status(200)
        .json({ ok: true, ada: true, nama: t.nama, sudah_di_sekolah: !!k });
    }

    // ---------- tautkan akun yang sudah ada ----------
    if (b.aksi === 'tautkan') {
      const wa = normWA(b.no_wa);
      if (!RE_WA.test(wa)) throw new Error('Nomor WhatsApp tidak valid');
      if (!isDev) izinCek(b.izin, user.id, sekolahId);
      const role = ROLE_SEKOLAH.includes(b.role) ? b.role : 'guru';
      const t = await cariProfilByWA(wa);
      if (!t || !t.aktif) throw new Error('Akun dengan nomor ini tidak ditemukan');
      if (await ambilKeanggotaan(t.id, sekolahId))
        throw new Error('Sudah terdaftar di sekolah ini');
      // Kepala Sekolah: ditautkan sebagai Guru lebih dulu, lalu diganti secara atomis
      await tambahKeanggotaan(t.id, sekolahId, role === 'kepala_sekolah' ? 'guru' : role);
      if (role === 'kepala_sekolah') await jadikanKepala(sekolahId, t.id, user.id);
      return res.status(200).json({ ok: true, nama: t.nama });
    }

    // ---------- tambah akun baru ----------
    if (b.aksi === 'tambah') {
      if (!isDev) izinCek(b.izin, user.id, sekolahId);
      const d = periksaDataAkun(b, { wajibWA: b.role !== 'developer' });
      if (d.role === 'developer' && !isDev)
        throw new Error('Hanya Developer yang boleh membuat akun Developer');
      if (d.no_wa && (await cariProfilByWA(d.no_wa)))
        throw new Error('Nomor WhatsApp sudah punya akun. Gunakan Tautkan');
      // Kepala Sekolah: dibuat sebagai Guru lebih dulu, lalu diganti secara atomis
      const jadiKepala = d.role === 'kepala_sekolah';
      const baruId = await buatAkun({ ...d, role: jadiKepala ? 'guru' : d.role, sekolahId });
      if (jadiKepala) {
        try {
          await jadikanKepala(sekolahId, baruId, user.id);
        } catch (e) {
          throw new Error('Akun dibuat sebagai Guru, tetapi ' + e.message);
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ---------- tambah batch (impor XLSX) ----------
    if (b.aksi === 'tambah_batch') {
      if (!isDev) izinCek(b.izin, user.id, sekolahId);
      const data = Array.isArray(b.data) ? b.data : [];
      if (!data.length) return res.status(400).json({ error: 'Data batch kosong' });
      if (data.length > 50)
        return res.status(400).json({ error: 'Maksimal 50 guru per batch' });

      const hasil = [];
      for (let i = 0; i < data.length; i++) {
        try {
          const d = periksaDataAkun(data[i] || {}, { wajibWA: false });
          if (d.role === 'developer' && !isDev)
            throw new Error('Hanya Developer yang boleh membuat akun Developer');
          if (d.role === 'kepala_sekolah' && !isDev)
            throw new Error('Role Kepala Sekolah hanya bisa ditetapkan Developer');
          if (d.no_wa && (await cariProfilByWA(d.no_wa)))
            throw new Error('Nomor WhatsApp sudah punya akun');
          if (d.role === 'kepala_sekolah' && (await adaKepalaLain(sekolahId, null)))
            throw new Error('Sekolah ini sudah punya Kepala Sekolah aktif');
          await buatAkun({ ...d, sekolahId });
          hasil.push({ index: i, ok: true });
        } catch (e) {
          hasil.push({
            index: i,
            ok: false,
            error: pesanDuplikat(e) ? 'Username sudah dipakai' : e.message || String(e)
          });
        }
      }
      return res.status(200).json({
        ok: true,
        success: hasil.filter((x) => x.ok).length,
        failed: hasil.filter((x) => !x.ok).length,
        results: hasil
      });
    }

    // ---------- aksi atas anggota yang sudah ada ----------
    if (['ubah_role', 'aktif', 'hapus'].includes(b.aksi)) {
      const id = String(b.id || '');
      if (!RE_UUID.test(id)) return res.status(400).json({ error: 'ID tidak valid' });
      if (id === user.id)
        return res.status(400).json({ error: 'Tidak bisa mengubah akun sendiri' });

      const target = await ambilKeanggotaan(id, sekolahId);
      if (!target)
        return res.status(404).json({ error: 'Guru tidak ditemukan di sekolah ini' });
      if (!isDev && target.role === 'kepala_sekolah')
        return res.status(403).json({ error: 'Data Kepala Sekolah hanya bisa diubah oleh Developer' });

      const ubah = (isi) =>
        panggil(
          `/rest/v1/keanggotaan?profil_id=eq.${id}&sekolah_id=eq.${sekolahId}`,
          'PATCH',
          isi,
          { Prefer: 'return=minimal' }
        );

      if (b.aksi === 'ubah_role') {
        const role = String(b.role || '');
        if (!ROLE_SEKOLAH.includes(role))
          return res.status(400).json({ error: 'Role tidak valid' });
        if (role === 'kepala_sekolah') {
          if (!target.aktif)
            return res.status(400).json({ error: 'Aktifkan guru ini dulu sebelum menjadikannya Kepala Sekolah' });
          // Atomis: Kepala Sekolah lama otomatis menjadi Guru
          await jadikanKepala(sekolahId, id, user.id);
        } else {
          await ubah({ role });
        }
      } else if (b.aksi === 'aktif') {
        const aktif = !!b.aktif;
        if (aktif && target.role === 'kepala_sekolah' && (await adaKepalaLain(sekolahId, id)))
          return res
            .status(400)
            .json({ error: 'Sudah ada Kepala Sekolah aktif di sekolah ini' });
        await ubah({ aktif });
      } else {
        // hapus = keluarkan dari sekolah ini; akun tetap ada
        await panggil(
          `/rest/v1/keanggotaan?profil_id=eq.${id}&sekolah_id=eq.${sekolahId}`,
          'DELETE'
        );
      }
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('guru.js', e);
    return res.status(400).json({ error: e.message });
  }
};
