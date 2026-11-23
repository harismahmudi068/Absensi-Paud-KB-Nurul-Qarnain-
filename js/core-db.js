const URL_SB='https://qhlswhoxlxgcvftrzhap.supabase.co',KEY_SB='sb_publishable_j4AB79X1wVZVLgdfcO0sAQ_EMFBq3KN';
/* ---------- pustaka besar dimuat saat dibutuhkan (bukan saat aplikasi dibuka) ----------
   Excel (xlsx, exceljs), PDF (jspdf + autotable), dan scan QR (html5-qrcode) hanya diunduh saat tombolnya dipakai. */
const LIB_URL={xlsx:'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',exceljs:'https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js',pdf:'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js',autotable:'https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js',scan:'https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js'};
const LIB_ADA={xlsx:()=>typeof XLSX!=='undefined',exceljs:()=>typeof ExcelJS!=='undefined',pdf:()=>!!(window.jspdf&&window.jspdf.jsPDF),autotable:()=>!!(window.jspdf&&window.jspdf.jsPDF&&window.jspdf.jsPDF.API&&window.jspdf.jsPDF.API.autoTable),scan:()=>!!window.Html5Qrcode};
const LIB_P={};
function libSatu(k){if(LIB_ADA[k]())return Promise.resolve();
 if(!LIB_P[k])LIB_P[k]=new Promise((ok,gagal)=>{const e=document.createElement('script');e.src=LIB_URL[k];e.async=true;
  e.onload=()=>LIB_ADA[k]()?ok():gagal(new Error('Pustaka '+k+' tidak lengkap'));
  e.onerror=()=>{e.remove();gagal(new Error('Pustaka '+k+' gagal diunduh'))};document.head.appendChild(e)}).catch(x=>{delete LIB_P[k];throw x});
 return LIB_P[k]}
async function muatLib(daftar,diam){
 const urut=[];[].concat(daftar).forEach(k=>{if(k==='pdf')urut.push('pdf','autotable');else urut.push(k)});
 const perlu=[...new Set(urut)].filter(k=>!LIB_ADA[k]());if(!perlu.length)return;
 if(!diam)ld(1,'Menyiapkan pustaka...');
 try{await Promise.all(perlu.filter(k=>k!=='autotable').map(libSatu));if(perlu.includes('autotable'))await libSatu('autotable')}
 catch(e){if(!diam)toast('Gagal memuat pustaka. Periksa koneksi internet lalu coba lagi.',false);throw e}
 finally{if(!diam)ld(0)}}
/* ---------- penyimpanan sementara (cache) pembacaan data ----------
   Data menu disimpan CM_TTL (2 menit). Setiap penulisan dari perangkat ini (simpan/ubah/hapus ke database,
   penyimpanan file, atau /api) menaikkan cmVer sehingga semua cache otomatis dianggap basi. */
const CM_TTL=120000,CM=new Map();let cmVer=0,refVer=0;
const RPC_BACA=/^(developer_(alpa|alumni_daftar|alumni_per_sekolah|alumni_ringkas|cron_daftar|guru|jam_notif_siswa|kirim_log|log|notif_libur|notif_piket|notif_siswa|pengingat_izin_sakit|pendaftaran|permintaan_nomor|push_daftar|sekolah)|keputusan_validasi|rapor_kehadiran|nomor_wa_(guru|kepala|operator)|tabungan_saldo|tahun_baru_ringkasan|email_dari_username)$/;
function cmTulis(u,m){m=String(m||'GET').toUpperCase();if(m==='GET'||m==='HEAD'||m==='OPTIONS')return false;
 const s=String((u&&u.url)||u||''),r=s.match(/\/rest\/v1\/rpc\/([A-Za-z0-9_]+)/);
 if(r)return !RPC_BACA.test(r[1]);
 if(/\/auth\/v1\/(token|logout)/.test(s))return false;
 return /\/(rest\/v1|storage\/v1|auth\/v1|api)\//.test(s)}
const _fetchAsli=window.fetch.bind(window);
/* refVer: versi data acuan Kelola Raport (mapel, kelompok, master indikator). Naik pada SEMUA penulisan, kecuali penulisan
   ke tabel yang pasti tidak mengubahnya (nilai raport, absensi, tabungan, setoran hafalan, pesan). Penulisan yang tidak dikenal tetap menaikkannya. */
const REF_ABAI=/\/rest\/v1\/(rapor|absensi|tabungan_transaksi|hafalan_setoran|laporan_ortu|pesan_masuk|percakapan_tertunda)(\?|\/|$)/;
function cmFetch(u,o){const w=cmTulis(u,(o&&o.method)||(u&&u.method)),rf=w&&!REF_ABAI.test(String((u&&u.url)||u||''));if(w)cmVer++;if(rf)refVer++;const p=_fetchAsli(u,o);if(w)p.then(()=>{cmVer++;if(rf)refVer++},()=>{cmVer++;if(rf)refVer++});return p}
window.fetch=cmFetch;
const cmOk=(k,ttl)=>{const e=CM.get(k);return !!e&&e.v===cmVer&&Date.now()-e.t<(ttl||CM_TTL)};
const cmCatat=(k,v0)=>CM.set(k,{t:Date.now(),v:v0});
function cmKosong(){CM.clear();cmVer++;refVer++}
/* menu yang boleh memakai cache: [kunci, umur]. Scan dan Absensi hari ini, Tabungan, Pengaturan selalu dibaca segar. */
function cmKunci(id){
 if(role==='Developer')return null;
 const hb=hariIni().slice(0,7);
 switch(id){
  case 'dashboard':return ['dash|'+TODAY,CM_TTL];
  case 'absensi':return attDate===TODAY?null:['abs|'+attDate,CM_TTL];
  case 'rekap':return ['bln|'+bulan,bulan<hb?600000:CM_TTL];
  case 'laporanortu':return ['bln|'+lb,lb<hb?600000:CM_TTL];
  case 'guru':case 'pesan':case 'piket':case 'hafalan':case 'alumni':case 'kelola':case 'profil':return [id,CM_TTL];
 }
 return null}
const db=supabase.createClient(URL_SB,KEY_SB,{auth:{experimental:{passkey:true}},global:{fetch:cmFetch}});
/* ---------- multi-sekolah: sekolah aktif + pembungkus tabel ---------- */
let SEK=null,MEMB=[],PROFIL=null;
const TENANT=new Set(['absensi','kelas','laporan_ortu','libur_batal','libur_mingguan','libur_tanggal','pengaturan','percakapan_tertunda','pesan_masuk','siswa','wali','tabungan_transaksi','piket_jenis','piket_jadwal','hafalan_jenis','hafalan_item','hafalan_setoran','rapor','rapor_mapel','rapor_kelompok','rapor_master','rapor_salinan']);
const _dbFrom=db.from.bind(db);
db.from=t=>{const q=_dbFrom(t);if(!TENANT.has(t))return q;
 const tambah=r=>Array.isArray(r)?r.map(x=>({...x,sekolah_id:SEK})):{...r,sekolah_id:SEK};
 const sel=q.select.bind(q),ins=q.insert.bind(q),ups=q.upsert.bind(q),upd=q.update.bind(q),del=q.delete.bind(q);
 q.select=(...a)=>SEK==null?sel(...a):sel(...a).eq('sekolah_id',SEK);
 q.insert=(r,...a)=>ins(tambah(r),...a);
 q.upsert=(r,o,...a)=>ups(tambah(r),o&&o.onConflict==='no_wa'?{...o,onConflict:'sekolah_id,no_wa'}:o,...a);
 q.update=(...a)=>SEK==null?upd(...a):upd(...a).eq('sekolah_id',SEK);
 q.delete=(...a)=>SEK==null?del(...a):del(...a).eq('sekolah_id',SEK);
 return q};
