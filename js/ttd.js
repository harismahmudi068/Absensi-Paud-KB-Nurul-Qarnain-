/* ---------- guru ---------- */
async function apiTtd(body){
 const {data:{session}}=await db.auth.getSession();
 if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');
 const r=await fetch('/api/tanda-tangan',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,...body})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||j.message||('Gagal ('+r.status+')'));
 return j;
}
function ttdBoxGambar(data){return data?'<img src="'+data+'" alt="Pratinjau tanda tangan" style="display:block;max-width:100%;width:260px;height:68px;object-fit:contain;background:#fff;border:1px solid var(--bd);border-radius:10px;padding:6px">':'<div class="note">Belum ada tanda tangan.</div>'}
let TTD_DRAW_STATE=null;
function ttdEditorHtml(data,scope,id,nama){
 const sid=String(id||'').replace(/[^a-zA-Z0-9_-]/g,'');
 return '<div id="ttdEditor_'+scope+'" data-id="'+esc(sid)+'" data-nama="'+esc(nama||'')+'">'+
  ttdBoxGambar(data)+
  '<div class="mu" style="margin:8px 0">Pilih salah satu cara. Hasil disimpan sebagai PNG transparan, maksimal 720 × 240 piksel dan 1 MB.</div>'+
  '<div class="tb" style="gap:8px;flex-wrap:wrap"><button type="button" class="btn success sm" onclick="document.getElementById(\'ttdFile_'+scope+'\').click()">📁 Unggah File</button><button type="button" class="btn soft sm" onclick="ttdModeGambar(\''+scope+'\')">✍️ Gambar Sendiri</button></div>'+
  '<input id="ttdFile_'+scope+'" class="hid" type="file" accept="image/png,image/jpeg,image/webp" onchange="ttdFilePilih(this,\''+scope+'\')">'+
  '<div id="ttdDrawPanel_'+scope+'" class="ttd-draw-panel hid" style="position:fixed;inset:0;z-index:10000;margin:0!important;border:0!important;border-radius:0!important;padding:max(16px,env(safe-area-inset-top)) 16px max(18px,env(safe-area-inset-bottom))!important;background:var(--bg);overflow:auto;box-shadow:none">'+
   '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px"><div><b style="font-size:18px">✍️ Gambar Tanda Tangan</b><div class="mu">Gunakan area luas ini untuk menggambar dengan jari.</div></div><button type="button" class="btn soft sm" onclick="ttdModeTutup(\''+scope+'\')">✕ Tutup</button></div>'+
   '<canvas id="ttdCanvas_'+scope+'" class="ttd-draw-canvas" width="1440" height="840" style="display:block;width:100%;height:min(55vh,480px);max-height:none;touch-action:none;background:#fff;border:1px dashed var(--mu);border-radius:12px;cursor:crosshair" onpointerdown="ttdGambarMulai(event,\''+scope+'\')" onpointermove="ttdGambarGerak(event,\''+scope+'\')" onpointerup="ttdGambarAkhiri(event,\''+scope+'\')" onpointercancel="ttdGambarAkhiri(event,\''+scope+'\')"></canvas>'+
   '<div class="tb" style="margin-top:9px;gap:7px;flex-wrap:wrap"><button type="button" class="btn soft sm" onclick="ttdGambarUndo(\''+scope+'\')">↶ Urungkan</button><button type="button" class="btn soft sm" onclick="ttdGambarBersih(\''+scope+'\')">Hapus Gambar</button><button type="button" class="btn success sm" onclick="ttdGambarSimpan(\''+scope+'\')">Simpan Tanda Tangan</button></div>'+
   '<div class="mu" style="margin-top:7px">Gunakan tinta hitam. Area kosong di sekitar goresan akan dipangkas otomatis.</div>'+
  '</div>'+
  (data?'<div class="tb" style="margin-top:10px"><button type="button" class="btn danger sm" onclick="ttdHapusEditor(\''+scope+'\')">Hapus Tanda Tangan</button></div>':'')+
 '</div>';
}
function ttdHapusEditor(scope){const wrap=document.getElementById('ttdEditor_'+scope);if(!wrap)return;if(scope==='profil')return ttdHapusSaya();return ttdGuruHapus(wrap.dataset.id,wrap.dataset.nama||'Guru')}
function ttdModeGambar(scope){
 const panel=document.getElementById('ttdDrawPanel_'+scope),canvas=document.getElementById('ttdCanvas_'+scope);
 if(!panel||!canvas)return;
 panel.classList.remove('hid');
 if(!TTD_DRAW_STATE||TTD_DRAW_STATE.scope!==scope){const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);TTD_DRAW_STATE={scope,canvas,ctx:c,undo:[],drawing:false};}
}
function ttdModeTutup(scope){
 const panel=document.getElementById('ttdDrawPanel_'+scope);
 if(panel)panel.classList.add('hid');
 if(TTD_DRAW_STATE&&TTD_DRAW_STATE.scope===scope)TTD_DRAW_STATE.drawing=false;
}
function ttdPosisi(e,canvas){const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*canvas.width/r.width,y:(e.clientY-r.top)*canvas.height/r.height}}
function ttdGambarMulai(e,scope){
 const c=document.getElementById('ttdCanvas_'+scope);if(!c)return;ttdModeGambar(scope);
 const s=TTD_DRAW_STATE;if(!s||s.canvas!==c)return;
 s.undo.push(c.toDataURL('image/png'));if(s.undo.length>20)s.undo.shift();
 const p=ttdPosisi(e,c);s.ctx.beginPath();s.ctx.moveTo(p.x,p.y);s.ctx.lineCap='round';s.ctx.lineJoin='round';s.ctx.strokeStyle='#111';s.ctx.lineWidth=12;s.drawing=true;s.lastPoint=p;s.hasMoved=false;
 try{c.setPointerCapture(e.pointerId)}catch(_){}
 e.preventDefault();
}
function ttdGambarGerak(e,scope){
 const s=TTD_DRAW_STATE;if(!s||s.scope!==scope||!s.drawing)return;
 const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[e];
 for(const ev of events){
  const p=ttdPosisi(ev,s.canvas),last=s.lastPoint;if(!last)continue;
  const mx=(last.x+p.x)/2,my=(last.y+p.y)/2;
  s.ctx.quadraticCurveTo(last.x,last.y,mx,my);s.ctx.stroke();
  s.ctx.beginPath();s.ctx.moveTo(mx,my);s.lastPoint=p;s.hasMoved=true;
 }
 e.preventDefault();
}
function ttdGambarAkhiri(e,scope){
 const s=TTD_DRAW_STATE;if(!s||s.scope!==scope||!s.drawing)return;
 if(s.lastPoint){
  if(!s.hasMoved){s.ctx.beginPath();s.ctx.arc(s.lastPoint.x,s.lastPoint.y,6,0,Math.PI*2);s.ctx.fillStyle='#111';s.ctx.fill()}
  else{s.ctx.lineTo(s.lastPoint.x,s.lastPoint.y);s.ctx.stroke()}
 }
 s.drawing=false;s.lastPoint=null;s.hasMoved=false;
 if(e&&e.preventDefault)e.preventDefault();
}
function ttdGambarUndo(scope){
 const s=TTD_DRAW_STATE;if(!s||s.scope!==scope||!s.undo.length)return;
 const data=s.undo.pop(),im=new Image();im.onload=()=>{s.ctx.clearRect(0,0,s.canvas.width,s.canvas.height);s.ctx.drawImage(im,0,0)};im.src=data;
}
function ttdGambarBersih(scope){
 const s=TTD_DRAW_STATE;if(!s||s.scope!==scope)return;
 s.ctx.clearRect(0,0,s.canvas.width,s.canvas.height);s.undo=[];
}
function ttdNormalisasi(data){
 return new Promise((resolve,reject)=>{
  const im=new Image();im.onload=()=>{
   try{
    const c=document.createElement('canvas');c.width=720;c.height=240;const x=c.getContext('2d',{willReadFrequently:true});
    const pad=12,scale=Math.min((c.width-pad*2)/im.naturalWidth,(c.height-pad*2)/im.naturalHeight);
    const w=im.naturalWidth*scale,h=im.naturalHeight*scale;x.drawImage(im,(c.width-w)/2,(c.height-h)/2,w,h);
    const image=x.getImageData(0,0,c.width,c.height),p=image.data;let minX=c.width,minY=c.height,maxX=-1,maxY=-1;
    for(let i=0;i<p.length;i+=4){
     if(p[i+3]===0)continue;
     const dark=255-(p[i]+p[i+1]+p[i+2])/3;
     const a=Math.round(p[i+3]*Math.max(0,Math.min(1,(dark-5)/190)));
     p[i]=15;p[i+1]=15;p[i+2]=15;p[i+3]=a;
     if(a>10){const n=i/4,xx=n%c.width,yy=Math.floor(n/c.width);if(xx<minX)minX=xx;if(xx>maxX)maxX=xx;if(yy<minY)minY=yy;if(yy>maxY)maxY=yy}
    }
    if(maxX<minX||maxY<minY)return reject(new Error('Tanda tangan belum terlihat. Gunakan tinta yang lebih gelap.'));
    x.putImageData(image,0,0);
    const bw=maxX-minX+1,bh=maxY-minY+1,out=document.createElement('canvas');out.width=720;out.height=240;
    const ox=out.getContext('2d'),fit=Math.min(672/bw,192/bh),dw=bw*fit,dh=bh*fit;
    ox.drawImage(c,minX,minY,bw,bh, (720-dw)/2,(240-dh)/2,dw,dh);
    const result=out.toDataURL('image/png'),b64=result.slice(result.indexOf(',')+1);
    const bytes=Math.floor(b64.length*3/4)-(b64.endsWith('==')?2:b64.endsWith('=')?1:0);
    if(bytes>1048576)return reject(new Error('Hasil tanda tangan melebihi batas 1 MB. Gunakan gambar yang lebih sederhana atau unggah ulang.'));
    resolve(result);
   }catch(e){reject(e)}
  };im.onerror=()=>reject(new Error('Gambar tidak dapat dibaca'));im.src=data;
 });
}
function ttdDataSimpan(scope,data){
 const wrap=document.getElementById('ttdEditor_'+scope);if(!wrap)return Promise.reject(new Error('Area tanda tangan tidak ditemukan'));
 const id=wrap.dataset.id,nama=wrap.dataset.nama||'Guru';
 return apiTtd({aksi:'simpan',...(scope==='guru'?{id}:{}),data}).then(async()=>{
  if(scope==='profil'){TTD_PROFIL=data;TTD_PROFIL_USER=me;TTD_GURU[me]=true;await ttdProfilMuat(true);toast('Tanda tangan berhasil disimpan')}
  else{TTD_GURU[id]=true;toast('Tanda tangan '+nama+' berhasil disimpan');await ttdGuruMuat(true);await ttdGuruBuka(id,nama,true)}
 });
}
async function ttdFilePilih(inp,scope){
 const f=inp.files&&inp.files[0];inp.value='';if(!f)return;
 guard(async()=>{if(!['image/png','image/jpeg','image/webp'].includes(f.type))throw new Error('File harus berupa PNG, JPG, atau WEBP');if(f.size>1048576)throw new Error('Ukuran file yang diunggah maksimal 1 MB');const raw=await new Promise((ok,no)=>{const r=new FileReader();r.onload=()=>ok(String(r.result||''));r.onerror=()=>no(new Error('File tidak bisa dibaca'));r.readAsDataURL(f)});const png=await ttdNormalisasi(raw);await ttdDataSimpan(scope,png)});
}
async function ttdGambarSimpan(scope){
 const s=TTD_DRAW_STATE;if(!s||s.scope!==scope)return toast('Silakan gambar tanda tangan terlebih dahulu',false);
 guard(async()=>{const png=await ttdNormalisasi(s.canvas.toDataURL('image/png'));await ttdDataSimpan(scope,png);TTD_DRAW_STATE=null});
}
async function ttdProfilMuat(force){
 const box=$('#ttdProfilBox');if(!box)return;if(MB()){box.innerHTML='<div class="note">Mode bantuan: tanda tangan hanya dapat dikelola oleh pemilik akun.</div>';return}
 if(!force&&TTD_PROFIL_USER===me&&TTD_PROFIL!==null){box.innerHTML=ttdProfilHtml(TTD_PROFIL);return}
 box.innerHTML='<div class="mu">Memuat tanda tangan...</div>';
 try{const j=await apiTtd({aksi:'lihat'});TTD_PROFIL=j.data||'';TTD_PROFIL_USER=me;TTD_GURU[me]=!!j.ada;box.innerHTML=ttdProfilHtml(TTD_PROFIL)}
 catch(e){box.innerHTML='<div class="note" style="color:var(--rd)">'+esc(e.message||String(e))+'</div>'}
}
function ttdProfilHtml(data){return ttdEditorHtml(data,'profil',me,'')}
async function ttdHapusSaya(){
 if(!TTD_PROFIL)return;
 if(!await konfirmasi('Hapus tanda tangan Anda? Tanda tangan tidak akan tampil pada raport sampai diunggah kembali.',{judul:'Hapus tanda tangan',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{await apiTtd({aksi:'hapus'});TTD_PROFIL='';TTD_PROFIL_USER=me;TTD_GURU[me]=false;ttdProfilMuat(true);toast('Tanda tangan berhasil dihapus')});
}
async function ttdGuruMuatDev(force){
 if(role!=='Developer'||TTD_GURU_DEV_LOADING||(!force&&TTD_GURU_DEV_DONE))return;
 TTD_GURU_DEV_LOADING=true;
 try{const j=await apiTtd({aksi:'daftar_dev'});TTD_GURU={};(j.daftar||[]).forEach(x=>TTD_GURU[x.id]=!!x.ada);TTD_GURU_DEV_DONE=true;if(view==='developer'&&devTab==='guru')renderV()}
 catch(e){console.warn('Status tanda tangan Developer gagal dimuat',e)}finally{TTD_GURU_DEV_LOADING=false}
}
async function ttdGuruMuat(force){
 if(role==='Developer'&&!SEK)return ttdGuruMuatDev(force);
 if(!SEK||TTD_GURU_LOADING||(!force&&TTD_GURU_SEK===SEK))return;
 TTD_GURU_LOADING=true;
 try{const j=await apiTtd({aksi:'daftar'});TTD_GURU={};(j.daftar||[]).forEach(x=>TTD_GURU[x.id]=!!x.ada);TTD_GURU_SEK=SEK;
  if(view==='guru'){const b=$('#guruBody');if(b){const z=String(gQ||'').toLowerCase().trim(),shown=S.guru.filter(g=>!z||String(g.nama||'').toLowerCase().includes(z)||String(g.nip||'').toLowerCase().includes(z)||cocokWA((S.nomor||{})[g.id],z));const kl=adalahKepala(),dev=role==='Developer',kel=kl||dev,kunci=g=>(g.role==='kepala_sekolah'&&!dev);b.innerHTML=guruRows(shown,bolehHapusGuru(),kel,dev,kunci)||'<tr><td colspan="'+(gHapusMode&&bolehHapusGuru()?10:9)+'" class="mu">Guru tidak ditemukan.</td></tr>'}}
 }catch(e){console.warn('Status tanda tangan guru gagal dimuat',e)}finally{TTD_GURU_LOADING=false}
}
async function ttdGuruBuka(id,nama,langsung){
 if(!bolehKelolaTtdGuru())return toast('Anda tidak memiliki izin mengelola tanda tangan guru lain',false);
 const buka=async()=>{const j=await apiTtd({aksi:'ambil',id}),data=j.data||'';
  info('Tanda tangan · '+nama,ttdEditorHtml(data,'guru',id,nama));
  $('#md').classList.add('besar');
 };
 if(langsung)return buka();
 guard(buka);
}
async function ttdGuruHapus(id,nama){
 if(!await konfirmasi('Hapus tanda tangan '+nama+'?',{judul:'Hapus tanda tangan',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{await apiTtd({aksi:'hapus',id});TTD_GURU[id]=false;toast('Tanda tangan '+nama+' dihapus');closeM();await ttdGuruMuat(true)});
}
async function ttdPngAmbil(ids){
 const unik=[...new Set((ids||[]).filter(Boolean).map(String))];if(!unik.length||!SEK)return {};
 const out={};
 for(let i=0;i<unik.length;i+=6){
  const batch=unik.slice(i,i+6),j=await apiTtd({aksi:'ambil_banyak',ids:batch});
  await Promise.all(batch.map(async id=>{const data=j.tanda_tangan&&j.tanda_tangan[id];if(data){const im=await Rapor.ttdPng(data);if(im)out[id]=im.url}}));
 }
 return out;
}
