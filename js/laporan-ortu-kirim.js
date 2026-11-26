/* ---------- laporan orang tua ---------- */
const catat=p=>p<50?'Mari kita motivasi ananda bersama-sama agar bisa lebih rutin hadir, supaya tidak tertinggal momen seru belajar dan bermain di sekolah.':p<70?'Mari kita semangati ananda agar bulan depan bisa lebih rajin lagi datang ke sekolah dan menikmati aktivitas bersama teman-teman.':p<=90?'Ayo kita terus pacu semangat ananda agar semakin konsisten dan tidak mudah absen dari kegiatan sekolah.':'Yuk pertahankan semangat dan kedisiplinan yang luar biasa ini agar ananda terus ceria dan optimal dalam mengikuti setiap kegiatan.';
function pesanOrtu(s,b){const r=ringkas(s,b,true),ln=r.ds.map((d,i)=>{const st=dayStat(s,d);return (i+1)+'. '+HR[wd(d)]+', '+d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4)+'\n    Status : '+(st==='Belum'?'Belum tercatat':st)}).join('\n');
 return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_ \n\nberikut adalah riwayat kehadiran ananda.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas+'\nBulan : *'+fmtB(b)+'*\ndi '+ns()+'\n\nRingkasan:\n✅ Hadir: '+(r.c.Hadir+r.c.Terlambat)+' hari\n🏖 Libur: '+r.c.Libur+' hari\n📝 Izin: '+r.c.Izin+' hari\n🤒 Sakit: '+r.c.Sakit+' hari\n❌ Alpa: '+r.c.Alpa+' hari\n\n_Persentase kehadiran: *'+r.pct+'%*_\n\n📝*RIWAYAT ABSENSI*\n\n'+(ln||'Belum ada data.')+'\n\n _Catatan :_ \n'+catat(r.pct)+'\n\nTerima kasih 🙏🏻\n _Waalaikumsalam warahmatullahi wabarakatuh_'}
const loList=()=>lo==='*'?act().slice().sort((a,b)=>S.kelas.findIndex(k=>k.nama===a.kelas)-S.kelas.findIndex(k=>k.nama===b.kelas)):act().filter(s=>lo&&s.kelas===lo);
function nomorWAReport(s){const n=String(s.wa||'').replace(/\D/g,''),lokal=n.startsWith('62')?'0'+n.slice(2):n;return nomorHtml(s.wa)+' <button type="button" class="btn soft sm wa-copy-icon" title="Salin nomor WhatsApp" aria-label="Salin nomor WhatsApp" onclick="salinLink(\''+esc(lokal)+'\')">⧉</button>'}
function laporanRows(l){rkMuatStatus('laporan');const z=String(loQ||'').toLowerCase().trim();const f=l.filter(s=>!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z));return f.map((s,i)=>{const r=ringkas(s,lb,true);return `<tr><td>${i+1}</td><td><b>${esc(s.pan)}</b><div class="mu">${esc(s.nama)}${lo==='*'?' · Kelas '+esc(s.kelas||'-'):''}</div></td><td>${esc(s.nisn||'-')}</td><td>${s.wa?nomorWAReport(s):'<span class="badge Sakit">Tanpa nomor</span>'}</td><td>${r.c.Hadir+r.c.Terlambat}H ${r.c.Izin}I ${r.c.Sakit}S ${r.c.Alpa}A ${r.c.Libur}L<div class="mu">${r.pct}% dari ${r.n} hari</div></td><td>${rkSel(s,'laporan','Laporan '+fmtB(lb))}</td><td><button class="btn sm success" ${s.wa?'':'disabled'} onclick="kirimSatu(${s.id})">📤 Kirim Pesan</button> <button class="btn sm soft" onclick="lihatPesan(${s.id})">👁 Lihat Pesan</button></td></tr>`}).join('');}
V.laporanortu=()=>{const l=loList();
 const rows=laporanRows(l);
 return `<div class="panel"><div class="ph">📨 Laporan ke Orang Tua</div><div class="pb"><div class="note">Pesan berisi riwayat kehadiran sebulan penuh setiap anak, ringkasan, dan kalimat penutup sesuai persentase. Laporan dikirim lewat WhatsApp ke nomor orang tua. Setelah selesai, jumlah pesan yang berhasil dan gagal akan ditampilkan.</div>
 <div class="pntb"><button class="btn success" onclick="kirimSemua()">📤 Kirim Semua</button><button class="btn soft" onclick="lihatPesanSemua()">👁 Lihat Pesan</button><button class="btn soft" onclick="riwayatKirim()">📋 Riwayat Kirim</button><button class="btn soft" onclick="rkSegar('laporan',this)">🔄 Perbarui status</button></div>
 <div class="tb">${dt('month',lb,"setLb(this.value)",'lap-date-pick')}<select class="select" onchange="lo=this.value;loQ='';renderV()">${kopt2s(lo)}</select><input id="loCari" class="input grow search-smooth" placeholder="Cari nama anak, panggilan atau NISN..." value="${esc(loQ)}" oninput="cariLaporanInput(this)"></div><div class="tw"><table><thead><tr><th>No</th><th>Anak</th><th>NISN</th><th>WhatsApp</th><th>Rekap</th><th>Status pesan</th><th>Aksi</th></tr></thead><tbody id="loBody">${rows||`<tr><td colspan="7" class="mu" style="text-align:center">Belum ada data.</td></tr>`}</tbody></table></div>${!lo?PKH:''}</div></div>`};
function cariLaporanInput(el){loQ=el.value;const body=$('#loBody');if(body)body.innerHTML=laporanRows(loList());}
function setLb(v){lb=v;guard(async()=>{await muatBulan(v);renderV()})}
function tampilPesan(ket,wa,teks,jml,cat){info('Pratinjau pesan WhatsApp','<div class="mu" style="margin-bottom:6px">'+esc(ket)+'</div><div class="mu" style="margin-bottom:8px">Dikirim ke: <b>'+(wa?esc(waLokal(wa)):'belum ada nomor WA')+'</b>'+(jml>1?' · '+jml+' anak dalam satu pesan':'')+'</div>'+pnBubble(teks)+'<div class="mu" style="margin-top:8px">Isi pesan sama persis dengan yang akan dikirim.'+(cat?' '+esc(cat):'')+'</div>');
 $('#ms').textContent='Salin pesan';$('#ms').style.display='';$('#ms').onclick=async()=>{const ok=await salinLink(teks);ok?toast('Pesan disalin'):toast('Gagal menyalin, coba lagi',false)}}
function lihatPesan(id){const s=siswaById(id);if(!s)return;tampilPesan('Pesan untuk orang tua '+(s.pan||s.nama),s.wa,pesanOrtu(s,lb),1)}
function lihatPesanSemua(){if(!lo)return toast(PK,false);const l=loList();if(!l.length)return toast('Tidak ada anak',false);const s=l.find(x=>x.wa)||l[0];tampilPesan('Contoh pesan (anak pertama '+(lo==='*'?'semua kelas':'kelas '+lo)+': '+(s.pan||s.nama)+'). Tiap anak menerima pesan sendiri.',s.wa,pesanOrtu(s,lb),1)}
function lihatPesanLinkSatu(id){const s=siswaById(id);if(!s||!s.kode_qr)return toast('Link anak belum tersedia',false);tampilPesan('Pesan untuk orang tua '+(s.pan||s.nama),s.wa,pesanLink([s]),1)}
function lihatPesanLinkSemua(){if(!kk)return toast(PK,false);const {g}=grupLink(kelasLink());if(!g.length)return toast('Tidak ada anak yang punya nomor WA orang tua',false);tampilPesan('Contoh pesan (nomor pertama yang akan dikirim)',g[0].wa,pesanLink(g[0].arr),g[0].arr.length)}
function tabLihatPesan(id){const s=siswaById(id);if(!s)return;const d=(tabRekD||[]).find(x=>x.r.siswa_id===id);if(!d)return toast('Data rekap belum dimuat',false);tampilPesan('Pesan untuk orang tua '+(s.pan||s.nama),s.wa,pesanTab(d),1)}
function tabLihatPesanSemua(){const l=(tabRekD||[]).map(d=>siswaById(d.r.siswa_id)).filter(Boolean);if(!l.length)return toast('Tidak ada anak',false);const s=l.find(x=>x.wa)||l[0];tampilPesan('Contoh pesan (anak pertama: '+(s.pan||s.nama)+'). Tiap anak menerima pesan sendiri.',s.wa,tabPesan(s),1)}
async function apiKirim(nomor,teks,meta){const {data:{session}}=await db.auth.getSession();const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,nomor,teks,...(meta||{})})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Gagal ('+r.status+')')}
/* ---- Kirim massal bertahap: jadwal Fonnte, jeda acak 15-30 detik per nomor (diatur di api/kirim.js) ---- */
const KIRIM_BATCH=10,JEDA_RATA2=22.5;
function estJadwal(n){const d=Math.ceil(n*JEDA_RATA2);return d>=60?'sekitar '+Math.ceil(d/60)+' menit':'sekitar '+d+' detik'}
async function apiKirimBatch(items,mulai,meta){const {data:{session}}=await db.auth.getSession();const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,pesan:items.map(x=>({nomor:x.nomor,teks:x.teks,label:x.label,siswa_ids:x.siswa_ids})),mulai:mulai||0,...(meta||{})})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Gagal ('+r.status+')');return j}
async function kirimBertahap(items,meta){const hasil=[];let mulai=0;
 for(let i=0;i<items.length;i+=KIRIM_BATCH){const bag=items.slice(i,i+KIRIM_BATCH);const el=$('#ldt');if(el)el.textContent='Menjadwalkan '+Math.min(i+bag.length,items.length)+' dari '+items.length+'...';
  try{const j=await apiKirimBatch(bag,mulai,meta);const hs=Array.isArray(j.hasil)?j.hasil:[];for(let k=0;k<bag.length;k++)hasil.push(hs[k]||{ok:false,error:'Tidak ada respons'});if(j.berikutnya)mulai=j.berikutnya}
  catch(e){bag.forEach(()=>hasil.push({ok:false,error:(e&&e.message)||String(e)}))}}
 return hasil}

async function apiKirimBatalkanLiburGrup(tanggal) {
 const {data:{session}}=await db.auth.getSession();
 if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');
 const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,aksi:'batalkan_libur_grup',tanggal})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||'Gagal membatalkan pesan grup ('+r.status+')');
 return j;
}

async function apiLiburkanSiswaHariIni(tanggal,kelasIds,keterangan){
 const {data:{session}}=await db.auth.getSession();
 if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');
 const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,aksi:'libur_manual',tanggal,kelas_ids:kelasIds,keterangan})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||'Gagal menjadwalkan notifikasi ('+r.status+')');
 return j;
}

async function kirimLiburGrupHariIni(kelasIds,tanggal) {
 const cfg=RHS&&Array.isArray(RHS.pemetaan)?RHS:await apiPengaturan({aksi:'baca'});
 const relasi=(cfg.pemetaan||[]).filter(x=>kelasIds.includes(Number(x.kelas_id)));
 if(!relasi.length)return {grup:0,terjadwal:0,gagal:0};
 const grupRows=cfg.grup||[];
 const namaSekolah=S.set&&S.set.nama_sekolah?S.set.nama_sekolah:'Sekolah';
 const namaKelas=new Map((S.kelas||[]).map(k=>[Number(k.id),k.nama]));
 const perGrup=new Map();
 for(const r of relasi){
  const g=grupRows.find(x=>Number(x.id)===Number(r.grup_wa_id));
  const nama=namaKelas.get(Number(r.kelas_id));
  if(!g||!g.grup_id||!nama)continue;
  if(!perGrup.has(Number(g.id)))perGrup.set(Number(g.id),{grup:g,kelas:[]});
  const row=perGrup.get(Number(g.id));
  if(!row.kelas.includes(nama))row.kelas.push(nama);
 }
 const tanggalTeks=new Date(tanggal+'T00:00:00+07:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'});
 const teksGrup=kelas=>[
  '🌸 *INFORMASI LIBUR SEKOLAH*',
  '',
  'Assalamu’alaikum warahmatullahi wabarakatuh.',
  '',
  'Yth. Bapak/Ibu Wali Murid,',
  '',
  'Kami informasikan bahwa kegiatan belajar mengajar pada:',
  '',
  '📅 Hari/Tanggal: *'+tanggalTeks+'*',
  '',
  '🏫 Kelas yang diliburkan: *'+kelas.sort((a,b)=>a.localeCompare(b,'id')).join(', ')+'*',
  '',
  'Kegiatan belajar mengajar pada kelas tersebut diliburkan untuk hari ini. Kegiatan belajar kembali dilaksanakan sesuai jadwal sekolah.',
  '',
  'Terima kasih atas perhatian dan kerja sama Bapak/Ibu. 😊',
  '',
  'Wassalamu’alaikum warahmatullahi wabarakatuh.',
  '',
  '🏫 *'+namaSekolah+'*'
 ].join('\n');
 const items=[...perGrup.values()].map(x=>({nomor:x.grup.grup_id,teks:teksGrup(x.kelas),label:'Grup '+(x.grup.label||x.grup.grup_id)}));
 if(!items.length)return {grup:0,terjadwal:0,gagal:0};
 const meta={...rkMeta('libur'),tujuan:'grup',batch:'manual-libur-'+SEK+'-'+tanggal+'-'+kelasIds.join('-')};
 const hasil=await kirimBertahap(items,meta);
 return {grup:items.length,terjadwal:hasil.filter(x=>x&&x.ok).length,gagal:hasil.filter(x=>!x||!x.ok).length};
}

/* ===== Riwayat Kirim (tabel kirim_log; diisi server, status diperbarui webhook Fonnte) ===== */
const RK_JENIS={balasan:'Balasan pesan wali',laporan:'Laporan kehadiran',link:'Link halaman anak',tabungan:'Laporan tabungan',raport:'Tautan raport',libur:'Notifikasi libur',alpa:'Notifikasi alpa',lainnya:'Lainnya'};
function rkMeta(jenis){let judul=RK_JENIS[jenis]||'Pengiriman';try{if(jenis==='laporan')judul='Laporan '+fmtB(lb);else if(jenis==='tabungan')judul='Laporan tabungan '+fmtB(tabBln)}catch(e){}
 const batch=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10);return{jenis,judul,batch}}
function rkWaktu(t){try{return new Date(t).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
function rkIkon(n,biru){const p1='<path d="M1.5 6L4.8 9.3L11.5 2"/>',p2='<path d="M5.5 6L8.8 9.3L15.5 2"/>';return'<svg class="rkck'+(biru?' rkbiru':'')+'" width="17" height="11" viewBox="0 0 18 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(n===2?p1+p2:p1)+'</svg>'}
function rkJam(t){if(!t)return'–';try{const d=new Date(t),z='Asia/Jakarta',tg=x=>x.toLocaleDateString('en-CA',{timeZone:z}),jm=d.toLocaleTimeString('en-GB',{timeZone:z,hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});return(tg(d)===tg(new Date())?'':d.toLocaleDateString('id-ID',{timeZone:z,day:'numeric',month:'short'})+' ')+jm}catch(e){return'–'}}
/* Tahap pesan: terjadwal -> diproses -> terkirim (sent, centang 1) -> sampai (delivered, centang 2) -> terbaca (read, centang 2 biru); gagal */
function rkTahap(r){if(r.status==='gagal')return'gagal';
 const sf=String(r.state_fonnte==null?'':r.state_fonnte).toLowerCase(),tf=String(r.status_fonnte||'').toLowerCase();
 if(r.waktu_terbaca||sf==='read'||sf==='4'||tf==='read')return'terbaca';
 if(r.waktu_sampai||sf==='delivered'||sf==='3'||tf==='delivered')return'sampai';
 if(r.status==='terkirim'||r.waktu_terkirim)return'terkirim';
 const sel=Date.now()-new Date(r.jadwal_pada||r.dibuat).getTime();if(sel<0)return'terjadwal';if(sel>15*60000)return'nokabar';return'proses'}
function rkLabel(t){return{gagal:['❌','Gagal'],terbaca:[rkIkon(2,1),'Terbaca'],sampai:[rkIkon(2),'Sampai'],terkirim:[rkIkon(1),'Terkirim'],proses:['🔄','Diproses'],terjadwal:['⏳','Terjadwal'],nokabar:['❔','Belum ada kabar']}[t]}
function rkChips(list){const c={};list.forEach(r=>{const t=rkTahap(r);c[t]=(c[t]||0)+1});
 return['terjadwal','proses','nokabar','terkirim','sampai','terbaca','gagal'].filter(t=>c[t]).map(t=>{const l=rkLabel(t);return'<span>'+l[0]+' '+l[1]+' '+c[t]+'</span>'}).join('')}
function rkBaris(r,dev){const t=rkTahap(r),lb=rkLabel(t),rank={terkirim:1,sampai:2,terbaca:3}[t]||0;
 const nm=dev?esc(r.label||'-'):esc(r.label||r.nomor);
 let ex='';if(r.error)ex=esc(r.error);else if(dev&&r.status_fonnte)ex='Fonnte: '+esc(r.status_fonnte)+((r.state_fonnte!==null&&r.state_fonnte!=='')?' / state '+esc(r.state_fonnte):'');
 let w='';if(t!=='gagal'){w+='<span>⏳ '+rkJam(r.jadwal_pada||r.dibuat)+'</span>';
  if(rank>=1)w+='<span>'+rkIkon(1)+' '+rkJam(r.waktu_terkirim)+'</span>';
  if(rank>=2)w+='<span>'+rkIkon(2)+' '+rkJam(r.waktu_sampai)+'</span>';
  if(rank>=3)w+='<span>'+rkIkon(2,1)+' '+rkJam(r.waktu_terbaca)+'</span>'}
 return'<div class="rkr"><div>'+nm+(ex?'<small>'+ex+'</small>':'')+(w?'<div class="rkw">'+w+'</div>':'')+'</div><div class="rkt2"><div class="rkt">'+lb[0]+' '+lb[1]+'</div>'+(fmtNomor(r.nomor)?'<div class="rkn">'+esc(fmtNomor(r.nomor))+'</div>':'')+'</div></div>'}
/* ===== Status pesan per anak (kolom di tabel yang punya tombol kirim satu per satu) ===== */
const RKS={};
const pnJudul=()=>'Tautan raport '+pnJenis+' Semester '+pnSem;
const idsDari=s=>Array.isArray(s.arr)?s.arr.map(a=>a.id):[s.id];
function rkCari(s,jenis,judul){const rows=(RKS[jenis]||{}).rows||[],wa=String(s.wa||'').replace(/\D/g,'');
 for(const r of rows){if(judul&&r.judul!==judul&&!(jenis==='raport'&&r.judul==='Tautan raport'))continue;
  if(Array.isArray(r.siswa_ids)&&r.siswa_ids.length){if(r.siswa_ids.some(x=>Number(x)===Number(s.id)))return r}
  else if(wa&&String(r.nomor)===wa&&r.label&&String(r.label).includes(s.pan||s.nama||'\u0000'))return r}
 return null}
function rkSelIsi(s,jenis,judul){const c=RKS[jenis];if(!c||(!c.t&&!c.err))return'<span class="mu">…</span>';if(c.err&&!c.t)return'<span class="mu" title="Status belum bisa dimuat">⚠</span>';
 const r=rkCari(s,jenis,judul);if(!r)return'<span class="mu">–</span>';
 const t=rkTahap(r),lb=rkLabel(t),sudah=t==='terkirim'||t==='sampai'||t==='terbaca';
 const w={terbaca:r.waktu_terbaca,sampai:r.waktu_sampai,terkirim:r.waktu_terkirim}[t]||(sudah?null:(t==='gagal'?r.dibuat:(r.jadwal_pada||r.dibuat)));
 return'<div class="rkt">'+lb[0]+' '+lb[1]+'</div>'+(w?'<div class="mu">'+rkJam(w)+'</div>':'')+(t==='gagal'&&r.error?'<div class="mu">'+esc(r.error)+'</div>':'')}
function rkSel(s,jenis,judul){return'<span class="rks" data-j="'+jenis+'" data-t="'+esc(judul||'')+'" data-s="'+s.id+'">'+rkSelIsi(s,jenis,judul||'')+'</span>'}
function rkIsiSel(){try{document.querySelectorAll('.rks').forEach(el=>{const id=Number(el.dataset.s),s=(S.siswa||[]).find(x=>x.id===id)||{id};el.innerHTML=rkSelIsi(s,el.dataset.j,el.dataset.t||'')})}catch(e){}}
function rkMuatStatus(jenis,paksa){const c=RKS[jenis]||(RKS[jenis]={rows:[],t:0,err:false,load:null});if(c.load)return c.load;if(!paksa&&c.t&&Date.now()-c.t<15000)return Promise.resolve();
 const kol='jenis,judul,label,nomor,status,status_fonnte,state_fonnte,error,jadwal_pada,dibuat,waktu_terkirim,waktu_sampai,waktu_terbaca';
 const q=k=>dbq(db.from('kirim_log').select(k).eq('sekolah_id',SEK).eq('jenis',jenis).order('dibuat',{ascending:false}).limit(500));
 c.load=(async()=>{try{let rows;try{rows=await q(kol+',siswa_ids')}catch(e1){rows=await q(kol)}c.rows=rows||[];c.t=Date.now();c.err=false}catch(e){c.err=true;console.error('Status pesan gagal dimuat:',e)}finally{c.load=null}rkIsiSel()})();return c.load}
async function rkSegar(jenis,btn){if(btn)btn.disabled=true;try{await rkMuatStatus(jenis,true);toast(RKS[jenis]&&RKS[jenis].err?'Status pesan belum bisa dimuat':'Status pesan diperbarui',!(RKS[jenis]&&RKS[jenis].err))}finally{if(btn)btn.disabled=false}}
function rkHtml(rows){if(!rows.length)return'<div class="note">Belum ada riwayat pengiriman. Riwayat muncul setelah tombol kirim dipakai.';
 const waktu=v=>{const t=v?Date.parse(v):NaN;return Number.isFinite(t)?t:0};
 const waktuKirim=r=>waktu(r.waktu_terkirim||r.jadwal_pada||r.dibuat);
 const m=new Map();rows.forEach(r=>{const k=r.batch_id||('tanpa-batch-'+String(r.dibuat||'')+'-'+String(r.nomor||''));if(!m.has(k))m.set(k,[]);m.get(k).push(r)});
 const grup=[...m.values()].map(list=>({list,terbaru:Math.max(...list.map(r=>waktu(r.dibuat))),awal:list.reduce((a,b)=>waktu(a.dibuat)<=waktu(b.dibuat)?a:b)})).sort((a,b)=>b.terbaru-a.terbaru);
 let h='';
 grup.slice(0,15).forEach(({list,awal})=>{
  const chip=(ik,tx,v)=>v?'<span>'+ik+' '+tx+' '+v+'</span>':'';
  const isi=list.slice().sort((a,b)=>waktuKirim(a)-waktuKirim(b)||waktu(a.dibuat)-waktu(b.dibuat));
  h+='<details class="rk"><summary><b>'+esc(awal.judul||RK_JENIS[awal.jenis]||'Pengiriman')+'</b><span class="mu"> · '+esc(rkWaktu(awal.dibuat))+' · '+list.length+' pesan</span><div class="rkc">'
   +rkChips(list)+'</div></summary><div class="rkb">'
   +isi.map(r=>rkBaris(r,0)).join('')+'</div></details>'});
 return h+'<div class="mu">Menampilkan pengiriman terbaru. Penanda seperti WhatsApp: ✓ terkirim, ✓✓ sampai ke HP, ✓✓ biru terbaca. Jam (WIB) dicatat saat kabar diterima server; terbaca hanya muncul bila penerima mengaktifkan tanda baca. Riwayat disimpan 7 hari.</div>'}
async function rkMuat(){try{const rows=await dbq(db.from('kirim_log').select('batch_id,jenis,judul,label,nomor,status,status_fonnte,state_fonnte,error,jadwal_pada,dibuat,waktu_terkirim,waktu_sampai,waktu_terbaca').eq('sekolah_id',SEK).order('dibuat',{ascending:false}).limit(400));
 const el=$('#rkIsi');if(el)el.innerHTML=rkHtml(rows||[])}catch(e){const el=$('#rkIsi');if(el)el.innerHTML='<div class="note">Riwayat belum bisa dibaca: '+esc(e.message||String(e))+'</div>'}}
function riwayatKirim(){info('📋 Riwayat Kirim','<div id="rkIsi"><div class="note">Memuat...</div></div><div class="tb" style="margin-top:12px"><button class="btn soft" onclick="rkMuat()">🔄 Perbarui</button></div>');rkMuat()}
/* ===== akhir Riwayat Kirim ===== */
async function kirimList(list,fn,judul){let ok=0,gagal=[];const JD=list.length>1;const MT=rkMeta(judul==='Hasil pengiriman link'?'link':(fn===tabPesan?'tabungan':'laporan'));ld(1);
 try{if(!JD){const s=list[0];$('#ldt').textContent='Mengirim 1 dari 1...';try{if(!s.wa)throw new Error('tanpa nomor');await apiKirim(s.wa,fn?fn(s):pesanOrtu(s,lb),{...MT,label:s.pan,siswa_ids:idsDari(s)});ok++}catch(e){gagal.push(s.pan+' ('+(e.message||e)+')')}}
 else{const idx=[],items=[];list.forEach((s,i)=>{if(!s.wa){gagal.push(s.pan+' (tanpa nomor)');return}idx.push(i);items.push({nomor:s.wa,teks:fn?fn(s):pesanOrtu(s,lb),label:s.pan,siswa_ids:idsDari(s)})});
  if(items.length){const hs=await kirimBertahap(items,MT);hs.forEach((h,k)=>{if(h&&h.ok)ok++;else gagal.push(list[idx[k]].pan+' ('+((h&&h.error)||'gagal')+')')})}}}finally{ld(0)}
 try{await rkMuatStatus(MT.jenis,true)}catch(e){}
 info(judul||'Hasil pengiriman laporan','<div class="note">'+(JD?'📅 Terjadwal':'✅ Berhasil')+': <b>'+ok+'</b> pesan<br>❌ Gagal: <b>'+gagal.length+'</b> pesan</div>'+(JD&&ok?'<div class="mu">Fonnte mengirim bertahap dengan jeda 15-30 detik per nomor. Halaman boleh ditutup. Status terkirim atau gagal diperbarui otomatis di Riwayat kirim.</div>':'')+(JD?'<div class="tb" style="margin-top:10px"><button class="btn soft" onclick="closeM();setTimeout(riwayatKirim,150)">📋 Lihat riwayat kirim</button></div>':'')+(gagal.length?'<div class="mu">'+gagal.map(esc).join('<br>')+'</div>':''));toast(ok+(JD?' terjadwal, ':' terkirim, ')+gagal.length+' gagal',!gagal.length)}
async function kirimSemua(){if(!lo)return toast(PK,false);const l=loList();if(!l.length)return toast('Tidak ada anak',false);if(await konfirmasi('Kirim laporan '+fmtB(lb)+' ke '+l.length+' orang tua sekarang?'+(l.length>1?'\n\nPesan dijadwalkan bertahap (jeda 15-30 detik per anak), perkiraan semua terkirim '+estJadwal(l.length)+'. Halaman boleh ditutup setelah proses penjadwalan selesai (beberapa detik).':''),{judul:'Kirim semua laporan',ikon:'📤',ya:'Kirim'}))kirimList(l)}
async function kirimSatu(id){const s=siswaById(id);if(await konfirmasi('Kirim laporan '+fmtB(lb)+' '+s.pan+' ke '+s.wa+'?',{judul:'Kirim laporan',ikon:'📤',ya:'Kirim'}))kirimList([s])}
