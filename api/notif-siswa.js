// api/notif-siswa.js
// Pengiriman notifikasi absensi dan tabungan ke HP orang tua (Web Push, tanpa kuota WhatsApp).
//
//  - Dipanggil cron database (pg_cron + pg_net, fungsi kirim_antrean_notif_siswa) tiap menit,
//    tetapi HANYA bila ada antrean yang sudah jatuh tempo (trigger di tabel absensi dan tabungan_transaksi
//    mengisi tabel notif_antrean dengan jeda beberapa menit supaya koreksi guru tidak mengirim status keliru).
//  - Dilindungi rahasia bersama: header "Authorization: Bearer <CRON_RAHASIA>" (sama dengan piket-notif).
//  - Isi notifikasi dibaca dari database SAAT DIKIRIM, jadi selalu status/jumlah terbaru.
//  - Satu notifikasi per anak. Notifikasi absensi hari yang sama saling menggantikan (tag sama).
//  - Sakelar Developer per sekolah (push_absensi_diizinkan, push_tabungan_diizinkan) diperiksa saat kirim; bila mati, antrean dilewati.
//  - Alamat push yang mati (404/410) atau gagal 5 kali berturut-turut dihapus otomatis.
//
// Variabel lingkungan: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT, CRON_RAHASIA,
//                      SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (semuanya sudah ada).

const crypto = require('crypto');
const webpush = require('web-push');
const L = require('./_lib');

const BATAS_BARIS = 150; // jumlah antrean yang diproses per panggilan (sisanya diambil menit berikutnya)
const PARALEL = 25;
const BATAS_GAGAL = 5;
const TIMEOUT_KIRIM_MS = 8000; // batas waktu kirim ke satu HP, agar satu alamat lambat tidak menahan seluruh paket
const MACET_MENIT = 10; // antrean 'berjalan' lebih lama dari ini dianggap macet (tidak dikirim ulang, agar tidak dobel)
const TTL_DETIK = { absensi: 3 * 3600, tabungan: 6 * 3600 };

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

const unik = (a) => [...new Set(a)];
const kelompokkan = (daftar, kunciFn) => {
  const m = new Map();
  daftar.forEach((x) => { const k = kunciFn(x); (m.get(k) || m.set(k, []).get(k)).push(x); });
  return m;
};
const rp = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-' : '') + 'Rp' + Math.abs(v).toLocaleString('id-ID');
};
const jamJkt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false }).replace(':', ' : ');
};
const namaAnak = (s) =>
  String(s.nama_panggilan || '').trim() || String(s.nama || '').trim().split(' ')[0] || 'Anak';
const BOLD = (t) => String(t).replace(/[A-Za-z0-9]/g, (c) => {
  const k = c.charCodeAt(0);
  if (k >= 65 && k <= 90) return String.fromCodePoint(0x1D5D4 + k - 65);
  if (k >= 97 && k <= 122) return String.fromCodePoint(0x1D5EE + k - 97);
  return String.fromCodePoint(0x1D7EC + k - 48);
});
const namaLengkap = (s) =>
  String(s.nama || '').trim() || String(s.nama_panggilan || '').trim() || 'Anak';
const rpS = (n) => {
  const v = Math.round(Number(n) || 0);
  return (v < 0 ? '-' : '') + 'Rp ' + Math.abs(v).toLocaleString('id-ID');
};

// Teks notifikasi absensi: [ikon, isi]
function teksAbsensi(a) {
  const jam = jamJkt(a.jam_datang);
  const st = String(a.status || '').toLowerCase();
  const T = {
    hadir: ['hadir', jam ? 'Hadir pukul ' + jam + ' WIB' : 'Hadir hari ini'],
    terlambat: ['terlambat', jam ? 'Terlambat, tiba pukul ' + jam + ' WIB' : 'Terlambat hari ini'],
    alpa: ['alpa', 'Tercatat alpa hari ini'],
    izin: ['izin', 'Tercatat izin hari ini'],
    sakit: ['sakit', 'Tercatat sakit hari ini'],
    libur: ['libur', 'Hari ini libur']
  };
  return T[st] || null;
}

async function proses(klaim) {
  const siswaIds = unik(klaim.map((r) => Number(r.siswa_id)));
  const sekolahIds = unik(klaim.map((r) => Number(r.sekolah_id)));
  const barisAbsensi = klaim.filter((r) => r.jenis === 'absensi');
  const barisTabungan = klaim.filter((r) => r.jenis === 'tabungan');

  const [pengRows, sekRows, siswaRows, langgananRows] = await Promise.all([
    L.panggil(`/rest/v1/pengaturan?sekolah_id=in.(${sekolahIds.join(',')})&select=sekolah_id,notif_absensi_aktif,notif_tabungan_aktif,tabungan_aktif,push_absensi_diizinkan,push_tabungan_diizinkan`, 'GET'),
    L.panggil(`/rest/v1/sekolah?id=in.(${sekolahIds.join(',')})&status=eq.aktif&select=id`, 'GET'),
    perPaket(siswaIds, 150, (c) => semua(`/rest/v1/siswa?id=in.(${c.join(',')})&aktif=eq.true&select=id,sekolah_id,nama,nama_panggilan,kode_qr&order=id.asc`)),
    perPaket(siswaIds, 150, (c) => semua(`/rest/v1/push_langganan?siswa_id=in.(${c.join(',')})&select=id,siswa_id,endpoint,p256dh,auth,gagal,terima_absensi,terima_tabungan&order=id.asc`))
  ]);
  const peng = new Map((pengRows || []).map((p) => [Number(p.sekolah_id), p]));
  const sekAktif = new Set((sekRows || []).map((s) => Number(s.id)));
  const siswa = new Map((siswaRows || []).map((s) => [Number(s.id), s]));
  const langgananPerAnak = new Map();
  (langgananRows || []).forEach((l) => {
    const k = Number(l.siswa_id);
    (langgananPerAnak.get(k) || langgananPerAnak.set(k, []).get(k)).push(l);
  });

  // Data absensi terbaru
  const absMap = new Map();
  if (barisAbsensi.length) {
    const sIds = unik(barisAbsensi.map((r) => Number(r.siswa_id)));
    const tgl = unik(barisAbsensi.map((r) => r.tanggal));
    const rows = await perPaket(sIds, 150, (c) =>
      semua(`/rest/v1/absensi?siswa_id=in.(${c.join(',')})&tanggal=in.(${tgl.join(',')})&select=id,siswa_id,tanggal,status,jam_datang&order=id.asc`)
    );
    rows.forEach((a) => absMap.set(Number(a.siswa_id) + '|' + a.tanggal, a));
  }

  // Data transaksi dan saldo akhir (setor menambah, tarik mengurangi, sama dengan rekap di aplikasi guru)
  const trxMap = new Map();
  const saldoMap = new Map();
  if (barisTabungan.length) {
    const refs = unik(barisTabungan.map((r) => Number(r.ref_id)).filter(Number.isInteger));
    const trx = await perPaket(refs, 150, (c) =>
      semua(`/rest/v1/tabungan_transaksi?id=in.(${c.join(',')})&select=id,siswa_id,jenis,jumlah,membatalkan_id&order=id.asc`)
    );
    trx.forEach((t) => trxMap.set(Number(t.id), t));
    const sIds = unik(barisTabungan.map((r) => Number(r.siswa_id)));
    // Saldo dihitung di database (fungsi saldo_siswa). Bila fungsinya belum dibuat, pakai cara lama sebagai cadangan.
    let saldoDariDb = false;
    try {
      const rows = await perPaket(sIds, 150, async (c) => (await L.panggil('/rest/v1/rpc/saldo_siswa', 'POST', { ids: c })) || []);
      rows.forEach((x) => saldoMap.set(Number(x.siswa_id), Number(x.saldo) || 0));
      saldoDariDb = true;
    } catch (e) {
      console.error('notif-siswa: saldo_siswa belum tersedia, memakai cara lama:', e && e.message);
    }
    if (!saldoDariDb) {
      const semuaTrx = await perPaket(sIds, 50, (c) =>
        semua(`/rest/v1/tabungan_transaksi?siswa_id=in.(${c.join(',')})&select=id,siswa_id,jenis,jumlah&order=id.asc`)
      );
      semuaTrx.forEach((t) => {
        const k = Number(t.siswa_id);
        saldoMap.set(k, (saldoMap.get(k) || 0) + (t.jenis === 'setor' ? 1 : -1) * Number(t.jumlah || 0));
      });
    }
  }

  // Susun pesan per baris antrean
  const hasilBaris = new Map(); // id antrean -> { status, hasil }
  const tugas = []; // satu tugas = satu HP untuk satu pesan
  klaim.forEach((r) => {
    const lewati = (alasan) => hasilBaris.set(r.id, { status: 'dilewati', hasil: alasan });
    const sid = Number(r.sekolah_id), anakId = Number(r.siswa_id);
    const p = peng.get(sid) || {};
    if (!sekAktif.has(sid)) return lewati('Sekolah tidak aktif');
    const s = siswa.get(anakId);
    if (!s) return lewati('Anak tidak aktif atau tidak ditemukan');

    let judul, isi, ikon, url, tag, bendera;
    const nm = namaAnak(s);
    if (r.jenis === 'absensi') {
      if (p.push_absensi_diizinkan === false) return lewati('Notifikasi absensi dimatikan Developer');
      if (!p.notif_absensi_aktif) return lewati('Notifikasi absensi dimatikan sekolah');
      const a = absMap.get(anakId + '|' + r.tanggal);
      if (!a) return lewati('Data absensi sudah tidak ada');
      const t = teksAbsensi(a);
      if (!t) return lewati('Status absensi tidak dikenal');
      judul = 'Info absensi Hari ini'; isi = namaLengkap(s) + '\n' + t[1]; ikon = t[0];
      url = '/p/' + s.kode_qr + '#absensi';
      tag = 'absen-' + anakId + '-' + r.tanggal;
      bendera = 'terima_absensi';
    } else {
      if (p.push_tabungan_diizinkan === false) return lewati('Notifikasi tabungan dimatikan Developer');
      if (!p.tabungan_aktif || !p.notif_tabungan_aktif) return lewati('Notifikasi tabungan dimatikan sekolah');
      const t = trxMap.get(Number(r.ref_id));
      if (!t) return lewati('Transaksi sudah tidak ada');
      const saldo = saldoMap.get(anakId) || 0;
      let baris;
      if (t.membatalkan_id) baris = 'Pembatalan transaksi (' + rpS(t.jumlah) + ')';
      else if (t.jenis === 'setor') baris = '🟢 Setoran (+' + rpS(t.jumlah) + ')';
      else baris = '🔴 Penarikan (-' + rpS(t.jumlah) + ')';
      judul = 'Info Tabungan hari ini';
      isi = BOLD(namaLengkap(s)) + '\n' + baris + '\nSaldo akhir = ' + BOLD('(' + rpS(saldo) + ')');
      ikon = t.jenis === 'setor' ? 'tabungan-masuk' : 'tabungan-keluar';
      url = '/p/' + s.kode_qr + '#tabungan';
      tag = 'tab-' + Number(r.ref_id);
      bendera = 'terima_tabungan';
    }

    const subs = (langgananPerAnak.get(anakId) || []).filter((l) => l[bendera] !== false);
    if (!subs.length) return lewati('Tidak ada HP yang mengaktifkan jenis notifikasi ini');
    const payload = { judul, isi: potong(isi, 480), url, tag, ikon };
    const item = { r, payload, jenis: r.jenis, terkirim: 0, gagal: 0, dibuang: 0, galat: '' };
    subs.forEach((l) => tugas.push({ item, l }));
    hasilBaris.set(r.id, { item });
  });

  // Kirim
  const sukses = [], mati = [], gagalBaris = [];
  const hasil = await jalankanParalel(tugas, async ({ item, l }) =>
    webpush.sendNotification(
      { endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } },
      JSON.stringify(item.payload),
      { TTL: TTL_DETIK[item.jenis] || 3600, urgency: 'high', topic: potong(item.payload.tag, 32), timeout: TIMEOUT_KIRIM_MS }
    )
  );
  hasil.forEach((h, i) => {
    const { item, l } = tugas[i];
    if (h.status === 'fulfilled') {
      item.terkirim++;
      sukses.push(l.id);
      return;
    }
    const e = h.reason || {};
    const kode = Number(e.statusCode);
    if (kode === 404 || kode === 410) {
      item.dibuang++;
      mati.push(l.id);
      return;
    }
    item.gagal++;
    if (!item.galat) item.galat = potong((kode ? kode + ' ' : '') + (e.body || e.message || 'gagal kirim'), 150);
    if ((Number(l.gagal) || 0) + 1 >= BATAS_GAGAL) mati.push(l.id);
    else gagalBaris.push(l);
  });

  // Catat hasil per HP
  await perPaket(unik(sukses), 150, async (c) => {
    await L.panggil(`/rest/v1/push_langganan?id=in.(${c.join(',')})`, 'PATCH',
      { terakhir_ok: new Date().toISOString(), gagal: 0 }, { Prefer: 'return=minimal' });
    return [];
  });
  for (const [nilai, daftar] of kelompokkan(gagalBaris, (l) => (Number(l.gagal) || 0) + 1)) {
    await perPaket(unik(daftar.map((l) => l.id)), 150, async (c) => {
      await L.panggil(`/rest/v1/push_langganan?id=in.(${c.join(',')})`, 'PATCH', { gagal: nilai }, { Prefer: 'return=minimal' });
      return [];
    });
  }
  await perPaket(unik(mati), 150, async (c) => {
    await L.panggil(`/rest/v1/push_langganan?id=in.(${c.join(',')})`, 'DELETE');
    return [];
  });

  // Catat hasil per antrean
  let terkirim = 0, gagal = 0, dilewati = 0;
  const pembaruan = [];
  hasilBaris.forEach((v, id) => {
    if (v.item) {
      const it = v.item;
      const ok = it.terkirim > 0;
      if (ok) terkirim++; else gagal++;
      pembaruan.push({
        id,
        data: {
          status: ok ? 'selesai' : 'gagal',
          hasil: potong(`terkirim ${it.terkirim}, gagal ${it.gagal}, dibuang ${it.dibuang}` + (it.galat ? ' | ' + it.galat : ''), 300)
        }
      });
    } else {
      dilewati++;
      pembaruan.push({ id, data: { status: v.status, hasil: potong(v.hasil, 300) } });
    }
  });
  const kelompokHasil = [...kelompokkan(pembaruan, (p) => JSON.stringify(p.data)).values()];
  await jalankanParalel(kelompokHasil, (grup) =>
    perPaket(grup.map((p) => p.id), 150, async (c) => {
      await L.panggil(`/rest/v1/notif_antrean?id=in.(${c.join(',')})`, 'PATCH', grup[0].data, { Prefer: 'return=minimal' });
      return [];
    })
  );
  return { diproses: klaim.length, terkirim, gagal, dilewati };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  if (!rahasiaCocok(req.headers && req.headers.authorization)) return res.status(401).json({ error: 'Tidak diizinkan' });

  const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, subj = process.env.VAPID_SUBJECT;
  if (!pub || !priv || !subj) return res.status(500).json({ error: 'VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, dan VAPID_SUBJECT belum diatur' });

  let klaim = [];
  try {
    webpush.setVapidDetails(subj, pub, priv);
    const sekarang = new Date().toISOString();

    // Antrean yang macet tidak dikirim ulang (mencegah notifikasi dobel); cukup ditandai gagal
    const batasMacet = new Date(Date.now() - MACET_MENIT * 60000).toISOString();
    await L.panggil(
      `/rest/v1/notif_antrean?status=eq.berjalan&diproses_at=lt.${encodeURIComponent(batasMacet)}`,
      'PATCH', { status: 'gagal', hasil: 'Macet saat diproses' }, { Prefer: 'return=minimal' }
    );

    const jatuhTempo = (await L.panggil(
      `/rest/v1/notif_antrean?status=eq.menunggu&kirim_setelah=lte.${encodeURIComponent(sekarang)}&order=id.asc&limit=${BATAS_BARIS}&select=id`,
      'GET'
    )) || [];
    if (!jatuhTempo.length) return res.status(200).json({ ok: true, diproses: 0 });

    // Klaim atomik: hanya baris yang masih 'menunggu' yang berpindah ke 'berjalan'
    klaim = (await L.panggil(
      `/rest/v1/notif_antrean?id=in.(${jatuhTempo.map((x) => x.id).join(',')})&status=eq.menunggu`,
      'PATCH', { status: 'berjalan', diproses_at: sekarang }, { Prefer: 'return=representation' }
    )) || [];
    if (!klaim.length) return res.status(200).json({ ok: true, diproses: 0 });

    const ringkas = await proses(klaim);
    return res.status(200).json({ ok: true, ...ringkas });
  } catch (e) {
    console.error('notif-siswa:', e && e.message);
    try {
      if (klaim.length) {
        await L.panggil(
          `/rest/v1/notif_antrean?id=in.(${klaim.map((x) => x.id).join(',')})&status=eq.berjalan`,
          'PATCH', { status: 'gagal', hasil: potong((e && e.message) || 'Kesalahan tidak dikenal', 300) }, { Prefer: 'return=minimal' }
        );
      }
    } catch (_) { /* abaikan */ }
    return res.status(500).json({ error: 'Gagal memproses notifikasi siswa' });
  }
};
