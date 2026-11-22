/* ---------- developer ---------- */
async function runChecks(){const R=[],add=(l,n,d)=>R.push([l,n,d]),as=act(),nama=a=>a.map(s=>s.pan).join(', ');
 let t0=performance.now();try{await dbq(db.from('pengaturan').select('id').limit(1));add('ok','Koneksi Supabase','Tersambung ('+Math.round(performance.now()-t0)+' ms)')}catch(e){add('err','Koneksi Supabase',e.message)}
 add('ok','Sesi login',meNama+' ('+role+')');
 for(const t of ['kelas','siswa','wali','siswa_wali','absensi','profil','pengaturan','libur_mingguan','libur_tanggal','libur_nasional','laporan_ortu','pesan_masuk','percakapan_tertunda']){try{const r=await db.from(t).select(t==='profil'?'id':'*',{count:'exact',head:true});if(r.error)throw r.error;add('ok','Tabel '+t,r.count+' baris')}catch(e){add('err','Tabel '+t,e.message)}}
 for(const [n,u,k] of [['Webhook Fonnte','/api/webhook','aktif'],['API guru','/api/guru','aktif']]){try{const t=await (await fetch(u)).text();add(t.toLowerCase().includes(k)?'ok':'warn',n,t.toLowerCase().includes(k)?'Aktif':'Tidak merespons dengan benar')}catch(e){add('err',n,'Tidak bisa dihubungi')}}
 const sec=location.protocol==='https:'||/^(localhost|127\.0\.0\.1)$/.test(location.hostname),cam=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);add(sec&&cam?'ok':'warn','Kamera untuk scan',sec&&cam?'HTTPS dan kamera tersedia':'Kamera butuh HTTPS dan browser yang mendukung');
 try{await muatLib(['xlsx','exceljs','pdf','scan'],true)}catch(e){}
  add(typeof XLSX!=='undefined'&&typeof ExcelJS!=='undefined'&&window.jspdf&&window.Html5Qrcode&&window.qrcode?'ok':'warn','Pustaka XLSX, PDF, QR',typeof XLSX!=='undefined'&&typeof ExcelJS!=='undefined'&&window.jspdf&&window.Html5Qrcode&&window.qrcode?'Semua termuat':'Ada yang belum termuat (butuh internet)');
 const tz=Intl.DateTimeFormat().resolvedOptions().timeZone;add(/Jakarta|Makassar|Jayapura|Pontianak/.test(tz)?'ok':'warn','Zona waktu perangkat',tz);
 const bk=as.filter(s=>!S.kelas.some(k=>k.nama===s.kelas));add(bk.length?'err':'ok','Kelas siswa',bk.length?'Kelas tidak dikenal: '+nama(bk):'Semua siswa aktif punya kelas');
 const nw=as.filter(s=>!s.wa);add(nw.length?'warn':'ok','Nomor WhatsApp orang tua',nw.length?nw.length+' anak belum punya nomor: '+nama(nw):'Semua siswa aktif punya nomor');
 const bf=as.filter(s=>s.wa&&!/^628\d{8,12}$/.test(s.wa));add(bf.length?'warn':'ok','Format nomor',bf.length?'Bukan format 628xxx: '+nama(bf):'Semua nomor berformat 628xxx');
 const g={};as.forEach(s=>{if(s.wa)(g[s.wa]=g[s.wa]||[]).push(s)});const kb=[];Object.values(g).forEach(a=>{const c={};a.forEach(s=>{const n=s.pan.toLowerCase();c[n]=(c[n]||0)+1});a.forEach(s=>{if(c[s.pan.toLowerCase()]>1)kb.push(s)})});add(kb.length?'err':'ok','Panggilan kembar dalam satu nomor',kb.length?'Balasan izin WhatsApp jadi ambigu: '+nama(kb):'Tidak ada');
 const ks=S.guru.filter(x=>x.role==='kepala_sekolah'&&x.aktif).length;add(ks?'ok':'err','Akun Kepala Sekolah',ks?ks+' akun aktif':'Tidak ada Kepala Sekolah aktif');
 add(S.mingguan.length?'ok':'info','Libur mingguan',S.mingguan.length?S.mingguan.map(d=>HR[d]).join(', '):'Belum ada hari libur mingguan');add('info','Alpa otomatis',S.set.alpa_aktif?'Aktif, jam '+S.set.jam:'Dimatikan');
 const bl=as.filter(s=>dayStat(s,TODAY)==='Belum');add('info','Absensi hari ini',bl.length?bl.length+' anak belum absen':'Semua sudah tercatat');
 return R}
async function runChecksDev(){const R=[],add=(l,n,d)=>R.push([l,n,d]);
 let t0=performance.now();try{await dbq(db.from('sekolah').select('id').limit(1));add('ok','Koneksi Supabase','Tersambung ('+Math.round(performance.now()-t0)+' ms)')}catch(e){add('err','Koneksi Supabase',e.message)}
 add('ok','Sesi login',meNama+' ('+role+')');
 for(const t of ['sekolah','keanggotaan','profil','kelas','siswa','wali','siswa_wali','absensi','pengaturan','libur_mingguan','libur_tanggal','libur_nasional','laporan_ortu','pesan_masuk','percakapan_tertunda']){try{const r=await db.from(t).select(t==='profil'?'id':'*',{count:'exact',head:true});if(r.error)throw r.error;add('ok','Tabel '+t+' (semua sekolah)',r.count+' baris')}catch(e){add('err','Tabel '+t,e.message)}}
 for(const [n,u] of [['Webhook Fonnte','/api/webhook'],['API guru','/api/guru'],['API pengaturan','/api/pengaturan'],['API publik','/api/publik'],['API developer','/api/developer'],['API kirim','/api/kirim']]){try{const t=await (await fetch(u)).text();add(t.toLowerCase().includes('aktif')?'ok':'warn',n,t.toLowerCase().includes('aktif')?'Aktif':'Tidak merespons dengan benar')}catch(e){add('err',n,'Tidak bisa dihubungi')}}
 const sec=location.protocol==='https:'||/^(localhost|127\.0\.0\.1)$/.test(location.hostname);add(sec?'ok':'warn','HTTPS',sec?'Aman':'Kamera dan login butuh HTTPS');
 add((S.devPend||[]).length+(S.devNomor||[]).length?'info':'ok','Antrean persetujuan',((S.devPend||[]).length+(S.devNomor||[]).length)+' menunggu');
 return R}
const LV={ok:['Hadir','✓ Baik'],warn:['Terlambat','⚠ Perhatian'],err:['Sakit','✗ Masalah'],info:['Izin','ℹ Info']};
let devTab='ringkas';
const MB=()=>{try{return !!sessionStorage.getItem('mode_bantuan')}catch(e){return false}};
const hBT=()=>{try{const m=JSON.parse(sessionStorage.getItem('mode_bantuan')||'null'),t=m&&m.bantuan;return t?{'X-Bantuan':t}:{}}catch(e){return {}}};
async function apiDev(body){const {data:{session}}=await db.auth.getSession();if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');const r=await fetch('/api/developer',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===404)throw new Error('API /api/developer tidak ditemukan (404). Pastikan file api/developer.js sudah di-deploy');throw new Error(j.error||('Gagal ('+r.status+')'))}return j}
/* Data Developer dimuat per dataset: tiap tab hanya membaca yang dibutuhkan, dan dipakai bersama selama masih segar (2 menit) */
const ERR=e=>({error:(e&&e.message)||String(e)});
const DEVSET={
 guru:async()=>{S.devGuru=await dbq(db.rpc('developer_guru'))},
 sek:async()=>{S.devSek=await dbq(db.rpc('developer_sekolah'))},
 pend:async()=>{S.devPend=await dbq(db.rpc('developer_pendaftaran'))},
 nomor:async()=>{S.devNomor=await dbq(db.rpc('developer_permintaan_nomor'))},
 log:async()=>{S.devLog=await dbq(db.rpc('developer_log',{p_batas:100}))},
 cron:async()=>{S.devCron=await dbq(db.rpc('developer_cron_daftar')).catch(ERR)},
 kirim:async()=>{const hasil=await dbq(db.rpc('developer_kirim_log',{p_batas:1000,p_sekolah:devKirimSek?Number(devKirimSek):null})).catch(ERR);S.devKirim=hasil;try{let q=_dbFrom('pesan_masuk').select('id,sekolah_id,dari_nomor,isi,hasil,perlu_dicek,waktu,sudah_dibalas,dibalas_pada').order('waktu',{ascending:false});if(devKirimSek)q=q.eq('sekolah_id',Number(devKirimSek));S.devPesanMasuk=await dbq(q.limit(500))||[];S.devPesanMasukErr=''}catch(e){S.devPesanMasuk=[];S.devPesanMasukErr=e.message||String(e)}} ,
 simpan:async()=>{S.devSimpan=await dbq(db.from('pemakaian_db').select('*').maybeSingle()).then(r=>r||{error:'Data penyimpanan belum dihitung'}).catch(ERR)},
 storage:async()=>{S.devStorage=await apiDev({aksi:'pemantauan_storage'}).catch(ERR)},
 ai:async()=>{S.devAI=await apiDev({aksi:'pemantauan_ai'}).catch(ERR)},
 fonnte:async()=>{S.devFonnte=await apiDev({aksi:'pemantauan_fonnte'}).catch(ERR)},
 alpa:async()=>{S.devAlpa=await dbq(db.rpc('developer_alpa')).catch(ERR)},
 nl:async()=>{S.devNL=await dbq(db.rpc('developer_notif_libur')).catch(ERR)},
 np:async()=>{S.devNP=await dbq(db.rpc('developer_notif_piket')).catch(ERR)},
 ns:async()=>{S.devNS=await dbq(db.rpc('developer_notif_siswa')).catch(ERR)},
 pengingat:async()=>{S.devPengingat=await dbq(db.rpc('developer_pengingat_izin_sakit')).catch(ERR)},
 nj:async()=>{S.devNSJam=await dbq(db.rpc('developer_jam_notif_siswa')).catch(ERR)},
 hp:async()=>{S.devHP=await dbq(db.rpc('developer_hp_daftar')).catch(ERR)},
 push:async()=>{S.devPush=await dbq(db.rpc('developer_push_daftar')).catch(()=>null)},
 alring:async()=>{S.devAlRing=await dbq(db.rpc('developer_alumni_ringkas')).catch(()=>null);S.devAlTh='';S.devAlList=[]},
 kal:async()=>{await muatKalNas().catch(()=>{})},
 profil:async()=>{await muatProfilSaya()}
};
const DEV_BUTUH={ai:['ai'],fonnte:['fonnte'],dashboard:['alpa','guru','kal','nl','nomor','np','ns','pend','sek','profil'],setuju:['guru','nomor','pend','sek'],sekolah:['push','sek','guru'],guru:['guru','sek'],simpan:['simpan','storage'],alpa:['alpa'],liburnotif:['nl'],piketnotif:['np'],siswanotif:['nj','ns'],pengingat:['pengingat'],perangkat:['hp'],hapus:['alring','log','sek','cron'],kirim:['kirim','sek'],log:['log'],sistem:[],kalender:['kal']};
const DEVT={};
function devButuh(){const t=devTab==='ringkas'?'setuju':devTab;
 const b=view==='developer'?(DEV_BUTUH[t]||[]):view==='dashboard'?DEV_BUTUH.dashboard:view==='profil'?['profil']:[];
 return [...new Set(b.concat(['nomor','pend']))]}
const devSegar=k=>{const e=DEVT[k];return !!e&&e.v===cmVer&&Date.now()-e.t<CM_TTL};
async function devPastikan(keys,paksa){const perlu=keys.filter(k=>paksa||!devSegar(k));if(!perlu.length)return false;
 const v0=cmVer;await Promise.all(perlu.map(async k=>{await DEVSET[k]();DEVT[k]={t:Date.now(),v:v0}}));return true}
async function muatDev(){await devPastikan(devButuh(),true)}
const DEVTAB=[['ringkas','📊 Ringkasan'],['setuju','✅ Persetujuan'],['sekolah','🏫 Sekolah'],['guru','👥 Guru'],['simpan','💾 Penyimpanan'],['ai','🤖 Pemantauan AI'],['fonnte','📶 Pemantauan Kuota Fonnte'],['alpa','⏰ Alpa Otomatis'],['liburnotif','🔔 Notifikasi Libur'],['piketnotif','📲 Notifikasi Piket'],['siswanotif','📲 Notifikasi Siswa'],['pengingat','🔔 Pengingat Izin/Sakit'],['perangkat','📱 HP Terdaftar'],['hapus','🗑 Hapus Data'],['kirim','💬 Pesan WA'],['log','📜 Log'],['sistem','🩺 Sistem']];
function setDevTab(t){devBuka(t)}
function devBuka(k){drw(0);kalReset();devTab=k;if(k==='perangkat'){HPF.mode=false;HPF.sel.clear()}if(view==='developer'){const b=devButuh();if(b.every(devSegar)){renderAll();scrollTo(0,0);kedipHalaman()}else guard(async()=>{await devPastikan(b);renderAll();scrollTo(0,0);kedipHalaman()})}else go('developer').then(kedipHalaman)}
async function muatKalNas(){S.devKal=await dbq(db.from('libur_nasional').select('tanggal,keterangan').order('tanggal'))}
function bukaKalenderNas(){drw(0);kalReset();devTab='kalender';if(view!=='developer')return go('developer').then(kedipHalaman);guard(async()=>{await devPastikan(devButuh());renderAll();scrollTo(0,0);kedipHalaman()})}
let kalMode=false,kalSel=new Set();
function kalReset(){kalMode=false;kalSel.clear()}
function kalRender(){const y=window.scrollY;renderV();window.scrollTo(0,y)}
function kalMulaiHapus(){kalMode=true;kalSel.clear();renderV()}
function kalBatal(){kalReset();renderV()}
function kalCekUI(){const l=S.devKal||[],r=cekBaris('#v .ckk');r.forEach(x=>x.checked=kalSel.has(x.dataset.t));cekBaris('#v .ckkb').forEach(x=>{const ts=l.filter(q=>q.tanggal.slice(0,7)===x.dataset.b);x.checked=ts.length>0&&ts.every(q=>kalSel.has(q.tanggal))});const a=document.getElementById('kalCekAll');if(a)a.checked=l.length>0&&l.every(q=>kalSel.has(q.tanggal));cekBtn('kalHapusBtn',kalSel.size,'🗑 Hapus terpilih')}
function kalPilih(t,on){on?kalSel.add(t):kalSel.delete(t);kalCekUI()}
function kalPilihSemua(on){(S.devKal||[]).forEach(r=>on?kalSel.add(r.tanggal):kalSel.delete(r.tanggal));kalCekUI()}
function kalPilihBulan(b,on){(S.devKal||[]).filter(r=>r.tanggal.slice(0,7)===b).forEach(r=>on?kalSel.add(r.tanggal):kalSel.delete(r.tanggal));kalCekUI()}
async function kalHapusTerpilih(){
 const ada=new Set((S.devKal||[]).map(r=>r.tanggal)),ts=[...kalSel].filter(t=>ada.has(t)).sort();
 if(!ts.length)return;
 const semua=ts.length===ada.size,daftar=ts.slice(0,8).map(t=>'- '+fmt(t)).join('\n')+(ts.length>8?'\n... dan '+(ts.length-8)+' tanggal lainnya':'');
 if(!await konfirmasi('Hapus '+ts.length+' libur nasional terpilih'+(semua?' (SELURUH daftar)':'')+'?\n\n'+daftar+'\n\nBerlaku untuk semua sekolah dan tidak bisa dikembalikan.',{judul:'Hapus libur nasional terpilih',ya:'Hapus '+ts.length+' tanggal',bahaya:1}))return;
 guard(async()=>{let ok=0;const gagal=[];
  try{await dbq(db.rpc('libur_nasional_hapus_batch',{p_tanggal:ts}));ok=ts.length}
  catch(e){
   if(!/Could not find the function|PGRST202|does not exist/i.test(String((e&&e.message)||e)))throw e;
   for(let i=0;i<ts.length;i+=5){const bagian=ts.slice(i,i+5),hs=await Promise.allSettled(bagian.map(t=>dbq(db.rpc('libur_nasional_hapus',{p_tanggal:t}))));hs.forEach((h,k)=>{if(h.status==='fulfilled')ok++;else gagal.push(bagian[k])})}
  }
  kalSel.clear();if(gagal.length)gagal.forEach(t=>kalSel.add(t));else kalMode=false;
  await muatKalNas();renderV();
  if(gagal.length)toast(ok+' dihapus, '+gagal.length+' gagal. Tanggal yang gagal tetap tercentang, coba lagi.',false);else toast(ok+' libur nasional dihapus')})}
function devKalender(){
 const rows=S.devKal||[],n=kalSel.size,semua=rows.length>0&&rows.every(r=>kalSel.has(r.tanggal));let last='';
 const bln={};rows.forEach(r=>{const b=r.tanggal.slice(0,7);(bln[b]=bln[b]||[]).push(r.tanggal)});
 const body=rows.map((r,i)=>{const bl=r.tanggal.slice(0,7);let h='';if(bl!==last){last=bl;const pb=kalMode?`<input type="checkbox" class="ckkb" data-b="${bl}" ${bln[bl].every(t=>kalSel.has(t))?'checked':''} onchange="kalPilihBulan('${bl}',this.checked)" style="margin-right:8px">`:'';h=`<tr><td colspan="${kalMode?5:4}" style="background:#eef7f1;font-weight:800">${pb}${fmtB(bl)}</td></tr>`}
  const cb=kalMode?`<td><input type="checkbox" class="ckk" data-t="${r.tanggal}" ${kalSel.has(r.tanggal)?'checked':''} onchange="kalPilih('${r.tanggal}',this.checked)"></td>`:'';
  const aksi=kalMode?'<span class="mu">-</span>':`<button class="btn soft sm" onclick="ubahLiburNas('${r.tanggal}')">Ubah</button> <button class="btn sm danger" onclick="hapusLiburNas('${r.tanggal}')">Hapus</button>`;
  return h+`<tr>${cb}<td>${i+1}</td><td>${fmt(r.tanggal)} <span class="mu">${HR[wd(r.tanggal)]}</span></td><td>${esc(r.keterangan||'')}</td><td>${aksi}</td></tr>`}).join('');
 const head=kalMode?['<input type="checkbox" '+(semua?'checked':'')+' id="kalCekAll" onchange="kalPilihSemua(this.checked)">','No','Tanggal','Keterangan','Aksi']:['No','Tanggal','Keterangan','Aksi'];
 const aksiHead=kalMode
  ?`<button id="kalHapusBtn" class="btn danger sm" ${n?'':'disabled'} onclick="kalHapusTerpilih()">🗑 Hapus terpilih (${n})</button> <button class="btn soft sm" onclick="kalBatal()">✖ Batal</button>`
  :`<button class="btn success sm" onclick="tambahLiburNas()">＋ Libur nasional</button> <button class="btn soft sm" onclick="unduhTemplateLibur(this)">⬇ Template (XLSX)</button> <button class="btn orange sm" onclick="document.getElementById('imporLiburFile').click()">⬆ Impor (XLSX)</button> <button class="btn danger sm" ${rows.length?'':'disabled'} onclick="kalMulaiHapus()">🗑 Hapus banyak</button>`;
 const bar=kalMode?`<div class="tb" style="margin-bottom:8px"><button class="btn soft sm" onclick="kalPilihSemua(${!semua})">${semua?'☐ Kosongkan pilihan':'☑ Pilih semua ('+rows.length+')'}</button><span class="mu">${n} dari ${rows.length} tanggal dipilih</span></div>`:'';
 return `<div class="panel"><div class="ph">📅 Kalender Libur Nasional <span class="mu">${rows.length} tanggal</span> ${aksiHead}<input type="file" id="imporLiburFile" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" hidden onchange="imporLiburDipilih(this)"></div><div class="pb"><div class="note">Berlaku untuk semua sekolah dan semua kelas. Impor XLSX mengganti seluruh daftar ini. Tombol Ubah dan Hapus mengubah satu tanggal; tombol Hapus banyak dipakai untuk mencentang beberapa tanggal (atau semuanya) lalu menghapusnya sekaligus. Tanggal yang sudah lewat dihapus otomatis setiap tengah malam. Perubahan untuk hari ini baru tercermin di absensi pada penyegaran libur berikutnya.</div>${bar}${tab(head,body,'Belum ada libur nasional. Tambah satu per satu atau impor dari XLSX.')}</div></div>`}
function tambahLiburNas(){form('Tambah Libur Nasional',[{k:'tgl',l:'Mulai tanggal',t:'date',v:TODAY},{k:'sampai',l:'Sampai tanggal (kosongkan bila satu hari)',t:'date'},{k:'ket',l:'Keterangan (contoh: Cuti bersama Idulfitri)'}],async v=>{if(!v.tgl)throw new Error('Pilih tanggal mulai');if(v.sampai&&v.sampai<v.tgl)throw new Error('Tanggal akhir sebelum tanggal mulai');const r=await dbq(db.rpc('libur_nasional_simpan',{p_mulai:v.tgl,p_sampai:v.sampai||v.tgl,p_keterangan:v.ket}));await muatKalNas();renderV();toast('Tersimpan: tambah '+r.tambah+', ubah '+r.ubah)})}
function ubahLiburNas(t){const r=(S.devKal||[]).find(x=>x.tanggal===t);if(!r)return;form('Ubah Libur Nasional',[{k:'tgl',l:'Tanggal',t:'date',v:t},{k:'ket',l:'Keterangan',v:r.keterangan||''}],async v=>{if(!v.tgl)throw new Error('Pilih tanggal');await dbq(db.rpc('libur_nasional_ubah',{p_lama:t,p_baru:v.tgl,p_keterangan:v.ket}));await muatKalNas();renderV();toast('Libur nasional diperbarui')})}
async function hapusLiburNas(t){if(!await konfirmasi('Hapus libur nasional '+fmt(t)+'?',{judul:'Hapus libur nasional',ya:'Hapus',bahaya:1}))return;guard(async()=>{await dbq(db.rpc('libur_nasional_hapus',{p_tanggal:t}));await muatKalNas();renderV();toast('Libur nasional dihapus')})}
function segarDev(){drw(0);guard(async()=>{cmKosong();await muatDev();renderV();toast('Data diperbarui')})}

function devSegarkanPengingat() {
  guard(async () => {
    S.devPengingat = await dbq(db.rpc('developer_pengingat_izin_sakit')).catch(ERR);
    DEVT.pengingat = { t: Date.now(), v: cmVer };
    renderV();
    toast('Pemantauan pengingat diperbarui');
  });
}
async function ujiPengingatGisella() {
  if (!await konfirmasi('Kirim notifikasi push dan WhatsApp sungguhan ke wali Gisella (PAUD Darul Istiqomah, kelas 3 C)? Pesan memakai format pengingat asli. Catatan absensi tidak diubah. Untuk uji ini, WhatsApp dikirim langsung meskipun sistem normal akan melewati pengiriman bila absensi tanggal tindak lanjut sudah tercatat. Uji hanya dapat dijalankan satu kali.', { judul: 'Uji pengingat izin/sakit', ya: 'Kirim kedua notifikasi', ikon: '📲' })) return;
  guard(async () => {
    const j = await apiDev({ aksi: 'uji_pengingat_izin_sakit_gisella' });
    const h = j.hasil || {};
    const p = h.push || {}, w = h.whatsapp || {};
    S.devPengingat = await dbq(db.rpc('developer_pengingat_izin_sakit')).catch(ERR);
    DEVT.pengingat = { t: Date.now(), v: cmVer };
    toast('Uji Gisella selesai · Push ' + (p.terkirim || 0) + '/' + (p.tujuan || 0) + ' · WhatsApp ' + (w.terkirim || 0) + '/' + (w.tujuan || 0));
    renderV();
  });
}
function devPengingat() {
  const d = S.devPengingat;
  if (!d) return '<div class="panel"><div class="ph">🔔 Pemantauan Pengingat Izin/Sakit</div><div class="pb"><div class="note">⏳ Memuat pemantauan...</div></div></div>';
  if (d.error) return '<div class="panel"><div class="ph">🔔 Pemantauan Pengingat Izin/Sakit</div><div class="pb"><div class="note">Gagal memuat data: ' + esc(d.error) + '</div><button class="btn success sm" onclick="devSegarkanPengingat()">↻ Coba lagi</button></div></div>';
  const r = d.ringkasan || {};
  const angka = v => Number(v || 0).toLocaleString('id-ID');
  const waktu = v => v ? new Date(v).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-';
  const tgl = v => v ? fmt(v) : '-';
  const st = v => {
    const k = { berhasil: 'Hadir', selesai: 'Hadir', dipanggil: 'Belum', menunggu: 'Belum', diproses: 'Belum', gagal: 'Alpa', sebagian: 'Izin', dilewati: 'Libur', tidak_ada: 'Belum' };
    const l = { berhasil: 'Berhasil', selesai: 'Selesai', dipanggil: 'Dipanggil', menunggu: 'Menunggu', diproses: 'Diproses', gagal: 'Gagal', sebagian: 'Sebagian', dilewati: 'Dilewati', tidak_ada: 'Tidak ada target' };
    const x = String(v || '-');
    return '<span class="badge ' + (k[x] || 'Belum') + '">' + esc(l[x] || x) + '</span>';
  };
  const kartu = (label, nilai, sub) => '<div class="stat"><b>' + angka(nilai) + '</b><span class="mu">' + label + '</span>' + (sub ? '<div class="mu">' + sub + '</div>' : '') + '</div>';
  const riwayat = Array.isArray(d.riwayat) ? d.riwayat : [];
  const eksekusi = Array.isArray(d.eksekusi) ? d.eksekusi : [];
  const rows = riwayat.map(x => '<tr><td>' + waktu(x.dibuat) + '</td><td>' + esc(x.sekolah || '-') + '</td><td><b>' + esc(x.siswa || '-') + '</b></td><td>' + esc(String(x.status_laporan || '').toUpperCase()) + '<div class="mu">' + esc(x.sumber || '') + '</div></td><td>' + tgl(x.tanggal_mulai) + ' – ' + tgl(x.tanggal_akhir) + '<div class="mu">' + angka(x.jumlah_hari) + ' hari · tindak lanjut ' + tgl(x.tanggal_tindak_lanjut) + '</div></td><td>' + st(x.push_status) + '<div class="mu">' + angka(x.push_dikirim) + '/' + angka(x.push_jumlah_tujuan) + ' HP</div></td><td>' + st(x.wa_status) + '<div class="mu">' + angka(x.wa_dikirim) + '/' + angka(x.wa_jumlah_tujuan) + ' nomor</div></td><td class="mu">' + esc(x.push_error || x.wa_error || '-') + '</td></tr>').join('');
  const erows = eksekusi.map(x => '<tr><td>' + waktu(x.mulai_at) + '</td><td>' + (x.tahap === 'push_hari_terakhir' ? 'Push 16.00' : 'WhatsApp 08.00') + '</td><td>' + st(x.status) + '</td><td>' + angka(x.jumlah_diperiksa) + '</td><td>' + angka(x.jumlah_diproses) + '</td><td>' + angka(x.jumlah_berhasil) + '</td><td>' + angka(x.jumlah_gagal) + '</td><td>' + angka(x.jumlah_dilewati) + '</td><td class="mu">' + esc(x.error || '-') + '</td></tr>').join('');
  return '<div class="panel"><div class="ph"><span>🔔 Pemantauan Pengingat Izin/Sakit</span><button class="btn soft sm" onclick="devSegarkanPengingat()">↻ Muat ulang</button></div><div class="pb">' +
    '<div class="note">Pemantauan khusus Developer · Riwayat detail disimpan maksimal 7 hari. Push mulai pukul 16.00 WIB dan WhatsApp mulai pukul 08.00 WIB pada hari sekolah berikutnya. Jika antrean banyak, sistem memproses bertahap setiap 5 menit (push) atau 2 menit (WhatsApp); setiap laporan tetap hanya satu kali. Tidak menampilkan nomor WhatsApp orang tua.</div><div class="note" style="margin-top:10px">Pengujian langsung satu kali untuk Gisella · pesan push dan WhatsApp dikirim sungguhan ke wali yang terhubung. Data absensi tidak disentuh. WhatsApp uji melewati pemeriksaan absensi tanggal tindak lanjut agar bentuk pesan asli dapat dilihat.</div><button class="btn success" style="margin:8px 0 14px" onclick="ujiPengingatGisella()">📲 Kirim uji push + WhatsApp ke Gisella</button>' +
    '<div class="stats">' +
    kartu('Laporan multi-hari', r.total) +
    kartu('Push berhasil', r.push_berhasil, 'Menunggu: ' + angka(r.push_menunggu)) +
    kartu('WhatsApp diterima Fonnte', r.wa_berhasil, 'Sebagian: ' + angka(r.wa_sebagian)) +
    kartu('Kegagalan', Number(r.push_gagal || 0) + Number(r.wa_gagal || 0)) +
    '</div><div class="ph" style="padding-left:0;padding-right:0">Riwayat per siswa · 7 hari terakhir</div>' +
    (rows ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Sekolah</th><th>Siswa</th><th>Laporan</th><th>Periode</th><th>Push</th><th>WhatsApp</th><th>Keterangan</th></tr></thead><tbody>' + rows + '</tbody></table></div>' : '<div class="note">Belum ada pengingat yang tercatat dalam 7 hari terakhir.</div>') +
    '<div class="ph" style="padding-left:0;padding-right:0">Riwayat eksekusi terjadwal</div>' +
    (erows ? '<div class="tw"><table><thead><tr><th>Waktu</th><th>Tahap</th><th>Hasil</th><th>Diperiksa</th><th>Diproses</th><th>Berhasil</th><th>Gagal</th><th>Dilewati</th><th>Keterangan</th></tr></thead><tbody>' + erows + '</tbody></table></div>' : '<div class="note">Belum ada riwayat eksekusi.</div>') +
    '</div></div>';
}

V.developer=()=>{if(devTab==='ringkas')devTab='setuju';
 return {setuju:devSetuju,sekolah:devSekolah,guru:devGuru,simpan:devPenyimpanan,ai:devPemantauanAI,fonnte:devFonnte,alpa:devAlpa,liburnotif:devNotifLibur,piketnotif:devNotifPiket,siswanotif:devNotifSiswa,perangkat:devPerangkat,pengingat:devPengingat,hapus:devHapus,kirim:devKirim,log:devLog,sistem:devSistem,kalender:devKalender}[devTab]()};
function renderNavDev(){
 const nm=(Array.isArray(S.devPend)?S.devPend:[]).length+(Array.isArray(S.devNomor)?S.devNomor:[]).length,bd=nm?` <span class="badge Belum">${nm}</span>`:'';
 const itm=(on,fn,ic,lb,ex)=>`<button class="${on?'on':''}" onclick="${fn}"><span>${ic}</span>${lb}${ex||''}</button>`,dv=k=>view==='developer'&&devTab===k;
 let h=itm(view==='dashboard',"go('dashboard')",'⌂','Dashboard');
 DEVTAB.filter(x=>x[0]!=='ringkas').forEach(([k,l])=>{const n=l.indexOf(' ');h+=itm(dv(k),`devBuka('${k}')`,l.slice(0,n),l.slice(n+1),k==='setuju'?bd:'')});
 h+=itm(dv('kalender'),'bukaKalenderNas()','📅','Kalender Nasional');
 h+=itm(view==='profil',"go('profil')",'👤','Profil Saya');
 h+=itm(false,'segarDev()','↻','Muat Ulang');
 $('#sn').innerHTML=h;$('#dn').innerHTML=h;
 $('#bn').innerHTML=itm(view==='dashboard',"go('dashboard')",'⌂','Dashboard')+itm(dv('setuju'),"devBuka('setuju')",'✅','Persetujuan',bd)+itm(dv('sekolah'),"devBuka('sekolah')",'🏫','Sekolah')+itm(dv('simpan'),"devBuka('simpan')",'💾','Penyimpanan')+`<button onclick="drw(1)"><span>☰</span>Menu</button>`}
function devNotif(){
 const L=[],pd=(Array.isArray(S.devPend)?S.devPend:[]).length,pn=(Array.isArray(S.devNomor)?S.devNomor:[]).length,al=S.devAlpa;
 const daftarAlpa=Array.isArray(al)?al:[],daftarLibur=Array.isArray(S.devNL)?S.devNL:[];
 const daftarKal=Array.isArray(S.devKal)?S.devKal:[];
 const kartu=(k,ic,j,isi,tb)=>`<div class="dnt dnt-${k}"><i>${ic}</i><div class="dnt-n"><b>${j}</b><p>${isi}</p>${tb||''}</div></div>`;
 const libur=daftarKal.find(r=>r&&r.tanggal===TODAY);
 if(libur)L.push(kartu('l','🇮🇩','Hari ini libur nasional',esc(libur.keterangan||'Libur nasional')+' - '+fmt(TODAY)+'.<br>Berlaku untuk semua sekolah. Sekolah yang tetap masuk dapat memilih Ya, masuk di menu Absensi.','<button class="btn soft sm" onclick="bukaKalenderNas()">📅 Lihat Kalender Nasional</button>'));
 if(pd+pn){const a=[];if(pd)a.push(pd+' pendaftaran sekolah baru');if(pn)a.push(pn+' permintaan nomor WhatsApp hilang');L.push(kartu('w','✅','Menunggu persetujuan',a.join(' dan ')+' perlu diperiksa.','<button class="btn success sm" onclick="devBuka(\'setuju\')">Buka Persetujuan</button>'))}
 if(al&&al.error)L.push(kartu('e','⚠️','Status Alpa Otomatis gagal dimuat',esc(al.error)+'<br>Pastikan skrip SQL langkah 6 sudah dijalankan.','<button class="btn soft sm" onclick="devBuka(\'alpa\')">⏰ Buka Alpa Otomatis</button>'));
 else if(daftarAlpa.length){const er=daftarAlpa.map(x=>({x,v:statusAlpa(x)})).filter(o=>o.v[0]==='err');if(er.length)L.push(kartu('e','⏰','Alpa Otomatis error ('+er.length+' sekolah)',er.slice(0,3).map(o=>'<b style="display:inline">'+esc(o.x.nama)+'</b>: '+esc(o.v[2])).join('<br>')+(er.length>3?'<br>dan '+(er.length-3)+' sekolah lainnya.':''),'<button class="btn soft sm" onclick="devBuka(\'alpa\')">⏰ Buka Alpa Otomatis</button>'))}
 const nl=S.devNL;if(daftarLibur.length){const er=daftarLibur.map(x=>({x,v:statusNL(x)})).filter(o=>o.v[0]==='err');if(er.length)L.push(kartu('e','🔔','Notifikasi Libur error ('+er.length+' sekolah)',er.slice(0,3).map(o=>'<b style="display:inline">'+esc(o.x.nama)+'</b>: '+esc(o.v[2])).join('<br>')+(er.length>3?'<br>dan '+(er.length-3)+' sekolah lainnya.':''),'<button class="btn soft sm" onclick="devBuka(\'liburnotif\')">🔔 Buka Notifikasi Libur</button>'))}
  const np=S.devNP;if(np&&!np.error){const gg=(Array.isArray(np.log)?np.log:[]).filter(x=>x&&x.status==='gagal');if(gg.length)L.push(kartu('e','📲','Notifikasi Piket gagal ('+gg.length+' catatan)',gg.slice(0,3).map(x=>'<b style="display:inline">'+esc(x.nama)+'</b>: '+esc(x.pesan_error||x.alasan||'gagal')).join('<br>'),'<button class="btn soft sm" onclick="devBuka(\'piketnotif\')">📲 Buka Notifikasi Piket</button>'))}
 const ns=S.devNS;if(ns&&!ns.error){const gg=(Array.isArray(ns.antrean)?ns.antrean:[]).filter(x=>x&&x.status==='gagal'&&Date.now()-new Date(x.dibuat)<864e5);if(gg.length)L.push(kartu('e','📲','Notifikasi Siswa gagal ('+gg.length+' catatan)',gg.slice(0,3).map(x=>'<b style="display:inline">'+esc(x.nama)+'</b>: '+esc(x.hasil||'gagal')).join('<br>'),'<button class="btn soft sm" onclick="devBuka(\'siswanotif\')">📲 Buka Notifikasi Siswa</button>'))}
 const ce=chk&&Array.isArray(chk.r)?chk.r.filter(x=>Array.isArray(x)&&x[0]==='err').length:0;
 if(ce)L.push(kartu('e','🩺','Pemeriksaan sistem menemukan masalah',ce+' pemeriksaan gagal pada pengecekan terakhir ('+esc(chk.t)+').','<button class="btn soft sm" onclick="devBuka(\'sistem\')">🩺 Buka Pemeriksaan Sistem</button>'));
 return `<div class="dnt-h">🔔 Pemberitahuan <span>${L.length?L.length+' perlu perhatian':'Tidak ada yang mendesak'}</span></div>`+(L.length?L.join(''):kartu('ok','🌿','Semuanya aman','Tidak ada persetujuan tertunda, error, maupun libur nasional hari ini.'))}
function devDashboard(){
 const p=PROFIL||{},u=S.pfs||{};
 const row=(l,v)=>`<div class="mu">${l}</div><div style="word-break:break-word"><b>${v||'<span class="mu">-</span>'}</b></div>`;
 let pemberitahuan='';try{pemberitahuan=devNotif()}catch(e){console.error('Gagal merender pemberitahuan Developer:',e);pemberitahuan='<div class="panel"><div class="pb"><div class="note">Sebagian pemberitahuan belum dapat ditampilkan. Data dashboard lainnya tetap tersedia.</div></div></div>'}let ringkasan='';try{ringkasan=devRingkas()}catch(e){console.error('Gagal merender ringkasan Developer:',e);ringkasan='<div class="panel"><div class="pb"><div class="note">Ringkasan sementara tidak dapat ditampilkan.</div></div></div>'}return `<div class="hero hero2"><div class="hr-top"><span id="hrJam">${jamHero()}</span><span>${tglHero(TODAY)}</span></div><div class="hr-body"><div><h1>Halo, ${esc(meNama||'Developer')} 👋🏻<br>Dashboard Developer</h1></div><i>🛠</i></div></div>${pemberitahuan}<div class="dnt-h">📊 Ringkasan</div>${ringkasan}
<div class="panel"><div class="ph">👤 Profil Saya</div><div class="pb"><div style="display:grid;grid-template-columns:110px 1fr;gap:10px 12px;align-items:start">${row('Nama lengkap',esc(p.nama||''))}${row('Username',esc(p.username||''))}${row('Peran',esc(role||''))}${row('Email akun',esc(u.email||''))}${row('Terakhir masuk',u.last_sign_in_at?esc(waktuId(u.last_sign_in_at)):'')}</div><div class="tb" style="margin-top:12px"><button class="btn success" onclick="go('profil')">👤 Profil lengkap</button><button class="btn soft" onclick="editProfilSaya()">✏️ Ubah profil</button></div></div></div>`}
function devRingkas(){const sk=Array.isArray(S.devSek)?S.devSek:[],pd=Array.isArray(S.devPend)?S.devPend:[],pn=Array.isArray(S.devNomor)?S.devNomor:[],guru=Array.isArray(S.devGuru)?S.devGuru:[],ak=sk.filter(x=>x&&x.status==='aktif').length,nm=pd.length+pn.length,gr=guru.filter(g=>g&&g.role!=='developer').length,sw=sk.reduce((a,x)=>a+(Number(x&&x.jml_siswa)||0),0);
 return `<div class="panel"><div class="pb" style="padding-top:14px"><div class="cards"><div class="card stat"><b>${ak}</b>Sekolah aktif</div><div class="card stat"><b>${nm}</b>Menunggu persetujuan</div><div class="card stat"><b>${gr}</b>Guru</div><div class="card stat"><b>${sw}</b>Siswa aktif</div></div></div></div>`}
function devSetuju(){const pd=S.devPend||[],pn=S.devNomor||[],gr=(S.devGuru||[]).filter(g=>g.role!=='developer');
 const tgl=x=>fmt(new Date(x).toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'}));
 const opsi=q=>{const kt=String(q.nama||'').toLowerCase().split(' ')[0],ul=q.username_lama||'';const cocok=gr.filter(g=>(ul&&g.username===ul)||(kt.length>2&&String(g.nama||'').toLowerCase().includes(kt)));const urut=[...cocok,...gr.filter(g=>!cocok.includes(g))];const pre=gr.find(g=>ul&&g.username===ul);
  return '<option value="">- Pilih akun yang dimaksud -</option>'+urut.map(g=>`<option value="${g.id}" ${pre&&pre.id===g.id?'selected':''}>${esc(g.nama)} (${esc(g.username)}) - ${esc((g.keanggotaan||[]).map(k=>k.sekolah).join(', ')||'tanpa sekolah')}</option>`).join('')};
 const kS=pd.map(d=>`<div class="ci" style="display:block;margin:8px 0"><b>🏫 ${esc(d.nama_sekolah)}</b><div class="mu">${d.alamat?esc(d.alamat)+' · ':''}${d.kota?esc(d.kota)+' · ':''}Diajukan ${tgl(d.dibuat)}</div>${d.peran==='operator'?`<div>Didaftarkan oleh <b>Operator</b>: <b>${esc(d.nama_kepala||'-')}</b>${d.nip?' · NIP '+esc(d.nip):''}</div><div>WhatsApp operator: ${esc(fmtWA(d.no_wa)||'-')} · username: ${esc(d.username||'-')}</div><div>Kepala sekolah: <b>${esc(d.kepala_nama||'-')}</b>${d.kepala_nip?' · NIP '+esc(d.kepala_nip):''}</div><div>WhatsApp kepala: ${esc(fmtWA(d.kepala_wa)||'-')}</div>`:`<div>Kepala sekolah: <b>${esc(d.nama_kepala||'-')}</b>${d.nip?' · NIP '+esc(d.nip):''}</div><div>WhatsApp: ${esc(fmtWA(d.no_wa)||'-')} · username: ${esc(d.username||'-')}</div>`}<div class="tb" style="margin-top:8px"><button class="btn success sm" onclick="setujuiSekolah(${d.id})">✅ Setujui</button><button class="btn danger sm" onclick="tolakSekolah(${d.id})">✖ Tolak</button></div></div>`).join('');
 const kN=pn.map(q=>`<div class="ci" style="display:block;margin:8px 0"><b>📵 ${esc(q.nama)}</b><div class="mu">Sekolah: ${esc(q.nama_sekolah)} · diajukan ${tgl(q.dibuat)}</div><div>Username lama: ${esc(q.username_lama||'(tidak diisi)')}</div><div>Nomor baru: <b>${esc(fmtWA(q.no_wa_baru))}</b>${q.username_baru?' · username baru: <b>'+esc(q.username_baru)+'</b>':''}${q.ganti_sandi?' · ganti kata sandi':''}</div><div class="fd" style="margin-top:8px"><label class="l">Akun yang dimaksud</label><select id="np_${q.id}" class="select">${opsi(q)}</select></div><div class="tb" style="margin-top:8px"><button class="btn success sm" onclick="nomorSetujui(${q.id})">✅ Setujui</button><button class="btn danger sm" onclick="nomorTolak(${q.id})">✖ Tolak</button></div></div>`).join('');
 return `<div class="panel"><div class="ph">🏫 Pendaftaran sekolah baru</div><div class="pb">${kS||'<div class="mu">Tidak ada pendaftaran yang menunggu.</div>'}</div></div><div class="panel"><div class="ph">📵 Permintaan nomor WhatsApp hilang</div><div class="pb"><div class="note">Periksa kebenarannya sebelum menyetujui (misalnya hubungi kepala sekolah atau nomor baru). Akun lama tidak berubah sebelum Anda menyetujui.</div>${kN||'<div class="mu">Tidak ada permintaan yang menunggu.</div>'}</div></div>`}
function setujuiSekolah(id){konfirmasi('Setujui pendaftaran sekolah ini? Sekolah, pengaturan, dan keanggotaan pendaftar (Kepala Sekolah atau Operator) langsung dibuat, lalu pendaftar dikabari lewat WhatsApp.',{judul:'Setujui sekolah',ya:'Setujui',ikon:'✅'}).then(ok=>{if(!ok)return;guard(async()=>{await apiDev({aksi:'setujui_sekolah',id});await muatDev();toast('Sekolah disetujui');renderV()})})}
function tolakSekolah(id){form('Tolak pendaftaran',[{k:'alasan',l:'Alasan penolakan (dikirim ke pendaftar, boleh kosong)'}],async v=>{await apiDev({aksi:'tolak_sekolah',id,alasan:v.alasan});await muatDev();toast('Pendaftaran ditolak');renderV()});$('#ms').textContent='Tolak'}
function nomorSetujui(id){const el=$('#np_'+id),pid=el?el.value:'';if(!pid)return toast('Pilih akun yang dimaksud terlebih dahulu',false);
 const nama=el.options[el.selectedIndex].text;konfirmasi('Setujui permintaan ini untuk akun berikut?\n\n'+nama+'\n\nNomor, dan username atau kata sandi yang diajukan, langsung berlaku.',{judul:'Setujui nomor baru',ya:'Setujui',ikon:'✅'}).then(ok=>{if(!ok)return;guard(async()=>{await apiDev({aksi:'nomor_setujui',id,profil_id:pid});await muatDev();toast('Permintaan disetujui');renderV()})})}
function nomorTolak(id){form('Tolak permintaan nomor',[{k:'alasan',l:'Alasan penolakan (dikirim ke nomor baru, boleh kosong)'}],async v=>{await apiDev({aksi:'nomor_tolak',id,alasan:v.alasan});await muatDev();toast('Permintaan ditolak');renderV()});$('#ms').textContent='Tolak'}
function devSekolah(){const sk=S.devSek||[];
 return `<div class="panel"><div class="ph">🏫 Semua sekolah</div><div class="pb">${sk.length?tab(['Sekolah','Kota','Status','Kepala sekolah','Guru','Siswa','Push Notifikasi','Aksi'],sk.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.kota||'-')}</td><td><span class="badge ${x.status==='aktif'?'Hadir':'Belum'}">${x.status==='aktif'?'Aktif':'Nonaktif'}</span></td><td>${esc(x.kepala_nama||'-')}<div class="mu">${esc(fmtWA(x.kepala_wa)||'')}</div></td><td>${x.jml_guru}</td><td>${x.jml_siswa}</td><td>${devPushBadge(x.id)}</td><td><div class="tb" style="margin:0;flex-wrap:wrap"><button class="btn sm success" onclick="pilihMasuk(${x.id})">🔑 Masuk sebagai</button><button class="btn sm soft" onclick="konfigSekolah(${x.id})">⚙ Konfigurasi</button><button class="btn sm ${x.status==='aktif'?'danger':'success'}" onclick="statusSekolah(${x.id})">${x.status==='aktif'?'Nonaktifkan':'Aktifkan'}</button><button class="btn sm soft" onclick="beritahuHapusSekolah(${x.id})">📢 Beritahu Kepala</button><button class="btn sm danger" onclick="hapusSekolah(${x.id})">🗑 Hapus permanen</button></div></td></tr>`).join('')):'<div class="mu">Belum ada sekolah.</div>'}${sk.length?devPushCatatan():''}</div></div>`}
function beritahuHapusSekolah(sid){const x=(S.devSek||[]).find(v=>v.id===sid);if(!x)return;
 if(!x.kepala_nama)return toast('Sekolah ini belum punya Kepala Sekolah aktif',false);
 form('Beritahu Kepala Sekolah - '+x.nama,[{k:'batas',l:'Batas waktu mengunduh rekap (opsional)',t:'date',min:TODAY}],async v=>{
  const batas=v.batas?fmt(v.batas):'';
  setTimeout(async()=>{
   ld(1,'Mengirim pemberitahuan ke '+x.kepala_nama+'...');
   try{const j=await apiDev({aksi:'beritahu_hapus_sekolah',sekolah_id:sid,batas});
    if(!j||!j.terkirim)throw new Error('Pemberitahuan gagal terkirim. Periksa perangkat Fonnte Developer');
    devTab='sekolah';await muatDev();renderAll();toast('✅ Pemberitahuan berhasil dikirim ke '+x.kepala_nama)}
   catch(e){toast((e&&e.message)||String(e),false)}
   finally{ld(0)}},150)});$('#ms').textContent='Kirim'}
function hapusSekolah(sid){const x=(S.devSek||[]).find(v=>v.id===sid);if(!x)return;
 form('Hapus permanen: '+x.nama,[{k:'nm',l:'Ketik nama sekolah persis <b>'+esc(x.nama)+'</b> untuk melanjutkan'},{k:'sandi',l:'Kata sandi akun Developer',t:'password',pkb:1}],async v=>{
  if(String(v.nm||'').trim()!==String(x.nama).trim())throw new Error('Nama sekolah yang diketik tidak sama');
  if(!v.sandi&&!pkBuktiFresh())throw new Error('Isi kata sandi Developer atau verifikasi dengan passkey');
  if(!await konfirmasi('SELURUH data '+x.nama+' ('+(x.jml_guru||0)+' guru, '+(x.jml_siswa||0)+' siswa) beserta absensi, tabungan, pesan, dan pengaturannya akan dihapus PERMANEN dan TIDAK BISA dikembalikan. Lanjutkan?',{judul:'Hapus sekolah permanen',ya:'Ya, hapus permanen',bahaya:1}))return;
  const kirim=l=>apiDev({aksi:'hapus_sekolah',sekolah_id:sid,konfirmasi:v.nm.trim(),...bodyBukti(v.sandi),lanjut_tanpa_pemberitahuan:!!l});
  let j,tanya=false;
  ld(1,'Menghapus data sekolah...');
  try{j=await kirim(false)}catch(e){if(e.message!=='BELUM_ADA_PEMBERITAHUAN')throw e;tanya=true}finally{ld(0)}
  if(tanya){
   if(!await konfirmasi('Kepala Sekolah '+x.nama+' belum diberi pemberitahuan dalam 3 hari terakhir, jadi mungkin belum sempat mengunduh rekap. Tetap hapus sekarang?',{judul:'Belum ada pemberitahuan',ya:'Tetap hapus',bahaya:1}))return;
   ld(1,'Menghapus data sekolah...');try{j=await kirim(true)}finally{ld(0)}}
  await muatDev();devSekFiltr='';toast('Sekolah '+x.nama+' dihapus permanen'+(j&&j.akun_dihapus?' ('+j.akun_dihapus+' akun guru ikut dihapus)':''));renderV()});$('#ms').textContent='Hapus permanen'}
function statusSekolah(sid){const x=(S.devSek||[]).find(v=>v.id===sid);if(!x)return;const baru=x.status==='aktif'?'nonaktif':'aktif';
 konfirmasi((baru==='nonaktif'?'Nonaktifkan ':'Aktifkan ')+x.nama+'? '+(baru==='nonaktif'?'Semua pengguna sekolah ini tidak bisa masuk, dan Webhook serta alpa otomatisnya berhenti.':'Pengguna sekolah ini bisa masuk kembali.'),{judul:baru==='nonaktif'?'Nonaktifkan sekolah':'Aktifkan sekolah',ya:baru==='nonaktif'?'Nonaktifkan':'Aktifkan',bahaya:baru==='nonaktif'?1:0}).then(ok=>{if(!ok)return;guard(async()=>{await apiDev({aksi:'sekolah_status',sekolah_id:sid,status:baru});await muatDev();toast('Status sekolah diperbarui');renderV()})})}
function pilihMasuk(sid){const sk=(S.devSek||[]).find(x=>x.id===sid)||{};const m=(S.devGuru||[]).filter(g=>g.aktif&&g.role!=='developer').map(g=>({g,k:(g.keanggotaan||[]).find(k=>k.sekolah_id===sid&&k.aktif)})).filter(x=>x.k);
 info('Masuk sebagai - '+(sk.nama||''),m.length?`<div class="note">Pilih nama. Peran mengikuti peran orang itu di sekolah ini.</div>`+m.map(x=>`<button class="btn soft" style="width:100%;margin:5px 0;display:flex;justify-content:space-between;gap:10px" onclick="closeM();masukSebagai('${x.g.id}',${sid})"><span>${esc(x.g.nama)}</span><small>${esc(LBL[x.k.role]||x.k.role)}</small></button>`).join(''):'<div class="note">Tidak ada anggota aktif di sekolah ini.</div>')}
function masukSebagai(pid,sid){const g=(S.devGuru||[]).find(x=>x.id===pid),sk=(S.devSek||[]).find(x=>x.id===sid);
 konfirmasi('Masuk sebagai '+(g?g.nama:'pengguna ini')+' di '+(sk?sk.nama:'sekolah ini')+'? Semua yang Anda lakukan terjadi atas nama akun tersebut. Awal dan akhir mode bantuan tercatat di log audit.',{judul:'Masuk sebagai',ya:'Masuk',ikon:'🔑'}).then(ok=>{if(!ok)return;
 guard(async()=>{const {data:{session}}=await db.auth.getSession();const j=await apiDev({aksi:'masuk_sebagai',profil_id:pid,sekolah_id:sid});
  sessionStorage.setItem('dev_sesi',JSON.stringify({a:session.access_token,r:session.refresh_token}));
  sessionStorage.setItem('mode_bantuan',JSON.stringify({nama:j.nama,sekolah:j.sekolah,profil_id:pid,sekolah_id:sid,bantuan:j.bantuan||''}));
  let er=(await db.auth.verifyOtp({token_hash:j.token_hash,type:'magiclink'})).error;
  if(er)er=(await db.auth.verifyOtp({token_hash:j.token_hash,type:'email'})).error;
  if(er){sessionStorage.removeItem('dev_sesi');sessionStorage.removeItem('mode_bantuan');try{await db.auth.setSession({access_token:session.access_token,refresh_token:session.refresh_token})}catch(e){console.warn('Sesi belum bisa dipulihkan',e)}throw new Error('Gagal masuk sebagai: '+(er.message||er))}
  sessionStorage.setItem('sekolah_aktif',String(sid));sessionStorage.setItem('bukaView','dashboard');await mulai()})})}
function pasangBanner(){let el=$('#mbBantu'),mb=null;try{mb=JSON.parse(sessionStorage.getItem('mode_bantuan')||'null')}catch(e){}
 if(!mb){if(el)el.remove();return}
 if(!el){el=document.createElement('div');el.id='mbBantu';document.body.prepend(el)}
 el.innerHTML='🛠 Mode bantuan: Anda masuk sebagai <b>'+esc(mb.nama)+'</b> di <b>'+esc(mb.sekolah)+'</b> <button class="btn sm" onclick="keluarBantuan()">⬅ Kembali ke Developer</button>'}
async function keluarBantuan(){if(!await jagaTanya('semua'))return;guard(async()=>{let d=null,mb=null;try{d=JSON.parse(sessionStorage.getItem('dev_sesi')||'null');mb=JSON.parse(sessionStorage.getItem('mode_bantuan')||'null')}catch(e){}
 await stopScan();
 if(!d){await db.auth.signOut();loginView('Silakan masuk kembali sebagai Developer');return}
 const {error}=await db.auth.setSession({access_token:d.a,refresh_token:d.r});
 try{sessionStorage.removeItem('dev_sesi');sessionStorage.removeItem('mode_bantuan');sessionStorage.removeItem('sekolah_aktif')}catch(e){}
 pasangBanner();
 if(error){await db.auth.signOut();loginView('Sesi Developer berakhir, silakan masuk kembali');return}
 if(mb)apiDev({aksi:'catat_keluar',profil_id:mb.profil_id,sekolah_id:mb.sekolah_id}).catch(()=>{});
 sessionStorage.setItem('bukaView','developer');await mulai()})}
let devSekFiltr='';
function devGuru(){const sk=S.devSek||[];if(!S.devGuru)return panelDevGuru();
 const opt='<option value="">Semua sekolah</option>'+sk.map(x=>`<option value="${x.id}" ${String(x.id)===devSekFiltr?'selected':''}>${esc(x.nama)}${x.status!=='aktif'?' (nonaktif)':''}</option>`).join('');
 return `<div class="panel"><div class="pb" style="padding-top:14px"><label class="l">Tampilkan guru dari</label><select class="select" onchange="devSekFiltr=this.value;renderV()">${opt}</select></div></div>`+(devSekFiltr?devGuruSekolah(Number(devSekFiltr)):panelDevGuru())}
function devGuruSekolah(sid){setTimeout(()=>ttdGuruMuatDev(),0);const sk=(S.devSek||[]).find(x=>x.id===sid)||{nama:'',status:''};
 const m=(S.devGuru||[]).filter(g=>g.role!=='developer').map(g=>({g,k:(g.keanggotaan||[]).find(k=>k.sekolah_id===sid)})).filter(x=>x.k);
 return `<div class="panel"><div class="ph">👥 Guru - ${esc(sk.nama)} <button class="btn success sm add" onclick="devTambahGuru(${sid})">+ Guru</button></div><div class="pb">${m.length?tab(['No','Nama','NIP','Username','WhatsApp','Peran','Status','Tanda tangan','Aksi'],m.map(({g,k},i)=>`<tr><td>${i+1}</td><td><b>${esc(g.nama)}</b></td><td>${esc(g.nip||'-')}</td><td>${esc(g.username)}</td><td><span style="white-space:nowrap">${nomorHtml(g.no_wa)||'-'}<button type="button" onclick="devUbahNomor('${g.id}')" title="Ubah nomor WhatsApp" aria-label="Ubah nomor WhatsApp" style="background:none;border:0;box-shadow:none;padding:2px 4px 2px 8px;margin:0;cursor:pointer;font-size:15px;line-height:1;vertical-align:middle">✏️</button></span></td><td><select class="select" onchange="devUbahRole('${g.id}',${sid},this.value)">${['kepala_sekolah','wakil_kepala','pengelola','operator','guru'].map(r=>`<option value="${r}" ${r===k.role?'selected':''}>${LBL[r]}</option>`).join('')}</select></td><td>${k.aktif?'<span class="badge Hadir">Aktif</span>':'<span class="badge Belum">Nonaktif</span>'}</td><td><span class="badge ${TTD_GURU[g.id]?'Hadir':'Belum'}">${TTD_GURU[g.id]?'Tersedia':'Belum ada'}</span><button class="btn sm soft" onclick="ttdGuruBuka('${g.id}','${esc(g.nama)}')">${TTD_GURU[g.id]?'Kelola':'Tambah'}</button></td><td><div class="tb" style="margin:0;flex-wrap:wrap">${k.aktif&&g.aktif&&sk.status==='aktif'?`<button class="btn sm soft" onclick="masukSebagai('${g.id}',${sid})">🔑 Masuk</button>`:''}<button class="btn sm ${k.aktif?'danger':'success'}" onclick="devAktif('${g.id}',${sid},${!k.aktif})">${k.aktif?'Nonaktifkan':'Aktifkan'}</button><button class="btn sm danger" onclick="devKeluarkan('${g.id}',${sid})">Keluarkan</button></div></td></tr>`).join('')):'<div class="mu">Belum ada guru di sekolah ini.</div>'}</div></div>`}
function devUbahRole(pid,sid,r){if(r==='kepala_sekolah'){konfirmasi('Jadikan guru ini Kepala Sekolah? Kepala Sekolah saat ini otomatis menjadi Guru.',{judul:'Ganti Kepala Sekolah',ya:'Ya, ganti',ikon:'👑'}).then(ok=>{if(!ok){renderV();return}devUbahRole2(pid,sid,r)});return}devUbahRole2(pid,sid,r)}
/* Developer mengubah nomor WhatsApp guru langsung (tanpa OTP, tanpa Masuk sebagai); pemberitahuan hanya ke nomor baru */
function devUbahNomor(pid){const g=(S.devGuru||[]).find(x=>x.id===pid);if(!g)return;const jml=(g.keanggotaan||[]).length;
 form('Ubah nomor WhatsApp',[{k:'nm',l:'Nama guru',ro:1,v:g.nama},{k:'lama',l:'Nomor sekarang',ro:1,v:fmtWA(g.no_wa)||'(belum ada)'},{k:'baru',l:'Nomor WhatsApp baru (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.baru);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');
  if(wa===normWA(g.no_wa))throw new Error('Nomor baru sama dengan nomor sekarang');
  if(!await konfirmasi('Ubah nomor WhatsApp '+g.nama+' dari '+(fmtWA(g.no_wa)||'(belum ada)')+' menjadi '+fmtWA(wa)+'?'+(jml>1?'\n\nGuru ini terdaftar di '+jml+' sekolah. Nomor melekat pada akun, jadi berubah di semua sekolahnya.':'')+'\n\nTanpa kode OTP. Pemberitahuan dikirim ke nomor baru.',{judul:'Ubah nomor WhatsApp',ya:'Ubah nomor',ikon:'📱'}))return;
  closeM();
  const j=await apiGuru({aksi:'dev_ubah_nomor',id:pid,no_wa_baru:wa});
  await muatDev();
  if(j&&j.terkirim===false)toast('Nomor diubah, tetapi pemberitahuan ke nomor baru gagal terkirim',false);else toast('Nomor diubah dan pemberitahuan terkirim ke nomor baru');
  renderV()});$('#ms').textContent='Lanjut'}
function devUbahRole2(pid,sid,r){guard(async()=>{try{await apiGuru({sekolah_id:sid,aksi:'ubah_role',id:pid,role:r});toast('Peran diubah')}finally{await muatDev();renderV()}})}
function devAktif(pid,sid,n){guard(async()=>{await apiGuru({sekolah_id:sid,aksi:'aktif',id:pid,aktif:n});await muatDev();toast(n?'Guru diaktifkan':'Guru dinonaktifkan');renderV()})}
async function devKeluarkan(pid,sid){const g=(S.devGuru||[]).find(x=>x.id===pid);if(!await konfirmasi('Keluarkan '+(g?g.nama:'guru ini')+' dari sekolah ini? Akunnya tetap ada.',{judul:'Keluarkan guru',ya:'Keluarkan',bahaya:1}))return;guard(async()=>{await apiGuru({sekolah_id:sid,aksi:'hapus',id:pid});await muatDev();toast('Guru dikeluarkan');renderV()})}
function devTambahGuru(sid){form('Tambah guru',[{k:'wa',l:'Nomor WhatsApp guru (contoh 08123456789)'}],async v=>{const wa=normWA(v.wa);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');
  const c=await apiGuru({sekolah_id:sid,aksi:'cek_nomor',no_wa:wa});
  if(c.sudah_di_sekolah)throw new Error('Nomor ini sudah terdaftar sebagai '+c.nama+' di sekolah ini');
  if(c.ada){if(!await konfirmasi('Nomor ini sudah punya akun atas nama '+c.nama+'. Tautkan ke sekolah ini?',{judul:'Tautkan guru',ya:'Tautkan'}))return;await apiGuru({sekolah_id:sid,aksi:'tautkan',no_wa:wa});await muatDev();toast(c.nama+' ditautkan ke sekolah ini');renderV();return}
  setTimeout(()=>{form('Guru baru',[{k:'nama',l:'Nama guru'},{k:'nip',l:'NIP (opsional)'},{k:'user',l:'Username (huruf kecil, tanpa spasi)'},{k:'sandi',l:'Kata sandi awal (minimal 6 karakter)',t:'password'},{k:'role',l:'Peran',o:['Guru','Operator','Pengelola/Pengasuh','Wakil Kepala Sekolah','Kepala Sekolah']}],async z=>{await apiGuru({sekolah_id:sid,aksi:'tambah',nama:z.nama,nip:z.nip,username:z.user,sandi:z.sandi,role:KEYR[z.role]||'guru',no_wa:wa});await muatDev();toast('Guru ditambahkan');renderV()})},150)});$('#ms').textContent='Lanjut'}
const BATAS_DB_MB=450;
const RETENSI=[
 ['pesan_masuk','1 hari','Hanya data hari ini; dibersihkan pukul 00.05 WIB'],
 ['percakapan_tertunda','1 hari','Hanya data hari ini; dibersihkan pukul 00.05 WIB'],
 ['pesan_dedup','1 hari','Hanya data hari ini; jendela anti-duplikat pesan tetap 5 menit'],
 ['otp_kode','1 hari','Hanya data hari ini; dibersihkan pukul 00.05 WIB'],
 ['laporan_ortu','1 hari','Hanya data hari ini; dibersihkan pukul 00.05 WIB'],
 ['notifikasi_alpa','1 hari','Hanya data hari ini; dibersihkan pukul 00.05 WIB'],
 ['notifikasi_libur','1 hari','Hanya data hari ini; dibersihkan pukul 00.05 WIB'],
 ['alpa_proses','1 hari','Hanya data hari ini; dibersihkan pukul 00.05 WIB'],
 ['notifikasi_libur_grup','1 hari','Hanya status terminal terkirim/gagal/dibatalkan; antrean menunggu atau mengirim tidak disentuh'],
 ['notifikasi_libur_manual_kelas','1 hari','Penanda pengiriman libur manual per kelas; dibersihkan pukul 00.05 WIB'],
 ['kirim_log','7 hari','Riwayat kirim WhatsApp; tugas bersihkan-kirim-log pukul 02.30 WIB'],
 ['piket_notif_log','3 hari','Riwayat notifikasi piket; tugas bersihkan_piket_notif_log pukul 00.15 WIB'],
 ['log_audit','3 hari','Hari ini dan 2 hari sebelumnya; dibersihkan pukul 00.05 WIB'],
 ['pendaftaran_sekolah','7 hari','Hanya data yang sudah diproses; status menunggu tidak dihapus'],
 ['permintaan_nomor','7 hari','Hanya data yang sudah diproses; status menunggu tidak dihapus'],
 ['notif_antrean','Antrean aktif saja','Pukul 00.07 WIB: hanya status menunggu yang jadwalnya hari ini atau sesudahnya dipertahankan'],
 ['pengingat_izin_sakit','7 hari','Status pengingat Push dan WhatsApp; data menunggu/diproses dipertahankan, catatan terminal dihapus setelah 7 hari'],
 ['pengingat_izin_sakit_eksekusi','7 hari','Riwayat eksekusi pemantauan pengingat izin/sakit; dihapus otomatis setelah 7 hari'],
 ['alumni','2 tahun','Dihapus bila lebih dari 2 tahun sejak dicatat sebagai alumni; tugas pukul 00.15 WIB'],
 ['libur_batal','Sampai tanggal lewat','Dihapus bila tanggal pembatalan sudah lewat; tanggal hari ini masih disimpan'],
 ['libur_tanggal','Sampai tanggal lewat','Dihapus bila tanggal akhir (atau tanggal mulai) sudah lewat; hari ini masih disimpan'],
 ['libur_nasional','Sampai tanggal lewat','Tanggal yang sudah lewat dihapus; impor kalender nasional juga mengganti daftar'],
 ['push_langganan','Saat HP mati atau siswa dihapus','Alamat push dihapus bila respons 404/410 atau gagal 5 kali berturut-turut; ikut terhapus saat siswa/sekolah dihapus'],
 ['cron.job_run_details','Dikosongkan harian','Riwayat eksekusi cron dikosongkan pukul 00.08 WIB; tabel internal pg_cron, bukan tabel aplikasi'],
 ['pemakaian_ai_riwayat','30 hari','Riwayat rinci pemakaian AI; dihapus otomatis setiap hari pukul 00.05 WIB setelah berumur lebih dari 30 hari'],
 ['fonnte_kuota_harian','7 hari','Riwayat sisa kuota dan pemakaian per token/sekolah; dibersihkan setiap hari pukul 00.05 WIB oleh cron cleanup-data-harian']
];
const RET_MAP=Object.fromEntries(RETENSI.map(r=>[r[0],r]));
const SIMPAN_LAIN={absensi:'Sampai tahun ajaran baru',tabungan_transaksi:'Sampai tahun ajaran baru',hafalan_setoran:'Sampai tahun ajaran baru',pemakaian_ai_ringkasan_harian:'Sampai sekolah dihapus',gemini_pengaman_sekolah:'Sampai sekolah dihapus',notif_siswa_jam:'Konfigurasi jadwal notifikasi (1 baris; bukan riwayat)'};
const fmtBy=n=>{n=Number(n)||0;return n>=1073741824?(n/1073741824).toFixed(2)+' GB':n>=1048576?(n/1048576).toFixed(1)+' MB':Math.max(1,Math.round(n/1024))+' KB'};
const waktuId=x=>x?new Date(x).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'short'}):'-';
function devPenyimpanan(){const d=S.devSimpan,st=S.devStorage;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat data penyimpanan...</div></div></div>';
 if(d.error)return `<div class="panel"><div class="ph">💾 Penyimpanan Database</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ ${esc(d.error)}<br>Data ukuran database belum tersedia.</div></div></div>`;
 const pk=Number(d.persen_aman)||0,wr=pk<60?'#1f9d55':pk<85?'#e0a100':'#d64545',tbl=d.tabel||[],ss=(d.sekolah||[]).slice().sort((a,b)=>b.ukuran-a.ukuran),B=(x,k)=>(x.baris||{})[k]||0;
 const buckets=st&&Array.isArray(st.buckets)?st.buckets:[],totalFile=buckets.reduce((n,x)=>n+(Number(x.jumlah_file)||0),0),totalByte=buckets.reduce((n,x)=>n+(Number(x.ukuran_byte)||0),0);
 const fmtTanggal=x=>x?new Date(x).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'short'}):'-';
 const rincian=st&&Array.isArray(st.sekolah_storage)?st.sekolah_storage:[];
 const daftarSekolah=rincian.length?tab(['Sekolah','Foto siswa','Ukuran foto','Tanda tangan','Ukuran tanda tangan','Total file','Total ukuran'],rincian.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${Number(x.jumlah_foto)||0}</td><td>${fmtBy(x.ukuran_foto)}</td><td>${Number(x.jumlah_ttd)||0}</td><td>${fmtBy(x.ukuran_ttd)}</td><td><b>${Number(x.jumlah_file)||0}</b></td><td><b>${fmtBy(x.ukuran_byte)}</b></td></tr>`).join('')):'<div class="mu">Belum ada data sekolah.</div>';
 const detailSekolah=rincian.map(x=>{
   const rows=(x.daftar_file||[]).map(f=>`<tr><td>${esc(f.jenis)}</td><td><b>${esc(f.nama)}</b><div class="mu">${esc(f.pemilik||'')}</div></td><td><code style="white-space:normal;overflow-wrap:anywhere">${esc(f.path)}</code></td><td>${fmtBy(f.ukuran_byte)}</td><td>${fmtTanggal(f.diperbarui)}</td><td>${esc(f.status||'-')}${f.keanggotaan?'<div class="mu">Keanggotaan: '+esc(f.keanggotaan)+'</div>':''}${f.dipakaiLintasSekolah?'<div class="mu">Akun terdaftar di beberapa sekolah</div>':''}</td></tr>`).join('');
   return `<details style="border:1px solid var(--bd);border-radius:10px;padding:10px;margin-top:9px"><summary style="cursor:pointer;font-weight:700">${esc(x.nama)} · ${Number(x.jumlah_foto)||0} foto · ${Number(x.jumlah_ttd)||0} tanda tangan · ${Number(x.jumlah_file)||0} file</summary><div style="overflow-x:auto;margin-top:10px">${rows?tab(['Jenis','Nama pemilik','Nama/lokasi file','Ukuran','Terakhir diubah','Status'],rows):'<div class="mu">Belum ada file yang terhubung ke sekolah ini.</div>'}</div></details>`;
 }).join('');
 const storagePanel=`<div class="panel"><div class="ph">🗄 Supabase Storage <button class="btn soft sm" onclick="perbaruiPemakaian()">↻ Perbarui</button></div><div class="pb">${!st?'<div class="note">⏳ Memuat daftar bucket dan ukuran file...</div>':st.error?`<div class="note" style="color:var(--rd)">⚠ ${esc(st.error)}</div>`:`<div class="cards"><div class="card stat"><b>${totalFile.toLocaleString('id-ID')}</b>Total file fisik</div><div class="card stat"><b>${fmtBy(totalByte)}</b>Total ukuran file</div><div class="card stat"><b>${buckets.length}</b>Bucket</div></div>${buckets.length?tab(['Bucket','Akses','Jumlah file','Ukuran','Keterangan'],buckets.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${x.publik?'Publik':'Privat'}</td><td>${Number(x.jumlah_file)||0}</td><td>${fmtBy(x.ukuran_byte)}</td><td>${x.error?`<span style="color:var(--rd)">${esc(x.error)}</span>`:x.terpotong?'Pemindaian dibatasi 20.000 objek':'Terhitung'}</td></tr>`).join('')):'<div class="mu">Belum ada bucket.</div>'}<div class="note" style="margin-top:8px">Total file fisik dihitung satu kali dari objek di Storage. Rincian per sekolah di bawah mengelompokkan foto berdasarkan folder sekolah dan tanda tangan berdasarkan keanggotaan akun guru.</div>`}</div></div>`;
 const storageSekolah=`<div class="panel"><div class="ph">🏫 Pemakaian Storage per sekolah <button class="btn soft sm" onclick="perbaruiPemakaian()">↻ Perbarui daftar file</button></div><div class="pb">${!st?'<div class="note">⏳ Menunggu pemindaian Storage...</div>':st.error?`<div class="note" style="color:var(--rd)">⚠ ${esc(st.error)}</div>`:`${daftarSekolah}<div class="note" style="margin-top:9px">Buka nama sekolah untuk melihat file satu per satu, termasuk nama siswa/guru, lokasi file, ukuran, waktu perubahan, dan status keterkaitannya. File tanda tangan milik guru yang terdaftar di lebih dari satu sekolah akan tampak pada masing-masing sekolah, tetapi hanya dihitung satu kali pada total fisik Storage.</div>${detailSekolah}`}</div></div>`;
 return `<div class="panel"><div class="ph">💾 Database Size Supabase <button class="btn soft sm" onclick="perbaruiPemakaian()">↻ Perbarui sekarang</button></div><div class="pb"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${fmtBy(d.ukuran_db)} dari ${fmtBy(d.batas_aman)}</b><span class="mu">${pk.toFixed(1)}% terpakai · sisa ${fmtBy(d.sisa_aman)}</span></div><div style="height:14px;background:#e6e9ee;border-radius:8px;overflow:hidden;margin:8px 0"><div style="width:${pk}%;height:100%;background:${wr}"></div></div><div class="cards"><div class="card stat"><b>${fmtBy(d.sisa_gratis)}</b>Sisa kuota gratis<div class="mu">dari ${fmtBy(d.kuota_gratis)}</div></div><div class="card stat"><b>${fmtBy(d.sisa_aman)}</b>Sisa batas aman<div class="mu">dari ${fmtBy(d.batas_aman)}</div></div></div><div class="note">Ukuran database diperbarui otomatis 1x sehari pukul 00.20 WIB, setelah pembersihan data pukul 00.05 WIB, dan disimpan di pemakaian_db. Total mengikuti Database Size PostgreSQL yang dilaporkan Supabase; WAL tidak dihitung. Terakhir diperbarui: ${waktuId(d.diperbarui)}. Rincian tabel di bawah hanya untuk schema public. Ukuran fisik di disk tidak selalu langsung turun setelah baris dihapus.</div></div></div>
 <div class="panel"><div class="ph">🏫 Pemakaian Database per sekolah <span class="mu">perkiraan</span></div><div class="pb">${ss.length?tab(['Sekolah','Perkiraan ukuran','Siswa','Absensi','Tabungan','Total baris'],ss.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${fmtBy(x.ukuran)}</td><td>${B(x,'siswa')}</td><td>${B(x,'absensi')}</td><td>${B(x,'tabungan_transaksi')}</td><td>${Object.values(x.baris||{}).reduce((a,b)=>a+(Number(b)||0),0)}</td></tr>`).join('')):'<div class="mu">Belum ada sekolah.</div>'}<div class="note" style="margin-top:8px">Perkiraan dihitung dari porsi jumlah baris tiap sekolah pada setiap tabel yang memiliki kolom sekolah_id; bukan pengukuran byte per sekolah secara langsung.</div></div></div>
 <div class="panel"><div class="ph">🗂 Semua tabel <span class="mu">${tbl.length} tabel</span></div><div class="pb">${tab(['Tabel','Ukuran','Jumlah baris','Disimpan'],tbl.slice().sort((a,b)=>(Number(b.ukuran)||0)-(Number(a.ukuran)||0)).map(x=>{const r=RET_MAP[String(x.nama).replace(/^public\./,'')];return `<tr><td><b>${esc(x.nama)}</b></td><td>${fmtBy(x.ukuran)}</td><td>${x.baris}</td><td>${r?r[1]:(SIMPAN_LAIN[String(x.nama).replace(/^public\./,'')]||'Permanen')}</td></tr>`}).join(''))}<div class="note" style="margin-top:8px">Daftar Disimpan menunjukkan retensi otomatis yang berlaku saat ini. Tabel berlabel Permanen tidak masuk jadwal pembersihan otomatis. Absensi, tabungan, dan setoran hafalan disimpan sampai proses tahun ajaran baru atau tindakan hapus khusus Developer/Kepala Sekolah yang tersedia.</div><div class="note" style="margin-top:8px"><b>Pembersihan data pemantauan AI:</b> <code>pemakaian_ai_riwayat</code> otomatis dihapus setelah lebih dari 30 hari. <code>pemakaian_ai_ringkasan_harian</code> dan <code>gemini_pengaman_sekolah</code> tidak dikosongkan berkala. Namun, ketiga tabel tersebut terhubung ke data sekolah dengan aturan <b>CASCADE</b>, sehingga seluruh catatan milik suatu sekolah otomatis ikut terhapus ketika sekolah tersebut dihapus oleh Developer.</div></div></div>${storagePanel}${storageSekolah}`;
}
function perbaruiPemakaian(){guard(async()=>{await dbq(db.rpc('developer_perbarui_pemakaian'));cmKosong();await muatDev();toast('Data database dan Storage diperbarui');renderV()})}

function aiAngka(v){return Number(v||0).toLocaleString('id-ID')}
function aiWaktu(v){return v?new Date(v).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'medium'}):'—'}
function aiBadge(teks,warna){return '<span class="badge '+warna+'">'+esc(teks)+'</span>'}
function aiStatusKey(x){
 const now=Date.now();
 if(x.error_permanen)return aiBadge('Perlu perbaikan','Alpa');
 if(!x.aktif)return aiBadge('Nonaktif','Belum');
 if(x.cooldown_until&&new Date(x.cooldown_until).getTime()>now)return aiBadge('Cooldown kuota','Alpa');
 if(x.reservasi_sampai&&new Date(x.reservasi_sampai).getTime()>now)return aiBadge('Sedang dipakai','Belum');
 if(x.status_terakhir==='berhasil')return aiBadge('Normal','Hadir');
 if(x.ditangani_pada&&(!x.terakhir_dicoba||new Date(x.ditangani_pada).getTime()>new Date(x.terakhir_dicoba).getTime()))return aiBadge('Menunggu uji ulang','Belum');
 if(x.kode_error_terakhir)return aiBadge('Gangguan sementara','Belum');
 return aiBadge('Belum diuji','Belum');
}
let devFonnteSekolah='*';
function devFonntePilihSekolah(v){devFonnteSekolah=String(v||'*');renderV()}
async function muatFonnte(){guard(async()=>{
 const hasil=await apiDev({aksi:'pemantauan_fonnte_cek'});
 await DEVSET.fonnte();DEVT.fonnte={t:Date.now(),v:cmVer};renderV();
 if(hasil&&hasil.ok){
  const bagian=[hasil.berhasil+' berhasil',hasil.gagal+' gagal'];
  if(hasil.menunggu)bagian.push(hasil.menunggu+' masih diproses');
  toast('Pemeriksaan Fonnte selesai: '+bagian.join(', '));
 }else toast('Pemeriksaan kuota Fonnte telah diminta; data diperbarui.');
})}
function devFonnte(){
 const d=S.devFonnte;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat pemantauan kuota Fonnte...</div></div></div>';
 if(d.error)return '<div class="panel"><div class="ph">📶 Pemantauan Kuota Fonnte</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ '+esc(d.error)+'</div><button class="btn soft sm" onclick="muatFonnte()">↻ Periksa kuota sekarang</button></div></div>';
 const sekolah=d.sekolah||[],semuaRows=d.riwayat||[];
 const opsi=[{value:'*',label:'Semua sekolah'},...sekolah.map(x=>({value:String(x.id),label:x.nama||('Sekolah '+x.id)}))];
 if(!opsi.some(x=>x.value===devFonnteSekolah))devFonnteSekolah='*';
 const pilih=cpick('fonnteSekolahPick','sekolah',devFonnteSekolah,opsi,'devFonntePilihSekolah','Pilih sekolah');
 const rows=semuaRows.filter(x=>devFonnteSekolah==='*'||String(x.sekolah_id)===devFonnteSekolah);
 const namaSekolah=id=>(sekolah.find(x=>Number(x.id)===Number(id))||{}).nama||('Sekolah '+id);
 const angka=x=>Number(x||0).toLocaleString('id-ID');
 const tanggal=x=>x?new Date(x+'T00:00:00+07:00').toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'2-digit',month:'short',year:'numeric'}):'—';
 const waktu=x=>x?new Date(x).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'short'})+' WIB':'—';
 const kunci=x=>String(x.sekolah_id)+':'+String(x.token_id||x.token_label||x.perangkat||'token');
 const urut=rows.slice().sort((a,b)=>String(b.tanggal).localeCompare(String(a.tanggal))||String(b.diperiksa_pada||'').localeCompare(String(a.diperiksa_pada||'')));
 const terbaru=new Map();urut.forEach(x=>{if(!terbaru.has(kunci(x)))terbaru.set(kunci(x),x)});
 const perangkat=[...terbaru.values()];
 const sukses=perangkat.filter(x=>x.status_pemeriksaan==='berhasil');
 const sisa=sukses.reduce((n,x)=>n+(Number(x.kuota_sisa)||0),0);
 const pemakaian=sukses.filter(x=>x.pemakaian_harian!==null&&x.pemakaian_harian!==undefined);
 const pakai=pemakaian.reduce((n,x)=>n+(Number(x.pemakaian_harian)||0),0);
 const gagal=perangkat.filter(x=>x.status_pemeriksaan==='gagal').length;
 const terhubung=sukses.filter(x=>x.status_perangkat==='connect').length;
 const last=rows.map(x=>x.diperiksa_pada).filter(Boolean).sort().slice(-1)[0]||null;
 const kartu=(n,l,sub)=>'<div class="card stat"><b>'+n+'</b>'+l+(sub?'<div class="mu">'+sub+'</div>':'')+'</div>';
 const deviceRows=perangkat.map(x=>{
   const status=x.status_pemeriksaan==='berhasil'?(x.status_perangkat==='connect'?'Terhubung':x.status_perangkat==='disconnect'?'Terputus':'Berhasil'):x.status_pemeriksaan==='menunggu'?'Menunggu':'Gagal';
   const warna=x.status_pemeriksaan==='gagal'?'var(--rd)':x.status_pemeriksaan==='menunggu'?' #a56b00':x.status_perangkat==='connect'?' #1f9d55':'var(--mu)';
   return '<tr><td><b>'+esc(namaSekolah(x.sekolah_id))+'</b></td><td>'+esc(x.token_label||'Token Fonnte')+'<div class="mu">'+esc(x.paket||'Paket belum diketahui')+'</div></td><td>'+esc(x.perangkat||'—')+'</td><td><b>'+(x.kuota_sisa===null||x.kuota_sisa===undefined?'—':angka(x.kuota_sisa))+'</b></td><td>'+(x.pesan_total===null||x.pesan_total===undefined?'—':angka(x.pesan_total))+'</td><td>'+esc(x.expired||'—')+'</td><td><span style="color:'+warna+';font-weight:700">'+status+'</span>'+(x.detail_error?'<div class="mu">'+esc(x.detail_error)+'</div>':'')+'</td><td>'+waktu(x.diperiksa_pada)+'</td></tr>';
 }).join('');
 const grup=new Map();
 rows.forEach(x=>{
   const key=String(x.tanggal)+'|'+String(x.sekolah_id);
   if(!grup.has(key))grup.set(key,{tanggal:x.tanggal,sekolah_id:x.sekolah_id,sisa:0,adaSisa:0,pakai:0,adaPakai:0,baseline:0,tambah:0,pesan:0,adaPesan:0,expired:new Set(),gagal:0,menunggu:0});
   const g=grup.get(key);
   if(x.status_pemeriksaan==='berhasil'){
     if(x.kuota_sisa!==null&&x.kuota_sisa!==undefined){g.sisa+=Number(x.kuota_sisa)||0;g.adaSisa++}
     if(x.pemakaian_harian!==null&&x.pemakaian_harian!==undefined){g.pakai+=Number(x.pemakaian_harian)||0;g.adaPakai++}else g.baseline++;
     g.tambah+=Number(x.kuota_ditambahkan)||0;
     if(x.pesan_total!==null&&x.pesan_total!==undefined){g.pesan+=Number(x.pesan_total)||0;g.adaPesan++}
     if(x.expired)g.expired.add(String(x.expired));
   }else if(x.status_pemeriksaan==='gagal')g.gagal++;
   else g.menunggu++;
 });
 const hist=[...grup.values()].sort((a,b)=>String(b.tanggal).localeCompare(String(a.tanggal))||namaSekolah(a.sekolah_id).localeCompare(namaSekolah(b.sekolah_id),'id'));
 const histRows=hist.map(x=>'<tr><td><b>'+esc(namaSekolah(x.sekolah_id))+'</b></td><td>'+tanggal(x.tanggal)+'</td><td>'+(x.adaSisa?angka(x.sisa):'—')+'</td><td>'+(x.adaPakai?angka(x.pakai)+(x.baseline?' <span class="mu">('+x.baseline+' baseline)</span>':''):'Belum ada pembanding')+'</td><td>'+(x.tambah?angka(x.tambah):'—')+'</td><td>'+(x.adaPesan?angka(x.pesan):'—')+'</td><td>'+esc([...x.expired].join(', ')||'—')+'</td><td>'+(x.gagal?'<span style="color:var(--rd)">'+x.gagal+' gagal</span>':x.menunggu?'Menunggu':'Berhasil')+'</td></tr>').join('');
 const daftarSekolah=sekolah.filter(x=>x.status==='aktif').length;
 return '<div class="panel"><div class="ph">📶 Pemantauan Kuota Fonnte <button class="btn soft sm" onclick="muatFonnte()">↻ Periksa kuota sekarang</button></div><div class="pb">'+
   '<div class="note">Pemeriksaan otomatis dilakukan 1 kali sehari pukul <b>06.20 WIB</b> untuk setiap token Fonnte milik sekolah aktif. Tombol ini juga dapat menjalankan pemeriksaan kuota langsung ke Fonnte untuk semua akun aktif; hanya membaca profil perangkat dan tidak mengirim pesan WhatsApp. Riwayat disimpan selama 7 hari.</div>'+
   '<div class="tb">Filter sekolah: '+pilih+'</div>'+
   '<div class="cards">'+kartu(angka(sisa),'Total sisa kuota',sukses.length+' dari '+perangkat.length+' perangkat berhasil diperiksa')+
   kartu(pemakaian.length?angka(pakai):'—','Pemakaian harian',pemakaian.length?'Berdasarkan data pembanding':'Menunggu pemeriksaan hari berikutnya')+
   kartu(terhubung,'Perangkat terhubung', 'Dari '+sukses.length+' perangkat yang berhasil diperiksa')+
   kartu(gagal,'Pemeriksaan gagal',gagal?'Perlu diperiksa':'Tidak ada kegagalan')+'</div>'+
   '<div class="note">Pemeriksaan terakhir: <b>'+waktu(last)+'</b>. '+(daftarSekolah+' sekolah aktif terdaftar dalam sistem.')+'</div>'+
   '<div class="tbkh">Sisa kuota setiap perangkat</div>'+
   (deviceRows?tab(['Sekolah','Token/perangkat','Nomor perangkat','Sisa kuota','Jumlah pesan','Masa berlaku','Status','Terakhir diperiksa'],deviceRows):'<div class="note">Belum ada token Fonnte atau belum ada hasil pemeriksaan.</div>')+
   '<div class="tbkh">Riwayat pemakaian kuota · 7 hari terakhir</div>'+
   (histRows?tab(['Sekolah','Tanggal','Sisa kuota','Pemakaian','Kuota ditambahkan','Jumlah pesan','Masa berlaku','Status'],histRows):'<div class="note">Riwayat belum tersedia. Data awal akan muncul setelah pemeriksaan otomatis pertama.</div>')+
   '<div class="note">Pemakaian harian dihitung dari selisih jumlah pesan kumulatif Fonnte. Jika penghitung pesan direset, sistem menggunakan perubahan sisa kuota sebagai perkiraan. Pengisian ulang kuota dicatat terpisah dan tidak dianggap sebagai pemakaian.</div>'+
 '</div></div>';
}
function devPemantauanAI(){
 const d=S.devAI;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat pemantauan AI...</div></div></div>';
 if(d.error)return '<div class="panel"><div class="ph">🤖 Pemantauan AI</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ '+esc(d.error)+'</div><button class="btn soft sm" onclick="muatAI()">↻ Coba lagi</button></div></div>';
 const r=d.ringkasan||{},keys=d.gemini_keys||[],gangguan=d.gangguan||[],antrean=d.antrean||[],pengaman=d.pengaman||[],riwayat=d.riwayat||[],sekolah=r.per_sekolah||[];
 S.devAISekolah=S.devAISekolah||'*';
 const opsi=[{value:'*',label:'Semua sekolah'},...sekolah.map(x=>({value:String(x.sekolah_id),label:x.nama||('Sekolah '+x.sekolah_id)}))];
 const pilih=cpick('aiSekolahPick','sekolah',S.devAISekolah,opsi,'aiPilihSekolah','Pilih sekolah');
 const semua=S.devAISekolah==='*';
 const t=semua?(r.total||{}):(sekolah.find(x=>String(x.sekolah_id)===String(S.devAISekolah))||{});
 const filter=arr=>semua?arr:arr.filter(x=>String(x.sekolah_id)===String(S.devAISekolah));
 const keyNama=id=>{const k=keys.find(x=>Number(x.id)===Number(id));return k?k.label:('Key #'+id)};
 const keyRows=filter(keys).map(x=>'<tr><td><b>'+esc((Array.isArray(x.sekolah)?x.sekolah[0]?.nama:x.sekolah?.nama)||('Sekolah '+x.sekolah_id))+'</b></td><td><b>'+esc(x.label||('Key '+x.id))+'</b><div class="mu">ID '+aiAngka(x.id)+' · urutan '+aiAngka(x.urutan)+'</div></td><td>'+aiStatusKey(x)+'</td><td>'+aiWaktu(x.terakhir_dicoba)+'</td><td>'+aiWaktu(x.terakhir_berhasil)+'</td><td>'+aiWaktu(x.cooldown_until)+'</td><td>'+aiAngka(x.jumlah_permintaan_window)+'</td><td>'+(x.error_permanen?esc(x.detail_error||x.kode_error_terakhir||'Perlu diperbaiki'):esc(x.kode_error_terakhir||'—'))+'</td><td>'+(x.error_permanen?'<button class="btn danger sm" onclick="aiTanganiKey('+Number(x.sekolah_id)+','+Number(x.id)+')">Tandai ditangani</button>':'—')+'</td></tr>').join('');
 const gangguanRows=filter(gangguan).map(x=>'<tr><td><b>'+esc((Array.isArray(x.sekolah)?x.sekolah[0]?.nama:x.sekolah?.nama)||('Sekolah '+x.sekolah_id))+'</b></td><td>'+esc(x.model||'—')+'</td><td>'+aiBadge(x.status_gangguan||'—',x.status_gangguan==='normal'?'Hadir':'Alpa')+'</td><td>'+esc(x.last_key_id?keyNama(x.last_key_id):'—')+'</td><td>'+aiWaktu(x.gangguan_mulai)+'</td><td>'+aiWaktu(x.next_retry_at)+'</td><td>'+esc(x.detail_gangguan||'—')+'</td><td>'+(x.status_gangguan!=='normal'?'<button class="btn soft sm" onclick="aiCobaPulih('+Number(x.sekolah_id)+')">Coba pulihkan</button>':'—')+'</td></tr>').join('');
 const queueRows=filter(antrean).map(x=>'<tr><td>'+aiAngka(x.id)+'</td><td>'+esc((Array.isArray(x.sekolah)?x.sekolah[0]?.nama:x.sekolah?.nama)||('Sekolah '+x.sekolah_id))+'</td><td>'+esc(x.status||'—')+'</td><td>'+aiAngka(x.jumlah_percobaan)+'</td><td>'+esc(x.api_key_id?keyNama(x.api_key_id):'Belum ditetapkan')+'</td><td>'+aiWaktu(x.coba_lagi_pada)+'</td><td>'+aiWaktu(x.dibuat)+'</td></tr>').join('');
 const pengamanRows=filter(pengaman).map(x=>'<tr><td><b>'+esc(x.nama||('Sekolah '+x.sekolah_id))+'</b></td><td>'+esc(x.model||'—')+'</td><td>'+esc(x.status||'Normal')+'</td><td>'+aiAngka(x.permintaan_60_detik)+' / 10</td><td>'+aiAngka(x.consecutive_429)+'</td><td>'+aiWaktu(x.cooldown_until)+'</td><td>'+esc(x.kode_error_terakhir||'—')+'</td></tr>').join('');
 const usageRows=riwayat.map(x=>{const sk=Array.isArray(x.sekolah)?x.sekolah[0]:x.sekolah;return '<tr><td>'+aiWaktu(x.created_at)+'</td><td>'+esc(sk?.nama||('Sekolah '+x.sekolah_id))+'</td><td>'+esc(x.layanan==='analisis'?'Analisis pesan':'Terjemahan')+'</td><td>'+esc(x.model||'—')+'</td><td>'+aiAngka(x.input_tokens)+'</td><td>'+aiAngka(x.output_tokens)+'</td><td><b>'+aiAngka(x.total_tokens)+'</b></td><td>'+(x.status==='berhasil'?aiBadge('Berhasil','Hadir'):x.status==='metadata_tidak_tersedia'?aiBadge('Metadata tidak tersedia','Belum'):aiBadge('Gagal','Alpa'))+(x.kode_error?'<div class="mu">'+esc(x.kode_error)+'</div>':'')+'</td></tr>'}).join('');
 const harian=filter(r.harian_per_sekolah||[]),bulanan=filter(r.bulanan_per_sekolah||[]);
 const periodRows=(arr,k)=>arr.map(x=>'<tr><td>'+esc((Array.isArray(x.sekolah)?x.sekolah[0]?.nama:x.nama)||('Sekolah '+x.sekolah_id))+'</td><td>'+esc(String(x[k]||'').slice(0,10))+'</td><td>'+aiAngka(x.jumlah_permintaan)+'</td><td>'+aiAngka(x.jumlah_berhasil)+'</td><td>'+aiAngka(x.jumlah_gagal)+'</td><td>'+aiAngka(x.input_tokens)+'</td><td>'+aiAngka(x.output_tokens)+'</td><td><b>'+aiAngka(x.total_tokens)+'</b></td></tr>').join('');
 const stat=(n,l)=>'<div class="card stat"><b>'+aiAngka(n)+'</b>'+l+'</div>';
 return '<div class="panel"><div class="ph">🤖 Pemantauan AI <button class="btn soft sm" onclick="muatAI()">↻ Perbarui sekarang</button></div><div class="pb">'+
 '<div class="note">Terakhir diperbarui: '+aiWaktu(d.diperbarui)+'. Tampilan ini hanya membaca status dan statistik. Isi pesan WhatsApp, nama anak, nomor orang tua, dan nilai API key tidak ditampilkan.</div>'+
 '<div class="note"><b>Penting:</b> Gangguan sementara tetap diperiksa dan dipulihkan otomatis. Tombol <b>Tangani &amp; uji ulang</b> hanya untuk API key berstatus Perlu Perbaikan setelah konfigurasi diperbaiki. Status layanan baru kembali normal setelah probe berhasil; pemeriksaan hanya menguji satu key per siklus.</div>'+
 '<div class="cards">'+stat(t.jumlah_permintaan,'Total permintaan')+stat(t.jumlah_berhasil,'Berhasil')+stat(t.jumlah_gagal,'Gagal')+stat(t.total_tokens,'Total token')+stat(t.input_tokens,'Token masuk')+stat(t.output_tokens,'Token keluar')+stat(antrean.length,'Pesan dalam antrean')+'</div>'+
 '<div class="tb">Filter sekolah: '+pilih+'</div>'+
 '<div class="tb" style="flex-wrap:wrap;align-items:center">'+
 '<button class="btn danger sm" '+(semua?'disabled':'')+' onclick="aiHapusRingkasan()">Hapus Ringkasan Harian</button>'+
 '<button class="btn danger sm" '+(semua?'disabled':'')+' onclick="aiHapusRiwayat()">Hapus Riwayat AI</button>'+
 (semua?'<span class="mu">Pilih satu sekolah untuk mengaktifkan penghapusan.</span>':'<span class="mu">Penghapusan hanya berlaku untuk sekolah yang sedang dipilih.</span>')+
 '</div>'+
 '<div class="tbkh">Status setiap API key Gemini</div>'+
 tab(['Sekolah','Akun API','Status','Terakhir dicoba','Terakhir berhasil','Cooldown sampai','Permintaan window','Error terakhir','Tindakan'],keyRows,'Belum ada API key yang tercatat.')+
 '<div class="tbkh">Status gangguan dan pemulihan AI</div>'+
 tab(['Sekolah','Model','Status layanan','Akun terakhir','Gangguan mulai','Percobaan berikutnya','Keterangan','Tindakan'],gangguanRows,'Tidak ada catatan gangguan AI.')+
 '<div class="tbkh">Antrean pemrosesan AI · maksimal 500 pesan terbaru</div>'+
 tab(['ID antrean','Sekolah','Status','Percobaan','API key','Coba lagi','Dibuat'],queueRows,'Antrean kosong.')+
 '<div class="tbkh">Pengaman kuota Gemini</div>'+
 tab(['Sekolah','Model','Status','Permintaan/menit','429 beruntun','Cooldown sampai','Error terakhir'],pengamanRows,'Belum ada status pengaman kuota.')+
 '<div class="tbkh">Pemakaian harian · 31 hari terakhir</div>'+
 tab(['Sekolah','Tanggal','Permintaan','Berhasil','Gagal','Token masuk','Token keluar','Total token'],periodRows(harian,'tanggal'),'Belum ada pemakaian harian.')+
 '<div class="tbkh">Pemakaian bulanan · seluruh periode tersimpan</div>'+
 tab(['Sekolah','Bulan','Permintaan','Berhasil','Gagal','Token masuk','Token keluar','Total token'],periodRows(bulanan,'bulan'),'Belum ada pemakaian bulanan.')+
 '<div class="tbkh">Riwayat pemakaian AI · 200 catatan terbaru</div>'+
 tab(['Waktu','Sekolah','Layanan','Model','Token masuk','Token keluar','Total token','Status'],usageRows,'Belum ada riwayat pemakaian AI.')+
 '<div class="note">Riwayat rinci disimpan maksimal 30 hari. Ringkasan harian dan bulanan dipertahankan. Nilai token mengikuti metadata yang dikembalikan penyedia AI; angka yang tidak tersedia tidak diperkirakan.</div>'+
 '</div></div>';
}
function aiPilihSekolah(v){S.devAISekolah=String(v||'*');renderV()}
async function muatAI(){guard(async()=>{S.devAI=await apiDev({aksi:'pemantauan_ai'});renderV()})}
async function aiTanganiKey(sekolahId,keyId){
 const k=(S.devAI&&S.devAI.gemini_keys||[]).find(x=>Number(x.id)===Number(keyId)&&Number(x.sekolah_id)===Number(sekolahId));
 if(!k||!k.error_permanen)return toast('API Key ini tidak lagi berstatus Perlu Perbaikan',false);
 if(!await konfirmasi('Pastikan konfigurasi API Key '+(k.label||keyId)+' sudah diperbaiki di Pengaturan. Key akan dimasukkan kembali ke antrean pemulihan otomatis. Sistem menguji satu key per siklus dan hanya mengembalikan layanan ke normal setelah probe berhasil. Jika key masih gagal, status Perlu Perbaikan akan muncul kembali. Lanjutkan?',{judul:'Tangani API Key',ya:'Tandai ditangani'}))return;
 guard(async()=>{
  await apiDev({aksi:'tangani_ai_key',sekolah_id:Number(sekolahId),key_id:Number(keyId)});
  S.devAI=await apiDev({aksi:'pemantauan_ai'});
  renderV();toast('Key ditandai ditangani dan dimasukkan ke antrean pemulihan otomatis.');
 });
}
async function aiCobaPulih(sekolahId){
 if(!await konfirmasi('Jadwalkan pemeriksaan pemulihan AI sekarang? Status mode manual tidak akan dinonaktifkan sebelum probe berhasil.',{judul:'Pemeriksaan pemulihan AI',ya:'Jadwalkan pemeriksaan'}))return;
 guard(async()=>{
  await apiDev({aksi:'jadwalkan_pemulihan_ai',sekolah_id:Number(sekolahId)});
  S.devAI=await apiDev({aksi:'pemantauan_ai'});
  renderV();toast('Pemeriksaan pemulihan dijadwalkan.');
 });
}

function aiSekolahUntukHapus(){
 const id=Number(S.devAISekolah);
 if(!Number.isSafeInteger(id)||id<=0)return null;
 const daftar=S.devAI&&S.devAI.ringkasan&&S.devAI.ringkasan.per_sekolah||[];
 const sekolah=daftar.find(x=>Number(x.sekolah_id)===id);
 return sekolah?{id,nama:sekolah.nama||('Sekolah '+id)}:null;
}
async function aiHapusRiwayat(){
 const sekolah=aiSekolahUntukHapus();
 if(!sekolah)return toast('Pilih satu sekolah tertentu pada Filter sekolah terlebih dahulu.',false);
 if(!await konfirmasi('Hapus seluruh riwayat rinci pemakaian AI milik sekolah '+sekolah.nama+'? Ringkasan harian dan bulanan sekolah ini tidak akan ikut terhapus.',{judul:'Hapus Riwayat AI',ya:'Hapus Riwayat',bahaya:1}))return;
 guard(async()=>{const r=await apiDev({aksi:'hapus_riwayat_ai',sekolah_id:sekolah.id});S.devAI=await apiDev({aksi:'pemantauan_ai'});toast('Riwayat AI '+sekolah.nama+' dihapus: '+aiAngka(r.jumlah)+' catatan.');renderV()})
}
async function aiHapusRingkasan(){
 const sekolah=aiSekolahUntukHapus();
 if(!sekolah)return toast('Pilih satu sekolah tertentu pada Filter sekolah terlebih dahulu.',false);
 if(!await konfirmasi('Hapus seluruh ringkasan harian dan agregat bulanan pemakaian AI milik sekolah '+sekolah.nama+'? Riwayat rinci tidak ikut terhapus. Ringkasan lama tidak dapat dibangun ulang otomatis dari riwayat.',{judul:'Hapus Ringkasan AI',ya:'Hapus Ringkasan',bahaya:1}))return;
 guard(async()=>{const r=await apiDev({aksi:'hapus_ringkasan_ai',sekolah_id:sekolah.id});S.devAI=await apiDev({aksi:'pemantauan_ai'});toast('Ringkasan AI '+sekolah.nama+' dihapus: '+aiAngka(r.jumlah)+' baris.');renderV()})
}

function statusAlpa(x){if(x.status_sekolah!=='aktif')return['off','Non-Aktif','Sekolah nonaktif'];if(!x.alpa_aktif)return['off','Non-Aktif','Alpa otomatis dimatikan di Pengaturan sekolah'];
 if(!x.cron_ada)return['err','Error','Jadwal cron belum terbentuk. Tekan Sinkron ulang jadwal'];if(!x.cron_aktif)return['err','Error','Jadwal cron tidak aktif. Tekan Sinkron ulang jadwal'];
 if(x.terakhir_status==='failed')return['err','Error','Eksekusi terakhir gagal: '+(x.terakhir_pesan||'')];
 if(x.notif_status==='failed')return['err','Error','Notifikasi terakhir gagal: '+(x.notif_error||'')];return['ok','Aktif','']}
function devAlpa(){const d=S.devAlpa;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat status alpa otomatis...</div></div></div>';
 if(d.error)return `<div class="panel"><div class="ph">⏰ Alpa Otomatis</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ ${esc(d.error)}<br>Pastikan skrip SQL langkah 6 sudah dijalankan.</div></div></div>`;
 const st=d.map(x=>({x,s:statusAlpa(x)})),n=k=>st.filter(v=>v.s[0]===k).length;
 return `<div class="panel"><div class="ph">⏰ Status Alpa Otomatis <button class="btn soft sm" onclick="sinkronAlpa()">↻ Sinkron ulang jadwal</button></div><div class="pb"><div class="cards"><div class="card stat"><b>${n('ok')}</b>Aktif</div><div class="card stat"><b>${n('off')}</b>Non-Aktif</div><div class="card stat"><b>${n('err')}</b>Error</div></div>
 ${d.length?tab(['Sekolah','Status','Jam','Terakhir jalan','Hari ini','Notifikasi','Keterangan'],st.map(({x,s:v})=>`<tr><td><b>${esc(x.nama)}</b></td><td><span class="badge ${v[0]==='ok'?'Hadir':v[0]==='err'?'Alpa':'Belum'}">${v[1]}</span></td><td>${x.alpa_jam?esc(String(x.alpa_jam).slice(0,5)):'-'}</td><td>${waktuId(x.terakhir_jalan)}</td><td>${x.alpa_aktif?(x.diproses_hari_ini?'✓ Sudah':'Belum'):'-'}</td><td>${esc(x.notif_status||'-')}</td><td>${esc(v[2])}</td></tr>`).join('')):'<div class="mu" style="margin-top:8px">Belum ada sekolah.</div>'}
 <div class="note" style="margin-top:8px">Status Error berarti alpa otomatis sudah diaktifkan tetapi jadwal cron belum terbentuk atau tidak aktif, eksekusi terakhir gagal, atau notifikasi WhatsApp terakhir gagal. Penerima notifikasi alpa: Kepala Sekolah (semua kelas) sebagai penerima utama, lalu setiap wali kelas (kelasnya saja). Kolom Notifikasi dan status hanya mengikuti pengiriman ke Kepala Sekolah; bila pesan ke wali kelas gagal, statusnya tetap berhasil dan alasannya hanya tercatat di kolom terakhir_error.</div></div></div>`}
function statusNL(x){if(x.status_sekolah!=='aktif')return['off','Non-Aktif','Sekolah nonaktif'];if(!x.notif_aktif)return['off','Non-Aktif','Notifikasi libur dimatikan di Pengaturan sekolah'];
 if(!x.cron_ada)return['err','Error','Jadwal cron belum terbentuk. Tekan Sinkron ulang jadwal'];if(!x.cron_aktif)return['err','Error','Jadwal cron tidak aktif. Tekan Sinkron ulang jadwal'];
 if(!x.nomor_ada)return['err','Error','Nomor WhatsApp Kepala Sekolah belum diisi. Silakan lengkapi melalui menu Profil Saya'];if(!x.token_ada)return['err','Error','Token Fonnte belum diisi di Pengaturan > Koneksi'];
 if(x.terakhir_status==='failed')return['err','Error','Eksekusi terakhir gagal: '+(x.terakhir_pesan||'')];
 if(x.notif_status==='failed')return['err','Error','Notifikasi terakhir gagal: '+(x.notif_error||'')];return['ok','Aktif','']}
const NP_STATUS={selesai:['Hadir','Selesai'],sebagian:['Belum','Sebagian'],gagal:['Alpa','Gagal'],dilewati:['Belum','Dilewati'],berjalan:['Belum','Berjalan']};
function devNotifPiket(){const d=S.devNP;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat status notifikasi piket...</div></div></div>';
 if(d.error)return `<div class="panel"><div class="ph">📲 Notifikasi Piket</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ ${esc(d.error)}<br>Pastikan skrip SQL pembaruan_tahap4_notif_piket.sql sudah dijalankan.</div></div></div>`;
 const ls=d.log||[],cr=d.cron||[],ht=d.http||[],lg=d.langganan_sekolah||[];
 const bs=s=>{const v=NP_STATUS[s]||['Belum',s];return `<span class="badge ${v[0]}">${esc(v[1])}</span>`};
 return `<div class="panel"><div class="ph">📲 Notifikasi Piket (push) <button class="btn soft sm" onclick="muatUlangNP()">↻ Muat ulang</button></div><div class="pb"><div class="cards"><div class="card stat"><b>${Number(d.sekolah_aktif)||0}</b>Sekolah aktif</div><div class="card stat"><b>${Number(d.langganan_total)||0}</b>HP terdaftar</div><div class="card stat"><b>${ls.filter(x=>x.status==='gagal').length}</b>Catatan gagal</div></div>
 <div class="tbkh">Tugas otomatis</div><div class="mu" style="margin:-4px 0 8px">Geser tabel ke samping bila kolom belum terlihat seluruhnya.</div>
 ${cr.length?tab(['Tugas','Jadwal (UTC)','Aktif','Terakhir jalan','Hasil'],cr.map(c=>`<tr><td><b>${esc(c.nama)}</b></td><td>${esc(c.jadwal)}</td><td>${c.aktif?'Ya':'Tidak'}</td><td>${c.terakhir?waktuId(c.terakhir.mulai):'-'}</td><td>${c.terakhir?esc(c.terakhir.status)+(c.terakhir.pesan?' · '+esc(c.terakhir.pesan):''):'Belum pernah jalan'}</td></tr>`).join('')):'<div class="note">Tugas cron belum terbentuk. Jalankan skrip SQL tahap 4.</div>'}
 <div class="note" style="margin-top:8px">Pengingat dikirim pukul 18.00 WIB (11.00 UTC) untuk piket besok dan pukul 05.00 WIB (22.00 UTC) untuk piket hari ini.</div>
 <div class="tb" style="flex-wrap:wrap"><button class="btn soft sm" onclick="ujiNotifPiket('malam')">✉ Uji kirim: piket besok</button><button class="btn soft sm" onclick="ujiNotifPiket('pagi')">✉ Uji kirim: piket hari ini</button></div>
 <div class="tbkh">HP terdaftar per sekolah</div>
 ${tab(['Sekolah','HP','Anak','Terakhir berhasil'],lg.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${Number(x.jumlah)||0}</td><td>${Number(x.anak)||0}</td><td>${waktuId(x.terakhir_ok)}</td></tr>`).join(''),'Belum ada HP yang mengaktifkan pengingat.')}
 <div class="tbkh">Catatan pengiriman (3 hari terakhir)</div>
 ${tab(['Mulai','Sekolah','Piket tanggal','Waktu','Status','Anak','HP','Terkirim','Gagal','Dibuang','Durasi','Keterangan'],ls.map(x=>`<tr><td>${waktuId(x.mulai_at)}</td><td><b>${esc(x.nama)}</b></td><td>${esc(x.tanggal_piket)}</td><td>${x.waktu==='malam'?'18.00':'05.00'}</td><td>${bs(x.status)}</td><td>${Number(x.jml_siswa)||0}</td><td>${Number(x.jml_langganan)||0}</td><td>${Number(x.terkirim)||0}</td><td>${Number(x.gagal)||0}</td><td>${Number(x.dibuang)||0}</td><td>${x.durasi_ms!=null?(Number(x.durasi_ms)/1000).toFixed(1)+' dtk':'-'}</td><td>${esc(x.pesan_error||x.alasan||'')}</td></tr>`).join(''),'Belum ada catatan pengiriman.')}
 <div class="tbkh">Respons terakhir dari server pengirim (tersimpan sekitar 6 jam)</div>
 ${tab(['Waktu','Status HTTP','Isi atau galat'],ht.map(x=>`<tr><td>${waktuId(x.dibuat)}</td><td><span class="badge ${Number(x.status)===200?'Hadir':'Alpa'}">${x.status==null?'-':esc(x.status)}</span></td><td>${esc(x.galat||x.isi||'')}</td></tr>`).join(''),'Belum ada respons tercatat.')}
 <div class="note" style="margin-top:8px">Status 401 berarti CRON_RAHASIA di Vercel tidak sama dengan rahasia di Vault. Status 500 biasanya VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, atau VAPID_SUBJECT belum diisi di Vercel. Status Dilewati bukan galat: artinya tidak ada jadwal, hari libur, atau belum ada HP yang mengaktifkan pengingat.</div></div></div>`}
function muatUlangNP(){guard(async()=>{S.devNP=await dbq(db.rpc('developer_notif_piket')).catch(e=>({error:(e&&e.message)||String(e)}));renderV()})}
async function ujiNotifPiket(w){const t=w==='malam'?'piket BESOK':'piket HARI INI';
 if(!await konfirmasi('Kirim notifikasi push SUNGGUHAN untuk '+t+' ke semua HP orang tua yang sudah terdaftar? Catatan pengiriman hari itu akan diganti dan pesan dikirim ulang.',{judul:'Uji kirim notifikasi piket',ya:'Kirim sekarang'}))return;
 guard(async()=>{await dbq(db.rpc('developer_uji_notif_piket',{p_waktu:w}));toast('Permintaan kirim dijalankan. Tunggu beberapa detik lalu tekan Muat ulang untuk melihat hasilnya')})}
const NS_STATUS={selesai:['Hadir','Terkirim'],gagal:['Alpa','Gagal'],dilewati:['Belum','Dilewati'],menunggu:['Belum','Menunggu'],berjalan:['Belum','Berjalan']};

/* ---- Developer: pemantauan HP push (tabel push_langganan) ---- */
let HPF={sek:'',q:'',sel:new Set(),mode:false};
function hpAgen(a){a=String(a||'');const os=/iPhone|iPad|iOS/.test(a)?'iPhone/iPad':/Android/.test(a)?'Android':/Windows/.test(a)?'Windows':/Mac OS X|Macintosh/.test(a)?'Mac':/Linux/.test(a)?'Linux':'Tidak dikenal';
 const br=/Edg\//.test(a)?'Edge':/OPR\/|Opera/.test(a)?'Opera':/SamsungBrowser/.test(a)?'Samsung Browser':/Firefox\//.test(a)?'Firefox':/Chrome\//.test(a)?'Chrome':/Safari\//.test(a)?'Safari':'';return os+(br?' · '+br:'')}
function hpList(){const L=Array.isArray(S.devHP)?S.devHP:[],q=HPF.q.trim().toLowerCase();return L.filter(x=>(!HPF.sek||String(x.sekolah_id)===HPF.sek)&&(!q||String(x.siswa||'').toLowerCase().includes(q)))}
function hpTabelHtml(){const L=hpList(),all=L.length&&L.every(x=>HPF.sel.has(x.id));
 const head=(HPF.mode?[`<input type="checkbox" ${all?'checked':''} onchange="hpPilihSemua(this.checked)" aria-label="Pilih semua">`]:[]).concat(['Sekolah','Anak','Perangkat','Terdaftar','Terakhir berhasil','Gagal','Pilihan push']);
 return tab(head,L.map(x=>`<tr>${HPF.mode?`<td><input type="checkbox" ${HPF.sel.has(x.id)?'checked':''} onchange="hpPilih(${Number(x.id)},this.checked)"></td>`:''}<td>${esc(x.sekolah||'-')}</td><td><b>${esc(x.siswa||'-')}</b></td><td title="${esc(x.agen||'')}">${esc(hpAgen(x.agen))}<div class="mu">${esc(x.layanan||'')}</div></td><td>${waktuId(x.dibuat)}</td><td>${waktuId(x.terakhir_ok)}</td><td>${Number(x.gagal)||0}</td><td>${[['terima_piket','Piket'],['terima_absensi','Absensi'],['terima_tabungan','Tabungan']].filter(k=>x[k[0]]).map(k=>k[1]).join(', ')||'-'}</td></tr>`).join(''),'Tidak ada HP yang cocok.')}
function hpSegarkan(){const e=$('#hpTabel');if(e)e.innerHTML=hpTabelHtml();const b=$('#hpBtnHapus');if(b){const n=HPF.sel.size;b.disabled=!n;b.textContent='🗑 Hapus terpilih ('+n+')'}}
function hpPilih(id,on){on?HPF.sel.add(id):HPF.sel.delete(id);hpSegarkan()}
function hpPilihSemua(on){hpList().forEach(x=>on?HPF.sel.add(x.id):HPF.sel.delete(x.id));hpSegarkan()}
function hpPilihanHapus(){return [...HPF.sel]}
function hpMode(on){HPF.mode=!!on;HPF.sel.clear();renderV()}
async function hpMuat(){S.devHP=await dbq(db.rpc('developer_hp_daftar')).catch(ERR);DEVT.hp={t:Date.now(),v:cmVer}}
async function hpHapus(ids){ids=(ids||[]).filter(Boolean);if(!ids.length)return;
 const ada=(Array.isArray(S.devHP)?S.devHP:[]).filter(x=>ids.includes(x.id)),tx=ids.length===1&&ada[0]?'HP '+(ada[0].siswa||'-')+' ('+(ada[0].sekolah||'-')+')':ids.length+' HP';
 if(!await konfirmasi('Hapus '+tx+' dari daftar push? HP itu tidak lagi menerima notifikasi sampai orang tua mengaktifkannya lagi dari portal.',{judul:'Hapus HP terdaftar',ya:'Hapus',bahaya:1,ikon:'🗑'}))return;
 guard(async()=>{try{const n=await dbq(db.rpc('developer_hp_hapus',{p_ids:ids}));HPF.mode=false;HPF.sel.clear();await hpMuat();toast(Number(n)+' HP dihapus')}finally{renderV()}})}
function devPerangkat(){const d=S.devHP;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat daftar HP...</div></div></div>';
 if(d.error)return `<div class="panel"><div class="ph">📱 HP Terdaftar</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ ${esc(d.error)}<br>Pastikan skrip SQL langkah-hp-push-developer.sql sudah dijalankan di Supabase.</div></div></div>`;
 const sk=new Map();d.forEach(x=>sk.set(String(x.sekolah_id),x.sekolah||('Sekolah '+x.sekolah_id)));
 const n=HPF.sel.size,bermasalah=d.filter(x=>(Number(x.gagal)||0)>0).length,belum=d.filter(x=>!x.terakhir_ok).length;
 return `<div class="panel"><div class="ph">📱 HP Terdaftar (push) <button class="btn soft sm" onclick="guard(async()=>{try{await hpMuat()}finally{renderV()}})">↻ Muat ulang</button></div><div class="pb"><div class="cards"><div class="card stat"><b>${d.length}</b>HP terdaftar</div><div class="card stat"><b>${sk.size}</b>Sekolah</div><div class="card stat"><b>${bermasalah}</b>Pernah gagal kirim</div><div class="card stat"><b>${belum}</b>Belum pernah berhasil</div></div>
 <div class="tb" style="flex-wrap:wrap"><select class="select" onchange="HPF.sek=this.value;hpSegarkan()"><option value="">Semua sekolah</option>${[...sk].map(([id,nm])=>`<option value="${esc(id)}" ${HPF.sek===id?'selected':''}>${esc(nm)}</option>`).join('')}</select><input class="input grow" placeholder="Cari nama anak..." value="${esc(HPF.q)}" oninput="HPF.q=this.value;hpSegarkan()"></div>
 <div class="tb" style="flex-wrap:wrap">${HPF.mode?`<button id="hpBtnHapus" class="btn danger sm" ${n?'':'disabled'} onclick="hpHapus(hpPilihanHapus())">🗑 Hapus terpilih (${n})</button><button class="btn soft sm" onclick="hpMode(false)">Batal</button>`:`<button class="btn soft sm" onclick="hpMode(true)">🗑 Hapus HP</button>`}</div>
 <div id="hpTabel">${hpTabelHtml()}</div>
 <div class="note" style="margin-top:8px">Yang dihapus hanya catatan HP di daftar push, bukan data siswa. Bila orang tua membuka portal dan mengaktifkan notifikasi lagi, HP itu akan terdaftar kembali. Kolom Gagal bertambah tiap pengiriman ke HP itu gagal.</div></div></div>`}
function devNotifSiswa(){const d=S.devNS;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat status notifikasi siswa...</div></div></div>';
 if(d.error)return `<div class="panel"><div class="ph">📲 Notifikasi Siswa</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ ${esc(d.error)}<br>Pastikan skrip SQL pembaruan_tahap5_notif_siswa.sql dan pembaruan_tahap5b_pemantauan_notif_siswa.sql sudah dijalankan.</div></div></div>`;
 const ls=d.antrean||[],cr=d.cron||[],ht=d.http||[],sk=d.sekolah||[],hi=d.hari_ini||{},jx=Array.isArray(S.devNSJam)?S.devNSJam[0]:S.devNSJam,jm=jx&&!jx.error&&jx.mulai!=null&&jx.akhir!=null?jx:null;
 const bs=s=>{const v=NS_STATUS[s]||['Belum',s];return `<span class="badge ${v[0]}">${esc(v[1])}</span>`};
 const JN={absensi:'Absensi',tabungan:'Tabungan'};
 return `<div class="panel dev-ns-panel"><div class="ph">📲 Notifikasi Absensi dan Tabungan (push) <button class="btn soft sm" onclick="muatUlangNS()">↻ Muat ulang</button></div><div class="pb"><div class="cards dev-ns-stats"><div class="card stat"><b>${Number(d.sekolah_absensi)||0}</b>Sekolah: absensi aktif</div><div class="card stat"><b>${Number(d.sekolah_tabungan)||0}</b>Sekolah: tabungan aktif</div><div class="card stat"><b>${Number(d.langganan_total)||0}</b>HP terdaftar</div><div class="card stat"><b>${Number(d.menunggu)||0}</b>Menunggu kirim</div><div class="card stat"><b>${Number(hi.selesai)||0}</b>Terkirim hari ini</div><div class="card stat"><b>${Number(hi.gagal)||0}</b>Gagal hari ini</div></div>
 <div class="tbkh">Tugas otomatis</div>
 ${cr.length?tab(['Tugas','Jadwal (UTC)','Aktif','Terakhir jalan','Hasil'],cr.map(c=>`<tr><td><b>${esc(c.nama)}</b></td><td>${esc(c.jadwal)}</td><td>${c.aktif?'Ya':'Tidak'}</td><td>${c.terakhir?waktuId(c.terakhir.mulai):'-'}</td><td>${c.terakhir?esc(c.terakhir.status)+(c.terakhir.pesan?' · '+esc(c.terakhir.pesan):''):'Belum pernah jalan'}</td></tr>`).join('')):'<div class="note">Tugas cron belum terbentuk. Jalankan skrip SQL tahap 5.</div>'}
 ${jm?`<div class="tbkh">Jam notifikasi (WIB)</div><div class="jam-ns"><label class="mu">Mulai</label>${dt('hour',tpP(Number(jm.mulai)),"simpanJamNS()","",{id:"nsJamMulai",hmin:0,hmax:22})}<label class="mu">Sampai</label>${dt('hour',tpP(Number(jm.akhir)),"simpanJamNS()","",{id:"nsJamAkhir",hmin:1,hmax:23})}</div>
 <div class="note" style="margin-top:8px">Notifikasi dikirim pukul ${String(jm.mulai).padStart(2,'0')} : 00 - ${String(jm.akhir).padStart(2,'0')} : 00 WIB. Absensi atau transaksi yang tercatat sebelum jam mulai (mis. status libur otomatis dini hari) ditahan dan dikirim tepat jam mulai. Yang tercatat setelah ${String(jm.akhir).padStart(2,'0')} : 00 WIB (3 menit sebelum jam akhir, karena jeda kirim sekitar 2 menit) diabaikan dan tidak dikirim keesokan harinya. Pilihan jam langsung tersimpan begitu dipilih, dan jadwal cron ikut disesuaikan otomatis. Server pengirim di Vercel hanya dipanggil bila ada notifikasi yang sudah jatuh tempo.</div>`:`<div class="note" style="margin-top:8px;color:var(--rd)">Pengaturan jam notifikasi belum tersedia${jx&&jx.error?': '+esc(jx.error):''}. Jalankan skrip SQL jam_cron_notif_siswa.sql di Supabase, lalu tekan Muat ulang.</div>`}
 <div class="tbkh">Pemindaian cadangan absensi</div>
 <div class="jam-ns"><label class="mu" for="nsReconAktif">Status rekonsiliasi</label><label style="display:flex;align-items:center;gap:8px;font-weight:700"><input id="nsReconAktif" type="checkbox" ${jx&&jx.rekonsiliasi_aktif===false?'':'checked'} style="width:20px;height:20px;accent-color:#159447"> Aktif</label><label class="mu" for="nsReconInterval">Interval pemeriksaan</label><select id="nsReconInterval" class="select">${[5,10,15,30,60].map(n=>'<option value="'+n+'" '+(Number(jx&&jx.rekonsiliasi_interval_menit||10)===n?'selected':'')+'>Setiap '+n+' menit</option>').join('')}</select></div>
 <div class="note" style="margin-top:8px">Pemeriksaan cadangan hanya mencari absensi izin/sakit hari ini yang belum masuk antrean. Trigger absensi tetap menjadi mekanisme utama. Menonaktifkan rekonsiliasi tidak mematikan pengiriman push maupun trigger utama. Jadwal mengikuti jam notifikasi yang diatur di atas.</div>
 <div class="tb"><button class="btn success sm" onclick="simpanRekonsiliasiNS()">💾 Simpan pengaturan rekonsiliasi</button></div>
 <div class="tb" style="flex-wrap:wrap"><button class="btn soft sm" onclick="prosesAntreanNS()">▶ Proses antrean sekarang</button></div>
 <div class="tbkh">Sekolah dan HP terdaftar</div>
 ${tab(['Sekolah','Absensi','Tabungan','HP','Anak','Pilih absensi','Pilih tabungan','Pilih piket','Terakhir berhasil'],sk.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${x.absensi_aktif?'Aktif':'Mati'}</td><td>${x.tabungan_aktif?'Aktif':'Mati'}</td><td>${Number(x.hp)||0}</td><td>${Number(x.anak)||0}</td><td>${Number(x.hp_absensi)||0}</td><td>${Number(x.hp_tabungan)||0}</td><td>${Number(x.hp_piket)||0}</td><td>${waktuId(x.terakhir_ok)}</td></tr>`).join(''),'Belum ada sekolah aktif.')}
 <div class="tbkh">Antrean terakhir (100 catatan, dikosongkan tiap tengah malam)</div>
 ${tab(['Dibuat','Sekolah','Anak','Jenis','Tanggal','Dikirim setelah','Status','Keterangan'],ls.map(x=>`<tr><td>${waktuId(x.dibuat)}</td><td><b>${esc(x.nama||'')}</b></td><td>${esc(x.anak||'')}</td><td>${esc(JN[x.jenis]||x.jenis)}</td><td>${esc(x.tanggal)}</td><td>${waktuId(x.kirim_setelah)}</td><td>${bs(x.status)}</td><td>${esc(x.hasil||'')}</td></tr>`).join(''),'Belum ada antrean notifikasi.')}
 <div class="tbkh">Respons terakhir dari server pengirim (tersimpan sekitar 6 jam)</div>
 ${tab(['Waktu','Status HTTP','Isi atau galat'],ht.map(x=>`<tr><td>${waktuId(x.dibuat)}</td><td><span class="badge ${Number(x.status)===200?'Hadir':'Alpa'}">${x.status==null?'-':esc(x.status)}</span></td><td>${esc(x.galat||x.isi||'')}</td></tr>`).join(''),'Belum ada respons tercatat.')}
 <div class="note" style="margin-top:8px">Status 401 berarti CRON_RAHASIA di Vercel tidak sama dengan rahasia di Vault. Status 404 berarti alamat di Vault (siswa_notif_url) salah atau api/notif-siswa.js belum terunggah. Status 500 biasanya VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, atau VAPID_SUBJECT belum diisi di Vercel. Dilewati bukan galat: artinya sakelar sekolah atau sakelar Developer dimatikan, data sudah dihapus guru, atau tidak ada HP yang memilih jenis notifikasi itu. Menunggu yang tidak kunjung berubah berarti cron atau alamat Vault bermasalah.</div></div></div>`}
function muatUlangNS(){guard(async()=>{S.devNS=await dbq(db.rpc('developer_notif_siswa')).catch(e=>({error:(e&&e.message)||String(e)}));S.devNSJam=await dbq(db.rpc('developer_jam_notif_siswa')).catch(ERR);renderV()})}
const jamOpsi=(dari,hingga,pilih)=>{let h='';for(let i=dari;i<=hingga;i++)h+=`<option value="${i}" ${i===pilih?'selected':''}>${String(i).padStart(2,'0')} : 00</option>`;return h};
let jamSedangSimpan=false;
function simpanJamNS(){const em=document.getElementById('nsJamMulai'),ea=document.getElementById('nsJamAkhir');if(!em||!ea||jamSedangSimpan)return;
 const m=parseInt(em.value,10),a=parseInt(ea.value,10);
 if(!Number.isInteger(m)||!Number.isInteger(a)||m<0||m>22||a<1||a>23||m>=a){toast('Jam mulai harus lebih kecil dari jam sampai',false);renderV();return}
 jamSedangSimpan=true;
 return guard(async()=>{
  await dbq(db.rpc('developer_atur_jam_notif_siswa',{p_mulai:m,p_akhir:a}));
  S.devNSJam=await dbq(db.rpc('developer_jam_notif_siswa')).catch(ERR);
  S.devNS=await dbq(db.rpc('developer_notif_siswa')).catch(e=>({error:(e&&e.message)||String(e)}));
  toast('Jam notifikasi '+String(m).padStart(2,'0')+' : 00 - '+String(a).padStart(2,'0')+' : 00 WIB tersimpan');renderV();return true
 }).then(async ok=>{jamSedangSimpan=false;if(ok||!document.getElementById('nsJamMulai'))return;S.devNSJam=await dbq(db.rpc('developer_jam_notif_siswa')).catch(ERR);renderV()})}
let rekonsiliasiSedangSimpan=false;
function simpanRekonsiliasiNS(){
 const ea=document.getElementById('nsReconAktif'),ei=document.getElementById('nsReconInterval');
 if(!ea||!ei||rekonsiliasiSedangSimpan)return;
 const aktif=!!ea.checked,interval=parseInt(ei.value,10);
 if(![5,10,15,30,60].includes(interval)){toast('Interval rekonsiliasi tidak valid',false);return}
 rekonsiliasiSedangSimpan=true;
 guard(async()=>{
  try{
   await dbq(db.rpc('developer_atur_rekonsiliasi_notif_siswa',{p_aktif:aktif,p_interval_menit:interval}));
   S.devNSJam=await dbq(db.rpc('developer_jam_notif_siswa')).catch(ERR);
   S.devCron=await dbq(db.rpc('developer_cron_daftar')).catch(ERR);
   toast(aktif?'Rekonsiliasi cadangan aktif setiap '+interval+' menit':'Rekonsiliasi cadangan dinonaktifkan; trigger utama tetap aktif');
  }finally{
   rekonsiliasiSedangSimpan=false;
   renderV();
  }
 })
}
function prosesAntreanNS(){guard(async()=>{await dbq(db.rpc('developer_proses_antrean_siswa'));toast('Antrean diproses. Tunggu beberapa detik lalu tekan Muat ulang untuk melihat hasilnya')})}
function devNotifLibur(){const d=S.devNL;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat status notifikasi libur...</div></div></div>';
 if(d.error)return `<div class="panel"><div class="ph">🔔 Notifikasi Libur</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ ${esc(d.error)}<br>Pastikan skrip SQL notifikasi-libur.sql dan notifikasi-libur-halaman.sql sudah dijalankan.</div></div></div>`;
 const st=d.map(x=>({x,s:statusNL(x)})),n=k=>st.filter(v=>v.s[0]===k).length,hr=x=>x.notif_status?(x.notif_status==='sent'?'✓ Terkirim':x.notif_status==='failed'?'Gagal':'Menunggu'):'-',uj=x=>x.uji_status?(x.uji_status==='sent'?'✓ Terkirim':x.uji_status==='failed'?'Gagal: '+(x.uji_error||''):'Menunggu'):'-';
 return `<div class="panel"><div class="ph">🔔 Status Notifikasi Libur <button class="btn soft sm" onclick="sinkronNotifLibur()">↻ Sinkron ulang jadwal</button></div><div class="pb"><div class="cards"><div class="card stat"><b>${n('ok')}</b>Aktif</div><div class="card stat"><b>${n('off')}</b>Non-Aktif</div><div class="card stat"><b>${n('err')}</b>Error</div></div>
 ${d.length?tab(['Sekolah','Status','Jam','Terakhir jalan','Hari ini','Uji','Keterangan','Aksi'],st.map(({x,s:v})=>`<tr><td><b>${esc(x.nama)}</b></td><td><span class="badge ${v[0]==='ok'?'Hadir':v[0]==='err'?'Alpa':'Belum'}">${v[1]}</span></td><td>${x.notif_jam?esc(String(x.notif_jam).slice(0,5)):'-'}</td><td>${waktuId(x.terakhir_jalan)}</td><td>${hr(x)}</td><td>${esc(uj(x))}</td><td>${esc(v[2])}</td><td>${x.status_sekolah==='aktif'?`<button class="btn soft sm" onclick="ujiNotifLibur(${x.sekolah_id})">✉ Uji</button>`:'-'}</td></tr>`).join('')):'<div class="mu" style="margin-top:8px">Belum ada sekolah.</div>'}
 <div class="note" style="margin-top:8px">Pesan dikirim ke Kepala Sekolah sebagai penerima utama, lalu ke semua anggota aktif sekolah (wakil, operator, dan guru) yang punya nomor WhatsApp valid di profil, bila hari itu ada libur nasional atau libur tanggal yang meliburkan kelas atau sekolah, dan libur mingguan bila sekolah mencentang opsinya. Kolom Hari ini kosong berarti tidak ada libur atau jam kirim belum tercapai. Status Error berarti jadwal cron belum terbentuk atau tidak aktif, nomor atau token belum diisi, eksekusi terakhir gagal, atau pengiriman WhatsApp terakhir gagal. Status hanya mengikuti pengiriman ke Kepala Sekolah; bila pesan ke anggota lain gagal, statusnya tetap berhasil dan alasannya hanya tercatat di kolom terakhir_error. Tombol Uji mengirim pesan uji sungguhan ke Kepala Sekolah tanpa menetapkan libur.</div></div></div>`}
function sinkronNotifLibur(){guard(async()=>{await dbq(db.rpc('developer_sinkron_notif_libur'));await muatDev();toast('Jadwal Notifikasi Libur disinkronkan');renderV()})}
async function ujiNotifLibur(id){const x=(S.devNL||[]).find(r=>r.sekolah_id===id);if(!x)return;if(!await konfirmasi('Kirim pesan uji ke WhatsApp Kepala Sekolah '+x.nama+'? Pesan terkirim sungguhan, tetapi tidak menetapkan libur.',{judul:'Uji notifikasi libur',ikon:'✉️',ya:'Kirim uji'}))return;guard(async()=>{await dbq(db.rpc('developer_uji_notif_libur',{p_sekolah:id}));toast('Pesan uji dikirim. Tekan Muat ulang beberapa detik lagi untuk melihat hasilnya')})}
function sinkronAlpa(){guard(async()=>{await apiDev({aksi:'sinkron_alpa'});await muatDev();toast('Jadwal Alpa Otomatis disinkronkan');renderV()})}
function devHapus(){const last=(S.devLog||[]).find(x=>x.aksi==='beritahu_kepala'),nk=(S.devSek||[]).filter(x=>x.status==='aktif'&&x.kepala_nama).length;
 const ret=RETENSI;
 return `<div class="panel"><div class="ph">📢 1. Pemberitahuan Kepala Sekolah</div><div class="pb"><div class="note">Kirim WhatsApp ke semua Kepala Sekolah aktif (${nk} sekolah) agar mengunduh rekap absensi di menu Pengaturan > Tahun Ajaran sebelum data dihapus. Pesan dikirim lewat perangkat Fonnte Developer.</div><div class="fd"><label class="l">Batas waktu mengunduh (opsional)</label>${dt('date','','','',{id:'bkBatas',min:TODAY,kosong:1,ph:'Pilih tanggal (opsional)'})}</div><div class="mu" style="margin:8px 0">${last?'Terakhir dikirim: '+waktuId(last.waktu)+' ('+esc(last.rincian||'')+')':'Belum pernah dikirim.'}</div><button class="btn success" onclick="beritahuKepala()">📢 Kirim pemberitahuan</button></div></div>
<div class="panel"><div class="ph">🗑 2. Hapus seluruh isi tabel absensi</div><div class="pb"><div class="note" style="color:var(--rd)">Menghapus SELURUH data absensi dari SEMUA sekolah dan tidak bisa dikembalikan. Data siswa, wali, guru, dan kelas tidak ikut terhapus. Lakukan setelah Kepala Sekolah diberi tahu dan sempat mengunduh rekap. Dibutuhkan kata sandi Developer.</div><button class="btn danger" onclick="hapusAbsensi()">🗑 Hapus seluruh data absensi</button></div></div>
<div class="panel"><div class="ph">🗑 3. Hapus seluruh isi tabel tabungan</div><div class="pb"><div class="note">Kirim WhatsApp ke semua Kepala Sekolah aktif (${nk} sekolah) agar mengunduh rekap saldo tabungan di menu Tabungan > Rekap & Laporan sebelum data dihapus.</div><div class="fd"><label class="l">Batas waktu mengunduh (opsional)</label>${dt('date','','','',{id:'bkBatasT',min:TODAY,kosong:1,ph:'Pilih tanggal (opsional)'})}</div><div class="mu" style="margin:8px 0">${(()=>{const l=(S.devLog||[]).find(x=>x.aksi==='beritahu_kepala_tabungan');return l?'Terakhir dikirim: '+waktuId(l.waktu)+' ('+esc(l.rincian||'')+')':'Belum pernah dikirim.'})()}</div><div class="tb"><button class="btn success" onclick="beritahuKepalaTabungan()">📢 Kirim pemberitahuan tabungan</button></div><div class="note" style="color:var(--rd)">Menghapus SELURUH isi tabel tabungan_transaksi dari SEMUA sekolah dan tidak bisa dikembalikan. Data siswa, wali, guru, kelas, dan absensi tidak ikut terhapus. Lakukan setelah Kepala Sekolah sempat mengunduh rekap tabungan. Dibutuhkan kata sandi Developer.</div><button class="btn danger" onclick="hapusTabungan()">🗑 Hapus seluruh data tabungan</button></div></div>
<div class="panel"><div class="ph">🧹 4. Pembersihan otomatis harian</div><div class="pb"><div class="note">Berjalan otomatis setiap hari lewat pg_cron Supabase mulai pukul 00.05 WIB (cleanup-data-harian, fungsi bersihkan_data_lama). Tabel yang aturannya menyebut jam lain dibersihkan oleh tugas terpisah (00.07, 00.08, 00.15, dan 02.30 WIB). Batas dihitung dari awal hari ini pukul 00.00 WIB, jadi 1 hari berarti hanya data hari ini yang disimpan dan data kemarin terhapus pukul 00.05.</div>${tab(['Tabel','Disimpan','Aturan'],ret.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td>${r[1]}</td><td>${esc(r[2])}</td></tr>`).join(''))}<div class="note" style="margin-top:8px">Tidak dibersihkan oleh jadwal harian: absensi, tabungan_transaksi, hafalan_setoran, serta data inti (siswa, wali, guru, kelas, hafalan_item, hafalan_jenis, libur mingguan, pengaturan). Libur tanggal dan libur nasional hanya dihapus setelah tanggalnya lewat, jadi libur hari ini tetap tersimpan sampai tengah malam. Absensi dan tabungan hanya terhapus lewat bagian 2 dan 3 di atas, atau saat Kepala Sekolah memulai tahun ajaran baru; catatan setoran hafalan terhapus saat tahun ajaran baru dimulai.</div><div class="note" style="margin-top:8px"><b>Apa itu CASCADE?</b> Istilah database untuk "ikut terhapus otomatis". Beberapa tabel terhubung ke tabel induknya: push_langganan dan siswa_wali menunjuk ke siswa, dan push_langganan juga menunjuk ke sekolah. Bila baris induk dihapus, baris yang menunjuk ke sana langsung ikut terhapus tanpa perintah tambahan, jadi tidak ada data sisa yang menunjuk ke data yang sudah tidak ada. Contohnya, saat tahun ajaran baru dimulai dan siswa lulus atau nonaktif dihapus, HP orang tua yang terdaftar untuk siswa itu ikut hilang. Orang tua yang anaknya masih lanjut tidak terpengaruh. Tanpa CASCADE, penghapusan siswa akan ditolak selama masih ada baris yang menunjuk ke siswa tersebut.</div></div></div>
${devAlumniPanel()}
${devCronPanel()}`}
function batasId(id){const v=($('#'+id)||{}).value||'';return v?fmt(v):''}
function beritahuKepala(){const nk=(S.devSek||[]).filter(x=>x.status==='aktif'&&x.kepala_nama).length,batas=batasId('bkBatas');
 konfirmasi('Kirim pemberitahuan WhatsApp ke Kepala Sekolah dari '+nk+' sekolah aktif?'+(batas?'\n\nBatas waktu: '+batas:''),{judul:'Kirim pemberitahuan',ya:'Kirim',ikon:'📢'}).then(ok=>{if(!ok)return;
  guard(async()=>{const j=await apiDev({aksi:'beritahu_kepala',batas});await muatDev();toast('Terkirim '+j.terkirim+' dari '+j.total+(j.gagal?', gagal '+j.gagal:'')+(j.tanpa_nomor?', tanpa nomor '+j.tanpa_nomor:''));renderV()})})}
function hapusAbsensi(){form('Hapus seluruh data absensi',[{k:'kf',l:'Ketik HAPUS ABSENSI untuk melanjutkan'},{k:'sandi',l:'Kata sandi akun Developer',t:'password',pkb:1}],async v=>{
  const kirim=l=>apiDev({aksi:'hapus_absensi',konfirmasi:v.kf,...bodyBukti(v.sandi),lanjut_tanpa_pemberitahuan:!!l});
  let j;try{j=await kirim(false)}catch(e){
   if(e.message!=='BELUM_ADA_PEMBERITAHUAN')throw e;
   const ok=await konfirmasi('Anda belum mengirim pemberitahuan kepada Kepala Sekolah dalam 3 hari terakhir, jadi mereka mungkin belum sempat mengunduh rekap. Tetap hapus sekarang?',{judul:'Belum ada pemberitahuan',ya:'Tetap hapus',bahaya:1});if(!ok)return;j=await kirim(true)}
  await muatDev();toast('Seluruh data absensi dihapus ('+j.jumlah+' baris)');renderV()});$('#ms').textContent='Hapus semua'}
function beritahuKepalaTabungan(){const nk=(S.devSek||[]).filter(x=>x.status==='aktif'&&x.kepala_nama).length,batas=batasId('bkBatasT');
 konfirmasi('Kirim pemberitahuan tabungan lewat WhatsApp ke Kepala Sekolah dari '+nk+' sekolah aktif?'+(batas?'\n\nBatas waktu: '+batas:''),{judul:'Kirim pemberitahuan',ya:'Kirim',ikon:'📢'}).then(ok=>{if(!ok)return;
  guard(async()=>{const j=await apiDev({aksi:'beritahu_kepala',batas,jenis:'tabungan'});await muatDev();toast('Terkirim '+j.terkirim+' dari '+j.total+(j.gagal?', gagal '+j.gagal:'')+(j.tanpa_nomor?', tanpa nomor '+j.tanpa_nomor:''));renderV()})})}
function hapusTabungan(){form('Hapus seluruh data tabungan',[{k:'kf',l:'Ketik HAPUS TABUNGAN untuk melanjutkan'},{k:'sandi',l:'Kata sandi akun Developer',t:'password',pkb:1}],async v=>{
  const kirim=l=>apiDev({aksi:'hapus_tabungan',konfirmasi:v.kf,...bodyBukti(v.sandi),lanjut_tanpa_pemberitahuan:!!l});
  let j;try{j=await kirim(false)}catch(e){
   if(e.message!=='BELUM_ADA_PEMBERITAHUAN')throw e;
   const ok=await konfirmasi('Anda belum mengirim pemberitahuan tabungan kepada Kepala Sekolah dalam 3 hari terakhir, jadi mereka mungkin belum sempat mengunduh rekap tabungan. Tetap hapus sekarang?',{judul:'Belum ada pemberitahuan',ya:'Tetap hapus',bahaya:1});if(!ok)return;j=await kirim(true)}
  await muatDev();toast('Data tabungan dihapus ('+j.transaksi+' transaksi)');renderV()});$('#ms').textContent='Hapus semua'}
let devKirimSek='';
function devKirimMuat(){guard(async()=>{await devPastikan(['kirim'],true);renderV()})}

let devPesTab='masuk';
let devPesStatusFilter='';
let devPesModePilih=false;
const devPesPilih=new Set();
function devKirimTab(t){devPesTab=t;devPesPilih.clear();devPesModePilih=false;renderV()}
function devPesMode(t){devPesModePilih=!!t;devPesPilih.clear();renderV()}
function devPesCek(id,on){on?devPesPilih.add(Number(id)):devPesPilih.delete(Number(id));const b=$('#devPesHapusPilih');if(b){b.disabled=!devPesPilih.size;b.textContent='🗑 Hapus terpilih ('+devPesPilih.size+')'}document.querySelectorAll('.devPesBulk').forEach(x=>x.disabled=!devPesPilih.size);const a=$('#devPesAll');if(a){const ids=(S.devPesanMasuk||[]).map(x=>Number(x.id));a.checked=!!ids.length&&ids.every(x=>devPesPilih.has(x));a.indeterminate=devPesPilih.size>0&&!a.checked}}
function devPesSemua(on){(S.devPesanMasuk||[]).forEach(x=>on?devPesPilih.add(Number(x.id)):devPesPilih.delete(Number(x.id)));renderV()}
async function devPesAksi(aksi,ids){
 ids=[...new Set((ids||[]).map(Number).filter(Number.isFinite))];if(!ids.length)return toast('Pilih pesan terlebih dahulu',false);
 const label={selesai:'menandai '+ids.length+' pesan selesai diperiksa',dibalas:'menandai '+ids.length+' pesan sudah dibalas',batal:'membatalkan status balasan '+ids.length+' pesan',hapus:'menghapus '+ids.length+' pesan'}[aksi];
 if(aksi==='hapus'&&!await konfirmasi('Anda akan menghapus permanen '+ids.length+' pesan masuk. Tindakan ini tidak dapat dibatalkan.',{judul:'Hapus pesan masuk',ya:'Hapus pesan',bahaya:1,ikon:'🗑️'}))return;
 return guard(async()=>{
  let q=db.from('pesan_masuk');
  if(aksi==='hapus')await dbq(q.delete().in('id',ids));
  else{
   const patch=aksi==='selesai'?{perlu_dicek:false}:aksi==='dibalas'?{sudah_dibalas:true,dibalas_pada:new Date().toISOString(),perlu_dicek:false}:{sudah_dibalas:false,dibalas_pada:null};
   await dbq(q.update(patch).in('id',ids));
  }
  devPesPilih.clear();await devPastikan(['kirim'],true);renderV();
  toast('Berhasil '+label)
 })
}
async function devPesSatu(aksi,id){return devPesAksi(aksi,[id])}
function devKirim(){
 const d=S.devKirim,sk=S.devSek||[],masuk=Array.isArray(S.devPesanMasuk)?S.devPesanMasuk:[],rows=(d&&Array.isArray(d.baris)?d.baris:[]).filter(r=>r.jenis==='balasan');
 const sekolah=id=>{const x=sk.find(v=>Number(v.id)===Number(id));return x?x.nama:'Sekolah #'+id};
 const opt='<option value="">Semua sekolah</option>'+sk.map(x=>'<option value="'+x.id+'" '+(String(x.id)===devKirimSek?'selected':'')+'>'+esc(x.nama)+(x.status!=='aktif'?' (nonaktif)':'')+'</option>').join('');
 const tabs='<div class="utabs">'+[['masuk','💬 Pesan Masuk'],['balasan','↩️ Riwayat Balasan'],['status','📋 Riwayat Status Terkirim']].map(x=>'<button class="utab'+(devPesTab===x[0]?' on':'')+'" onclick="devKirimTab(\''+x[0]+'\')">'+x[1]+'</button>').join('')+'</div>';
 const head='<div class="panel"><div class="ph">💬 Pesan WA <button class="btn soft sm" onclick="devKirimMuat()">↻ Perbarui</button></div><div class="pb"><label class="l">Tampilkan pesan dari</label><select class="select" onchange="devKirimSek=this.value;devKirimMuat()">'+opt+'</select>'+tabs;
 if(!d)return head+'<div class="note">⏳ Memuat data pesan...</div></div></div>';
 if(d.error)return head+'<div class="note" style="color:var(--rd)">⚠ '+esc(d.error)+'</div></div></div>';
 if(devPesTab==='masuk'){
  const data=masuk.map((r,i)=>{
   const st=r.sudah_dibalas?'<span class="badge Hadir">Sudah dibalas</span>':(r.perlu_dicek?'<span class="badge Terlambat">Perlu diperiksa</span>':'<span class="badge Belum">Belum dibalas</span>');
   const id=Number(r.id),sel=devPesPilih.has(id);
   const aksi='<div class="tb" style="gap:4px;flex-wrap:wrap;margin:0;min-width:210px">'+(!r.perlu_dicek?'<button class="btn soft sm" disabled>✓ Selesai</button>':'<button class="btn soft sm" onclick="devPesSatu(\'selesai\','+id+')">✓ Tandai selesai</button>')+(r.sudah_dibalas?'<button class="btn orange sm" onclick="devPesSatu(\'batal\','+id+')">↶ Batalkan dibalas</button>':'<button class="btn success sm" onclick="devPesSatu(\'dibalas\','+id+')">↩ Tandai dibalas</button>')+'<button class="btn danger sm" onclick="devPesSatu(\'hapus\','+id+')">🗑 Hapus</button></div>';
   return '<tr>'+(devPesModePilih?'<td><input type="checkbox" '+(sel?'checked':'')+' onchange="devPesCek('+id+',this.checked)"></td>':'')+'<td>'+(i+1)+'</td><td><b>'+esc(sekolah(r.sekolah_id))+'</b></td><td style="white-space:nowrap">'+esc(rkJam(r.waktu))+'</td><td style="white-space:nowrap">'+esc(fmtNomor(r.dari_nomor)||r.dari_nomor||'-')+'</td><td style="min-width:260px;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(r.isi||'-')+'</td><td style="min-width:180px;white-space:pre-wrap;overflow-wrap:anywhere">'+esc(r.hasil||'-')+'</td><td>'+st+'</td><td>'+aksi+'</td></tr>';
  }).join('');
  const table=tab([...(devPesModePilih?['<input id="devPesAll" type="checkbox" onchange="devPesSemua(this.checked)" aria-label="Pilih semua">']:[]),'No','Sekolah','Waktu','Nomor Pengirim','Pesan Masuk','Hasil','Status Balasan','Aksi'],data);
  const kontrol=devPesModePilih?'<div class="tb" style="flex-wrap:wrap"><button id="devPesHapusPilih" class="btn danger sm" '+(devPesPilih.size?'':'disabled')+' onclick="devPesAksi(\'hapus\',[...devPesPilih])">🗑 Hapus terpilih ('+devPesPilih.size+')</button><button class="btn soft sm devPesBulk" onclick="devPesAksi(\'selesai\',[...devPesPilih])" '+(devPesPilih.size?'':'disabled')+'>✓ Tandai selesai terpilih</button><button class="btn success sm devPesBulk" onclick="devPesAksi(\'dibalas\',[...devPesPilih])" '+(devPesPilih.size?'':'disabled')+'>↩ Tandai dibalas terpilih</button><button class="btn orange sm devPesBulk" onclick="devPesAksi(\'batal\',[...devPesPilih])" '+(devPesPilih.size?'':'disabled')+'>↶ Batalkan status terpilih</button><button class="btn soft sm" onclick="devPesMode(false)">Selesai memilih</button></div>':'<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm" onclick="devPesMode(true)">☑ Pilih pesan</button></div>';
  return head+'<div class="note">'+masuk.length+' pesan masuk dimuat'+(devKirimSek?' dari sekolah terpilih':' dari seluruh sekolah')+'. Geser tabel ke samping untuk melihat semua kolom. Maksimal 500 pesan terbaru.</div>'+(S.devPesanMasukErr?'<div class="note" style="color:var(--rd)">Pesan masuk gagal dimuat: '+esc(S.devPesanMasukErr)+'</div>':(kontrol+(table||'<div class="mu">Belum ada pesan masuk.</div>')))+'</div></div>';
 }
 if(devPesTab==='status'){
  const semua=Array.isArray(d.baris)?d.baris:[];
  const tampil=devPesStatusFilter?semua.filter(r=>rkTahap(r)===devPesStatusFilter):semua;
  const hitung={};semua.forEach(r=>{const t=rkTahap(r);hitung[t]=(hitung[t]||0)+1});
  const ringkas=['terjadwal','proses','nokabar','terkirim','sampai','terbaca','gagal'].filter(t=>hitung[t]).map(t=>{const z=rkLabel(t);return '<span style="display:inline-block;padding:5px 9px;margin:3px;border:1px solid var(--bd);border-radius:20px;background:#fff">'+z[0]+' '+z[1]+': <b>'+hitung[t]+'</b></span>'}).join('');
  const opsi='<option value="">Semua status</option>'+PES_ST.filter(x=>x[0]).map(x=>'<option value="'+x[0]+'" '+(devPesStatusFilter===x[0]?'selected':'')+'>'+x[1]+'</option>').join('');
  const filter='<div class="tb" style="margin:10px 0"><select class="select" style="min-width:190px" onchange="devPesStatusFilter=this.value;renderV()">'+opsi+'</select><span class="mu">Menampilkan '+tampil.length+' dari '+semua.length+' notifikasi</span></div>';
  const data=tampil.map((r,i)=>{
   const tahap=rkTahap(r),lb=rkLabel(tahap);
   return '<tr><td>'+(i+1)+'</td><td><b>'+esc(sekolah(r.sekolah_id))+'</b></td><td style="white-space:nowrap">'+esc(rkJam(r.dibuat))+'</td><td>'+esc(RK_JENIS[r.jenis]||r.judul||r.jenis||'Notifikasi')+'<div class="mu">'+esc(r.judul||'')+'</div></td><td>'+esc(r.label||'-')+'</td><td style="white-space:nowrap">'+esc(fmtNomor(r.nomor)||r.nomor||'-')+'</td><td style="white-space:nowrap">'+lb[0]+' '+lb[1]+'</td><td>'+rkBaris(r,1)+'</td></tr>';
  }).join('');
  const tabel=tab(['No','Sekolah','Waktu','Jenis Notifikasi','Nama / Keterangan','Penerima','Status','Rincian Status'],data);
  return head+'<div class="note">'+semua.length+' notifikasi dimuat'+(devKirimSek?' dari sekolah terpilih':' dari seluruh sekolah')+'. Data mencakup seluruh jenis pengiriman WhatsApp, bukan hanya balasan pesan wali. Maksimal 1.000 catatan terbaru.</div><div style="margin:8px 0">'+(ringkas||'<span class="mu">Belum ada data status.</span>')+'</div>'+filter+(tabel||'<div class="mu">Belum ada riwayat notifikasi.</div>')+'<div class="mu" style="margin-top:10px">Status diperbarui otomatis melalui webhook Fonnte. ✓ terkirim, ✓✓ sampai, ✓✓ biru terbaca. Riwayat mengikuti masa penyimpanan 7 hari.</div></div></div>';
 }
 const data=rows.slice(0,500).map((r,i)=>{
  const tahap=rkTahap(r),lb=rkLabel(tahap);
  return '<tr><td>'+(i+1)+'</td><td><b>'+esc(sekolah(r.sekolah_id))+'</b></td><td style="white-space:nowrap">'+esc(rkJam(r.dibuat))+'</td><td style="white-space:nowrap">'+esc(fmtNomor(r.nomor)||r.nomor||'-')+'</td><td>'+esc(r.label||'Balasan pesan wali')+'</td><td style="white-space:nowrap">'+lb[0]+' '+lb[1]+'</td><td>'+rkBaris(r,1)+'</td></tr>';
 }).join('');
 const table=tab(['No','Sekolah','Waktu','Penerima','Jenis Pesan','Status Pengiriman','Rincian'],data);
 return head+'<div class="note">'+rows.length+' catatan balasan dimuat'+(devKirimSek?' dari sekolah terpilih':' dari seluruh sekolah')+'. Geser tabel ke samping untuk melihat semua kolom. Maksimal 500 catatan terbaru.</div>'+(table||'<div class="mu">Belum ada riwayat balasan.</div>')+'<div class="mu" style="margin-top:10px">Isi teks balasan belum tersimpan dalam riwayat pengiriman.</div></div></div>';
}
async function devKirimHapus(){const sid=devKirimSek?Number(devKirimSek):null,x=sid?(S.devSek||[]).find(v=>v.id===sid):null,tot=Number(((S.devKirim||{}).ringkas||{}).total)||0;
 if(!tot)return toast('Tidak ada riwayat untuk dihapus',false);
 if(!await konfirmasi('Hapus '+tot+' riwayat kirim '+(x?'milik '+x.nama:'dari SEMUA sekolah')+'?\n\nTidak bisa dikembalikan. Pesan WhatsApp yang sudah terkirim tidak terpengaruh.',{judul:'Hapus riwayat kirim',ya:'Hapus riwayat',bahaya:1}))return;
 guard(async()=>{const j=await dbq(db.rpc('developer_hapus_kirim_log',{p_sekolah:sid}));await devPastikan(['kirim'],true);renderV();toast((Number(j)||0)+' riwayat dihapus')})}
/* ---------- Jadwal cron: dibaca langsung dari pg_cron (RPC developer_cron_daftar), tugas baru otomatis muncul ---------- */
function cronWIB(e){
 const p=String(e||'').trim().split(/\s+/),pad=n=>String(n).padStart(2,'0'),mentah={t:String(e||'-')+' (UTC)',k:99999};
 if(p.length!==5)return mentah;
 const [mi,jm,dom,mo,dow]=p;if(dom!=='*'||mo!=='*'||dow!=='*')return mentah;
 const parseJam=x=>{
  if(/^\d+(,\d+)*$/.test(x))return [...new Set(x.split(',').map(v=>(Number(v)+7)%24))].sort((a,b)=>a-b);
  const m=/^(\d+)-(\d+)$/.exec(x);
  if(m){const a=Number(m[1]),b=Number(m[2]),out=[];for(let h=a;h<=b;h++)out.push((h+7)%24);return [...new Set(out)].sort((a,b)=>a-b)}
  return null;
 };
 const hs=parseJam(jm);if(!hs||!hs.length)return mentah;
 const run=[];hs.forEach(h=>{const l=run[run.length-1];if(l&&l[1]===h-1)l[1]=h;else run.push([h,h])});
 const jam=run.map(r=>r[0]===r[1]?pad(r[0]):pad(r[0])+'-'+pad(r[1])).join(', ');
 let pola='';
 if(mi==='*')pola='Tiap menit';
 else if(/^\d+$/.test(mi))pola='Menit '+mi;
 else {const m=/^\*\/(\d+)$/.exec(mi);if(!m)return mentah;pola=Number(m[1])===1?'Tiap menit':'Setiap '+m[1]+' menit';}
 return{t:pola+', jam '+jam+' WIB',k:hs[0]*60+(mi==='*'?0:/^\d+$/.test(mi)?Number(mi):0)};
}
const CRON_INFO={
 'cleanup-data-harian':['Pembersihan data lama','bersihkan_data_lama'],
 'bersihkan_notif_antrean':['Membersihkan antrean notifikasi siswa','hapus notif_antrean kecuali yang menunggu hari ini'],
 'bersihkan_cron_log':['Mengosongkan riwayat cron','hapus isi cron.job_run_details'],
 'libur-harian':['Menyegarkan data libur','segarkan_libur_data'],
 'bersihkan-alumni':['Membersihkan data alumni lebih dari 2 tahun','bersihkan_alumni'],
 'bersihkan_piket_notif_log':['Membersihkan catatan notifikasi piket lebih dari 3 hari','bersihkan_piket_notif_log'],
 'bersihkan-kirim-log':['Membersihkan riwayat kirim WhatsApp lebih dari 7 hari','bersihkan_kirim_log'],
 'pemakaian-harian':['Memperbarui data penyimpanan','perbarui_pemakaian'],
 'piket_notif_pagi':['Pengingat piket hari ini','kirim_notifikasi_piket(pagi) lalu api/piket-notif'],
 'piket_notif_malam':['Pengingat piket besok','kirim_notifikasi_piket(malam) lalu api/piket-notif'],
 'pengingat_izin_sakit_push':['Pemindaian dan pengiriman pengingat push untuk siswa yang izin/sakit lebih dari satu hari; memeriksa absensi hari ini setiap 5 menit pada pukul 16.00 WIB','jalankan_pengingat_izin_sakit_push'],
 'pengingat_izin_sakit_wa':['Pemeriksaan tindak lanjut WhatsApp pada hari sekolah berikutnya; berjalan setiap 2 menit pada pukul 08.00 WIB','jalankan_pengingat_izin_sakit_wa'],
 'notif_siswa_antrean':['Pemroses antrean push absensi dan tabungan siswa; berjalan setiap menit selama jam notifikasi yang diatur di Notifikasi Siswa','kirim_antrean_notif_siswa lalu api/notif-siswa'],
 'rekonsiliasi_notif_siswa':['Pemindaian cadangan absensi izin/sakit hari ini untuk menemukan notifikasi push yang terlewat; interval dan jam mengikuti pengaturan Notifikasi Siswa','rekonsiliasi_antrean_notif_siswa'],
 'fonnte-kuota-harian':['Pemeriksaan sisa kuota setiap token Fonnte milik semua sekolah aktif; 1 kali sehari pukul 06.20 WIB dan tidak mengirim pesan','fonnte_kuota_mulai'],
 'fonnte-kuota-proses':['Memproses dan menyimpan hasil pemeriksaan kuota Fonnte; berjalan 1 kali sehari pukul 06.25 WIB, setelah permintaan pemeriksaan pukul 06.20 WIB','fonnte_kuota_proses'],
 'notif_siswa_antrean_akhir':['Putaran terakhir pemroses antrean notifikasi siswa pada batas jam akhir notifikasi','kirim_antrean_notif_siswa lalu api/notif-siswa']};
function cronInfo(nama,perintah){let m;const sek=id=>{const x=(S.devSek||[]).find(v=>v.id===Number(id));return x?x.nama:'sekolah #'+id};
 if(/delete\s+from\s+public\.pemakaian_ai_riwayat/i.test(String(perintah||'')))return{ket:'Menghapus riwayat rinci pemakaian AI yang berumur lebih dari 30 hari',fn:'hapus pemakaian_ai_riwayat',dikenal:true};
 if((m=/^alpa-sekolah-(\d+)$/.exec(nama)))return{ket:'Alpa otomatis '+sek(m[1])+' (notifikasi ke Kepala Sekolah dan wali kelas)',fn:'proses_alpa_untuk('+m[1]+')',dikenal:true};
 if((m=/^libur-notif-sekolah-(\d+)$/.exec(nama)))return{ket:'Notifikasi libur '+sek(m[1])+' (Kepala Sekolah dan anggota aktif)',fn:'kirim_notifikasi_libur('+m[1]+')',dikenal:true};
 const i=CRON_INFO[nama];if(i)return{ket:i[0],fn:i[1],dikenal:true};
 const cmd=String(perintah||'').trim();
 const hit=cmd.match(/([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/);
 const fnm=hit?hit[1]:'';
 const sqlKind=cmd.toLowerCase().startsWith('delete')?'Pembersihan data otomatis':cmd.toLowerCase().startsWith('update')?'Pembaruan data otomatis':cmd.toLowerCase().startsWith('insert')?'Pencatatan data otomatis':fnm?'Menjalankan proses otomatis database':'Tugas otomatis database';
 const namaRapi=String(nama||'').replace(/[_-]+/g,' ').trim();
 return{ket:sqlKind+(namaRapi?' untuk '+namaRapi:''),fn:fnm||cmd.slice(0,180)||'Perintah SQL',dikenal:true,otomatis:true}}
function devCronPanel(){const d=S.devCron;
 if(!d)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat daftar cron...</div></div></div>';
 if(d.error)return `<div class="panel"><div class="ph">⏱ Jadwal otomatis (cron)</div><div class="pb"><div class="note" style="color:var(--rd)">⚠ ${esc(d.error)}<br>Pastikan skrip SQL langkah-cron-developer.sql sudah dijalankan di Supabase.</div></div></div>`;
 const L=d.map(c=>({c,w:cronWIB(c.jadwal),i:cronInfo(c.nama,c.perintah)})).sort((a,b)=>a.w.k-b.w.k||String(a.c.nama).localeCompare(String(b.c.nama)));
 const aktif=L.filter(o=>o.c.aktif).length,baru=L.filter(o=>!o.i.dikenal);
 const rows=L.map(({c,w,i})=>{const t=c.terakhir,st=t?(t.status==='succeeded'?'Hadir':t.status==='failed'?'Alpa':'Belum'):'';
  return `<tr><td style="white-space:nowrap"><b>${esc(w.t)}</b></td><td><b>${esc(c.nama||i.ket||('Tugas #'+c.id))}</b>${i.dikenal?'':' <span class="badge Belum">Baru</span>'}</td><td>${esc(i.ket)}${i.dikenal?(i.fn?'<div class="mu">'+esc(i.fn)+'</div>':''):'<div class="mu">'+esc(c.perintah||'')+'</div>'}</td><td>${c.aktif?'Ya':'Tidak'}</td><td>${t?waktuId(t.mulai):'-'}</td><td>${t?`<span class="badge ${st}">${esc(t.status)}</span>`+(t.status!=='succeeded'&&t.pesan?' '+esc(t.pesan):''):'Belum ada catatan'}</td></tr>`}).join('');
 return `<div class="panel"><div class="ph">⏱ Jadwal otomatis (cron) <span class="mu">${L.length} tugas</span> <button class="btn soft sm" onclick="segarDev()">↻ Muat ulang</button></div><div class="pb"><div class="cards"><div class="card stat"><b>${L.length}</b>Total tugas</div><div class="card stat"><b>${aktif}</b>Aktif</div><div class="card stat"><b>${L.length-aktif}</b>Nonaktif</div></div>${baru.length?`<div class="note" style="margin-top:8px;border:2px solid #d99a27">Terdeteksi ${baru.length} tugas cron baru yang belum punya keterangan: <b>${baru.map(o=>esc(o.c.nama)).join(', ')}</b>. Tugas tetap berjalan dan tampil di bawah dengan tanda Baru.</div>`:''}${tab(['Jam (WIB)','Tugas','Keterangan','Aktif','Terakhir jalan','Hasil'],rows,'Belum ada tugas cron.')}<div class="note" style="margin-top:8px">Daftar ini dibaca langsung dari pg_cron di database Supabase, jadi tugas cron yang ditambah, diubah jamnya, atau dinonaktifkan otomatis ikut berubah di sini setelah Muat ulang. Jam sudah dikonversi dari UTC ke WIB. Tugas alpa-sekolah-* dan libur-notif-sekolah-* dibuat satu per sekolah yang mengaktifkan fiturnya. Kolom Terakhir jalan kosong bila tugas belum jalan sejak riwayat cron dikosongkan (tiap 00.08 WIB) atau belum pernah jalan. Hasil berhasil di sini hanya berarti perintah SQL-nya berjalan; hasil pengiriman ke Vercel dipantau di tab Alpa Otomatis dan Notifikasi.</div></div></div>`}
function devLog(){const l=S.devLog||[];
 return `<div class="panel"><div class="ph">📜 Log audit <span class="mu">100 terbaru</span></div><div class="pb">${l.length?tab(['Waktu','Pelaku','Sekolah','Aksi','Rincian'],l.map(x=>`<tr><td>${esc(new Date(x.waktu).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',dateStyle:'short',timeStyle:'short'}))}</td><td>${esc(x.pelaku||'-')}</td><td>${esc(x.sekolah||'-')}</td><td><b>${esc(x.aksi)}</b></td><td>${esc(x.rincian||'')}</td></tr>`).join('')):'<div class="mu">Belum ada catatan.</div>'}</div></div>`}
function devSistem(){const r=chk?chk.r:null,n=l=>r?r.filter(x=>x[0]===l).length:0;
 return `<div class="panel"><div class="ph">🩺 Pemeriksaan sistem <button class="btn" onclick="jalankanCek()">↻ Periksa Sistem</button></div><div class="pb"><div>${r?`<span class="mu">terakhir ${chk.t}: ${n('ok')} baik, ${n('warn')} perhatian, ${n('err')} masalah</span>`:''}</div>${r?tab(['Hasil','Pemeriksaan','Keterangan'],r.map(x=>`<tr><td><span class="badge ${LV[x[0]][0]}">${LV[x[0]][1]}</span></td><td><b>${x[1]}</b></td><td>${esc(x[2])}</td></tr>`).join('')):'<div class="note" style="margin-top:8px">Ketuk Periksa Sistem untuk memeriksa koneksi, tabel, webhook, kamera, dan kelengkapan data.</div>'}</div></div>`}
function jalankanCek(){guard(async()=>{toast('Memeriksa...');chk={t:new Date().toTimeString().slice(0,8),r:await (SEK==null?runChecksDev():runChecks())};renderV();toast('Pemeriksaan selesai')})}
/* Efek klik global tombol dinonaktifkan; animasi khusus menu, dropdown, dan ikon notifikasi tetap terpisah. */
/* ---------- Menu Raport: daftar raport semua siswa per kelas; hapus satu atau banyak sekaligus (batch) ---------- */
const RP={k:'',key:'',rows:[],by:new Map(),sis:[],sel:new Set(),ukuran:200,mode:false,full:new Map(),mem:new Map()};
const rpUrut=(a,b)=>String(b.tahun_ajaran).localeCompare(String(a.tahun_ajaran))||(b.semester-a.semester)||String(b.jenis).localeCompare(String(a.jenis));
function rpBagi(rows){RP.by=new Map();rows.forEach(r=>{if(!RP.by.has(r.siswa_id))RP.by.set(r.siswa_id,[]);RP.by.get(r.siswa_id).push(r)})}
/* satu kali baca untuk seluruh siswa kelas (dibagi per 200 siswa bila kelas sangat besar), bukan per siswa */
async function rpMuat(){
 if(!RP.k&&pnK)RP.k=pnK;
 const k=RP.k,kl=k==='*'?true:pnKl(k),ck='rp|'+k,segar=!!kl&&cmOk(ck,SESI)&&RP.mem.has(ck);
 RP.rows=[];RP.by=new Map();RP.sis=[];RP.sel.clear();if(!segar)RP.full.clear();RP.mode=false;RP.key='';if(!kl)return;
 const sis=k==='*'?urutKelasSiswa():act().filter(s=>s.kelas_id===kl.id).sort((a,b)=>a.nama.localeCompare(b.nama,'id')),ids=sis.map(s=>s.id),v0=cmVer;let rows;
 if(segar)rows=RP.mem.get(ck).slice();
 else{rows=[];
  for(let i=0;i<ids.length;i+=RP.ukuran){const part=ids.slice(i,i+RP.ukuran);rows.push(...await pgAll(()=>db.from('rapor').select('id,siswa_id,kelas_nama,tahun_ajaran,semester,jenis,status,fmt').in('siswa_id',part).order('id')))}
  if(RP.k!==k)return;
  if(v0===cmVer){RP.mem.set(ck,rows.slice());cmCatat(ck,v0)}}
 if(RP.k!==k)return;
 rows.sort(rpUrut);RP.sis=sis;RP.rows=rows;rpBagi(rows);RP.key=k}
V.raport=()=>{
 let h=`<div class="panel"><div class="ph">📄 Raport <span class="mu">Tahun ajaran: ${esc(S.set.tahun_ajaran||'-')}</span></div><div class="pb"><div class="tb tab-choice">${cpick('rpKelasPick','kelas',RP.k,[{value:'*',label:'Semua kelas'}].concat(pkKelasOpt()),'rpPilihK','Pilih kelas')}</div>`;
 const sem=RP.k==='*',kl=sem?true:pnKl(RP.k),bs=s=>sem?pnBoleh(pnKlSiswa(s)):pnBoleh(kl);
 if(!RP.k||!kl)h+=PKH;
 else if(RP.key!==RP.k)h+='<div class="note">⏳ Memuat...</div>';
 else if(!RP.sis.length)h+='<div class="note">Belum ada siswa aktif di kelas ini.</div>';
 else{
  const b=sem?RP.sis.some(bs):pnBoleh(kl),n=RP.rows.length,nt=RP.rows.filter(r=>r.status==='terbit').length;
  h+=`<div class="note">${sem?'<b>Semua kelas</b>':'Kelas <b>'+esc(kl.nama)+'</b>'} · ${RP.sis.length} siswa · ${n} raport (Terbit: <b>${nt}</b> · Draf: <b>${n-nt}</b>).${b?'':'<br>Anda hanya dapat melihat raport kelas ini.'}${sem&&b?'<br>Hapus hanya berlaku untuk kelas yang Anda kelola.':''}</div>`;
  h+=`<div class="tb"><button type="button" class="btn soft sm" onclick="rpSegar()">🔄 Muat ulang data</button></div>`;
  const mode=b&&RP.mode;
  if(b&&n)h+=mode?`<div class="rpbar"><label class="rpall"><input type="checkbox" id="rpAll" class="mh-ck" onchange="rpPilihSemua(this.checked)"> Pilih semua</label><div class="rpbt"><button type="button" id="rpDel" class="btn danger" onclick="rpHapus([...RP.sel])" disabled>🗑 Hapus terpilih (0)</button><button type="button" class="btn soft" onclick="rpMode(false)">Batal</button></div></div>`:`<div class="rpbar"><span class="mu">Tekan 👁 Lihat untuk membuka raport.</span><button type="button" class="btn soft sm" onclick="rpMode(true)">☑ Hapus beberapa sekaligus</button></div>`;
  let _kid=null,_no=0;
  h+=RP.sis.map(s=>{
   const rs=RP.by.get(s.id)||[],bm=bs(s),ganti=s.kelas_id!==_kid,no=ganti?(_kid=s.kelas_id,_no=1,0):_no++,hk=sem&&ganti?(`<div class="tbkh">Kelas ${esc(s.kelas||'-')}</div>`):'';
   const tg=(mode&&bm)?'label':'div',isi=rs.map(r=>`<div class="rpi"><${tg} class="rpl">${(mode&&bm)?`<input type="checkbox" class="mh-ck" data-rp="${r.id}" onchange="rpPilih(${r.id},this.checked)">`:''}<span><b>${esc(r.tahun_ajaran)}</b> · Semester ${esc(r.semester)} · ${esc(r.jenis)}<div class="mu">${esc(r.kelas_nama||'')}${r.fmt==='perkembangan'?' · Perkembangan':''}</div></span></${tg}><span>${r.status==='terbit'?'<span class="badge hadir">Terbit</span>':'<span class="badge terlambat">Draf</span>'}</span><div class="rpa"><button type="button" class="btn soft sm" onclick="rpLihat(${r.id})">👁 Lihat</button>${bm&&!mode?`<button type="button" class="btn soft sm" onclick="rpHapus([${r.id}])">🗑 Hapus</button>`:''}</div></div>`).join('');
   return hk+`<div class="rpk"><div class="rph">${mode&&bm&&rs.length?`<input type="checkbox" class="mh-ck" data-rps="${s.id}" onchange="rpPilihSiswa(${s.id},this.checked)">`:''}<span class="rpn">${no+1}. ${esc(s.nama)}</span><span class="mu">${rs.length} raport</span></div>${isi||'<div class="mu" style="margin-top:6px">Belum ada raport.</div>'}</div>`}).join('');
 }
 return h+'</div></div>'};
LOAD.raport=()=>rpMuat();
function rpPilihK(v){RP.k=v;RP.key='';RP.sel.clear();RP.mode=false;renderV();rpMuat().then(()=>renderV()).catch(e=>toast(dbMsg(e),false))}
function rpSync(){
 document.querySelectorAll('#v [data-rp]').forEach(c=>{c.checked=RP.sel.has(+c.dataset.rp)});
 document.querySelectorAll('#v [data-rps]').forEach(c=>{const ids=(RP.by.get(+c.dataset.rps)||[]).map(r=>r.id),n=ids.filter(i=>RP.sel.has(i)).length;c.checked=!!ids.length&&n===ids.length;c.indeterminate=n>0&&n<ids.length});
 const a=$('#rpAll'),n=RP.sel.size;if(a){a.checked=!!RP.rows.length&&n===RP.rows.length;a.indeterminate=n>0&&n<RP.rows.length}
 const d=$('#rpDel');if(d){d.textContent='🗑 Hapus terpilih ('+n+')';d.disabled=!n}}
function rpPilih(id,on){on?RP.sel.add(id):RP.sel.delete(id);rpSync()}
function rpPilihSiswa(sid,on){(RP.by.get(sid)||[]).forEach(r=>on?RP.sel.add(r.id):RP.sel.delete(r.id));rpSync()}
function rpPilihSemua(on){RP.rows.forEach(r=>on?RP.sel.add(r.id):RP.sel.delete(r.id));rpSync()}

/* muat ulang manual: membuang cache lalu membaca ulang dari database (bila ada perubahan dari perangkat lain) */
function rpSegar(){cmKosong();RP.full.clear();RP.key='';renderV();rpMuat().then(()=>{renderV();toast('Data raport dimuat ulang')}).catch(e=>toast(dbMsg(e),false))}
/* mode hapus beberapa sekaligus: hanya aktif bila tombolnya ditekan */
function rpMode(on){RP.mode=!!on;RP.sel.clear();renderV();rpSync()}
/* ambil satu raport lengkap (nilai, kehadiran, catatan); disimpan sementara supaya tidak membaca ulang */
async function rpAmbil(id){let r=RP.full.get(id);if(r)return r;
 const a=await dbq(db.from('rapor').select('*').eq('id',id));r=(a||[])[0];if(!r)throw new Error('Raport tidak ditemukan, mungkin sudah dihapus.');RP.full.set(id,r);return r}
/* siapkan data gambar raport; desainnya SAMA dengan PDF (rapor.js), jadi yang dilihat = yang diunduh */
async function rpDataD(r){
 const s=siswaById(r.siswa_id)||{},logo=await Rapor.logoPng(S.set&&S.set.logo).catch(()=>null),stempel=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null);
 if(r.fmt==='perkembangan'){
  if(typeof PKR==='undefined'||typeof pkSusun!=='function')throw new Error('Modul raport perkembangan belum termuat, muat ulang halaman.');
  if(!PKR.loaded)await pkMuat();
  if(r.salinan_hash&&!PKR.sal.has(r.salinan_hash)){const a=await dbq(db.from('rapor_salinan').select('hash,isi').eq('hash',r.salinan_hash));(a||[]).forEach(x=>PKR.sal.set(x.hash,x.isi))}
  const wali=ttdWali(r.kelas_nama)||{},kepsek=ttdKepsek(),pg=pkPengelola([wali.id,kepsek.id]),sig=await ttdPngAmbil([wali.id,kepsek.id,pg&&pg.id]);
  return pkSusun(r,logo,{ttd:sig,stempel})
 }
 const wali=ttdWali(r.kelas_nama)||{},kepsek=ttdKepsek(),sig=await ttdPngAmbil([wali.id,kepsek.id]);
 if(wali.id)wali.ttd=sig[wali.id]||null;if(kepsek.id)kepsek.ttd=sig[kepsek.id]||null;
 return Rapor.susun(r,{logo,stempel,sekolah:ns(),alamat:(S.set&&S.set.alamat)||'',kota:kotaTtd(),nama:s.nama,nisn:s.nisn,wali,kepsek})
}
function rpLihatHTML(r,s,b){
 const stt=r.status==='terbit'?'<span class="badge hadir">Terbit</span>':'<span class="badge terlambat">Draf</span>';
 return `<div class="rpv"><div class="note"><b>${esc(s.nama)}</b>${s.nisn?' · NISN '+esc(s.nisn):''}<br>Kelas ${esc(r.kelas_nama||'-')} · TA ${esc(r.tahun_ajaran)} · Semester ${esc(r.semester)} · ${esc(r.jenis)} ${stt}</div>
 <div class="tb" style="flex-wrap:wrap;align-items:center"><button type="button" class="btn soft sm" onclick="rpZoom(-80)">➖ Perkecil</button><button type="button" class="btn soft sm" onclick="rpZoom(80)">➕ Perbesar</button><span class="mu">Geser untuk melihat bagian lain</span></div>
 <div id="rpPrev" class="rpprev"><div class="note">⏳ Menyiapkan raport...</div></div>
 <div class="tb" style="flex-wrap:wrap"><button type="button" class="btn success grow" onclick="rpPdf(${r.id},this)">📄 Unduh PDF</button>${b?`<button type="button" class="btn danger grow" onclick="closeM();rpHapus([${r.id}])">🗑 Hapus</button>`:''}</div></div>`}
function rpZoom(d){RP.lb=Math.max(240,Math.min(1100,(RP.lb||340)+d));const w=$('#rpPrev');if(w)Rapor.lebar(w,RP.lb)}
function rpLihat(id){const kl=RP.k==='*'?true:pnKl(RP.k);if(!kl)return;
 guard(async()=>{const r=await rpAmbil(id),s=siswaById(r.siswa_id);if(!s)throw new Error('Data siswa tidak ditemukan.');
  const D=await rpDataD(r);
  info('Raport '+s.nama,rpLihatHTML(r,s,pnBoleh(RP.k==='*'?pnKlSiswa(s):kl)));$('#md').classList.add('besar');
  const w=$('#rpPrev'),bd=$('#mbd');RP.lb=Math.min(1000,Math.max(240,((w&&w.clientWidth)||((bd&&bd.clientWidth)||360)-24)-20));
  Rapor.pratinjau(w,[D],RP.lb)})}
async function rpPdf(id,btn){let r;try{r=await rpAmbil(id)}catch(e){return toast(e.message||String(e),false)}
 const s=siswaById(r.siswa_id)||{},bersih=t=>String(t||'').replace(/[^\w\-]+/g,'-').replace(/^-+|-+$/g,'');
 return pnPdfBuat([r],x=>({nama:s.nama,nisn:s.nisn,wali:ttdWali(x.kelas_nama),kepsek:ttdKepsek()}),'Raport-'+bersih(s.nama)+'-'+r.jenis+'-S'+r.semester,btn)}
/* hapus satu atau banyak raport: satu permintaan per 200 id (bukan satu per satu) */
async function rpHapus(ids){
 const kl=RP.k==='*'?true:pnKl(RP.k);if(!kl||(RP.k!=='*'&&!pnBoleh(kl)))return toast('Anda tidak punya izin menghapus raport kelas ini',false);
 const ada=new Set(RP.rows.filter(r=>RP.k!=='*'||pnBoleh(pnKlSiswa(siswaById(r.siswa_id)))).map(r=>r.id));ids=[...new Set(ids)].filter(i=>ada.has(i));
 if(!ids.length)return toast('Belum ada raport yang dipilih',false);
 const rs=RP.rows.filter(r=>ids.includes(r.id)),nt=rs.filter(r=>r.status==='terbit').length;
 if(!await konfirmasi('Hapus '+rs.length+' raport dari '+new Set(rs.map(r=>r.siswa_id)).size+' siswa?'+(nt?' '+nt+' di antaranya sudah terbit dan akan hilang dari portal orang tua.':'')+' Tindakan ini tidak bisa dibatalkan.',{bahaya:1,judul:'Hapus raport',ya:'Hapus',ikon:'🗑️'}))return;
 guard(async()=>{
  const gone=new Set();
  try{
   for(let i=0;i<ids.length;i+=RP.ukuran){const r=await dbq(db.from('rapor').delete().in('id',ids.slice(i,i+RP.ukuran)).select('id'));(r||[]).forEach(x=>gone.add(x.id))}
   if(!gone.size)throw new Error('Tidak ada raport yang terhapus. Anda mungkin tidak punya izin hapus, atau data sudah tidak ada.')
  }catch(e){await rpMuat().catch(()=>{});renderV();throw e}
  RP.rows=RP.rows.filter(r=>!gone.has(r.id));rpBagi(RP.rows);gone.forEach(i=>RP.sel.delete(i));
  pnRap=pnRap.filter(r=>!gone.has(r.id));pnKey='';gone.forEach(i=>RP.full.delete(i));
  if(!RP.sel.size)RP.mode=false;
  renderV();rpSync();
  if(gone.size===ids.length)toast(gone.size+' raport dihapus');else toast(gone.size+' dari '+ids.length+' raport terhapus, sisanya ditolak',false)})}

mulai();
/* dashboard: dimuat setiap dibuka (lewat go) dan saat tab/aplikasi kembali terlihat. Tanpa timer. */
let _dashBusy=false;
async function dashSegarkan(){
 if(_dashBusy||!me||view!=='dashboard'||role==='Developer'||document.hidden||scanKunci())return;
 if(Date.now()-_dashT<CM_TTL)return;
 _dashBusy=true;
 try{
  const h=hariIni();if(h!==TODAY){TODAY=h;liburPrompted={};okL={}}
  await Promise.all([muatRange(TODAY,TODAY),muatStatusProfil(),muatRingDash()]);
  _dashT=Date.now();
  const ed=document.activeElement;
  if(view==='dashboard'&&!(ed&&ed.closest&&ed.closest('#v')&&/^(INPUT|TEXTAREA|SELECT)$/.test(ed.tagName)))renderV();
 }catch(e){peringatan('Dashboard gagal disegarkan',e)}
 finally{_dashBusy=false}
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)return;hrMulai();dashSegarkan()});
