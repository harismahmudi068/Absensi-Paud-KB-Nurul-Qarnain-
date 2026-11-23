let drwT=null;
function drw(o){const d=$('#drw');if(o){clearTimeout(drwT);d.classList.remove('closing');d.classList.add('show');return}
 if(!d.classList.contains('show')||d.classList.contains('closing'))return;
 d.classList.add('closing');clearTimeout(drwT);drwT=setTimeout(()=>d.classList.remove('show','closing'),310)}


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
