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
