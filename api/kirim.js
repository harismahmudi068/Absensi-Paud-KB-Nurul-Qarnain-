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
  if (!baris.length) return;
  try {
    const r = await fetch(SB + '/rest/v1/kirim_log', {
      method: 'POST',
      headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(baris)
    });
    if (!r.ok) console.error('Catat riwayat kirim gagal:', r.status, await r.text());
  } catch (e) { console.error('Catat riwayat kirim gagal:', e); }
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
      if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(tanggal) || tanggal !== hariIni) {
        return res.status(400).json({ error: 'Tombol Liburkan Siswa hanya mengirim notifikasi untuk hari ini' });
      }

      const [kelasRows, siswaRows, rahasiaRows, tokenRows] = await Promise.all([
        sb(`/rest/v1/kelas?sekolah_id=eq.${sekolahId}&select=id,nama`),
        sb(`/rest/v1/siswa?sekolah_id=eq.${sekolahId}&aktif=eq.true&select=id,kelas_id`),
        sb(`/rest/v1/pengaturan_rahasia?sekolah_id=eq.${sekolahId}&select=nomor_kepala`),
        sb(`/rest/v1/fonnte_token?sekolah_id=eq.${sekolahId}&select=id,token&order=id.asc`)
      ]);
      const tokenUtama = (tokenRows || [])[0]?.token || FONNTE;
      const kepala = String((rahasiaRows || [])[0]?.nomor_kepala || '').replace(/\\D/g, '');
      if (!tokenUtama) return res.status(400).json({ error: 'Token Fonnte sekolah belum dikonfigurasi' });
      if (!RE_NOMOR.test(kepala)) return res.status(400).json({ error: 'Nomor WhatsApp Kepala Sekolah belum valid di Profil/Pengaturan' });

      const siswa = siswaRows || [];
      if (!siswa.length) return res.status(400).json({ error: 'Belum ada siswa aktif di sekolah ini' });
      const siswaIds = siswa.map(x => Number(x.id)).filter(Number.isInteger);
      const abs = await sb(`/rest/v1/absensi?siswa_id=in.(${siswaIds.join(',')})&tanggal=eq.${tanggal}&status=eq.libur&select=siswa_id`);
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

      const tanggalTeks = new Date(tanggal + 'T00:00:00+07:00').toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
      const namaKelas = kelasLibur.map(x => x.nama).sort((a,b) => a.localeCompare(b, 'id'));
      const namaSekolah = ((await sb(`/rest/v1/sekolah?id=eq.${sekolahId}&select=nama`)) || [])[0]?.nama || 'Sekolah';
      const pesan = [
        '🌸 *INFORMASI LIBUR SEKOLAH*', '',
        'Assalamu’alaikum warahmatullahi wabarakatuh.', '',
        'Kami informasikan bahwa kegiatan belajar mengajar pada:', '',
        '📅 Hari/Tanggal: *' + tanggalTeks + '*',
        '🏫 Kelas yang diliburkan: *' + namaKelas.join(', ') + '*',
        '📝 Keterangan: *Libur hari ini melalui tombol Liburkan Siswa*', '',
        'Kegiatan belajar mengajar pada kelas tersebut diliburkan untuk hari ini.',
        'Terima kasih atas perhatian dan kerja sama Bapak/Ibu. 😊', '',
        '🏫 *' + namaSekolah + '*'
      ].join('\\n');

      // Klaim atomik: UNIQUE(sekolah_id,tanggal) mencegah dua guru/cron mengirim dua kali.
      const ins = await fetch(SB + '/rest/v1/notifikasi_libur?on_conflict=sekolah_id,tanggal', {
        method: 'POST',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
        body: JSON.stringify({ sekolah_id: sekolahId, tanggal, pesan, status: 'processing', percobaan: 1 })
      });
      const insRows = await ins.json().catch(() => []);
      if (!ins.ok) throw new Error('Gagal mengunci notifikasi libur: ' + ins.status);
      if (!Array.isArray(insRows) || !insRows.length) {
        const existing = (await sb(`/rest/v1/notifikasi_libur?sekolah_id=eq.${sekolahId}&tanggal=eq.${tanggal}&select=status,terkirim,terakhir_error&limit=1`)) || [];
        return res.status(200).json({ ok: true, duplicate: true, status: existing[0]?.status || 'sudah tercatat', pesan: 'Notifikasi libur sekolah untuk hari ini sudah pernah dibuat; tidak dikirim ulang.' });
      }
      const notifId = insRows[0].id;
      const batch = `manual-libur-${sekolahId}-${tanggal}-${notifId}`;
      const logs = [];
      let waktu = Math.floor(Date.now() / 1000);
      const kirimTerjadwal = async (target, teks, token, label, jeda) => {
        if (!token) {
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label, nomor: target, status: 'gagal', error: 'Token Fonnte tidak ditemukan' });
          return 'Token Fonnte tidak ditemukan';
        }
        waktu += jeda;
        try {
          const hasil = await kirimFonnte(token, target, teks, waktu);
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label, nomor: target, fonnte_id: idFonnte(hasil), status: 'terjadwal', jadwal_pada: new Date(waktu * 1000).toISOString() });
          return null;
        } catch (e) {
          const alasan = potong(e.message || e, 300);
          logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label, nomor: target, status: 'gagal', error: alasan });
          return alasan;
        }
      };

      const gagal = [];
      try {
        const hKepala = await kirimFonnte(tokenUtama, kepala, pesan);
        logs.push({ sekolah_id: sekolahId, batch_id: batch, jenis: 'libur', judul: 'Notifikasi libur ' + tanggal, label: 'Kepala Sekolah', nomor: kepala, fonnte_id: idFonnte(hKepala), status: 'terjadwal' });
      } catch (e) {
        throw new Error('Pengiriman ke Kepala Sekolah gagal: ' + (e.message || e));
      }

      const nomorSudah = new Set([kepala]);
      for (const a of profilRows || []) {
        const nomor = String(a.no_wa || '').replace(/\\D/g, '');
        if (!RE_NOMOR.test(nomor) || nomorSudah.has(nomor)) continue;
        nomorSudah.add(nomor);
        const err = await kirimTerjadwal(nomor, pesan, tokenUtama, a.nama || 'Staf sekolah', 15 + Math.floor(Math.random() * 16));
        if (err) gagal.push((a.nama || nomor) + ': ' + err);
      }

      for (const item of grupMap.values()) {
        const g = item.grup;
        const target = String(g.grup_id || '');
        const nama = [...new Set(item.kelas)].sort((a,b) => a.localeCompare(b, 'id'));
        const pesanGrup = pesan.replace('Kelas yang diliburkan: *' + namaKelas.join(', ') + '*', 'Kelas yang diliburkan: *' + nama.join(', ') + '*');
        const tokenGrup = g.token_id ? tokenById.get(String(g.token_id)) : tokenUtama;
        const err = await kirimTerjadwal(target, pesanGrup, tokenGrup, 'Grup ' + (g.label || target), 30 + Math.floor(Math.random() * 31));
        if (err) gagal.push('Grup ' + target + ': ' + err);
      }

      await catatLog(logs);
      const patch = await fetch(SB + `/rest/v1/notifikasi_libur?id=eq.${notifId}`, {
        method: 'PATCH',
        headers: { apikey: KEY, Authorization: 'Bearer ' + KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'sent', terkirim: new Date().toISOString(), terakhir_error: gagal.length ? potong(gagal.join('; '), 500) : null })
      });
      if (!patch.ok) console.error('Gagal memperbarui status notifikasi libur manual:', patch.status);
      return res.status(200).json({ ok: true, sent: true, kepala: 1, staf: Math.max(0, nomorSudah.size - 1), grup: grupMap.size, gagal: gagal.length, detail_gagal: gagal.slice(0, 5), duplicate: false });
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
