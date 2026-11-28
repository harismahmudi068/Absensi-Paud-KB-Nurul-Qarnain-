function hasil(m,ok,sw){const h=$('#hasil');if(!h)return;if(ok?!(scLast&&ucap((scLast.s.pan||scLast.s.nama)+' '+scLast.st.toLowerCase())):!ucap(sw||'Gagal'))beep(ok);if(!ok)getarGagal();scTampil(m,ok);
 if(scanMode==='scanner'&&usbPh==='scan'&&$('#usbLay')){h.textContent='';return}
 h.textContent=m;h.style.color=ok?'var(--g)':'var(--rd)';tanda(ok)}
function ovHapus(){const o=document.querySelector('#rw .camov');if(o)o.remove()}
function ovMuat(){const w=$('#rw');if(!w||w.querySelector('.camov'))return;const v=w.querySelector('#reader video'),o=document.createElement('div');o.className='camov';if(v&&v.videoWidth){try{const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0,c.width,c.height);o.appendChild(c)}catch(e){}}const sp=document.createElement('div');sp.className='spin';o.appendChild(sp);w.style.minHeight=w.offsetHeight+'px';w.appendChild(o)}
function resetRw(){ovHapus();const b=$('#bs');if(b)b.textContent='Mulai scan';const w=$('#rw');if(w){w.classList.remove('on');w.style.minHeight=''}}
async function mulaiScan(){await muatLib('scan');
 if(scanner)await stopScan('restart');
 if(!scanKelas){resetRw();return toast(PK,false)}
 liburPrompted={};if(!await cekLiburSebelumAbsensi(scanKelas,TODAY)){resetRw();toast('Scan tidak dimulai: kelas libur hari ini.',false);return}
 try{if(!await scanFotoPersiapkan())return;scanner=new Html5Qrcode('reader');
  await scanner.start({facingMode:cam==='belakang'?'environment':'user'},{fps:15,qrbox:{width:220,height:220}},onScan,()=>{});$('#bs').textContent='Selesai scan';$('#rw').classList.add('on');$('#rw').style.minHeight='';ovHapus();scanPrepLepas();scanSegarkan()
 }catch(e){scanner=null;scanPrepLepas();resetRw();toast('Kamera tidak bisa dibuka. Izinkan akses kamera untuk situs ini.',false)}}
/* ---------- mode scan layar penuh ---------- */
let scLast=null,scT=null,scOpen=false,scCardHtml=null;
const scWaktu=()=>{const d=new Date();return[d.toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/\./g,':'),d.toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'numeric',month:'long',year:'numeric'})]};
setInterval(()=>{const j=$('#scJam');if(!j)return;const w=scWaktu();j.textContent=w[0];const t=$('#scTgl');if(t)t.textContent=w[1]},1000);
const scPlace=()=>'';
function scSet(h){scCardHtml=h;const e=$('#scRes');const _r=$('#rw');if(_r&&h)_r.style.setProperty('--rwh',_r.clientHeight+'px');if(e){e.innerHTML=h||scPlace();if(e.parentNode)e.parentNode.classList.toggle('tampil',!!h)}}
function scSumHTML(){const ab=A(TODAY),pk=new Map();let n=0;(scanKelas==='*'?S.kelas.map(k=>k.nama):[scanKelas]).forEach(k=>pk.set(k,{a:0,t:0}));
 S.siswa.forEach(x=>{if(!x.aktif)return;const p=pk.get(x.kelas);if(!p)return;p.t++;const r=ab[x.id];if(r&&r.cara==='scan'){p.a++;n++}});
 return `<b>Sudah scan: ${n} anak</b><div class="scchip">${[...pk].map(([k,p])=>`<span>${esc(k)} ${p.a}/${p.t}</span>`).join('')}</div>`}
const scDet=()=>`<details id="scDet" class="sc-only"${scOpen?' open':''} ontoggle="scOpen=this.open;if(scOpen)$('#scBody').innerHTML=histHTML()"><summary id="scSum">${scSumHTML()}</summary><div id="scBody">${scOpen?histHTML():''}</div></details>`;
function scRefresh(){const m=$('#scSum');if(m)m.innerHTML=scSumHTML();if(scOpen){const b=$('#scBody');if(b)b.innerHTML=histHTML()}}
function scTampil(m,ok){clearTimeout(scT);const L=scLast;scLast=null;
 if(!ok&&L&&L.duplikat){const s=L.s,im=fotoMuat(s);scSet(`<div class="scr bad" data-id="${s.id}">${im?`<img class="scf" src="${im.src}" alt="">`:''}<b>${esc(s.pan||s.nama)}</b><small>${esc(m)}</small>${s.nama&&s.nama!==s.pan?`<small>${esc(s.nama)}</small>`:''}</div>`);usbInfo('Terakhir dipindai: '+(s.pan||s.nama)+' (sudah tercatat)');if(!im&&s.foto_path)fotoSiap(s).then(g=>{const e=$('#scRes .scr[data-id="'+s.id+'"]');if(g&&e&&!e.querySelector('img')){const i=document.createElement('img');i.className='scf';i.src=g.src;i.alt='';e.prepend(i)}})}
 else if(!ok){scSet(`<div class="scr bad"><b>Tidak dicatat</b><small>${esc(m)}</small></div>`);usbInfo('Terakhir dipindai: '+m)}
 else if(!L){scSet(`<div class="scr ok"><b>${esc(m)}</b></div>`);usbInfo('Terakhir dipindai: '+m)}
 else{const s=L.s,im=fotoMuat(s);scSet(`<div class="scr ${L.st==='Hadir'?'ok':'tl'}" data-id="${s.id}">${im?`<img class="scf" src="${im.src}" alt="">`:''}<b>${esc(s.pan||s.nama)}</b><small>${L.st}, ${esc(L.jm)}</small>${s.nama&&s.nama!==s.pan?`<small>${esc(s.nama)}</small>`:''}</div>`);
  usbInfo('Terakhir dipindai: '+(s.pan||s.nama)+' ('+L.st.toLowerCase()+', jam '+L.jm+')');
  if(!im&&s.foto_path)fotoSiap(s).then(g=>{const e=$('#scRes .scr[data-id="'+s.id+'"]');if(g&&e&&!e.querySelector('img')){const i=document.createElement('img');i.className='scf';i.src=g.src;i.alt='';e.prepend(i)}})}
 scT=setTimeout(()=>scSet(null),3500)}
async function scPrefetch(){const l=S.siswa.filter(x=>x.aktif&&x.foto_path&&!fotoMuat(x)&&(scanKelas==='*'||x.kelas===scanKelas)).slice(0,120);let i=0;await Promise.all([0,1,2,3].map(async()=>{while(i<l.length){const s=l[i++];if(!scanKunci())return;await fotoSiap(s)}}))}
function scanPrepRender(){const e=$('#scanPrepCount'),b=$('#scanPrepBar'),t=$('#scanPrepTitle');if(!scanPrep)return;if(e)e.textContent=scanPrep.selesai+' / '+scanPrep.total+' foto disiapkan';if(b)b.style.width=(scanPrep.total?Math.round(scanPrep.selesai/scanPrep.total*100):100)+'%';if(t)t.textContent=scanPrep.total?'Sedang persiapan scanner...':'Tidak ada foto siswa yang perlu disiapkan'}
async function scanFotoPersiapkan(){const token=++scanPrepRun,l=S.siswa.filter(x=>x.aktif&&x.foto_path&&(scanKelas==='*'||x.kelas===scanKelas));scanPrep={aktif:true,lock:true,selesai:0,total:l.length,siap:0,gagal:0};renderV();kunciSinkron();let i=0;const pekerja=Array.from({length:6},async()=>{while(i<l.length&&token===scanPrepRun){const s=l[i++];try{const im=await fotoSiap(s);if(im)scanPrep.siap++;else scanPrep.gagal++}catch(e){scanPrep.gagal++}scanPrep.selesai++;scanPrepRender()}});await Promise.all(pekerja);if(token!==scanPrepRun)return false;scanPrep.aktif=false;scanPrep.selesai=true;renderV();kunciSinkron();return true}
function scanPrepLepas(){if(scanPrep)scanPrep.lock=false;kunciSinkron();const e=$('#scanPrepOverlay');if(e)e.remove()}
function scanPrepCatatan(){if(!scanPrep||!scanPrep.selesai)return '';return '<div class="scan-ready-note">✓ Scanner sudah siap! Silakan mulai peng-absenan 😊'+(scanPrep.gagal?'<small>'+scanPrep.gagal+' foto belum tersedia; absensi tetap bisa dilakukan.</small>':'')+'</div>'}
/* ---------- kunci halaman selama scan ---------- */
const scanKunci=()=>view==='scan'&&((!!scanPrep&&!!scanPrep.lock)||!!scanner||(usbOn&&usbPh==='scan'));
function tolakKunci(){toast('Scan sedang berjalan. Tekan Selesai scan dulu sebelum pindah halaman.',false);return true}
let _dashT=0;
let kunciAktif=false;
function kunciSinkron(){const k=scanKunci();if(k===kunciAktif)return;kunciAktif=k;document.body.classList.toggle('scan-kunci',k);if(k)wlAmbil();else wlLepas();if(k){scLast=null;scSet(null);scRefresh();try{history.pushState({scanKunci:1},'',location.href)}catch(e){}}}
let _kunciT=null;
function kunciMulai(){if(_kunciT)return;_kunciT=setInterval(()=>{kunciSinkron();if(view!=='scan'&&!kunciAktif&&!scanKunci()){clearInterval(_kunciT);_kunciT=null}},250)}
window.addEventListener('beforeunload',e=>{if(scanKunci()){e.preventDefault();e.returnValue=''}});
window.addEventListener('popstate',()=>{if(scanKunci()){try{history.pushState({scanKunci:1},'',location.href)}catch(e){}tolakKunci()}});
let scanUbah=[];
/* ---------- LAYAR TETAP MENYALA + PEMULIHAN + ANTRIAN OFFLINE ---------- */
let _wl=null,_hidAt=0,_pulih=false,_camGagal=0;
async function wlAmbil(){try{if(!('wakeLock' in navigator)||_wl||document.hidden)return;const w=await navigator.wakeLock.request('screen');_wl=w;w.addEventListener('release',()=>{if(_wl===w)_wl=null})}catch(e){_wl=null}}
function wlLepas(){try{if(_wl){const w=_wl;_wl=null;w.release().catch(()=>{})}}catch(e){}}
function kameraHidup(){const v=document.querySelector('#reader video'),st=v&&v.srcObject,t=st&&st.getVideoTracks&&st.getVideoTracks()[0];return !!(t&&t.readyState==='live'&&!t.muted&&!v.ended)}
async function pulihScan(lama){if(_pulih)return;_pulih=true;
 try{
  if(scanner){
   const v=document.querySelector('#reader video');try{if(v&&v.paused)await v.play()}catch(e){}
   await new Promise(r=>setTimeout(r,700));
   if(scanner&&!kameraHidup()){ovMuat();await mulaiScan()}
  }else if(usbOn){setTimeout(usbFokus,200)}
  if(lama>3000)toast('Scan sempat terhenti '+(lama>=60000?Math.round(lama/60000)+' menit':Math.round(lama/1000)+' detik')+' karena layar mati. Kartu yang dipindai saat itu tidak tercatat.',false)
 }catch(e){}finally{_pulih=false;_camGagal=0}}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){_hidAt=Date.now();return}
 const lama=_hidAt?Date.now()-_hidAt:0;_hidAt=0;
 try{aqKirim()}catch(e){}
 if(!scanKunci())return;
 wlAmbil();pulihScan(lama)});
/* pengawas tiap 5 detik: ambil ulang wake lock bila terlepas, dan nyalakan ulang kamera bila berhenti sendiri */
setInterval(()=>{if(document.hidden||!scanKunci())return;if(!_wl)wlAmbil();
 const rw=$('#rw');if(scanner&&!_pulih&&rw&&rw.classList.contains('on')){if(kameraHidup())_camGagal=0;else if(++_camGagal>=2)pulihScan(0)}},5000);
