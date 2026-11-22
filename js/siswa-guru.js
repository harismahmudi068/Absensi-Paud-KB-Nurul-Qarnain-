/* ---------- siswa ---------- */
let ssel=new Set(),sk='',sNon=false;
function togNonaktif(){sNon=!sNon;ssel.clear();renderV()}
let sHapusMode=false,attQ='',kkQ='',loQ='',gQ='';
function bukaHapusSiswa(){sHapusMode=true;ssel.clear();renderV()}
function batalHapusSiswa(){sHapusMode=false;ssel.clear();renderV()}
V.siswa=()=>{
 const shown=S.siswa.filter(s=>(sNon?!s.aktif:sk&&(sk==='*'||s.kelas===sk))&&(s.nama.toLowerCase().includes(q.toLowerCase())||String(s.nisn||'').includes(q.trim())||cocokWA(s.wa,q)));
 const all=shown.length>0&&shown.every(s=>ssel.has(s.id));
 const aksi=sHapusMode
   ? `<button id="sHapusBtn" class="btn danger sm" ${ssel.size?'':'disabled'} onclick="hapusSiswaTerpilih()">🗑 Hapus terpilih (${ssel.size})</button><button class="btn soft sm" onclick="batalHapusSiswa()">✖ Batal</button>`
   : `<button class="btn danger sm" onclick="bukaHapusSiswa()">🗑 Hapus</button>`;
 const head=sHapusMode
   ? ['<input type="checkbox" '+(all?'checked':'')+' id="sCekAll" onchange="pilihSemuaSiswa(this.checked)">','No','Nama','NISN','Kelas','Tempat, Tgl Lahir','JK','Alamat','Tahun Masuk','WhatsApp Ortu','Status','Aksi']
   : ['No','Nama','NISN','Kelas','Tempat, Tgl Lahir','JK','Alamat','Tahun Masuk','WhatsApp Ortu','Status','Aksi'];
 return `<div class="panel"><div class="ph">👥 Data Siswa <span class="tb tbgrid" style="margin:0">${aksi}<button class="btn ${sNon?'success':'soft'} sm" onclick="togNonaktif()">${sNon?'✖ Tutup Nonaktif':'⏸ Nonaktif ('+S.siswa.filter(x=>!x.aktif).length+')'}</button><button class="btn soft sm" onclick="templat('siswa')">⬇ Template</button><button class="btn soft sm" onclick="pilihXlsx('siswa')">⬆ Impor XLSX</button><button class="btn success sm add" onclick="addSiswa()">+ Siswa</button></span></div><div class="pb"><div class="tb"><select class="select" onchange="sk=this.value;sNon=false;ssel.clear();renderV()">${kopt3(sk)}</select><input id="q" class="input grow search-smooth" placeholder="Cari nama, NISN, atau nomor WhatsApp..." value="${esc(q)}" oninput="cariSiswaInput(this)"></div><div class="tb"><button class="btn success sm dl" onclick="unduhSiswa('pdf',this,sk||'*')">⬇ PDF</button><button class="btn sm dl pdf" onclick="unduhSiswa('xlsx',this,sk||'*')">⬇ XLSX</button></div>${sNon?'<div class="note" style="border:2px solid #d99a27">Menampilkan <b>seluruh siswa nonaktif</b> dari semua kelas. Ketuk menu ✏️ pada siswa lalu pilih Aktifkan untuk mengaktifkannya kembali, atau pilih kelas untuk kembali ke daftar biasa.</div>':''}<div class="note">File XLSX dapat diedit kembali dan dipisahkan menjadi <b>sheet per kelas</b>. Pilih <b>Semua kelas</b> untuk seluruh data. Tombol ini tersedia untuk semua guru.</div>${tab(head,'<tbody id="sb"></tbody>').replace('<tbody><tbody id="sb"></tbody></tbody>','<tbody id="sb">'+siswaRows()+'</tbody>')}</div></div>`;
};
function siswaRows(){if(!sk&&!sNon)return '<tr><td colspan="12" class="mu" style="text-align:center">'+PKM+'</td></tr>';const hs=S.siswa.filter(s=>(sNon?!s.aktif:(sk==='*'||s.kelas===sk))&&(s.nama.toLowerCase().includes(q.toLowerCase())||String(s.nisn||'').includes(q.trim())||cocokWA(s.wa,q))).map((s,i)=>{
 const pilih=sHapusMode?`<td><input type="checkbox" class="cks" data-id="${s.id}" ${ssel.has(s.id)?'checked':''} onchange="pilihSiswa(${s.id},this.checked)"></td>`:'';
 return `<tr style="cursor:pointer" title="Ketuk kolom baris siswa untuk mengedit profil" onclick="if(!event.target.closest('button,input')&&!event.target.closest('td:nth-last-child(-n+3)'))ubahSiswa(${s.id})">${pilih}<td>${i+1}</td><td><b>${esc(s.nama)}</b><div class="mu">${esc(s.pan)}</div></td><td>${esc(s.nisn||'-')}</td><td>${esc(s.kelas)}</td><td>${esc(ttlPjg(s.tempat,s.tgl))||'-'}</td><td>${jkNama(s.jk)||'-'}</td><td>${esc(s.alamat||'-')}</td><td>${s.masuk||'-'}</td><td><span class="wa-siswa-cell">${nomorHtml(s.wa)}<button type="button" class="wa-edit-btn" onclick="editWaSiswa(${s.id})" title="Ubah nomor WhatsApp" aria-label="Ubah nomor WhatsApp siswa ${esc(s.nama)}">✏️</button></span></td><td>${s.aktif?'<span class="badge Hadir">Aktif</span>':`<button type="button" class="badge Belum" style="cursor:pointer;border:0;font:inherit" title="Ketuk untuk mengaktifkan" onclick="togSiswa(${s.id})">Nonaktif ▶ Aktifkan</button>`}</td><td><button class="btn sm soft aksi-btn" aria-label="Aksi" onclick="aksiSiswa(${s.id},this)">✏️</button></td></tr>`;
}).join('');return hs||(sNon?'<tr><td colspan="12" class="mu" style="text-align:center">Tidak ada siswa nonaktif.</td></tr>':'')}

function editWaSiswa(id){
 const s=siswaById(id);if(!s)return;
 info('Ubah nomor WhatsApp · '+s.nama,`
 <div class="fd"><label class="l" for="waSiswaInp">Nomor WhatsApp orang tua</label><input id="waSiswaInp" class="input" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" value="${esc(nomorLokal(s.wa))}" placeholder="08xxxxxxxxxx"><div class="mu" style="margin-top:5px">Gunakan nomor aktif WhatsApp. Nomor boleh diawali 08 atau 628.</div></div>
 <div class="tb" style="margin-top:12px"><button type="button" class="btn soft grow" onclick="closeM()">Batal</button><button type="button" class="btn success grow" onclick="simpanWaSiswa(${id})">💾 Simpan</button></div>`);
 setTimeout(()=>{const e=$('#waSiswaInp');if(e){e.focus();e.select();e.addEventListener('keydown',ev=>{if(ev.key==='Enter')simpanWaSiswa(id)})}},80);
}
function simpanWaSiswa(id){
 const s=siswaById(id),el=$('#waSiswaInp');if(!s||!el)return;
 const raw=el.value.trim(),wa=raw?normWA(raw):'';
 if(raw&&!/^628\d{8,12}$/.test(wa))return toast('Nomor WhatsApp tidak valid. Gunakan nomor Indonesia yang benar.',false);
 if(wa===normWA(s.wa))return closeM();
 guard(async()=>{
  await setWali(id,wa);
  await muatDasar();
  closeM();toast('Nomor WhatsApp '+s.nama+' berhasil diperbarui');renderV();
 });
}

function cariSiswaInput(el){q=el.value;const tb=$('#sb');if(tb)tb.innerHTML=siswaRows();}
/* centang cepat: hanya ubah kotak, hitungan, dan tombol yang terlihat (tanpa membangun ulang halaman) */
/* seluruh sel yang berisi kotak centang ikut menjadi area ketuk */
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('#v td,#v th');if(!c||e.target.tagName==='INPUT')return;const k=c.firstElementChild;if(!k||c.children.length!==1||k.tagName!=='INPUT'||k.type!=='checkbox'||k.disabled||c.textContent.trim())return;k.checked=!k.checked;k.dispatchEvent(new Event('change',{bubbles:true}))});
function cekHdr(id,tot,n){const a=document.getElementById(id);if(a){a.checked=tot>0&&n===tot;a.indeterminate=n>0&&n<tot}}
function cekBtn(id,n,t){const b=document.getElementById(id);if(b){b.disabled=!n;b.textContent=t+' ('+n+')'}}
function cekBaris(sel){return [...document.querySelectorAll(sel)]}
function siswaCekUI(){const r=cekBaris('#sb .cks');cekHdr('sCekAll',r.length,r.filter(x=>x.checked).length);cekBtn('sHapusBtn',ssel.size,'🗑 Hapus terpilih')}
function pilihSiswa(id,on){on?ssel.add(id):ssel.delete(id);siswaCekUI()}
function pilihSemuaSiswa(on){cekBaris('#sb .cks').forEach(x=>{x.checked=on;const i=+x.dataset.id;on?ssel.add(i):ssel.delete(i)});siswaCekUI()}
async function setWali(sid,wa){await dbq(db.from('siswa_wali').delete().eq('siswa_id',sid));if(!wa)return;const w=await dbq(db.from('wali').upsert({no_wa:wa},{onConflict:'no_wa'}).select().single());await dbq(db.from('siswa_wali').insert({siswa_id:sid,wali_id:w.id}))}
const kid=n=>(S.kelas.find(k=>k.nama.toLowerCase()===String(n||'').trim().toLowerCase())||{}).id||null;
function belumAdaKelas(){if(!kelola())return toast('Belum ada kelas. Minta Kepala Sekolah menambahkannya di menu Pengaturan',false);info('Belum ada kelas','<div style="text-align:center;padding:6px 4px"><div style="font-size:42px">🏫</div><p>Siswa harus dimasukkan ke dalam kelas. Tambahkan kelas terlebih dahulu.</p><button class="btn success" style="width:100%" onclick="closeM();addKelas()">+ Tambah Kelas</button><button class="btn soft" style="width:100%;margin-top:8px" onclick="lompatPengaturan(\'pnKelas\')">Buka Pengaturan Kelas</button></div>')}
function addSiswa(){if(!S.kelas.length)return belumAdaKelas();form('Tambah Siswa',[{k:'nama',l:'Nama lengkap'},{k:'pan',l:'Nama panggilan'},{k:'nisn',l:'NISN (opsional)',t:'tel'},{k:'kelas',l:'Kelas',o:S.kelas.map(k=>k.nama)},{k:'wa',l:'WhatsApp orang tua (08...)',t:'tel'},{k:'tempat',l:'Tempat lahir (opsional)'},{k:'tgl',l:'Tanggal lahir (opsional)',t:'date',ref:(+TODAY.slice(0,4)-4)+'-01-01'},{k:'jk',l:'Jenis kelamin',o:['-','Laki-laki','Perempuan']},{k:'alamat',l:'Alamat (opsional)'},{k:'masuk',l:'Tahun masuk',t:'year',v:TODAY.slice(0,4)}],async v=>{if(!v.nama||!v.pan)throw new Error('Nama dan panggilan wajib diisi');const nisn=normNISN(v.nisn);if(!validNISN(nisn))throw new Error('NISN harus tepat 10 digit atau dikosongkan');
 const dup=nisn?S.siswa.find(x=>x.nisn===nisn):null;if(dup)throw new Error('NISN sudah digunakan oleh '+dup.nama);
 const s=await dbq(db.from('siswa').insert({nama:v.nama,nama_panggilan:v.pan,nisn:nisn||null,kelas_id:kid(v.kelas),...siswaExtra(v)}).select().single());await setWali(s.id,normWA(v.wa));await muatDasar();toast('Siswa tersimpan');renderV()})}
function ubahSiswa(id){const s=siswaById(id);form('Ubah Siswa',[{k:'nama',l:'Nama lengkap',v:s.nama},{k:'pan',l:'Nama panggilan',v:s.pan},{k:'nisn',l:'NISN (opsional)',t:'tel',v:s.nisn},{k:'kelas',l:'Kelas (hanya dibaca, pindah kelas lewat menu Kelola Siswa)',ro:1,v:s.kelas||'-'},{k:'wa',l:'WhatsApp orang tua',t:'tel',v:s.wa},{k:'tempat',l:'Tempat lahir (opsional)',v:s.tempat},{k:'tgl',l:'Tanggal lahir (opsional)',t:'date',v:s.tgl,ref:(+TODAY.slice(0,4)-4)+'-01-01'},{k:'jk',l:'Jenis kelamin',o:['-','Laki-laki','Perempuan'],v:jkNama(s.jk)||'-'},{k:'alamat',l:'Alamat (opsional)',v:s.alamat},{k:'masuk',l:'Tahun masuk',t:'year',v:String(s.masuk||'')}],async v=>{if(!v.nama||!v.pan)throw new Error('Nama dan panggilan wajib diisi');const nisn=normNISN(v.nisn);if(!validNISN(nisn))throw new Error('NISN harus tepat 10 digit atau dikosongkan');
 const dup=nisn?S.siswa.find(x=>x.id!==id&&x.nisn===nisn):null;if(dup)throw new Error('NISN sudah digunakan oleh '+dup.nama);
 await dbq(db.from('siswa').update({nama:v.nama,nama_panggilan:v.pan,nisn:nisn||null,...siswaExtra(v)}).eq('id',id));if(normWA(v.wa)!==s.wa)await setWali(id,normWA(v.wa));await muatDasar();toast('Data siswa diperbarui');renderV()});
 $('#mbd').insertAdjacentHTML('afterbegin',fotoBlok(s));fotoSiap(s).then(()=>fotoBlokUlang(s))}
function togSiswa(id){guard(async()=>{const s=siswaById(id);await dbq(db.from('siswa').update({aktif:!s.aktif}).eq('id',id));s.aktif=!s.aktif;toast(s.nama+(s.aktif?' diaktifkan':' dinonaktifkan'));renderV()})}
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
let gsel=new Set();
let gHapusMode=false;
function bolehHapusGuru(){return adalahKepala()||role==='Developer'}
function bukaHapusGuru(){if(!bolehHapusGuru())return toast('Hanya Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, Operator, atau Developer yang dapat menghapus akun guru',false);gHapusMode=true;gsel.clear();renderV()}
function batalHapusGuru(){gHapusMode=false;gsel.clear();renderV()}
function guruCekUI(){const r=cekBaris('#v .ckg');cekHdr('gCekAll',r.length,r.filter(x=>x.checked).length);cekBtn('gHapusBtn',gsel.size,'🗑 Keluarkan terpilih')}
function pilihGuru(id,on){if(!bolehHapusGuru())return;on?gsel.add(id):gsel.delete(id);guruCekUI()}
function pilihSemuaGuru(on){if(!bolehHapusGuru())return;cekBaris('#v .ckg').forEach(x=>{x.checked=on;on?gsel.add(x.dataset.id):gsel.delete(x.dataset.id)});guruCekUI()}
async function hapusGuruTerpilih(){
 if(!bolehHapusGuru())return toast('Hanya Kepala Sekolah, Wakil Kepala Sekolah, Operator, atau Developer yang dapat menghapus akun guru',false);
 const ids=[...gsel].filter(id=>id!==me);
 if(!ids.length)return;
 const nama=ids.map(id=>S.guru.find(g=>g.id===id)?.nama).filter(Boolean);
 if(!await konfirmasi('Keluarkan '+ids.length+' guru terpilih dari sekolah ini?\n\n'+nama.join('\n')+'\n\nAkun tetap ada bila guru juga mengajar di sekolah lain.',{judul:'Keluarkan guru terpilih',ya:'Keluarkan',bahaya:1}))return;
 guard(async()=>{
   const r=await apiGuru({aksi:'hapus_batch',ids});
   const ok=new Set(r.dihapus||[]),gl=r.gagal||[];
   S.guru=S.guru.filter(g=>!ok.has(g.id));
   gsel.clear();gHapusMode=false;
   toast(ok.size+' guru dikeluarkan dari sekolah'+(gl.length?', '+gl.length+' gagal: '+gl[0].error:''),!gl.length);renderV();
 })
}
function guruRows(shown,bh,kel,dev,kunci){
 return shown.map((g,i)=>{
  const mine=g.id===me;
  const pilih=gHapusMode&&bh&&!mine&&!kunci(g)?`<td><input type="checkbox" class="ckg" data-id="${g.id}" ${gsel.has(g.id)?'checked':''} onchange="pilihGuru('${g.id}',this.checked)"></td>`:(gHapusMode&&bh?'<td></td>':'');
  const wa=(S.nomor||{})[g.id],adaTtd=!!TTD_GURU[g.id];
  const kolTtd='<td><span class="badge '+(adaTtd?'Hadir':'Belum')+'">'+(adaTtd?'Tersedia':'Belum ada')+'</span>'+(bolehKelolaTtdGuru()&&!mine?'<button class="btn sm soft" onclick="ttdGuruBuka(\''+g.id+'\',\''+esc(g.nama)+'\')">'+(adaTtd?'Kelola':'Tambah')+'</button>':'')+'</td>';
  return `<tr>${pilih}<td>${i+1}</td><td><b>${esc(g.nama)}</b>${mine?' <span class="badge Hadir">Anda</span>':''}</td><td>${esc(g.nip||'')}</td><td>${wa?nomorHtml(wa):(mine?'<span class="mu">Belum diisi</span>':'<span class="mu">-</span>')}</td><td>${esc(g.username)}</td><td>${kel&&!mine&&!kunci(g)?`<select class="select" onchange="setGuruRole('${g.id}',this.value)">${['kepala_sekolah','wakil_kepala','pengelola','operator','guru'].map(r=>`<option value="${r}" ${r===g.role?'selected':''}>${LBL[r]}</option>`).join('')}</select>`:esc(LBL[g.role]||g.role)}</td><td>${g.aktif?'<span class="badge Hadir">Aktif</span>':'<span class="badge Belum">Nonaktif</span>'}</td>${kolTtd}<td>${mine?`<button class="btn sm soft" onclick="go('profil')">👤 Buka Profil Saya</button>`:'<span class="mu">-</span>'}${kel&&!mine&&!kunci(g)?`<div style="display:flex;flex-direction:column;align-items:stretch;gap:6px;min-width:108px"><button type="button" class="btn sm danger" style="width:100%;justify-content:center;white-space:nowrap" onclick="hapusGuru('${g.id}')">Keluarkan</button><button type="button" class="btn sm ${g.aktif?'danger':'success'}" style="width:100%;justify-content:center;white-space:nowrap" onclick="togGuru('${g.id}')">${g.aktif?'Nonaktifkan':'Aktifkan'}</button></div>`:''}</td></tr>`
 }).join('');
}
function cariGuruInput(el){
 gQ=el.value;
 const body=$('#guruBody');
 if(body){
  const kl=adalahKepala(),dev=role==='Developer',kel=kl||dev;
  const bh=bolehHapusGuru();
  const kunci=g=>(g.role==='kepala_sekolah'&&!dev);
  const z=String(gQ||'').toLowerCase().trim();
  const shown=S.guru.filter(g=>!z||String(g.nama||'').toLowerCase().includes(z)||String(g.nip||'').toLowerCase().includes(z)||cocokWA((S.nomor||{})[g.id],z));
  body.innerHTML=guruRows(shown,bh,kel,dev,kunci)||`<tr><td colspan="${gHapusMode&&bh?10:9}" class="mu">Guru tidak ditemukan.</td></tr>`;
 }
}
V.guru=()=>{
 setTimeout(()=>ttdGuruMuat(),0);
 const kl=adalahKepala(),dev=role==='Developer',kel=kl||dev;
 const bh=bolehHapusGuru();
 const kunci=g=>(g.role==='kepala_sekolah'&&!dev);
 const z=String(gQ||'').toLowerCase().trim();
 const shown=S.guru.filter(g=>!z||String(g.nama||'').toLowerCase().includes(z)||String(g.nip||'').toLowerCase().includes(z)||cocokWA((S.nomor||{})[g.id],z));
 const selectable=shown.filter(g=>g.id!==me&&!kunci(g));
 const all=selectable.length>0&&selectable.every(g=>gsel.has(g.id));
 const aksi=bh
   ? (gHapusMode
      ? `<button id="gHapusBtn" class="btn danger sm" ${gsel.size?'':'disabled'} onclick="hapusGuruTerpilih()">🗑 Keluarkan terpilih (${gsel.size})</button><button class="btn soft sm" onclick="batalHapusGuru()">✖ Batal</button>`
      : `<button class="btn danger sm" onclick="bukaHapusGuru()">🗑 Keluarkan Guru</button>`)
   : '';
 const head=gHapusMode&&bh
   ? ['<input type="checkbox" '+(all?'checked':'')+' id="gCekAll" onchange="pilihSemuaGuru(this.checked)">','No','Nama','NIP','WhatsApp','Username','Peran','Aktif','Tanda tangan','Aksi']
   : ['No','Nama','NIP','WhatsApp','Username','Peran','Aktif','Tanda tangan','Aksi'];
 const emptyCol=gHapusMode&&bh?10:9;
 return `<div class="panel"><div class="ph">👨‍🏫 Data Guru ${kel?`<span class="tb tbgrid" style="margin:0">${aksi}<button class="btn soft sm" onclick="templat('guru')">⬇ Template</button><button class="btn soft sm" onclick="pilihXlsx('guru')">⬆ Impor XLSX</button><button class="btn success sm add" onclick="addGuru()">+ Guru</button></span>`:''}</div><div class="pb"><div class="tb"><input id="guruCari" class="input grow search-smooth" placeholder="Cari nama, NIP, atau nomor WhatsApp guru..." value="${esc(gQ)}" oninput="cariGuruInput(this)"></div><div class="note">${kel?'Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, Operator, atau Developer dapat menambah guru, mengubah peran, dan mengaktifkan atau menonaktifkan guru di sekolah ini. Menambah atau mengimpor guru meminta kode yang dikirim ke WhatsApp Anda sebagai bukti kepemilikan. Mengganti Kepala Sekolah: pilih peran Kepala Sekolah pada guru yang dituju, maka Kepala Sekolah lama otomatis menjadi Guru. Tombol Keluarkan hanya mengeluarkan guru dari sekolah ini. Username, kata sandi, nomor WhatsApp, dan passkey diubah oleh pemilik akunnya sendiri lewat menu Profil Saya.':'Profil, kata sandi, nomor WhatsApp, dan passkey Anda diubah lewat menu Profil Saya. Nomor WhatsApp guru lain tidak ditampilkan.'}</div><div class="tw"><table><thead><tr>${head.map(x=>`<th>${x}</th>`).join('')}</tr></thead><tbody id="guruBody">${guruRows(shown,bh,kel,dev,kunci)||`<tr><td colspan="${emptyCol}" class="mu">Guru tidak ditemukan.</td></tr>`}</tbody></table></div></div></div>`;
};
async function apiGuru(body){const {data:{session}}=await db.auth.getSession();if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');const r=await fetch('/api/guru',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,...body})});const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===404)throw new Error('API /api/guru tidak ditemukan (404). Pastikan file api/guru.js sudah di-deploy pada project yang sama dengan Index.');throw new Error(j.error||j.message||('Gagal ('+r.status+')'))}return j}
function editGuru(id){if(MB())return toast('Tidak tersedia di mode bantuan',false);const g=S.guru.find(x=>x.id===id);if(!g||id!==me)return toast('Anda hanya bisa mengubah akun sendiri',false);
 setTimeout(()=>pasangPkForm('lama'),0);
 form('Ubah profil saya',[{k:'nama',l:'Nama',v:g.nama},{k:'nip',l:'NIP (opsional)',v:g.nip||''},{k:'user',l:'Username',v:g.username},{k:'sandi',l:'Kata sandi baru (kosongkan bila tidak diganti)',t:'password'},{k:'lama',l:'Kata sandi saat ini (wajib bila mengganti username atau kata sandi)',t:'password'}],async v=>{
  const user=(v.user||'').trim().toLowerCase();
  if(!v.nama||!user)throw new Error('Nama dan username wajib diisi');
  if(v.sandi&&v.sandi.length<6)throw new Error('Kata sandi minimal 6 karakter');
  if(!/^[a-z0-9._-]{3,20}$/.test(user))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
  const ubahAkun=user!==g.username||!!v.sandi;
  if(ubahAkun&&!v.lama&&!pkFresh())throw new Error('Isi kata sandi saat ini atau verifikasi dengan passkey untuk mengganti username atau kata sandi');
  if(ubahAkun)await apiGuru({aksi:'akun_sendiri',username:user,sandi_baru:v.sandi||'',...bodySandi(v.lama)});
  await dbq(db.from('profil').update({nama:v.nama,nip:(v.nip||'').trim()||null}).eq('id',id));
  meNama=v.nama;PROFIL.nama=v.nama;await muatProfil();toast(ubahAkun?'Profil dan akun diperbarui':'Profil diperbarui');renderAll()})}
function fmtWA(n){const d=String(n||'').replace(/\D/g,'');return d.startsWith('62')?'0'+d.slice(2):d}
/* Nomor tampil: 08xx-xxxx-xxxx (pemisah tiap 4 angka). Penyimpanan tetap angka polos. */
function nomorLokal(n){let d=String(n||'').replace(/\D/g,'');if(!d)return'';if(d.startsWith('62'))d='0'+d.slice(2);else if(d[0]==='8')d='0'+d;return d}
function fmtNomor(n){return nomorLokal(n).replace(/(\d{4})(?=\d)/g,'$1-')}
const IKON_SALIN='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
function nomorHtml(n){const t=fmtNomor(n);if(!t)return'';return'<span class="nmr">'+esc(t)+'<button type="button" class="salin" onclick="salinNomor(this)" data-n="'+esc(nomorLokal(n))+'" title="Salin nomor" aria-label="Salin nomor">'+IKON_SALIN+'</button></span>'}
async function salinNomor(b){const v=b.getAttribute('data-n')||'';let ok=false;
 try{await navigator.clipboard.writeText(v);ok=true}catch(e){try{const a=document.createElement('textarea');a.value=v;a.style.cssText='position:fixed;opacity:0;top:0;left:0';document.body.appendChild(a);a.focus();a.select();ok=document.execCommand('copy');a.remove()}catch(e2){ok=false}}
 toast(ok?'Nomor '+v+' disalin':'Nomor tidak bisa disalin',ok)}
function mintaIzin(lanjut){if(MB())return lanjut(null);
 if(role==='Developer')return lanjut(null);
 if(izinKelola&&Date.now()<izinExp)return lanjut(izinKelola);
 if(otpLanjut('izin_kelola',null,[lanjut]))return;
 guard(async()=>{const j=await apiGuru({aksi:'otp_kelola_kirim'});toast('Kode dikirim ke WhatsApp '+(j.nomor||'Anda'));
  const bukaV=lj=>{form('Verifikasi pemilik akun',[{k:'kode',l:'Masukkan kode 6 angka yang dikirim ke WhatsApp Anda ('+esc(j.nomor||'')+')',ver:kd=>apiGuru({aksi:'otp_cek',jenis:'kelola_guru',kode:kd})}],async v=>{
    const k=await apiGuru({aksi:'otp_kelola_verifikasi',kode:v.kode});izinKelola=k.izin;izinExp=Date.now()+14*60000;otpHapus('izin_kelola');setTimeout(()=>lj(izinKelola),150)});
   $('#ms').textContent='Verifikasi'};otpSimpan('izin_kelola',{},bukaV,()=>mintaIzin(lanjut));setTimeout(()=>bukaV(lanjut),150)})}
function formGuruBaru(wa,izin){const opsi=['Guru','Operator','Pengelola/Pengasuh','Wakil Kepala Sekolah','Kepala Sekolah'];
 form('Tambah guru baru',[{k:'nama',l:'Nama guru'},{k:'nip',l:'NIP (opsional)'},{k:'user',l:'Username (huruf kecil, tanpa spasi)'},{k:'sandi',l:'Kata sandi awal (minimal 6 karakter)',t:'password'},{k:'role',l:'Peran',o:opsi}],async v=>{
  const jk=KEYR[v.role]==='kepala_sekolah';
  if(jk&&!await konfirmasi('Guru baru ini akan menjadi Kepala Sekolah dan Kepala Sekolah saat ini otomatis menjadi Guru. Lanjutkan?',{judul:'Ganti Kepala Sekolah',ya:'Lanjutkan',ikon:'👑'}))return;
  await apiGuru({aksi:'tambah',nama:v.nama,nip:v.nip,username:v.user,sandi:v.sandi,role:KEYR[v.role]||'guru',no_wa:wa,izin});
  if(jk&&adalahKepala()){toast('Guru baru menjadi Kepala Sekolah. Peran Anda menjadi Guru');await mulai();return}
  await muatProfil();toast('Guru ditambahkan. Minta guru mengganti kata sandi awalnya');renderV()})}
function addGuru(){if(!adalahKepala()&&role!=='Developer')return toast('Hanya Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, Operator, atau Developer yang dapat menambah guru',false);
 mintaIzin(izin=>form('Tambah guru',[{k:'wa',l:'Nomor WhatsApp guru (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.wa);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');
  const c=await apiGuru({aksi:'cek_nomor',no_wa:wa});
  if(c.sudah_di_sekolah)throw new Error('Nomor ini sudah terdaftar sebagai '+c.nama+' di sekolah ini');
  if(c.ada){if(!await konfirmasi('Nomor ini sudah punya akun atas nama '+c.nama+'. Tautkan ke sekolah ini?',{judul:'Tautkan guru',ya:'Tautkan'}))return;
   await apiGuru({aksi:'tautkan',no_wa:wa,izin});await muatProfil();toast(c.nama+' ditautkan ke sekolah ini');renderV();return}
  setTimeout(()=>formGuruBaru(wa,izin),150)}))}
function gantiNomor(op){if(MB())return toast('Tidak tersedia di mode bantuan',false);
 const tetap=op&&op.wa?normWA(op.wa):'';
 if(otpLanjut('ganti_nomor',m=>!tetap||m.wa===tetap))return;
 setTimeout(()=>pasangPkForm('sandi'),0);
 form('Nomor WhatsApp saya',[tetap?{k:'wa',l:'Nomor WhatsApp baru (dari Pengaturan)',ro:1,v:fmtWA(tetap)}:{k:'wa',l:'Nomor WhatsApp baru (contoh 08123456789)'},{k:'sandi',l:'Kata sandi saat ini',t:'password'}],async v=>{
  const wa=normWA(v.wa);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');if(!v.sandi&&!pkFresh())throw new Error('Isi kata sandi saat ini atau verifikasi dengan passkey');
  const j=await apiGuru({aksi:'nomor_otp_kirim',no_wa_baru:wa,...bodySandi(v.sandi)});
  const bukaV=()=>{const f=[{k:'kb',l:'Kode yang dikirim ke nomor BARU ('+fmtWA(wa)+')',ver:kd=>apiGuru({aksi:'otp_cek',jenis:'ganti_baru',no_wa_baru:wa,kode:kd})}];if(j.perlu_kode_lama)f.push({k:'kl',l:'Kode yang dikirim ke nomor LAMA',ver:kd=>apiGuru({aksi:'otp_cek',jenis:'ganti_lama',kode:kd})});
   form('Verifikasi nomor WhatsApp',f,async z=>{await apiGuru({aksi:'nomor_simpan',no_wa_baru:wa,kode_baru:z.kb,kode_lama:z.kl||''});otpHapus('ganti_nomor');await muatProfil();
    let okP=true;if(role==='Kepala Sekolah'){try{await apiPengaturan({aksi:'simpan',nomor_kepala:fmtWA(wa)});await muatRahasia()}catch(e){okP=false;console.warn(e)}}
    if(okP)toast(role==='Kepala Sekolah'?'Nomor WhatsApp diperbarui di Profil dan Pengaturan':'Nomor WhatsApp diperbarui');else toast('Nomor di Profil sudah diperbarui, tetapi di Pengaturan belum. Buka Pengaturan lalu simpan ulang.',false);renderV()});
   $('#ms').textContent='Verifikasi'};otpSimpan('ganti_nomor',{wa},bukaV,()=>gantiNomor(op));setTimeout(bukaV,150)});$('#ms').textContent='Kirim kode'}
function setGuruRole(id,r){if(!adalahKepala()&&role!=='Developer')return toast('Hanya Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, Operator, atau Developer yang dapat mengubah peran guru',false);
 const g=S.guru.find(x=>x.id===id)||{};
 const jalan=async()=>{try{await apiGuru({aksi:'ubah_role',id,role:r});
   if(r==='kepala_sekolah'&&adalahKepala()){toast((g.nama||'Guru')+' sekarang Kepala Sekolah. Peran Anda menjadi Guru');await mulai();return}
   await muatProfil();toast('Peran diubah menjadi '+LBL[r]);renderAll()}catch(e){await muatProfil();renderV();throw e}};
 if(r==='kepala_sekolah'){const lama=S.guru.find(x=>x.role==='kepala_sekolah'&&x.id!==id);
  konfirmasi('Jadikan '+(g.nama||'guru ini')+' Kepala Sekolah?'+(lama?'\n\nKepala Sekolah saat ini ('+lama.nama+') otomatis menjadi Guru.':''),{judul:'Ganti Kepala Sekolah',ya:'Ya, ganti',ikon:'👑'}).then(ok=>{if(!ok){renderV();return}guard(jalan)});return}
 guard(jalan)}
function togGuru(id){if(!adalahKepala()&&role!=='Developer')return toast('Hanya Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, Operator, atau Developer yang dapat mengaktifkan/nonaktifkan guru',false);if(id===me)return toast('Tidak bisa menonaktifkan akun sendiri',false);const g=S.guru.find(x=>x.id===id),n=!g.aktif;guard(async()=>{await apiGuru({aksi:'aktif',id,aktif:n});await muatProfil();toast(g.nama+(n?' diaktifkan':' dinonaktifkan'));renderV()})}
async function hapusGuru(id){if(!bolehHapusGuru())return toast('Hanya Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, Operator, atau Developer yang dapat mengeluarkan guru',false);const g=S.guru.find(x=>x.id===id);if(!g||g.id===me)return toast('Akun guru tidak dapat dikeluarkan',false);if(!await konfirmasi('Keluarkan '+g.nama+' dari sekolah ini? Akun tetap ada bila guru juga mengajar di sekolah lain. Bila hanya sementara tidak mengajar, lebih baik Nonaktifkan.',{judul:'Keluarkan guru',ya:'Keluarkan',bahaya:1}))return;guard(async()=>{await apiGuru({aksi:'hapus',id});S.guru=S.guru.filter(g=>g.id!==id);toast('Guru dikeluarkan dari sekolah');renderV()})}
/* ---------- panel Developer: guru di semua sekolah ---------- */
let devHanyaNonaktif=false;
let devPilih=new Set();
async function muatDevGuru(){S.devGuru=await dbq(db.rpc('developer_guru'))}
function panelDevGuru(){setTimeout(()=>ttdGuruMuatDev(),0);const d=S.devGuru;
 if(!d)return '<div class="panel"><div class="ph">👥 Guru di semua sekolah</div><div class="pb"><div class="note">⏳ Memuat data guru...</div></div></div>';
 const baris=d.filter(g=>g.role!=='developer').filter(g=>!devHanyaNonaktif||!(g.keanggotaan||[]).some(k=>k.aktif));
 const idsTA=idTidakAktifDev().map(g=>g.id),nTidakAktif=idsTA.length;devPilih=new Set([...devPilih].filter(id=>idsTA.includes(id)));
 return `<div class="panel"><div class="ph"><span>👥 Guru di semua sekolah</span><label class="mu" style="display:flex;align-items:center;gap:8px;width:100%;margin:0;font-weight:400;font-size:13px;line-height:1.3;cursor:pointer"><input type="checkbox" style="margin:0;flex:0 0 auto;width:20px;height:20px;accent-color:#1fa95b" ${devHanyaNonaktif?'checked':''} onchange="devHanyaNonaktif=this.checked;renderV()"><span>Hanya yang tidak aktif di sekolah mana pun</span></label></div><div class="pb"><div class="note">Daftar guru beserta sekolah tempat mereka terdaftar. Akun yang tidak aktif di sekolah mana pun dapat dihapus permanen.</div>${nTidakAktif?`<div class="tb"><button class="btn soft sm" onclick="devPilihSemua(true)">☑ Pilih semua tidak aktif (${nTidakAktif})</button><button class="btn soft sm" onclick="devPilihSemua(false)">Kosongkan pilihan</button><button id="btnHapusPilih" class="btn danger sm" ${devPilih.size?'':'disabled'} onclick="hapusTerpilih()">🗑 Hapus terpilih (${devPilih.size})</button></div>`:''}${baris.length?tab([nTidakAktif?'<input type="checkbox" id="devCekAll" style="width:20px;height:20px;accent-color:#1fa95b" title="Pilih semua tidak aktif" '+(devPilih.size&&devPilih.size===nTidakAktif?'checked':'')+' onchange="devPilihSemua(this.checked)">':'','No','Nama','NIP','Username','WhatsApp' ,'Sekolah','Tanda tangan','Aksi'],baris.map((g,i)=>{const ks=g.keanggotaan||[];const aktifDi=ks.filter(k=>k.aktif).length;return `<tr><td>${(!aktifDi&&g.id!==me)?`<input type="checkbox" style="width:20px;height:20px;accent-color:#1fa95b" ${devPilih.has(g.id)?'checked':''} onchange="devTogPilih('${g.id}',this.checked)">`:''}</td><td>${i+1}</td><td><b>${esc(g.nama)}</b></td><td>${esc(g.nip||'-')}</td><td>${esc(g.username)}</td><td><span style="white-space:nowrap">${nomorHtml(g.no_wa)||'-'}<button type="button" onclick="devUbahNomor('${g.id}')" title="Ubah nomor WhatsApp" aria-label="Ubah nomor WhatsApp" style="background:none;border:0;box-shadow:none;padding:2px 4px 2px 8px;margin:0;cursor:pointer;font-size:15px;line-height:1;vertical-align:middle">✏️</button></span></td><td>${ks.length?ks.map(k=>`<div>${esc(k.sekolah)} <span class="badge ${k.aktif?'Hadir':'Belum'}">${k.aktif?'Aktif':'Nonaktif'}</span> <span class="mu">${esc(LBL[k.role]||k.role)}</span>${k.aktif&&g.aktif&&k.status_sekolah==='aktif'?` <button class="btn sm soft" onclick="masukSebagai('${g.id}',${k.sekolah_id})">🔑 Masuk</button>`:''}</div>`).join(''):'<span class="mu">Tidak terdaftar di sekolah mana pun</span>'}</td><td><span class="badge ${TTD_GURU[g.id]?'Hadir':'Belum'}">${TTD_GURU[g.id]?'Tersedia':'Belum ada'}</span><button class="btn sm soft" onclick="ttdGuruBuka('${g.id}','${esc(g.nama)}')">${TTD_GURU[g.id]?'Kelola':'Tambah'}</button></td><td>${aktifDi?'<span class="mu">Masih aktif</span>':`<button class="btn sm danger" onclick="hapusAkunPermanen('${g.id}')">🗑 Hapus permanen</button>`}</td></tr>`}).join('')):'<div class="mu" style="padding:10px 0">Tidak ada guru yang cocok.</div>'}</div></div>`}
function idTidakAktifDev(){return (S.devGuru||[]).filter(g=>g.role!=='developer'&&g.id!==me&&!(g.keanggotaan||[]).some(k=>k.aktif))}
function devUpdPilih(){const n=devPilih.size,tot=idTidakAktifDev().length,b=document.getElementById('btnHapusPilih'),a=document.getElementById('devCekAll');
 if(b){b.disabled=!n;b.textContent='🗑 Hapus terpilih ('+n+')'}
 if(a){a.checked=n>0&&n===tot;a.indeterminate=n>0&&n<tot}}
function devTogPilih(id,on){if(on)devPilih.add(id);else devPilih.delete(id);devUpdPilih()}
function devPilihSemua(on){devPilih=on?new Set(idTidakAktifDev().map(g=>g.id)):new Set();
 document.querySelectorAll('input[onchange^="devTogPilih"]').forEach(c=>c.checked=on);devUpdPilih()}
async function hapusTerpilih(){
 const d=idTidakAktifDev().filter(g=>devPilih.has(g.id));
 if(!d.length)return toast('Centang dulu guru yang ingin dihapus',false);
 const nm=d.slice(0,10).map(g=>'- '+g.nama+' ('+g.username+')').join('\n')+(d.length>10?'\n... dan '+(d.length-10)+' lainnya':'');
 if(!await konfirmasi('Hapus PERMANEN '+d.length+' akun guru yang Anda centang?\n\n'+nm+'\n\nAkun, profil, dan keanggotaannya dihapus dan tidak bisa dikembalikan.',{judul:'Hapus massal akun guru',ya:'Hapus '+d.length+' akun',bahaya:1}))return;
 const UKURAN=50,ids=d.map(g=>g.id),nama=Object.fromEntries(d.map(g=>[g.id,g.nama])),gagal=[];let ok=0,selesai=0;
 await guard(async()=>{
  for(let i=0;i<ids.length;i+=UKURAN){
   const bagian=ids.slice(i,i+UKURAN);
   $('#ldt').textContent='Menghapus '+Math.min(i+UKURAN,ids.length)+' dari '+ids.length+' akun...';
   try{const r=await apiGuru({aksi:'hapus_akun_batch',ids:bagian});ok+=(r.dihapus||[]).length;(r.gagal||[]).forEach(x=>gagal.push((nama[x.id]||x.id)+': '+x.error))}
   catch(e){bagian.forEach(id=>gagal.push((nama[id]||id)+': '+((e&&e.message)||e)))}
   selesai+=bagian.length}
  devPilih=new Set();
  try{await muatDev()}catch(e){peringatan('Data developer gagal dimuat ulang',e)}
  renderV()});
 if(gagal.length)await konfirmasi(ok+' akun dihapus, '+gagal.length+' gagal:\n\n'+gagal.slice(0,10).join('\n')+(gagal.length>10?'\n... dan '+(gagal.length-10)+' lainnya':''),{judul:'Hapus massal selesai sebagian',ikon:'⚠️',ya:'Tutup'});
 else toast(ok+' akun guru dihapus permanen')}
async function hapusAkunPermanen(id){const g=(S.devGuru||[]).find(x=>x.id===id);if(!g)return;
 if(!await konfirmasi('Hapus akun '+g.nama+' ('+g.username+') secara permanen? Akun, profil, dan keanggotaannya dihapus dan tidak bisa dikembalikan.',{judul:'Hapus akun permanen',ya:'Hapus permanen',bahaya:1}))return;
 guard(async()=>{await apiGuru({aksi:'hapus_akun',id});await muatDev();toast('Akun dihapus permanen');renderV()})}
