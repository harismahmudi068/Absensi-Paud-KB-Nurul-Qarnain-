// api/piket-notif.js
// Pengiriman pengingat piket lewat Web Push (notifikasi di HP orang tua, tanpa kuota WhatsApp).
//
//  - Dipanggil oleh cron database (pg_cron + pg_net, fungsi kirim_notifikasi_piket) dua kali sehari:
//      pukul 18.00 WIB  -> waktu = 'malam' : piket BESOK
//      pukul 05.00 WIB  -> waktu = 'pagi'  : piket HARI INI
//  - Dilindungi rahasia bersama: header "Authorization: Bearer <CRON_RAHASIA>".
//  - Tanggal piket dihitung di server dari jam Jakarta, bukan dari kiriman pemanggil.
//  - Hari libur (mingguan, nasional, tanggal, dikurangi pembatalan) dilewati per kelas.
//  - Satu HP yang terdaftar untuk beberapa anak menerima SATU notifikasi gabungan.
//  - Alamat push yang sudah mati (404/410) atau gagal 5 kali berturut-turut dihapus otomatis.
//  - Setiap sekolah dicatat di tabel piket_notif_log (anti kiriman ganda + bahan pemantauan Developer).
//
// Variabel lingkungan: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT (mis. mailto:admin@sekolah.sch.id),
//                      CRON_RAHASIA, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (sudah ada).

const crypto = require('crypto');
const webpush = require('web-push');
const L = require('./_lib');

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const TTL_DETIK = 6 * 3600; // pesan yang tidak sempat sampai dalam 6 jam dibuang oleh layanan push
const BATAS_GAGAL = 5;
const PARALEL = 25;
const MACET_MENIT = 30; // catatan 'berjalan' lebih lama dari ini dianggap macet dan boleh diambil alih

const hariJakarta = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const tglPlus = (t, n) => new Date(Date.parse(t + 'T00:00:00Z') + n * 864e5).toISOString().slice(0, 10);
const dowOf = (t) => new Date(t + 'T00:00:00Z').getUTCDay();
const potong = (t, n) => String(t == null ? '' : t).slice(0, n);

function rahasiaCocok(header) {
  const rahasia = process.env.CRON_RAHASIA || '';
  if (!rahasia) return false;
  const a = Buffer.from(String(header || ''));
  const b = Buffer.from('Bearer ' + rahasia);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function semua(path) {
  const hasil = [];
  for (let off = 0; off < 100000; off += 1000) {
    const r = (await L.panggil(path + (path.includes('?') ? '&' : '?') + 'limit=1000&offset=' + off, 'GET')) || [];
    hasil.push(...r);
    if (r.length < 1000) break;
  }
  return hasil;
}

async function perPaket(daftar, ukuran, fn) {
  const keluar = [];
  for (let i = 0; i < daftar.length; i += ukuran) keluar.push(...(await fn(daftar.slice(i, i + ukuran))));
  return keluar;
}

async function jalankanParalel(daftar, fn) {
  const hasil = [];
  for (let i = 0; i < daftar.length; i += PARALEL) {
    hasil.push(...(await Promise.allSettled(daftar.slice(i, i + PARALEL).map(fn))));
  }
  return hasil;
}

// Mengambil alih catatan sekolah untuk (tanggal, waktu). Mengembalikan id catatan, atau null bila sudah diproses.
async function klaimLog(sid, tanggal, waktu, paksa) {
  if (paksa) {
    await L.panggil(
      `/rest/v1/piket_notif_log?sekolah_id=eq.${sid}&tanggal_piket=eq.${tanggal}&waktu=eq.${waktu}`,
      'DELETE'
    );
  }
  const baru = await L.panggil(
    '/rest/v1/piket_notif_log?on_conflict=sekolah_id,tanggal_piket,waktu',
    'POST',
    { sekolah_id: sid, tanggal_piket: tanggal, waktu, status: 'berjalan' },
    { Prefer: 'resolution=ignore-duplicates,return=representation' }
  );
  if (baru && baru.length) return baru[0].id;
  // sudah ada: ambil alih hanya bila macet
  const batas = new Date(Date.now() - MACET_MENIT * 60000).toISOString();
  const ambil = await L.panggil(
    `/rest/v1/piket_notif_log?sekolah_id=eq.${sid}&tanggal_piket=eq.${tanggal}&waktu=eq.${waktu}&status=eq.berjalan&mulai_at=lt.${encodeURIComponent(batas)}`,
    'PATCH',
    { mulai_at: new Date().toISOString() },
    { Prefer: 'return=representation' }
  );
  return ambil && ambil.length ? ambil[0].id : null;
}

async function tulisLog(id, data) {
  await L.panggil(`/rest/v1/piket_notif_log?id=eq.${id}`, 'PATCH', data, { Prefer: 'return=minimal' });
}

async function prosesSekolah(sid, waktu, tanggal, paksa) {
  const mulai = Date.now();
  const logId = await klaimLog(sid, tanggal, waktu, paksa);
  if (!logId) return { sekolah_id: sid, lewati: 'sudah diproses' };

  const selesai = async (status, ekstra) =>
    tulisLog(logId, { status, selesai_at: new Date().toISOString(), durasi_ms: Date.now() - mulai, ...ekstra });

  try {
    const dow = dowOf(tanggal);
    const [mg, nas, tg, bt, jadwal, kelasRows, siswaRows] = await Promise.all([
      L.panggil(`/rest/v1/libur_mingguan?sekolah_id=eq.${sid}&select=hari`, 'GET'),
      L.panggil(`/rest/v1/libur_nasional?tanggal=eq.${tanggal}&select=tanggal`, 'GET'),
      L.panggil(`/rest/v1/libur_tanggal?sekolah_id=eq.${sid}&mulai=lte.${tanggal}&sampai=gte.${tanggal}&select=kelas_id`, 'GET'),
      L.panggil(`/rest/v1/libur_batal?sekolah_id=eq.${sid}&tanggal=eq.${tanggal}&select=kelas_id`, 'GET'),
      semua(`/rest/v1/piket_jadwal?sekolah_id=eq.${sid}&hari=eq.${dow}&select=kelas_id,siswa_id,catatan,jenis:piket_jenis(nama,cakupan)`),
      semua(`/rest/v1/kelas?sekolah_id=eq.${sid}&select=id,nama`),
      semua(`/rest/v1/siswa?sekolah_id=eq.${sid}&aktif=eq.true&select=id,nama,nama_panggilan,kelas_id,kode_qr`)
    ]);

    // Libur untuk sebuah kelas pada tanggal piket (aturan sama dengan halaman siswa)
    const mingguan = (mg || []).some((x) => Number(x.hari) === dow);
    const nasional = (nas || []).length > 0;
    const untukKelas = (x, kid) => x.kelas_id == null || Number(x.kelas_id) === 0 || Number(x.kelas_id) === kid;
    const libur = (kid) => {
      if ((bt || []).some((x) => untukKelas(x, kid))) return false;
      if (mingguan || nasional) return true;
      return (tg || []).some((x) => untukKelas(x, kid));
    };

    if (!jadwal.length) {
      await selesai('dilewati', { alasan: 'Tidak ada jadwal piket pada hari itu' });
      return { sekolah_id: sid, lewati: 'tanpa jadwal' };
    }

    const namaKelas = new Map((kelasRows || []).map((k) => [Number(k.id), k.nama]));
    const siswaMap = new Map((siswaRows || []).map((s) => [Number(s.id), s]));
    const target = new Map(); // siswa_id -> daftar butir piket
    const tambah = (s, butir) => {
      const kid = s.kelas_id ? Number(s.kelas_id) : null;
      if (libur(kid)) return;
      const lst = target.get(Number(s.id)) || [];
      if (!lst.some((x) => x.jenis === butir.jenis && x.catatan === butir.catatan)) lst.push(butir);
      target.set(Number(s.id), lst);
    };
    jadwal.forEach((r) => {
      const jn = r.jenis || {};
      const butir = { jenis: jn.nama || 'Piket', catatan: r.catatan || '', semua: !r.siswa_id };
      if (r.siswa_id) {
        const s = siswaMap.get(Number(r.siswa_id));
        if (s) tambah(s, butir);
      } else {
        (siswaRows || []).forEach((s) => {
          if (r.kelas_id == null || Number(s.kelas_id) === Number(r.kelas_id)) tambah(s, butir);
        });
      }
    });

    if (!target.size) {
      await selesai('dilewati', { alasan: 'Libur atau tidak ada anak terjadwal', jml_siswa: 0 });
      return { sekolah_id: sid, lewati: 'libur' };
    }

    // HP yang terdaftar untuk anak-anak itu
    const ids = [...target.keys()];
    const langganan = await perPaket(ids, 150, (c) =>
      semua(`/rest/v1/push_langganan?sekolah_id=eq.${sid}&siswa_id=in.(${c.join(',')})&select=id,siswa_id,endpoint,p256dh,auth,gagal`)
    );
    if (!langganan.length) {
      await selesai('dilewati', { alasan: 'Belum ada HP yang mengaktifkan pengingat', jml_siswa: target.size });
      return { sekolah_id: sid, lewati: 'tanpa langganan' };
    }

    // Satu notifikasi per HP (endpoint), digabung bila HP itu terdaftar untuk beberapa anak
    const perHp = new Map();
    langganan.forEach((l) => {
      const g = perHp.get(l.endpoint) || { p256dh: l.p256dh, auth: l.auth, baris: [], anak: new Set() };
      g.baris.push(l);
      g.anak.add(Number(l.siswa_id));
      perHp.set(l.endpoint, g);
    });

    const judul = waktu === 'malam' ? `🧹 Piket besok (${NAMA_HARI[dow]})` : '🧹 Piket hari ini';
    const butirTeks = (b) => b.jenis + (b.semua ? ' (seluruh kelas)' : '') + (b.catatan ? ': ' + potong(b.catatan, 60) : '');

    let terkirim = 0, gagal = 0, dibuang = 0, pesanError = '';
    const sukses = [], mati = [];
    const hasil = await jalankanParalel([...perHp.entries()], async ([endpoint, g]) => {
      const anak = [...g.anak].map((i) => siswaMap.get(i)).filter(Boolean);
      const baris = anak.map((s) => {
        const nm = String(s.nama_panggilan || '').trim() || String(s.nama || '').trim().split(' ')[0] || 'Anak';
        const kl = s.kelas_id ? namaKelas.get(Number(s.kelas_id)) : '';
        return `${nm}${kl ? ' (Kelas ' + kl + ')' : ''}: ${(target.get(Number(s.id)) || []).map(butirTeks).join(', ')}`;
      });
      const payload = JSON.stringify({
        judul,
        isi: potong(baris.join('\n'), 280),
        url: '/p/' + anak[0].kode_qr + '#piket',
        tag: 'piket-' + waktu
      });
      await webpush.sendNotification({ endpoint, keys: { p256dh: g.p256dh, auth: g.auth } }, payload, {
        TTL: TTL_DETIK,
        urgency: 'high',
        topic: 'piket-' + waktu
      });
      return endpoint;
    });

    const daftarHp = [...perHp.values()];
    hasil.forEach((h, i) => {
      const g = daftarHp[i];
      if (h.status === 'fulfilled') {
        terkirim++;
        sukses.push(...g.baris.map((b) => b.id));
        return;
      }
      const e = h.reason || {};
      const kode = Number(e.statusCode);
      if (kode === 404 || kode === 410) {
        dibuang++;
        mati.push(...g.baris.map((b) => b.id));
      } else {
        gagal++;
        if (!pesanError) pesanError = potong((kode ? kode + ' ' : '') + (e.body || e.message || 'gagal kirim'), 300);
        g.baris.forEach((b) => {
          if ((Number(b.gagal) || 0) + 1 >= BATAS_GAGAL) mati.push(b.id);
          else g.gagalBaris = (g.gagalBaris || []).concat(b);
        });
      }
    });

    // Catat hasil ke HP: sukses (satu panggilan per paket), gagal (naikkan hitungan), mati (hapus)
    await perPaket(sukses, 150, async (c) => {
      await L.panggil(`/rest/v1/push_langganan?id=in.(${c.join(',')})`, 'PATCH',
        { terakhir_ok: new Date().toISOString(), gagal: 0 }, { Prefer: 'return=minimal' });
      return [];
    });
    for (const g of daftarHp) {
      for (const b of g.gagalBaris || []) {
        await L.panggil(`/rest/v1/push_langganan?id=eq.${b.id}`, 'PATCH', { gagal: (Number(b.gagal) || 0) + 1 }, { Prefer: 'return=minimal' });
      }
    }
    await perPaket(mati, 150, async (c) => {
      await L.panggil(`/rest/v1/push_langganan?id=in.(${c.join(',')})`, 'DELETE');
      return [];
    });

    const status = gagal === 0 ? 'selesai' : terkirim > 0 ? 'sebagian' : 'gagal';
    await selesai(status, {
      jml_siswa: target.size, jml_langganan: perHp.size, terkirim, gagal, dibuang,
      pesan_error: pesanError || null
    });
    return { sekolah_id: sid, terkirim, gagal, dibuang };
  } catch (e) {
    console.error('piket-notif sekolah', sid, e && e.message);
    try { await selesai('gagal', { pesan_error: potong((e && e.message) || e, 300) }); } catch (_) { /* abaikan */ }
    return { sekolah_id: sid, error: true };
  }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  if (!rahasiaCocok(req.headers && req.headers.authorization)) return res.status(401).json({ error: 'Tidak diizinkan' });

  const b = req.body && typeof req.body === 'object' ? req.body : {};
  const waktu = b.waktu;
  if (waktu !== 'malam' && waktu !== 'pagi') return res.status(400).json({ error: 'Waktu harus malam atau pagi' });
  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, subj = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subj) return res.status(500).json({ error: 'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, dan VAPID_SUBJECT belum diatur' });

  try {
    webpush.setVapidDetails(subj, pub, priv);
    const hari = hariJakarta();
    const tanggal = waktu === 'pagi' ? hari : tglPlus(hari, 1);
    const paksa = b.paksa === true;

    const peng = (await L.panggil('/rest/v1/pengaturan?piket_aktif=eq.true&notif_piket_aktif=eq.true&select=sekolah_id', 'GET')) || [];
    const kandidat = peng.map((p) => Number(p.sekolah_id)).filter(Number.isInteger);
    let aktif = [];
    if (kandidat.length) {
      aktif = ((await L.panggil(`/rest/v1/sekolah?status=eq.aktif&id=in.(${kandidat.join(',')})&select=id`, 'GET')) || []).map((x) => Number(x.id));
    }

    const ringkas = [];
    for (const sid of aktif) ringkas.push(await prosesSekolah(sid, waktu, tanggal, paksa));
    const jml = (k) => ringkas.reduce((a, x) => a + (x[k] || 0), 0);
    return res.status(200).json({
      ok: true, waktu, tanggal, sekolah: aktif.length,
      terkirim: jml('terkirim'), gagal: jml('gagal'), dibuang: jml('dibuang')
    });
  } catch (e) {
    console.error('piket-notif:', e && e.message);
    return res.status(500).json({ error: 'Gagal memproses pengingat piket' });
  }
};
