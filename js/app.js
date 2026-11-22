
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
const segarkan=()=>dbq(db.rpc('segarkan_libur',{p_sekolah:SEK}));