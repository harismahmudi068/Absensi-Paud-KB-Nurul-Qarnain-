// Fungsi server khusus DEVELOPER.
// Environment Variables: lihat api/_lib.js
//
// Aksi (semua wajib login sebagai Developer):
//   setujui_sekolah   {id}                  -> setujui pendaftaran sekolah
//   tolak_sekolah     {id, alasan}          -> tolak pendaftaran sekolah (akun pendaftar dihapus)
//   nomor_setujui     {id, profil_id}       -> setujui permintaan nomor hilang untuk akun terpilih
//   nomor_tolak       {id, alasan}          -> tolak permintaan nomor hilang
//   sekolah_status    {sekolah_id, status}  -> aktifkan / nonaktifkan sekolah
//   masuk_sebagai     {profil_id, sekolah_id} -> izin masuk sebagai pengguna lain (mode bantuan)
//   catat_keluar      {profil_id, sekolah_id} -> catat akhir mode bantuan
//   beritahu_kepala   {batas}               -> WhatsApp ke semua Kepala Sekolah: unduh rekap sebelum data dihapus
//   hapus_absensi     {sandi, konfirmasi}   -> kosongkan seluruh tabel absensi (butuh sandi dan ketikan HAPUS ABSENSI)
//   sinkron_alpa                            -> sinkronkan ulang jadwal cron Alpa Otomatis semua sekolah

const L = require('./_lib');

function teks(v, maks) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, maks);
}

async function satu(path) {
  const r = await L.panggil(path, 'GET');
  return (r && r[0]) || null;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!L.SB || !L.KEY) return res.status(200).send('API developer belum dikonfigurasi');
    return res.status(200).send('API developer aktif');
  }
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' });

  try {
    // 1. Wajib Developer
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Belum login' });
    const user = await L.panggil('/auth/v1/user', 'GET', null, {
      Authorization: 'Bearer ' + token
    });
    const pemanggil = await satu(`/rest/v1/profil?id=eq.${user.id}&select=role,aktif,nama`);
    if (!pemanggil || !pemanggil.aktif || pemanggil.role !== 'developer')
      return res.status(403).json({ error: 'Hanya Developer yang boleh' });

    const b = req.body || {};
    const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '')
      .split(',')[0]
      .trim();
    const alamatAplikasi = `${proto}://${host}`;

    // ---------------------------------------------------------
    // SETUJUI SEKOLAH
    // ---------------------------------------------------------
    if (b.aksi === 'setujui_sekolah') {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error('Pendaftaran tidak valid');
      const d = await satu(
        `/rest/v1/pendaftaran_sekolah?id=eq.${id}&select=nama_sekolah,profil_id,status`
      );
      if (!d || d.status !== 'menunggu')
        throw new Error('Pendaftaran tidak ditemukan atau sudah diproses');
      const kepala = d.profil_id
        ? await satu(`/rest/v1/profil?id=eq.${d.profil_id}&select=no_wa,nama,username`)
        : null;

      const sid = await L.panggil('/rest/v1/rpc/setujui_pendaftaran', 'POST', {
        p_id: id,
        p_oleh: user.id
      });
      await L.catatLog({
        pelaku: user.id,
        sekolah_id: Number(sid) || null,
        aksi: 'setujui_sekolah',
        rincian: d.nama_sekolah
      });

      if (kepala && kepala.no_wa) {
        try {
          await L.kirimDev(
            kepala.no_wa,
            `✅ Pendaftaran sekolah *${d.nama_sekolah}* telah disetujui.\n\nSilakan masuk ke ${alamatAplikasi} dengan username *${kepala.username}* dan kata sandi yang Anda buat.`
          );
        } catch (e) {
          console.error('Pemberitahuan persetujuan gagal:', e.message);
        }
      }
      return res.status(200).json({ ok: true, sekolah_id: Number(sid) || null });
    }

    // ---------------------------------------------------------
    // TOLAK SEKOLAH
    // ---------------------------------------------------------
    if (b.aksi === 'tolak_sekolah') {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error('Pendaftaran tidak valid');
      const alasan = teks(b.alasan, 200);
      const d = await satu(
        `/rest/v1/pendaftaran_sekolah?id=eq.${id}&select=nama_sekolah,profil_id,status`
      );
      if (!d || d.status !== 'menunggu')
        throw new Error('Pendaftaran tidak ditemukan atau sudah diproses');
      const kepala = d.profil_id
        ? await satu(`/rest/v1/profil?id=eq.${d.profil_id}&select=no_wa,aktif`)
        : null;
      if (kepala && kepala.aktif)
        throw new Error('Akun pendaftar sudah aktif, penolakan dibatalkan');

      await L.panggil(`/rest/v1/pendaftaran_sekolah?id=eq.${id}`, 'PATCH', {
        status: 'ditolak',
        catatan_tolak: alasan || null,
        diproses: new Date().toISOString(),
        diproses_oleh: user.id
      }, { Prefer: 'return=minimal' });

      // Hapus akun pendaftar agar username dan nomornya bisa dipakai lagi
      if (d.profil_id) {
        try {
          await L.panggil(`/rest/v1/profil?id=eq.${d.profil_id}`, 'DELETE');
        } catch (e) {
          console.error('Hapus profil pendaftar gagal:', e.message);
        }
        try {
          await L.panggil('/auth/v1/admin/users/' + d.profil_id, 'DELETE');
        } catch (e) {
          console.error('Hapus akun pendaftar gagal:', e.message);
        }
      }
      await L.catatLog({
        pelaku: user.id,
        aksi: 'tolak_sekolah',
        rincian: d.nama_sekolah + (alasan ? ' - ' + alasan : '')
      });
      if (kepala && kepala.no_wa) {
        try {
          await L.kirimDev(
            kepala.no_wa,
            `Pendaftaran sekolah *${d.nama_sekolah}* belum dapat disetujui.${alasan ? '\nAlasan: ' + alasan : ''}\n\nAnda dapat mendaftar ulang dengan data yang benar.`
          );
        } catch (e) {
          console.error('Pemberitahuan penolakan gagal:', e.message);
        }
      }
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // PERMINTAAN NOMOR HILANG: SETUJUI
    // ---------------------------------------------------------
    if (b.aksi === 'nomor_setujui') {
      const id = Number(b.id);
      const profilId = String(b.profil_id || '');
      if (!Number.isInteger(id) || id <= 0) throw new Error('Permintaan tidak valid');
      if (!L.RE_UUID.test(profilId)) throw new Error('Pilih akun yang dimaksud terlebih dahulu');

      const q = await satu(`/rest/v1/permintaan_nomor?id=eq.${id}&select=*`);
      if (!q || q.status !== 'menunggu')
        throw new Error('Permintaan tidak ditemukan atau sudah diproses');
      const t = await satu(
        `/rest/v1/profil?id=eq.${profilId}&select=id,nama,username,role,aktif,no_wa`
      );
      if (!t) throw new Error('Akun tidak ditemukan');
      if (t.role === 'developer') throw new Error('Akun Developer tidak bisa diubah dari sini');
      if (!t.aktif) throw new Error('Akun ini sedang dinonaktifkan');

      const pakai = await satu(
        `/rest/v1/profil?no_wa=eq.${encodeURIComponent(q.no_wa_baru)}&select=id`
      );
      if (pakai && pakai.id !== t.id)
        throw new Error('Nomor baru sudah dipakai akun lain');
      if (q.username_baru && q.username_baru !== t.username) {
        const u = await satu(
          `/rest/v1/profil?username=eq.${encodeURIComponent(q.username_baru)}&select=id`
        );
        if (u && u.id !== t.id) throw new Error('Username baru sudah dipakai akun lain');
      }

      const nomorLama = t.no_wa || null;
      await L.panggil(`/rest/v1/profil?id=eq.${t.id}`, 'PATCH', { no_wa: q.no_wa_baru }, {
        Prefer: 'return=minimal'
      });
      let usernameAkhir = t.username;
      try {
        if (q.username_baru && q.username_baru !== t.username) {
          await L.ubahUsernameAkun(t.id, t.username, q.username_baru);
          usernameAkhir = q.username_baru;
        }
        if (q.sandi_enc) {
          await L.panggil('/auth/v1/admin/users/' + t.id, 'PUT', {
            password: L.dekripsi(q.sandi_enc)
          });
        }
      } catch (e) {
        // Kembalikan nomor agar akun tidak setengah berubah
        try {
          await L.panggil(`/rest/v1/profil?id=eq.${t.id}`, 'PATCH', { no_wa: nomorLama }, {
            Prefer: 'return=minimal'
          });
        } catch (_) {}
        throw e;
      }

      await L.panggil(`/rest/v1/permintaan_nomor?id=eq.${id}`, 'PATCH', {
        status: 'disetujui',
        profil_id: t.id,
        sandi_enc: null,
        diproses: new Date().toISOString(),
        diproses_oleh: user.id
      }, { Prefer: 'return=minimal' });

      await L.catatLog({
        pelaku: user.id,
        aksi: 'nomor_setujui',
        rincian: `${t.nama} (${t.username}) -> nomor baru ${q.no_wa_baru}${q.sandi_enc ? ', sandi diganti' : ''}${usernameAkhir !== t.username ? ', username ' + usernameAkhir : ''}`
      });

      try {
        await L.kirimDev(
          q.no_wa_baru,
          `✅ Permintaan Anda disetujui.\n\nNomor ini sekarang tertaut ke akun absensi *${t.nama}*.\nUsername: *${usernameAkhir}*\n\nSilakan masuk ke ${alamatAplikasi}.${q.sandi_enc ? '' : '\nBila lupa kata sandi, gunakan tombol Lupa sandi di halaman masuk.'}`
        );
      } catch (e) {
        console.error('Pemberitahuan persetujuan nomor gagal:', e.message);
      }
      return res.status(200).json({ ok: true, username: usernameAkhir });
    }

    // ---------------------------------------------------------
    // PERMINTAAN NOMOR HILANG: TOLAK
    // ---------------------------------------------------------
    if (b.aksi === 'nomor_tolak') {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error('Permintaan tidak valid');
      const alasan = teks(b.alasan, 200);
      const q = await satu(`/rest/v1/permintaan_nomor?id=eq.${id}&select=no_wa_baru,nama,status`);
      if (!q || q.status !== 'menunggu')
        throw new Error('Permintaan tidak ditemukan atau sudah diproses');
      await L.panggil(`/rest/v1/permintaan_nomor?id=eq.${id}`, 'PATCH', {
        status: 'ditolak',
        catatan_tolak: alasan || null,
        sandi_enc: null,
        diproses: new Date().toISOString(),
        diproses_oleh: user.id
      }, { Prefer: 'return=minimal' });
      await L.catatLog({
        pelaku: user.id,
        aksi: 'nomor_tolak',
        rincian: q.nama + (alasan ? ' - ' + alasan : '')
      });
      try {
        await L.kirimDev(
          q.no_wa_baru,
          `Permintaan penggantian nomor WhatsApp Anda belum dapat disetujui.${alasan ? '\nAlasan: ' + alasan : ''}\n\nSilakan hubungi kepala sekolah atau admin untuk bantuan.`
        );
      } catch (e) {
        console.error('Pemberitahuan penolakan nomor gagal:', e.message);
      }
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // STATUS SEKOLAH
    // ---------------------------------------------------------
    if (b.aksi === 'sekolah_status') {
      const sid = Number(b.sekolah_id);
      const status = String(b.status || '');
      if (!Number.isInteger(sid) || sid <= 0) throw new Error('Sekolah tidak valid');
      if (!['aktif', 'nonaktif'].includes(status)) throw new Error('Status tidak valid');
      const sk = await satu(`/rest/v1/sekolah?id=eq.${sid}&select=nama,status`);
      if (!sk) throw new Error('Sekolah tidak ditemukan');
      if (sk.status === 'menunggu' || sk.status === 'ditolak')
        throw new Error('Sekolah ini belum melalui persetujuan');
      await L.panggil(`/rest/v1/sekolah?id=eq.${sid}`, 'PATCH', { status }, {
        Prefer: 'return=minimal'
      });
      try {
        await L.panggil('/rest/v1/rpc/sinkronkan_jadwal_alpa', 'POST', {});
      } catch (e) {
        console.error('Sinkron jadwal alpa gagal:', e.message);
      }
      await L.catatLog({
        pelaku: user.id,
        sekolah_id: sid,
        aksi: 'sekolah_status',
        rincian: `${sk.nama}: ${sk.status} -> ${status}`
      });
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // MASUK SEBAGAI (mode bantuan)
    // ---------------------------------------------------------
    if (b.aksi === 'masuk_sebagai' || b.aksi === 'catat_keluar') {
      const profilId = String(b.profil_id || '');
      const sid = Number(b.sekolah_id);
      if (!L.RE_UUID.test(profilId) || !Number.isInteger(sid) || sid <= 0)
        throw new Error('Data tidak valid');
      const t = await satu(`/rest/v1/profil?id=eq.${profilId}&select=id,nama,username,role,aktif`);
      if (!t) throw new Error('Akun tidak ditemukan');

      if (b.aksi === 'catat_keluar') {
        await L.catatLog({
          pelaku: user.id,
          sekolah_id: sid,
          aksi: 'keluar_mode_bantuan',
          rincian: `${t.nama} (${t.username})`
        });
        return res.status(200).json({ ok: true });
      }

      if (t.role === 'developer') throw new Error('Tidak bisa masuk sebagai akun Developer');
      if (!t.aktif) throw new Error('Akun ini sedang dinonaktifkan');
      const k = await satu(
        `/rest/v1/keanggotaan?profil_id=eq.${t.id}&sekolah_id=eq.${sid}&select=role,aktif`
      );
      if (!k || !k.aktif) throw new Error('Akun ini tidak aktif di sekolah tersebut');
      const sk = await satu(`/rest/v1/sekolah?id=eq.${sid}&select=nama,status`);
      if (!sk || sk.status !== 'aktif') throw new Error('Sekolah tersebut tidak aktif');

      const link = await L.panggil('/auth/v1/admin/generate_link', 'POST', {
        type: 'magiclink',
        email: t.username + '@absensi.local'
      });
      const hash = link && (link.hashed_token || (link.properties && link.properties.hashed_token));
      if (!hash) throw new Error('Gagal membuat izin masuk');

      await L.catatLog({
        pelaku: user.id,
        sekolah_id: sid,
        aksi: 'masuk_sebagai',
        rincian: `${t.nama} (${t.username}) sebagai ${k.role} di ${sk.nama}`
      });
      return res.status(200).json({
        ok: true,
        token_hash: hash,
        nama: t.nama,
        sekolah: sk.nama,
        role: k.role
      });
    }

    // ---------------------------------------------------------
    // PEMBERITAHUAN KEPALA SEKOLAH (sebelum data dihapus)
    // ---------------------------------------------------------
    if (b.aksi === 'beritahu_kepala') {
      const batas = teks(b.batas, 60);
      const baris =
        (await L.panggil(
          '/rest/v1/keanggotaan?role=eq.kepala_sekolah&aktif=eq.true&select=sekolah_id,profil(nama,no_wa,aktif),sekolah(nama,status)',
          'GET'
        )) || [];
      const tujuan = baris.filter(
        (x) => x.sekolah && x.sekolah.status === 'aktif' && x.profil && x.profil.aktif
      );
      let terkirim = 0, gagal = 0, tanpaNomor = 0;
      for (const x of tujuan) {
        const wa = x.profil.no_wa;
        if (!wa || !L.RE_WA.test(wa)) { tanpaNomor++; continue; }
        const pesan =
          `📢 *PEMBERITAHUAN PENGEMBANG SISTEM ABSENSI*\n\n` +
          `Yth. Bapak/Ibu Kepala Sekolah *${x.sekolah.nama}*,\n\n` +
          `Untuk menjaga kapasitas penyimpanan, data absensi akan segera dihapus. ` +
          `Mohon segera mengunduh rekap absensi di menu *Pengaturan > Tahun Ajaran* (PDF atau XLSX)` +
          `${batas ? ` paling lambat *${batas}*` : ''}.\n\n` +
          `Data yang sudah dihapus tidak dapat dikembalikan. Terima kasih 🙏`;
        try {
          await L.kirimDev(wa, pesan);
          terkirim++;
        } catch (e) {
          gagal++;
          console.error('beritahu_kepala gagal untuk', x.sekolah.nama, e.message);
        }
      }
      await L.catatLog({
        pelaku: user.id,
        aksi: 'beritahu_kepala',
        rincian: `terkirim ${terkirim}, gagal ${gagal}, tanpa nomor ${tanpaNomor}${batas ? ', batas ' + batas : ''}`
      });
      return res.status(200).json({ ok: true, terkirim, gagal, tanpa_nomor: tanpaNomor, total: tujuan.length });
    }

    // ---------------------------------------------------------
    // KOSONGKAN TABEL ABSENSI
    // ---------------------------------------------------------
    if (b.aksi === 'hapus_absensi') {
      if (String(b.konfirmasi || '').trim() !== 'HAPUS ABSENSI')
        throw new Error('Ketik HAPUS ABSENSI persis seperti contoh untuk melanjutkan');
      try {
        await L.panggil('/auth/v1/token?grant_type=password', 'POST', {
          email: user.email,
          password: String(b.sandi || '')
        });
      } catch (e) {
        throw new Error('Kata sandi salah');
      }
      // Pengaman: sebaiknya Kepala Sekolah sudah diberi tahu dalam 7 hari terakhir
      if (!b.lanjut_tanpa_pemberitahuan) {
        const tujuhHari = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
        const sudah =
          (await L.panggil(
            `/rest/v1/log_audit?aksi=eq.beritahu_kepala&waktu=gt.${encodeURIComponent(tujuhHari)}&select=id&limit=1`,
            'GET'
          )) || [];
        if (!sudah.length) throw new Error('BELUM_ADA_PEMBERITAHUAN');
      }
      const jumlah = await L.panggil('/rest/v1/rpc/developer_kosongkan_absensi', 'POST', {
        p_oleh: user.id
      });
      await L.catatLog({
        pelaku: user.id,
        aksi: 'hapus_absensi',
        rincian: `Seluruh tabel absensi dikosongkan (${Number(jumlah) || 0} baris)`
      });
      return res.status(200).json({ ok: true, jumlah: Number(jumlah) || 0 });
    }

    // ---------------------------------------------------------
    // SINKRON JADWAL ALPA
    // ---------------------------------------------------------
    if (b.aksi === 'sinkron_alpa') {
      await L.panggil('/rest/v1/rpc/sinkronkan_jadwal_alpa', 'POST', {});
      await L.catatLog({ pelaku: user.id, aksi: 'sinkron_alpa', rincian: 'Jadwal Alpa Otomatis disinkronkan ulang' });
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('developer.js', e.message);
    return res.status(400).json({ error: e.message });
  }
};
