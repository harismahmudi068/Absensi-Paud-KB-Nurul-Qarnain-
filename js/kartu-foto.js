/* indeks siswa berdasarkan id; dibangun ulang otomatis bila S.siswa diganti atau jumlahnya berubah */
function siswaById(id){const a=S.siswa||[];if(_smA!==a||_smN!==a.length){_smA=a;_smN=a.length;_sm=new Map(a.map(x=>[x.id,x]))}return _sm.get(id)}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
/* ---------- KARTU UJI (satu untuk semua sekolah, tidak ada di Supabase) ---------- */
const KODE_UJI='UJI00000';/* mengandung angka 0 yang tidak pernah dipakai kode siswa */
let ujiPdf=false,_fotoUji=null;
const siswaUji=()=>({id:'uji',uji:1,nama:'KARTU UJI SCANNER',pan:'Uji',nisn:'0000000000',kelas:'UJI',wa:'08000000000',tgl:'2015-01-17',tempat:'Situbondo',jk:'L',alamat:'Alamat contoh (kartu uji)',masuk:String(TODAY||hariIni()).slice(0,4),kode_scan:KODE_UJI,aktif:true});
function fotoUji(){if(_fotoUji)return _fotoUji;const cv=document.createElement('canvas');cv.width=300;cv.height=400;const c=cv.getContext('2d');c.fillStyle='#dff0e8';c.fillRect(0,0,300,400);c.fillStyle='#a8d3c0';c.beginPath();c.arc(150,150,52,0,7);c.fill();c.beginPath();c.moveTo(50,330);c.bezierCurveTo(50,250,100,222,150,222);c.bezierCurveTo(200,222,250,250,250,330);c.lineTo(250,400);c.lineTo(50,400);c.closePath();c.fill();c.fillStyle='#0e5a3d';c.textAlign='center';c.textBaseline='middle';c.font='bold 26px system-ui,sans-serif';c.fillText('FOTO UJI',150,352);c.font='16px system-ui,sans-serif';c.fillText('3 \u00D7 4',150,380);_fotoUji=cv;return cv}
function kartuUjiBlok(){const s=siswaUji();return `<div class="cards${ks==='keduanya'?' dua':''}" style="margin-bottom:14px"><div class="card ujibox" style="padding:10px"><span class="ujibd">KARTU UJI - untuk semua sekolah</span><div class="mu" style="font-size:12px;margin:2px 0 8px">Untuk menguji scan kamera dan scanner alat. Tidak masuk data siswa dan tidak dicatat sebagai absensi.</div>${(()=>{const d=`<div class="kfw">${kimg(s,'depan')}${kfotoBtn(false,'disabled title="Foto kartu uji dibuat otomatis"')}</div>`;return ks==='keduanya'?`<div class="kpair">${d}${kimg(s,'belakang')}</div>`:ks==='depan'?d:kimg(s,ks)})()}<button class="btn sm success" style="width:100%;margin-top:8px" onclick="unduhSatu('uji',this)">\u2B07 Unduh kartu uji${ks==='keduanya'?' (depan &amp; belakang)':ks==='belakang'?' (belakang)':''}</button><div style="display:flex;gap:8px;margin-top:8px"><button class="btn soft sm" style="flex:1" onclick="salinLinkUji()">\uD83D\uDD17 Salin kode</button></div><label class="ujick"><input type="checkbox" ${ujiPdf?'checked':''} onchange="ujiPdf=this.checked"> Sertakan kartu uji di PDF (di bagian bawah)</label></div></div>`}
async function salinLinkUji(){const ok=await salinLink(Kartu.isiQR(KODE_UJI));ok?toast('Kode kartu uji disalin'):toast('Tidak bisa menyalin, coba lagi',false)}
async function unduhUjiScan(el){if(!el||el.dataset.b==='1')return;el.dataset.b='1';const t=el.textContent;el.textContent='Menyiapkan kartu uji...';try{await jedaUnduh();simpanPng(kartuUrl(siswaUji(),'belakang'),'kartu-uji-belakang.png');toast('Kartu uji (belakang) diunduh')}catch(e){toast('Gagal mengunduh kartu uji: '+(e.message||e),false)}finally{el.dataset.b='0';el.textContent=t}}
async function usbUjiOtomatis(){if(usbPh!=='uji'||!usbOn)return;const u=Kartu.isiQR(KODE_UJI);await salinLink(u);const i=$('#usbIn');if(i)i.value=u;toast('Kode kartu uji disalin dan diisi otomatis');setTimeout(()=>{if(usbPh!=='uji'||!usbOn)return;const e=$('#usbIn');if(e)e.value='';usbOtoNext=true;usbKirim(u)},500)}
let KCB=0;const KC_BATAS=18*1024*1024,KC_JUMLAH=80;
function kartuCacheBersih(){KC.clear();KCB=0}
function kartuHash(v){v=String(v||'');let h=2166136261;for(let i=0;i<v.length;i++){h^=v.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function kartuCacheAmbil(k){const v=KC.get(k);if(!v)return null;KC.delete(k);KC.set(k,v);return v.url}
function kartuCacheSimpan(k,url){const bytes=url.length*2;if(bytes>KC_BATAS)return;const lama=KC.get(k);if(lama){KCB-=lama.bytes;KC.delete(k)}while(KC.size&&(KC.size>=KC_JUMLAH||KCB+bytes>KC_BATAS)){const k0=KC.keys().next().value,v0=KC.get(k0);KC.delete(k0);KCB-=v0.bytes}KC.set(k,{url,bytes});KCB+=bytes}
function kartuUrl(s,sisi,pv){sisi=sisi||'depan';const logo=logoOk(S.set.logo)?S.set.logo:'',key=[ko,pv?'pv':'fu',sisi,s.id,s.kode_scan,s.nama,s.pan,s.nisn,s.kelas,s.wa,s.tempat,s.tgl,s.jk,s.alamat,s.masuk,s.aktif,S.set.tahun_ajaran,ns(),TODAY,kartuHash(logo),sisi==='depan'&&fotoMuat(s)?s.foto_path:'-'].join('|');if(pv){const lama=kartuCacheAmbil(key);if(lama)return lama}
 const fn=ko==='portrait'?(sisi==='belakang'?Kartu.buatBelakangPortrait:Kartu.buatKartuPortrait):(sisi==='belakang'?Kartu.buatBelakang:Kartu.buatKartu);
 const u=fn(s,{pratinjau:!!pv,nama:ns(),tahun:S.set.tahun_ajaran,hari:TODAY,qr:Kartu.isiQR(s.kode_scan),logo:logo||null,foto:sisi==='depan'?(s.uji?fotoUji():fotoMuat(s)):null});
 /* Cache khusus pratinjau: LRU berdasarkan pemakaian, maksimal 80 kartu dan sekitar 18 MB agar aman untuk memori ponsel. Versi penuh unduhan tetap dibuat terpisah. */
 if(pv)kartuCacheSimpan(key,u);return u}
const kimg=(s,sd)=>`<div class="kwrap ${ko==='portrait'?'kportrait':''}"><div class="kspin"><div class="kspn"></div>Memuat kartu...</div><img class="kimg" data-kartu-id="${s.id}" data-sisi="${sd}" alt=""></div>`;
const kartuCocok=(s,z)=>!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z);
/* semua kartu kelas dirender sekali; pencarian hanya menyembunyikan/menampilkan kartu (tanpa membangun ulang, jadi tidak berkedip) */
function kartuCards(){rkMuatStatus('link');const z=String(kkQ||'').toLowerCase().trim();let n=0;return daftarKartuTampil().filter(s=>kk&&(kk==='*'||s.kelas===kk)).map(s=>{const ok=kartuCocok(s,z);if(ok)n++;return `<div class="card" data-sid="${s.id}" style="padding:10px${ok?'':';display:none'}"><div class="nbr" style="justify-content:center"><span class="nbadge" title="Nomor urut">${ok?n:''}</span></div>${ks==='keduanya'?`<div class="kpair">${kdepanK(s)}${kimgK(s,'belakang')}</div>`:ks==='depan'?kdepanK(s):kimgK(s,ks)}<button class="btn sm success" style="width:100%;margin-top:8px" onclick="unduhSatu(${s.id},this)">⬇ Unduh kartu ${esc(s.pan)}${ks==='keduanya'?' (depan &amp; belakang)':ks==='belakang'?' (belakang)':''}</button><div style="display:flex;gap:8px;margin-top:8px"><button class="btn soft sm" style="flex:1" onclick="salinLinkSatu(${s.id})">🔗 Salin link</button><button class="btn sm" style="flex:1" ${!s.aktif?'disabled title="Siswa nonaktif"':s.wa?'':'disabled title="Belum ada nomor WA"'} onclick="kirimLinkSatu(${s.id})">📤 Kirim link</button></div><div class="mu kst" style="margin-top:8px;text-align:center"><div>Status pesan:</div>${rkSel(s,'link','')}</div><button class="btn soft sm" style="width:100%;margin-top:8px" onclick="lihatPesanLinkSatu(${s.id})">👁 Lihat pesan</button></div>`}).join('')||(kk?'':'');}
V.kartu=()=>`<div class="panel"><div class="ph">🪪 Kartu Siswa</div><div class="pb">${kartuUjiBlok()}<div class="tb tb-full"><select class="select" onchange="kk=this.value;kkQ='';renderV()">${kopt2s(kk)}</select><select class="select" onchange="ko=this.value;renderV()"><option value="landscape" ${ko==='landscape'?'selected':''}>Mode Landscape (lama)</option><option value="portrait" ${ko==='portrait'?'selected':''}>Mode Portrait (baru)</option></select><select class="select" onchange="ks=this.value;renderV()">${[['depan','Sisi depan'],['belakang','Sisi belakang'],['keduanya','Depan & belakang']].map(x=>`<option value="${x[0]}" ${ks===x[0]?'selected':''}>${x[1]}</option>`).join('')}</select>${ks==='keduanya'?`<select class="select" onchange="km=this.value;renderV()"><option value="terpisah" ${km==='terpisah'?'selected':''}>Cetak: 2 PDF terpisah</option><option value="berdampingan" ${km==='berdampingan'?'selected':''}>Cetak: berdampingan (1 PDF)</option></select>`:''}<input id="kkCari" class="input grow search-smooth" style="flex:1 1 100%" placeholder="Cari nama anak, panggilan atau NISN..." value="${esc(kkQ)}" oninput="cariKartuInput(this)"><div class="pntb" style="flex:1 1 100%;margin:0"><button class="btn success sm dl" style="margin:0" onclick="bukaPilihKartu(this)">⬇ Unduh Kartu (PDF)</button><button class="btn soft sm" style="margin:0" onclick="kalBuka()">⚙ Kalibrasi cetak</button><button class="btn soft sm" style="margin:0" onclick="salinSemuaLink()">🔗 Salin semua link</button><button class="btn sm" style="margin:0" onclick="kirimSemuaLink()">📤 Kirim semua link</button><button class="btn soft sm" style="margin:0" onclick="lihatPesanLinkSemua()">👁 Lihat pesan</button><button class="btn soft sm" style="margin:0" onclick="riwayatKirim()">📋 Riwayat kirim</button><button class="btn soft sm" style="margin:0" onclick="rkSegar('link',this)">🔄 Perbarui status</button></div></div>${kk?'':PKH}${ko==='portrait'?(ks==='keduanya'?(km==='berdampingan'?'<div class="note">A4 landscape, 4 siswa (8 sisi kartu) per halaman. Depan-belakang berdampingan dengan celah 1 mm; tiap pasangan memiliki jarak untuk pemotongan.</div>':'<div class="note">Dua PDF terpisah. A4 portrait, 9 kartu per halaman (3 kolom × 3 baris), ukuran 100% (Actual size). Untuk cetak bolak-balik gunakan flip on long edge.</div>'):'<div class="note">Ukuran fisik kartu 53,98 × 85,6 mm (ID-1 vertikal). PDF A4 portrait, ukuran 100% (Actual size).</div>'):(ks==='keduanya'?(km==='berdampingan'?'<div class="note">A4 portrait, 4 pasangan kartu landscape per halaman. Depan-belakang berdampingan dengan celah 1 mm dan satu garis potong mengelilingi tiap pasangan.</div>':'<div class="note">Dua PDF terpisah: depan dan belakang. Ukuran kartu tetap 85,6 × 53,98 mm.</div>'):'<div class="note">Untuk cetak bolak-balik: kertas A4 portrait, ukuran 100% (Actual size), duplex <b>flip on long edge</b>. Unduh PDF depan dan belakang dengan kelas yang sama agar urutannya cocok.</div>')}<div id="kartuStatus" class="kstat"></div><div id="kartuCards" class="cards${ks==='keduanya'?' dua':''}">${kartuCards()}</div></div></div>`;
function kartuFilter(){const z=String(kkQ||'').toLowerCase().trim();let n=0;document.querySelectorAll('#kartuCards .card[data-sid]').forEach(c=>{const s=siswaById(Number(c.dataset.sid)),ok=!!s&&kartuCocok(s,z);c.style.display=ok?'':'none';if(ok){n++;const b=c.querySelector('.nbadge');if(b)b.textContent=n}})}
function cariKartuInput(el){kkQ=el.value;kartuFilter()}
/* ---------- salin & kirim link halaman siswa (link yang sama dengan isi QR kartu) ---------- */
function linkSiswa(s){return Kartu.urlPortal(s.kode_qr)}
async function salinLink(t){try{await navigator.clipboard.writeText(t);return true}catch(e){try{const a=document.createElement('textarea');a.value=t;a.style.cssText='position:fixed;opacity:0;top:0;left:0';document.body.appendChild(a);a.select();const ok=document.execCommand('copy');a.remove();return ok}catch(x){return false}}}
function waLokal(w){return '0'+String(w).replace(/^62/,'')}
function pesanLink(arr){const sk=ns();let isi;
 if(arr.length===1){const s=arr[0];isi='Berikut tautan halaman ananda di '+sk+'.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas+'\n\n🔗 '+linkSiswa(s)}
 else isi='Berikut tautan halaman ananda di '+sk+'.\n\n'+arr.map((s,i)=>(i+1)+'. *'+s.nama+'* ('+s.kelas+')\n🔗 '+linkSiswa(s)).join('\n\n');
 return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_\n\n'+isi+'\n\nMelalui tautan ini Bapak/Ibu dapat melihat kartu, absensi, dan data ananda. Mohon tautan tidak dibagikan kepada orang lain.\n\n💡 *Saran:* buka tautan dengan *Google Chrome* agar notifikasi absensi ananda dapat diaktifkan.\n\nTerima kasih 🙏🏻\n_Waalaikumsalam warahmatullahi wabarakatuh_'}
const kkNm=()=>kk==='*'?'semua kelas':'kelas '+kk;
function kelasLink(){return act().filter(s=>kk==='*'||s.kelas===kk).sort((a,b)=>(kk==='*'?kCmp(a,b):0)||String(a.nama).localeCompare(String(b.nama),'id'))}
function grupLink(list){const m=new Map(),tanpa=[];list.forEach(s=>{if(!s.kode_qr||!s.wa){tanpa.push(s);return}const k=String(s.wa);if(!m.has(k))m.set(k,{wa:k,arr:[]});m.get(k).arr.push(s)});const g=[...m.values()];g.forEach(x=>x.pan=x.arr.map(s=>s.pan||s.nama).join(', '));return {g,tanpa}}
async function salinLinkSatu(id){const s=siswaById(id);if(!s||!s.kode_qr)return toast('Link anak belum tersedia',false);const ok=await salinLink(linkSiswa(s));ok?toast('Link '+(s.pan||s.nama)+' disalin'):toast('Tidak bisa menyalin, coba lagi',false)}
async function kirimLinkSatu(id){const s=siswaById(id);if(!s||!s.kode_qr)return toast('Link anak belum tersedia',false);if(!s.aktif)return toast('Siswa nonaktif, link tidak bisa dikirim',false);if(!s.wa)return toast('Anak ini belum punya nomor WA orang tua',false);
 if(await konfirmasi('Kirim link halaman '+(s.pan||s.nama)+' ke '+waLokal(s.wa)+'?',{judul:'Kirim link',ikon:'📤',ya:'Kirim'}))kirimList([{wa:s.wa,pan:s.pan||s.nama,arr:[s]}],x=>pesanLink(x.arr),'Hasil pengiriman link')}
async function salinSemuaLink(){if(!kk)return toast(PK,false);const l=kelasLinkSemua().filter(s=>s.kode_qr);if(!l.length)return toast('Tidak ada siswa di kelas ini',false);const ok=await salinLink(l.map((s,i)=>(i+1)+'. '+s.nama+' : '+s.kelas+'\nLink halaman : '+linkSiswa(s)).join('\n\n'));ok?toast(l.length+' link '+kkNm()+' disalin'):toast('Tidak bisa menyalin, coba lagi',false)}
async function kirimSemuaLink(){if(!kk)return toast(PK,false);const {g,tanpa}=grupLink(kelasLink());if(!g.length)return toast('Tidak ada anak yang punya nomor WA orang tua',false);const est=estJadwal(g.length);
 if(await konfirmasi('Kirim link halaman anak '+kkNm()+' ke '+g.length+' nomor orang tua sekarang?'+(tanpa.length?'\n\n'+tanpa.length+' anak dilewati karena belum punya nomor WA.':'')+'\n\nPesan dijadwalkan bertahap (jeda 15-30 detik per nomor), perkiraan semua terkirim '+est+'. Halaman boleh ditutup setelah proses penjadwalan selesai (beberapa detik).',{judul:'Kirim semua link',ikon:'📤',ya:'Kirim'}))kirimList(g,x=>pesanLink(x.arr),'Hasil pengiriman link')}
function setUnduhBusy(btn,on,text){if(!btn)return true;if(on){if(btn.dataset.downloading==='1')return false;btn.dataset.downloading='1';btn.disabled=true;btn.classList.add('download-busy');btn._downloadHtml=btn.innerHTML;btn.innerHTML='<span class="dl-spin" aria-hidden="true"></span>'+(text||'Sedang memproses...');return true}btn.dataset.downloading='0';btn.disabled=false;btn.classList.remove('download-busy');if(btn._downloadHtml)btn.innerHTML=btn._downloadHtml;return true}
function jedaUnduh(){return new Promise(r=>setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(r)),80))}
const jedaKecil=ms=>new Promise(r=>setTimeout(r,ms));
function simpanPng(url,nama){const a=document.createElement('a');a.href=url;a.download=nama;document.body.appendChild(a);a.click();a.remove()}
async function unduhSatu(id,btn){if(!setUnduhBusy(btn,true,'Menyiapkan kartu...'))return;try{await jedaUnduh();const s=id==='uji'?siswaUji():siswaById(id);if(!s)throw new Error('Data anak tidak ditemukan');
 const sisi=ks==='keduanya'?['depan','belakang']:[ks],dasar='kartu-'+s.nama.replace(/[^\w]+/g,'-');
 if(id!=='uji'&&sisi.includes('belakang')&&!String(s.kode_scan||'').trim())throw new Error('Anak ini belum punya kode scan, kartu belakang tidak bisa dibuat');
 if(sisi.includes('depan'))await fotoSiap(s);
 for(let i=0;i<sisi.length;i++){if(i)await jedaKecil(500);simpanPng(kartuUrl(s,sisi[i]),dasar+'-'+sisi[i]+'.png')}
 toast('Kartu '+s.pan+' sedang diproses, mohon ditunggu')}catch(e){toast('Gagal mengunduh kartu: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

/* ---------- FOTO SISWA (Supabase Storage, bucket privat 'foto-siswa') ---------- */
const FOTO_BUCKET='foto-siswa',FOTO_MAX=80000,FC=new Map(),FU=new Map();
const fotoMuat=s=>{const p=s&&s.foto_path;return p&&FC.has(p)?FC.get(p):null};
/* cache foto di penyimpanan browser (Cache Storage), 30 hari. Nama berkas foto selalu baru saat foto diganti, jadi aman disimpan lama.
   Dibersihkan otomatis saat keluar akun (keluar() mengosongkan seluruh Cache Storage). */
const FOTO_CS='foto-kartu-v1',FOTO_UMUR=30*864e5,FOTO_CS_MAX=300;
const fotoCsAda=()=>typeof caches!=='undefined'&&/^https?:$/.test(location.protocol);
const fotoCsKunci=p=>location.origin+'/__foto/'+encodeURIComponent(p);
async function fotoCsAmbil(p){if(!fotoCsAda())return null;try{const c=await caches.open(FOTO_CS),k=fotoCsKunci(p),r=await c.match(k);if(!r)return null;
 const t=Number(r.headers.get('x-simpan'))||0;if(!t||Date.now()-t>FOTO_UMUR){await c.delete(k);return null}return await r.blob()}catch(e){return null}}
async function fotoCsSimpan(p,blob){if(!fotoCsAda()||!blob)return;try{const c=await caches.open(FOTO_CS);
 await c.put(fotoCsKunci(p),new Response(blob,{headers:{'Content-Type':blob.type||'image/jpeg','x-simpan':String(Date.now())}}));
 const ks=await c.keys();if(ks.length>FOTO_CS_MAX)await Promise.all(ks.slice(0,ks.length-FOTO_CS_MAX).map(k=>c.delete(k)))}catch(e){}}
async function fotoCsHapus(ps){if(!fotoCsAda())return;try{const c=await caches.open(FOTO_CS);await Promise.all((ps||[]).filter(Boolean).map(p=>c.delete(fotoCsKunci(p))))}catch(e){}}
const FP=new Map();
/* unduhan foto yang sedang berjalan dipakai bersama, jadi foto yang sama tidak diunduh dua kali */
function fotoSiap(s){const p=s&&s.foto_path;if(!p)return Promise.resolve(null);if(FC.has(p))return Promise.resolve(FC.get(p));let j=FP.get(p);if(!j){j=fotoSiapAsli(s).finally(()=>FP.delete(p));FP.set(p,j)}return j}
async function fotoSiapAsli(s){const p=s&&s.foto_path;if(!p)return null;if(FC.has(p))return FC.get(p);
 const pasang=async bl=>{const u=URL.createObjectURL(bl),im=new Image();im.src=u;try{await im.decode()}catch(e){URL.revokeObjectURL(u);throw e}
  if(FC.size>=150){const k=FC.keys().next().value;FC.delete(k);const o=FU.get(k);if(o)URL.revokeObjectURL(o);FU.delete(k)}
  FC.set(p,im);FU.set(p,u);return im};
 try{const c=await fotoCsAmbil(p);if(c){try{return await pasang(c)}catch(e){await fotoCsHapus([p])}}}catch(e){}
 if(netMati())return null;
 try{const r=await db.storage.from(FOTO_BUCKET).download(p);if(r.error||!r.data)throw r.error||new Error('kosong');const im=await pasang(r.data);await fotoCsSimpan(p,r.data);return im}catch(e){return null}}
async function fotoHapusBerkas(ps){ps=(ps||[]).filter(Boolean);if(!ps.length)return;try{await db.storage.from(FOTO_BUCKET).remove(ps)}catch(e){console.warn('Berkas foto belum terhapus dari penyimpanan',e)}ps.forEach(p=>{FC.delete(p);FU.delete(p)});fotoCsHapus(ps)}
/* pengecilan bertahap supaya hasil tajam */
function skalaFoto(img,sx,sy,sw,sh,W,H){let cur=img,csx=sx,csy=sy,csw=sw,csh=sh;
 while(csw/2>=W&&csh/2>=H){const n=document.createElement('canvas');n.width=Math.floor(csw/2);n.height=Math.floor(csh/2);const x=n.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,csx,csy,csw,csh,0,0,n.width,n.height);cur=n;csx=0;csy=0;csw=n.width;csh=n.height}
 const o=document.createElement('canvas');o.width=W;o.height=H;const x=o.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,W,H);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,csx,csy,csw,csh,0,0,W,H);return o}
async function fotoJpeg(im,sx,sy,sw,sh){
 for(const [W,H] of [[450,600],[390,520],[330,440]]){const cv=skalaFoto(im,sx,sy,sw,sh,W,H);
  for(const q of [.88,.8,.72,.64,.56,.5]){const b=await new Promise(r=>cv.toBlob(r,'image/jpeg',q));if(b&&b.size<=FOTO_MAX)return b}}
 throw new Error('Foto terlalu rumit, ukuran hasil melebihi batas. Coba foto lain')}
/* pemotong foto rasio 3:4: geser, cubit, atau gunakan penggeser untuk memperbesar */
let FK=null;
function fotoBatal(){if(FK)FK.batal()}
function fotoCrop(file){return new Promise(ok=>{
 const u=URL.createObjectURL(file),im=new Image();
 im.onerror=()=>{URL.revokeObjectURL(u);toast('File bukan gambar yang valid',false);ok(null)};
 im.onload=()=>{URL.revokeObjectURL(u);
  const iw=im.naturalWidth||im.width,ih=im.naturalHeight||im.height;
  if(Math.min(iw,ih)<200){toast('Foto terlalu kecil (minimal 200 px)',false);return ok(null)}
  const cv=$('#fkc'),x=cv.getContext('2d'),W=240,H=320,sl=$('#fkz'),bs=Math.max(W/iw,H/ih),P=new Map();
  let z=1,cx=iw/2,cy=ih*.42,d0=0,z0=1;
  const ukr=()=>({s:bs*z,sw:W/(bs*z),sh:H/(bs*z)});
  const jepit=()=>{const {sw,sh}=ukr();cx=Math.min(Math.max(cx,sw/2),iw-sw/2);cy=Math.min(Math.max(cy,sh/2),ih-sh/2)};
  const gambar=()=>{jepit();const {sw,sh}=ukr();x.fillStyle='#eef6f1';x.fillRect(0,0,480,640);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(im,cx-sw/2,cy-sh/2,sw,sh,0,0,480,640)};
  const tutup=()=>{$('#fk').classList.remove('show');cv.onpointerdown=cv.onpointermove=cv.onpointerup=cv.onpointercancel=cv.onwheel=null;sl.oninput=null;FK=null};
  cv.width=480;cv.height=640;sl.value=1;
  cv.onpointerdown=e=>{try{cv.setPointerCapture(e.pointerId)}catch(_){}P.set(e.pointerId,{x:e.clientX,y:e.clientY});if(P.size===2){const [a,b]=[...P.values()];d0=Math.hypot(a.x-b.x,a.y-b.y)||1;z0=z}};
  cv.onpointermove=e=>{const p=P.get(e.pointerId);if(!p)return;const k=W/(cv.clientWidth||W);
   if(P.size===1){const {s}=ukr();cx-=(e.clientX-p.x)*k/s;cy-=(e.clientY-p.y)*k/s}
   P.set(e.pointerId,{x:e.clientX,y:e.clientY});
   if(P.size===2){const [a,b]=[...P.values()];z=Math.min(3,Math.max(1,z0*(Math.hypot(a.x-b.x,a.y-b.y)||1)/d0));sl.value=z}
   gambar()};
  cv.onpointerup=cv.onpointercancel=e=>{P.delete(e.pointerId)};
  cv.onwheel=e=>{e.preventDefault();z=Math.min(3,Math.max(1,z*(e.deltaY<0?1.08:.93)));sl.value=z;gambar()};
  sl.oninput=()=>{z=+sl.value;gambar()};
  FK={batal:()=>{tutup();ok(null)}};
  $('#fkok').onclick=async()=>{const bt=$('#fkok');bt.disabled=true;try{jepit();const {sw,sh}=ukr();const b=await fotoJpeg(im,cx-sw/2,cy-sh/2,sw,sh);tutup();ok(b)}catch(e){toast((e&&e.message)||String(e),false)}finally{bt.disabled=false}};
  gambar();$('#fk').classList.add('show')};
 im.src=u})}
let FOTO_ID=null;
function fotoPilih(id){if(MB&&MB())return toast('Tidak tersedia di mode bantuan',false);FOTO_ID=id;const f=$('#fotoFile');f.value='';f.click()}
async function fotoDipilih(inp){const f=inp.files&&inp.files[0];inp.value='';const id=FOTO_ID;if(!f||id==null)return;const s=siswaById(id);if(!s)return;
 if(!/^image\//.test(f.type))return toast('Pilih file gambar (JPG, PNG, atau WebP)',false);
 if(f.size>15*1024*1024)return toast('Ukuran file maksimum 15 MB. File Anda '+(f.size/1048576).toFixed(1)+' MB',false);
 const blob=await fotoCrop(f);if(!blob)return;
 const pr=URL.createObjectURL(blob),nm=s.pan||s.nama;
 const ya=await konfirmasi((s.foto_path?'Foto lama '+nm+' akan diganti. ':'')+'Foto ini akan disimpan dan tampil di kartu pelajar '+nm+'.',{judul:s.foto_path?'Ubah foto?':'Simpan foto?',ikon:'📷',ya:'Simpan',gambar:pr});
 URL.revokeObjectURL(pr);if(!ya)return;
 guard(()=>fotoSimpan(s,blob))}
function pesanFoto(e){const m=String((e&&e.message)||e||'');
 if(/bucket not found/i.test(m))return 'Penyimpanan foto belum dibuat. Jalankan SQL Tahap 2 di Supabase.';
 if(/row-level security|policy|not authori[sz]ed|unauthori[sz]ed|403/i.test(m))return 'Anda tidak berhak menyimpan foto (aturan akses Storage belum dipasang atau tidak cocok).';
 if(/foto_path/i.test(m))return 'Kolom foto_path belum ada. Jalankan SQL Tahap 2 di Supabase.';
 return m||'Gagal menyimpan foto'}
async function fotoSimpan(s,blob){
 const sid=s.sekolah_id||(S.set&&S.set.sekolah_id);if(!sid)throw new Error('Sekolah tidak dikenali');
 const lama=s.foto_path||'',baru=sid+'/'+s.id+'-'+Date.now().toString(36)+'.jpg',bk=db.storage.from(FOTO_BUCKET);
 const up=await bk.upload(baru,blob,{contentType:'image/jpeg',upsert:false,cacheControl:'31536000'});if(up.error)throw new Error(pesanFoto(up.error));
 try{await dbq(db.from('siswa').update({foto_path:baru}).eq('id',s.id))}catch(e){await bk.remove([baru]).catch(()=>{});throw new Error(pesanFoto(e))}
 s.foto_path=baru;if(lama){bk.remove([lama]).catch(()=>{});FC.delete(lama);FU.delete(lama)}
 await fotoSiap(s);toast(lama?'Foto diperbarui':'Foto disimpan');fotoRefresh(s)}
async function fotoHapus(id){if(MB&&MB())return toast('Tidak tersedia di mode bantuan',false);const s=siswaById(id);if(!s||!s.foto_path)return;
 await fotoSiap(s);
 if(!await konfirmasi('Hapus foto '+(s.pan||s.nama)+'? Kartu akan kembali menampilkan siluet.',{judul:'Hapus foto',bahaya:1,ya:'Hapus',gambar:FU.get(s.foto_path)||''}))return;
 guard(async()=>{const p=s.foto_path;await dbq(db.from('siswa').update({foto_path:null}).eq('id',id));s.foto_path='';await fotoHapusBerkas([p]);toast('Foto dihapus');fotoRefresh(s)})}
function fotoAksiPopup(id){
 const s=siswaById(id);if(!s||!s.foto_path)return;
 const bg=document.createElement('div');bg.className='mb show';bg.style.zIndex='160';
 const panel=document.createElement('div');panel.className='modal';panel.style.cssText='width:min(360px,calc(100% - 28px));height:auto;max-height:90vh';
 const head=document.createElement('div');head.className='mh';
 const title=document.createElement('b');title.textContent='Foto '+(s.pan||s.nama);
 const close=document.createElement('button');close.type='button';close.textContent='✕';head.append(title,close);
 const body=document.createElement('div');body.className='mbody';body.textContent='Apa yang ingin dilakukan dengan foto siswa ini?';
 const foot=document.createElement('div');foot.className='mf';foot.style.justifyContent='stretch';
 const cancel=document.createElement('button');cancel.type='button';cancel.className='btn soft';cancel.textContent='Batal';
 const change=document.createElement('button');change.type='button';change.className='btn success';change.textContent='Ganti Foto';
 const download=document.createElement('button');download.type='button';download.className='btn soft';download.textContent='Unduh Foto Siswa';
 foot.append(cancel,change,download);panel.append(head,body,foot);bg.append(panel);document.body.append(bg);
 const tutup=()=>bg.remove();bg.addEventListener('click',e=>{if(e.target===bg)tutup()});close.onclick=cancel.onclick=tutup;
 change.onclick=()=>{tutup();fotoPilih(id)};
 download.onclick=()=>{tutup();fotoUnduhAsli(id,null)};
}
function kartuFotoAksi(id){fotoAksiPopup(id)}
async function fotoUnduhAsli(id,btn){
 if(btn&&btn.disabled)return;const s=siswaById(id);if(!s||!s.foto_path)return toast('Foto siswa belum tersedia',false);
 if(btn){btn.disabled=true;btn.dataset.downloadBusy='1'}
 try{await fotoSiap(s);const url=FU.get(s.foto_path);if(!url)throw new Error('Foto belum berhasil dimuat');
  const nama=String(s.pan||s.nama||'foto-siswa').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'foto-siswa';
  const a=document.createElement('a');a.href=url;a.download=nama+'.jpg';document.body.appendChild(a);a.click();a.remove();toast('Foto asli '+(s.pan||s.nama)+' diunduh');
 }catch(e){toast('Gagal mengunduh foto: '+(e.message||e),false)}
 finally{if(btn){btn.disabled=false;delete btn.dataset.downloadBusy}}
}
async function unduhKartuJpg(id){
 const s=siswaById(id);if(!s||!s.foto_path)return toast('Foto siswa belum tersedia',false);
 try{
  toast('Menyiapkan JPG kartu '+(s.pan||s.nama)+'...');
  await fotoSiap(s);await jedaUnduh();
  const src=kartuUrl(s,'depan'),im=new Image();im.src=src;await im.decode();
  const cv=document.createElement('canvas');cv.width=im.naturalWidth||im.width;cv.height=im.naturalHeight||im.height;
  const cx=cv.getContext('2d');if(!cx)throw new Error('Tidak dapat menyiapkan gambar');
  cx.fillStyle='#fff';cx.fillRect(0,0,cv.width,cv.height);cx.imageSmoothingEnabled=true;cx.imageSmoothingQuality='high';cx.drawImage(im,0,0);
  const blob=await new Promise((resolve,reject)=>cv.toBlob(b=>b?resolve(b):reject(new Error('Gagal membuat JPG')),'image/jpeg',.93));
  const url=URL.createObjectURL(blob),nama=String(s.pan||s.nama||'siswa').normalize('NFKD').replace(/[^a-zA-Z0-9_-]+/g,'-').replace(/^-+|-+$/g,'')||'siswa';
  const a=document.createElement('a');a.href=url;a.download='kartu-'+nama+'.jpg';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),5000);
  cv.width=1;cv.height=1;toast('JPG kartu '+(s.pan||s.nama)+' berhasil disiapkan');
 }catch(e){toast('Gagal mengunduh JPG kartu: '+(e.message||e),false)}
}
function fotoBlok(s){const p=s.foto_path,u=p&&FU.get(p);
 return `<div id="fotoBlok" data-id="${s.id}" style="display:flex;gap:14px;align-items:center;padding-bottom:12px;margin-bottom:12px;border-bottom:1px solid var(--bd)"><div class="fotoprev">${u?`<img src="${esc(u)}" alt="Foto">`:'<span>👤</span>'}</div><div style="display:flex;flex-direction:column;gap:8px"><button type="button" class="btn success sm" onclick="fotoPilih(${s.id})">📷 ${p?'Ubah foto':'Upload foto'}</button>${p?`<button type="button" class="btn soft sm" onclick="fotoUnduhAsli(${s.id},this)">⬇ Unduh Foto</button><button type="button" class="btn danger sm" onclick="fotoHapus(${s.id})">🗑 Hapus foto</button>`:''}</div></div>`}
function fotoBlokUlang(s){const el=$('#fotoBlok');if(el&&+el.dataset.id===s.id)el.outerHTML=fotoBlok(s)}
function fotoRefresh(s){fotoBlokUlang(s);if(view!=='kartu')return;
 /* hanya kartu depan siswa ini yang diganti; kartu lain dan posisi scroll dibiarkan */
 const ims=document.querySelectorAll('#v img[data-kartu-id="'+s.id+'"][data-sisi="depan"]');
 if(!ims.length){renderV();return}
 ims.forEach(im=>{try{im.src=kartuUrl(s,'depan',true)}catch(e){console.warn('Kartu belum bisa diperbarui',e)}
  const b=im.closest('.kfw')&&im.closest('.kfw').querySelector('.kfb');if(b)b.outerHTML=kfotoBtn(!!s.foto_path,s.aktif?(s.foto_path?`onclick="kartuFotoAksi(${s.id})"`:`onclick="fotoPilih(${s.id})"`):'disabled title="Siswa nonaktif"')})}
function gambarQR(doc,kode,x,y,size){const o=qrObj(kode),n=o.getModuleCount(),qz=2,cell=size/(n+qz*2);doc.setFillColor(255,255,255);doc.rect(x,y,size,size,'F');doc.setFillColor(0,0,0);for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(o.isDark(r,c))doc.rect(x+(c+qz)*cell,y+(r+qz)*cell,cell+0.03,cell+0.03,'F')}
/* ---------- urutan bersama & kalibrasi cetak belakang ---------- */
const kalBulat=v=>{v=Math.round((parseFloat(v)||0)*10)/10;return Math.max(-5,Math.min(5,v))},KALK='kartu_kalibrasi',KALKP='kartu_kalibrasi_portrait';
function kalMuat(){try{const o=JSON.parse(localStorage.getItem(KALK)||'{}');return{x:kalBulat(o.x),y:kalBulat(o.y)}}catch(e){return{x:0,y:0}}}
let KAL=kalMuat(),KALP=(()=>{try{const o=JSON.parse(localStorage.getItem(KALKP)||'{}');return{x:kalBulat(o.x),y:kalBulat(o.y)}}catch(e){return{x:0,y:0}}})(),kalT={x:0,y:0};
const daftarKartuTampil=()=>S.siswa.filter(s=>!kk||kk==='*'||s.kelas===kk).sort((a,b)=>kCmp(a,b)||(a.aktif===b.aktif?0:a.aktif?-1:1)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0));
const kbeku=(s,sd)=>`<div class="kwrap knon ${ko==='portrait'?'kportrait':''}"><div class="kspin"><div class="kspn"></div>Memuat kartu...</div><img class="kimg" data-kartu-id="${s.id}" data-sisi="${sd}" alt=""><div class="knlbl">Siswa nonaktif</div></div>`;
const kimgK=(s,sd)=>s.aktif?kimg(s,sd):kbeku(s,sd);
const kfotoBtn=(adaFoto,att)=>`<button type="button" class="kfb ${adaFoto?'ada-foto':'foto-kosong'}" aria-label="${adaFoto?'Pilihan foto siswa':'Upload foto siswa'}" title="${adaFoto?'Pilihan foto':'Upload foto'}" ${att}><svg viewBox="0 0 24 24" aria-hidden="true">${adaFoto?'':'<path d="M12 5v14M5 12h14"/>'}</svg></button>`;
const kdepanK=s=>`<div class="kfw ${ko==='portrait'?'kportrait':''}">${kimgK(s,'depan')}${kfotoBtn(!!s.foto_path,s.aktif?(s.foto_path?`onclick="kartuFotoAksi(${s.id})"`:`onclick="fotoPilih(${s.id})"`):'disabled title="Siswa nonaktif"')}</div>`;
const kelasLinkSemua=()=>S.siswa.filter(s=>kk==='*'||s.kelas===kk).sort((a,b)=>(kk==='*'?kCmp(a,b):0)||(a.aktif===b.aktif?0:a.aktif?-1:1)||String(a.nama).localeCompare(String(b.nama),'id'));
const daftarKartu=()=>act().filter(s=>!kk||kk==='*'||s.kelas===kk).sort((a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0));
const kalFmt=v=>v===0?'0':v.toFixed(1),kalTeks=o=>'X '+(o.x>0?'+':'')+kalFmt(o.x)+' mm, Y '+(o.y>0?'+':'')+kalFmt(o.y)+' mm';
function kalPrev(){const e=$('#kalPrev');if(!e)return;const w=ko==='portrait'?53.98:85.6,h=ko==='portrait'?85.6:53.98;e.innerHTML='<svg viewBox="-7 -7 '+(w+14)+' '+(h+14)+'" style="width:100%;max-width:270px;max-height:250px;display:block;margin:0 auto" aria-hidden="true"><rect x="0" y="0" width="'+w+'" height="'+h+'" rx="3" fill="none" stroke="#8a948d" stroke-width=".6" stroke-dasharray="2 1.5"/><rect x="'+kalT.x+'" y="'+kalT.y+'" width="'+w+'" height="'+h+'" rx="3" fill="rgba(21,148,71,.16)" stroke="#159447" stroke-width=".9"/><text x="'+(w/2)+'" y="'+(h/2)+'" font-size="6" text-anchor="middle" fill="currentColor" opacity=".7">'+kalTeks(kalT)+'</text></svg><div class="mu" style="font-size:12px;margin-top:4px">Abu putus-putus = posisi awal, hijau = posisi belakang setelah digeser (pratinjau dibesarkan)</div>'}
function kalTampil(){$('#kalx').value=kalFmt(kalT.x);$('#kaly').value=kalFmt(kalT.y);kalPrev()}
function kalBuka(){const o=ko==='portrait'?KALP:KAL;kalT={x:o.x,y:o.y};kalTampil();$('#kal').classList.add('show')}
async function kalTutup(){if(!await jagaTanya(['kal']))return;$('#kal').classList.remove('show')}
function kalUbah(k,d){kalT[k]=kalBulat(kalT[k]+d);kalTampil()}
function kalIsi(k,v){kalT[k]=kalBulat(v);kalTampil()}
function kalNol(){kalT={x:0,y:0};if(ko==='portrait'){KALP={x:0,y:0};try{localStorage.removeItem(KALKP)}catch(e){}}else{KAL={x:0,y:0};try{localStorage.removeItem(KALK)}catch(e){}}kalTampil()}
function kalSimpan(){const o={x:kalT.x,y:kalT.y};if(ko==='portrait'){KALP=o;try{localStorage.setItem(KALKP,JSON.stringify(o))}catch(e){}}else{KAL=o;try{localStorage.setItem(KALK,JSON.stringify(o))}catch(e){}}kalTutup();toast('Kalibrasi '+(ko==='portrait'?'portrait':'landscape')+' disimpan: '+kalTeks(o));return true}
async function kalUji(btn){await muatLib('pdf');if(!setUnduhBusy(btn,true,'Membuat lembar uji...'))return;try{await jedaUnduh();if(ko==='portrait'){const W=53.98,H=85.6,GX=8,GY=6,C=3,R=3,x0=(210-(C*W+(C-1)*GX))/2,y0=(297-(R*H+(R-1)*GY))/2,doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});[0,1].forEach(pg=>{if(pg)doc.addPage();doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(pg?'LEMBAR UJI PORTRAIT - BELAKANG':'LEMBAR UJI PORTRAIT - DEPAN',105,12,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('A4 portrait, skala 100%, duplex flip on long edge.',105,17,{align:'center'});for(let p=0;p<C*R;p++){const col=pg?C-1-(p%C):p%C,row=Math.floor(p/C),x=x0+col*(W+GX)+(pg?kalT.x:0),y=y0+row*(H+GY)+(pg?kalT.y:0);doc.setDrawColor(110);doc.setLineWidth(.25);doc.setLineDashPattern([],0);doc.rect(x,y,W,H);doc.setLineWidth(.15);doc.line(x+W/2-7,y+H/2,x+W/2+7,y+H/2);doc.line(x+W/2,y+H/2-7,x+W/2,y+H/2+7);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(String(p+1),x+5,y+12);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(pg?'BELAKANG':'DEPAN',x+W-4,y+H-4,{align:'right'})}});doc.save('lembar-uji-kartu-portrait.pdf');toast('Lembar uji portrait dibuat');return}
 const KW=85.6,KH=53.98,GX=11,GY=11,C=2,R=4,x0=(210-(C*KW+(C-1)*GX))/2,y0=(297-(R*KH+(R-1)*GY))/2,doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
 [0,1].forEach(pg=>{if(pg)doc.addPage();
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(40);doc.text(pg?'LEMBAR UJI - BELAKANG':'LEMBAR UJI - DEPAN',105,12,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text('A4 portrait, skala 100%, duplex flip on long edge. Terawang ke cahaya: kotak bernomor sama harus berimpit.',105,17,{align:'center'});
  if(pg)doc.text('Geser belakang: '+kalTeks(kalT),105,21,{align:'center'});
  for(let p=0;p<C*R;p++){let c=p%C;const r=Math.floor(p/C);if(pg)c=C-1-c;const x=x0+c*(KW+GX)+(pg?kalT.x:0),y=y0+r*(KH+GY)+(pg?kalT.y:0);
   doc.setDrawColor(110);doc.setLineWidth(.25);doc.setLineDashPattern([],0);doc.rect(x,y,KW,KH);
   doc.setLineWidth(.15);doc.line(x+KW/2-7,y+KH/2,x+KW/2+7,y+KH/2);doc.line(x+KW/2,y+KH/2-7,x+KW/2,y+KH/2+7);
   doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(60);doc.text(String(p+1),x+5,y+12);
   doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text(pg?'BELAKANG':'DEPAN',x+KW-4,y+KH-4,{align:'right'})}});
 doc.save('lembar-uji-kartu.pdf');toast('Lembar uji dibuat, cetak bolak-balik lalu terawang ke cahaya')}catch(e){toast('Gagal membuat lembar uji: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

/* Garis potong putus-putus mengelilingi kartu, offset 1 mm di luar ukuran fisik kartu. */
function tandaPotongKartu(doc,x,y,w,h){doc.setDrawColor(95);doc.setLineWidth(.15);doc.setLineDashPattern([1,1],0);doc.rect(x-1,y-1,w+2,h+2);doc.setLineDashPattern([],0)}
async function unduhKartuBerdampingan(list,btn){
 const portrait=ko==='portrait',W=portrait?53.98:85.6,H=portrait?85.6:53.98,G=1;
 const doc=new window.jspdf.jsPDF({orientation:portrait?'landscape':'portrait',unit:'mm',format:'a4',compress:true});
 const perPage=portrait?4:4,cols=portrait?2:1,rows=portrait?2:4,GX=portrait?16:0,GY=portrait?14:11;
 const pairW=2*W+G,pairH=H;
 const x0=((portrait?297:210)-(cols*pairW+(cols-1)*GX))/2;
 const pageH=portrait?210:297; // A4 landscape untuk kartu portrait, A4 portrait untuk kartu landscape
 const y0=(pageH-(rows*pairH+(rows-1)*GY))/2;
 for(let i=0;i<list.length;i++){
  const p=i%perPage;
  if(i&&p===0)doc.addPage('a4',portrait?'landscape':'portrait');
  const col=portrait?p%cols:0,row=portrait?Math.floor(p/cols):p;
  const x=x0+col*(pairW+GX),y=y0+row*(pairH+GY),s=list[i],backOffset=portrait?KALP:KAL;
  if(portrait)await fotoSiap(s);
  const add=async(sd,xx,off)=>{
   const im=new Image();im.src=kartuUrl(s,sd);await im.decode();
   const cv=document.createElement('canvas');cv.width=portrait?1260:1980;cv.height=portrait?1980:1260;
   const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(im,0,0,cv.width,cv.height);
   doc.addImage(cv.toDataURL('image/jpeg',.92),'JPEG',xx+off.x,y+off.y,W,H);
  };
  await add('depan',x,{x:0,y:0});
  await add('belakang',x+W+G,backOffset);
  /* Satu garis potong putus-putus mengelilingi pasangan depan-belakang; tidak ada garis di celah tengah. */
  tandaPotongKartu(doc,x,y,pairW,pairH);
  if(btn){btn.innerHTML='<span class="dl-spin" aria-hidden="true"></span>Membuat pasangan kartu '+(i+1)+'/'+list.length+'...';await jedaKecil(0)}
 }
 doc.save('kartu-siswa-'+(portrait?'portrait':'landscape')+'-depan-belakang-berdampingan.pdf');
 toast(list.length+' pasangan kartu dibuat dalam PDF A4 '+(portrait?'landscape':'portrait'))
}
async function unduhKartuPortrait(list,btn){
 const sisi=ks==='keduanya'?['depan','belakang']:[ks],duo=ks==='keduanya';
 if(duo&&km==='berdampingan'){await unduhKartuBerdampingan(list,btn);return}
 /* Portrait terpisah: 3 kartu per baris x 3 baris (9 kartu/halaman), ukuran ID-1 vertikal tetap. */
 const W=53.98,H=85.6,GX=8,GY=6,C=3,R=3,PP=C*R,x0=(210-(C*W+(C-1)*GX))/2,y0=(297-(R*H+(R-1)*GY))/2;
 for(let fi=0;fi<sisi.length;fi++){const sd=sisi[fi],doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true}),off=sd==='belakang'?KALP:{x:0,y:0};
  for(let i=0;i<list.length;i++){const s=list[i];if(sd==='depan')await fotoSiap(s);if(i&&i%PP===0)doc.addPage();const p=i%PP,col=sd==='belakang'?C-1-(p%C):p%C,x=x0+col*(W+GX)+off.x,y=y0+Math.floor(p/C)*(H+GY)+off.y;const im=new Image();im.src=kartuUrl(s,sd);await im.decode();const cv=document.createElement('canvas');cv.width=1260;cv.height=1980;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1260,1980);c.drawImage(im,0,0,1260,1980);doc.addImage(cv.toDataURL('image/jpeg',.92),'JPEG',x,y,W,H);tandaPotongKartu(doc,x,y,W,H);if(btn){btn.innerHTML='<span class="dl-spin" aria-hidden="true"></span>Membuat PDF '+sd+' ('+(i+1)+'/'+list.length+')...';await jedaKecil(0)}}
  doc.save('kartu-siswa-portrait-'+sd+'.pdf');if(fi<sisi.length-1)await jedaKecil(700)
 }
 toast(duo?'Dua PDF portrait (depan dan belakang) selesai dibuat':'PDF kartu portrait selesai dibuat')
}
let kartuCetakDaftar=[],kartuCetakTerpilih=new Set(),kartuCetakTombol=null;
function kartuCetakHtml(){
 const q=String($('#kartuCetakCari')?.value||'').toLowerCase().trim();
 const rows=kartuCetakDaftar.filter(s=>!q||String(s.nama||'').toLowerCase().includes(q)||String(s.pan||'').toLowerCase().includes(q)||String(s.nisn||'').toLowerCase().includes(q));
 return rows.map(s=>'<label style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid var(--bd);font-size:14px"><input type="checkbox" '+(kartuCetakTerpilih.has(String(s.id))?'checked':'')+' onchange="kartuCetakToggle(\''+String(s.id)+'\',this.checked)" style="width:18px;height:18px;flex:0 0 18px"><span style="min-width:0;flex:1"><b>'+esc(s.nama)+'</b><small style="display:block;color:var(--mu)">'+esc(s.kelas||'')+(s.aktif===false?' · Nonaktif':'')+'</small></span></label>').join('')||'<div class="note">Tidak ada siswa yang cocok.</div>';
}
function kartuCetakRender(){const box=$('#kartuCetakDaftar');if(box)box.innerHTML=kartuCetakHtml();const n=$('#kartuCetakJumlah');if(n)n.textContent=kartuCetakTerpilih.size+' dari '+kartuCetakDaftar.length+' siswa dipilih';const all=$('#kartuCetakSemua');if(all)all.textContent=kartuCetakTerpilih.size===kartuCetakDaftar.length?'Kosongkan pilihan':'Pilih semua';}
function kartuCetakToggle(id,on){on?kartuCetakTerpilih.add(String(id)):kartuCetakTerpilih.delete(String(id));kartuCetakRender()}
function kartuCetakCari(){kartuCetakRender()}
function kartuCetakSemua(){if(kartuCetakTerpilih.size===kartuCetakDaftar.length)kartuCetakTerpilih.clear();else kartuCetakDaftar.forEach(s=>kartuCetakTerpilih.add(String(s.id)));kartuCetakRender()}
function bukaPilihKartu(btn){
 if(!kk)return toast(PK,false);
 kartuCetakTombol=btn;kartuCetakDaftar=daftarKartuTampil().slice().sort((a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0));
 if(!kartuCetakDaftar.length)return toast('Tidak ada siswa pada kelas yang dipilih',false);
 kartuCetakTerpilih=new Set(kartuCetakDaftar.map(s=>String(s.id)));
 info('Pilih siswa yang akan dicetak','<div class="note">Kelas: <b>'+esc(kk==='*'?'Semua kelas':kk)+'</b>. Secara awal semua siswa terpilih; hilangkan centang pada siswa yang tidak ingin dicetak.</div><div class="tb" style="margin:8px 0"><input id="kartuCetakCari" class="input" style="flex:1;min-width:0" placeholder="Cari nama siswa..." oninput="kartuCetakCari()"><button type="button" id="kartuCetakSemua" class="btn soft sm" onclick="kartuCetakSemua()">Kosongkan pilihan</button></div><div id="kartuCetakJumlah" class="mu" style="margin:4px 0 8px"></div><div id="kartuCetakDaftar" style="max-height:48vh;overflow:auto;border:1px solid var(--bd);border-radius:12px;padding:4px"></div>');
 kartuCetakRender();
 $('#ms').style.display='';$('#ms').textContent='Cetak siswa dipilih';$('#ms').className='btn success';
 $('#ms').onclick=()=>{const ids=new Set(kartuCetakTerpilih);if(!ids.size){toast('Pilih minimal satu siswa',false);return}closeM();unduhKartu(kartuCetakTombol,ids)};
}
async function unduhKartu(btn,ids){if(!kk)return toast(PK,false);await muatLib('pdf');if(!setUnduhBusy(btn,true,'Membuat PDF kartu...'))return;try{await jedaUnduh();const list0=daftarKartuTampil().filter(s=>!ids||ids.has(String(s.id))).slice().sort((a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0)),tanpa=ks==='depan'?[]:list0.filter(x=>!String(x.kode_scan||'').trim()),list=list0.filter(x=>!tanpa.includes(x));if(ujiPdf)list.push(siswaUji());if(!list.length){toast(tanpa.length?'Semua anak di pilihan ini belum punya kode scan, kartu belakang tidak bisa dibuat':'Tidak ada siswa untuk dicetak',false);return}if(ko==='portrait'){await unduhKartuPortrait(list,btn);return}
 /* ukuran kartu = ID-1 / KTP 85,6 x 53,98 mm; jarak antar kartu (mm), ubah di sini bila perlu */
 const KW=85.6,KH=53.98,GX=11,GY=11,C=2,R=4,PP=C*R,x0=(210-(C*KW+(C-1)*GX))/2,y0=(297-(R*KH+(R-1)*GY))/2,dua=ks==='keduanya',sisiPdf=dua?['depan','belakang']:[ks];if(dua&&km==='berdampingan'){await unduhKartuBerdampingan(list,btn);return}
 /* gambar kartu untuk PDF dibuat JPEG (ukuran tetap 1980x1260) supaya PDF tidak perlu membongkar PNG besar: jauh lebih cepat, hasil tetap tajam */
 const taruh=async(doc,s,sd,x,y)=>{const u=kartuUrl(s,sd),im=new Image();im.src=u;await im.decode();const cv=document.createElement('canvas');cv.width=1980;cv.height=1260;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1980,1260);c.drawImage(im,0,0,1980,1260);const j=cv.toDataURL('image/jpeg',.92);doc.addImage(j,'JPEG',x,y,KW,KH);tandaPotongKartu(doc,x,y,KW,KH);if(s.aktif===false){/* label di luar kartu, diputar 90° (terbaca dari bawah ke atas): kartu kiri → di margin kiri (terbaca bawah ke atas), kartu kanan → di margin kanan (terbaca atas ke bawah, menghadap keluar); jarak ±2,5 mm dari garis kartu; tidak mengganggu pemotongan */doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(212,32,47);const tl='SISWA NONAKTIF',tw=doc.getTextWidth(tl),kiri=(x+KW/2)<105;if(kiri)doc.text(tl,x-3.1,y+KH/2+tw/2,{angle:90});else doc.text(tl,x+KW+3.1,y+KH/2-tw/2,{angle:270});doc.setTextColor(0);doc.setFont('helvetica','normal')}};
 /* mode "Depan & belakang" = 2 file PDF: semua siswa sisi depan, lalu semua siswa sisi belakang (kolom dibalik + kalibrasi, siap cetak bolak-balik) */
 for(let fi=0;fi<sisiPdf.length;fi++){const sk=sisiPdf[fi],doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
 for(let i=0;i<list.length;i++){const s=list[i];if(sk==='depan')await fotoSiap(s);if(i>0&&i%PP===0)doc.addPage();const p=i%PP;if(p===0){doc.setDrawColor(170);doc.setLineWidth(.15);doc.setLineDashPattern([1.2,1.2],0)}
  const cb=p%C,bl=sk==='belakang',cx=bl?C-1-cb:cb,o=bl?KAL:{x:0,y:0};await taruh(doc,s,sk,x0+cx*(KW+GX)+o.x,y0+Math.floor(p/C)*(KH+GY)+o.y);
  if(btn&&i<list.length-1){btn.innerHTML='<span class="dl-spin" aria-hidden="true"></span>Membuat PDF '+(dua?sk+' ('+(fi+1)+'/2) ':'kartu ')+(i+1)+'/'+list.length+'...';await jedaKecil(0)}}
 doc.save('kartu-siswa-'+sk+'.pdf');if(fi<sisiPdf.length-1)await new Promise(r=>setTimeout(r,800))}toast(list.length+' kartu sedang diproses, mohon ditunggu'+(dua?'. Hasilnya 2 file PDF: depan dan belakang':'')+(tanpa.length?'. '+tanpa.length+' anak dilewati karena belum punya kode scan':''))}catch(e){toast('Gagal membuat PDF: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
