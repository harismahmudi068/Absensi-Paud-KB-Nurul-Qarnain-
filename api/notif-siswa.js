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
const TTL_DETIK = { absensi: 3 * 3600, tabungan: 6 * 3600, hafalan: 6 * 3600 };

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
  const barisHafalan = klaim.filter((r) => r.jenis === 'hafalan');

  const [pengRows, sekRows, siswaRows, langgananRows] = await Promise.all([
    L.panggil(`/rest/v1/pengaturan?sekolah_id=in.(${sekolahIds.join(',')})&select=sekolah_id,notif_absensi_aktif,notif_tabungan_aktif,tabungan_aktif,push_absensi_diizinkan,push_tabungan_diizinkan,hafalan_aktif,notif_hafalan_aktif,push_hafalan_diizinkan`, 'GET'),
    L.panggil(`/rest/v1/sekolah?id=in.(${sekolahIds.join(',')})&status=eq.aktif&select=id`, 'GET'),
    perPaket(siswaIds, 150, (c) => semua(`/rest/v1/siswa?id=in.(${c.join(',')})&aktif=eq.true&select=id,sekolah_id,nama,nama_panggilan,kode_qr&order=id.asc`)),
    perPaket(siswaIds, 150, (c) => semua(`/rest/v1/push_langganan?siswa_id=in.(${c.join(',')})&select=id,siswa_id,endpoint,p256dh,auth,gagal,terima_absensi,terima_tabungan,terima_hafalan&order=id.asc`))
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

  // Data setoran Hafalan yang memicu notifikasi
  const hafalanMap = new Map();
  if (barisHafalan.length) {
    const refs = unik(barisHafalan.map((r) => Number(r.ref_id)).filter(Number.isInteger));
    const rows = await perPaket(refs, 150, (c) =>
      semua(`/rest/v1/hafalan_setoran?id=in.(${c.join(',')})&select=id,siswa_id,sekolah_id,hasil,judul,jenis_nama,nama_pencatat&order=id.asc`)
    );
    rows.forEach((h) => hafalanMap.set(Number(h.id), h));
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
    } else if (r.jenis === 'tabungan') {
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
    } else {
      if (p.push_hafalan_diizinkan === false) return lewati('Notifikasi hafalan dimatikan Developer');
      if (!p.hafalan_aktif || !p.notif_hafalan_aktif) return lewati('Notifikasi hafalan dimatikan sekolah');
      const h = hafalanMap.get(Number(r.ref_id));
      if (!h || Number(h.siswa_id) !== anakId || Number(h.sekolah_id) !== sid) return lewati('Setoran Hafalan sudah tidak ada');
      const hasilHafalan = String(h.hasil || '').toLowerCase();
      if (!['lancar', 'mengulang'].includes(hasilHafalan)) return lewati('Hasil setoran Hafalan tidak dikenal');
      const materi = String(h.judul || '').trim() || String(h.jenis_nama || '').trim() || 'Materi Hafalan';
      const guru = String(h.nama_pencatat || '').trim();
      judul = 'Hafalan baru';
      isi = namaLengkap(s) + '\n' + (hasilHafalan === 'lancar' ? '🟢 Lancar' : '🟡 Mengulang') +
        '\n' + materi + (guru ? '\nGuru: ' + guru : '');
      ikon = 'hafalan';
      url = '/p/' + s.kode_qr + '#hafalan';
      tag = 'haf-' + Number(r.ref_id);
      bendera = 'terima_hafalan';
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


function tanggalLokalID(t) {
  if (!t) return '-';
  const d = new Date(String(t).slice(0,10) + 'T00:00:00+07:00');
  return isNaN(d.getTime()) ? String(t) : d.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });
}
function nomorWAPengingat(n) {
  let d = String(n || '').replace(/\D/g, '');
  if (d.startsWith('0')) d = '62' + d.slice(1);
  else if (d.startsWith('8')) d = '62' + d;
  return /^628\d{8,12}$/.test(d) ? d : '';
}
function cocokLaporanPengingat(e, a) {
  if (!a || a.status !== e.status_laporan || a.cara !== e.sumber) return false;
  const x = Date.parse(a.diubah || ''), y = Date.parse(e.laporan_diubah || '');
  return Number.isFinite(x) && Number.isFinite(y) && x === y;
}
async function catatEksekusiPengingat(id, data) {
  if (!Number.isInteger(Number(id)) || Number(id) <= 0) return;
  try {
    await L.panggil('/rest/v1/pengingat_izin_sakit_eksekusi?id=eq.' + Number(id),
      'PATCH', Object.assign({ selesai_at: new Date().toISOString() }, data),
      { Prefer: 'return=minimal' });
  } catch (e) { console.error('notif-siswa pengingat: gagal mencatat eksekusi', e && e.message); }
}
async function prosesPengingatPush(eksekusiId) {
  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const due = (await L.panggil(
    '/rest/v1/pengingat_izin_sakit?push_status=eq.menunggu&tanggal_akhir=eq.' + hariIni +
    '&select=id,sekolah_id,siswa_id,status_laporan,sumber,laporan_diubah,tanggal_akhir&order=id.asc&limit=150',
    'GET'
  )) || [];
  if (!due.length) {
    await catatEksekusiPengingat(eksekusiId, {
      status: 'selesai', jumlah_diproses: 0, jumlah_berhasil: 0, jumlah_gagal: 0, jumlah_dilewati: 0
    });
    return { diproses: 0, terkirim: 0, gagal: 0, dilewati: 0 };
  }
  const ids = due.map(x => Number(x.id));
  const klaim = (await L.panggil(
    '/rest/v1/pengingat_izin_sakit?id=in.(' + ids.join(',') + ')&push_status=eq.menunggu',
    'PATCH', { push_status: 'diproses', push_diproses_at: new Date().toISOString(), diubah: new Date().toISOString() },
    { Prefer: 'return=representation' }
  )) || [];
  if (!klaim.length) {
    await catatEksekusiPengingat(eksekusiId, {
      status: 'selesai', jumlah_diproses: 0, jumlah_berhasil: 0, jumlah_gagal: 0, jumlah_dilewati: 0
    });
    return { diproses: 0, terkirim: 0, gagal: 0, dilewati: 0 };
  }
  const siswaIds = unik(klaim.map(x => Number(x.siswa_id)));
  const sekolahIds = unik(klaim.map(x => Number(x.sekolah_id)));
  const tanggal = unik(klaim.map(x => x.tanggal_akhir));
  const [siswaRows, sekolahRows, pengRows, langgananRows, absRows] = await Promise.all([
    perPaket(siswaIds, 150, c => semua('/rest/v1/siswa?id=in.(' + c.join(',') + ')&select=id,sekolah_id,nama,nama_panggilan,kode_qr,aktif')),
    L.panggil('/rest/v1/sekolah?id=in.(' + sekolahIds.join(',') + ')&select=id,status', 'GET'),
    L.panggil('/rest/v1/pengaturan?sekolah_id=in.(' + sekolahIds.join(',') + ')&select=sekolah_id,notif_absensi_aktif,push_absensi_diizinkan', 'GET'),
    perPaket(siswaIds, 150, c => semua('/rest/v1/push_langganan?siswa_id=in.(' + c.join(',') + ')&terima_absensi=eq.true&select=id,siswa_id,endpoint,p256dh,auth,gagal,terima_absensi&order=id.asc')),
    perPaket(siswaIds, 150, c => semua('/rest/v1/absensi?siswa_id=in.(' + c.join(',') + ')&tanggal=in.(' + tanggal.join(',') + ')&select=id,siswa_id,sekolah_id,tanggal,status,cara,diubah'))
  ]);
  const siswa = new Map((siswaRows || []).map(x => [Number(x.id), x]));
  const sekolah = new Map((sekolahRows || []).map(x => [Number(x.id), x]));
  const peng = new Map((pengRows || []).map(x => [Number(x.sekolah_id), x]));
  const abs = new Map((absRows || []).map(x => [Number(x.siswa_id) + '|' + x.tanggal, x]));
  const subs = new Map();
  (langgananRows || []).forEach(x => {
    const k = Number(x.siswa_id);
    (subs.get(k) || subs.set(k, []).get(k)).push(x);
  });
  const hasilEvent = new Map();
  const tugas = [];
  for (const e of klaim) {
    const sid = Number(e.sekolah_id), anakId = Number(e.siswa_id);
    const s = siswa.get(anakId), sk = sekolah.get(sid), p = peng.get(sid) || {};
    const row = abs.get(anakId + '|' + e.tanggal_akhir);
    let alasan = '';
    if (!sk || sk.status !== 'aktif') alasan = 'Sekolah tidak aktif';
    else if (!s || !s.aktif || Number(s.sekolah_id) !== sid) alasan = 'Siswa tidak aktif atau tidak ditemukan';
    else if (!cocokLaporanPengingat(e, row)) alasan = 'Laporan sudah berubah setelah pengingat dibuat';
    else if (p.push_absensi_diizinkan === false) alasan = 'Push absensi dimatikan Developer';
    else if (!p.notif_absensi_aktif) alasan = 'Push absensi dimatikan sekolah';
    const daftar = (subs.get(anakId) || []).filter(x => x.terima_absensi === true);
    if (!alasan && !daftar.length) alasan = 'Orang tua belum mengaktifkan push absensi';
    if (alasan) {
      hasilEvent.set(Number(e.id), { status: 'dilewati', alasan, tujuan: 0, terkirim: 0, gagal: 0, error: null });
      continue;
    }
    const nama = namaAnak(s);
    const payload = {
      judul: 'Pengingat izin/sakit',
      isi: 'Hari ini merupakan hari terakhir laporan ' + e.status_laporan + ' ananda ' + nama +
        '. Jika pada hari sekolah berikutnya ananda masih belum dapat masuk, mohon kirim laporan izin/sakit kembali melalui WhatsApp atau portal orang tua.',
      url: '/p/' + s.kode_qr + '#absensi',
      tag: 'ingat-izin-' + Number(e.id),
      ikon: e.status_laporan
    };
    const item = { e, payload, tujuan: daftar.length, terkirim: 0, gagal: 0, error: '' };
    hasilEvent.set(Number(e.id), { item });
    daftar.forEach(l => tugas.push({ item, l }));
  }
  const sukses = [], mati = [], gagalBerulang = [];
  const hasilKirim = await jalankanParalel(tugas, ({ item, l }) =>
    webpush.sendNotification(
      { endpoint: l.endpoint, keys: { p256dh: l.p256dh, auth: l.auth } },
      JSON.stringify(item.payload),
      { TTL: 3 * 3600, urgency: 'high', topic: potong(item.payload.tag, 32), timeout: TIMEOUT_KIRIM_MS }
    )
  );
  hasilKirim.forEach((h, i) => {
    const x = tugas[i], item = x.item, l = x.l;
    if (h.status === 'fulfilled') {
      item.terkirim++;
      sukses.push(l.id);
      return;
    }
    const er = h.reason || {}, kode = Number(er.statusCode);
    item.gagal++;
    if (!item.error) item.error = potong((kode ? kode + ' ' : '') + (er.body || er.message || 'Gagal mengirim push'), 180);
    if (kode === 404 || kode === 410 || (Number(l.gagal) || 0) + 1 >= BATAS_GAGAL) mati.push(l.id);
    else gagalBerulang.push(l);
  });
  await perPaket(unik(sukses), 150, async c => {
    await L.panggil('/rest/v1/push_langganan?id=in.(' + c.join(',') + ')', 'PATCH',
      { terakhir_ok: new Date().toISOString(), gagal: 0 }, { Prefer: 'return=minimal' });
    return [];
  });
  for (const [nilai, daftar] of kelompokkan(gagalBerulang, l => (Number(l.gagal) || 0) + 1)) {
    await perPaket(unik(daftar.map(x => x.id)), 150, async c => {
      await L.panggil('/rest/v1/push_langganan?id=in.(' + c.join(',') + ')', 'PATCH',
        { gagal: nilai }, { Prefer: 'return=minimal' });
      return [];
    });
  }
  await perPaket(unik(mati), 150, async c => {
    await L.panggil('/rest/v1/push_langganan?id=in.(' + c.join(',') + ')', 'DELETE');
    return [];
  });
  let terkirim = 0, gagal = 0, dilewati = 0;
  for (const [id, v] of hasilEvent) {
    let data;
    if (v.item) {
      const it = v.item;
      const ok = it.terkirim > 0;
      const status = ok ? 'berhasil' : 'gagal';
      if (ok) terkirim++; else gagal++;
      data = {
        push_status: status, push_waktu: new Date().toISOString(),
        push_jumlah_tujuan: it.tujuan, push_dikirim: it.terkirim, push_gagal: it.gagal,
        push_error: it.error || null, diubah: new Date().toISOString()
      };
    } else {
      dilewati++;
      data = { push_status: 'dilewati', push_error: v.alasan, push_waktu: new Date().toISOString(), diubah: new Date().toISOString() };
    }
    await L.panggil('/rest/v1/pengingat_izin_sakit?id=eq.' + id, 'PATCH', data, { Prefer: 'return=minimal' });
  }
  await catatEksekusiPengingat(eksekusiId, {
    status: 'selesai', jumlah_diproses: klaim.length,
    jumlah_berhasil: terkirim, jumlah_gagal: gagal, jumlah_dilewati: dilewati
  });
  return { diproses: klaim.length, terkirim, gagal, dilewati };
}
async function prosesPengingatWa(eksekusiId) {
  const hariIni = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
  const due = (await L.panggil(
    '/rest/v1/pengingat_izin_sakit?wa_status=eq.menunggu&tanggal_tindak_lanjut=eq.' + hariIni +
    '&select=id,sekolah_id,siswa_id,status_laporan,sumber,laporan_diubah,tanggal_akhir,tanggal_tindak_lanjut&order=id.asc&limit=15',
    'GET'
  )) || [];
  if (!due.length) {
    await catatEksekusiPengingat(eksekusiId, {
      status: 'selesai', jumlah_diproses: 0, jumlah_berhasil: 0, jumlah_gagal: 0, jumlah_dilewati: 0
    });
    return { diproses: 0, terkirim: 0, gagal: 0, dilewati: 0 };
  }
  const ids = due.map(x => Number(x.id));
  const klaim = (await L.panggil(
    '/rest/v1/pengingat_izin_sakit?id=in.(' + ids.join(',') + ')&wa_status=eq.menunggu',
    'PATCH', { wa_status: 'diproses', wa_diproses_at: new Date().toISOString(), diubah: new Date().toISOString() },
    { Prefer: 'return=representation' }
  )) || [];
  if (!klaim.length) {
    await catatEksekusiPengingat(eksekusiId, {
      status: 'selesai', jumlah_diproses: 0, jumlah_berhasil: 0, jumlah_gagal: 0, jumlah_dilewati: 0
    });
    return { diproses: 0, terkirim: 0, gagal: 0, dilewati: 0 };
  }
  const siswaIds = unik(klaim.map(x => Number(x.siswa_id)));
  const sekolahIds = unik(klaim.map(x => Number(x.sekolah_id)));
  const tanggal = unik(klaim.flatMap(x => [x.tanggal_akhir, x.tanggal_tindak_lanjut]));
  const waliRelasiPath = '/rest/v1/siswa_wali?siswa_id=in.(' + siswaIds.join(',') + ')&select=siswa_id,wali_id';
  const [siswaRows, sekolahRows, absRows, relasiRows, tokenRows, rahasiaRows] = await Promise.all([
    perPaket(siswaIds, 150, c => semua('/rest/v1/siswa?id=in.(' + c.join(',') + ')&select=id,sekolah_id,nama,nama_panggilan,kelas_id,aktif')),
    L.panggil('/rest/v1/sekolah?id=in.(' + sekolahIds.join(',') + ')&select=id,nama,status', 'GET'),
    perPaket(siswaIds, 150, c => semua('/rest/v1/absensi?siswa_id=in.(' + c.join(',') + ')&tanggal=in.(' + tanggal.join(',') + ')&select=id,siswa_id,sekolah_id,tanggal,status,cara,diubah')),
    semua(waliRelasiPath),
    semua('/rest/v1/fonnte_token?sekolah_id=in.(' + sekolahIds.join(',') + ')&select=id,sekolah_id,token&order=id.asc'),
    semua('/rest/v1/pengaturan_rahasia?sekolah_id=in.(' + sekolahIds.join(',') + ')&select=sekolah_id,token_fonnte')
  ]);
  const siswa = new Map((siswaRows || []).map(x => [Number(x.id), x]));
  const sekolah = new Map((sekolahRows || []).map(x => [Number(x.id), x]));
  const abs = new Map((absRows || []).map(x => [Number(x.siswa_id) + '|' + x.tanggal, x]));
  const waliIds = unik((relasiRows || []).map(x => Number(x.wali_id)).filter(Number.isInteger));
  const waliRows = waliIds.length ? await semua('/rest/v1/wali?id=in.(' + waliIds.join(',') + ')&select=id,sekolah_id,nama,no_wa') : [];
  const wali = new Map((waliRows || []).map(x => [Number(x.id), x]));
  const waliPerSiswa = new Map();
  (relasiRows || []).forEach(x => {
    const k = Number(x.siswa_id);
    (waliPerSiswa.get(k) || waliPerSiswa.set(k, []).get(k)).push(wali.get(Number(x.wali_id)));
  });
  const token = new Map();
  (tokenRows || []).forEach(x => { if (!token.has(Number(x.sekolah_id))) token.set(Number(x.sekolah_id), x.token); });
  (rahasiaRows || []).forEach(x => { if (!token.has(Number(x.sekolah_id)) && x.token_fonnte) token.set(Number(x.sekolah_id), x.token_fonnte); });
  if (!token.has(1) && process.env.FONNTE_TOKEN) token.set(1, process.env.FONNTE_TOKEN);
  const hasilEvent = new Map(), tugas = [];
  for (const e of klaim) {
    const sid = Number(e.sekolah_id), anakId = Number(e.siswa_id);
    const s = siswa.get(anakId), sk = sekolah.get(sid);
    const rowAkhir = abs.get(anakId + '|' + e.tanggal_akhir);
    const rowHariIni = abs.get(anakId + '|' + e.tanggal_tindak_lanjut);
    let alasan = '';
    if (!sk || sk.status !== 'aktif') alasan = 'Sekolah tidak aktif';
    else if (!s || !s.aktif || Number(s.sekolah_id) !== sid) alasan = 'Siswa tidak aktif atau tidak ditemukan';
    else if (!cocokLaporanPengingat(e, rowAkhir)) alasan = 'Laporan izin/sakit sudah berubah atau diperpanjang';
    else if (rowHariIni) alasan = 'Status hari ini sudah tercatat: ' + rowHariIni.status;
    if (alasan) {
      hasilEvent.set(Number(e.id), { status: 'dilewati', alasan, tujuan: 0, terkirim: 0, gagal: 0, ids: [] });
      continue;
    }
    const nomor = unik((waliPerSiswa.get(anakId) || [])
      .filter(w => w && Number(w.sekolah_id) === sid)
      .map(w => nomorWAPengingat(w.no_wa)).filter(Boolean));
    if (!nomor.length) {
      hasilEvent.set(Number(e.id), { status: 'dilewati', alasan: 'Nomor WhatsApp wali belum tersedia atau tidak valid', tujuan: 0, terkirim: 0, gagal: 0, ids: [] });
      continue;
    }
    const tokenSekolah = token.get(sid);
    if (!tokenSekolah) {
      hasilEvent.set(Number(e.id), { status: 'gagal', alasan: 'Token Fonnte sekolah belum dikonfigurasi', tujuan: nomor.length, terkirim: 0, gagal: nomor.length, ids: [] });
      continue;
    }
    const nama = namaAnak(s);
    const pesan =
      '🌷 _Assalamu\'alaikum warahmatullahi wabarakatuh._\n\n' +
      'Bapak/Ibu Orang Tua/Wali dari *' + nama + '*,\n\n' +
      'Kami ingin menginformasikan bahwa hingga saat pesan ini dikirim, ananda belum tercatat memiliki laporan izin/sakit maupun status kehadiran.\n\n' +
      'Masa laporan ' + e.status_laporan + ' ananda sebelumnya berakhir pada ' + tanggalLokalID(e.tanggal_akhir) + '.\n\n' +
      'Apabila ananda masih belum dapat masuk sekolah, mohon Bapak/Ibu mengirimkan laporan izin/sakit kembali melalui WhatsApp atau portal orang tua. Jika ananda sudah dapat bersekolah, Bapak/Ibu tidak perlu mengirimkan laporan tambahan.\n\n' +
      'Terima kasih atas perhatian dan kerja sama Bapak/Ibu.\n\n' +
      '_Wassalamu\'alaikum warahmatullahi wabarakatuh._';
    const item = { e, token: tokenSekolah, pesan, nomor, terkirim: 0, gagal: 0, ids: [], error: '' };
    hasilEvent.set(Number(e.id), { item });
    nomor.forEach(n => tugas.push({ item, nomor: n }));
  }
  const hasilKirim = [];
  for (let i = 0; i < tugas.length; i += 10) {
    hasilKirim.push(...(await Promise.allSettled(tugas.slice(i, i + 10).map(async x => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const r = await fetch('https://api.fonnte.com/send', {
          method: 'POST',
          headers: { Authorization: x.item.token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ target: x.nomor, message: x.item.pesan }),
          signal: controller.signal
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok || j.status === false) throw new Error(j.reason || j.message || 'Fonnte menolak pengiriman');
        return { id: Array.isArray(j.id) ? j.id.map(String) : (j.id ? [String(j.id)] : []) };
      } finally { clearTimeout(timer); }
    }))));
  }
  hasilKirim.forEach((h, i) => {
    const x = tugas[i], item = x.item;
    if (h.status === 'fulfilled') {
      item.terkirim++;
      item.ids.push(...h.value.id);
    } else {
      item.gagal++;
      if (!item.error) item.error = potong((h.reason && h.reason.message) || 'Pengiriman Fonnte gagal', 180);
    }
  });
  let terkirim = 0, gagal = 0, dilewati = 0;
  for (const [id, v] of hasilEvent) {
    let data;
    if (v.item) {
      const it = v.item;
      const status = it.terkirim && it.gagal ? 'sebagian' : it.terkirim ? 'berhasil' : 'gagal';
      if (it.terkirim) terkirim++; else gagal++;
      data = {
        wa_status: status, wa_waktu: new Date().toISOString(),
        wa_jumlah_tujuan: it.nomor.length, wa_dikirim: it.terkirim, wa_gagal: it.gagal,
        wa_fonnte_ids: it.ids, wa_error: it.error || null, diubah: new Date().toISOString()
      };
    } else {
      if (v.status === 'dilewati') dilewati++; else gagal++;
      data = {
        wa_status: v.status, wa_waktu: new Date().toISOString(),
        wa_jumlah_tujuan: v.tujuan, wa_dikirim: v.terkirim, wa_gagal: v.gagal,
        wa_fonnte_ids: v.ids || [], wa_error: v.alasan || null, diubah: new Date().toISOString()
      };
    }
    await L.panggil('/rest/v1/pengingat_izin_sakit?id=eq.' + id, 'PATCH', data, { Prefer: 'return=minimal' });
  }
  await catatEksekusiPengingat(eksekusiId, {
    status: 'selesai', jumlah_diproses: klaim.length,
    jumlah_berhasil: terkirim, jumlah_gagal: gagal, jumlah_dilewati: dilewati
  });
  return { diproses: klaim.length, terkirim, gagal, dilewati };
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  if (!rahasiaCocok(req.headers && req.headers.authorization)) return res.status(401).json({ error: 'Tidak diizinkan' });

  const aksi = req.body && req.body.aksi;
  const eksekusiId = Number(req.body && req.body.eksekusi_id) || null;
  if (aksi === 'pengingat_push') {
    const pub = process.env.VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY, subj = process.env.VAPID_SUBJECT;
    if (!pub || !priv || !subj) {
      await catatEksekusiPengingat(eksekusiId, { status: 'gagal', error: 'Konfigurasi VAPID belum lengkap' });
      return res.status(500).json({ error: 'Konfigurasi VAPID belum lengkap' });
    }
    try {
      webpush.setVapidDetails(subj, pub, priv);
      return res.status(200).json({ ok: true, ...(await prosesPengingatPush(eksekusiId)) });
    } catch (e) {
      await catatEksekusiPengingat(eksekusiId, { status: 'gagal', error: potong((e && e.message) || 'Pengingat push gagal', 300) });
      console.error('notif-siswa pengingat push:', e && e.message);
      return res.status(500).json({ error: 'Gagal memproses pengingat push' });
    }
  }
  if (aksi === 'pengingat_wa') {
    try {
      return res.status(200).json({ ok: true, ...(await prosesPengingatWa(eksekusiId)) });
    } catch (e) {
      await catatEksekusiPengingat(eksekusiId, { status: 'gagal', error: potong((e && e.message) || 'Pengingat WhatsApp gagal', 300) });
      console.error('notif-siswa pengingat WhatsApp:', e && e.message);
      return res.status(500).json({ error: 'Gagal memproses pengingat WhatsApp' });
    }
  }
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
