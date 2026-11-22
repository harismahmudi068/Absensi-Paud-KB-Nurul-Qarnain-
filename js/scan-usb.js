/* ---------- scan ---------- */
/* ---------- scanner keyboard (USB / Bluetooth HID) ---------- */
let usbOn=false,usbQ=[],usbRun=false,usbT=null,usbRT=null,usbPh='idle',usbUjiNama='',usbUjiOto=false,usbOtoNext=false,scanMode='kamera',usbRes=null,usbResT=null;
const USB_RE=/^[A-Z0-9]{8}$/i;
const IC_CAM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',IC_BC='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="2" height="14"/><rect x="7" y="5" width="1" height="14"/><rect x="10" y="5" width="3" height="14"/><rect x="15" y="5" width="1" height="14"/><rect x="18" y="5" width="3" height="14"/></svg>';
const segHTML=()=>`<div class="seg2" role="tablist"><button type="button" role="tab" class="${scanMode==='kamera'?'on':''}" onclick="setScanMode('kamera')">${IC_CAM}<span>Kamera</span></button><button type="button" role="tab" class="${scanMode==='scanner'?'on':''}" onclick="setScanMode('scanner')">${IC_BC}<span>Scanner</span></button></div>`;
const kameraHTML=()=>`<div class="rw" id="rw"><div id="reader"></div><div class="fb" id="fb"></div><div id="scRes">${scCardHtml||''}</div><button class="flip nobusy" onclick="balikKamera()" title="Balik kamera">🔄</button></div><div class="tb" style="justify-content:center"><button class="btn success" id="bs" style="min-width:180px" onclick="toggleScan()">Mulai scan</button></div><button type="button" class="ujilnk" onclick="unduhUjiScan(this)">Unduh kartu uji</button>`;
const USB_CAP={idle:'Scanner belum disiapkan.',selesai:'Scan selesai.',cek:'Memeriksa scanner...',prep:'Sedang menyiapkan foto siswa...',uji:'Uji scanner: silakan scan kartu uji (atau satu kartu anak). Hanya untuk uji, tidak dicatat sebagai absensi.',siap:'Scanner sudah siap, silakan tekan tombol Mulai scan',scan:'Silakan scan kartu ID anak'};
function usbLayIsi(){const ph=usbPh,cap=USB_CAP[ph]||USB_CAP.idle,r=(ph==='scan'||ph==='uji')?usbRes:null;let cls=ph,main;
 if(r&&r.cek)main='<div class="mu">'+esc(r.m)+'</div>';
 else if(r){cls=r.ok?'ok':'no';main=`<div class="usbic ${cls}">${r.ok?CEK:SIL}</div><b style="color:${r.ok?'var(--g)':'var(--rd)'}">${esc(r.t)}</b><div>${esc(r.m)}</div>`}
 else main=ph==='siap'?`<b style="color:var(--g)">Uji berhasil</b><div>Kartu ${esc(usbUjiNama)} terbaca</div><div class="mu">(tidak dicatat)</div>${usbUjiOto?'<div class="mu" style="color:#92400e">Lewat isian otomatis. Scanner fisik belum diuji.</div>':''}`:ph==='uji'?'<div class="mu" style="color:#92400e">Menunggu kartu uji...</div>':ph==='scan'?'<div class="mu">Menunggu kartu...</div>':ph==='cek'?'<div class="spin"></div>':'<div class="mu">Layar hasil scan</div>';
 return{cls,html:`<div class="usbcap"><span class="dot"></span><span>${cap}</span></div><div class="usbmain">${main}</div><div class="fb" id="fb"></div>`}}
function usbLayRender(){const L=$('#usbLay');if(!L)return;const o=usbLayIsi();L.className='usblay '+o.cls;L.innerHTML=o.html}
const usbPanel=()=>{const ph=usbPh,o=usbLayIsi(),
 bt={idle:['Siapkan scanner','usbSiap()','success'],prep:['Persiapan...','','success'],selesai:['Siapkan scanner','usbSiap()','success'],cek:['Memeriksa...','','success'],uji:['Batal','usbBatal()','soft'],siap:['Mulai scan','usbMulai()','success'],scan:['Selesai scan','usbTanyaSelesai()','success']}[ph]||['Siapkan scanner','usbSiap()','success'];
 return `<div class="usbw${scCardHtml?' tampil':''}"><div class="usblay ${o.cls}" id="usbLay">${o.html}</div><div id="scRes">${scCardHtml||''}</div></div><div class="mu usblbl">Kolom scanner (terisi otomatis)</div><input id="usbIn" class="input usbin" type="text" inputmode="none" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Menunggu scan..." ${usbOn?'':'disabled'} onkeydown="usbKd(event)" oninput="usbMasuk(this)" onblur="usbBlur()"><div class="mu usblbl" id="usbNote">Kode terakhir masuk: belum ada. Tidak perlu menekan Enter.</div><div class="tb" style="justify-content:center"><button class="btn ${bt[2]}" id="usbBs" style="min-width:180px" ${bt[1]?`onclick="${bt[1]}"`:'disabled'}>${bt[0]}</button></div>${ph==='uji'?'<button type="button" class="ujilnk" onclick="usbUjiOtomatis()">Tidak bawa kartu uji? Isi otomatis dengan kartu uji</button>':''}<button type="button" class="ujilnk" onclick="unduhUjiScan(this)">Unduh kartu uji</button>`};
const usbModal=()=>!!document.querySelector('.mb.show');
function usbFokus(){const i=$('#usbIn');if(i&&usbOn&&view==='scan'&&!usbModal())i.focus({preventScroll:true})}
async function setScanMode(m){unlockAC();if(m===scanMode)return;if(scanKunci())return tolakKunci();await stopScan();usbStop(true);scanMode=m;renderV()}
async function usbSiap(){unlockAC();if(!scanKelas)return toast(PK,false);await stopScan();usbPh='cek';usbOn=false;renderV();
 const ok=await cekLiburSebelumAbsensi(scanKelas,TODAY);
 if(view!=='scan'||usbPh!=='cek')return;
 if(!ok){usbPh='idle';renderV();return}
 await new Promise(r=>setTimeout(r,350));
 if(view!=='scan'||usbPh!=='cek')return;
 usbPh='uji';usbOn=true;usbQ=[];usbUjiOto=false;usbOtoNext=false;renderV();usbFokus()}
function usbBatal(){usbStop()}
async function usbMulai(){liburPrompted={};unlockAC();suaraPanas();usbPh='prep';usbOn=false;usbQ=[];lastKode='';lastAt=0;clearTimeout(usbResT);usbRes=null;if(!await scanFotoPersiapkan())return;usbPh='scan';usbOn=true;renderV();scanPrepLepas();usbFokus();scanSegarkan()}
async function usbTanyaSelesai(){if(usbPh!=='scan')return;const n=$('#cfn');if(n)n.textContent='Belum';
 let ya=false;try{ya=await konfirmasi('Apakah proses scan sudah selesai?',{judul:'Selesai scan?',ikon:'✅',ya:'Ya, selesai'})}finally{if(n)n.textContent='Batal'}
 if(ya)usbStop(false,'selesai');else usbFokus()}
function cariKode(mentah){const raw=String(mentah||'').trim();let k='';try{k=String(Kartu.kodeDariQR(raw)||'')}catch(e){}
 if(!k)return{s:null,k:'',lama:!!Kartu.kartuLama(raw)};
 if(k===KODE_UJI)return{s:null,k,uji:1};
 const s=S.siswa.find(x=>String(x.kode_scan||'').toUpperCase()===k);
 return{s:s||null,k}}
async function usbUjiScan(mentah){
 usbRes={cek:1,m:'Memeriksa kode...'};usbLayRender();
 try{
  const cr=cariKode(mentah),s=cr.s&&cr.s.aktif?cr.s:null;
  usbUjiOto=usbOtoNext;usbOtoNext=false;
  if(cr.uji){usbUjiNama='uji';usbOn=false;usbPh='siap';usbQ=[];usbRes=null;renderV();if(!ucap('pengujian berhasil'))beep(true);tanda(true);return}
  if(!s){const pesan=cr.s?(cr.s.pan||cr.s.nama)+' berstatus nonaktif, kartunya tidak bisa dipakai.':cr.lama?'Kartu lama sudah tidak berlaku. Gunakan kartu baru.':cr.k?'Kode '+cr.k+' tidak ada di data siswa. Coba kartu anak lain.':'QR tidak dikenal. Coba kartu anak lain.';
   usbRes={ok:false,t:'Uji gagal',m:pesan,tetap:1};usbLayRender();
   if(!ucap('Gagal'))beep(false);getarGagal();return}
  usbUjiNama=s.pan||s.nama;usbOn=false;usbPh='siap';usbQ=[];usbRes=null;renderV();if(!ucap('pengujian berhasil'))beep(true);tanda(true)
 }catch(e){usbRes={ok:false,t:'Uji gagal',m:String((e&&e.message)||e),tetap:1};usbLayRender()}}
function usbStop(jangan,fase){if(!usbOn&&usbPh==='idle'&&!fase)return;const aktif=usbOn;usbOn=false;usbPh=fase||'idle';usbQ=[];clearTimeout(usbT);clearTimeout(usbRT);clearTimeout(usbResT);usbRes=null;if(aktif){const u=scanUbah;scanUbah=[];scanAkhir(u)}if(!jangan)renderV()}
function usbKd(e){if(e.key!=='Enter')return;e.preventDefault();clearTimeout(usbT);const v=e.target.value;e.target.value='';usbKirim(v)}
function usbMasuk(el){clearTimeout(usbT);usbT=setTimeout(()=>{const v=el.value.trim();if(USB_RE.test(v)||Kartu.kartuLama(v)){el.value='';usbKirim(v)}},120)}
function usbBlur(){setTimeout(()=>{const a=document.activeElement;if(usbOn&&view==='scan'&&(!a||a===document.body))usbFokus()},200)}
function usbGlobal(e){if(!usbOn||view!=='scan'||e.ctrlKey||e.altKey||e.metaKey||!e.key||e.key.length!==1)return;
 const a=document.activeElement,t=a&&a.tagName;if(a&&a.id==='usbIn')return;
 if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(a&&a.isContentEditable))return;
 if(usbModal())return;const i=$('#usbIn');if(i)i.focus({preventScroll:true})}
document.addEventListener('keydown',usbGlobal,true);
async function usbKirim(raw){raw=String(raw||'').trim();if(!raw||!usbOn||scanPrep&&scanPrep.aktif)return;
 usbQ.push(raw);const nt=$('#usbNote');if(nt)nt.textContent='Kode terakhir masuk: '+raw.slice(0,12)+' (jam '+jamJkt(new Date().toISOString())+')';if(usbRun)return;usbRun=true;
 try{while(usbQ.length&&usbOn){
   const h=hariIni();
   if(h!==TODAY){TODAY=h;liburPrompted={};okL={};try{await muatRange(TODAY,TODAY)}catch(e){peringatan('Absensi hari baru gagal dimuat',e)}renderV();usbFokus()}
   {const k=usbQ.shift();if(usbPh==='uji')await usbUjiScan(k);else await onScan(k)}}}
 catch(e){hasil('Gagal: '+((e&&e.message)||e),false)}
 finally{usbRun=false;usbFokus()}}
const USB_HASIL_MS=5000;
const getarGagal=()=>{try{if(navigator.vibrate)navigator.vibrate(100)}catch(e){}};
const usbTampil=(m,ok)=>{clearTimeout(usbResT);usbRes={ok,t:ok?'Berhasil':'Gagal',m};usbLayRender();usbResT=setTimeout(()=>{usbRes=null;usbLayRender()},USB_HASIL_MS)};
const usbInfo=m=>{const n=$('#usbNote');if(n)n.textContent=m};
let scanKelas='',scanPrep=null,scanPrepRun=0;
const histHTML=()=>{const h=Object.entries(A(TODAY)).filter(e=>e[1].cara==='scan').map(e=>({s:S.siswa.find(x=>x.id==e[0]),r:e[1]})).filter(x=>x.s&&(!scanKelas||scanKelas==='*'||x.s.kelas===scanKelas)).sort((a,b)=>(b.r.jam||'').localeCompare(a.r.jam||''));
 return `<div class="ph">🕘 Riwayat Scan Hari Ini <span class="mu">${fmt(TODAY)} - ${h.length} anak</span></div><div class="pb">${tab(['Jam','Anak','Kelas','Status'],h.map(x=>`<tr><td><b>${esc(x.r.jam||'-')}</b></td><td>${esc(x.s.pan)}<div class="mu">${esc(x.s.nama)}</div></td><td>${esc(x.s.kelas)}</td><td>${badge(x.r.st)}</td></tr>`).join(''))}</div>`};
V.scan=()=>`<div class="panel"><div class="ph">📷 Scan Kartu</div><div class="pb">${scanPrep&&scanPrep.aktif?'<div class="scan-prep-overlay" id="scanPrepOverlay"><div class="scan-prep-card"><div class="spin"></div><b id="scanPrepTitle">Sedang persiapan scanner...</b><span id="scanPrepCount">0 / 0 foto disiapkan</span><div class="scan-prep-track"><i id="scanPrepBar"></i></div><small>Mohon tunggu. Foto siswa sedang diperiksa dan disiapkan agar tampil cepat saat kartu dipindai.</small></div></div>':''}${scanPrepCatatan()}<div class="sc-only scclk"><b id="scJam">${scWaktu()[0]}</b><span id="scTgl">${scWaktu()[1]}</span></div>${segHTML()}<div class="tb tb-full" style="justify-content:center">${cpick('scanKelasPick','kelas',scanKelas,[{value:'*',label:'Semua kelas'}].concat(S.kelas.map(k=>({value:k.nama,label:k.nama}))),'setScanKelas','Pilih kelas')}</div>${scanKelas?'':PKH}${scanMode==='scanner'&&usbPh==='scan'?'':suaraPanel()}${scanMode==='kamera'?kameraHTML():usbPanel()}<div id="hasil" style="margin-top:10px;font-weight:700;text-align:center"></div>${aqHtml()}${scDet()}</div></div><div class="panel" id="hist">${histHTML()}</div>`;
async function setScanKelas(v){document.querySelectorAll('.cpick.open').forEach(x=>x.classList.remove('open'));if((v||'')===scanKelas)return;if(scanKunci())return tolakKunci();await stopScan();usbStop(true);scanKelas=v||'';liburPrompted={};renderV();usbFokus()}
