// Fungsi server: tambah akun guru dan reset kata sandi.
// Memakai Environment Variables yang sama dengan webhook: SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function kepala(extra) {
  const h = { apikey: KEY, 'Content-Type': 'application/json', ...extra };
  if (KEY.startsWith('eyJ')) h.Authorization = 'Bearer ' + KEY;
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
      ('Kesalahan ' + r.status)
    );
  }

  return j;
}

module.exports = async (req, res) => {
  // Cek kesehatan untuk menu Periksa Sistem (Developer).
  // Tanpa login, tanpa data apa pun:
  // hanya menjawab apakah fungsi hidup dan Environment Variables sudah terisi.
  if (req.method === 'GET') {
    if (!SB || !KEY) {
      return res.status(200).send('API guru belum dikonfigurasi (Environment Variables kosong)');
    }

    return res.status(200).send('API guru aktif');
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Metode tidak diizinkan'
    });
  }

  try {
    // 1. Pastikan pemanggil sudah login
    // dan berperan Kepala Sekolah atau Developer
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');

    if (!token) {
      return res.status(401).json({
        error: 'Belum login'
      });
    }

    const user = await panggil('/auth/v1/user', 'GET', null, {
      Authorization: 'Bearer ' + token
    });

    const p = await panggil(`/rest/v1/profil?id=eq.${user.id}&select=role,aktif`, 'GET');
    const pemanggil = p && p[0];

    if (!pemanggil || !pemanggil.aktif || !['kepala_sekolah', 'developer'].includes(pemanggil.role)) {
      return res.status(403).json({
        error: 'Hanya Kepala Sekolah atau Developer yang boleh'
      });
    }

    const b = req.body || {};
    const sandi = String(b.sandi || '');

    if ((b.aksi === 'tambah' || b.aksi === 'reset') && sandi.length < 6) {
      return res.status(400).json({
        error: 'Kata sandi minimal 6 karakter'
      });
    }

    // =========================================================
    // TAMBAH GURU SECARA BATCH
    // Maksimal 50 guru dalam satu request
    // =========================================================
    if (b.aksi === 'tambah_batch') {
      const data = Array.isArray(b.data) ? b.data : [];

      if (!data.length) {
        return res.status(400).json({
          error: 'Data batch kosong'
        });
      }

      if (data.length > 50) {
        return res.status(400).json({
          error: 'Maksimal 50 guru per batch'
        });
      }

      const hasil = [];

      for (let i = 0; i < data.length; i++) {
        const x = data[i] || {};
        const username = String(x.username || '').trim().toLowerCase();
        const nama = String(x.nama || '').trim();
        const pass = String(x.sandi || '');
        const role = String(x.role || 'guru');

        try {
          if (pass.length < 6) {
            throw new Error('Kata sandi minimal 6 karakter');
          }

          if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
            throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
          }

          if (!nama) {
            throw new Error('Nama wajib diisi');
          }

          if (!['guru', 'kepala_sekolah', 'developer'].includes(role)) {
            throw new Error('Role tidak valid');
          }

          if (role === 'developer' && pemanggil.role !== 'developer') {
            throw new Error('Hanya Developer yang boleh membuat akun Developer');
          }

          // Buat user Auth
          const baru = await panggil('/auth/v1/admin/users', 'POST', {
            email: username + '@absensi.local',
            password: pass,
            email_confirm: true,
            user_metadata: { nama }
          });

          try {
            // Buat profil
            await panggil('/rest/v1/profil', 'POST', {
              id: baru.id,
              nama,
              username,
              role,
              aktif: true
            }, {
              Prefer: 'return=minimal'
            });
          } catch (e) {
            // Rollback user Auth jika profil gagal
            try {
              await panggil('/auth/v1/admin/users/' + baru.id, 'DELETE');
            } catch (_) {}

            throw new Error(
              /duplicate|unique/i.test(e.message)
                ? 'Username sudah dipakai'
                : e.message
            );
          }

          hasil.push({
            index: i,
            ok: true
          });

        } catch (e) {
          const m = /already|registered|exists/i.test(e.message)
            ? 'Username sudah dipakai'
            : (e.message || String(e));

          hasil.push({
            index: i,
            ok: false,
            error: m
          });
        }
      }

      return res.status(200).json({
        ok: true,
        success: hasil.filter(x => x.ok).length,
        failed: hasil.filter(x => !x.ok).length,
        results: hasil
      });
    }

    // =========================================================
    // TAMBAH GURU SATUAN
    // =========================================================
    if (b.aksi === 'tambah') {
      const username = String(b.username || '').trim().toLowerCase();
      const nama = String(b.nama || '').trim();
      const role = String(b.role || 'guru');

      if (!/^[a-z0-9._-]{3,20}$/.test(username)) {
        return res.status(400).json({
          error: 'Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah'
        });
      }

      if (!nama) {
        return res.status(400).json({
          error: 'Nama wajib diisi'
        });
      }

      if (!['guru', 'kepala_sekolah', 'developer'].includes(role)) {
        return res.status(400).json({
          error: 'Role tidak valid'
        });
      }

      if (role === 'developer' && pemanggil.role !== 'developer') {
        return res.status(403).json({
          error: 'Hanya Developer yang boleh membuat akun Developer'
        });
      }

      const baru = await panggil('/auth/v1/admin/users', 'POST', {
        email: username + '@absensi.local',
        password: sandi,
        email_confirm: true,
        user_metadata: { nama }
      });

      try {
        await panggil('/rest/v1/profil', 'POST', {
          id: baru.id,
          nama,
          username,
          role,
          aktif: true
        }, {
          Prefer: 'return=minimal'
        });
      } catch (e) {
        await panggil('/auth/v1/admin/users/' + baru.id, 'DELETE');

        throw new Error(
          /duplicate|unique/i.test(e.message)
            ? 'Username sudah dipakai'
            : e.message
        );
      }

      return res.status(200).json({
        ok: true
      });
    }

    // =========================================================
    // RESET PASSWORD
    // =========================================================
    if (b.aksi === 'reset') {
      const id = String(b.id || '');

      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({
          error: 'ID tidak valid'
        });
      }

      await panggil('/auth/v1/admin/users/' + id, 'PUT', {
        password: sandi
      });

      return res.status(200).json({
        ok: true
      });
    }

    // =========================================================
    // AKTIFKAN / NONAKTIFKAN / HAPUS GURU
    // =========================================================
    if (b.aksi === 'aktif' || b.aksi === 'hapus') {
      const id = String(b.id || '');

      if (!/^[0-9a-f-]{36}$/i.test(id)) {
        return res.status(400).json({
          error: 'ID tidak valid'
        });
      }

      if (id === user.id) {
        return res.status(400).json({
          error: 'Tidak bisa mengubah akun sendiri'
        });
      }

      const t = ((await panggil(`/rest/v1/profil?id=eq.${id}&select=role`, 'GET')) || [])[0];

      if (!t) {
        return res.status(404).json({
          error: 'Akun tidak ditemukan'
        });
      }

      if (t.role === 'developer' && pemanggil.role !== 'developer') {
        return res.status(403).json({
          error: 'Hanya Developer yang boleh mengubah akun Developer'
        });
      }

      if (b.aksi === 'aktif') {
        const aktif = !!b.aktif;

        await panggil(`/rest/v1/profil?id=eq.${id}`, 'PATCH', {
          aktif
        }, {
          Prefer: 'return=minimal'
        });

        await panggil('/auth/v1/admin/users/' + id, 'PUT', {
          ban_duration: aktif ? 'none' : '876000h'
        });

      } else {
        await panggil(`/rest/v1/profil?id=eq.${id}`, 'DELETE');
        await panggil('/auth/v1/admin/users/' + id, 'DELETE');
      }

      return res.status(200).json({
        ok: true
      });
    }

    return res.status(400).json({
      error: 'Aksi tidak dikenal'
    });

  } catch (e) {
    console.error('guru.js', e);

    const m = /already|registered|exists/i.test(e.message)
      ? 'Username sudah dipakai'
      : e.message;

    return res.status(400).json({
      error: m
    });
  }
};
