// Webhook Fonnte: membaca pesan izin/sakit dari orang tua dan mencatatnya ke Supabase.
// Butuh 4 Environment Variables di Vercel:
// SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FONNTE_TOKEN, WEBHOOK_SECRET

const SB = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sb(path, { method = 'GET', body, prefer } = {}) {
  const headers = { apikey: KEY, 'Content-Type': 'application/json' };
  if (KEY.startsWith('eyJ')) headers.Authorization = 'Bearer ' + KEY;
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(`${SB}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t}`);
  return t ? JSON.parse(t) : null;
}

async function balas(no, teks) {
  try {
    await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: process.env.FONNTE_TOKEN },
      body: new URLSearchParams({ target: no, message: teks })
    });
  } catch (e) { console.error('Gagal balas', e); }
}

const tanggal = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
const jam = iso => iso ? new Date(iso).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) : '';
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SAKIT = /\b(sakit|demam|flu|batuk|pilek|panas|diare|muntah|pusing|cacar|tipes|dbd|opname)\b/;
const IZIN = /\b(izin|ijin|permisi|tidak masuk|ga masuk|gak masuk|nggak masuk|libur|acara|keluar kota|mudik)\b/;
const bacaStatus = t => SAKIT.test(t) ? 'sakit' : IZIN.test(t) ? 'izin' : null;

async function catat(dari, isi, hasil, cek) {
  await sb('pesan_masuk', { method: 'POST', body: { dari_nomor: dari, isi, hasil, perlu_dicek: cek }, prefer: 'return=minimal' });
}

function daftarNama(list) {
  const n = list.map(s => s.nama_panggilan);
  return n.length > 1 ? n.slice(0, -1).join(', ') + ' dan ' + n[n.length - 1] : n[0];
}

async function simpan(dari, pesan, anak, status, catatan) {
  const T = tanggal();
  const ids = anak.map(s => s.id).join(',');
  const ada = await sb(`absensi?tanggal=eq.${T}&siswa_id=in.(${ids})&select=siswa_id,status,jam_datang`);
  const sudahHadir = anak.filter(s => ada.some(a => a.siswa_id === s.id && a.status === 'hadir'));
  const ubah = anak.filter(s => !sudahHadir.includes(s));
  const teks = [];
  if (ubah.length) {
    const rows = ubah.map(s => ({
      siswa_id: s.id, tanggal: T, status, cara: 'whatsapp', jam_datang: null,
      catatan: (catatan || '').slice(0, 200), diubah: new Date().toISOString()
    }));
    await sb('absensi?on_conflict=siswa_id,tanggal', { method: 'POST', body: rows, prefer: 'resolution=merge-duplicates,return=minimal' });
    teks.push(`Terima kasih. ${daftarNama(ubah)} tercatat ${status.toUpperCase()} hari ini.` + (status === 'sakit' ? ' Semoga lekas sembuh.' : ''));
  }
  if (sudahHadir.length) {
    teks.push(`${daftarNama(sudahHadir)} sudah tercatat hadir di sekolah, jadi tidak diubah. Guru akan mengecek.`);
  }
  await balas(dari, teks.join('\n'));
  await catat(dari, pesan, `${status}: ${daftarNama(ubah.length ? ubah : sudahHadir)}` + (sudahHadir.length ? ' (sebagian sudah hadir)' : ''), sudahHadir.length > 0);
}

async function proses(b) {
  const pesan = String(b.message || b.text || '').trim();
  const dari = String(b.sender || '').replace(/\D/g, '');
  if (!dari || !pesan || b.member || String(b.sender).includes('@g.us')) return;
  if (b.device && dari === String(b.device).replace(/\D/g, '')) return;

  const wali = await sb(`wali?no_wa=eq.${dari}&select=id,siswa_wali(siswa(id,nama,nama_panggilan,aktif))`);
  const anak = ((wali[0] && wali[0].siswa_wali) || []).map(x => x.siswa).filter(s => s && s.aktif)
    .sort((a, b) => a.nama.localeCompare(b.nama));
  if (!anak.length) return catat(dari, pesan, 'Nomor tidak terdaftar', true);

  const t = pesan.toLowerCase();
  const tunda = (await sb(`percakapan_tertunda?no_wa=eq.${dari}&select=*`))[0];
  const segar = tunda && Date.now() - new Date(tunda.dibuat).getTime() < 30 * 60000;

  // Jawaban pilihan angka untuk pertanyaan "izin untuk siapa?"
  if (segar && /^\s*\d\s*$/.test(t)) {
    const n = parseInt(t, 10);
    const kandidat = anak.filter(s => tunda.siswa_ids.includes(s.id));
    let pilih = null;
    if (n >= 1 && n <= kandidat.length) pilih = [kandidat[n - 1]];
    else if (n === kandidat.length + 1) pilih = kandidat;
    if (!pilih) {
      await balas(dari, `Balas dengan angka 1 sampai ${kandidat.length + 1}.`);
      return catat(dari, pesan, 'Pilihan angka tidak valid', false);
    }
    await sb(`percakapan_tertunda?no_wa=eq.${dari}`, { method: 'DELETE' });
    return simpan(dari, pesan, pilih, tunda.status, tunda.catatan);
  }

  const status = bacaStatus(t);
  if (!status) {
    await balas(dari, 'Pesan diterima dan akan dicek oleh guru. Untuk izin, tulis: Izin [nama anak], alasannya.');
    return catat(dari, pesan, 'Tidak terbaca sebagai izin/sakit', true);
  }

  let pilih = null;
  if (anak.length === 1) pilih = anak;
  else if (/\b(keduanya|semua|dua-duanya|duaduanya)\b/.test(t)) pilih = anak;
  else {
    const cocok = anak.filter(s => new RegExp('\\b' + esc(s.nama_panggilan.toLowerCase()) + '\\b').test(t));
    if (cocok.length) pilih = cocok;
  }

  if (!pilih) {
    await sb('percakapan_tertunda?on_conflict=no_wa', {
      method: 'POST', prefer: 'resolution=merge-duplicates,return=minimal',
      body: { no_wa: dari, status, catatan: pesan.slice(0, 200), siswa_ids: anak.map(s => s.id), dibuat: new Date().toISOString() }
    });
    const opsi = anak.map((s, i) => `${i + 1} untuk ${s.nama_panggilan}`).concat(`${anak.length + 1} untuk semuanya`).join(', ');
    await balas(dari, `Izin untuk siapa? Balas ${opsi}.`);
    return catat(dari, pesan, 'Menunggu pilihan anak', false);
  }
  return simpan(dari, pesan, pilih, status, pesan);
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(200).send('Webhook aktif');
  if (!process.env.WEBHOOK_SECRET || req.query.key !== process.env.WEBHOOK_SECRET) {
    return res.status(401).send('Tidak diizinkan');
  }
  try { await proses(req.body || {}); } catch (e) { console.error('Webhook error:', e); }
  res.status(200).json({ ok: true });
};
