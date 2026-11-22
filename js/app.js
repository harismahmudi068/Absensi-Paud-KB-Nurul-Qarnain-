
const URL_SB='https://qhlswhoxlxgcvftrzhap.supabase.co',KEY_SB='sb_publishable_j4AB79X1wVZVLgdfcO0sAQ_EMFBq3KN';
/* ---------- spinner hanya untuk tindakan pengelolaan data ---------- */
(function(){let n=0;const asli=window.fetch.bind(window);
 window.fetch=function(){n++;return asli.apply(null,arguments).finally(()=>{n=Math.max(0,n-1)})};
 const aksiData=/^(simpan|tambah|ubah|edit|hapus|keluarkan|impor|import|kirim|setujui|tolak|konfirmasi|terbitkan|buat|perbarui|update)(\b|\s)/i;
 document.addEventListener('click',e=>{const b=e.target&&e.target.closest?e.target.closest('button.btn'):null;
  if(!b||b.disabled||b.classList.contains('busy')||b.classList.contains('download-busy'))return;
  const label=String(b.textContent||'').trim().replace(/^[^\p{L}\p{N}]*/u,'');
  if(!aksiData.test(label))return;
  const t0=Date.now();let tampil=false,selesai=false;
  const cek=()=>{if(selesai||!b.isConnected)return;
   if(Date.now()-t0<700){setTimeout(cek,100);return}
   if(n>0){if(!tampil&&!b.disabled){b.classList.add('busy');tampil=true}setTimeout(cek,120)}
   else{if(tampil)b.classList.remove('busy');selesai=true}
  };
  setTimeout(cek,0);
  setTimeout(()=>{selesai=true;if(tampil&&b.isConnected)b.classList.remove('busy')},20000);
 },true)})();
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
const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function enhanceSecretInputs(root=document){
  const eye=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>`;
  const eyeOff=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3 3.9M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.1-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;
  root.querySelectorAll('input[type="password"]:not([data-eye-ready])').forEach(input=>{
    input.setAttribute('data-eye-ready','1');
    const wrap=document.createElement('div');
    wrap.className='secret-wrap';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='secret-toggle nobusy';
    btn.setAttribute('aria-label','Tampilkan sandi');
    btn.setAttribute('title','Tampilkan sandi');
    btn.innerHTML=eye;
    const toggleSandi=()=>{
      const show=input.type==='password';
      input.type=show?'text':'password';
      btn.innerHTML=show?eyeOff:eye;
      btn.setAttribute('aria-label',show?'Sembunyikan sandi':'Tampilkan sandi');
      btn.setAttribute('title',show?'Sembunyikan sandi':'Tampilkan sandi');
      input.focus({preventScroll:true});
    };
    btn.addEventListener('pointerdown',e=>{
      if(e.button!==undefined && e.button!==0)return;
      e.preventDefault();
      toggleSandi();
    });
    btn.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        toggleSandi();
      }
    });
    wrap.appendChild(btn);
  });
}

enhanceSecretInputs(document);
const _secretObserver=new MutationObserver(m=>{for(const x of m){for(const n of x.addedNodes){if(n.nodeType===1)enhanceSecretInputs(n)}}});
_secretObserver.observe(document.body,{childList:true,subtree:true});
const BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],HR=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const hariIni=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'}),jamJkt=iso=>iso?new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Jakarta'}):'';
let TODAY=hariIni();const ST=['Hadir','Terlambat','Izin','Sakit','Alpa'],cap=s=>s.charAt(0).toUpperCase()+s.slice(1),low=s=>s.toLowerCase();
const fmt=d=>{if(!d)return '';const p=d.split('-');return +p[2]+' '+BLN[p[1]-1]+' '+p[0]},fmtB=b=>{const p=b.split('-');return BLN[p[1]-1]+' '+p[0]},wd=d=>new Date(d+'T00:00:00').getDay();
/* ---------- picker tanggal/bulan/tahun custom ---------- */
const TPI='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
const tpLabel=(t,v,ph)=>v?(t==='hour'?tpP(parseInt(v,10))+' : 00':t==='time'?v:t==='month'?fmtB(v):t==='year'?v:fmt(v)):(ph||(t==='time'||t==='hour'?'Pilih jam':t==='month'?'Pilih bulan':t==='year'?'Pilih tahun':'Pilih tanggal'));
const dt=(type,v,fn,cl='',o={})=>`<div class="tp ${cl}" data-t="${type}"${o.min?` data-min="${o.min}"`:''}${o.max?` data-max="${o.max}"`:''}${o.hmin!=null?` data-hmin="${o.hmin}"`:''}${o.hmax!=null?` data-hmax="${o.hmax}"`:''}${o.kosong?' data-kosong="1"':''}${o.ref?` data-ref="${o.ref}"`:''}${o.ph?` data-ph="${esc(o.ph)}"`:''}><button type="button" class="input tp-btn" onclick="tpBuka(this.parentNode)"><span class="tp-t">${esc(tpLabel(type,v,o.ph))}</span><span class="tp-i">${TPI}</span></button><input type="hidden"${o.id?` id="${o.id}"`:''} value="${v||''}" onchange="${fn||''}"></div>`;
let TP=null;
const tpP=n=>String(n).padStart(2,'0');
function tpEls(){let b=document.getElementById('tpbd');if(!b){b=document.createElement('div');b.id='tpbd';b.onclick=()=>tpTutup();document.body.appendChild(b);const p=document.createElement('div');p.id='tpop';p.setAttribute('role','dialog');p.setAttribute('aria-label','Pilih tanggal');document.body.appendChild(p)}return [b,document.getElementById('tpop')]}
function tpBuka(w){if(TP&&TP.w===w)return tpTutup();tpTutup();const inp=w.querySelector('input[type=hidden]'),t=w.dataset.t||'date',min=w.dataset.min||'2000-01-01',max=w.dataset.max||'2099-12-31',v=inp.value||'';
 let ref=v?(t==='month'?v+'-01':t==='year'?v+'-01-01':v):(w.dataset.ref||TODAY);if(ref<min)ref=min;if(ref>max)ref=max;
 TP={w,inp,t,min,max,v,y:+ref.slice(0,4),m:+ref.slice(5,7)-1,hh:v&&(t==='time'||t==='hour')?parseInt(v.slice(0,2),10)||0:7,mm:v&&t==='time'?+v.slice(3,5):0,hmin:w.dataset.hmin==null?0:parseInt(w.dataset.hmin,10),hmax:w.dataset.hmax==null?23:parseInt(w.dataset.hmax,10),vw:t==='year'?'y':t==='month'?'m':'d',kosong:!!w.dataset.kosong};w.classList.add('open');tpDraw()}
function tpTutup(){const w=TP&&TP.w;TP=null;if(w)w.classList.remove('open');const b=document.getElementById('tpbd'),p=document.getElementById('tpop');if(b)b.classList.remove('show');if(p)p.classList.remove('show')}
function tpLib(d){try{if(S.nasMap&&S.nasMap.has(d))return S.nasMap.get(d);const l=S.libur.find(x=>x.tgl<=d&&d<=(x.sampai||x.tgl)&&!x.kelas);return l?(l.ket||'Libur'):''}catch(e){return ''}}
function tpHtml(){const T=TP,y=T.y,m=T.m,mn=T.min,mx=T.max;let h='';
 if(T.t==='time'||T.t==='hour'){
 const jam=[];for(let i=T.hmin;i<=T.hmax;i++)jam.push(i);
 const roda=(id,label,vals,field)=>'<div class="tp-wheel-col"><div class="tp-wheel-label">'+label+'</div><div class="tp-wheel-frame"><div class="tp-wheel" id="'+id+'" onscroll="tpWheelScroll(this,\''+field+'\')"><div class="tp-wheel-spacer"></div>'+vals.map(i=>'<button type="button" class="tp-wheel-item" data-v="'+i+'" onclick="tpWheelPick(\''+field+'\','+i+',this.parentNode)">'+tpP(i)+'</button>').join('')+'<div class="tp-wheel-spacer"></div></div><div class="tp-wheel-marker" aria-hidden="true"></div></div></div>';
 h+='<div class="tp-wheel-wrap'+(T.t==='hour'?' single':'')+'">'+roda('tpWheelHour','Jam',jam,'hh')+(T.t==='time'?roda('tpWheelMinute','Menit',Array.from({length:60},(_,i)=>i),'mm'):'')+'</div>';
 h+='<div class="tp-f"><button type="button" class="x" onclick="tpTutup()">Tutup</button><button type="button" onclick="tpPilihJam()">Pilih jam</button></div>';return h}
 const nav=(dis1,dis2,judul,vw)=>`<div class="tp-h"><button type="button" class="tp-n" ${dis1?'disabled':''} onclick="tpGeser(-1)" aria-label="Sebelumnya">‹</button><button type="button" class="tp-j" ${vw?`onclick="tpView('${vw}')"`:'disabled'}>${judul}</button><button type="button" class="tp-n" ${dis2?'disabled':''} onclick="tpGeser(1)" aria-label="Berikutnya">›</button></div>`;
 if(T.vw==='d'){
  const off=(new Date(y,m,1).getDay()+6)%7,dim=new Date(y,m+1,0).getDate(),ming=(S.mingguan&&S.mingguan.length)?S.mingguan:[0],pm=y+'-'+tpP(m+1),prev=m===0?(y-1)+'-12':y+'-'+tpP(m),next=m===11?(y+1)+'-01':y+'-'+tpP(m+2);
  h+=nav(prev<mn.slice(0,7),next>mx.slice(0,7),BLN[m]+' '+y,'m');
  h+='<div class="tp-w">'+['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((n,i)=>`<span class="${ming.includes((i+1)%7)?'m':''}">${n}</span>`).join('')+'</div><div class="tp-g">'+'<span></span>'.repeat(off);
  for(let d=1;d<=dim;d++){const iso=pm+'-'+tpP(d),dow=(off+d)%7,lb=tpLib(iso),c=['tp-d'];if(ming.includes(dow))c.push('m');if(iso===TODAY)c.push('t');if(lb)c.push('lb');if(iso===T.v)c.push('s');
   h+=`<button type="button" class="${c.join(' ')}" ${iso<mn||iso>mx?'disabled':''} ${lb?`title="${esc(lb)}"`:''} onclick="tpPilih('${iso}')">${d}</button>`}
  h+='</div>'}
 else if(T.vw==='m'){
  h+=nav(y-1<+mn.slice(0,4),y+1>+mx.slice(0,4),String(y),'y')+'<div class="tp-gm">';
  for(let i=0;i<12;i++){const pf=y+'-'+tpP(i+1),c=['tp-d'];if(pf===TODAY.slice(0,7))c.push('t');if((T.t==='month'&&pf===T.v)||(T.t==='date'&&i===T.m&&T.v&&T.v.slice(0,4)==String(y)))c.push('s');
   h+=`<button type="button" class="${c.join(' ')}" ${pf<mn.slice(0,7)||pf>mx.slice(0,7)?'disabled':''} onclick="tpBulan(${i})">${BLN[i].slice(0,3)}</button>`}
  h+='</div>'}
 else{
  const y0=2000+Math.floor((y-2000)/12)*12;
  h+=nav(y0-1<+mn.slice(0,4),y0+12>+mx.slice(0,4),y0+' – '+(y0+11),'')+'<div class="tp-gm">';
  for(let i=0;i<12;i++){const yy=y0+i,c=['tp-d'];if(yy===+TODAY.slice(0,4))c.push('t');if((T.t==='year'&&String(yy)===T.v)||(T.t!=='year'&&yy===y&&T.v&&T.v.slice(0,4)==String(yy)))c.push('s');
   h+=`<button type="button" class="${c.join(' ')}" ${yy<+mn.slice(0,4)||yy>+mx.slice(0,4)?'disabled':''} onclick="tpTahun(${yy})">${yy}</button>`}
  h+='</div>'}
 const nowV=T.t==='month'?TODAY.slice(0,7):T.t==='year'?TODAY.slice(0,4):TODAY,len=nowV.length,okNow=nowV>=mn.slice(0,len)&&nowV<=mx.slice(0,len);
 h+='<div class="tp-f">'+(okNow?`<button type="button" onclick="tpPilih('${nowV}')">${T.t==='month'?'Bulan ini':T.t==='year'?'Tahun ini':'Hari ini'}</button>`:'')+(T.kosong&&T.v?'<button type="button" onclick="tpPilih(\'\')">Kosongkan</button>':'')+'<button type="button" class="x" onclick="tpTutup()">Tutup</button></div>';
 return h}
function tpDraw(){if(!TP)return;if(!document.body.contains(TP.w))return tpTutup();const [b,p]=tpEls();p.innerHTML=tpHtml();b.classList.add('show');p.classList.add('show');if(TP.t==='time'||TP.t==='hour')tpWheelInit(p);tpPos()}
function tpPos(){const T=TP,p=document.getElementById('tpop');if(!T||!p)return;if(innerWidth<=640){p.style.left='';p.style.top='';return}
 const r=T.w.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;let left=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8),top=r.bottom+8;if(top+h>innerHeight-8)top=Math.max(8,r.top-h-8);p.style.left=left+'px';p.style.top=top+'px'}
function tpGeser(n){const T=TP;if(!T)return;if(T.vw==='d'){T.m+=n;if(T.m<0){T.m=11;T.y--}if(T.m>11){T.m=0;T.y++}}else if(T.vw==='m')T.y+=n;else T.y+=12*n;tpDraw()}
function tpView(v){if(!TP)return;TP.vw=v;tpDraw()}
function tpBulan(i){const T=TP;if(!T)return;if(T.t==='month')return tpPilih(T.y+'-'+tpP(i+1));T.m=i;T.vw='d';tpDraw()}
function tpTahun(yy){const T=TP;if(!T)return;if(T.t==='year')return tpPilih(String(yy));T.y=yy;T.vw='m';tpDraw()}
function tpWheelMark(el,v){el.querySelectorAll('.tp-wheel-item').forEach(b=>b.classList.toggle('selected',Number(b.dataset.v)===v))}function tpWheelInit(p){[['tpWheelHour',TP.hh,TP.hmin],['tpWheelMinute',TP.mm,0]].forEach(([id,val,min])=>{const el=p.querySelector('#'+id);if(el){el.scrollTop=(val-min)*44;tpWheelMark(el,val)}})}function tpWheelScroll(el,field){if(!TP)return;const min=field==='hh'?TP.hmin:0,max=field==='hh'?TP.hmax:59,idx=Math.max(0,Math.min(max-min,Math.round(el.scrollTop/44))),v=min+idx;TP[field]=v;tpWheelMark(el,v)}function tpWheelPick(field,v,el){if(!TP)return;const idx=field==='hh'?v-TP.hmin:v;el.scrollTo({top:idx*44,behavior:'smooth'});TP[field]=v;tpWheelMark(el,v)}function tpPilihJam(){const T=TP;if(!T)return;const nilai=tpP(T.hh)+(T.t==='time'?':'+tpP(T.mm):'');tpPilih(nilai)}function tpPilih(v){const T=TP;if(!T)return;const ada=document.body.contains(T.w);if(ada){T.inp.value=v;T.w.querySelector('.tp-t').textContent=tpLabel(T.t,v,T.w.dataset.ph)}const inp=T.inp;tpTutup();if(ada)inp.dispatchEvent(new Event('change',{bubbles:true}))}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TP)tpTutup()});
window.addEventListener('resize',()=>{if(TP)tpPos()});
window.addEventListener('scroll',e=>{if(TP&&innerWidth>640&&!(e.target&&e.target.nodeType===1&&e.target.closest('#tpop')))tpTutup()},true);
const MENUS=[['dashboard','Dashboard','⌂','KGD'],['absensi','Absensi','✍️','KG'],['scan','Scan','📷','KG'],['tabungan','Tabungan','💰','KG'],['piket','Jadwal Piket','🧹','KG'],['hafalan','Hafalan','📖','KG'],['kartu','Kartu','🪪','KG'],['siswa','Data Siswa','👥','KG'],['kelola','Kelola Siswa','🎓','KG'],['alumni','Alumni','🏅','KG'],['kelasjam','Kelas dan Jam Masuk','🏫','KG'],['guru','Data Guru','👨‍🏫','KG'],['penilaian','Penilaian Siswa','📝','KG'],['raport','Raport','📄','KG'],['rekap','Rekap','📚','KG'],['laporanortu','Laporan Ortu','📨','KG'],['pesan','Pesan WA','💬','KG'],['libur','Jadwal Libur','🥳','KG'],['profil','Profil Saya','👤','KGD'],['tahunajaran','Tahun Ajaran Baru','🎓','K'],['pengaturan','Pengaturan','⚙','K'],['developer','Developer','🛠','D']];
const MENU_GRUP=[['Utama',['dashboard','profil']],['Kegiatan Harian',['absensi','scan','piket','hafalan','tabungan']],['Data Sekolah',['siswa','alumni','kartu','guru','kelasjam']],['Kelola Raport',['kelola','penilaian','raport']],['Laporan &amp; Komunikasi',['rekap','laporanortu','pesan']],['Pengaturan',['tahunajaran','libur','pengaturan']]];
const LBL={kepala_sekolah:'Kepala Sekolah',wakil_kepala:'Wakil Kepala Sekolah',pengelola:'Pengelola/Pengasuh',operator:'Operator',guru:'Guru',developer:'Developer'},KEYR={'Kepala Sekolah':'kepala_sekolah','Wakil Kepala Sekolah':'wakil_kepala','Pengelola/Pengasuh':'pengelola','Operator':'operator','Guru':'guru','Developer':'developer'},RC={'Kepala Sekolah':'K','Wakil Kepala Sekolah':'K','Pengelola/Pengasuh':'K','Operator':'K','Guru':'G','Developer':'D'};
const adalahKepala=()=>role==='Kepala Sekolah'||role==='Wakil Kepala Sekolah'||role==='Pengelola/Pengasuh'||role==='Operator';
const bolehKelolaTtdGuru=()=>!MB()&&['Kepala Sekolah','Wakil Kepala Sekolah','Pengelola/Pengasuh','Operator','Developer'].includes(role);
let S={siswa:[],kelas:[],guru:[],libur:[],mingguan:[],set:{},absen:{},pesan:[],kirim:{}},me=null,meNama='',role='',view='dashboard',attDate=TODAY,attKelas='',draft=null,bulan=TODAY.slice(0,7),rk='',kk='',q='',lo='',lb=TODAY.slice(0,7),chk=null,okL={},liburPrompted={},cam='belakang',scanner=null,busy=false,lastKode='',lastAt=0;
async function dbq(p){const r=await p;if(r.error)throw r.error;return r.data}
let ldn=0;function ld(on,m){ldn=Math.max(0,ldn+(on?1:-1));if(on)$('#ldt').textContent=m||'Memuat...';$('#ld').style.display=ldn?'flex':'none'}
const guard=(fn,q)=>{if(!q)ld(1);return fn().catch(e=>toast((e&&e.message)||String(e),false)).finally(()=>{if(!q)ld(0)})};
/* ---------- Penjaga perubahan yang belum disimpan (konfirmasi Simpan / Abaikan sebelum keluar) ---------- */
const JGM={},JG_TOLAK=/^(Hapus|Tolak|Koreksi|Beritahu|Batalkan|Verifikasi|Atur ulang|Nomor WhatsApp hilang)/i;
const jgEl=ids=>ids.map(i=>document.getElementById(i)).filter(Boolean);
const jgBeda=ids=>jgEl(ids).some(e=>String(e.value||'').trim()!==String(e.defaultValue||'').trim());
const jgReset=ids=>jgEl(ids).forEach(e=>{e.value=e.defaultValue});
const jgDiModal=ids=>jgEl(ids).some(e=>e.closest&&e.closest('#md'));
const jgSnap=r=>Array.prototype.map.call(r.querySelectorAll('input,select,textarea'),e=>(/csel-search|cpick-search/.test(e.className)||e.type==='button')?'':(e.type==='checkbox'||e.type==='radio')?(e.checked?'1':'0'):String(e.value)).join('\u0001');
function absKotor(){if(view!=='absensi'||mMulti||!draft)return false;const b=A(attDate)||{};for(const id in draft){const d=draft[id],o=b[id];if(!o||o.st!==d.st||o.cara!==d.cara||(o.cat||'')!==(d.cat||''))return true}for(const id in b)if(!draft[id])return true;return false}
const JG_TETAP=[
 {id:'absensi',scope:'halaman',ket:'Absensi harian',kotor:()=>absKotor(),simpan:()=>saveAtt(),abaikan:()=>{draft=null}},
 {id:'multi',scope:'halaman',ket:'Absensi multi hari',kotor:()=>view==='absensi'&&mMulti&&(mSel.size>0||(mCat||'').trim()!==''||mStatus!=='Hadir'||mA!==mB||mLewat!==true||mTimpa!==false),simpan:()=>mhTerapkan(),abaikan:()=>{mSel.clear();mStatus='Hadir';mCat='';mA=attDate||TODAY;mB=mA;mLewat=true;mTimpa=false}},
 {id:'ns',ids:['nsInp'],ket:'Nama sekolah',kotor:()=>jgBeda(['nsInp']),simpan:()=>simpanNamaSekolah(document.getElementById('nsBtn')),abaikan:()=>jgReset(['nsInp'])},
 {id:'alamat',ids:['alInp','ktInp'],ket:'Alamat sekolah',kotor:()=>jgBeda(['alInp','ktInp']),simpan:()=>simpanAlamat(null),abaikan:()=>jgReset(['alInp','ktInp'])},
 {id:'koneksi',ids:['rhAI'],ket:'Kunci API AI',kotor:()=>jgBeda(['rhAI']),simpan:()=>simpanKoneksi(null),abaikan:()=>jgReset(['rhAI'])},
 {id:'tabungan',ids:['tbJml','tbCat'],ket:'Transaksi tabungan',kotor:()=>jgBeda(['tbJml','tbCat']),simpan:()=>{const b=document.querySelector('button[onclick^="tabSimpan"]');return b?tabSimpan(/tarik/.test(b.getAttribute('onclick'))?'tarik':'setor'):false},abaikan:()=>jgReset(['tbJml','tbCat'])},
 {id:'kal',scope:'kal',ket:'Kalibrasi cetak belakang',kotor:()=>!!document.getElementById('kal')&&document.getElementById('kal').classList.contains('show')&&(kalT.x!==KAL.x||kalT.y!==KAL.y),simpan:()=>kalSimpan(),abaikan:()=>{kalT={x:KAL.x,y:KAL.y}}}
];
/* modal #md: snapshot isian saat dibuka; dianggap berubah bila isiannya berbeda */
function jagaModal(ket,simpan,aktif){
 if(aktif===false||!simpan){delete JGM.modal;return}
 const b=document.getElementById('mbd'),root=b.firstElementChild,snap=jgSnap(b);
 JGM.modal={id:'modal',scope:'modal',ket:ket||'formulir',simpan,abaikan:()=>{delete JGM.modal},
  kotor:()=>document.getElementById('md').classList.contains('show')&&document.getElementById('mbd').firstElementChild===root&&jgSnap(document.getElementById('mbd'))!==snap}}
/* modal #md dengan penanda berubah sendiri (mis. editor master indikator) */
function jagaKhusus(o){const root=document.getElementById('mbd').firstElementChild,k=o.kotor,a=o.abaikan;
 JGM.modal=Object.assign({id:'modal',scope:'modal'},o,{kotor:()=>document.getElementById('md').classList.contains('show')&&document.getElementById('mbd').firstElementChild===root&&!!k(),abaikan:()=>{try{a&&a()}catch(e){}delete JGM.modal}})}
/* popup berisi isian yang bukan data tersimpan (pendaftaran, tahun ajaran baru, catatan setoran): hanya Abaikan / Kembali mengedit */
function jagaIsian(ket,kotor,abaikan){JGM.modal={id:'modal',scope:'modal',ket,tanpaSimpan:true,simpan:()=>true,
 kotor:()=>document.getElementById('md').classList.contains('show')&&!!kotor(),
 abaikan:()=>{try{abaikan?abaikan():delete JGM.modal}catch(e){}}}}
function jagaKotorList(sel){const out=[];for(const e of JG_TETAP.concat(Object.values(JGM))){let d=false;try{d=!!e.kotor()}catch(x){}if(!d)continue;const sc=e.ids?(jgDiModal(e.ids)?'modal':'halaman'):e.scope;if(sel==='semua'||sel.indexOf(e.id)>-1||sel.indexOf(sc)>-1)out.push(e)}return out}
function jagaDialog(daftar,tanpa){return new Promise(res=>{let m=document.getElementById('jg');
 if(!m){m=document.createElement('div');m.id='jg';m.className='mb';m.style.zIndex='170';
  m.innerHTML='<div class="modal" style="width:min(400px,100%)"><div class="mbody" style="text-align:center;padding:24px 20px 14px"><div style="font-size:42px;line-height:1">💾</div><h3 style="margin:10px 0 6px">Perubahan belum disimpan</h3><div id="jgm" class="mu" style="font-size:14px;white-space:pre-line"></div></div><div class="mf" style="flex-direction:column;justify-content:stretch;gap:8px"><button type="button" class="btn success" id="jgS" style="width:100%">Simpan</button><button type="button" class="btn danger" id="jgA" style="width:100%">Abaikan perubahan</button><button type="button" class="btn soft" id="jgK" style="width:100%">Kembali mengedit</button></div></div>';document.body.appendChild(m)}
 document.getElementById('jgm').textContent=tanpa?'Ada isian yang belum disimpan pada: '+daftar.join(', ')+'.\n\nAbaikan isian ini, atau kembali mengedit?':'Ada perubahan yang belum disimpan pada: '+daftar.join(', ')+'.\n\nSimpan sekarang, atau abaikan perubahan?';
 document.getElementById('jgS').style.display=tanpa?'none':'';
 const kd=e=>{if(e.key==='Escape')fin('kembali')},fin=v=>{document.removeEventListener('keydown',kd);m.classList.remove('show');m.onclick=null;res(v)};
 document.addEventListener('keydown',kd);
 document.getElementById('jgS').onclick=()=>fin('simpan');document.getElementById('jgA').onclick=()=>fin('abaikan');document.getElementById('jgK').onclick=()=>fin('kembali');
 m.onclick=e=>{if(e.target===m)fin('kembali')};m.classList.add('show');document.getElementById('jgK').focus()})}
/* true bila boleh lanjut keluar; false bila pengguna kembali mengedit atau penyimpanan gagal */
async function jagaTanya(sel){const k=jagaKotorList(sel);if(!k.length)return true;
 const p=await jagaDialog(k.map(x=>x.ket),k.every(x=>x.tanpaSimpan));
 if(p==='kembali')return false;
 if(p==='abaikan'){k.forEach(x=>{try{x.abaikan&&x.abaikan()}catch(e){}});return true}
 for(const x of k){if(x.tanpaSimpan)continue;let ok=false;try{ok=!!await x.simpan()}catch(e){toast((e&&e.message)||String(e),false)}if(!ok)return false}
 return true}
window.addEventListener('beforeunload',e=>{if(jagaKotorList('semua').length){e.preventDefault();e.returnValue='';return ''}});

function resetTutup(){const b=$('#mtp');if(!b)return;b.textContent='Tutup';b.className='btn soft';b.onclick=()=>tutupM()}
function info(t,h){delete JGM.modal;resetTutup();$('#mt').textContent=t;$('#mbd').innerHTML=h;$('#ms').style.display='none';$('#md').classList.add('show')}
function peringatan(ket,e){try{console.warn(ket,e)}catch(x){}toast(ket+(e&&e.message?': '+e.message:''),false)}
function toast(m,ok=true){const t=$('#ts');if(!ok)m=idErr(m);t.textContent=(ok?'✓ ':'⚠ ')+m;t.className='toast '+(ok?'ok':'err');t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3200)}
const A=d=>S.absen[d]||{},act=()=>S.siswa.filter(s=>s.aktif),kelola=()=>role!=='Guru',allowed=id=>MENUS.find(m=>m[0]===id)[3].includes(RC[role])&&(id!=='tabungan'||!!(S.set&&S.set.tabungan_aktif))&&(id!=='piket'||!!(S.set&&S.set.piket_aktif))&&(id!=='hafalan'||!!(S.set&&S.set.hafalan_aktif));
const badge=s=>`<span class="badge ${s}">${s}</span>`,ini=s=>esc((s||'?')[0]);
/* tab(): bila header belum punya kolom "No", kolom nomor urut ditambahkan otomatis (setelah kolom centang bila ada). Baris pengelompok (colspan) tidak dinomori. */
const tab=(h,r,m)=>{
 const bersih=x=>String(x==null?'':x).replace(/<[^>]*>/g,'').trim().toLowerCase();
 const adaNo=h.some(x=>bersih(x)==='no');
 const f=String(h.length?h[0]:''),pos=(!adaNo&&(f.trim()===''||/^\s*<(input|label)/i.test(f)||bersih(f)==='pilih'))?1:0;
 const H=h.map(x=>`<th>${x}</th>`);let n=h.length,body=r;
 if(!adaNo){n++;H.splice(pos,0,'<th class="no">No</th>');
  if(typeof r==='string'&&r.indexOf('<tr')>=0&&r.indexOf('<table')<0){let i=0;
   body=r.replace(/<tr(\s[^>]*)?>([\s\S]*?)<\/tr>/g,(all,at,inner)=>{const a=at||'',fm=/^\s*<td([^>]*)>/.exec(inner);
    if(fm&&/colspan\s*=\s*["']?\d+/i.test(fm[1]))return '<tr'+a+'>'+inner.replace(/(colspan\s*=\s*["']?)(\d+)/i,(q,p1,c)=>p1+(Number(c)+1))+'</tr>';
    const cell='<td class="no">'+(++i)+'</td>';
    if(pos===0)return '<tr'+a+'>'+cell+inner+'</tr>';
    const k=inner.indexOf('</td>');return '<tr'+a+'>'+(k<0?cell+inner:inner.slice(0,k+5)+cell+inner.slice(k+5))+'</tr>'})}}
 return `<div class="tw"><table><thead><tr>${H.join('')}</tr></thead><tbody>${body||`<tr><td colspan="${n}" class="mu" style="text-align:center">${m||'Belum ada data.'}</td></tr>`}</tbody></table></div>`};
const PK='⚠️ Pilih kelas terlebih dahulu',PKM=`<span class="pk-warn">${PK}</span>`,PKH=`<div class="note" style="text-align:center">${PKM}</div>`;
const kopt=(sel,all)=>(all?`<option value="">Semua kelas</option>`:'')+S.kelas.map(k=>`<option ${k.nama===sel?'selected':''}>${esc(k.nama)}</option>`).join('');
const kopt3=s=>'<option value="">- Pilih kelas -</option><option value="*" '+(s==='*'?'selected':'')+'>Semua kelas</option>'+kopt(s,0);
const kopt2=s=>'<option value="">- Pilih kelas -</option>'+kopt(s,0);
const kopt2s=s=>'<option value="">- Pilih kelas -</option><option value="*" '+(s==='*'?'selected':'')+'>Semua kelas</option>'+kopt(s,0);
function enhanceCustomSelects(root=document){
 if(!window.__cselScrollHandler){let raf=0;const repos=()=>{raf=0;document.querySelectorAll('.csel.open').forEach(w=>{if(typeof w._cselReposisi==='function')w._cselReposisi()})};const jadwal=()=>{if(!raf)raf=requestAnimationFrame(repos)};window.addEventListener('scroll',jadwal,{capture:true,passive:true});window.addEventListener('resize',jadwal,{passive:true});window.__cselScrollHandler=true}
 const daftar=[];if(root.matches&&root.matches('select'))daftar.push(root);root.querySelectorAll('select:not([data-csel-ready])').forEach(sel=>daftar.push(sel));
  daftar.filter(sel=>!sel.dataset.cselReady).forEach(sel=>{
  sel.classList.add('select');sel.dataset.cselReady='1';
  const wrap=document.createElement('div');wrap.className='csel';
  const btn=document.createElement('button');btn.type='button';btn.className='csel-btn';btn.setAttribute('aria-disabled',sel.disabled?'true':'false');
  const txt=document.createElement('span'),arr=document.createElement('span');arr.className='csel-arrow';arr.textContent='▼';btn.append(txt,arr);
  const pop=document.createElement('div');pop.className='csel-pop';
  const search=document.createElement('input');search.type='text';search.className='csel-search';search.placeholder='Cari pilihan...';
  pop.appendChild(search);
  const list=document.createElement('div');pop.appendChild(list);
  sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);wrap.appendChild(btn);wrap.appendChild(pop);sel.classList.add('native-hidden');
  const rebuild=()=>{
   txt.textContent=sel.options[sel.selectedIndex]?.textContent||'Pilih kelas';
   list.innerHTML='';
   [...sel.options].forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.disabled=!!o.disabled;b.className='csel-opt'+(o.selected?' sel':'');b.dataset.search=o.textContent.toLowerCase();b.textContent=o.textContent;b.onclick=()=>{sel.selectedIndex=i;sel.dispatchEvent(new Event('change',{bubbles:true}));wrap.classList.remove('open','up');pop.classList.remove('csel-fixed');pop.style.left=pop.style.width=pop.style.top=pop.style.bottom=pop.style.right='';search.value='';filter();};list.appendChild(b)});
  };
  const filter=()=>{const q=search.value.toLowerCase().trim();let n=0;list.querySelectorAll('.csel-opt').forEach(b=>{const ok=!q||b.dataset.search.includes(q);b.style.display=ok?'block':'none';if(ok)n++});let em=list.querySelector('.csel-empty');if(!n){if(!em){em=document.createElement('div');em.className='csel-empty';em.textContent='Tidak ditemukan';list.appendChild(em)}}else if(em)em.remove()};
  const posisikanPop=()=>{
   if(!wrap.classList.contains('open'))return;
   const r=btn.getBoundingClientRect();
   pop.classList.add('csel-fixed');
   pop.style.left=Math.max(8,r.left)+'px';
   pop.style.width=Math.max(220,r.width)+'px';
   pop.style.right='auto';
   pop.style.maxHeight='320px';
   pop.style.top=Math.min(window.innerHeight-20,r.bottom+7)+'px';
   pop.style.bottom='auto';
   const ph=pop.getBoundingClientRect().height;
   const ruangBawah=window.innerHeight-r.bottom-12;
   const ruangAtas=r.top-12;
   if(ruangBawah<ph && ruangAtas>ruangBawah){
    pop.style.top='auto';
    pop.style.bottom=Math.max(8,window.innerHeight-r.top+7)+'px';
   }
  };
  wrap._cselReposisi=posisikanPop;
  const tutupPop=()=>{
   wrap.classList.remove('open','up');
   pop.classList.remove('csel-fixed');
   pop.style.left=pop.style.width=pop.style.top=pop.style.bottom=pop.style.right='';
  };
  btn.onclick=e=>{
   e.stopPropagation();if(sel.disabled)return;
   document.querySelectorAll('.csel.open').forEach(x=>{
    if(x!==wrap){
     x.classList.remove('open','up');
     const pp=x.querySelector('.csel-pop');
     if(pp){pp.classList.remove('csel-fixed');pp.style.left=pp.style.width=pp.style.top=pp.style.bottom=pp.style.right='';}
    }
   });
   if(wrap.classList.contains('open'))tutupPop();
   else{wrap.classList.add('open');requestAnimationFrame(posisikanPop);}
   if(wrap.classList.contains('open'))setTimeout(()=>search.focus(),0);
  };
  search.oninput=filter;
  sel.addEventListener('change',rebuild);
  const optObs=new MutationObserver(()=>{rebuild();btn.setAttribute('aria-disabled',sel.disabled?'true':'false')});optObs.observe(sel,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected']});
  rebuild();
 });
}
function cpick(id,label,value,items,onpick,placeholder){const val=String(value||'');const found=items.find(x=>String(x.value)===val);return `<div class="cpick" id="${id}"><button type="button" class="cpick-btn" onclick="toggleCPick('${id}')"><span>${esc(found?found.label:(placeholder||'Pilih kelas'))}</span><span class="arrow">▼</span></button><div class="cpick-pop"><input class="cpick-search" placeholder="Cari ${esc(label.toLowerCase())}..." oninput="filterCPick('${id}',this.value)">${items.map(x=>`<button type="button" class="cpick-opt ${String(x.value)===val?'sel':''}" data-search="${esc(String(x.label).toLowerCase())}" onclick="${onpick}(decodeURIComponent('${encodeURIComponent(String(x.value))}'))">${esc(x.label)}</button>`).join('')||'<div class="cpick-empty">Tidak ada pilihan</div>'}</div></div>`}
function toggleCPick(id){document.querySelectorAll('.cpick.open').forEach(x=>{if(x.id!==id)x.classList.remove('open')});const e=$('#'+id);if(!e)return;e.classList.toggle('open');if(e.classList.contains('open')){const q=e.querySelector('.cpick-search');if(q)setTimeout(()=>q.focus(),0)}}
function filterCPick(id,q){const e=$('#'+id);if(!e)return;const z=String(q||'').toLowerCase().trim();let n=0;e.querySelectorAll('.cpick-opt').forEach(b=>{const ok=!z||String(b.dataset.search||'').includes(z);b.style.display=ok?'block':'none';if(ok)n++});let em=e.querySelector('.cpick-empty-filter');if(!n){if(!em){em=document.createElement('div');em.className='cpick-empty cpick-empty-filter';em.textContent='Tidak ditemukan';e.querySelector('.cpick-pop').appendChild(em)}}else if(em)em.remove()}
document.addEventListener('click',e=>{if(!e.target.closest('.cpick'))document.querySelectorAll('.cpick.open').forEach(x=>x.classList.remove('open'));if(!e.target.closest('.csel'))document.querySelectorAll('.csel.open').forEach(x=>{x.classList.remove('open','up');const p=x.querySelector('.csel-pop');if(p){p.classList.remove('csel-fixed');p.style.left=p.style.width=p.style.top=p.style.bottom=p.style.right=''}})});
(function(){const pasang=()=>['v','mbd'].forEach(id=>{const root=document.getElementById(id);if(!root||root._cselAutoObs)return;root._cselAutoObs=new MutationObserver(records=>{const added=[];records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if((n.matches&&n.matches('select'))||(n.querySelector&&n.querySelector('select')))added.push(n)}));if(added.length)queueMicrotask(()=>added.forEach(n=>enhanceCustomSelects(n)))});root._cselAutoObs.observe(root,{childList:true,subtree:true})});pasang();document.addEventListener('DOMContentLoaded',pasang)})();
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
const LIBUR_TEMPLATE=[
['2026-12-24','Cuti Bersama Kelahiran Yesus Kristus (Natal)'],['2026-12-25','Kelahiran Yesus Kristus (Natal)'],
['2027-01-01','Tahun Baru 2027 Masehi'],['2027-01-05','Isra Mikraj Nabi Muhammad SAW'],['2027-02-05','Cuti Bersama Tahun Baru Imlek 2578 Kongzili'],['2027-02-06','Tahun Baru Imlek 2578 Kongzili'],
['2027-03-08','Hari Suci Nyepi (Tahun Baru Saka 1949)'],['2027-03-09','Cuti Bersama Idulfitri 1448 Hijriah'],['2027-03-10','Idulfitri 1448 Hijriah'],['2027-03-11','Idulfitri 1448 Hijriah'],
['2027-03-12','Cuti Bersama Idulfitri 1448 Hijriah'],['2027-03-15','Cuti Bersama Idulfitri 1448 Hijriah'],['2027-03-25','Cuti Bersama Wafat Yesus Kristus'],['2027-03-26','Wafat Yesus Kristus'],
['2027-03-28','Kebangkitan Yesus Kristus (Paskah)'],['2027-05-01','Hari Buruh Internasional'],['2027-05-06','Kenaikan Yesus Kristus'],['2027-05-17','Iduladha 1448 Hijriah'],
['2027-05-18','Cuti Bersama Iduladha 1448 Hijriah'],['2027-05-19','Cuti Bersama Waisak 2571 BE'],['2027-05-20','Hari Raya Waisak 2571 BE'],['2027-06-01','Hari Lahir Pancasila'],
['2027-06-06','1 Muharam Tahun Baru Islam 1449 Hijriah'],['2027-08-15','Maulid Nabi Muhammad SAW'],['2027-08-17','Proklamasi Kemerdekaan'],['2027-12-24','Cuti Bersama Kelahiran Yesus Kristus (Natal)'],
['2027-12-25','Kelahiran Yesus Kristus (Natal)'],['2027-12-26','Isra Mikraj Nabi Muhammad SAW']];
const tglLibur=v=>{v=String(v||'').trim();let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/),y,mo,d;if(m){y=+m[1];mo=+m[2];d=+m[3]}else if(m=v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)){d=+m[1];mo=+m[2];y=+m[3]}else return '';const t=new Date(Date.UTC(y,mo-1,d));if(t.getUTCFullYear()!==y||t.getUTCMonth()!==mo-1||t.getUTCDate()!==d)return '';return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')};
async function unduhTemplateLibur(btn){await muatLib('exceljs');
 if(!setUnduhBusy(btn,true,'Membuat template...'))return;
 try{await jedaUnduh();
  await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
  const F='Arial',N=300,H=4,R0=H+1,R1=H+N,fl=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}),ln={style:'thin',color:{argb:'FFCFD9D3'}},bd={top:ln,left:ln,bottom:ln,right:ln},mid={horizontal:'center',vertical:'middle'};
  const wb=new ExcelJS.Workbook();wb.creator='Sistem Absensi';wb.created=new Date();
  const ws=wb.addWorksheet('Libur Nasional',{views:[{state:'frozen',ySplit:H,showGridLines:false}],properties:{tabColor:{argb:'FF176B3A'}},pageSetup:{orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:'+H}});
  ws.columns=[{width:7},{width:17},{width:13},{width:64}];
  ['A1:D1','A2:D2','A3:D3'].forEach(x=>ws.mergeCells(x));
  const t1=ws.getCell('A1'),t2=ws.getCell('A2'),t3=ws.getCell('A3');
  t1.value='TEMPLATE LIBUR NASIONAL';t1.font={name:F,size:16,bold:true,color:{argb:'FFFFFFFF'}};t1.fill=fl('FF176B3A');t1.alignment=mid;
  t2.value='Daftar libur nasional dan cuti bersama untuk seluruh sekolah';t2.font={name:F,size:10,color:{argb:'FF14532D'}};t2.fill=fl('FFDFF3E7');t2.alignment=mid;
  t3.value='Isi Tanggal dan Keterangan mulai baris '+R0+'. Kolom No dan Hari terisi otomatis. Baris contoh boleh diganti atau dihapus.';t3.font={name:F,size:9,italic:true,color:{argb:'FF6D7D73'}};t3.fill=fl('FFF7FAF8');t3.alignment={horizontal:'center',vertical:'middle',wrapText:true};
  ws.getRow(1).height=34;ws.getRow(2).height=22;ws.getRow(3).height=22;
  ['No','Tanggal','Hari','Keterangan'].forEach((h,i)=>{const c=ws.getCell(H,i+1);c.value=h;c.font={name:F,size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill=fl('FF176B3A');c.alignment=mid;c.border={top:{style:'medium',color:{argb:'FF0F4F2A'}},left:ln,right:ln,bottom:{style:'medium',color:{argb:'FF0F4F2A'}}}});
  ws.getRow(H).height=26;
  const HR_X=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
  for(let i=0;i<N;i++){const r=R0+i,d=LIBUR_TEMPLATE[i],z=i%2?'FFF4F9F5':'FFFFFFFF',row=ws.getRow(r);row.height=21;
   let tgl=null,hari='';if(d){const m=d[0].split('-').map(Number);tgl=new Date(Date.UTC(m[0],m[1]-1,m[2]));hari=LIBUR_HARI[tgl.getUTCDay()]}
   const a=row.getCell(1),b=row.getCell(2),c=row.getCell(3),k=row.getCell(4);
   a.value={formula:'IF(B'+r+'="","",ROW()-'+H+')',result:d?i+1:''};
   b.value=tgl;b.numFmt='dd/mm/yyyy';
   c.value={formula:'IF(B'+r+'="","",CHOOSE(WEEKDAY(B'+r+',2),"Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"))',result:hari};
   k.value=d?d[1]:null;
   [a,b,c,k].forEach((x,j)=>{x.fill=fl(z);x.border=bd;x.font={name:F,size:10,bold:j===1,color:{argb:j===0||j===2?'FF526B84':'FF1F2D26'}};x.alignment=j===3?{vertical:'middle',horizontal:'left',indent:1}:mid});
   b.dataValidation={type:'date',operator:'between',allowBlank:true,formulae:[new Date(Date.UTC(2000,0,1)),new Date(Date.UTC(2099,11,31))],showErrorMessage:true,errorStyle:'stop',errorTitle:'Tanggal tidak valid',error:'Isi tanggal yang benar, contoh 25/12/2026.',showInputMessage:true,promptTitle:'Tanggal',prompt:'Contoh: 25/12/2026'};
   k.dataValidation={type:'textLength',operator:'lessThanOrEqual',allowBlank:true,formulae:[200],showErrorMessage:true,errorStyle:'stop',errorTitle:'Keterangan terlalu panjang',error:'Keterangan maksimal 200 karakter.'};
  }
  ws.conditionalFormatting=[{ref:'A'+R0+':D'+R1,rules:[{type:'expression',priority:1,formulae:['AND($B'+R0+'<>"",WEEKDAY($B'+R0+',2)>5)'],style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFFE8BF'}},font:{color:{argb:'FF9A5B00'},bold:true}}}]}];
  ws.autoFilter={from:{row:H,column:1},to:{row:R1,column:4}};
  const wp=wb.addWorksheet('Petunjuk',{views:[{showGridLines:false}],properties:{tabColor:{argb:'FFD99A27'}}});
  wp.columns=[{width:6},{width:96}];wp.mergeCells('A1:B1');
  const p1=wp.getCell('A1');p1.value='PETUNJUK PENGISIAN';p1.font={name:F,size:15,bold:true,color:{argb:'FFFFFFFF'}};p1.fill=fl('FFD99A27');p1.alignment=mid;wp.getRow(1).height=32;
  const info=[
   'Isi sheet "Libur Nasional" mulai baris '+R0+', satu baris untuk satu tanggal.',
   'Tanggal dapat diketik 25/12/2026 atau 2026-12-25. Excel akan mengubahnya menjadi tanggal otomatis.',
   'Kolom No dan Hari terisi otomatis. Jangan diisi atau dihapus rumusnya.',
   'Libur beberapa hari berturut-turut (misal cuti bersama): tulis satu baris per tanggal.',
   'Keterangan maksimal 200 karakter. Bila dikosongkan, sistem menulis "Libur nasional".',
   'Tanggal Sabtu atau Minggu otomatis diberi warna oranye sebagai penanda.',
   'Simpan sebagai .xlsx, lalu unggah lewat tombol "Impor (XLSX)" di Kalender nasional (menu Developer). Format CSV tidak dipakai lagi.',
   'Sebelum disimpan, sistem menampilkan simulasi jumlah baris yang ditambah, diubah, dan dihapus.',
   'Perhatian: daftar di file menggantikan seluruh libur nasional. Tanggal lama yang tidak ada di file dihapus, dan tanggal yang sudah lewat dilewati.'
  ];
  info.forEach((tx,i)=>{const r=i+2,a=wp.getCell(r,1),b=wp.getCell(r,2),warn=i===info.length-1,z=warn?'FFFFF3D6':(i%2?'FFF4F9F5':'FFFFFFFF');
   a.value=i+1;b.value=tx;[a,b].forEach(x=>{x.fill=fl(z);x.border=bd});
   a.font={name:F,size:10,bold:true,color:{argb:'FFFFFFFF'}};a.fill=fl(warn?'FFD99A27':'FF176B3A');a.alignment=mid;
   b.font={name:F,size:10,bold:warn,color:{argb:warn?'FF7A4B00':'FF1F2D26'}};b.alignment={vertical:'middle',horizontal:'left',wrapText:true,indent:1};
   wp.getRow(r).height=tx.length>95?34:24});
  await tulisXlsx(wb,'template-libur-nasional.xlsx');toast('Template libur nasional (XLSX) sedang diproses, mohon ditunggu')
 }catch(e){toast('Gagal membuat template: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
const LIBUR_HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function bacaXlsxLibur(buf){
 const rows=[],err=[];
 const wb=XLSX.read(buf,{type:'array'}),nm=wb.SheetNames.find(n=>/libur/i.test(n))||wb.SheetNames[0],ws=wb.Sheets[nm];
 if(!ws)return {rows,err};
 const a=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
 let h=-1,ct=0,ck=1;
 for(let i=0;i<Math.min(a.length,20)&&h<0;i++){const r=a[i]||[],j=r.findIndex(c=>/^\s*tanggal\s*$/i.test(String(c)));if(j>=0){h=i;ct=j;const k=r.findIndex(c=>/^\s*keterangan\s*$/i.test(String(c)));ck=k>=0?k:j+1}}
 const pad=n=>String(n).padStart(2,'0');
 const tg=v=>{if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+pad(v.getMonth()+1)+'-'+pad(v.getDate());if(typeof v==='number'&&isFinite(v)&&v>=20000&&v<=80000){const d=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())}return tglLibur(v)};
 const seen=new Map();
 for(let i=h+1;i<a.length;i++){const r=a[i]||[],tv=r[ct],kv=String(r[ck]==null?'':r[ck]).trim();
  if((tv===''||tv==null)&&!kv)continue;
  const t=tg(tv);if(!t){err.push('Baris '+(i+1)+': tanggal "'+String(tv==null?'':tv)+'" tidak valid');continue}
  if(seen.has(t))err.push('Baris '+(i+1)+': tanggal '+t+' ganda, dipakai baris ini (baris '+seen.get(t)+' diabaikan)');
  seen.set(t,i+1);
  const idx=rows.findIndex(x=>x.tanggal===t);const o={tanggal:t,keterangan:(kv||'Libur nasional').slice(0,200)};
  if(idx>=0)rows[idx]=o;else rows.push(o)}
 return {rows,err}}
function imporLiburDipilih(el){const f=el.files&&el.files[0];el.value='';if(!f)return;guard(async()=>{if(!/\.xlsx?$/i.test(f.name))throw new Error('Gunakan file Excel (.xlsx) dari tombol Template libur. Format CSV tidak didukung lagi.');await muatLib('xlsx');if(typeof XLSX==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');const {rows,err}=bacaXlsxLibur(await f.arrayBuffer());if(!rows.length)throw new Error(err[0]||'Tidak ada baris libur yang terbaca. Gunakan Template libur (XLSX).');if(err.length&&!await konfirmasi(err.length+' baris diabaikan:\n'+err.slice(0,5).join('\n')+'\n\nLanjutkan dengan '+rows.length+' baris lainnya?',{judul:'Sebagian baris tidak valid',ikon:'⚠️',ya:'Lanjutkan'}))return;const s=await dbq(db.rpc('impor_libur_nasional',{p_rows:rows,p_simulasi:true}));const ok=await konfirmasi('Simulasi impor libur nasional ('+s.baris+' tanggal, '+s.dari+' s.d. '+s.sampai+'):\n- tambah '+s.tambah+' tanggal\n- ubah keterangan '+s.ubah+'\n- hapus '+s.hapus+' (libur nasional lama yang tidak ada di file)'+(s.dilewati?'\n- dilewati '+s.dilewati+' (tanggal yang sudah lewat)':'')+'\n\nDaftar di file menggantikan seluruh libur nasional dan dipakai semua sekolah. Libur buatan sekolah tidak disentuh. Lanjutkan?',{judul:'Impor libur nasional',ikon:'📅',ya:'Ya, impor'});if(!ok)return;const h=await dbq(db.rpc('impor_libur_nasional',{p_rows:rows,p_simulasi:false}));toast('Selesai: tambah '+h.tambah+', ubah '+h.ubah+', hapus '+h.hapus);await muatKalNas();renderV()})}
const liburInfo=(d,k)=>{if(batalAda(d,k))return '';if(S.mingguan.includes(wd(d)))return 'libur mingguan hari '+HR[wd(d)];if(S.nasMap&&S.nasMap.has(d))return S.nasMap.get(d);const l=S.libur.find(x=>x.tgl<=d&&d<=(x.sampai||x.tgl)&&(!x.kelas||x.kelas===k));return l?(l.ket||'libur'):''};
const isLibur=(d,k)=>!!liburInfo(d,k);
const liburKey=(d,k)=>d+'|'+(k||'*');
const kelasTerpilih=(k)=>k&&k!=='*'?act().filter(s=>s.kelas===k):act();
const infoLiburTerpilih=(d,k)=>{const ss=kelasTerpilih(k),ks=[...new Set(ss.filter(s=>isLibur(d,s.kelas)).map(s=>s.kelas))];if(!ks.length)return '';return ks.length===1?'kelas '+ks[0]:'kelas '+ks.join(', ')};
const dayStat=(s,d)=>{const r=A(d)[s.id];return r?r.st:isLibur(d,s.kelas)&&!okL[liburKey(d,s.kelas)]?'Libur':d<=TODAY?'Belum':''};
const adaStatusLibur=(d,k)=>kelasTerpilih(k).some(s=>{const r=A(d)[s.id];return r&&r.st==='Libur'});
async function kosongkanAbsensiKelas(d,k){const ids=kelasTerpilih(k).map(s=>s.id);if(ids.length)await dbq(db.from('absensi').delete().eq('tanggal',d).in('siswa_id',ids));if(S.absen[d])ids.forEach(id=>delete S.absen[d][id]);if(draft&&d===attDate)ids.forEach(id=>delete draft[id]);}
async function kosongkanAbsensiLibur(d,k){const siswa=kelasTerpilih(k),ids=siswa.filter(s=>{const r=A(d)[s.id];return r&&r.st==='Libur'}).map(s=>s.id);if(ids.length)await dbq(db.from('absensi').delete().eq('tanggal',d).in('siswa_id',ids));if(S.absen[d])ids.forEach(id=>delete S.absen[d][id]);if(draft&&d===attDate)ids.forEach(id=>delete draft[id]);}
async function okLib(k,d){const i=liburInfo(d,k),ada=adaStatusLibur(d,k),key=liburKey(d,k);if((!i&&!ada)||okL[key])return true;if(liburPrompted[key])return false;liburPrompted[key]=1;const sumber=i?'terjadwal libur':'memiliki absensi berstatus Libur';const masuk=await konfirmasi(fmt(d)+': '+sumber+' untuk '+(k?'kelas '+k:'kelas yang dipilih')+'.\n\nHari ini tetap masuk seperti hari biasa?\n\nJika Ya, absensi berstatus Libur akan dikosongkan terlebih dahulu.',{judul:'Hari ini libur',ikon:'🏖',ya:'Ya, masuk'});if(!masuk)return false;if(i)await kosongkanAbsensiKelas(d,k);else await kosongkanAbsensiLibur(d,k);okL[key]=1;await catatBatal(d,k);return true;}
async function cekLiburSebelumAbsensi(k,d){const ss=kelasTerpilih(k),keys=[...new Set(ss.filter(s=>isLibur(d,s.kelas)||((A(d)[s.id]||{}).st==='Libur')).map(s=>s.kelas))].filter(kelas=>!okL[liburKey(d,kelas)]);if(!keys.length)return true;const nama=keys.length===1?'kelas '+keys[0]:'kelas '+keys.join(', ');const masuk=await konfirmasi(fmt(d)+': hari ini '+(keys.length===1?'terjadwal libur atau memiliki absensi berstatus Libur untuk '+nama:'terdapat kelas yang terjadwal libur atau memiliki absensi berstatus Libur ('+nama)+'.\n\nTetap masuk seperti hari biasa?\n\nJika Ya, absensi berstatus Libur akan dikosongkan terlebih dahulu.',{judul:'Hari ini libur',ikon:'🏖',ya:'Ya, masuk'});if(!masuk){keys.forEach(kelas=>liburPrompted[liburKey(d,kelas)]=1);return false;}for(const kelas of keys){if(isLibur(d,kelas))await kosongkanAbsensiKelas(d,kelas);else await kosongkanAbsensiLibur(d,kelas);okL[liburKey(d,kelas)]=1;}if(!k||k==='*')await catatBatal(d,'');else for(const kelas of keys)await catatBatal(d,kelas);return true;}
function hariBulan(b,rekap=false){const p=b.split('-').map(Number),n=new Date(p[0],p[1],0).getDate(),r=[];let batas=n;if(rekap){const prefix=b+'-',tercatat=Object.keys(S.absen).filter(d=>d.startsWith(prefix)&&Object.keys(S.absen[d]||{}).length).sort();const last=tercatat[tercatat.length-1]||'';const maxHari=last?Number(last.slice(8)):0;const ym=TODAY.slice(0,7);if(b===ym)batas=Math.max(Number(TODAY.slice(8)),maxHari);else if(b>ym)batas=maxHari;else batas=n}for(let i=1;i<=batas;i++){const d=b+'-'+String(i).padStart(2,'0');if(!rekap&&d>TODAY)break;r.push(d)}return r}
const statusRekap=(s,d)=>dayStat(s,d)||'Belum';
function ringkas(s,b,rekap=false){const c={Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0},ds=hariBulan(b,rekap);ds.forEach(d=>{const st=rekap?statusRekap(s,d):dayStat(s,d);c[st]=(c[st]||0)+1});const n=ds.length;return{c,n,ds,pct:n?Math.round((c.Hadir+c.Terlambat+c.Libur)*100/n):0}}
const segarkan=()=>dbq(db.rpc('segarkan_libur',{p_sekolah:SEK}));/* ---------- login + navigasi ---------- */
function loginView(msg){tampilTombolPasskey();const _d=$('#dua');if(_d)_d.classList.add('hid');try{sessionStorage.removeItem('mode_bantuan');sessionStorage.removeItem('dev_sesi')}catch(e){}pasangBanner();S.set={};terapNama();$('#lg').classList.remove('hid');$('#ap').classList.add('hid');$('#bn').classList.add('hid');$('#lerr').textContent=idErr(msg||'')}
function formDaftarSekolah(){info('Daftarkan sekolah','<div class="note">Isi data sekolah dan akun Anda. Pendaftaran akan diperiksa admin; akun aktif setelah disetujui dan Anda dihubungi lewat WhatsApp.</div>'
 +'<div class="fg">'
 +'<div class="fd"><label class="l">Saya mendaftar sebagai</label><select id="dfPr" class="select tanpa-cari" onchange="ubahPeranDaftar()"><option value="kepala_sekolah">Kepala Sekolah</option><option value="operator">Operator</option></select></div>'
 +'<div class="fd"><label class="l">Nama sekolah</label><input id="dfSk" class="input" maxlength="80"></div>'
 +'<div class="fd"><label class="l">Alamat (opsional)</label><input id="dfAl" class="input" maxlength="150" placeholder="Jl. Contoh, RT/RW 00/01, Desa Contoh"></div>'
 +'<div class="fd"><label class="l">Kota / kabupaten (opsional)</label><input id="dfKt" class="input" maxlength="60" placeholder="contoh Jember"><div class="mu" style="margin-top:4px">Dipakai sebagai tempat tanda tangan Kepala Sekolah di rekap dan raport.</div></div>'
 +'<div class="fd"><label id="dfLNm" class="l">Nama kepala sekolah</label><input id="dfNm" class="input" maxlength="80"></div>'
 +'<div class="fd"><label id="dfLNip" class="l">NIP kepala sekolah (opsional)</label><input id="dfNip" class="input" maxlength="30"></div>'
 +'<div class="fd"><label id="dfLWa" class="l">Nomor WhatsApp kepala sekolah</label><div style="display:flex;gap:8px"><input id="dfWa" class="input" inputmode="tel" placeholder="08123456789" style="flex:1" oninput="dfAkun(false)"><button id="dfKb" type="button" class="btn soft" onclick="kirimKodeDaftar()">Kirim kode</button></div></div>'
 +'<div class="fd"><label class="l">Kode dari WhatsApp (6 angka)</label><div style="display:flex;gap:8px"><input id="dfKd" class="input" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="flex:1"><button id="dfVf" type="button" class="btn soft" onclick="verifikasiDaftar()">Verifikasi</button></div><div id="dfVs" class="mu" style="margin-top:4px"></div></div>'
 +'<div id="dfAkunInfo" class="note" style="display:none;margin:0 0 8px">♻️ Nomor ini sudah punya akun. Sekolah baru akan ditambahkan ke <b>akun lama</b> Anda: username, kata sandi, nama, dan NIP tidak diubah (kolomnya dibekukan). Peran di sekolah baru mengikuti pilihan Anda di atas. Setelah disetujui, masuk dengan username dan kata sandi lama, lalu pilih sekolah ini di halaman Pilih sekolah.</div>'
 +'<div class="fd"><label class="l">Username (huruf kecil, tanpa spasi)</label><input id="dfUs" class="input" autocapitalize="none" maxlength="20"></div>'
 +'<div class="fd"><label class="l">Kata sandi (minimal 6 karakter)</label><input id="dfPw" type="password" class="input" autocomplete="new-password"></div>'
 +'<div class="fd"><label class="l">Ulangi kata sandi</label><input id="dfPw2" type="password" class="input" autocomplete="new-password"></div>'
 +'<div id="dfKepala" style="display:none"><div class="note" style="margin:10px 0 6px">Data kepala sekolah (wajib). Akun kepala sekolah dibuat nanti oleh Anda lewat menu Guru, dan nomor ini menjadi penerima utama notifikasi alpa dan libur. Wali kelas dan anggota sekolah lain menerima sesuai nomor di profil masing-masing.</div>'
 +'<div class="fd"><label class="l">Nama kepala sekolah</label><input id="dfKn" class="input" maxlength="80"></div>'
 +'<div class="fd"><label class="l">NIP kepala sekolah (opsional)</label><input id="dfKnip" class="input" maxlength="30"></div>'
 +'<div class="fd"><label class="l">Nomor WhatsApp kepala sekolah</label><input id="dfKw" class="input" inputmode="tel" placeholder="08123456789"></div></div>'
 +'</div><div id="dfErr" class="mu" style="color:var(--rd);margin:6px 0"></div>'
 +'<button id="dfKirim" class="btn success" style="width:100%" onclick="kirimDaftar()">Kirim pendaftaran</button>');enhanceCustomSelects($('#mbd'));{const snap=jgSnap($('#mbd'));jagaIsian('Pendaftaran sekolah',()=>!!$('#dfSk')&&jgSnap($('#mbd'))!==snap)}}
function formReset(){info('Bantuan akun',`<div class="note">Pilih masalah yang Anda alami. Kode verifikasi dikirim ke nomor WhatsApp yang terdaftar di akun Anda.</div>
<button class="btn success" style="width:100%;margin:6px 0" onclick="mulaiReset('sandi')">🔐 Lupa sandi saja</button>
<button class="btn success" style="width:100%;margin:6px 0" onclick="mulaiReset('username')">👤 Lupa username saja</button>
<button class="btn success" style="width:100%;margin:6px 0" onclick="mulaiReset('keduanya')">🔁 Lupa username dan sandi</button>
<button class="btn soft" style="width:100%;margin:6px 0" onclick="mulaiReset('hilang')">📵 Nomor WhatsApp saya hilang</button>`)}
function mulaiReset(mode){if(mode==='hilang')return langkahHilang1();
 if(otpLanjut('reset',m=>m.mode===mode))return;
 const jd={sandi:'Lupa sandi',username:'Lupa username',keduanya:'Lupa username dan sandi'}[mode];
 form(jd,[{k:'wa',l:'Nomor WhatsApp yang terdaftar di akun Anda (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.wa);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');
  await apiPublik({aksi:'reset_kirim',nomor:wa});toast('Jika nomor terdaftar, kode dikirim ke WhatsApp');
  otpSimpan('reset',{mode,wa},()=>langkahReset2(mode,wa),()=>mulaiReset(mode));setTimeout(()=>langkahReset2(mode,wa),150)});$('#ms').textContent='Kirim kode'}
function langkahReset2(mode,wa){const f=[{k:'kode',l:'Kode 6 angka dari WhatsApp ('+fmtWA(wa)+')',ver:kd=>apiPublik({aksi:'otp_cek',keperluan:'reset',nomor:wa,kode:kd})}];
 if(mode!=='sandi')f.push({k:'user',l:'Username baru (huruf kecil, tanpa spasi)'});
 if(mode!=='username'){f.push({k:'sandi',l:'Kata sandi baru (minimal 6 karakter)',t:'password'});f.push({k:'sandi2',l:'Ulangi kata sandi baru',t:'password'})}
 form('Atur ulang akun',f,async v=>{
  if(!/^\d{6}$/.test(v.kode))throw new Error('Kode harus 6 angka');
  const un=(v.user||'').toLowerCase();
  if(mode!=='sandi'&&!/^[a-z0-9._-]{3,20}$/.test(un))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
  if(mode!=='username'){if((v.sandi||'').length<6)throw new Error('Kata sandi minimal 6 karakter');if(v.sandi!==v.sandi2)throw new Error('Ulangi kata sandi dengan benar')}
  const j=await apiPublik({aksi:'reset_selesai',mode,nomor:wa,kode:v.kode,username_baru:un,sandi_baru:v.sandi||''});otpHapus('reset');
  setTimeout(()=>info('Berhasil',`<div class="note">Akun Anda sudah diperbarui. Username Anda sekarang: <b>${esc(j.username)}</b>. Silakan masuk.</div>`),150)});$('#ms').textContent='Simpan'}
function langkahHilang1(){if(otpLanjut('hilang_publik'))return;form('Nomor WhatsApp hilang',[{k:'nama',l:'Nama lengkap'},{k:'sekolah',l:'Nama sekolah tempat Anda mengajar'},{k:'ulama',l:'Username lama (kosongkan bila lupa)'},{k:'wa',l:'Nomor WhatsApp BARU yang aktif (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.wa);if((v.nama||'').length<3||(v.sekolah||'').length<3)throw new Error('Isi nama lengkap dan nama sekolah');if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp baru tidak valid');
  await apiPublik({aksi:'hilang_otp',nomor:wa});toast('Kode dikirim ke nomor baru');
  const d={nama:v.nama,sekolah:v.sekolah,ulama:(v.ulama||'').toLowerCase(),wa};otpSimpan('hilang_publik',{},()=>langkahHilang2(d),()=>langkahHilang1());setTimeout(()=>langkahHilang2(d),150)});$('#ms').textContent='Kirim kode ke nomor baru'}
function langkahHilang2(d){form('Verifikasi dan data akun baru',[{k:'kode',l:'Kode 6 angka yang dikirim ke nomor baru ('+fmtWA(d.wa)+')',ver:kd=>apiPublik({aksi:'otp_cek',keperluan:'nomor_hilang',nomor:d.wa,kode:kd})},{k:'ubaru',l:'Username baru (kosongkan bila tidak ingin mengganti)'},{k:'sandi',l:'Kata sandi baru (kosongkan bila tidak ingin mengganti)',t:'password'},{k:'sandi2',l:'Ulangi kata sandi baru',t:'password'}],async v=>{
  if(!/^\d{6}$/.test(v.kode))throw new Error('Kode harus 6 angka');
  const ub=(v.ubaru||'').toLowerCase();
  if(ub&&!/^[a-z0-9._-]{3,20}$/.test(ub))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
  if(v.sandi&&v.sandi.length<6)throw new Error('Kata sandi minimal 6 karakter');
  if(v.sandi!==(v.sandi2||''))throw new Error('Ulangi kata sandi dengan benar');
  await apiPublik({aksi:'hilang_kirim',nama:d.nama,nama_sekolah:d.sekolah,username_lama:d.ulama,nomor:d.wa,kode:v.kode,username_baru:ub,sandi_baru:v.sandi||''});otpHapus('hilang_publik');
  setTimeout(()=>info('Permintaan terkirim','<div class="note">Permintaan Anda sudah dikirim ke admin untuk diperiksa. Anda akan dikabari lewat WhatsApp di nomor baru setelah disetujui. Akun lama Anda tidak berubah sebelum disetujui.</div>'),150)});$('#ms').textContent='Kirim permintaan'}
async function apiPublik(body){const r=await fetch('/api/publik',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===404)throw new Error('Layanan pendaftaran belum tersedia (404). Hubungi admin');throw new Error(j.error||('Gagal ('+r.status+')'))}return j}
function kirimKodeDaftar(){const b=$('#dfKb'),e=$('#dfErr');if(b.disabled)return;e.textContent='';const wa=$('#dfWa').value.trim();if(!wa){e.textContent='Isi nomor WhatsApp dulu';return}
 b.disabled=true;b.textContent='Mengirim...';
 apiPublik({aksi:'otp_kirim',keperluan:'daftar',nomor:wa}).then(r=>{window._dfAkun={wa:normWA(wa),ada:!!(r&&r.akun_ada)};dfAkun(window._dfAkun.ada);toast('Kode dikirim ke WhatsApp Anda');let n=60;b.textContent='Kirim ulang ('+n+')';const t=setInterval(()=>{n--;if(!$('#dfKb')){clearInterval(t);return}if(n<=0){clearInterval(t);b.disabled=false;b.textContent='Kirim ulang'}else b.textContent='Kirim ulang ('+n+')'},1000)}).catch(x=>{e.textContent=idErr(x.message||String(x));b.disabled=false;b.textContent='Kirim kode'})}
/* akun lama: kolom milik akun (nama, NIP, username, sandi) dibekukan; sekolah baru dipasang ke akun yang sudah ada */
function dfAkun(ada){if(!ada)window._dfAkun=null;const i=$('#dfAkunInfo');if(i)i.style.display=ada?'block':'none';
 ['dfNm','dfNip','dfUs','dfPw','dfPw2'].forEach(id=>{const e=$('#'+id);if(!e)return;if(ada){e.value='';e.disabled=true;e.placeholder='Memakai akun lama'}else{e.disabled=false;e.placeholder=''}})}
const dfLama=()=>{const a=window._dfAkun,w=$('#dfWa');return !!(a&&a.ada&&w&&a.wa===normWA(w.value))};
function ubahPeranDaftar(){const op=$('#dfPr').value==='operator';
 $('#dfLNm').textContent=op?'Nama Anda (operator)':'Nama kepala sekolah';
 $('#dfLNip').textContent=op?'NIP Anda (opsional)':'NIP kepala sekolah (opsional)';
 $('#dfLWa').textContent=op?'Nomor WhatsApp Anda (kode verifikasi dikirim ke nomor ini)':'Nomor WhatsApp kepala sekolah';
 $('#dfKepala').style.display=op?'block':'none'}
function kirimDaftar(){const b=$('#dfKirim'),e=$('#dfErr');if(b.disabled)return;e.textContent='';
 const op=$('#dfPr').value==='operator',lama=dfLama();
 const v={aksi:'daftar',peran:op?'operator':'kepala_sekolah',nama_sekolah:$('#dfSk').value.trim(),alamat:$('#dfAl').value.trim(),kota:$('#dfKt').value.trim(),nip:$('#dfNip').value.trim(),nomor:$('#dfWa').value.trim(),kode:$('#dfKd').value.trim(),username:$('#dfUs').value.trim().toLowerCase(),sandi:$('#dfPw').value};
 if(op){v.nama_operator=$('#dfNm').value.trim();v.nama_kepala=$('#dfKn').value.trim();v.nip_kepala=$('#dfKnip').value.trim();v.wa_kepala=$('#dfKw').value.trim()}else v.nama_kepala=$('#dfNm').value.trim();
 if(!v.nama_sekolah||!v.nomor||!v.kode||(op&&(!v.nama_kepala||!v.wa_kepala))||(!lama&&(!(op?v.nama_operator:v.nama_kepala)||!v.username||!v.sandi))){e.textContent='Lengkapi semua kolom yang wajib';return}
 if(!lama&&v.sandi!==$('#dfPw2').value){e.textContent='Kata sandi dan ulangannya tidak sama';return}
 b.disabled=true;b.innerHTML='<span class="bs"></span>Mengirim...';
 apiPublik(v).then(()=>{info('Pendaftaran terkirim','<div style="text-align:center;padding:10px 4px"><div style="font-size:42px">✅</div><h3 style="margin:8px 0">Terima kasih</h3><div class="mu">Pendaftaran sekolah <b>'+esc(v.nama_sekolah)+'</b> sudah kami terima. Admin akan memeriksa data Anda. '+(lama?'Setelah disetujui, sekolah ini muncul di <b>akun lama</b> Anda: masuk dengan username dan kata sandi lama, lalu pilih sekolah ini di halaman Pilih sekolah.':'Setelah disetujui, Anda bisa masuk dengan username <b>'+esc(v.username)+'</b>.')+(op&&!lama?' Setelah masuk, tambahkan akun Kepala Sekolah lewat menu Guru.':'')+'</div></div>')}).catch(x=>{e.textContent=idErr(x.message||String(x));b.disabled=false;b.textContent='Kirim pendaftaran'})}
function masuk(){const b=$('#lb');if(b.disabled)return;b.disabled=true;b.innerHTML='<span class="bs"></span>Memproses...';$('#lerr').textContent='';guard(async()=>{const u=$('#lu').value.trim(),pw=$('#lp').value;if(!u||!pw)throw new Error('Isi username dan kata sandi');let email=u;
 if(!u.includes('@')){const r=await db.rpc('email_dari_username',{u});if(r.error)throw r.error;if(!r.data)throw new Error('Username tidak ditemukan atau akun belum aktif. Bila Anda baru mendaftarkan sekolah, mohon tunggu persetujuan admin.');email=r.data}
 const {error}=await db.auth.signInWithPassword({email,password:pw});if(error)throw new Error('Username atau kata sandi salah');try{sessionStorage.removeItem('sekolah_aktif')}catch(e){}await mulai()},1).finally(()=>{b.disabled=false;b.textContent='Masuk'})}

/* ---------- terjemahan pesan error ke Bahasa Indonesia ---------- */
const ERR_ID=[
 [/Non-Webauthn|ERROR_PASSTHROUGH/i,'Terjadi kesalahan pada passkey. Coba lagi, atau masuk dengan kata sandi'],
 [/InvalidStateError|already registered|PREVIOUSLY_REGISTERED/i,'Perangkat ini sudah terdaftar sebagai passkey untuk akun ini'],
 [/NotAllowedError|operation either timed out|not allowed by the user agent|timed out or was not allowed/i,'Dibatalkan atau waktu habis'],
 [/AbortError|ceremony was aborted|operation was aborted/i,'Proses dibatalkan'],
 [/NotSupportedError|WebAuthn is not supported|not supported by this browser/i,'Perangkat atau browser ini tidak mendukung passkey'],
 [/SecurityError/i,'Domain situs tidak cocok dengan Relying Party ID di Supabase'],
 [/Failed to fetch|NetworkError|Load failed|network request failed/i,'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi'],
 [/Invalid login credentials/i,'Username atau kata sandi salah'],
 [/JWT expired|invalid JWT|Auth session missing|Invalid Refresh Token|Refresh Token Not Found/i,'Sesi login sudah berakhir, silakan masuk kembali'],
 [/Email not confirmed|Phone not confirmed/i,'Akun belum terverifikasi'],
 [/User not found/i,'Akun tidak ditemukan'],
 [/User is banned|user_banned/i,'Akun diblokir'],
 [/Password should be at least|password.*at least 6/i,'Kata sandi minimal 6 karakter'],
 [/different from the old password|same password/i,'Kata sandi baru harus berbeda dari yang lama'],
 [/rate limit|too many requests|over_request_rate_limit/i,'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi'],
 [/row-level security|permission denied|\bForbidden\b|not authorized/i,'Anda tidak memiliki izin untuk tindakan ini'],
 [/duplicate key|unique constraint/i,'Data sudah ada atau sudah dipakai'],
 [/violates foreign key/i,'Data masih dipakai oleh data lain sehingga tidak bisa diubah atau dihapus'],
 [/violates not-null|null value in column|violates check constraint/i,'Ada data wajib yang belum diisi atau tidak valid'],
 [/Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out|Request Timeout/i,'Server sedang bermasalah. Coba lagi beberapa saat'],
 [/Unexpected token|is not valid JSON|Unexpected end of JSON/i,'Respons server tidak dapat dibaca. Coba lagi'],
 [/Cannot read propert|is not a function|is not defined|Cannot access .* before initialization/i,'Terjadi kesalahan pada aplikasi. Muat ulang halaman lalu coba lagi']];
function idErr(m){const t=String(m==null?'':m);for(const [re,id] of ERR_ID)if(re.test(t))return id;return t}
/* ---------- passkey (sidik jari / wajah / PIN perangkat) ---------- */
/* CATATAN: passkey memakai flag experimental supabase-js (lihat createClient). Bila setelah upgrade API-nya berubah/hilang, PK_OK jadi false dan fitur passkey disembunyikan, bukan error. Uji passkey setiap menaikkan versi supabase-js. */
const PK_OK=!!(window.PublicKeyCredential&&navigator.credentials)&&typeof db.auth.signInWithPasskey==='function'&&typeof db.auth.registerPasskey==='function'&&!!db.auth.passkey&&typeof db.auth.passkey.list==='function',PK_KEY='pk_aktif';
function pkSet(on){try{on?localStorage.setItem(PK_KEY,'1'):localStorage.removeItem(PK_KEY)}catch(e){}tampilTombolPasskey()}
function pkAda(){try{return localStorage.getItem(PK_KEY)==='1'}catch(e){return false}}
function tampilTombolPasskey(){const b=$('#lpk');if(b)b.classList.toggle('hid',!(PK_OK&&pkAda()))}
const pkKode=e=>String((e&&(e.code||e.name))||'')+' '+String((e&&e.message)||e||'')+(e&&e.cause?' '+String(e.cause.name||'')+' '+String(e.cause.message||''):'');
function pkPesan(e){const m=pkKode(e);
 if(/NotAllowed|cancel|abort|timed out/i.test(m))return 'Dibatalkan atau waktu habis';
 if(/passkey_disabled/.test(m))return 'Passkey belum diaktifkan di Supabase (Authentication → Passkeys)';
 if(/webauthn_credential_not_found/.test(m))return 'Passkey belum diaktifkan untuk akun ini di perangkat ini. Masuk dengan kata sandi, lalu aktifkan passkey di menu Profil Saya';
 if(/webauthn_credential_exists|InvalidStateError|PREVIOUSLY_REGISTERED|already registered/i.test(m))return 'Perangkat ini sudah terdaftar sebagai passkey untuk akun ini';
 if(/too_many_passkeys/.test(m))return 'Jumlah passkey sudah mencapai batas, hapus yang lama dulu';
 if(/email_not_confirmed|phone_not_confirmed/.test(m))return 'Akun belum terverifikasi';
 if(/user_banned/.test(m))return 'Akun diblokir';
 if(/SecurityError/.test(m))return 'Domain situs tidak cocok dengan Relying Party ID di Supabase';
 const r=idErr(m);return r!==m?r:idErr(String((e&&e.message)||e||'Gagal memakai passkey. Coba lagi atau masuk dengan kata sandi'))}
/* pemilih akun passkey kustom: akun yang pernah masuk dengan passkey di perangkat ini disimpan (username, nama, id kredensial) */
const b64u={enc:buf=>{const a=new Uint8Array(buf);let t='';for(let i=0;i<a.length;i++)t+=String.fromCharCode(a[i]);return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},
 dec:str=>{str=String(str).replace(/-/g,'+').replace(/_/g,'/');while(str.length%4)str+='=';const bin=atob(str),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a.buffer}};
function pkAkunList(){try{const a=JSON.parse(localStorage.getItem('pk_akun')||'[]');return Array.isArray(a)?a.filter(x=>x&&x.c&&x.u):[]}catch(e){return []}}
function pkAkunSimpan(a){try{localStorage.setItem('pk_akun',JSON.stringify(a.slice(0,8)))}catch(e){}}
function pkAkunTambah(u,n,c){pkAkunSimpan([{u,n,c}].concat(pkAkunList().filter(x=>x.u!==u&&x.c!==c)))}
function pkAkunHapus(c){pkAkunSimpan(pkAkunList().filter(x=>x.c!==c))}
/* Alur resmi supabase-js tetap dipakai; kita hanya (1) menyempitkan pilihan ke satu akun dan (2) mencatat id kredensial yang dipakai */
function pkSadap(o){const asli=navigator.credentials.get;
 navigator.credentials.get=function(x){try{if(o.allowId&&x&&x.publicKey)x.publicKey.allowCredentials=[{type:'public-key',id:b64u.dec(o.allowId)}]}catch(e){}
  return asli.call(navigator.credentials,x).then(c=>{try{if(c&&c.id)o.hasil=c.id}catch(e){}return c})};
 return ()=>{try{delete navigator.credentials.get}catch(e){}}}
function pkSadapBuat(o){const asli=navigator.credentials.create;
 navigator.credentials.create=function(x){return asli.call(navigator.credentials,x).then(c=>{try{if(c&&c.id)o.hasil=c.id}catch(e){}return c})};
 return ()=>{try{delete navigator.credentials.create}catch(e){}}}
/* verifikasi dengan passkey sebagai pengganti "kata sandi saat ini" (hanya bila passkey sudah aktif) */
let PKOK=0;const pkFresh=()=>Date.now()-PKOK<240000;
const bodySandi=sd=>(!sd&&pkFresh())?{verifikasi:'passkey'}:{sandi_sekarang:sd};
/* bukti passkey terpisah: sesi utama (termasuk verifikasi 2 langkah Developer) tidak diganti */
let PKB=null;const pkBuktiFresh=()=>!!PKB&&Date.now()-PKB.w<240000;
const bodyBukti=sd=>(!sd&&pkBuktiFresh())?{verifikasi:'passkey',bukti_passkey:PKB.t}:{sandi:sd};
async function pkBukti(){const {data:{session:lama}}=await db.auth.getSession();const a=pkAkunList().find(x=>PROFIL&&x.u===PROFIL.username),o={allowId:a?a.c:null,hasil:null},pulih=pkSadap(o);
 try{const x=await db.auth.signInWithPasskey();if(x.error)throw x.error;const u=x.data&&x.data.user,sn=x.data&&x.data.session;
  if(!u||!sn)throw new Error('Passkey tidak menghasilkan sesi');
  if(u.id!==me)throw new Error('Passkey milik akun lain. Silakan masuk kembali');
  PKB={t:sn.access_token,w:Date.now()}}
 catch(e){throw new Error(pkPesan(e))}
 finally{pulih();if(lama){try{await db.auth.setSession({access_token:lama.access_token,refresh_token:lama.refresh_token})}catch(e){console.warn('Sesi lama belum bisa dipulihkan',e)}}}}
const pkTersedia=()=>PK_OK&&!MB()&&!!PROFIL&&(pkAda()||(Array.isArray(S.pk)&&S.pk.length>0));
async function pkVerifikasi(){const a=pkAkunList().find(x=>PROFIL&&x.u===PROFIL.username),o={allowId:a?a.c:null,hasil:null},pulih=pkSadap(o);
 try{const x=await db.auth.signInWithPasskey();if(x.error)throw x.error;const u=x.data&&x.data.user;
  if(!u)throw new Error('Passkey tidak menghasilkan sesi');
  if(u.id!==me){try{await db.auth.signOut()}catch(e){}setTimeout(()=>location.reload(),600);throw new Error('Passkey milik akun lain. Silakan masuk kembali')}
  PKOK=Date.now()}
 catch(e){throw new Error(pkPesan(e))}finally{pulih()}}
function pasangPkForm(k,bukti){PKOK=0;PKB=null;if(!pkTersedia())return;const el=$('#f_'+k),fd=el&&el.closest('.fd');if(!fd||fd.querySelector('.pkv'))return;
 const b=document.createElement('button');b.type='button';b.className='btn soft sm pkv';b.style.marginTop='8px';b.textContent='🔑 Atau verifikasi dengan passkey';
 b.onclick=()=>guard(async()=>{await(bukti?pkBukti():pkVerifikasi());el.value='';el.disabled=true;el.placeholder='Terverifikasi dengan passkey';b.textContent='✓ Terverifikasi dengan passkey';b.disabled=true;toast('Passkey terverifikasi')},1);
 fd.appendChild(b)}
function masukPasskey(){const b=$('#lpk');if(!b||b.disabled)return;$('#lerr').textContent='';
 if(pkAkunList().length)return pilihAkunPasskey();pkMasuk(null)}
function pilihAkunPasskey(){const a=pkAkunList();
 info('Masuk dengan passkey','<div class="note">Pilih akun yang ingin dipakai masuk dengan sidik jari.</div>'
  +a.map(x=>`<div style="display:flex;gap:6px;margin:6px 0"><button class="btn soft" style="flex:1;text-align:left" onclick="closeM();pkMasuk('${esc(x.c)}')">👤 <b>${esc(x.n||x.u)}</b><div class="mu">${esc(x.u)}</div></button><button class="btn sm danger" title="Hapus dari daftar" onclick="pkAkunHapus('${esc(x.c)}');pilihAkunPasskey()">✕</button></div>`).join('')
  +'<button class="btn soft" style="width:100%;margin-top:6px" onclick="closeM();pkMasuk(null)">Akun lain di HP ini…</button>')}
function pkMasuk(credId){const b=$('#lpk');if(b&&b.disabled)return;if(b)b.disabled=true;$('#lerr').textContent='';
 guard(async()=>{const o={allowId:credId||null,hasil:null},pulih=pkSadap(o);
  try{let x;try{x=await db.auth.signInWithPasskey()}finally{pulih()}
   if(x.error)throw x.error;if(!x.data||!x.data.session)throw new Error('Passkey tidak menghasilkan sesi');
   pkSet(true);try{sessionStorage.removeItem('sekolah_aktif')}catch(e){}await mulai();
   if(o.hasil&&PROFIL&&x.data.user&&PROFIL.id===x.data.user.id)pkAkunTambah(PROFIL.username,PROFIL.nama,o.hasil)}
  catch(e){if(/webauthn_credential_not_found/.test(pkKode(e))){if(credId)pkAkunHapus(credId);else pkSet(false)}$('#lerr').textContent=pkPesan(e)}},1).finally(()=>{if(b)b.disabled=false})}
async function muatPasskeySaya(){S.pk=null;S.pkErr='';if(!PK_OK||MB())return;
 try{const r=await db.auth.passkey.list();if(r.error)throw r.error;S.pk=r.data||[];if(S.pk.length)pkSet(true)}catch(e){S.pkErr=pkPesan(e)}}
async function muatProfilSaya(){if(role!=='Developer')await muatProfil();const {data:{session}}=await db.auth.getSession();S.pfs=session?session.user:null;await muatPasskeySaya()}
function daftarPasskey(){if(MB())return toast('Tidak tersedia di mode bantuan',false);
 guard(async()=>{const o={hasil:null},pulih=pkSadapBuat(o);
  try{try{const {error}=await db.auth.registerPasskey();if(error)throw error}finally{pulih()}
   pkSet(true);if(o.hasil&&PROFIL)pkAkunTambah(PROFIL.username,PROFIL.nama,o.hasil);toast('Passkey berhasil diaktifkan')}
  catch(e){if(/webauthn_credential_exists|InvalidStateError|PREVIOUSLY_REGISTERED|already registered/i.test(pkKode(e))){pkSet(true);throw new Error('Perangkat ini sudah terdaftar sebagai passkey. Tombol masuk dengan passkey sekarang aktif')}throw new Error(pkPesan(e))}
  await muatPasskeySaya();renderV()})}
/* hubungkan passkey yang sudah ada ke daftar pilihan login di browser ini (tanpa kirim apa pun ke server) */
function pkIngatAkun(){if(MB()||!PROFIL)return toast('Tidak tersedia di mode bantuan',false);
 guard(async()=>{let c;try{c=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rpId:location.hostname,userVerification:'preferred',timeout:60000}})}catch(e){throw new Error(pkPesan(e))}
  if(!c||!c.id)throw new Error('Passkey tidak terbaca');
  try{if(c.response&&c.response.userHandle){const u=new Uint8Array(c.response.userHandle),t=new TextDecoder().decode(u),re=/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    const id=re.test(t)?t:(u.length===16?Array.from(u).map(v=>v.toString(16).padStart(2,'0')).join(''):null);
    if(id&&id.replace(/-/g,'').toLowerCase()!==String(me).replace(/-/g,'').toLowerCase())throw new Error('Itu passkey akun lain. Ulangi dan pilih akun Anda sendiri')}}
  catch(e){if(/akun lain/.test(String(e.message)))throw e}
  pkAkunTambah(PROFIL.username,PROFIL.nama,c.id);pkSet(true);toast('Akun ini sudah masuk daftar pilihan login di HP ini');renderV()})}
function renamePasskey(id){if(MB())return toast('Tidak tersedia di mode bantuan',false);const x=(S.pk||[]).find(k=>k.id===id)||{};
 form('Ubah nama passkey',[{k:'nama',l:'Nama passkey (mis. HP Samsung Bu Ani)',v:x.friendly_name||''}],async v=>{const n=(v.nama||'').trim();if(!n)throw new Error('Nama wajib diisi');if(n.length>120)throw new Error('Maksimal 120 karakter');
  const r=await db.auth.passkey.update({passkeyId:id,friendlyName:n});if(r.error)throw r.error;await muatPasskeySaya();toast('Nama passkey diubah');renderV()})}
async function hapusPasskey(id){if(MB())return toast('Tidak tersedia di mode bantuan',false);
 if(!await konfirmasi('Hapus passkey ini? Perangkat tersebut tidak bisa lagi dipakai masuk dengan sidik jari.',{bahaya:true,ya:'Hapus'}))return;
 guard(async()=>{const r=await db.auth.passkey.delete({passkeyId:id});if(r.error)throw r.error;await muatPasskeySaya();toast('Passkey dihapus');renderV()})}

/* ---------- halaman Profil Saya ---------- */
function editProfilSaya(){if(MB())return toast('Tidak tersedia di mode bantuan',false);const dev=role==='Developer',g=PROFIL;if(!g)return;
 const f=[{k:'nama',l:'Nama',v:g.nama},{k:'nip',l:'NIP (opsional)',v:g.nip||''}];
 if(!dev)f.push({k:'user',l:'Username',v:g.username},{k:'sandi',l:'Kata sandi baru (kosongkan bila tidak diganti)',t:'password'},{k:'lama',l:'Kata sandi saat ini (wajib bila mengganti username atau kata sandi)',t:'password'});
 setTimeout(()=>{if(!dev)pasangPkForm('lama')},0);
 form('Ubah profil saya',f,async v=>{
  const user=dev?g.username:(v.user||'').trim().toLowerCase();
  if(!v.nama||!user)throw new Error('Nama dan username wajib diisi');
  if(!dev){if(v.sandi&&v.sandi.length<6)throw new Error('Kata sandi minimal 6 karakter');
   if(!/^[a-z0-9._-]{3,20}$/.test(user))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah')}
  const ubahAkun=!dev&&(user!==g.username||!!v.sandi);
  if(ubahAkun&&!v.lama&&!pkFresh())throw new Error('Isi kata sandi saat ini atau verifikasi dengan passkey untuk mengganti username atau kata sandi');
  if(ubahAkun)await apiGuru({aksi:'akun_sendiri',username:user,sandi_baru:v.sandi||'',...bodySandi(v.lama)});
  const nip=(v.nip||'').trim()||null;
  await dbq(db.from('profil').update({nama:v.nama,nip}).eq('id',me));
  meNama=v.nama;PROFIL.nama=v.nama;PROFIL.nip=nip;if(ubahAkun)PROFIL.username=user;
  if(!dev)await muatProfil();toast(ubahAkun?'Profil dan akun diperbarui':'Profil diperbarui');renderAll()})}
/* ---------- verifikasi 2 langkah (TOTP) khusus Developer ---------- */
function tampilDua(h){$('#lg').classList.add('hid');$('#ap').classList.add('hid');$('#bn').classList.add('hid');$('#dua').classList.remove('hid');$('#duaIsi').innerHTML=h;$('#duaErr').textContent=''}
async function batalDuaFaktor(){try{await db.auth.signOut()}catch(e){}loginView()}
function salinDua(s){try{navigator.clipboard.writeText(s).then(()=>toast('Kunci disalin'),()=>toast('Tidak bisa menyalin, salin manual',false))}catch(e){toast('Tidak bisa menyalin, salin manual',false)}}
async function tempelDua(){const e=$('#duaErr'),i=$('#duaKode');if(!i)return;e.textContent='';
 try{const t=await navigator.clipboard.readText(),k=String(t||'').replace(/\D/g,'').slice(0,6);
  if(!k){e.textContent='Tidak ada angka di clipboard. Salin kode dari aplikasi autentikator lebih dulu.';return}
  i.value=k;i.focus();if(k.length<6)e.textContent='Hanya '+k.length+' angka yang terbaca. Pastikan kode terdiri dari 6 angka.'}
 catch(x){e.textContent='Tidak bisa membaca clipboard. Tekan lama di kolom kode lalu pilih Tempel.'}}
const DUA_INPUT=fid=>`<label class="mu" style="display:block;text-align:center;margin-bottom:6px">Kode 6 angka dari aplikasi</label><div style="position:relative;margin-bottom:10px"><input id="duaKode" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="width:100%;box-sizing:border-box;margin:0;text-align:center;letter-spacing:6px;font-size:20px;padding-left:48px;padding-right:48px" onkeydown="if(event.key==='Enter')kirimDua('${fid}')"><button type="button" id="tempelBtn" aria-label="Tempel" title="Tempel" onclick="tempelDua()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);width:40px;height:40px;padding:0;border:0;background:none;box-shadow:none;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">📋</button></div><button id="duaBtn" class="btn success" style="width:100%" onclick="kirimDua('${fid}')">Verifikasi</button>`;
async function cekDuaFaktor(){
 const a=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(a.error)throw a.error;
 if(a.data.currentLevel==='aal2')return true;
 const f=await db.auth.mfa.listFactors();if(f.error)throw f.error;
 const t=(f.data.totp||[])[0];
 if(t)tampilDua('<p class="mu" style="text-align:center;margin:0 0 14px">Buka aplikasi autentikator (mis. Google Authenticator) lalu masukkan kode 6 angka untuk akun Developer.</p>'+DUA_INPUT(t.id));
 else await formDaftarDua();
 return false}
async function formDaftarDua(){
 tampilDua('<p class="mu" style="text-align:center">Menyiapkan...</p>');
 const l=await db.auth.mfa.listFactors();
 for(const x of ((l.data&&l.data.all)||[]))if(x.factor_type==='totp'&&x.status!=='verified')await db.auth.mfa.unenroll({factorId:x.id});
 const r=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'Developer',issuer:'Absensi PAUD'});
 if(r.error){tampilDua('<div class="note">Gagal menyiapkan verifikasi 2 langkah: '+esc(r.error.message)+'</div>');return}
 const t=r.data.totp;
 tampilDua(`<div class="note">Akun Developer wajib memakai verifikasi 2 langkah. Pasang <b>Google Authenticator</b> (atau Microsoft Authenticator) di HP lebih dulu.</div>
 <p class="mu" style="margin:12px 0 6px"><b>Langkah 1.</b> Ketuk tombol ini, aplikasi autentikator akan terbuka:</p>
 <a class="btn success" style="display:block;text-align:center;text-decoration:none" href="${esc(t.uri)}">🔑 Buka di aplikasi autentikator</a>
 <p class="mu" style="margin:12px 0 6px">Bila tidak terbuka, pilih "Masukkan kunci penyiapan" di aplikasi lalu isi kunci ini:</p>
 <div style="display:flex;gap:8px;align-items:center"><code style="flex:1;word-break:break-all;background:#f4f4f4;padding:8px;border-radius:8px;user-select:all">${esc(t.secret)}</code><button class="btn sm soft" onclick="salinDua('${esc(t.secret)}')">Salin</button></div>
 <p class="mu" style="margin:8px 0 0;color:var(--rd)">Simpan kunci ini di tempat aman. Bila HP hilang, kunci ini dipakai untuk memasang ulang.</p>
 <details style="margin:10px 0"><summary class="mu">Tampilkan kode QR (bila dibuka dari komputer/HP lain)</summary><img id="duaQr" alt="Kode QR" style="width:100%;max-width:220px;display:block;margin:8px auto"></details>
 <p class="mu" style="margin:12px 0 6px"><b>Langkah 2.</b> Masukkan kode 6 angka yang tampil di aplikasi:</p>`+DUA_INPUT(r.data.id));
 const q=$('#duaQr');if(q)q.src=t.qr_code}
async function kirimDua(fid){const b=$('#duaBtn'),e=$('#duaErr');if(!b||b.disabled)return;e.textContent='';
 const kode=($('#duaKode').value||'').replace(/\s/g,'');
 if(!/^\d{6}$/.test(kode)){e.textContent='Masukkan 6 angka dari aplikasi autentikator';return}
 b.disabled=true;b.innerHTML='<span class="bs"></span>Memeriksa...';
 try{const c=await db.auth.mfa.challenge({factorId:fid});if(c.error)throw c.error;
  const v=await db.auth.mfa.verify({factorId:fid,challengeId:c.data.id,code:kode});if(v.error)throw v.error;
  $('#dua').classList.add('hid');await mulai()}
 catch(x){const m=(x&&x.message)||String(x);e.textContent=/invalid|expired/i.test(m)?'Kode salah atau sudah kedaluwarsa. Coba kode terbaru.':m;b.disabled=false;b.textContent='Verifikasi'}}
const galatSesi=e=>{const m=String((e&&e.message)||e||'').toLowerCase(),c=String((e&&(e.status||e.code))||'');return c==='401'||c==='PGRST301'||/jwt|refresh.?token|not authenticated|invalid.{0,12}token|auth session missing/.test(m)};
async function gagalMuat(e){
 if(galatSesi(e)){try{await db.auth.signOut()}catch(x){}return loginView('Sesi berakhir, silakan masuk lagi')}
 try{ld(0)}catch(x){}
 const mentah=String((e&&e.message)||e||'Kesalahan tidak diketahui'),detail=String((e&&e.stack)||mentah);
 if(role==='Developer')console.error('[Developer startup error]',e);
 let g=document.getElementById('gm');if(g)g.remove();
 g=document.createElement('div');g.id='gm';g.style.cssText='position:fixed;inset:0;z-index:200;background:var(--bg,#f6fbf5);color:var(--tx,#20352a);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;overflow:auto';
 g.innerHTML='<div style="max-width:520px;width:100%"><div style="font-size:42px">📡</div><h3 style="margin:10px 0 6px">Gagal memuat data</h3><div style="color:var(--mu,#6d7d73);font-size:14px;margin-bottom:14px">'+esc(idErr(mentah))+'<br>Akun Anda tetap masuk. Periksa sambungan internet lalu coba lagi.</div>'+(role==='Developer'?'<details style="text-align:left;margin:12px 0;padding:10px;border:1px solid var(--bd,#ddd);border-radius:10px"><summary style="cursor:pointer;font-weight:600">Rincian kesalahan untuk pemeriksaan</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;max-height:35vh;overflow:auto;margin-top:10px">'+esc(detail)+'</pre></details>':'')+'<button class="btn success" style="width:100%" id="gmUlang">Coba lagi</button><button class="btn soft" style="width:100%;margin-top:8px" id="gmKeluar">Keluar</button></div>';
 document.body.appendChild(g);
 g.querySelector('#gmUlang').onclick=()=>{g.remove();mulai()};
 g.querySelector('#gmKeluar').onclick=async()=>{g.remove();try{await db.auth.signOut()}catch(x){}loginView('')}}
async function mulai(){const {data:{session}}=await db.auth.getSession();if(!session)return loginView();
 try{me=session.user.id;
  const pf=await dbq(db.from('profil').select('id,nama,username,role,aktif,nip,dibuat').eq('id',me).maybeSingle());
  if(!pf||!pf.aktif){await db.auth.signOut();return loginView('Akun ini tidak terdaftar atau sudah dinonaktifkan')}
  PROFIL=pf;
  if(pf.role==='developer'){MEMB=[];if(!await cekDuaFaktor())return;return await masukDeveloper()}
  MEMB=(await dbq(db.from('keanggotaan').select('sekolah_id,role,sekolah(nama,status)').eq('profil_id',me).eq('aktif',true))).filter(x=>x.sekolah&&x.sekolah.status==='aktif').map(x=>({sekolah_id:x.sekolah_id,nama:x.sekolah.nama,role:x.role}));
  if(!MEMB.length){await db.auth.signOut();return loginView('Akun ini belum terhubung ke sekolah yang aktif. Hubungi Kepala Sekolah.')}
  let ingat=null;try{ingat=Number(sessionStorage.getItem('sekolah_aktif'))}catch(e){}
  const pilih=MEMB.length===1?MEMB[0]:MEMB.find(m=>m.sekolah_id===ingat);
  if(pilih)await masukSekolah(pilih);else tampilPilihSekolah()}
 catch(e){await gagalMuat(e)}}
async function masukDeveloper(){try{cmKosong();SEK=null;TTD_GURU={};TTD_GURU_SEK=null;TTD_GURU_DEV_DONE=false;TTD_PROFIL=null;TTD_PROFIL_USER=null;role='Developer';meNama=PROFIL.nama;
  S.absen={};S.pesan=[];S.siswa=[];S.kelas=[];S.guru=[];S.libur=[];S.nasional=[];S.nasMap=new Map();S.mingguan=[];S.set={};RHS=null;izinKelola=null;izinExp=0;S.devGuru=null;draft=null;gsel.clear();gHapusMode=false;ssel.clear();sHapusMode=false;
  try{sessionStorage.removeItem('sekolah_aktif');sessionStorage.removeItem('bukaView')}catch(e){}
  terapNama();$('#lg').classList.add('hid');$('#ap').classList.remove('hid');$('#bn').classList.remove('hid');view='dashboard';pasangBanner();await go('dashboard')}
 catch(e){await gagalMuat(e)}}
async function masukSekolah(m){try{cmKosong();SEK=m.sekolah_id;TTD_GURU={};TTD_GURU_SEK=null;TTD_PROFIL=null;TTD_PROFIL_USER=null;role=LBL[m.role];meNama=PROFIL.nama;try{sessionStorage.setItem('sekolah_aktif',SEK)}catch(e){}
  S.absen={};S.pesan=[];RHS=null;CFG_SID=null;izinKelola=null;izinExp=0;S.devGuru=null;draft=null;mMulti=false;mSel.clear();attKelas='';scanKelas='';kk='';rk='';lo='';q='';gQ='';gsel.clear();gHapusMode=false;ssel.clear();sHapusMode=false;
  KONFIG_NANTI=false;await muatDasar();if(adalahKepala()||role==='Developer')muatRahasia().then(()=>{if(view==='dashboard'&&!$('#ap').classList.contains('hid'))renderV()});$('#lg').classList.add('hid');$('#ap').classList.remove('hid');$('#bn').classList.remove('hid');
  let bv=null;try{bv=sessionStorage.getItem('menu_terakhir')||sessionStorage.getItem('bukaView');sessionStorage.removeItem('bukaView')}catch(e){}view=(bv&&allowed(bv))?bv:'dashboard';pasangBanner();await go(view);if(adalahKepala())setTimeout(sapaAwal,300)}
 catch(e){await gagalMuat(e)}}
function tampilPilihSekolah(){info('Pilih sekolah','<div class="note">Akun Anda terdaftar di lebih dari satu sekolah. Pilih sekolah yang ingin dibuka.</div>'+MEMB.map(m=>`<button class="btn success" style="width:100%;margin:6px 0;display:flex;justify-content:space-between;gap:10px" onclick="pilihSekolah(${m.sekolah_id})"><span>🏫 ${esc(m.nama)}</span><small>${esc(LBL[m.role])}</small></button>`).join(''));{const b=$('#mtp');if(b){b.textContent='Keluar';b.className='btn danger';b.onclick=()=>{closeM();keluar()}}}}
async function pilihSekolah(id){const m=MEMB.find(x=>x.sekolah_id===id);if(!m)return;closeM();ld(1,'Membuka sekolah...');try{await masukSekolah(m)}finally{ld(0)}}
async function gantiSekolah(){if(scanKunci())return tolakKunci();if(!await jagaTanya('semua'))return;await stopScan();drw(0);tampilPilihSekolah()}
/* ---- Beralih akun tanpa keluar: pilih akun passkey lain di HP ini, verifikasi, lalu aplikasi dimuat ulang ke akun itu.
   Akun sekarang tetap aktif bila dibatalkan atau gagal. ---- */
const akunLain=()=>(PK_OK&&!MB())?pkAkunList().filter(x=>!PROFIL||x.u!==PROFIL.username):[];
async function beralihAkun(){if(scanKunci())return tolakKunci();if(MB())return toast('Tidak tersedia di mode bantuan',false);if(!await jagaTanya('semua'))return;await stopScan();drw(0);
 const a=akunLain();if(!a.length)return toast('Belum ada akun lain di HP ini. Aktifkan passkey di akun lain lewat menu Profil Saya',false);
 info('Beralih akun','<div class="note">Pilih akun yang ingin dibuka. Anda akan diminta sidik jari atau kunci layar akun itu. Bila dibatalkan, akun sekarang tetap aktif.</div>'
  +(PROFIL?'<div class="mu" style="margin:6px 0">Akun sekarang: <b>'+esc(PROFIL.nama||PROFIL.username)+'</b></div>':'')
  +a.map(x=>`<button class="btn soft" style="width:100%;text-align:left;margin:6px 0" onclick="closeM();pkBeralih('${esc(x.c)}')">👤 <b>${esc(x.n||x.u)}</b><div class="mu">${esc(x.u)}</div></button>`).join(''))}
function pkBeralih(credId){guard(async()=>{
 const o={allowId:credId,hasil:null},pulih=pkSadap(o);let x;
 try{try{x=await db.auth.signInWithPasskey()}finally{pulih()}
  if(x.error)throw x.error;if(!x.data||!x.data.session||!x.data.user)throw new Error('Passkey tidak menghasilkan sesi')}
 catch(e){
  if(/webauthn_credential_not_found/.test(pkKode(e)))pkAkunHapus(credId);
  throw new Error(pkPesan(e))}
 if(x.data.user.id===me)return toast('Itu akun yang sedang dipakai');
 ld(1,'Beralih akun...');
 try{sessionStorage.clear()}catch(e){}
 try{if('caches' in window){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(e){}
 try{const c=new URL(location.href);c.search='';c.hash='';location.replace(c.href)}catch(e){location.reload()}
},1)}
async function tanyaKeluar(){
 if(!await jagaTanya('semua'))return;
 const banyak=Array.isArray(MEMB)&&MEMB.length>1&&role!=='Developer',banyakAkun=akunLain().length>0;
 info('Keluar dari halaman ini?','<div style="text-align:center"><div style="font-size:42px;line-height:1">🚪</div><div class="mu" style="font-size:14px;margin:10px 0 16px">Apakah Anda benar-benar ingin keluar dari halaman ini?'+(banyak?'<br>Akun Anda terdaftar di lebih dari satu sekolah, jadi Anda juga bisa beralih sekolah tanpa keluar.':'')+(banyakAkun?'<br>Ada akun lain di HP ini, jadi Anda juga bisa beralih akun tanpa keluar.':'')+'</div><div class="fg"><button class="btn danger" style="width:100%" onclick="closeM();keluar()">Ya, keluar</button>'+(banyak?'<button class="btn success" style="width:100%" onclick="closeM();gantiSekolah()">🔁 Beralih sekolah</button>':'')+(banyakAkun?'<button class="btn success" style="width:100%" onclick="closeM();beralihAkun()">👤 Beralih akun</button>':'')+'<button class="btn soft" style="width:100%" onclick="closeM()">Batal</button></div></div>')}
async function keluar(){
  if(scanKunci())return tolakKunci();
  /*
   * LOGOUT TOTAL APLIKASI
   * Membersihkan sesi Supabase + seluruh storage/cache milik origin aplikasi.
   * Tidak menghapus data browser di luar situs/aplikasi ini.
   */
  const origin=location.origin;

  try{await stopScan('keluar')}catch(e){}

  // 1. Putuskan sesi Supabase terlebih dahulu.
  try{await db.auth.signOut({scope:'global'})}
  catch(e){try{await db.auth.signOut()}catch(_e){}}

  // 2. Bersihkan sessionStorage dan localStorage aplikasi.
  try{sessionStorage.clear()}catch(e){}
  const _pks={};try{['pk_aktif','pk_akun','tema_ui','logo_sekolah','suara_scanner','antrian_scan'].forEach(k=>{const v=localStorage.getItem(k);if(v!=null)_pks[k]=v})}catch(e){}
  try{Object.keys(localStorage).filter(k=>/^pk_(off|pil)_/.test(k)).forEach(k=>{_pks[k]=localStorage.getItem(k)})}catch(e){}
  try{localStorage.clear()}catch(e){}
  try{Object.keys(_pks).forEach(k=>localStorage.setItem(k,_pks[k]))}catch(e){}

  // 3. Hapus cookie yang dapat diakses JavaScript pada origin ini.
  try{
    const cookies=document.cookie?document.cookie.split(';'):[];
    for(const c of cookies){
      const eq=c.indexOf('=');
      const name=(eq>=0?c.slice(0,eq):c).trim();
      if(!name)continue;
      document.cookie=name+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      document.cookie=name+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain='+location.hostname;
    }
  }catch(e){}

  // 4. Bersihkan Cache Storage milik aplikasi.
  try{
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch(e){}

  // 5. Lepaskan Service Worker agar tidak menghidupkan kembali state lama.
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter(r=>!/\/sw\.js(\?|$)/.test((r.active||r.waiting||r.installing||{scriptURL:''}).scriptURL||'')).map(r=>r.unregister()));
    }
  }catch(e){}

  // 6. Hapus seluruh IndexedDB database pada origin ini bila browser mendukungnya.
  try{
    if(indexedDB && typeof indexedDB.databases==='function'){
      const dbs=await indexedDB.databases();
      await Promise.all((dbs||[]).map(x=>{
        if(!x||!x.name)return Promise.resolve();
        return new Promise(resolve=>{
          const req=indexedDB.deleteDatabase(x.name);
          req.onsuccess=req.onerror=req.onblocked=()=>resolve();
        });
      }));
    }
  }catch(e){}

  // 7. Reset variabel runtime sebelum memuat ulang.
  try{
    SEK=null;MEMB=[];PROFIL=null;me=null;meNama='';role='';view='dashboard';
    S={siswa:[],kelas:[],guru:[],libur:[],mingguan:[],set:{},absen:{},pesan:[],kirim:{}};
    draft=null;RHS=null;izinKelola=null;izinExp=0;
    okL={};liburPrompted={};scanner=null;busy=false;lastKode='';lastAt=0;usbOn=false;usbQ=[];usbPh='idle';
    sessionStorage.clear();
  }catch(e){}

  // 8. Hard reload ke URL bersih tanpa parameter/hash lama.
  try{
    const clean=new URL(location.href);
    clean.search='';
    clean.hash='';
    location.replace(clean.href);
  }catch(e){
    location.reload();
  }
}
let drwT=null;
function drw(o){const d=$('#drw');if(o){clearTimeout(drwT);d.classList.remove('closing');d.classList.add('show');return}
 if(!d.classList.contains('show')||d.classList.contains('closing'))return;
 d.classList.add('closing');clearTimeout(drwT);drwT=setTimeout(()=>d.classList.remove('show','closing'),310)}

/* Pencarian menu dan fitur: hasil dipilih manual, tidak ada navigasi saat mengetik. */
const CARI_FITUR=[
 ...MENUS.map(m=>({id:m[0],label:m[1],path:m[1],icon:m[2],type:'menu'})),
 {id:'pnAlpa',label:'Alpa Otomatis',path:'Pengaturan → Alpa Otomatis',icon:'⏰',type:'pengaturan'},
 {id:'pnNotifLibur',label:'Notifikasi Libur',path:'Pengaturan → Notifikasi Libur',icon:'🔔',type:'pengaturan'},
 {id:'pnTabungan',label:'Pengaturan Tabungan',path:'Pengaturan → Tabungan',icon:'💰',type:'pengaturan'},
 {id:'pnPiket',label:'Jadwal Piket',path:'Pengaturan → Jadwal Piket',icon:'🧹',type:'pengaturan'},
 {id:'pnHafalan',label:'Pengaturan Hafalan',path:'Pengaturan → Hafalan',icon:'📖',type:'pengaturan'},
 {id:'pnNotifOrtu',label:'Notifikasi Orang Tua',path:'Pengaturan → Notifikasi Orang Tua',icon:'📨',type:'pengaturan'},
 {id:'pnNama',label:'Nama Sekolah',path:'Pengaturan → Nama Sekolah',icon:'🏫',type:'pengaturan'},
 {id:'pnLogo',label:'Logo Sekolah',path:'Pengaturan → Logo Sekolah',icon:'🖼️',type:'pengaturan'},
 {id:'pnStempel',label:'Stempel Sekolah',path:'Pengaturan → Stempel Sekolah',icon:'🔖',type:'pengaturan'},
 {id:'pnFotoOrtu',label:'Foto Orang Tua',path:'Pengaturan → Foto Orang Tua',icon:'👨‍👩‍👧',type:'pengaturan'},
 {id:'pnAlamat',label:'Alamat Sekolah',path:'Pengaturan → Alamat Sekolah',icon:'📍',type:'pengaturan'},
 {id:'pnKonfig',label:'Konfigurasi Webhook',path:'Pengaturan → Konfigurasi Webhook',icon:'🔗',type:'pengaturan'},
 {id:'kel',label:'Pengaturan Penilaian, Kelompok dan Indikator',path:'Penilaian Siswa → Pengaturan',icon:'⚙️',type:'penilaian'},
 {id:'nilai',label:'Penilaian Siswa',path:'Penilaian Siswa → Penilaian',icon:'📝',type:'penilaian'},
 {id:'mapel',label:'Mapel dan KKM',path:'Penilaian Siswa → Mapel & KKM',icon:'📚',type:'penilaian'},
 {id:'kep',label:'Keputusan Akhir',path:'Penilaian Siswa → Keputusan Akhir',icon:'🎓',type:'penilaian'},
 {id:'kirim',label:'Kirim Laporan Raport',path:'Penilaian Siswa → Kirim Laporan',icon:'📤',type:'penilaian'},
 /* Tab di dalam menu utama */
 {id:'pindah',label:'Pindah Kelas',path:'Kelola Siswa → Pindah Kelas',icon:'↔️',type:'tab',parent:'kelola'},
 {id:'naik',label:'Naik Kelas',path:'Kelola Siswa → Naik Kelas',icon:'⬆️',type:'tab',parent:'kelola'},
 {id:'tinggal',label:'Tinggal Kelas',path:'Kelola Siswa → Tinggal Kelas',icon:'🔁',type:'tab',parent:'kelola'},
 {id:'lulus',label:'Kelulusan',path:'Kelola Siswa → Kelulusan',icon:'🎓',type:'tab',parent:'kelola'},
 {id:'pengesahan',label:'Pengesahan',path:'Kelola Siswa → Pengesahan',icon:'✅',type:'tab',parent:'kelola'},
 {id:'in',label:'Pemasukan Tabungan',path:'Tabungan → Pemasukan',icon:'⬇️',type:'tab',parent:'tabungan'},
 {id:'out',label:'Pengeluaran Tabungan',path:'Tabungan → Pengeluaran',icon:'⬆️',type:'tab',parent:'tabungan'},
 {id:'rek',label:'Rekap dan Laporan Tabungan',path:'Tabungan → Rekap & Laporan',icon:'📊',type:'tab',parent:'tabungan'},
 {id:'jadwal',label:'Jadwal Piket',path:'Jadwal Piket → Jadwal',icon:'📅',type:'tab',parent:'piket'},
 {id:'jenis',label:'Jenis Piket',path:'Jadwal Piket → Jenis Piket',icon:'🏷️',type:'tab',parent:'piket'},
 {id:'setor',label:'Setor Hafalan',path:'Hafalan → Setor',icon:'✍️',type:'tab',parent:'hafalan'},
 {id:'daftar',label:'Daftar Hafalan',path:'Hafalan → Daftar Hafalan',icon:'📋',type:'tab',parent:'hafalan'},
 {id:'rekap',label:'Rekap Hafalan',path:'Hafalan → Rekap',icon:'📊',type:'tab',parent:'hafalan'},
 {id:'jenis',label:'Jenis Hafalan',path:'Hafalan → Jenis',icon:'🏷️',type:'tab',parent:'hafalan'},
 {id:'masuk',label:'Pesan Masuk',path:'Pesan WA → Pesan Masuk',icon:'💬',type:'tab',parent:'pesan'},
 {id:'riwayat',label:'Riwayat Status Pesan',path:'Pesan WA → Riwayat Status Pesan',icon:'📋',type:'tab',parent:'pesan'}
];
let cariTerbuka=false,cariHasil=[],cariPilih=0;
function pencarianToggle(){
 const p=$('#dashSearchPanel');if(!p)return;
 cariTerbuka=!cariTerbuka;p.hidden=!cariTerbuka;
 if(cariTerbuka){setTimeout(()=>$('#dashSearchInput')?.focus(),50);pencarianInput($('#dashSearchInput')?.value||'')}
 else pencarianTutup();
}
function pencarianTutup(){
 cariTerbuka=false;const p=$('#dashSearchPanel');if(p)p.hidden=true;
 const i=$('#dashSearchInput');if(i)i.value='';
 const r=$('#dashSearchResults');if(r)r.innerHTML='';
 cariHasil=[];cariPilih=0;
}
function pencarianCocok(q,item){
 const norm=x=>String(x||'').toLocaleLowerCase('id').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const kata=norm(q).split(/\s+/).filter(Boolean),target=norm(item.label+' '+item.path);
 if(!kata.length)return false;
 const tokens=target.split(' ');
 return kata.every(k=>tokens.some(t=>t.startsWith(k)||t.includes(k))||target.includes(k));
}
function pencarianInput(v){
 const r=$('#dashSearchResults');if(!r)return;
 const q=String(v||'').trim();cariPilih=0;
 if(!q){cariHasil=[];r.innerHTML='<div class="dash-search-empty">Ketik nama menu atau fitur yang ingin dicari.</div>';return}
 cariHasil=CARI_FITUR.filter(x=>allowed(x.type==='tab'?x.parent:x.type==='pengaturan'?'pengaturan':x.type==='penilaian'?'penilaian':x.id)&&pencarianCocok(q,x)).slice(0,10);
 r.innerHTML=cariHasil.length?cariHasil.map((x,i)=>'<button type="button" class="dash-search-result" role="option" aria-selected="'+(i===0)+'" onclick="pencarianBuka('+i+')"><span class="dsr-icon">'+x.icon+'</span><span class="dsr-main"><span class="dsr-name">'+esc(x.label)+'</span><span class="dsr-path">'+esc(x.path)+'</span></span><span aria-hidden="true">›</span></button>').join(''):'<div class="dash-search-empty">Tidak ada menu atau fitur yang cocok.</div>';
}
function pencarianKey(e){
 if(e.key==='Escape'){e.preventDefault();pencarianTutup();return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  if(!cariHasil.length)return;e.preventDefault();cariPilih=(cariPilih+(e.key==='ArrowDown'?1:-1)+cariHasil.length)%cariHasil.length;
  document.querySelectorAll('.dash-search-result').forEach((b,i)=>b.setAttribute('aria-selected',String(i===cariPilih)));
  document.querySelectorAll('.dash-search-result')[cariPilih]?.scrollIntoView({block:'nearest'});return
 }
 if(e.key==='Enter'&&cariHasil.length){e.preventDefault();pencarianBuka(cariPilih)}
}
async function pencarianBuka(i){
 const x=cariHasil[i];if(!x)return;
 pencarianTutup();
 if(x.type==='pengaturan')return lompatPengaturan(x.id);
 if(x.type==='penilaian'){await go('penilaian');pnHal(x.id);return}
 if(x.type==='tab'){
  await go(x.parent);
  if(x.parent==='kelola')return klTab(x.id);
  if(x.parent==='tabungan')return tabHal(x.id);
  if(x.parent==='piket')return pkHal(x.id);
  if(x.parent==='hafalan')return hfHal(x.id);
  if(x.parent==='pesan')return pesHal(x.id);
  return;
 }
 return go(x.id);
}
document.addEventListener('click',e=>{const p=$('#dashSearchPanel'),b=$('#dashSearchToggle');if(cariTerbuka&&p&&!p.contains(e.target)&&b&&!b.contains(e.target))pencarianTutup()});

async function go(id){if(scanKunci()&&id!=='scan')return tolakKunci();if(!await jagaTanya('semua'))return;tpTutup();usbStop(true);await stopScan();TODAY=hariIni();const paksa=(id===view);view=id;try{if(allowed(id))sessionStorage.setItem('menu_terakhir',id)}catch(e){}if(id!=='pesan'){pHapusMode=false;pesTab='masuk';psel.clear()}if(id==='scan')kunciMulai();drw(0);if(id!=='absensi')draft=null;liburPrompted={};$('#v').innerHTML='';ld(1);
 try{if(LOAD[id]){const ck=cmKunci(id);if(!(ck&&!paksa&&cmOk(ck[0],ck[1]))){const v0=cmVer;await LOAD[id](paksa);if(ck&&v0===cmVer)cmCatat(ck[0],v0)}}}catch(e){toast(e.message||e,false)}finally{ld(0)}renderAll();scrollTo(0,0)}
function renderAll(){
 const ms=MENUS.filter(m=>allowed(m[0])),bt=m=>`<button class="${view===m[0]?'on':''}" onclick="go('${m[0]}')"><span>${m[2]}</span>${m[1]}</button>`;let h;
 if(role==='Developer')h=ms.map(bt).join('');
 else{const pakai=new Set();h=MENU_GRUP.map(([j,ids])=>{const it=ids.map(i=>ms.find(m=>m[0]===i)).filter(Boolean);it.forEach(m=>pakai.add(m[0]));return it.length?`<div class="ngrp"><div class="ngt">${j}</div>${it.map(bt).join('')}</div>`:''}).join('');const sisa=ms.filter(m=>!pakai.has(m[0]));if(sisa.length)h+=`<div class="ngrp">${sisa.map(bt).join('')}</div>`}
 const hx=h+(MEMB.length>1?'<button onclick="gantiSekolah()"><span>🔁</span>Beralih sekolah</button>':'')+(akunLain().length?'<button onclick="beralihAkun()"><span>👤</span>Beralih akun</button>':'');$('#sn').innerHTML=hx;$('#dn').innerHTML=hx;const pref=(role==='Developer'?['developer']:['dashboard','absensi','scan','tabungan']).filter(allowed).slice(0,4);
 $('#bn').innerHTML=pref.map(id=>{const m=MENUS.find(x=>x[0]===id);return `<button class="${view===id?'on':''}" onclick="go('${id}')"><span>${id==='scan'?'<svg width="32" height="32" viewBox="0 0 32 32" style="display:block;margin:-2px auto 1px"><rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="none" stroke="currentColor" stroke-width="2.4"/><g fill="currentColor"><rect x="7" y="8" width="2" height="16"/><rect x="10.5" y="8" width="1" height="16"/><rect x="13" y="8" width="3" height="16"/><rect x="17.5" y="8" width="1.2" height="16"/><rect x="20.2" y="8" width="2.2" height="16"/><rect x="24" y="8" width="1" height="16"/></g></svg>':m[2]}</span>${m[1]}</button>`}).join('')+`<button onclick="drw(1)"><span>☰</span>Menu</button>`;
 $('#dt').textContent=fmt(TODAY);$('#who').textContent=meNama+' - '+role+(MEMB.length>1?' · '+((MEMB.find(m=>m.sekolah_id===SEK)||{}).nama||''):'');renderV()}
let ko='landscape',km='terpisah';
let ks='depan';
let kartuTok=0;
const jedaGambar=()=>new Promise(r=>{let selesai=false;const f=()=>{if(selesai)return;selesai=true;r()};try{requestAnimationFrame(f)}catch(e){setTimeout(f,16)}setTimeout(f,80)});
let kartuIO=null;
/* gambar kartu dibuat hanya untuk yang terlihat atau hampir terlihat; foto diunduh paralel (maks 4) */
async function muatGambarKartu(){
 const tok=++kartuTok,imgs=[...document.querySelectorAll('#v img[data-kartu-id]')],st=$('#kartuStatus');
 if(kartuIO){try{kartuIO.disconnect()}catch(e){}kartuIO=null}
 const stat=(on,n)=>{if(!st)return;st.style.display=on?'flex':'none';if(on)st.innerHTML='<span class="kspn sm"></span><span>Menyiapkan kartu'+(n>1?' ('+n+' menunggu)':'')+'...</span>'};
 const siswaDari=im=>im.dataset.kartuId==='uji'?siswaUji():siswaById(Number(im.dataset.kartuId));
 const antre=[],pfAntre=[];let jalan=false,pf=0;
 const pfJalan=()=>{while(pf<4&&pfAntre.length){const s=pfAntre.shift();pf++;fotoSiap(s).catch(()=>{}).finally(()=>{pf--;pfJalan()})}};
 const jarakLayar=im=>{if(!im||!im.isConnected)return Infinity;const r=im.getBoundingClientRect();if(r.bottom>=0&&r.top<=window.innerHeight)return 0;return Math.min(Math.abs(r.top),Math.abs(r.bottom-window.innerHeight))};
 const ambilPrioritas=()=>{let ix=0,jarak=Infinity;for(let i=0;i<antre.length;i++){const d=jarakLayar(antre[i]);if(d<jarak){jarak=d;ix=i;if(d===0)break}}return antre.splice(ix,1)[0]};
 const isi=async im=>{const s=siswaDari(im);
  if(s){const sd=im.dataset.sisi||'depan';if(sd==='depan')await fotoSiap(s);if(tok!==kartuTok)return;im.src=kartuUrl(s,sd,true);im.alt='Kartu '+sd+' '+(s.pan||'');try{await im.decode()}catch(e){}}
  const w=im.closest('.kwrap');if(w)w.classList.add('siap')};
 const pompa=async()=>{if(jalan)return;jalan=true;
  try{while(antre.length){if(tok!==kartuTok)return;stat(true,antre.length);await jedaGambar();if(tok!==kartuTok)return;const im=ambilPrioritas();if(!im||!im.isConnected)continue;try{await isi(im)}catch(e){console.warn('Kartu gagal dibuat',e)}}}
  finally{jalan=false;if(tok===kartuTok&&!antre.length)stat(false)}};
 const masuk=im=>{if(antre.includes(im))return;const s=siswaDari(im);if(s&&(im.dataset.sisi||'depan')==='depan'&&s.foto_path&&!fotoMuat(s))pfAntre.push(s);antre.push(im);pfJalan();pompa()};
 if(!('IntersectionObserver' in window)){imgs.forEach(masuk);return}
 const io=new IntersectionObserver(es=>{for(const e of es){if(!e.isIntersecting)continue;io.unobserve(e.target);masuk(e.target)}},{rootMargin:'500px 0px'});
 kartuIO=io;imgs.forEach(im=>io.observe(im));
}
function renderV(){
 tutupAksi();const _tb=view==='kelola'||view==='tabungan'||view==='piket'||view==='hafalan'||view==='penilaian'||view==='pesan',_sl=_tb?(document.querySelector('#v .utabs')||{}).scrollLeft:0;
 $('#v').innerHTML=V[view]();if(view==='dashboard'&&window.AbsensiPWA)AbsensiPWA.updateButton();
 if(document.getElementById('hrJam'))hrMulai();
 if(role==='Developer')renderNavDev();
 enhanceCustomSelects($('#v'));
 if(_tb)utabTengah(_sl);
 if(view==='kartu')muatGambarKartu().catch(e=>toast('Gagal menyiapkan kartu: '+(e.message||e),false));
}
function form(t,f,cb){window._otpAktif=f.some(x=>!!x.ver);window._fver={};f.forEach(x=>{if(x.ver)_fver[x.k]=x.ver});$('#ms').textContent='Simpan';$('#ms').style.display='';$('#mt').textContent=t;$('#mbd').innerHTML='<div class="fg">'+f.map(x=>`<div class="fd"><label class="l">${x.l}</label>${x.ro?`<input id="f_${x.k}" class="input" value="${esc(x.v||'')}" readonly style="background:#f1f5f2;color:var(--mu)">`:x.o?`<select id="f_${x.k}" class="select">${x.o.map(o=>`<option ${o===x.v?'selected':''}>${esc(o)}</option>`).join('')}</select>`:x.t==='date'||x.t==='year'?dt(x.t,x.v||'','','',{id:'f_'+x.k,min:x.t==='year'?'1990-01-01':(x.min||'2000-01-01'),max:x.t==='year'?(+TODAY.slice(0,4)+1)+'-12-31':'2099-12-31',kosong:x.t==='date',ref:x.ref}):x.t==='time'?dt('time',x.v||'','','',{id:'f_'+x.k}):x.ver?`<div style="display:flex;gap:8px"><input id="f_${x.k}" class="input" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="flex:1" value="${esc(x.v||'')}"><button type="button" class="btn soft" onclick="formVer('${x.k}')">Verifikasi</button></div><div id="fv_${x.k}" class="mu" style="margin-top:4px"></div>`:`<input id="f_${x.k}" class="input" type="${x.t||'text'}" value="${esc(x.v||'')}">`}</div>`).join('')+'</div>';
 enhanceCustomSelects($('#mbd'));enhanceSecretInputs($('#mbd'));f.forEach(x=>{if(x.pkb)setTimeout(()=>pasangPkForm(x.k,1),0)});
 $('#ms').onclick=()=>{const v={};f.forEach(x=>v[x.k]=$('#f_'+x.k).value.trim());return Promise.resolve().then(()=>cb(v)).then(()=>{closeM();return true}).catch(e=>{toast(e.message||String(e),false);return false})};$('#md').classList.add('show');jagaModal(t,$('#ms').onclick,!window._otpAktif&&!JG_TOLAK.test(String(t)))}
async function formVer(k){const el=$('#f_'+k),o=$('#fv_'+k),fn=window._fver&&_fver[k];if(!el||!fn||!o)return;const kode=el.value.trim();
 if(!/^\d{6}$/.test(kode)){o.style.color='var(--rd)';o.textContent='Kode harus 6 angka';return}
 o.style.color='';o.textContent='Memeriksa...';
 try{await fn(kode);o.style.color='#1f9d55';o.textContent='✓ Kode benar. Silakan lanjutkan.'}catch(e){o.style.color='var(--rd)';o.textContent='✗ '+idErr(e.message||e)}}
async function verifikasiDaftar(){const wa=normWA($('#dfWa').value),kode=$('#dfKd').value.trim(),o=$('#dfVs');
 if(!/^628\d{8,12}$/.test(wa)){o.style.color='var(--rd)';o.textContent='Isi nomor WhatsApp dulu';return}
 if(!/^\d{6}$/.test(kode)){o.style.color='var(--rd)';o.textContent='Kode harus 6 angka';return}
 o.style.color='';o.textContent='Memeriksa...';
 try{await apiPublik({aksi:'otp_cek',keperluan:'daftar',nomor:wa,kode});o.style.color='#1f9d55';o.textContent='✓ Kode benar. Silakan lanjutkan.'}catch(e){o.style.color='var(--rd)';o.textContent='✗ '+idErr(e.message||e)}}
function closeM(){delete JGM.modal;const pv=$('#rpPrev');if(pv){pv.querySelectorAll('canvas').forEach(c=>{c.width=c.height=0});pv.innerHTML=''}$('#md').classList.remove('show','besar');window._otpAktif=false;window._pnOk=null;const m=$('#ms');if(m){m.className='btn success';m.disabled=false}resetTutup()}
/* Verifikasi kode (OTP): bila popup tertutup tanpa sengaja, tombol yang sama langsung membuka lagi pemasukan kode (10 menit) */
const OTP_TUNDA={};
function otpSimpan(k,meta,buka,mulai){OTP_TUNDA[k]={t:Date.now(),meta:meta||{},buka,mulai}}
function otpHapus(k){delete OTP_TUNDA[k]}
function otpLanjut(k,cek,args){const p=OTP_TUNDA[k];if(!p)return false;if(Date.now()-p.t>10*60000||(cek&&!cek(p.meta))){delete OTP_TUNDA[k];return false}
 p.buka(...(args||[]));const b=$('#mbd');if(b)b.insertAdjacentHTML('beforeend','<div class="note" style="margin-top:10px">Kode yang sudah dikirim tadi masih bisa dipakai. Bila kode tidak masuk atau sudah kedaluwarsa, kirim kode baru.<div class="tb" style="margin:8px 0 0"><button type="button" class="btn soft sm" onclick="otpUlang(\''+k+'\')">↻ Kirim kode baru</button></div></div>');return true}
function otpUlang(k){const p=OTP_TUNDA[k];delete OTP_TUNDA[k];closeM();if(p&&p.mulai)setTimeout(p.mulai,150)}
async function tutupM(){if(!await jagaTanya(['modal']))return;if(window._otpAktif&&$('#md').classList.contains('show')){const ya=await konfirmasi('Kode verifikasi sudah dikirim. Bila ditutup, tekan tombol yang sama lagi dalam 10 menit untuk langsung memasukkan kode tanpa mengirim kode baru.\n\nTutup sekarang?',{judul:'Tutup verifikasi?',ikon:'🔑',ya:'Tutup'});if(!ya)return}closeM()}
function konfirmasi(pesan,o){o=o||{};const _g=$('#cfg');if(_g){if(o.gambar){_g.src=o.gambar;_g.style.display='block'}else{_g.removeAttribute('src');_g.style.display='none'}}return new Promise(res=>{const m=$('#cf'),y=$('#cfy'),n=$('#cfn');$('#cfi').textContent=o.ikon||(o.bahaya?'🗑️':'❓');$('#cft').textContent=o.judul||'Konfirmasi';$('#cfm').textContent=pesan;y.textContent=o.ya||'Ya';y.className='btn '+(o.bahaya?'danger':'success');
 const kd=e=>{if(e.key==='Escape')fin(false)},fin=v=>{document.removeEventListener('keydown',kd);m.classList.remove('show');y.onclick=n.onclick=m.onclick=null;res(v)};
 document.addEventListener('keydown',kd);y.onclick=()=>fin(true);n.onclick=()=>fin(false);m.onclick=e=>{if(e.target===m)fin(false)};m.classList.add('show');y.focus()})}
const V={};
function nomorHilangProfil(){if(MB())return toast('Tidak tersedia di mode bantuan',false);
 const sk=(MEMB.find(m=>m.sekolah_id===SEK)||{}).nama||'';if(!sk||!PROFIL)return toast('Data sekolah tidak ditemukan',false);
 if(otpLanjut('hilang_profil'))return;
 form('Nomor WhatsApp hilang',[{k:'wa',l:'Nomor WhatsApp BARU yang aktif (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.wa);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp baru tidak valid');
  await apiPublik({aksi:'hilang_otp',nomor:wa});toast('Kode dikirim ke nomor baru');
  const bukaV=()=>{form('Verifikasi nomor baru',[{k:'kode',l:'Kode 6 angka yang dikirim ke nomor baru ('+fmtWA(wa)+')',ver:kd=>apiPublik({aksi:'otp_cek',keperluan:'nomor_hilang',nomor:wa,kode:kd})},{k:'ubaru',l:'Username baru (kosongkan bila tidak ingin mengganti)'},{k:'sandi',l:'Kata sandi baru (kosongkan bila tidak ingin mengganti)',t:'password'},{k:'sandi2',l:'Ulangi kata sandi baru',t:'password'}],async z=>{
    if(!/^\d{6}$/.test(z.kode))throw new Error('Kode harus 6 angka');
    const ub=(z.ubaru||'').trim().toLowerCase();
    if(ub&&!/^[a-z0-9._-]{3,20}$/.test(ub))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
    if(z.sandi&&z.sandi.length<6)throw new Error('Kata sandi minimal 6 karakter');
    if(z.sandi!==(z.sandi2||''))throw new Error('Ulangi kata sandi dengan benar');
    await apiPublik({aksi:'hilang_kirim',nama:PROFIL.nama,nama_sekolah:sk,username_lama:PROFIL.username,nomor:wa,kode:z.kode,username_baru:ub,sandi_baru:z.sandi||''});otpHapus('hilang_profil');
    setTimeout(()=>info('Permintaan terkirim','<div class="note">Permintaan ganti nomor sudah dikirim ke admin untuk diperiksa. Anda akan dikabari lewat WhatsApp di nomor baru setelah disetujui. Nomor, username, dan kata sandi lama tidak berubah sebelum disetujui.</div>'),150)});$('#ms').textContent='Kirim permintaan'};otpSimpan('hilang_profil',{},bukaV,()=>nomorHilangProfil());setTimeout(bukaV,150)});$('#ms').textContent='Kirim kode ke nomor baru'}
/* ---------- pengingat kelengkapan profil & passkey di dashboard ---------- */
async function muatStatusProfil(){try{if(role==='Developer'||MB()||!me)return;
 S.nomor=await muatNomor();
 if(S.pkUid!==me){S.pkUid=me;await muatPasskeySaya()}}catch(e){}}
function notifProfil(){if(role==='Developer'||MB()||!PROFIL)return '';const m=[];
 if(!String(PROFIL.nip||'').trim())m.push('NIP');
 if(S.nomor&&!String(S.nomor[me]||'').trim())m.push('nomor WhatsApp');
 if(PK_OK&&Array.isArray(S.pk)&&!S.pk.length)m.push('passkey (masuk dengan sidik jari)');
 if(!m.length)return '';
 return `<div><b>👤 Profil belum lengkap.</b><div class="mu">Belum diisi: ${m.join(', ')}. Lengkapi di menu Profil Saya agar akun Anda aman dan mudah dipakai masuk.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="lompatKe('profil','${(String(PROFIL.nip||'').trim()&&S.nomor&&String(S.nomor[me]||'').trim())?'pnPasskey':'pnProfil'}')">Atur sekarang</button></div></div>`}
/* ---------- notifikasi fitur belum aktif (alpa otomatis, libur mingguan, tabungan) ---------- */
const fiturBelum=()=>{const L=[];if(!S.set)return L;
 if(!S.set.alpa_aktif)L.push({n:'⏰ Alpa otomatis',t:'alpa otomatis',f:"lompatPengaturan('pnAlpa','cbAlpa')"});
 if(!S.set.notif_libur_aktif||!S.set.notif_libur_mingguan){const b=[];if(!S.set.notif_libur_aktif)b.push('notifikasi libur');if(!S.set.notif_libur_mingguan)b.push('libur mingguan');L.push({n:'🔔 Notifikasi libur ('+b.join(' dan ')+')',t:'notifikasi libur ('+b.join(' dan ')+')',f:"lompatPengaturan('pnNotifLibur','"+(!S.set.notif_libur_aktif?'cbNotifLibur':'cbNotifMingguan')+"')"})}
 if(!S.set.tabungan_aktif)L.push({n:'💰 Tabungan siswa',t:'tabungan siswa',f:"lompatPengaturan('pnTabungan','cbTabungan')"});
  if(!S.set.piket_aktif)L.push({n:'🧹 Jadwal piket',t:'jadwal piket',f:"lompatPengaturan('pnPiket','cbPiket')"});
  if(!S.set.hafalan_aktif)L.push({n:'📖 Hafalan',t:'hafalan',f:"lompatPengaturan('pnHafalan','cbHafalan')"});
 return L};
function notifFitur(){if(role==='Developer'||!me)return '';const L=fiturBelum();if(!L.length)return '';
 if(adalahKepala())return `<div><b>🔔 Fitur belum aktif.</b><div class="mu">Fitur berikut belum diaktifkan. Tekan Atur untuk langsung membuka pengaturannya.</div>${L.map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px"><span>${x.n}</span><button class="btn sm success" onclick="${x.f}">Atur</button></div>`).join('')}</div>`;
 return `<div><b>🔔 Fitur belum aktif.</b><div class="mu">Belum aktif: ${L.map(x=>x.t).join(', ')}. Silakan informasikan kepada Kepala Sekolah agar fitur ini diaktifkan di Pengaturan.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="hubungiKepala()">💬 Hubungi Kepala Sekolah</button>${(S.guru||[]).some(g=>g.role==='operator'&&g.aktif)?`<button class="btn sm success" onclick="hubungiOperator()">💬 Hubungi Operator</button>`:''}</div></div>`}
async function hubungiKepala(){
 const G=S.guru||[],N=S.nomor||{},ada=g=>g.aktif&&String(N[g.id]||'').trim();
 const kp=G.filter(g=>g.role==='kepala_sekolah').find(ada)||G.filter(g=>g.role==='wakil_kepala').find(ada);
 let nomor=kp?String(N[kp.id]):(S.nomorKepala||'');
 if(!String(nomor).trim()){try{nomor=String(await dbq(db.rpc('nomor_wa_kepala',{p_sekolah:SEK}))||'').trim();if(nomor)S.nomorKepala=nomor}catch(e){nomor=''}}
 if(!String(nomor).trim())return toast('Nomor WhatsApp Kepala Sekolah belum tersedia. Silakan sampaikan langsung kepada Kepala Sekolah',false);
 bukaWAFitur(nomor)}
function bukaWAFitur(nomor){
 let d=String(nomor).replace(/\D/g,'');if(d.startsWith('0'))d='62'+d.slice(1);else if(d.startsWith('8'))d='62'+d;
 const L=fiturBelum().map(x=>x.t),teks='Assalamualaikum, saya '+meNama+' (guru '+ns()+'). Mohon fitur '+(L.length?L.join(', '):'yang belum aktif')+' diaktifkan di menu Pengaturan. Terima kasih.';
 let pergi=false;const tandai=()=>{pergi=true},vis=()=>{if(document.hidden)pergi=true};
 document.addEventListener('visibilitychange',vis);window.addEventListener('pagehide',tandai);window.addEventListener('blur',tandai);
 setTimeout(()=>{document.removeEventListener('visibilitychange',vis);window.removeEventListener('pagehide',tandai);window.removeEventListener('blur',tandai);if(!pergi)toast('Anda tidak memiliki aplikasi WhatsApp',false)},2200);
 const a=document.createElement('a');a.href='whatsapp://send?phone='+d+'&text='+encodeURIComponent(teks);a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),500)}
let OPSX=[];
async function hubungiOperator(){
 let ops=[];
 try{ops=((await dbq(db.rpc('nomor_wa_operator',{p_sekolah:SEK})))||[]).filter(o=>String(o.no_wa||'').trim())}catch(e){ops=[]}
 if(!ops.length)return toast('Nomor WhatsApp Operator belum tersedia. Silakan sampaikan langsung kepada Operator',false);
 if(ops.length===1)return bukaWAFitur(ops[0].no_wa);
 OPSX=ops;
 info('Hubungi Operator','<div class="note">Pilih operator yang ingin dihubungi.</div>'+ops.map((o,i)=>`<button class="btn success" style="width:100%;margin:6px 0;text-align:left" onclick="closeM();bukaWAFitur(OPSX[${i}].no_wa)">💬 ${esc(o.nama||'Operator')}</button>`).join(''));
 {const b=$('#mtp');if(b){b.textContent='Tutup';b.className='btn soft';b.onclick=()=>tutupM()}}
}
async function muatRingDash(){try{if(role==='Developer'||MB()||!SEK)return;KL.ring=(await dbq(db.rpc('keputusan_validasi',{p_sekolah:SEK})))||null}catch(e){console.warn('Validasi keputusan akhir tahun gagal dimuat',e)}}
function mulaiSahkan(kid){KL.tab='pengesahan';KL.dq='';KL.dk='';KL.hm=false;KL.hs.clear();lompatKe('kelola','klKelas'+kid)}
function notifSahKelas(){if(!me||!KL.ring)return '';
 const r=KL.ring,head=adalahKepala()||(role==='Developer'&&MB()),mine=new Set((S.kelas||[]).filter(k=>k.wali===me).map(k=>k.id));
 const L=(r.kelas||[]).filter(k=>(head||mine.has(k.kelas_id))&&k.sementara>0&&!(r.masalah||[]).some(x=>String(x.kelas_id)===String(k.kelas_id)));
 if(!L.length)return '';
 return `<div><b>✅ Kelas Anda perlu disahkan.</b><div class="mu">${L.length>1?'Kelas yang perlu disahkan: '+L.map(k=>esc(k.nama)).join(', ')+'. Tombol Mulai membuka kelas paling atas ('+esc(L[0].nama)+').':'Keputusan akhir tahun kelas '+esc(L[0].nama)+' menunggu pengesahan Anda.'}</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="mulaiSahkan(${L[0].kelas_id})">Mulai</button></div></div>`}
function notifTahunBaru(){if(!(adalahKepala()||(role==='Developer'&&MB()))||!KL.ring)return '';
 const r=KL.ring,ks=(r.kelas||[]).filter(k=>k.total>0);
 if(!ks.length||(r.masalah||[]).length||!ks.every(k=>k.sementara===0&&k.belum===0&&k.disahkan>0))return '';
 return `<div><b>🎓 Semua kelas sudah disahkan.</b><div class="mu">Tinggal menunggu tahun ajaran baru dimulai. Tekan Mulai untuk membuka menu Tahun Ajaran Baru.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="lompatKe('tahunajaran','pnTahunAjaran','btnTahunBaru')">Mulai</button></div></div>`}
function notifGabung(){const a=[bannerKonfigIsi(),notifProfil(),notifSahKelas(),notifTahunBaru(),notifFitur()].filter(Boolean);if(!a.length)return '';
 return `<div class="note" style="border-left:4px solid #d7a72f;margin:16px 0">${a.map((x,i)=>i?`<div style="border-top:1px solid #dfeadc;margin-top:12px;padding-top:12px">${x}</div>`:x).join('')}</div>`}
V.profil=()=>{setTimeout(()=>ttdProfilMuat(),0);const p=PROFIL||{},dev=role==='Developer',u=S.pfs||{},mb=MB();
 const wa=(S.nomor&&S.nomor[me])||'',sk=(typeof MEMB!=='undefined'&&MEMB.find(m=>m.sekolah_id===SEK)||{}).nama||'';
 const row=(l,v)=>`<div class="mu">${l}</div><div style="word-break:break-word"><b>${v||'<span class="mu">-</span>'}</b></div>`;
 const data=[row('Nama lengkap',esc(p.nama||'')),row('Username',esc(p.username||'')),row('Peran',esc(role||'')),row('NIP',esc(p.nip||'')),
  row('WhatsApp',dev?'':(wa?esc(fmtWA(wa)):'')),row('Sekolah',dev?'':esc(sk)),
  row('Status',p.aktif?'<span class="badge Hadir">Aktif</span>':'<span class="badge Belum">Nonaktif</span>'),
  row('Terdaftar',p.dibuat?esc(waktuId(p.dibuat)):''),row('Email akun',esc(u.email||'')),row('Terakhir masuk',u.last_sign_in_at?esc(waktuId(u.last_sign_in_at)):''),
  row('ID akun','<span style="font-size:11px">'+esc(me||'')+'</span>')].join('');
 const aksi=mb?'<div class="note">Mode bantuan: data hanya bisa dilihat.</div>':`<div class="tb" style="margin-top:12px"><button class="btn success" onclick="editProfilSaya()">✏️ Ubah profil${dev?'':' &amp; sandi'}</button>${dev?'':'<button class="btn soft" onclick="gantiNomor()">📱 Ubah nomor</button><button class="btn soft" onclick="nomorHilangProfil()">📵 Nomor hilang</button>'}</div>`;
 let pk;
 if(mb)pk='<div class="note">Passkey tidak tersedia di mode bantuan.</div>';
 else if(!PK_OK)pk='<div class="note">Passkey tidak tersedia di browser atau versi aplikasi ini. Gunakan Chrome atau Safari versi terbaru di HP.</div>';
 else if(S.pkErr)pk='<div class="note" style="color:var(--rd)">⚠ '+esc(S.pkErr)+'</div>';
 else{const L=S.pk||[];
  pk='<div class="note">Dengan passkey, Anda bisa masuk cukup dengan sidik jari, wajah, atau PIN layar HP. Kata sandi tetap bisa dipakai. Status di perangkat ini: <b>'+(pkAda()?'passkey aktif':'belum diaktifkan')+'</b>.</div>'
   +(L.length?'<div class="tw"><table><tbody>'+L.map((x,i)=>`<tr><td class="no">${i+1}</td><td><b>${esc(x.friendly_name||'Passkey')}</b><div class="mu">Dibuat ${x.created_at?esc(waktuId(x.created_at)):'-'}${x.last_used_at?' · terakhir dipakai '+esc(waktuId(x.last_used_at)):''}</div></td><td style="white-space:nowrap"><button class="btn sm soft" onclick="renamePasskey('${x.id}')">Ubah nama</button> <button class="btn sm danger" onclick="hapusPasskey('${x.id}')">Hapus</button></td></tr>`).join('')+'</tbody></table></div>':'<div class="mu" style="margin:10px 0">Belum ada passkey di akun ini.</div>')
   +'<button class="btn success" style="width:100%;margin-top:10px" onclick="daftarPasskey()">+ Aktifkan passkey di perangkat ini</button>'
   +(L.length&&!pkAkunList().some(x=>x.u===p.username)?'<button class="btn soft" style="width:100%;margin-top:8px" onclick="pkIngatAkun()">🔗 Tambahkan akun ini ke pilihan login</button><div class="mu" style="margin-top:4px">Cukup sekali per browser agar akun muncul di daftar pilihan masuk sidik jari. Bila muncul beberapa akun, pilih akun Anda sendiri.</div>':'')}
 return `<div class="panel" id="pnProfil"><div class="ph">👤 Profil Saya</div><div class="pb"><div style="display:grid;grid-template-columns:110px 1fr;gap:10px 12px;align-items:start">${data}</div>${aksi}</div></div><div class="panel" id="pnTtdProfil"><div class="ph">✍️ Tanda Tangan Saya</div><div class="pb" id="ttdProfilBox"><div class="mu">Memuat tanda tangan...</div></div></div><div class="panel" id="pnPasskey"><div class="ph">🔐 Passkey (sidik jari / wajah)</div><div class="pb">${pk}</div></div>`};

/* ---------- panduan awal kepala sekolah ---------- */
let KONFIG_NANTI=false;
const langkahWajib=()=>[
 {ok:S.kelas.length>0,t:'Tambah kelas',d:'Belum ada kelas. Siswa tidak bisa ditambahkan tanpa kelas.',b:'Atur Kelas',f:"lompatPengaturan('pnKelas','btnTambahKelas')"},
 {ok:!!String((S.set&&S.set.nama_sekolah)||'').trim(),t:'Isi nama sekolah',d:'Tampil di menu, kartu pelajar, rekap, dan pesan ke orang tua.',b:'Atur Nama',f:"lompatPengaturan('pnNama','nsInp')"},
 {ok:!!String((S.set&&S.set.kota)||'').trim(),t:'Isi kota / kabupaten',d:'Dipakai pada tanda tangan Kepala Sekolah di rekap.',b:'Isi Kota',f:"lompatPengaturan('pnAlamat','ktInp')"}];
/* arahkan ke kartu: judul tidak tertutup header, kartu panjang langsung ke kotak/tombol tujuan, lalu berkedip 5 detik */
const KEDIP_MS=5200;
function kedip(el){if(!el)return;el.classList.remove('sorot');void el.offsetWidth;el.classList.add('sorot');clearTimeout(el._kd);el._kd=setTimeout(()=>el.classList.remove('sorot'),KEDIP_MS)}
function sorotKe(id,fokus,ulang){const p=$('#'+id);if(!p)return;
 const f=fokus?$('#'+fokus):null,top=($('.top')||{offsetHeight:0}).offsetHeight,bn=$('#bn'),bw=(bn&&getComputedStyle(bn).display!=='none')?bn.offsetHeight:0;
 const atas=top+10,ruang=innerHeight-atas-bw-10,r=p.getBoundingClientRect();let dy;
 if(r.height<=ruang||!f)dy=r.top-atas;
 else{const fr=f.getBoundingClientRect();dy=fr.top-atas-Math.max(0,(ruang-fr.height)/2)}
 if(Math.abs(dy)>2)window.scrollBy({top:dy,behavior:ulang?'auto':'smooth'});
 if(!ulang){kedip(p);if(f&&r.height>ruang)kedip(f.closest('.fd,label,.tb')||f);if(f&&/^(checkbox|radio)$/.test(f.type||''))setTimeout(()=>{try{f.focus({preventScroll:true})}catch(e){}},500)}
 else if(!p.classList.contains('sorot'))kedip(p)}
async function lompatKe(v,id,fokus){closeM();await go(v);setTimeout(()=>sorotKe(id,fokus),150);setTimeout(()=>sorotKe(id,fokus,true),1100)}
function lompatPengaturan(id,fokus){return lompatKe('pengaturan',id,fokus)}
function kedipHalaman(){setTimeout(()=>kedip($('#v .panel')),200)}
function panduanAwal(){if(!adalahKepala())return '';const L=langkahWajib(),n=L.filter(x=>x.ok).length;if(n===L.length)return '';
 return `<div class="panel" style="border:2px solid #d7a72f"><div class="ph">🚀 Panduan Awal <span class="mu">${n} dari ${L.length} selesai</span></div><div class="pb"><div class="note">Lengkapi data sekolah berikut agar aplikasi siap dipakai. Tombol akan langsung membawa Anda ke bagian yang tepat.</div>${L.map(x=>`<div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0"><div><b>${x.ok?'✅':'⬜'} ${x.t}</b><div class="mu">${x.d}</div></div>${x.ok?'':`<button class="btn sm success" onclick="${x.f}">${x.b}</button>`}</div>`).join('')}</div></div>`}
function konfigKurang(){const k='kf_'+SEK;
 if(RHS&&!RHS.error){const m=[];if(!String(RHS.nomor_kepala||'').trim())m.push('Nomor Kepala Sekolah');if(!(RHS.tokens||[]).length)m.push('Token Fonnte');try{localStorage.setItem(k,JSON.stringify(m))}catch(e){}return m}
 if(RHS===null){try{const c=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(c))return c}catch(e){}return ['Nomor Kepala Sekolah','Token Fonnte']}
 return null}
function bannerKonfigIsi(){if(!adalahKepala()||KONFIG_NANTI)return '';const m=konfigKurang();if(!m||!m.length)return '';
 return `<div><b>⚙ Konfigurasi belum lengkap.</b><div class="mu">Belum diisi: ${m.join(', ')}. Nomor WhatsApp Kepala Sekolah diatur melalui menu Profil Saya, sedangkan token Fonnte diatur di sini. Keduanya diperlukan agar notifikasi WhatsApp dapat berjalan. ID Group dan Kunci AI bersifat opsional.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="${m.includes('Nomor Kepala Sekolah') ? "lompatKe('profil','pnProfil')" : "lompatPengaturan('pnKonfig','btnTambahToken')"}">Atur sekarang</button><button class="btn sm soft" onclick="KONFIG_NANTI=true;renderV()">Atur nanti</button></div></div>`}
function sapaAwal(){if(!adalahKepala())return;const L=langkahWajib().filter(x=>!x.ok);if(!L.length)return;const k='sapa_'+SEK;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
 info('Selamat Datang 👋','<div style="text-align:center;padding:6px 4px"><div style="font-size:42px">🏫</div><p>Sekolah Anda belum siap dipakai. Masih ada <b>'+L.length+' hal</b> yang perlu diisi: '+L.map(x=>x.t.toLowerCase()).join(', ')+'.</p><button class="btn success" style="width:100%" onclick="closeM();'+L[0].f.replace(/"/g,'&quot;')+'">Mulai atur: '+L[0].b+'</button><button class="btn soft" style="width:100%;margin-top:8px" onclick="closeM()">Nanti</button></div>')}
const tglHero=d=>{const t=String(d||'').split('-');return t.length===3?t[2]+'/'+t[1]+'/'+t[0]:''};
function jamHero(){const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);return p.hour+'<span class="hr-c" style="opacity:'+(+p.second%2?0:1)+'">:</span>'+p.minute+'<span class="hr-w">WIB</span>'}
function hrMulai(){if(window._hrTimer)return;const t=()=>{window._hrTimer=null;const e=document.getElementById('hrJam');if(!e||document.hidden)return;const h=jamHero();if(e.innerHTML!==h)e.innerHTML=h;window._hrTimer=setTimeout(t,1000-Date.now()%1000+15)};window._hrTimer=setTimeout(t,0)}
let rkOpen=false,rkKelas='',rkQ='';
V.dashboard=()=>{if(role==='Developer')return devDashboard();const a=A(TODAY),l=act(),c={Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0},kosong=()=>({t:0,Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0}),pk={};
 S.kelas.forEach(k=>{pk[k.nama]=kosong()});
 l.forEach(s=>{const st=dayStat(s,TODAY);c[st]++;const p=pk[s.kelas]||(pk[s.kelas]=kosong());p.t++;p[st]++});
 const kl=key=>Object.keys(pk).map(nm=>{const p=pk[nm],v=key==='Hadir'?p.Hadir+p.Terlambat:p[key];return `<div class="${v?'':'z'}" role="button" tabindex="0" style="cursor:pointer" title="Lihat nama anak kelas ${esc(nm)}" onclick="event.stopPropagation();bukaDetailStatusDashboard('${key}',this.dataset.kelas)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();bukaDetailStatusDashboard('${key}',this.dataset.kelas)}" data-kelas="${esc(nm)}"><b>${esc(nm)}</b> : ${v} dari ${p.t} orang</div>`}).join('');
 const n=l.length||1,cs=[['Hadir',c.Hadir+c.Terlambat,'termasuk '+c.Terlambat+' terlambat','#159447','Hadir'],['Terlambat',c.Terlambat,'','#d99a27','Terlambat'],['Izin',c.Izin,'','#248fe9','Izin'],['Sakit',c.Sakit,'','#ef5361','Sakit'],['Alpa',c.Alpa,'','#7a4be5','Alpa'],['Libur',c.Libur,'','#526b84','Libur'],['Belum Absen',c.Belum,'perlu ditindaklanjuti','#c98a1b','Belum']];
 return `<div class="hero hero2"><div class="hr-top"><span id="hrJam">${jamHero()}</span><span>${tglHero(TODAY)}</span></div><div class="hr-body"><div><h1>Selamat Datang 👋🏻<br>di ${esc(ns())}</h1></div><i>${logoHtml()}</i></div><p class="hr-belum">${c.Belum} anak belum absen.</p></div><div id="absensiPwaInstall" class="panel" hidden style="margin-top:12px"><div class="pb" style="padding:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:160px"><b>📲 Instal Absensi 1486</b><div class="mu">Akses lebih cepat langsung dari layar utama HP.</div></div><button type="button" class="btn success sm" onclick="pasangAbsensiPWA()">Instal Aplikasi</button></div></div>${panduanAwal()}${notifGabung()}
 <div class="panel"><div class="ph">⚡ Aksi Cepat</div><div class="pb"><div class="quick"><button style="background:#168b47" onclick="go('absensi')">✍️ Absensi</button><button style="background:#d7a72f" onclick="go('scan')">📷 Scan</button><button style="background:#7650b8" onclick="go('siswa')">👤 Siswa</button>${S.set&&S.set.tabungan_aktif?'<button style="background:#2a806c" onclick="go(\'tabungan\')">💰 Tabungan</button>':'<button style="background:#2a806c" onclick="go(\'rekap\')">📚 Rekap</button>'}</div></div></div>
 <div class="stats">${cs.map(x=>`<div class="card stat" style="cursor:pointer" role="button" tabindex="0" title="Lihat nama anak" onclick="bukaDetailStatusDashboard('${x[4]}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();bukaDetailStatusDashboard('${x[4]}')}"><b style="color:${x[3]}">${x[1]}</b>${x[0]}<div class="mu">${x[2]||'&nbsp;'}</div><div class="bar"><i style="width:${Math.round(x[1]*100/n)}%;background:${x[3]}"></i></div>${S.kelas.length?`<div class="kls" style="color:${x[3]}">${kl(x[4])}</div>`:''}</div>`).join('')}</div>
 <div class="panel"><div class="ph rk-h" onclick="toggleRekapHari()"><span>📋 Rekap Hari Ini</span><span class="mu">${fmt(TODAY)} <span class="rk-arrow">${rkOpen?'▲':'▼'}</span></span></div>${rkOpen?`<div class="pb"><div class="rekap-filter"><input id="rkq" class="input" placeholder="Cari nama anak..." value="${esc(rkQ)}" oninput="cariRekapHari(this)"><select class="select" onchange="rkKelas=this.value;renderV()">${rkOpt()}</select></div><div id="rkTab" style="margin-top:10px">${rekapHariTabel()}</div></div>`:''}</div>`};
function bukaDetailStatusDashboard(status,kelasFilter){
 const semua=act().filter(s=>!kelasFilter||s.kelas===kelasFilter),a=A(TODAY),pilih=semua.filter(s=>{const st=dayStat(s,TODAY);return status==='Hadir'?(st==='Hadir'||st==='Terlambat'):st===status});
 const waktuUrut=s=>{const r=a[s.id];const t=r&&(r.iso||r.waktu);if(!t)return Number.POSITIVE_INFINITY;const n=Date.parse(t);return Number.isFinite(n)?n:Number.POSITIVE_INFINITY};
 const urut=pilih.sort((x,y)=>String(x.kelas||'').localeCompare(String(y.kelas||''),'id')||waktuUrut(x)-waktuUrut(y)||String(x.nama||'').localeCompare(String(y.nama||''),'id'));
 const judul=(status==='Hadir'?'Hadir (termasuk terlambat)':status==='Belum'?'Belum Absen':status)+(kelasFilter?' · '+kelasFilter:'');
 let html='<div class="mu" style="margin-bottom:8px">'+fmt(TODAY)+' · '+urut.length+' anak'+(status==='Hadir'?' · status Hadir dan Terlambat':'')+'</div>';
 if(!urut.length){html+='<div class="note">Tidak ada anak dengan status '+esc(judul)+' hari ini.</div>'}else{
  let kelas='';
  urut.forEach((s,i)=>{
   if(s.kelas!==kelas){kelas=s.kelas;html+='<div style="margin:8px 0 3px;padding:6px 9px;border-radius:8px;background:var(--bg);font-weight:800">'+esc(kelas||'Tanpa kelas')+'</div>'}
   const r=a[s.id],st=dayStat(s,TODAY),w=r&&r.waktu?jamJkt(r.waktu):'',datang=r&&r.jam?'Datang '+r.jam+' WIB':'',catat=r?((w?w+' WIB':'-')+' · '+namaPencatatAbsensi(r)):'Belum ada catatan waktu/pencatat',ringkas=(datang?datang+' · ':'')+catat;
   const meta='<span class="dash-status-meta">'+(r&&r.jam?'<span>Jam datang: <b>'+esc(r.jam)+' WIB</b></span>':'')+'<span>Diubah: <b>'+(w?esc(w)+' WIB':'-')+'</b></span><span>Oleh: <b>'+esc(r?namaPencatatAbsensi(r):'Belum tersedia')+'</b></span></span>';
    html+='<div class="dash-status-row"><span class="dash-status-no">'+(i+1)+'.</span><b class="dash-status-name" title="'+esc(s.nama)+'">'+esc(s.nama)+'</b><span>'+badge(st)+'</span>'+meta+'</div>';
  });
 }
 info('📋 '+judul,html);
}

const rkOpt=()=>'<option value="">- Pilih kelas -</option><option value="*" '+(rkKelas==='*'?'selected':'')+'>Semua kelas</option>'+kopt(rkKelas,0);
function toggleRekapHari(){rkOpen=!rkOpen;renderV()}
function rekapHariData(){const z=rkQ.toLowerCase().trim();return act().filter(s=>rkKelas&&(rkKelas==='*'||s.kelas===rkKelas)&&(!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z)))}
function rekapHariTabel(){if(!rkKelas)return PKH;const a=A(TODAY),l=rekapHariData();
 const rows=l.map((s,i)=>{const r=a[s.id],w=r&&r.waktu?jamJkt(r.waktu):'',catat=r?((w?'<b>'+esc(w)+' WIB</b>':'-')+'<br><span class="mu">'+esc(namaPencatatAbsensi(r))+'</span>'):'-';return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas)}</td><td>${badge(dayStat(s,TODAY))}</td><td>${r?esc((r.jam?r.jam+' WIB · ':'')+r.cara+(r.cat?' - '+r.cat:'')):''}</td><td>${catat}</td></tr>`}).join('');
 return '<div class="mu" style="margin-bottom:6px">Menampilkan '+l.length+' anak</div>'+tab(['No','Nama','Kelas','Status','Keterangan','Dicatat/diubah · Oleh'],rows,'Tidak ada anak yang cocok.')}
function cariRekapHari(el){rkQ=el.value;const t=$('#rkTab');if(t)t.innerHTML=rekapHariTabel()}
