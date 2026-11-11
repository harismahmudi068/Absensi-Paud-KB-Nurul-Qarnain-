// Fungsi server: kirim laporan kehadiran ke WhatsApp orang tua lewat Fonnte.
// Butuh Environment Variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
// Token Fonnte dibaca per sekolah dari tabel pengaturan_rahasia (Pengaturan > Koneksi).
// Masa transisi: FONNTE_TOKEN lama hanya cadangan untuk sekolah pertama.
//
// Dua cara pakai (POST):
//   1. Satu pesan  : { sekolah_id, nomor, teks }            -> dikirim langsung.
//      Opsional untuk riwayat: jenis, judul, label, batch (lihat langkah-kirim-log.sql).
//   2. Banyak pesan: { sekolah_id, pesan:[{nomor,teks}], mulai } -> DIJADWALKAN bertahap di Fonnte
//      dengan jeda acak 15-30 detik antar nomor (parameter schedule). Maksimal 10 pesan per
//      permintaan; index mengirim beberapa permintaan berurutan dan meneruskan nilai "berikutnya"
//      (jam terakhir yang terjadwal) sebagai "mulai" permintaan selanjutnya agar jeda tetap sambung.
const crypto = require('crypto');
const LIB = require('./_lib');
const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ENV_FONNTE = process.env.FONNTE_TOKEN || '';
const SEKOLAH_PERTAMA = 1;

const JEDA_MIN = 15;            // detik
const JEDA_MAX = 30;            // detik
const MAKS_BATCH = 10;          // pesan per permintaan
const MAKS_MULAI = 2 * 3600;    // "mulai" dari index dianggap wajar bila paling jauh 2 jam ke depan
const RE_NOMOR = /^628\d{8,12}$/;
const RE_GRUP = /^\d{10,30}@g\.us$/i;
const jedaAcak = () => JEDA_MIN + Math.floor(Math.random() * (JEDA_MAX - JEDA_MIN + 1));
const jedaGrupAcak = () => 30 + Math.floor(Math.random() * 31);

const JENIS_OK = ['laporan', 'link', 'tabungan', 'raport', 'libur', 'alpa', 'lainnya'];
const potong = (x, n) => String(x == null ? '' : x).trim().slice(0, n);
const idFonnte = (j) => {
  const v = j && j.id;
  const a = Array.isArray(v) ? v[0] : v;
  return a == null || a === '' ? null : String(a);
};

// Daftar ID anak yang dituju satu pesan (untuk kolom "Status pesan" per anak). Opsional, maksimal 10.
const daftarId = (v) => {
  if (!Array.isArray(v)) return null;
  const a = v.map(Number).filter((n) => Number.isInteger(n) && n > 0).slice(0, 10);
  return a.length ? a : null;
};

// Mencatat riwayat ke tabel kirim_log. Gagal mencatat TIDAK boleh menggagalkan pengiriman.
async function catatLog(baris) {
  if (!baris.length) return true;
  try {
    const r = await fetch(SB + '/rest/v1/kirim_log', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(baris)
    });
    if (!r.ok) {
      console.error('Catat riwayat kirim gagal:', r.status, await r.text());
      return false;
    }
    return true;
  } catch (e) {
    console.error('Catat riwayat kirim gagal:', e);
    return false;
  }
}

async function sb(path, token) {
  const h = { apikey: KEY };
  h.Authorization = 'Bearer ' + (token || KEY);
  const r = await fetch(SB + path, { headers: h });
  if (!r.ok) throw new Error('Sesi tidak valid');
  return r.json();
}

// jadwal (opsional) = unix timestamp dalam detik; bila diisi, Fonnte mengirim pada jam itu.
async function kirimFonnte(token, nomor, teks, jadwal) {
  const isi = { target: nomor, message: teks };
  if (jadwal) isi.schedule = Math.floor(Number(jadwal));
  const r = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: token, 'Content-Type': 'application/json' },
    body: JSON.stringify(isi)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.status === false) throw new Error(j.reason || 'Fonnte menolak pesan');
  return j;
}

module.exports = async (req, res) => {
  if (req.method === 'GET') return res.status(200).send(SB && KEY ? 'API kirim aktif' : 'API kirim belum dikonfigurasi');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Metode tidak diizinkan' });
  try {
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ error: 'Belum login' });
    const user = await sb('/auth/v1/user', token);
    const p = (await sb(`/rest/v1/profil?id=eq.${user.id}&select=aktif,role`))[0];
    if (!p || !p.aktif) return res.status(403).json({ error: 'Akun tidak aktif' });
    const b = req.body || {};
    const sekolahId = Number(b.sekolah_id);
    if (!Number.isInteger(sekolahId) || sekolahId <= 0) return res.status(400).json({ error: 'Sekolah tidak valid' });
    // Pengiriman Developer ditandai: tersembunyi dari staf sekolah, tetap lengkap di role Developer.
    // Termasuk saat Developer memakai "Masuk sebagai" (mode bantuan): sesinya milik akun guru,
    // tetapi token X-Bantuan yang bertanda tangan server membuktikan itu Developer.
    const olehDev = p.role === 'developer' || LIB.bantuanCek(String(req.headers['x-bantuan'] || ''), user.id, sekolahId);
    if (p.role !== 'developer') {
      const m = (await sb(`/rest/v1/keanggotaan?profil_id=eq.${user.id}&sekolah_id=eq.${sekolahId}&select=role,aktif`))[0];
      if (!m || !m.aktif || !['guru', 'operator', 'pengelola', 'wakil_kepala', 'kepala_sekolah'].includes(m.role)) return res.status(403).json({ error: 'Tidak punya akses ke sekolah ini' });
    }
    // Token utama = token pertama yang didaftarkan sekolah (Pengaturan > Konfigurasi)
    const t0 = (await sb(`/rest/v1/fonnte_token?sekolah_id=eq.${sekolahId}&select=token&order=id.asc&limit=1`))[0] || {};
    const FONNTE = t0.token || (sekolahId === SEKOLAH_PERTAMA ? ENV_FONNTE : '');
    if (!FONNTE) return res.status(500).json({ error: 'Token Fonnte sekolah belum diisi di Pengaturan > Koneksi' });


    // ---------- LIBUR MANUAL: semua guru boleh, tanpa membuka Pengaturan ----------
    if (b.aksi === 'libur_manual') {
      const tanggal = String(b.tanggal || '');
      const bagianTanggal = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      const tanggalServer = Object.fromEntries(bagianTanggal.map(x => [x.type, x.value]));
      const hariIni = tanggalServer.year + '-' + tanggalServer.month + '-' + tanggalServer.day;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal) || tanggal !== hariIni) {
        return res.status(400).json({ error: 'Tombol Liburkan Siswa hanya mengirim notifikasi untuk hari ini' });
      }

      const [kelasRows, siswaRows, rahasiaRows, tokenRows, sekolahRows] = await Promise.all([
        sb(`/rest/v1/kelas?sekolah_id=eq.${sekolahId}&select=id,nama&limit=5000`),
        sb(`/rest/v1/siswa?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=id,kelas_id&limit=5000`),
        sb(`/rest/v1/pengaturan_rahasia?sekolah_id=eq.${sekolahId}&select=nomor_kepala`),
        sb(`/rest/v1/fonnte_token?sekolah_id=eq.${sekolahId}&select=id,token&order=id.asc`),
        sb(`/rest/v1/pengaturan?sekolah_id=eq.${sekolahId}&select=nama_sekolah&limit=1`)
      ]);
      const tokenUtama = (tokenRows || [])[0]?.token || FONNTE;
      const bersihNomor = n => String(n || '').replace(/\D/g, '');
      const kepala = bersihNomor((rahasiaRows || [])[0]?.nomor_kepala);
      if (!tokenUtama) return res.status(400).json({ error: 'Token Fonnte sekolah belum dikonfigurasi' });
      if (!RE_NOMOR.test(kepala)) return res.status(400).json({ error: 'Nomor WhatsApp Kepala Sekolah belum valid di Pengaturan' });

      const siswa = siswaRows || [];
      if (!siswa.length) return res.status(400).json({ error: 'Belum ada siswa aktif di sekolah ini' });
      const siswaIds = siswa.map(x => Number(x.id)).filter(Number.isInteger);
      const abs = await sb(`/rest/v1/absensi?siswa_id=in.(${siswaIds.join(',')})&tanggal=eq.${tanggal}&status=eq.libur&select=siswa_id&limit=10000`);
      const setLibur = new Set((abs || []).map(x => String(x.siswa_id)));
      const kelasLibur = (kelasRows || []).filter(k => {
        const anak = siswa.filter(s => Number(s.kelas_id) === Number(k.id));
        return anak.length > 0 && anak.every(s => setLibur.has(String(s.id)));
      });
      if (!kelasLibur.length) return res.status(200).json({ ok: true, dilewati: true, pesan: 'Belum ada kelas yang seluruh siswanya berstatus Libur' });

      const kelasIds = kelasLibur.map(x => Number(x.id));
      const relasi = await sb(`/rest/v1/kelas_grup_wa?sekolah_id=eq.${sekolahId}&kelas_id=in.(${kelasIds.join(',')})&select=kelas_id,grup_wa_id`);
      const grupIds = [...new Set((relasi || []).map(x => Number(x.grup_wa_id)).filter(Number.isInteger))];
      const [grupRows, anggotaRows] = await Promise.all([
        grupIds.length ? sb(`/rest/v1/grup_wa?sekolah_id=eq.${sekolahId}&id=in.(${grupIds.join(',')})&select=id,grup_id,label,token_id`) : Promise.resolve([]),
        sb(`/rest/v1/keanggotaan?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=profil_id`)
      ]);
      const anggotaIds = [...new Set((anggotaRows || []).map(x => String(x.profil_id)).filter(x => /^[0-9a-f-]{36}$/i.test(x)))];
      const profilRows = anggotaIds.length ? await sb(`/rest/v1/profil?id=in.(${anggotaIds.join(',')})&aktif=eq.true&select=id,nama,no_wa`) : [];
      const tokenById = new Map((tokenRows || []).map(x => [String(x.id), x.token]));
      const grupById = new Map((grupRows || []).map(x => [String(x.id), x]));
      const kelasById = new Map(kelasLibur.map(x => [String(x.id), x]));
      const grupMap = new Map();
      for (const rel of relasi || []) {
        const g = grupById.get(String(rel.grup_wa_id));
        const k = kelasById.get(String(rel.kelas_id));
        if (!g || !g.grup_id || !k) continue;
        if (!grupMap.has(String(g.id))) grupMap.set(String(g.id), { grup: g, kelas: [] });
        grupMap.get(String(g.id)).kelas.push(k.nama);
      }

      const namaKelas = kelasLibur.map(x => x.nama).sort((a,b) => a.localeCompare(b, 'id'));
      const namaSekolah = (sekolahRows || [])[0]?.nama_sekolah || 'Sekolah';
      const formatTanggal = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const tanggalTeks = formatTanggal.format(new Date(tanggal + 'T00:00:00+07:00'));
      const buatPesan = daftarKelas => [
        '🌸 *INFORMASI LIBUR SEKOLAH*',
        '',
        'Assalamu’alaikum warahmatullahi wabarakatuh.',
        '',
        'Yth. Bapak/Ibu Wali Murid,',
        '',
        'Kami informasikan bahwa kegiatan belajar mengajar pada:',
        '',
        '📅 Hari/Tanggal: *' + tanggalTeks + '*',
        '',
        '🏫 Kelas yang diliburkan: *' + daftarKelas.join(', ') + '*',
        '📝 Keterangan: *Libur hari ini melalui tombol Liburkan Siswa*',
        '',
        'Kegiatan belajar mengajar pada kelas tersebut diliburkan. Kegiatan belajar kembali dilaksanakan sesuai jadwal sekolah.',
        '',
        'Terima kasih atas perhatian dan kerja sama Bapak/Ibu. 😊',
        '',
        'Wassalamu’alaikum warahmatullahi wabarakatuh.',
        '',
        '🏫 *' + namaSekolah + '*'
      ].join('\n');

      // Kunci satu notifikasi per sekolah/tanggal. Jika sebelumnya gagal/parsial,
      // hanya satu pemanggil yang boleh mengambil alih; pesan kepala yang sudah diterima tidak diulang.
      let notifId = null;
      let ulangParsial = false;
      const ins = await fetch(SB + '/rest/v1/notifikasi_libur?on_conflict=sekolah_id,tanggal', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ sekolah_id: sekolahId, tanggal, pesan: buatPesan(namaKelas), status: 'processing', percobaan: 1 })
      });
      const insRows = await ins.json().catch(() => []);
      if (!ins.ok) throw new Error('Gagal mengunci notifikasi libur: ' + ins.status);
      if (Array.isArray(insRows) && insRows.length) {
        notifId = insRows[0].id;
      } else {
        const existing = (await sb(`/rest/v1/notifikasi_libur?sekolah_id=eq.${sekolahId}&tanggal=eq.${tanggal}&select=id,status,percobaan&limit=1`)) || [];
        const old = existing[0];
        if (!old) throw new Error('Catatan notifikasi libur sudah ada tetapi tidak dapat dibaca');
        if (!['failed', 'partial'].includes(String(old.status))) {
          return res.status(200).json({ ok: true, duplicate: true, status: old.status, pesan: 'Notifikasi libur hari ini sudah diproses; tidak dikirim ulang.' });
        }
        const claim = await fetch(SB + `/rest/v1/notifikasi_libur?id=eq.${old.id}&status=in.(failed,partial)`, {
          method: 'PATCH',
          headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=representation' },
          body: JSON.stringify({ status: 'processing', percobaan: Number(old.percobaan || 1) + 1, terakhir_error: null })
        });
        const claimed = await claim.json().catch(() => []);
        if (!claim.ok || !Array.isArray(claimed) || !claimed.length) {
          return res.status(200).json({ ok: true, duplicate: true, pesan: 'Notifikasi sedang diproses oleh permintaan lain.' });
        }
        notifId = old.id;
        ulangParsial = true;
      }

      const batch = `manual-libur-${sekolahId}-${tanggal}-${notifId}`;
      const logs = [];
      const gagal = [];
      let waktu = Math.floor(Date.now() / 1000);
      const jadwalkan = async (target, teks, token, label) => {
        const nomor = String(target || '').trim();
        if (!token) {
          const alasan = 'Token Fonnte tidak ditemukan';
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label, nomor, status: 'gagal', error: alasan });
          gagal.push(label + ': ' + alasan);
          return;
        }
        waktu += 30 + Math.floor(Math.random() * 31);
        try {
          const hasil = await kirimFonnte(token, nomor, teks, waktu);
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label, nomor, fonnte_id: idFonnte(hasil), state_fonnte: hasil && hasil.detail && hasil.detail.id ? String(hasil.detail.id) : null, status: 'terjadwal', status_fonnte: hasil && hasil.status ? String(hasil.status) : null, jadwal_pada: new Date(waktu * 1000).toISOString() });
        } catch (e) {
          const alasan = potong(e.message || e, 300);
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label, nomor, status: 'gagal', error: alasan });
          gagal.push(label + ': ' + alasan);
        }
      };

      // Kepala sekolah sudah menerima pada percobaan pertama; jangan kirim duplikat saat retry parsial.
      if (!ulangParsial) {
        try {
          const hasil = await kirimFonnte(tokenUtama, kepala, buatPesan(namaKelas));
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label: 'Kepala Sekolah', nomor: kepala, fonnte_id: idFonnte(hasil), state_fonnte: hasil && hasil.detail && hasil.detail.id ? String(hasil.detail.id) : null, status: 'terjadwal', status_fonnte: hasil && hasil.status ? String(hasil.status) : null });
        } catch (e) {
          const alasan = potong(e.message || e, 300);
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label: 'Kepala Sekolah', nomor: kepala, status: 'gagal', error: alasan });
          gagal.push('Kepala Sekolah: ' + alasan);
        }
      }

      const nomorSudah = new Set([kepala]);
      for (const a of profilRows || []) {
        const nomor = bersihNomor(a.no_wa);
        if (!RE_NOMOR.test(nomor) || nomorSudah.has(nomor)) continue;
        nomorSudah.add(nomor);
        await jadwalkan(nomor, buatPesan(namaKelas), tokenUtama, a.nama || 'Staf sekolah');
      }
      for (const item of grupMap.values()) {
        const g = item.grup;
        const target = String(g.grup_id || '');
        const nama = [...new Set(item.kelas)].sort((a,b) => a.localeCompare(b, 'id'));
        const tokenGrup = g.token_id ? tokenById.get(String(g.token_id)) : tokenUtama;
        await jadwalkan(target, buatPesan(nama), tokenGrup, 'Grup ' + (g.label || target));
      }

      const logTercatat = await catatLog(logs);
      if (!logTercatat) gagal.push('Riwayat status pesan gagal disimpan ke database');
      const sukses = logs.filter(x => x.status === 'terjadwal').length;
      const gagalSemua = gagal.length > 0;
      const statusAkhir = gagalSemua ? (sukses > 0 ? 'partial' : 'failed') : 'sent';
      const patch = await fetch(SB + `/rest/v1/notifikasi_libur?id=eq.${notifId}`, {
        method: 'PATCH',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: statusAkhir, terkirim: sukses ? new Date().toISOString() : null, terakhir_error: gagalSemua ? potong(gagal.join('; '), 500) : null })
      });
      if (!patch.ok) console.error('Gagal memperbarui status notifikasi libur manual:', patch.status);
      return res.status(200).json({ ok: true, sent: sukses > 0, kepala: ulangParsial ? 0 : (logs.some(x => x.label === 'Kepala Sekolah' && x.status === 'terjadwal') ? 1 : 0), staf: logs.filter(x => x.status === 'terjadwal' && x.label !== 'Kepala Sekolah' && !String(x.nomor).includes('@g.us')).length, grup: logs.filter(x => x.status === 'terjadwal' && String(x.nomor).includes('@g.us')).length, gagal: gagal.length, detail_gagal: gagal.slice(0, 8), duplicate: false, status: statusAkhir });
    }

    // ---------- PEMBATALAN PESAN GRUP LIBUR OTOMATIS ----------
    if (b.aksi === 'batalkan_libur_grup') {
      const tanggal = String(b.tanggal || '');
      if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return res.status(400).json({ error: 'Tanggal tidak valid' });
      const notif = (await sb(`/rest/v1/notifikasi_libur?sekolah_id=eq.${sekolahId}&tanggal=eq.${tanggal}&select=id&limit=1`))[0];
      if (!notif) return res.status(200).json({ ok: true, dibatalkan: 0, dilewati: true });
      const batchId = `libur-auto-${sekolahId}-${tanggal}-${notif.id}`;
      const logs = await sb(`/rest/v1/kirim_log?sekolah_id=eq.${sekolahId}&jenis=eq.libur&batch_id=eq.${encodeURIComponent(batchId)}&status=eq.terjadwal&select=id,nomor,fonnte_id`);
      const grupLogs = (logs || []).filter(x => RE_GRUP.test(String(x.nomor || '')) && x.fonnte_id);
      if (!grupLogs.length) return res.status(200).json({ ok: true, dibatalkan: 0, gagal: 0 });
      const grupIds = [...new Set(grupLogs.map(x => String(x.nomor)))];
      const grupRows = await sb(`/rest/v1/grup_wa?sekolah_id=eq.${sekolahId}&grup_id=in.(${grupIds.map(encodeURIComponent).join(',')})&select=grup_id,token_id`);
      const tokenRows = await sb(`/rest/v1/fonnte_token?sekolah_id=eq.${sekolahId}&select=id,token`);
      const tokenById = new Map((tokenRows || []).map(x => [String(x.id), x.token]));
      const tokenByGroup = new Map((grupRows || []).map(x => [String(x.grup_id), x.token_id ? tokenById.get(String(x.token_id)) : FONNTE]));
      let dibatalkan = 0, gagal = 0;
      for (const log of grupLogs) {
        const tokenGrup = tokenByGroup.get(String(log.nomor)) || FONNTE;
        try {
          const r = await fetch('https://api.fonnte.com/delete-message', {
            method: 'POST', headers: { Authorization: tokenGrup, 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ id: String(log.fonnte_id) })
          });
          const j = await r.json().catch(() => ({}));
          if (!r.ok || j.status === false) throw new Error(j.reason || j.message || 'Fonnte menolak pembatalan');
          await fetch(SB + `/rest/v1/kirim_log?id=eq.${log.id}`, {
            method: 'PATCH', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ status: 'dibatalkan', error: null })
          });
          dibatalkan++;
        } catch (e) {
          gagal++;
          await fetch(SB + `/rest/v1/kirim_log?id=eq.${log.id}`, {
            method: 'PATCH', headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
            body: JSON.stringify({ error: potong(e.message || e, 300) })
          }).catch(() => {});
        }
      }
      return res.status(200).json({ ok: true, dibatalkan, gagal });
    }

    // ---------- BANYAK PESAN: dijadwalkan bertahap ----------
    if (Array.isArray(b.pesan)) {
      const daftar = b.pesan;
      if (!daftar.length) return res.status(400).json({ error: 'Daftar pesan kosong' });
      if (daftar.length > MAKS_BATCH) return res.status(400).json({ error: 'Maksimal ' + MAKS_BATCH + ' pesan per permintaan' });
      const sekarang = Math.floor(Date.now() / 1000);
      let waktu = sekarang;
      const mulai = Math.floor(Number(b.mulai) || 0);
      if (mulai > sekarang && mulai <= sekarang + MAKS_MULAI) waktu = mulai;
      const hasil = new Array(daftar.length);
      const ids = new Array(daftar.length).fill(null);
      const jam = new Array(daftar.length).fill(null);
      const meta = {
        jenis: JENIS_OK.includes(b.jenis) ? b.jenis : 'lainnya',
        judul: potong(b.judul, 120),
        batch: potong(b.batch, 100) || crypto.randomUUID()
      };
      // ID grup hanya diizinkan untuk notifikasi libur dan harus terdaftar pada sekolah ini.
      const targetGrup = [...new Set(daftar.map(x => String((x && x.nomor) || '').trim()).filter(x => RE_GRUP.test(x)))];
      if (b.tujuan === 'grup' && (meta.jenis !== 'libur' || !daftar.every(x => RE_GRUP.test(String((x && x.nomor) || '').trim())))) {
        return res.status(400).json({ error: 'Jalur khusus grup hanya menerima ID grup WhatsApp untuk notifikasi libur' });
      }
      const grupByTarget = new Map();
      const tokenById = new Map();
      if (targetGrup.length) {
        if (meta.jenis !== 'libur') return res.status(400).json({ error: 'Tujuan grup hanya diizinkan untuk notifikasi libur' });
        const grupRows = await sb(`/rest/v1/grup_wa?sekolah_id=eq.${sekolahId}&grup_id=in.(${targetGrup.map(encodeURIComponent).join(',')})&select=grup_id,label,token_id`);
        const tokenRows = await sb(`/rest/v1/fonnte_token?sekolah_id=eq.${sekolahId}&select=id,token`);
        (tokenRows || []).forEach(x => tokenById.set(String(x.id), x.token));
        (grupRows || []).forEach(x => grupByTarget.set(String(x.grup_id), x));
      }
      const antre = [];
      daftar.forEach((x, i) => {
        const nomor = String((x && x.nomor) || '').trim();
        const teks = String((x && x.teks) || '');
        const grup = RE_GRUP.test(nomor);
        if (!RE_NOMOR.test(nomor) && !(grup && meta.jenis === 'libur' && grupByTarget.has(nomor))) { hasil[i] = { ok: false, error: grup ? 'Grup WhatsApp tidak terdaftar pada sekolah ini' : 'Nomor tidak valid' }; return; }
        if (!teks) { hasil[i] = { ok: false, error: 'Pesan kosong' }; return; }
        const cfgGrup = grup ? grupByTarget.get(nomor) : null;
        const tokenPesan = cfgGrup ? (cfgGrup.token_id ? tokenById.get(String(cfgGrup.token_id)) : FONNTE) : FONNTE;
        if (!tokenPesan) { hasil[i] = { ok: false, error: 'Token Fonnte grup tidak ditemukan' }; return; }
        waktu += grup ? jedaGrupAcak() : jedaAcak();
        jam[i] = waktu;
        antre.push({ i, nomor, teks, waktu, token: tokenPesan, grup });
      });
      // Hanya mendaftarkan jadwal ke Fonnte (cepat); 5 permintaan sekaligus.
      for (let k = 0; k < antre.length; k += 5) {
        const bag = antre.slice(k, k + 5);
        const hs = await Promise.allSettled(bag.map((x) => kirimFonnte(x.token || FONNTE, x.nomor, x.teks, x.waktu)));
        hs.forEach((h, j) => {
          if (h.status === 'fulfilled') {
            hasil[bag[j].i] = { ok: true };
            ids[bag[j].i] = idFonnte(h.value);
          } else {
            hasil[bag[j].i] = { ok: false, error: String((h.reason && h.reason.message) || h.reason) };
          }
        });
      }
      // Catat riwayat (satu baris per pesan, termasuk yang ditolak).
      await catatLog(daftar.map((x, i) => ({
        sekolah_id: sekolahId,
        oleh_developer: olehDev,
        batch_id: meta.batch,
        jenis: meta.jenis,
        judul: meta.judul,
        label: potong(x && x.label, 120),
        nomor: (RE_GRUP.test(String((x && x.nomor) || '').trim()) ? String(x.nomor).trim() : String((x && x.nomor) || '').replace(/\D/g, '').slice(0, 20)) || '-',
        fonnte_id: ids[i],
        siswa_ids: daftarId(x && x.siswa_ids),
        status: hasil[i].ok ? 'terjadwal' : 'gagal',
        error: hasil[i].ok ? null : potong(hasil[i].error, 300),
        jadwal_pada: hasil[i].ok && jam[i] ? new Date(jam[i] * 1000).toISOString() : null
      })));
      return res.status(200).json({ ok: true, hasil, berikutnya: waktu, batch_id: meta.batch });
    }

    // ---------- SATU PESAN: langsung ----------
    const nomor = String(b.nomor || '').replace(/\D/g, '');
    const teks = String(b.teks || '');
    if (!RE_NOMOR.test(nomor)) return res.status(400).json({ error: 'Nomor tidak valid' });
    if (!teks) return res.status(400).json({ error: 'Pesan kosong' });
    const metaSatu = {
      sekolah_id: sekolahId,
      oleh_developer: olehDev,
      batch_id: potong(b.batch, 60) || crypto.randomUUID(),
      jenis: JENIS_OK.includes(b.jenis) ? b.jenis : 'lainnya',
      judul: potong(b.judul, 120),
      label: potong(b.label, 120),
      siswa_ids: daftarId(b.siswa_ids),
      nomor
    };
    let balasan;
    try {
      balasan = await kirimFonnte(FONNTE, nomor, teks);
    } catch (e) {
      await catatLog([{ ...metaSatu, status: 'gagal', error: potong(e.message || 'Fonnte menolak pesan', 300) }]);
      return res.status(502).json({ error: e.message || 'Fonnte menolak pesan' });
    }
    await catatLog([{ ...metaSatu, fonnte_id: idFonnte(balasan), status: 'terjadwal' }]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
};
