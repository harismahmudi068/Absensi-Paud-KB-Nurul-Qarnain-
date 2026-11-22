const normWA=n=>{let d=String(n||'').replace(/\D/g,'');if(d[0]==='0')d='62'+d.slice(1);else if(d[0]==='8')d='62'+d;return d};
/* pencarian nomor WhatsApp: cocok untuk 08..., 628..., atau sebagian nomor (min. 3 angka) */
const cocokWA=(wa,z)=>{const d=String(z||'').replace(/\D/g,'');if(d.length<3)return false;const w=normWA(wa);if(!w)return false;return w.includes(d)||w.includes(normWA(d))};
const normNISN=n=>String(n||'').replace(/\D/g,'');
const validNISN=n=>!n||/^\d{10}$/.test(String(n));
/* ---------- data ---------- */
const fromRow=r=>({st:cap(r.status),cara:r.cara,cat:r.catatan||'',jam:jamJkt(r.jam_datang),iso:r.jam_datang,waktu:r.diubah||null,oleh:r.diubah_oleh||null});
async function muatRange(a,b){let from=0,rows=[];for(;;){const d=await dbq(db.from('absensi').select('siswa_id,tanggal,status,cara,catatan,jam_datang,diubah,diubah_oleh').gte('tanggal',a).lte('tanggal',b).order('id').range(from,from+999));rows=rows.concat(d);if(d.length<1000)break;from+=1000}
 Object.keys(S.absen).filter(d=>d>=a&&d<=b).forEach(d=>delete S.absen[d]);rows.forEach(r=>{(S.absen[r.tanggal]=S.absen[r.tanggal]||{})[r.siswa_id]=fromRow(r)})}
const muatBulan=b=>{const p=b.split('-').map(Number);return muatRange(b+'-01',b+'-'+String(new Date(p[0],p[1],0).getDate()).padStart(2,'0'))};
const NS_DEF='KB Nurul Qarnain';
const ns=()=>String((S.set&&S.set.nama_sekolah)||'').trim()||NS_DEF;
const logoOk=v=>typeof v==='string'&&/^data:image\/(png|webp|jpeg);base64,/.test(v);
const logoHtml=()=>logoOk(S.set&&S.set.logo)?'<img alt="Logo sekolah" src="'+esc(S.set.logo)+'">':'🏫';
function terapLogo(){let lg='';const muat=!!(S.set&&('nama_sekolah' in S.set));
 if(muat){lg=logoOk(S.set.logo)?S.set.logo:'';try{lg?localStorage.setItem('logo_sekolah',lg):localStorage.removeItem('logo_sekolah')}catch(e){}}
 else{try{const c=localStorage.getItem('logo_sekolah');lg=logoOk(c)?c:''}catch(e){}}
 document.querySelectorAll('.brand .logo,#lg .logo').forEach(el=>{el.textContent='';el.classList.toggle('ada',!!lg);if(lg){const im=document.createElement('img');im.alt='Logo sekolah';im.src=lg;el.appendChild(im)}else el.textContent='🏫'})}
function terapNama(){terapLogo();const ada=!!(S.set&&S.set.nama_sekolah),n=ada?ns():'Sistem Absensi';
 document.title=ada?n+' - Absensi':'Sistem Absensi';const b=$('#bnm');if(b)b.textContent=n;
 document.querySelectorAll('a.wab').forEach(x=>x.href='https://wa.me/6285117441486?text='+encodeURIComponent('Assalamualaikum, saya butuh bantuan sistem absensi '+n+'.'))}
async function muatDasar(){
 const [k,s,p,lm,lt,pr,nm,ln]=await Promise.all([dbq(db.from('kelas').select('*').eq('aktif',true).order('id')),dbq(db.from('siswa').select('*, siswa_wali(wali(no_wa))').order('nama')),muatGuruData(),dbq(db.from('libur_mingguan').select('hari')),dbq(db.from('libur_tanggal').select('*').order('mulai')),dbq(db.from('pengaturan').select('*').maybeSingle()),muatNomor(),dbq(db.from('libur_nasional').select('tanggal,keterangan').order('tanggal')).catch(e=>{peringatan('Data libur nasional gagal dimuat',e);return[]})]);
 S.kelas=k.map(x=>({id:x.id,nama:x.nama,jam:(x.jam_masuk||'07:30').slice(0,5),wali:x.wali_profil_id||null,urutan:x.urutan==null?null:x.urutan,akhir:!!x.kelas_akhir}));/* urutan kelas: sesuai kolom Urutan (1,2,3...), yang belum diisi di bawah, lalu menurut id; dipakai semua dropdown kelas */S.kelas.sort((x,y)=>(x.urutan==null?999:x.urutan)-(y.urutan==null?999:y.urutan)||x.id-y.id);const kn=id=>(S.kelas.find(x=>x.id===id)||{}).nama||'';
 S.siswa=s.map(x=>({id:x.id,nama:x.nama,pan:x.nama_panggilan,nisn:x.nisn||'',kelas:kn(x.kelas_id),kelas_id:x.kelas_id,aktif:x.aktif,kode_qr:x.kode_qr,kode_scan:x.kode_scan||'',sekolah_id:x.sekolah_id,km:x.kelompok_manual||null,foto_path:x.foto_path||'',tgl:x.tgl_lahir||'',tempat:x.tempat_lahir||'',jk:x.jenis_kelamin||'',alamat:x.alamat||'',masuk:x.tahun_masuk||'',wa:(x.siswa_wali||[]).map(w=>w.wali&&w.wali.no_wa).filter(Boolean)[0]||''}));
 S.guru=p;S.nomor=nm||{};S.nasional=(ln||[]).map(x=>({tgl:x.tanggal,ket:x.keterangan||'Libur nasional'}));S.nasMap=new Map(S.nasional.map(x=>[x.tgl,x.ket]));S.mingguan=lm.map(x=>x.hari);S.libur=lt.map(x=>({id:x.id,tgl:x.mulai,sampai:x.sampai,ket:x.keterangan||'',masuk:x.masuk_kembali||'',kelas:x.kelas_id?kn(x.kelas_id):'',kelas_id:x.kelas_id||null,sumber:x.sumber||''}));await muatBatal();
 S.set=pr||{};S.set.jam=(S.set.alpa_jam||'10:00').slice(0,5);S.set.njam=(S.set.notif_libur_jam||'06:00').slice(0,5);try{await Kartu.siapkanLogo(logoOk(S.set.logo)?S.set.logo:null)}catch(e){console.warn('Logo sekolah belum bisa disiapkan',e)}terapNama()}
let PES_ADA_KOL=true;
const PES_SIARAN=new Set(['laporan','link','tabungan','raport','libur','alpa']);
const pesNorm=x=>{let d=String(x||'').replace(/\D/g,'');if(d.startsWith('0'))d='62'+d.slice(1);return d};
/* balasan otomatis: ada pesan keluar (bukan siaran laporan/link/dll) ke nomor yang sama setelah pesan masuk, dan tidak gagal */
function pesBalasOto(p,kl,rows){const n=pesNorm(p.dari_nomor),t=new Date(p.waktu).getTime();let nx=Infinity;for(const r of rows){if(Number(r.id)===Number(p.id))continue;if(pesNorm(r.dari_nomor)===n){const w=new Date(r.waktu).getTime();if(w>t&&w<nx)nx=w}}let b='',bt=Infinity;for(const r of kl){if(r.jenis!=='balasan'||pesNorm(r.nomor)!==n||r.status==='gagal')continue;const d=new Date(r.dibuat).getTime();if(d>t&&d<=nx&&d<bt){bt=d;b=r.dibuat}}return b}
const muatPesan=async()=>{const rows=await dbq(db.from('pesan_masuk').select('*').order('waktu',{ascending:false}).limit(100));PES_ADA_KOL=!rows.length||('sudah_dibalas' in rows[0]);let kl=[];try{const t0=rows.length?rows.reduce((m,r)=>r.waktu<m?r.waktu:m,rows[0].waktu):null;let q=db.from('kirim_log').select('nomor,jenis,status,dibuat').eq('sekolah_id',SEK).or('jenis.is.null,jenis.not.in.('+[...PES_SIARAN].join(',')+')');if(t0)q=q.gte('dibuat',t0);kl=await dbq(q.order('dibuat',{ascending:false}).limit(1000))||[]}catch(e){}
 S.pesan=rows.map(p=>({id:p.id,waktu:fmt(new Date(p.waktu).toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'}))+' '+jamJkt(p.waktu),dari:p.dari_nomor,isi:p.isi,hasil:p.hasil||'',cek:p.perlu_dicek,dibalas:!!p.sudah_dibalas,dibalasPada:p.dibalas_pada||'',auto:pesBalasOto(p,kl,rows)}))};
const muatGuruData=async()=>{const k=await dbq(db.from('keanggotaan').select('role,aktif,profil(id,nama,username,role,aktif,nip,dibuat)').eq('sekolah_id',SEK));return k.filter(x=>x.profil).map(x=>({...x.profil,role:x.role,aktif:x.aktif})).sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'))};
async function muatNomor(){const r=await dbq(db.rpc('nomor_wa_guru',{p_sekolah:SEK}));const m={};(r||[]).forEach(x=>{m[x.profil_id]=x.no_wa||''});return m}
const muatProfil=async()=>{const [g,n]=await Promise.all([muatGuruData(),muatNomor()]);S.guru=g;S.nomor=n};
let RHS=null,penerimaTesId='',izinKelola=null,izinExp=0;
let TTD_GURU={},TTD_GURU_SEK=null,TTD_GURU_LOADING=false,TTD_GURU_DEV_LOADING=false,TTD_GURU_DEV_DONE=false,TTD_PROFIL=null,TTD_PROFIL_USER=null;
async function apiPengaturan(body){const {data:{session}}=await db.auth.getSession();if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');const r=await fetch('/api/pengaturan',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:CFG_SID||SEK,...body})});const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===404)throw new Error('API /api/pengaturan tidak ditemukan (404). Pastikan file api/pengaturan.js sudah di-deploy');throw new Error(j.error||j.message||('Gagal ('+r.status+')'))}return j}
async function muatRahasia(){try{RHS=await apiPengaturan({aksi:'baca'})}catch(e){RHS={error:e.message||String(e)}}sinkronNomorKepala()}
/* nomor Kepala Sekolah di Pengaturan = nomor di Profil Saya Kepala Sekolah */
const nomorKepalaProfil=()=>{const k=(S.guru||[]).find(g=>g.role==='kepala_sekolah'&&g.aktif);const n=k&&(S.nomor||{})[k.id];return String(n||'').trim()?n:''};
const _sinkNK={};
async function sinkronNomorKepala(){try{if(!adalahKepala()||CFG_SID||!RHS||RHS.error)return;const n=nomorKepalaProfil();if(!n)return;
 if(normWA(RHS.nomor_kepala||'')===normWA(n)||_sinkNK[SEK]===n)return;_sinkNK[SEK]=n;
 await apiPengaturan({aksi:'simpan',nomor_kepala:fmtWA(n)});RHS=await apiPengaturan({aksi:'baca'});if(view==='pengaturan'||view==='dashboard')renderV()}catch(e){console.warn('Sinkron nomor kepala sekolah gagal',e)}}
const LOAD={profil:p=>role==='Developer'?devPastikan(devButuh(),p):muatProfilSaya(),dashboard:p=>role==='Developer'?devPastikan(devButuh(),p):Promise.all([muatRange(TODAY,TODAY),muatStatusProfil(),muatRingDash()]).then(r=>{_dashT=Date.now();return r}),absensi:()=>muatRange(attDate,attDate),scan:()=>{muatLib('scan',true).catch(()=>{});return muatRange(TODAY,TODAY)},rekap:()=>muatBulan(bulan),laporanortu:()=>muatBulan(lb),guru:muatProfil,pesan:muatPesan,pengaturan:async()=>{try{const r=await dbq(db.from('pengaturan').select('push_piket_diizinkan,push_absensi_diizinkan,push_tabungan_diizinkan,push_hafalan_diizinkan').maybeSingle());if(r)Object.assign(S.set,r)}catch(e){}if(RHS===null)muatRahasia().then(()=>{if(view==='pengaturan')renderV()})},developer:p=>devPastikan(devButuh(),p),tabungan:muatTabungan,kelola:()=>muatKelola(),alumni:()=>muatAlumni(),piket:()=>muatPiket(),hafalan:()=>muatHafalan(),penilaian:()=>pnMuat()};
/* ---------- libur ---------- */
const batalAda=(d,k)=>{const b=S.batal;if(!b||!b.size)return false;if(b.has(d+'|0'))return true;const kl=S.kelas.find(x=>x.nama===k);return !!kl&&b.has(d+'|'+kl.id)};
async function muatBatal(){S.batal=new Set();try{const r=await dbq(db.from('libur_batal').select('tanggal,kelas_id'));(r||[]).forEach(x=>S.batal.add(x.tanggal+'|'+x.kelas_id))}catch(e){peringatan('Data pembatalan libur gagal dimuat',e)}}
async function catatBatal(d,k){try{const semua=!k||k==='*',kl=semua?null:S.kelas.find(x=>x.nama===k);if(!semua&&!kl)return;const kid=semua?0:kl.id;await dbq(db.rpc('batalkan_libur',{p_sekolah:SEK,p_tanggal:d,p_kelas:kid}));(S.batal=S.batal||new Set()).add(d+'|'+kid)}catch(e){console.warn('Pembatalan libur belum tersimpan:',e)}}
