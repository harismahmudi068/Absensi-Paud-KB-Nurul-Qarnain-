// Fungsi server khusus DEVELOPER.
// Environment Variables: lihat api/_lib.js
//
// Aksi (semua wajib login sebagai Developer):
//   setujui_sekolah   {id}                  -> setujui pendaftaran sekolah
//   tolak_sekolah     {id, alasan}          -> tolak pendaftaran sekolah (akun pendaftar dihapus)
//   nomor_setujui     {id, profil_id}       -> setujui permintaan nomor hilang untuk akun terpilih
//   nomor_tolak       {id, alasan}          -> tolak permintaan nomor hilang
//   sekolah_status    {sekolah_id, status}  -> aktifkan / nonaktifkan sekolah
//   masuk_sebagai     {profil_id, sekolah_id} -> izin masuk sebagai pengguna lain (mode bantuan);
//                                               hasilnya memuat token "bantuan" agar di mode ini sandi/passkey/OTP pemilik akun tidak diminta
//   catat_keluar      {profil_id, sekolah_id} -> catat akhir mode bantuan
//   beritahu_kepala   {batas, jenis}        -> WhatsApp ke semua Kepala Sekolah: unduh rekap sebelum data dihapus (jenis 'tabungan' = rekap tabungan)
//   hapus_absensi     {sandi | verifikasi:'passkey', konfirmasi} -> kosongkan seluruh tabel absensi (butuh sandi atau passkey dan ketikan HAPUS ABSENSI)
//   hapus_tabungan    {sandi | verifikasi:'passkey', konfirmasi} -> kosongkan tabel tabungan_transaksi dan tabungan_bawaan (butuh sandi atau passkey dan ketikan HAPUS TABUNGAN)
//   beritahu_hapus_sekolah {sekolah_id, batas} -> WhatsApp ke Kepala Sekolah satu sekolah: data sekolah akan dihapus permanen
//   hapus_sekolah     {sekolah_id, konfirmasi, sandi | verifikasi:'passkey'} -> HAPUS PERMANEN seluruh data satu sekolah (konfirmasi = nama sekolah persis, butuh sandi atau passkey)
//   sinkron_alpa                            -> sinkronkan ulang jadwal cron Alpa Otomatis semua sekolah

const L = require('./_lib');

// Sandi akun Developer ATAU passkey yang baru dipakai (bukti_passkey dari klien)
async function verifSandiDev(user, token, b) {
  if (b.verifikasi === 'passkey') {
    await L.verifPasskey(token, b, user.id);
    return;
  }
  try {
    await L.panggil('/auth/v1/token?grant_type=password', 'POST', {
      email: user.email,
      password: String(b.sandi || '')
    });
  } catch (e) {
    throw new Error('Kata sandi salah');
  }
}

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

    // 1b. Wajib verifikasi 2 langkah (token sudah divalidasi Supabase di atas)
    let aal = null;
    try {
      aal = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).aal;
    } catch (e) {}
    if (aal !== 'aal2')
      return res.status(403).json({ error: 'Verifikasi 2 langkah diperlukan. Silakan masuk kembali sebagai Developer.' });

    const b = req.body || {};
    const alamatAplikasi = 'https://absensi-1486.vercel.app';

    // ---------------------------------------------------------
    // UJI SATU KALI PENGINGAT IZIN/SAKIT (Gisella, sekolah 6)
    // Khusus Developer AAL2. Tidak mengubah absensi atau antrean normal.
    // ---------------------------------------------------------
    if (b.aksi === 'uji_pengingat_izin_sakit_gisella') {
      const sekolahId = 6, siswaId = 584;
      const tanggal = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
      const kunciAudit = 'Uji notifikasi pengingat Gisella (siswa 584)';
      const pernah = await satu('/rest/v1/log_audit?aksi=eq.uji_pengingat_izin_sakit&rincian=eq.' +
        encodeURIComponent(kunciAudit) + '&select=id&limit=1');
      if (pernah) throw new Error('Uji satu kali untuk Gisella sudah pernah dijalankan. Tidak mengirim ulang agar tidak terjadi pesan ganda.');

      const [siswaRows, sekolahRows, absRows, pengRows, relasiRows, subRows, tokenRows] = await Promise.all([
        L.panggil('/rest/v1/siswa?id=eq.' + siswaId + '&sekolah_id=eq.' + sekolahId + '&select=id,sekolah_id,nama,nama_panggilan,kode_qr,aktif', 'GET'),
        L.panggil('/rest/v1/sekolah?id=eq.' + sekolahId + '&select=id,nama,status', 'GET'),
        L.panggil('/rest/v1/absensi?siswa_id=eq.' + siswaId + '&tanggal=eq.' + tanggal + '&select=id,siswa_id,sekolah_id,tanggal,status,cara,diubah&order=id.desc&limit=1', 'GET'),
        L.panggil('/rest/v1/pengaturan?sekolah_id=eq.' + sekolahId + '&select=sekolah_id,notif_absensi_aktif,push_absensi_diizinkan', 'GET'),
        L.panggil('/rest/v1/siswa_wali?siswa_id=eq.' + siswaId + '&select=siswa_id,wali_id', 'GET'),
        L.panggil('/rest/v1/push_langganan?siswa_id=eq.' + siswaId + '&terima_absensi=eq.true&select=id,siswa_id,endpoint,p256dh,auth,gagal,terima_absensi', 'GET'),
        L.panggil('/rest/v1/fonnte_token?sekolah_id=eq.' + sekolahId + '&select=token&order=id.asc&limit=1', 'GET')
      ]);
      const siswa = siswaRows && siswaRows[0], sekolah = sekolahRows && sekolahRows[0];
      const absensi = absRows && absRows[0], pengaturan = pengRows && pengRows[0] || {};
      if (!siswa || !siswa.aktif || !sekolah || sekolah.status !== 'aktif') throw new Error('Data siswa atau sekolah tidak aktif/tidak ditemukan.');
      if (!absensi || !['izin','sakit'].includes(String(absensi.status).toLowerCase())) throw new Error('Tidak ada catatan izin/sakit Gisella untuk hari ini; uji dibatalkan.');
      if (!Array.isArray(relasiRows) || !relasiRows.length) throw new Error('Wali Gisella belum terhubung.');
      const waliIds = [...new Set(relasiRows.map(x => Number(x.wali_id)).filter(Number.isInteger))];
      const waliRows = waliIds.length ? await L.panggil('/rest/v1/wali?sekolah_id=eq.' + sekolahId + '&id=in.(' + waliIds.join(',') + ')&select=id,sekolah_id,no_wa', 'GET') : [];
      const nomor = [...new Set((waliRows || []).map(x => L.normWA(x.no_wa)).filter(x => /^628\d{8,12}$/.test(x)))];
      if (!nomor.length) throw new Error('Nomor WhatsApp wali Gisella tidak tersedia atau tidak valid.');

      // Kunci audit dibuat sebelum pengiriman agar klik berulang tidak mengirim pesan ganda.
      await L.panggil('/rest/v1/log_audit', 'POST', {
        pelaku: user.id, sekolah_id: sekolahId, aksi: 'uji_pengingat_izin_sakit', rincian: kunciAudit
      }, { Prefer: 'return=minimal' });

      const hasil = {
        siswa: siswa.nama_panggilan || siswa.nama,
        sekolah: sekolah.nama,
        tanggal,
        push: { status: 'tidak_dikirim', tujuan: 0, terkirim: 0, gagal: 0, error: null },
        whatsapp: { status: 'tidak_dikirim', tujuan: nomor.length, terkirim: 0, gagal: 0, error: null }
      };

      // Push menggunakan payload dan VAPID yang sama dengan pengingat otomatis.
      try {
        const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, subj = process.env.VAPID_SUBJECT;
        if (!pub || !priv || !subj) throw new Error('Konfigurasi VAPID belum lengkap');
        if (pengaturan.push_absensi_diizinkan === false || !pengaturan.notif_absensi_aktif) throw new Error('Notifikasi push absensi sedang dimatikan.');
        const subs = Array.isArray(subRows) ? subRows : [];
        if (!subs.length) throw new Error('Tidak ada perangkat yang mengaktifkan notifikasi push absensi.');
        const webpush = require('web-push');
        webpush.setVapidDetails(subj, pub, priv);
        const nama = String(siswa.nama_panggilan || siswa.nama || 'Anak').trim();
        const payload = {
          judul: 'Pengingat izin/sakit',
          isi: 'Hari ini merupakan hari terakhir laporan ' + absensi.status + ' ananda ' + nama +
            '. Jika pada hari sekolah berikutnya ananda masih belum dapat masuk, mohon kirim laporan izin/sakit kembali melalui WhatsApp atau portal orang tua.',
          url: '/p/' + siswa.kode_qr + '#absensi',
          tag: 'uji-pengingat-gisella-' + siswaId,
          ikon: absensi.status
        };
        const kirim = await Promise.allSettled(subs.map(x => webpush.sendNotification(
          { endpoint: x.endpoint, keys: { p256dh: x.p256dh, auth: x.auth } },
          JSON.stringify(payload),
          { TTL: 3 * 3600, urgency: 'high', timeout: 8000 }
        )));
        const ok = kirim.filter(x => x.status === 'fulfilled').length;
        const gagal = kirim.length - ok;
        hasil.push = { status: ok ? (gagal ? 'sebagian' : 'berhasil') : 'gagal', tujuan: subs.length, terkirim: ok, gagal, error: gagal ? String(kirim.find(x => x.status === 'rejected')?.reason?.message || 'Push gagal').slice(0,180) : null };
        const suksesIds = subs.filter((x,i) => kirim[i].status === 'fulfilled').map(x => x.id);
        if (suksesIds.length) await L.panggil('/rest/v1/push_langganan?id=in.(' + suksesIds.join(',') + ')', 'PATCH', { terakhir_ok: new Date().toISOString(), gagal: 0 }, { Prefer: 'return=minimal' });
      } catch (e) {
        hasil.push = { status: 'gagal', tujuan: Array.isArray(subRows) ? subRows.length : 0, terkirim: 0, gagal: Array.isArray(subRows) ? subRows.length : 0, error: String(e.message || e).slice(0,180) };
      }

      // WhatsApp dikirim langsung melalui token Fonnte sekolah. Hanya pemeriksaan
      // "sudah ada absensi pada tanggal tindak lanjut" yang dilewati untuk uji ini.
      try {
        const tokenFonnte = String(tokenRows?.[0]?.token || '').trim();
        if (!tokenFonnte) throw new Error('Token Fonnte sekolah belum tersedia.');
        const nama = String(siswa.nama_panggilan || siswa.nama || 'Anak').trim();
        const tgl = new Date(tanggal + 'T00:00:00+07:00').toLocaleDateString('id-ID', {
          timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });
        const pesan =
          '🌷 _Assalamu\'alaikum warahmatullahi wabarakatuh._\n\n' +
          'Bapak/Ibu Orang Tua/Wali dari *' + nama + '*,\n\n' +
          'Kami ingin menginformasikan bahwa hingga saat pesan ini dikirim, ananda belum tercatat memiliki laporan izin/sakit maupun status kehadiran.\n\n' +
          'Masa laporan ' + absensi.status + ' ananda sebelumnya berakhir pada ' + tgl + '.\n\n' +
          'Apabila ananda masih belum dapat masuk sekolah, mohon Bapak/Ibu mengirimkan laporan izin/sakit kembali melalui WhatsApp atau portal orang tua. Jika ananda sudah dapat bersekolah, Bapak/Ibu tidak perlu mengirimkan laporan tambahan.\n\n' +
          'Terima kasih atas perhatian dan kerja sama Bapak/Ibu.\n\n' +
          '_Wassalamu\'alaikum warahmatullahi wabarakatuh._';
        const kirim = await Promise.allSettled(nomor.map(async target => {
          const r = await fetch('https://api.fonnte.com/send', {
            method: 'POST', headers: { Authorization: tokenFonnte, 'Content-Type': 'application/json' },
            body: JSON.stringify({ target, message: pesan })
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || j.status === false) throw new Error(j.reason || j.message || 'Fonnte menolak pengiriman');
          return j;
        }));
        const ok = kirim.filter(x => x.status === 'fulfilled').length;
        const gagal = kirim.length - ok;
        hasil.whatsapp = { status: ok ? (gagal ? 'sebagian' : 'berhasil') : 'gagal', tujuan: nomor.length, terkirim: ok, gagal, error: gagal ? String(kirim.find(x => x.status === 'rejected')?.reason?.message || 'WhatsApp gagal').slice(0,180) : null };
      } catch (e) {
        hasil.whatsapp = { status: 'gagal', tujuan: nomor.length, terkirim: 0, gagal: nomor.length, error: String(e.message || e).slice(0,180) };
      }

      await L.catatLog({
        pelaku: user.id, sekolah_id: sekolahId, aksi: 'hasil_uji_pengingat_izin_sakit',
        rincian: 'Gisella: push ' + hasil.push.status + ' (' + hasil.push.terkirim + '/' + hasil.push.tujuan +
          '), WhatsApp ' + hasil.whatsapp.status + ' (' + hasil.whatsapp.terkirim + '/' + hasil.whatsapp.tujuan + ')'
      });
      return res.status(200).json({ ok: true, hasil });
    }


    // ---------------------------------------------------------
    // SETUJUI SEKOLAH
    // ---------------------------------------------------------
    if (b.aksi === 'setujui_sekolah') {
      const id = Number(b.id);
      if (!Number.isInteger(id) || id <= 0) throw new Error('Pendaftaran tidak valid');
      const d = await satu(
        `/rest/v1/pendaftaran_sekolah?id=eq.${id}&select=nama_sekolah,profil_id,status,akun_lama`
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
            d.akun_lama
              ? `✅ Pendaftaran sekolah *${d.nama_sekolah}* telah disetujui dan ditambahkan ke akun Anda.\n\nMasuk ke ${alamatAplikasi} dengan username *${kepala.username}* dan kata sandi lama Anda, lalu pilih sekolah ini di halaman Pilih sekolah.`
              : `✅ Pendaftaran sekolah *${d.nama_sekolah}* telah disetujui.\n\nSilakan masuk ke ${alamatAplikasi} dengan username *${kepala.username}* dan kata sandi yang Anda buat.`
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
        `/rest/v1/pendaftaran_sekolah?id=eq.${id}&select=nama_sekolah,profil_id,status,akun_lama`
      );
      if (!d || d.status !== 'menunggu')
        throw new Error('Pendaftaran tidak ditemukan atau sudah diproses');
      const kepala = d.profil_id
        ? await satu(`/rest/v1/profil?id=eq.${d.profil_id}&select=no_wa,aktif`)
        : null;
      // Akun lama (menambah sekolah) memang sudah aktif dan TIDAK boleh dihapus saat ditolak
      if (kepala && kepala.aktif && !d.akun_lama)
        throw new Error('Akun pendaftar sudah aktif, penolakan dibatalkan');

      await L.panggil(`/rest/v1/pendaftaran_sekolah?id=eq.${id}`, 'PATCH', {
        status: 'ditolak',
        catatan_tolak: alasan || null,
        diproses: new Date().toISOString(),
        diproses_oleh: user.id
      }, { Prefer: 'return=minimal' });

      // Hapus akun pendaftar agar username dan nomornya bisa dipakai lagi (bukan untuk akun lama)
      if (d.profil_id && !d.akun_lama) {
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
        bantuan: L.bantuanBuat(user.id, t.id, sid),
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
      const tabungan = b.jenis === 'tabungan';
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
          (tabungan
            ? 'Untuk menjaga kapasitas penyimpanan, data tabungan siswa akan segera dihapus. '
            : 'Untuk menjaga kapasitas penyimpanan, data absensi akan segera dihapus. ') +
          (tabungan
            ? 'Mohon segera mengunduh rekap saldo tabungan di menu *Tabungan > Rekap & Laporan* (PDF atau XLSX)'
            : 'Mohon segera mengunduh rekap absensi di menu *Pengaturan > Tahun Ajaran* (PDF atau XLSX)') +
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
        aksi: tabungan ? 'beritahu_kepala_tabungan' : 'beritahu_kepala',
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
      await verifSandiDev(user, token, b);
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
    // KOSONGKAN TABEL TABUNGAN (tabungan_transaksi dan tabungan_bawaan)
    // ---------------------------------------------------------
    if (b.aksi === 'hapus_tabungan') {
      if (String(b.konfirmasi || '').trim() !== 'HAPUS TABUNGAN')
        throw new Error('Ketik HAPUS TABUNGAN persis seperti contoh untuk melanjutkan');
      await verifSandiDev(user, token, b);
      // Pengaman: sebaiknya Kepala Sekolah sudah diberi tahu (pemberitahuan tabungan) dalam 7 hari terakhir
      if (!b.lanjut_tanpa_pemberitahuan) {
        const tujuhHari = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
        const sudah =
          (await L.panggil(
            `/rest/v1/log_audit?aksi=eq.beritahu_kepala_tabungan&waktu=gt.${encodeURIComponent(tujuhHari)}&select=id&limit=1`,
            'GET'
          )) || [];
        if (!sudah.length) throw new Error('BELUM_ADA_PEMBERITAHUAN');
      }
      const hasil = await L.panggil('/rest/v1/rpc/developer_kosongkan_tabungan', 'POST', {
        p_oleh: user.id
      });
      const nt = Number(hasil && hasil.transaksi) || 0;
      const nb = Number(hasil && hasil.bawaan) || 0;
      await L.catatLog({
        pelaku: user.id,
        aksi: 'hapus_tabungan',
        rincian: `Tabel tabungan dikosongkan (${nt} transaksi, ${nb} saldo bawaan)`
      });
      return res.status(200).json({ ok: true, transaksi: nt, bawaan: nb });
    }

    // ---------------------------------------------------------
    // BERITAHU KEPALA SEKOLAH: DATA SEKOLAH AKAN DIHAPUS
    // ---------------------------------------------------------
    if (b.aksi === 'beritahu_hapus_sekolah') {
      const sid = Number(b.sekolah_id);
      const batas = teks(b.batas, 60);
      if (!Number.isInteger(sid) || sid <= 0) throw new Error('Sekolah tidak valid');
      const sk = await satu(`/rest/v1/sekolah?id=eq.${sid}&select=nama`);
      if (!sk) throw new Error('Sekolah tidak ditemukan');
      const baris =
        (await L.panggil(
          `/rest/v1/keanggotaan?sekolah_id=eq.${sid}&role=eq.kepala_sekolah&aktif=eq.true&select=profil(nama,no_wa,aktif)`,
          'GET'
        )) || [];
      const kepala = baris.map((x) => x.profil).find((p) => p && p.aktif);
      if (!kepala) throw new Error('Sekolah ini belum punya Kepala Sekolah aktif');
      if (!kepala.no_wa || !L.RE_WA.test(kepala.no_wa))
        throw new Error('Nomor WhatsApp Kepala Sekolah belum valid');
      const pesan =
        `📢 *PEMBERITAHUAN PENGEMBANG SISTEM ABSENSI*\n\n` +
        `Yth. Bapak/Ibu Kepala Sekolah *${sk.nama}*,\n\n` +
        `Data sekolah Anda di sistem ini akan segera dihapus secara permanen. ` +
        `Mohon segera mengunduh rekap absensi di menu *Pengaturan > Tahun Ajaran* ` +
        `dan rekap tabungan di menu *Tabungan > Rekap & Laporan* (PDF atau XLSX)` +
        `${batas ? ` paling lambat *${batas}*` : ''}.\n\n` +
        `Data yang sudah dihapus tidak dapat dikembalikan. Terima kasih 🙏`;
      let terkirim = 0;
      try {
        await L.kirimDev(kepala.no_wa, pesan);
        terkirim = 1;
      } catch (e) {
        console.error('beritahu_hapus_sekolah gagal:', e.message);
      }
      await L.catatLog({
        pelaku: user.id,
        sekolah_id: terkirim ? sid : null,
        aksi: terkirim ? 'beritahu_hapus_sekolah' : 'beritahu_hapus_sekolah_gagal',
        rincian: `${sk.nama}: ${terkirim ? 'terkirim' : 'gagal'} ke ${kepala.nama}${batas ? ', batas ' + batas : ''}`
      });
      return res.status(200).json({ ok: true, terkirim });
    }

    // ---------------------------------------------------------
    // HAPUS SEKOLAH PERMANEN (seluruh data satu sekolah)
    // ---------------------------------------------------------
    if (b.aksi === 'hapus_sekolah') {
      const sid = Number(b.sekolah_id);
      if (!Number.isInteger(sid) || sid <= 0) throw new Error('Sekolah tidak valid');
      const sk = await satu(`/rest/v1/sekolah?id=eq.${sid}&select=id,nama`);
      if (!sk) throw new Error('Sekolah tidak ditemukan');
      if (String(b.konfirmasi || '').trim() !== String(sk.nama || '').trim())
        throw new Error('Nama sekolah yang diketik tidak sama');
      await verifSandiDev(user, token, b);

      // Pengaman: sebaiknya Kepala Sekolah sudah diberi tahu dalam 7 hari terakhir
      if (!b.lanjut_tanpa_pemberitahuan) {
        const tujuhHari = new Date(Date.now() - 7 * 24 * 3600000).toISOString();
        const sudah =
          (await L.panggil(
            `/rest/v1/log_audit?aksi=eq.beritahu_hapus_sekolah&sekolah_id=eq.${sid}&waktu=gt.${encodeURIComponent(tujuhHari)}&select=id&limit=1`,
            'GET'
          )) || [];
        if (!sudah.length) throw new Error('BELUM_ADA_PEMBERITAHUAN');
      }

      // Hapus semua data sekolah di database (fungsi SQL developer_hapus_sekolah)
      const hasil = await L.panggil('/rest/v1/rpc/developer_hapus_sekolah', 'POST', {
        p_sekolah: sid
      });
      const yatim = (hasil && Array.isArray(hasil.akun_yatim) && hasil.akun_yatim) || [];

      // Hapus akun guru yang hanya terdaftar di sekolah ini
      let akunDihapus = 0;
      for (const uid of yatim) {
        try {
          await L.panggil(`/rest/v1/profil?id=eq.${uid}`, 'DELETE');
        } catch (e) {
          console.error('Hapus profil gagal:', e.message);
        }
        try {
          await L.panggil('/auth/v1/admin/users/' + uid, 'DELETE');
          akunDihapus++;
        } catch (e) {
          console.error('Hapus akun auth gagal:', e.message);
        }
      }

      // Rapikan jadwal cron Alpa Otomatis
      try {
        await L.panggil('/rest/v1/rpc/sinkronkan_jadwal_alpa', 'POST', {});
      } catch (e) {
        console.error('Sinkron jadwal alpa gagal:', e.message);
      }

      await L.catatLog({
        pelaku: user.id,
        aksi: 'hapus_sekolah',
        rincian: `${sk.nama} (id ${sid}) dihapus permanen, ${akunDihapus} akun guru ikut dihapus`
      });
      return res.status(200).json({ ok: true, akun_dihapus: akunDihapus });
    }

    // ---------------------------------------------------------
    // SINKRON JADWAL ALPA
    // ---------------------------------------------------------
    if (b.aksi === 'sinkron_alpa') {
      await L.panggil('/rest/v1/rpc/sinkronkan_jadwal_alpa', 'POST', {});
      await L.catatLog({ pelaku: user.id, aksi: 'sinkron_alpa', rincian: 'Jadwal Alpa Otomatis disinkronkan ulang' });
      return res.status(200).json({ ok: true });
    }


    // ---------------------------------------------------------
    // PEMANTAUAN PEMAKAIAN AI (khusus Developer + AAL2)
    // ---------------------------------------------------------
    if (b.aksi === 'pemantauan_ai') {
      if (!L.SB || !L.KEY) throw new Error('Konfigurasi Supabase belum lengkap');
      const [ringkasan, riwayat, pengaman, geminiKeys, gangguan, antrean] = await Promise.all([
        L.panggil('/rest/v1/rpc/developer_pemakaian_ai_ringkasan', 'POST', {}),
        L.panggil('/rest/v1/pemakaian_ai_riwayat?select=id,created_at,sekolah_id,sekolah(nama),layanan,model,input_tokens,output_tokens,total_tokens,status,kode_error&order=created_at.desc&limit=200', 'GET'),
        L.panggil('/rest/v1/rpc/developer_gemini_pengaman', 'POST', {}),
        L.panggil('/rest/v1/gemini_api_key_sekolah?select=id,sekolah_id,sekolah(nama),label,aktif,urutan,status_terakhir,kode_error_terakhir,detail_error,error_permanen,terakhir_dicoba,terakhir_error,terakhir_berhasil,cooldown_until,next_allowed_at,jumlah_permintaan_window,consecutive_429,reservasi_mulai,reservasi_sampai,ditangani_oleh,ditangani_pada&order=sekolah_id.asc,urutan.asc,id.asc', 'GET'),
        L.panggil('/rest/v1/gemini_pengaman_sekolah?select=sekolah_id,sekolah(nama),model,status_gangguan,gangguan_mulai,next_retry_at,developer_notified_at,sekolah_notified_at,detail_gangguan,ditangani_oleh,ditangani_pada&status_gangguan=neq.normal&order=gangguan_mulai.desc', 'GET'),
        L.panggil('/rest/v1/pesan_ai_antrean?select=id,sekolah_id,sekolah(nama),status,jumlah_percobaan,coba_lagi_pada,dibuat,api_key_id&order=dibuat.asc&limit=500', 'GET')
      ]);
      return res.status(200).json({
        ok: true,
        ringkasan: ringkasan || {},
        riwayat: Array.isArray(riwayat) ? riwayat : [],
        pengaman: Array.isArray(pengaman) ? pengaman : [],
        gemini_keys: Array.isArray(geminiKeys) ? geminiKeys : [],
        gangguan: Array.isArray(gangguan) ? gangguan : [],
        antrean: Array.isArray(antrean) ? antrean : [],
        batas_riwayat_hari: 30,
        diperbarui: new Date().toISOString()
      });
    }

    if (b.aksi === 'tandai_ai_key_ditangani' || b.aksi === 'tangani_ai_key') {
      const sekolahId = Number(b.sekolah_id), keyId = Number(b.key_id);
      if (!Number.isInteger(sekolahId) || sekolahId <= 0 || !Number.isInteger(keyId) || keyId <= 0)
        throw new Error('Sekolah atau API Key tidak valid');
      const rows = await L.panggil(
        `/rest/v1/gemini_api_key_sekolah?id=eq.${keyId}&sekolah_id=eq.${sekolahId}&select=id,label,aktif,error_permanen`,
        'GET'
      );
      if (!Array.isArray(rows) || !rows.length) throw new Error('API Key tidak ditemukan pada sekolah tersebut');
      if (!rows[0].aktif) throw new Error('API Key sedang nonaktif. Aktifkan terlebih dahulu di Pengaturan.');
      if (rows[0].error_permanen !== true) throw new Error('API Key ini tidak lagi berstatus Perlu Perbaikan.');
      const waktuTangani = new Date().toISOString();
      await L.panggil(
        `/rest/v1/gemini_api_key_sekolah?id=eq.${keyId}&sekolah_id=eq.${sekolahId}&error_permanen=eq.true`,
        'PATCH',
        { error_permanen: false, dev_notified_at: null, ditangani_oleh: user.id, ditangani_pada: waktuTangani },
        { Prefer: 'return=minimal' }
      );
      try {
        await L.panggil('/rest/v1/rpc/gemini_jadwalkan_retry', 'POST', { p_sekolah_id: sekolahId, p_delay_menit: 0 });
      } catch (e) {
        await L.panggil(
          `/rest/v1/gemini_api_key_sekolah?id=eq.${keyId}&sekolah_id=eq.${sekolahId}`,
          'PATCH',
          { error_permanen: true, ditangani_oleh: null, ditangani_pada: null },
          { Prefer: 'return=minimal' }
        ).catch(() => {});
        throw new Error('Key gagal dijadwalkan untuk diuji ulang: ' + e.message);
      }
      await L.catatLog({
        pelaku: user.id, sekolah_id: sekolahId,
        aksi: 'gemini_api_key_ditangani',
        rincian: 'Developer memperbaiki konfigurasi dan menjadwalkan uji ulang ' + rows[0].label
      });
      return res.status(200).json({ ok: true, key_id: keyId, status: 'menunggu_uji' });
    }

    if (b.aksi === 'tandai_ai_ditangani' || b.aksi === 'jadwalkan_pemulihan_ai') {
      const sekolahId = Number(b.sekolah_id);
      if (!Number.isInteger(sekolahId) || sekolahId <= 0) throw new Error('Sekolah tidak valid');
      const rows = await L.panggil(
        `/rest/v1/gemini_pengaman_sekolah?sekolah_id=eq.${sekolahId}&model=eq.gemini-3.5-flash-lite&select=sekolah_id,status_gangguan`,
        'GET'
      );
      if (!Array.isArray(rows) || !rows.length || rows[0].status_gangguan === 'normal')
        throw new Error('Tidak ada insiden AI aktif untuk sekolah ini');
      // Jangan mengubah status insiden menjadi normal/menunggu_uji di sini.
      // Webhook tetap menahan pesan pada mode manual sampai probe otomatis berhasil.
      await L.panggil('/rest/v1/rpc/gemini_jadwalkan_retry', 'POST', {
        p_sekolah_id: sekolahId, p_delay_menit: 0
      });
      await L.catatLog({
        pelaku: user.id, sekolah_id: sekolahId,
        aksi: 'gemini_gangguan_ditangani',
        rincian: 'Developer menjadwalkan probe pemulihan AI; status insiden tetap aktif sampai probe berhasil'
      });
      return res.status(200).json({ ok: true, status: 'probe_dijadwalkan' });
    }

    if (b.aksi === 'hapus_riwayat_ai' || b.aksi === 'hapus_ringkasan_ai') {
      // Penghapusan wajib dibatasi ke satu sekolah; pilihan "Semua sekolah" ditolak.
      const sekolahId = Number(b.sekolah_id);
      if (!Number.isSafeInteger(sekolahId) || sekolahId <= 0)
        throw new Error('Pilih satu sekolah tertentu sebelum menghapus data AI');
      const sekolah = await satu(
        `/rest/v1/sekolah?id=eq.${sekolahId}&select=id,nama`
      );
      if (!sekolah) throw new Error('Sekolah yang dipilih tidak ditemukan');

      const hapusRingkasan = b.aksi === 'hapus_ringkasan_ai';
      const tabel = hapusRingkasan
        ? 'pemakaian_ai_ringkasan_harian'
        : 'pemakaian_ai_riwayat';
      const filterTanggal = hapusRingkasan ? '&tanggal=not.is.null' : '';
      const kolom = hapusRingkasan
        ? 'tanggal,sekolah_id,layanan,model'
        : 'id';
      const rows = await L.panggil(
        `/rest/v1/${tabel}?sekolah_id=eq.${sekolahId}${filterTanggal}&select=${kolom}`,
        'DELETE',
        null,
        { Prefer: 'return=representation' }
      );
      const jumlah = Array.isArray(rows) ? rows.length : 0;
      await L.catatLog({
        pelaku: user.id,
        sekolah_id: sekolahId,
        aksi: b.aksi,
        rincian: (hapusRingkasan
          ? 'Ringkasan harian dan agregat bulanan pemakaian AI'
          : 'Riwayat rinci pemakaian AI') +
          ' sekolah ' + sekolah.nama + ' dihapus (' + jumlah + ' baris)'
      });
      return res.status(200).json({ ok: true, jumlah, sekolah_id: sekolahId, nama_sekolah: sekolah.nama });
    }

    // ---------------------------------------------------------
    // PEMANTAUAN KUOTA FONNTE (khusus Developer + AAL2)
    // Tidak pernah mengirim pesan; hanya membaca profil perangkat.
    // ---------------------------------------------------------
    if (b.aksi === 'pemantauan_fonnte') {
      async function semuaRows(path) {
        const out = [];
        for (let offset = 0; offset < 50000; offset += 1000) {
          const rows = await L.panggil(path + '&limit=1000&offset=' + offset, 'GET');
          const isi = Array.isArray(rows) ? rows : [];
          out.push(...isi);
          if (isi.length < 1000) break;
        }
        return out;
      }
      const [sekolahRows, riwayatRows] = await Promise.all([
        semuaRows('/rest/v1/sekolah?select=id,nama,status&order=nama.asc'),
        semuaRows('/rest/v1/fonnte_kuota_harian?select=id,sekolah_id,token_id,token_label,perangkat,tanggal,kuota_sisa,pemakaian_harian,kuota_ditambahkan,pesan_total,paket,expired,status_perangkat,status_pemeriksaan,detail_error,diperiksa_pada&order=tanggal.desc,diperiksa_pada.desc')
      ]);
      return res.status(200).json({
        ok: true,
        sekolah: (sekolahRows || []).map(x => ({
          id: Number(x.id), nama: x.nama, status: x.status
        })),
        riwayat: riwayatRows || [],
        diperbarui: new Date().toISOString()
      });
    }

    // ---------------------------------------------------------
    // PEMANTAUAN STORAGE SUPABASE (khusus Developer + AAL2)
    // ---------------------------------------------------------
    if (b.aksi === 'pemantauan_storage') {
      if (!L.SB || !L.KEY) throw new Error('Konfigurasi Supabase belum lengkap');
      const dasar = String(L.SB).replace(/\/$/, '');
      const headers = { apikey: L.KEY, Authorization: 'Bearer ' + L.KEY, 'Content-Type': 'application/json' };
      async function storageReq(path, method, body) {
        const r = await fetch(dasar + path, {
          method: method || 'GET', headers,
          ...(body === undefined ? {} : { body: JSON.stringify(body) })
        });
        const raw = await r.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch (_) {}
        if (!r.ok) {
          const pesan = data && (data.message || data.error) || raw || ('HTTP ' + r.status);
          throw new Error(String(pesan).slice(0, 240));
        }
        return data;
      }
      async function semuaRows(path) {
        const out = [];
        for (let offset = 0; offset < 50000; offset += 1000) {
          const pemisah = path.includes('?') ? '&' : '?';
          const rows = await L.panggil(path + pemisah + 'limit=1000&offset=' + offset, 'GET');
          const isi = Array.isArray(rows) ? rows : [];
          out.push(...isi);
          if (isi.length < 1000) break;
        }
        return out;
      }
      const [sekolahRows, siswaRows, profilRows, anggotaRows] = await Promise.all([
        semuaRows('/rest/v1/sekolah?select=id,nama&order=nama.asc'),
        semuaRows('/rest/v1/siswa?select=id,nama,sekolah_id,foto_path'),
        semuaRows('/rest/v1/profil?select=id,nama,ttd_path'),
        semuaRows('/rest/v1/keanggotaan?select=sekolah_id,profil_id,aktif')
      ]);
      const sekolahMap = new Map(sekolahRows.map(x => [Number(x.id), {
        id: Number(x.id), nama: x.nama, jumlah_foto: 0, ukuran_foto: 0,
        jumlah_ttd: 0, ukuran_ttd: 0, jumlah_file: 0, ukuran_byte: 0, daftar_file: []
      }]));
      const siswaPath = new Map(siswaRows.filter(x => x.foto_path).map(x => [String(x.foto_path), x]));
      const profilMap = new Map(profilRows.map(x => [String(x.id), x]));
      const anggotaMap = new Map();
      for (const x of anggotaRows) {
        const id = String(x.profil_id);
        if (!anggotaMap.has(id)) anggotaMap.set(id, []);
        anggotaMap.get(id).push({ sekolah_id: Number(x.sekolah_id), aktif: !!x.aktif });
      }
      const daftar = await storageReq('/storage/v1/bucket', 'GET');
      const hasil = [];
      const fileByBucket = {};
      for (const bucket of (Array.isArray(daftar) ? daftar : [])) {
        const item = { id: bucket.id, nama: bucket.name || bucket.id, publik: !!bucket.public, jumlah_file: 0, ukuran_byte: 0, terpotong: false, error: null };
        const files = [];
        try {
          const antre = [''];
          let dipindai = 0;
          while (antre.length && dipindai < 20000) {
            const prefix = antre.pop();
            let offset = 0;
            while (dipindai < 20000) {
              const rows = await storageReq('/storage/v1/object/list/' + encodeURIComponent(bucket.id), 'POST', {
                prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' }
              });
              const isi = Array.isArray(rows) ? rows : [];
              for (const obj of isi) {
                dipindai++;
                if (obj && (obj.id || obj.metadata)) {
                  const size = Math.max(0, Number(obj.metadata && obj.metadata.size) || 0);
                  const path = prefix ? prefix + '/' + obj.name : obj.name;
                  item.jumlah_file++;
                  item.ukuran_byte += size;
                  files.push({
                    path, ukuran_byte: size,
                    diperbarui: obj.updated_at || obj.created_at || obj.metadata?.lastModified || null,
                    mime: obj.metadata?.mimetype || null
                  });
                } else if (obj && obj.name && prefix.split('/').filter(Boolean).length < 12) {
                  antre.push(prefix ? prefix + '/' + obj.name : obj.name);
                }
                if (dipindai >= 20000) break;
              }
              if (isi.length < 1000 || dipindai >= 20000) break;
              offset += isi.length;
            }
          }
          item.terpotong = antre.length > 0 || dipindai >= 20000;
        } catch (e) {
          item.error = e.message || 'Gagal membaca isi bucket';
        }
        fileByBucket[item.id] = files;
        hasil.push(item);
      }

      function catatFile(sid, data) {
        const sk = sekolahMap.get(Number(sid));
        if (!sk) return;
        sk.daftar_file.push(data);
        sk.jumlah_file++;
        sk.ukuran_byte += data.ukuran_byte;
        if (data.jenis === 'Foto siswa') {
          sk.jumlah_foto++;
          sk.ukuran_foto += data.ukuran_byte;
        } else if (data.jenis === 'Tanda tangan guru') {
          sk.jumlah_ttd++;
          sk.ukuran_ttd += data.ukuran_byte;
        }
      }
      for (const f of (fileByBucket['foto-siswa'] || [])) {
        const bagian = String(f.path).split('/');
        const sid = Number(bagian[0]);
        const siswa = siswaPath.get(f.path) || null;
        catatFile(sid, {
          jenis: 'Foto siswa', nama: siswa?.nama || 'Foto siswa (tidak tertaut)',
          pemilik: siswa?.nama || ('ID file: ' + (bagian[1] || f.path)),
          path: f.path, ukuran_byte: f.ukuran_byte, diperbarui: f.diperbarui,
          status: siswa ? 'Terhubung ke data siswa' : 'Tidak tertaut ke data siswa'
        });
      }
      for (const f of (fileByBucket['ttd-guru'] || [])) {
        const bagian = String(f.path).split('/');
        const pid = bagian[0];
        const profil = profilMap.get(pid) || null;
        const anggota = anggotaMap.get(pid) || [];
        const aktif = !!(profil && profil.ttd_path === f.path);
        const sekolahPemilik = anggota.length ? anggota : [];
        for (const k of sekolahPemilik) {
          catatFile(k.sekolah_id, {
            jenis: 'Tanda tangan guru', nama: profil?.nama || 'Tanda tangan (akun tidak ditemukan)',
            pemilik: profil?.nama || pid, path: f.path, ukuran_byte: f.ukuran_byte,
            diperbarui: f.diperbarui,
            status: aktif ? 'Tanda tangan aktif' : 'File lama/tidak tertaut',
            keanggotaan: k.aktif ? 'Aktif' : 'Nonaktif',
            dipakaiLintasSekolah: sekolahPemilik.length > 1
          });
        }
      }
      const rincianSekolah = [...sekolahMap.values()].map(sk => ({
        ...sk,
        daftar_file: sk.daftar_file.sort((x, y) =>
          (x.jenis === y.jenis ? x.nama.localeCompare(y.nama, 'id') : x.jenis.localeCompare(y.jenis, 'id')))
      })).sort((x, y) => x.nama.localeCompare(y.nama, 'id'));
      return res.status(200).json({
        ok: true, buckets: hasil, sekolah_storage: rincianSekolah,
        diperbarui: new Date().toISOString()
      });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('developer.js', e.message);
    return res.status(400).json({ error: e.message });
  }
};
