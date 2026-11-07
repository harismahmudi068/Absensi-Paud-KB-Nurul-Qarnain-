// Fungsi server untuk aksi PUBLIK (tanpa login).
// Aksi:
//   otp_kirim  -> kirim kode OTP ke nomor WhatsApp (keperluan: daftar)
//   daftar     -> daftarkan sekolah baru (wajib kode OTP); menunggu persetujuan developer.
//                 Pendaftar memilih peran: 'kepala_sekolah' (bawaan) atau 'operator'.
//                 Operator wajib mengisi data kepala sekolah (nama, nomor WA, NIP opsional);
//                 akun kepala dibuat kemudian oleh operator lewat menu Guru.
//                 Satu nomor WhatsApp = satu akun. Bila nomor sudah punya akun AKTIF, sekolah baru
//                 dipasang ke akun lama itu (tanpa akun baru); peran di sekolah baru mengikuti
//                 pendaftaran. Nomor Developer atau akun yang belum aktif ditolak.
//   reset_kirim   -> kirim kode OTP reset ke nomor WhatsApp (respons selalu seragam)
//   reset_selesai -> reset sandi / username / keduanya setelah kode benar
//   hilang_otp    -> kirim kode OTP ke NOMOR BARU (nomor lama hilang)
//   hilang_kirim  -> ajukan permintaan ganti nomor; menunggu persetujuan developer
// Environment Variables: lihat api/_lib.js

const L = require('./_lib');

const KEPERLUAN_BOLEH = ['daftar'];
const MAKS_DAFTAR_PER_IP_HARI = 5;
const MAKS_HILANG_PER_IP_HARI = 5;

function teks(v, maks) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, maks);
}

async function adaProfil(kolom, nilai) {
  const r = await L.panggil(
    `/rest/v1/profil?${kolom}=eq.${encodeURIComponent(nilai)}&select=id`,
    'GET'
  );
  return !!(r && r.length);
}

// Akun lama pemilik nomor (satu akun boleh memegang beberapa sekolah).
// null = nomor belum punya akun. Melempar galat bila nomor tidak boleh dipakai mendaftar.
async function akunDenganNomor(nomor) {
  const r = await L.panggil(
    `/rest/v1/profil?no_wa=eq.${encodeURIComponent(nomor)}&select=id,nama,aktif,role&limit=1`,
    'GET'
  );
  const p = r && r[0];
  if (!p) return null;
  if (p.role === 'developer')
    throw new Error('Nomor WhatsApp ini tidak dapat dipakai untuk mendaftarkan sekolah');
  if (!p.aktif)
    throw new Error(
      'Akun dengan nomor WhatsApp ini belum aktif (pendaftaran sebelumnya masih diproses atau akun dinonaktifkan). Tunggu persetujuan atau hubungi admin'
    );
  return p;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    if (!L.SB || !L.KEY) return res.status(200).send('API publik belum dikonfigurasi');
    return res.status(200).send('API publik aktif');
  }
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Metode tidak diizinkan' });

  try {
    const b = req.body || {};
    const ip = L.ipDari(req);

    // ---------------------------------------------------------
    // KIRIM OTP
    // ---------------------------------------------------------
    if (b.aksi === 'otp_kirim') {
      const keperluan = String(b.keperluan || '');
      if (!KEPERLUAN_BOLEH.includes(keperluan)) throw new Error('Permintaan tidak valid');

      const nomor = L.normWA(b.nomor);
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp tidak valid');

      let akunAda = false;
      if (keperluan === 'daftar') akunAda = !!(await akunDenganNomor(nomor));

      await L.kirimOtp({
        nomor,
        keperluan,
        ip,
        pembuka: 'Kode verifikasi pendaftaran sekolah'
      });
      return res.status(200).json({ ok: true, akun_ada: akunAda });
    }

    // ---------------------------------------------------------
    // DAFTAR SEKOLAH
    // ---------------------------------------------------------
    if (b.aksi === 'daftar') {
      const peran = b.peran === 'operator' ? 'operator' : 'kepala_sekolah';
      const adaOperator = peran === 'operator';
      const namaSekolah = teks(b.nama_sekolah, 80);
      const alamat = teks(b.alamat, 150);
      const kota = teks(b.kota, 60);
      const nomor = L.normWA(b.nomor);
      const username = String(b.username || '').trim().toLowerCase();
      const sandi = String(b.sandi || '');

      if (namaSekolah.length < 3) throw new Error('Nama sekolah minimal 3 karakter');
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp tidak valid');

      // Satu nomor = satu akun. Bila sudah punya akun aktif, sekolah baru dipasang ke akun itu:
      // username, sandi, nama, dan NIP akun lama tidak berubah.
      const akunLama = await akunDenganNomor(nomor);

      // Nama pemilik akun yang mendaftar (kepala sekolah, atau operator)
      const namaAkun = akunLama
        ? akunLama.nama || ''
        : teks(adaOperator ? b.nama_operator : b.nama_kepala, 80);
      const nip = akunLama ? '' : teks(b.nip, 30);
      // Data kepala sekolah: untuk pendaftar kepala = dirinya sendiri; untuk operator = diisi terpisah
      const namaKepala = adaOperator ? teks(b.nama_kepala, 80) : namaAkun;
      const nipKepala = adaOperator ? teks(b.nip_kepala, 30) : nip;
      const waKepala = adaOperator ? L.normWA(b.wa_kepala) : nomor;

      if (!akunLama && namaAkun.length < 3)
        throw new Error(adaOperator ? 'Nama Anda minimal 3 karakter' : 'Nama kepala sekolah minimal 3 karakter');
      if (adaOperator) {
        if (namaKepala.length < 3) throw new Error('Nama kepala sekolah minimal 3 karakter');
        if (!L.RE_WA.test(waKepala)) throw new Error('Nomor WhatsApp kepala sekolah tidak valid');
        if (waKepala === nomor)
          throw new Error('Nomor WhatsApp kepala sekolah harus berbeda dari nomor Anda');
      }
      if (!akunLama) {
        if (!L.RE_USER.test(username)) throw new Error(L.PESAN_USER);
        if (sandi.length < 6) throw new Error('Kata sandi minimal 6 karakter');
      }

      // Batas pendaftaran per perangkat per hari
      if (ip) {
        const kemarin = new Date(Date.now() - 24 * 3600000).toISOString();
        const dariIp =
          (await L.panggil(
            `/rest/v1/pendaftaran_sekolah?ip=eq.${encodeURIComponent(ip)}&dibuat=gt.${encodeURIComponent(kemarin)}&select=id&limit=${MAKS_DAFTAR_PER_IP_HARI}`,
            'GET'
          )) || [];
        if (dariIp.length >= MAKS_DAFTAR_PER_IP_HARI)
          throw new Error('Terlalu banyak pendaftaran dari perangkat ini hari ini. Coba lagi besok');
      }

      if (akunLama) {
        // Cegah pendaftaran ganda (mis. tombol ditekan dua kali) untuk sekolah yang sama
        const menunggu =
          (await L.panggil(
            `/rest/v1/pendaftaran_sekolah?profil_id=eq.${akunLama.id}&status=eq.menunggu&select=nama_sekolah`,
            'GET'
          )) || [];
        if (menunggu.some((x) => String(x.nama_sekolah || '').trim().toLowerCase() === namaSekolah.toLowerCase()))
          throw new Error('Pendaftaran sekolah ini sudah diajukan dan sedang diperiksa admin');
      } else if (await adaProfil('username', username)) {
        throw new Error('Username sudah dipakai');
      }

      // Bukti memegang nomor
      await L.cekOtp(nomor, 'daftar', b.kode);

      // Akun baru dibuat NONAKTIF: baru bisa dipakai setelah disetujui developer.
      // Akun lama dipakai apa adanya.
      const baru = akunLama
        ? null
        : await L.panggil('/auth/v1/admin/users', 'POST', {
            email: username + '@absensi.local',
            password: sandi,
            email_confirm: true,
            user_metadata: { nama: namaAkun }
          });
      const profilId = akunLama ? akunLama.id : baru.id;

      let profilDibuat = false;
      let idDaftar = null;
      try {
        if (!akunLama) {
          await L.panggil(
            '/rest/v1/profil',
            'POST',
            {
              id: baru.id,
              nama: namaAkun,
              username,
              // profil.role hanya mengenal kepala_sekolah/guru/developer; Operator disimpan 'guru'.
              // Peran sebenarnya di sekolah ditentukan saat disetujui (keanggotaan.role).
              role: adaOperator ? 'guru' : 'kepala_sekolah',
              aktif: false,
              no_wa: nomor,
              nip: nip || null
            },
            { Prefer: 'return=minimal' }
          );
          profilDibuat = true;
        }

        const d = await L.panggil(
          '/rest/v1/pendaftaran_sekolah',
          'POST',
          {
            profil_id: profilId,
            nama_sekolah: namaSekolah,
            alamat: alamat || null,
            kota: kota || null,
            akun_lama: !!akunLama,
            ip: ip || null,
            peran,
            nama_kepala: adaOperator ? namaKepala : null,
            nip_kepala: adaOperator ? nipKepala || null : null,
            wa_kepala: adaOperator ? waKepala : null
          },
          { Prefer: 'return=representation' }
        );
        idDaftar = d && d[0] && d[0].id;
      } catch (e) {
        // Hanya akun yang baru dibuat di sini yang dibatalkan; akun lama tidak pernah disentuh.
        if (profilDibuat) {
          try {
            await L.panggil(`/rest/v1/profil?id=eq.${baru.id}`, 'DELETE');
          } catch (_) {}
        }
        if (baru) {
          try {
            await L.panggil('/auth/v1/admin/users/' + baru.id, 'DELETE');
          } catch (_) {}
        }
        const m = e.message || '';
        if (akunLama) throw new Error(m);
        if (/no_wa/i.test(m) && L.pesanDuplikat(e))
          throw new Error('Nomor WhatsApp ini sudah memiliki akun atau pendaftaran');
        throw new Error(L.pesanDuplikat(e) ? 'Username sudah dipakai' : m);
      }

      await L.kabariDeveloper(
        [
          '🔔 *PENDAFTARAN SEKOLAH BARU*',
          '',
          `🏫 ${namaSekolah}`,
          alamat ? `📍 ${alamat}` : null,
          kota ? `🏙️ ${kota}` : null,
          akunLama ? `♻️ Akun lama (menambah sekolah): ${namaAkun}` : null,
          adaOperator ? `🧑‍💼 Didaftarkan oleh Operator: ${namaAkun}` : null,
          adaOperator ? `📱 WhatsApp operator: ${nomor}` : null,
          `👤 Kepala sekolah: ${namaKepala}`,
          adaOperator ? `📱 WhatsApp kepala: ${waKepala}` : `📱 WhatsApp: ${nomor}`,
          '',
          'Buka dashboard developer untuk menyetujui atau menolak.'
        ]
          .filter((x) => x !== null)
          .join('\n')
      );

      return res.status(200).json({ ok: true, id: idDaftar, akun_lama: !!akunLama });
    }

    // ---------------------------------------------------------
    // CEK KODE (tombol Verifikasi): tidak menghanguskan kode
    // ---------------------------------------------------------
    if (b.aksi === 'otp_cek') {
      const keperluan = String(b.keperluan || '');
      if (!['daftar', 'reset', 'nomor_hilang'].includes(keperluan))
        throw new Error('Permintaan tidak valid');
      const nomor = L.normWA(b.nomor);
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp tidak valid');
      await L.lihatOtp(nomor, keperluan, b.kode);
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // RESET: KIRIM KODE (respons seragam agar nomor tidak bisa ditebak)
    // ---------------------------------------------------------
    if (b.aksi === 'reset_kirim') {
      const nomor = L.normWA(b.nomor);
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp tidak valid');

      const r =
        (await L.panggil(
          `/rest/v1/profil?no_wa=eq.${encodeURIComponent(nomor)}&select=id,aktif,role`,
          'GET'
        )) || [];
      const akun = r[0];
      const layak = !!(akun && akun.aktif && akun.role !== 'developer');

      try {
        await L.kirimOtp({
          nomor,
          keperluan: 'reset',
          ip,
          pembuka: 'Kode untuk mengatur ulang akun absensi Anda',
          kosong: !layak
        });
      } catch (e) {
        if (/Tunggu|Terlalu banyak/.test(e.message)) throw e;
        console.error('reset_kirim:', e.message);
      }
      return res.status(200).json({
        ok: true,
        pesan: 'Jika nomor terdaftar, kode telah dikirim ke WhatsApp'
      });
    }

    // ---------------------------------------------------------
    // RESET: SELESAIKAN (sandi / username / keduanya)
    // ---------------------------------------------------------
    if (b.aksi === 'reset_selesai') {
      const mode = String(b.mode || '');
      if (!['sandi', 'username', 'keduanya'].includes(mode))
        throw new Error('Permintaan tidak valid');
      const nomor = L.normWA(b.nomor);
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp tidak valid');

      const usernameBaru = String(b.username_baru || '').trim().toLowerCase();
      const sandiBaru = String(b.sandi_baru || '');
      const ubahUser = mode === 'username' || mode === 'keduanya';
      const ubahSandi = mode === 'sandi' || mode === 'keduanya';
      if (ubahUser && !L.RE_USER.test(usernameBaru)) throw new Error(L.PESAN_USER);
      if (ubahSandi && sandiBaru.length < 6) throw new Error('Kata sandi minimal 6 karakter');

      const r =
        (await L.panggil(
          `/rest/v1/profil?no_wa=eq.${encodeURIComponent(nomor)}&select=id,aktif,role,username`,
          'GET'
        )) || [];
      const akun = r[0];
      if (!akun || !akun.aktif || akun.role === 'developer')
        throw new Error('Kode tidak valid atau sudah kedaluwarsa. Minta kode baru');

      if (ubahUser && usernameBaru !== akun.username && (await adaProfil('username', usernameBaru)))
        throw new Error('Username sudah dipakai. Pilih yang lain');

      await L.cekOtp(nomor, 'reset', b.kode);

      if (ubahSandi)
        await L.panggil('/auth/v1/admin/users/' + akun.id, 'PUT', { password: sandiBaru });
      let usernameAkhir = akun.username;
      if (ubahUser) {
        await L.ubahUsernameAkun(akun.id, akun.username, usernameBaru);
        usernameAkhir = usernameBaru;
      }
      await L.catatLog({
        pelaku: akun.id,
        aksi: 'reset_akun',
        rincian: 'Reset ' + mode + ' lewat OTP WhatsApp'
      });
      return res.status(200).json({ ok: true, username: usernameAkhir });
    }

    // ---------------------------------------------------------
    // NOMOR HILANG: KIRIM KODE KE NOMOR BARU
    // ---------------------------------------------------------
    if (b.aksi === 'hilang_otp') {
      const nomor = L.normWA(b.nomor);
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp baru tidak valid');
      if (await adaProfil('no_wa', nomor))
        throw new Error('Nomor ini sudah terhubung ke akun lain. Gunakan nomor yang belum terdaftar');
      const antre =
        (await L.panggil(
          `/rest/v1/permintaan_nomor?no_wa_baru=eq.${encodeURIComponent(nomor)}&status=eq.menunggu&select=id`,
          'GET'
        )) || [];
      if (antre.length) throw new Error('Permintaan dengan nomor ini sedang diperiksa admin');
      await L.kirimOtp({
        nomor,
        keperluan: 'nomor_hilang',
        ip,
        pembuka: 'Kode untuk memverifikasi nomor WhatsApp baru akun absensi Anda'
      });
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // NOMOR HILANG: AJUKAN PERMINTAAN
    // ---------------------------------------------------------
    if (b.aksi === 'hilang_kirim') {
      const nama = teks(b.nama, 80);
      const namaSekolah = teks(b.nama_sekolah, 80);
      const usernameLama = String(b.username_lama || '').trim().toLowerCase();
      const nomor = L.normWA(b.nomor);
      const usernameBaru = String(b.username_baru || '').trim().toLowerCase();
      const sandiBaru = String(b.sandi_baru || '');

      if (nama.length < 3) throw new Error('Nama lengkap minimal 3 karakter');
      if (namaSekolah.length < 3) throw new Error('Nama sekolah minimal 3 karakter');
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp baru tidak valid');
      if (usernameLama && !L.RE_USER.test(usernameLama)) throw new Error('Username lama tidak valid');
      if (usernameBaru && !L.RE_USER.test(usernameBaru)) throw new Error(L.PESAN_USER);
      if (sandiBaru && sandiBaru.length < 6) throw new Error('Kata sandi minimal 6 karakter');

      if (ip) {
        const kemarin = new Date(Date.now() - 24 * 3600000).toISOString();
        const dariIp =
          (await L.panggil(
            `/rest/v1/permintaan_nomor?ip=eq.${encodeURIComponent(ip)}&dibuat=gt.${encodeURIComponent(kemarin)}&select=id&limit=${MAKS_HILANG_PER_IP_HARI}`,
            'GET'
          )) || [];
        if (dariIp.length >= MAKS_HILANG_PER_IP_HARI)
          throw new Error('Terlalu banyak permintaan dari perangkat ini hari ini. Coba lagi besok');
      }

      if (await adaProfil('no_wa', nomor))
        throw new Error('Nomor ini sudah terhubung ke akun lain');
      if (usernameBaru && usernameBaru !== usernameLama && (await adaProfil('username', usernameBaru)))
        throw new Error('Username baru sudah dipakai. Pilih yang lain');

      await L.cekOtp(nomor, 'nomor_hilang', b.kode);

      try {
        await L.panggil(
          '/rest/v1/permintaan_nomor',
          'POST',
          {
            nama,
            nama_sekolah: namaSekolah,
            username_lama: usernameLama || null,
            no_wa_baru: nomor,
            username_baru: usernameBaru && usernameBaru !== usernameLama ? usernameBaru : null,
            sandi_enc: sandiBaru ? L.enkripsi(sandiBaru) : null,
            ip: ip || null
          },
          { Prefer: 'return=minimal' }
        );
      } catch (e) {
        if (L.pesanDuplikat(e))
          throw new Error('Permintaan dengan nomor ini sudah ada dan sedang diperiksa admin');
        throw e;
      }

      // Pemberitahuan ke nomor lama (bila username lama cocok), agar pemilik asli bisa waspada
      if (usernameLama) {
        try {
          const lama =
            (await L.panggil(
              `/rest/v1/profil?username=eq.${encodeURIComponent(usernameLama)}&select=no_wa,role`,
              'GET'
            )) || [];
          if (lama[0] && lama[0].no_wa && lama[0].role !== 'developer')
            await L.kirimDev(
              lama[0].no_wa,
              '⚠️ Ada permintaan mengganti nomor WhatsApp pada akun absensi Anda. Jika itu bukan Anda, abaikan pesan ini dan segera hubungi admin sekolah.'
            );
        } catch (e) {
          console.error('Pemberitahuan nomor lama gagal:', e.message);
        }
      }

      await L.kabariDeveloper(
        [
          '🔔 *PERMINTAAN NOMOR HILANG*',
          '',
          `👤 ${nama}`,
          `🏫 ${namaSekolah}`,
          usernameLama ? `🔑 Username lama: ${usernameLama}` : '🔑 Username lama: (tidak diisi)',
          `📱 Nomor baru: ${nomor}`,
          usernameBaru && usernameBaru !== usernameLama ? `✏️ Username baru: ${usernameBaru}` : null,
          sandiBaru ? '🔐 Mengajukan kata sandi baru' : null,
          '',
          'Buka menu Developer > Persetujuan untuk memeriksa dan menyetujui.'
        ]
          .filter((x) => x !== null)
          .join('\n')
      );

      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('publik.js', e.message);
    return res.status(400).json({ error: e.message });
  }
};
