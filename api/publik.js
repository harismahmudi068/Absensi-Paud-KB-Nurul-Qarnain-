// Fungsi server untuk aksi PUBLIK (tanpa login).
// Aksi:
//   otp_kirim  -> kirim kode OTP ke nomor WhatsApp (keperluan: daftar)
//   daftar     -> daftarkan sekolah baru (wajib kode OTP); menunggu persetujuan developer
// Environment Variables: lihat api/_lib.js

const L = require('./_lib');

const KEPERLUAN_BOLEH = ['daftar'];
const MAKS_DAFTAR_PER_IP_HARI = 5;

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

      if (keperluan === 'daftar' && (await adaProfil('no_wa', nomor)))
        throw new Error(
          'Nomor WhatsApp ini sudah memiliki akun atau pendaftaran yang sedang diproses'
        );

      await L.kirimOtp({
        nomor,
        keperluan,
        ip,
        pembuka: 'Kode verifikasi pendaftaran sekolah'
      });
      return res.status(200).json({ ok: true });
    }

    // ---------------------------------------------------------
    // DAFTAR SEKOLAH
    // ---------------------------------------------------------
    if (b.aksi === 'daftar') {
      const namaSekolah = teks(b.nama_sekolah, 80);
      const alamat = teks(b.alamat, 150);
      const namaKepala = teks(b.nama_kepala, 80);
      const nip = teks(b.nip, 30);
      const nomor = L.normWA(b.nomor);
      const username = String(b.username || '').trim().toLowerCase();
      const sandi = String(b.sandi || '');

      if (namaSekolah.length < 3) throw new Error('Nama sekolah minimal 3 karakter');
      if (namaKepala.length < 3) throw new Error('Nama kepala sekolah minimal 3 karakter');
      if (!L.RE_WA.test(nomor)) throw new Error('Nomor WhatsApp tidak valid');
      if (!L.RE_USER.test(username)) throw new Error(L.PESAN_USER);
      if (sandi.length < 6) throw new Error('Kata sandi minimal 6 karakter');

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

      if (await adaProfil('no_wa', nomor))
        throw new Error(
          'Nomor WhatsApp ini sudah memiliki akun atau pendaftaran yang sedang diproses'
        );
      if (await adaProfil('username', username)) throw new Error('Username sudah dipakai');

      // Bukti memegang nomor
      await L.cekOtp(nomor, 'daftar', b.kode);

      // Akun dibuat NONAKTIF: baru bisa dipakai setelah disetujui developer.
      const baru = await L.panggil('/auth/v1/admin/users', 'POST', {
        email: username + '@absensi.local',
        password: sandi,
        email_confirm: true,
        user_metadata: { nama: namaKepala }
      });

      let profilDibuat = false;
      let idDaftar = null;
      try {
        await L.panggil(
          '/rest/v1/profil',
          'POST',
          {
            id: baru.id,
            nama: namaKepala,
            username,
            role: 'kepala_sekolah',
            aktif: false,
            no_wa: nomor,
            nip: nip || null
          },
          { Prefer: 'return=minimal' }
        );
        profilDibuat = true;

        const d = await L.panggil(
          '/rest/v1/pendaftaran_sekolah',
          'POST',
          {
            profil_id: baru.id,
            nama_sekolah: namaSekolah,
            alamat: alamat || null,
            ip: ip || null
          },
          { Prefer: 'return=representation' }
        );
        idDaftar = d && d[0] && d[0].id;
      } catch (e) {
        if (profilDibuat) {
          try {
            await L.panggil(`/rest/v1/profil?id=eq.${baru.id}`, 'DELETE');
          } catch (_) {}
        }
        try {
          await L.panggil('/auth/v1/admin/users/' + baru.id, 'DELETE');
        } catch (_) {}
        const m = e.message || '';
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
          `👤 Kepala sekolah: ${namaKepala}`,
          `📱 WhatsApp: ${nomor}`,
          '',
          'Buka dashboard developer untuk menyetujui atau menolak.'
        ]
          .filter((x) => x !== null)
          .join('\n')
      );

      return res.status(200).json({ ok: true, id: idDaftar });
    }

    return res.status(400).json({ error: 'Aksi tidak dikenal' });
  } catch (e) {
    console.error('publik.js', e.message);
    return res.status(400).json({ error: e.message });
  }
};
