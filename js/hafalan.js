/* --- Hafalan --- */
let hfMd=0,hfPil=new Set(),hfTab='setor',hfK='',hfDK='',hfSet=[],hfSetK='',hfSiswa=0,hfTgl=TODAY;
const hfCakL={wajib:'Wajib semua kelas',kelas:'Per kelas'},hfCakV={'Wajib semua kelas':'wajib','Per kelas':'kelas'};
const hfJ=id=>S.hfJenis.find(j=>j.id===id)||{};
async function muatHafalan(){const [j,i]=await Promise.all([dbq(db.from('hafalan_jenis').select('*').order('urutan').order('id')),pgAll(()=>db.from('hafalan_item').select('*').order('urutan').order('id'))]);S.hfJenis=j||[];S.hfItem=i||[];hfSetK='';hfSet=[];if(hfK&&(hfK==='*'||S.kelas.some(k=>k.nama===hfK)))await hfMuatSetoran()}
async function hfMuatSetoran(){const sem=hfK==='*',kl=S.kelas.find(k=>k.nama===hfK);hfSet=[];hfSetK=hfK;if(!kl&&!sem)return;const ids=S.siswa.filter(s=>s.aktif&&(sem||s.kelas_id===kl.id)).map(s=>s.id);if(!ids.length)return;
 hfSet=await pgAll(()=>db.from('hafalan_setoran').select('id,siswa_id,hafalan_id,hasil,tanggal,catatan,nama_pencatat').in('siswa_id',ids).order('id'))}
function hfTarget(kid){return S.hfItem.filter(i=>i.kelas_id==null||i.kelas_id===kid).sort((a,b)=>((hfJ(a.jenis_id).urutan||0)-(hfJ(b.jenis_id).urutan||0))||a.jenis_id-b.jenis_id||((a.urutan||0)-(b.urutan||0))||a.id-b.id)}
function hfStat(sid,tgt){const m=new Map(hfSet.filter(x=>x.siswa_id===sid&&x.hafalan_id!=null).map(x=>[x.hafalan_id,x]));let l=0,u=0;tgt.forEach(i=>{const x=m.get(i.id);if(x){if(x.hasil==='lancar')l++;else u++}});return{m,l,u,t:tgt.length}}
V.hafalan=()=>{if(!S.hfJenis)return LOADING_FITUR('hafalan');
 const hal=[['setor','✍️ Setor'],['daftar','📋 Daftar hafalan'],['rekap','📊 Rekap'],['jenis','🏷️ Jenis']];
 return `<div class="panel"><div class="ph">📖 Hafalan</div><div class="pb"><div class="utabs">${hal.map(x=>`<button class="utab${hfTab===x[0]?' on':''}" onclick="hfHal('${x[0]}')">${x[1]}</button>`).join('')}</div>${hfTab==='setor'?hfSetorHTML():hfTab==='daftar'?hfDaftarHTML():hfTab==='rekap'?hfRekapHTML():hfJenisHTML()}</div></div>`};
function hfHal(p){hfTab=p;hfMd=0;hfPil=new Set();if(p==='setor'&&hfK==='*'){hfK='';hfSetK='';hfSet=[]}renderV();if((p==='setor'||p==='rekap')&&hfK&&hfSetK!==hfK)hfMuatSetoran().then(()=>renderV()).catch(e=>toast(dbMsg(e),false))}
function hfPilihK(v){hfK=v;hfSetK='';hfSet=[];renderV();if(v)hfMuatSetoran().then(()=>renderV()).catch(e=>toast(dbMsg(e),false))}
const hfPilihDK=v=>{hfDK=v;hfMd=0;hfPil=new Set();renderV()};
const hfPilKelas=sem=>`<div class="tb tab-choice">${cpick('hfKelasPick','kelas',hfK,(sem?[{value:'*',label:'Semua kelas'}]:[]).concat(pkKelasOpt()),'hfPilihK','Pilih kelas')}</div>`;
function hfSetorHTML(){const pil=hfPilKelas();if(!hfK)return pil+PKH;const kl=S.kelas.find(k=>k.nama===hfK);if(!kl)return pil+PKH;
 if(hfSetK!==hfK)return pil+'<div class="note">⏳ Memuat setoran...</div>';
 const tgt=hfTarget(kl.id),sis=S.siswa.filter(s=>s.aktif&&s.kelas_id===kl.id);
 if(!tgt.length)return pil+'<div class="note">Belum ada daftar hafalan untuk kelas ini. Isi di tab Daftar hafalan.</div>';
 return pil+tab(['Nama','Lancar','Mengulang','Aksi'],sis.map(s=>{const st=hfStat(s.id,tgt);return `<tr><td><b>${esc(s.nama)}</b></td><td>${st.l} / ${st.t}</td><td>${st.u}</td><td><button class="btn sm success" onclick="hfBuka(${s.id})">✍️ Setor</button></td></tr>`}).join(''),'Belum ada siswa aktif di kelas ini.')}
function hfIsi(){const s=siswaById(hfSiswa),kl=s&&S.kelas.find(k=>k.id===s.kelas_id);if(!s||!kl)return '<div class="note">Siswa tidak ditemukan</div>';
 const tgt=hfTarget(kl.id),st=hfStat(s.id,tgt);
 let h=`<div class="tb" style="flex-wrap:wrap">${dt('date',hfTgl,'','',{id:'hfTgl',max:TODAY})}<input id="hfCat" class="input grow" placeholder="Catatan (opsional)" maxlength="200"></div><div class="note">Lancar <b>${st.l}</b> dari ${st.t} · Mengulang <b>${st.u}</b>. Tanggal dan catatan berlaku untuk setoran yang dicatat berikutnya. Mencatat Lancar atau Mengulang lagi pada hafalan yang masih Mengulang akan menggantikan catatan lama.</div>`;
 S.hfJenis.forEach(j=>{const it=tgt.filter(i=>i.jenis_id===j.id);if(!it.length)return;
  h+=`<div class="tbkh">${esc(j.nama)} <span class="mu">· ${j.cakupan==='wajib'?'Wajib semua kelas':'Kelas '+esc(kl.nama)}</span></div>`+tab(['Aksi','Hafalan','Status','Tanggal setoran','Disetor ke'],it.map(i=>{const x=st.m.get(i.id),lancar=x&&x.hasil==='lancar';
   const stt=x?(lancar?'<span class="badge hadir">Lancar</span>':'<span class="badge terlambat">Mengulang</span>'):'<span class="mu">Belum</span>';
   return `<tr><td><div class="hfaks">${lancar?'':`<button class="btn sm success" onclick="hfSetor(${i.id},'lancar')">✓ Lancar</button><button class="btn sm orange" onclick="hfSetor(${i.id},'ulang')">↻ Mengulang</button>`}${x?`<button class="btn sm danger" onclick="hfHapusSetoran(${x.id})">🗑</button>`:''}</div></td><td><b>${esc(i.judul)}</b>${i.target?`<div class="mu">${esc(i.target)}</div>`:''}${x&&x.catatan?`<div class="mu">📝 ${esc(x.catatan)}</div>`:''}</td><td>${stt}</td><td class="hfn">${x?fmt(x.tanggal):'<span class="mu">-</span>'}</td><td class="hfn">${x&&x.nama_pencatat?esc(x.nama_pencatat):'<span class="mu">-</span>'}</td></tr>`}).join('')).replace('<div class="tw">','<div class="tw hfsw">')});
 return h}
function hfBuka(sid){const s=siswaById(sid);if(!s)return;hfSiswa=sid;hfTgl=TODAY;resetTutup();$('#mt').textContent='Setoran hafalan: '+s.nama;$('#ms').style.display='none';$('#mbd').innerHTML=hfIsi();$('#md').classList.add('besar');$('#md').classList.add('show');
 jagaIsian('Catatan setoran hafalan',()=>!!$('#hfCat')&&$('#hfCat').value.trim()!=='',()=>{const c=$('#hfCat');if(c)c.value=''})}
function hfRefresh(){if($('#md').classList.contains('show')&&hfSiswa&&String($('#mt').textContent).startsWith('Setoran hafalan')){$('#mbd').innerHTML=hfIsi()}renderV()}
function hfSetor(itemId,hasil){const tg=($('#hfTgl')||{}).value||TODAY,cat=((($('#hfCat')||{}).value)||'').trim()||null;hfTgl=tg;
 guard(async()=>{await pkTry(()=>dbq(db.from('hafalan_setoran').insert({siswa_id:hfSiswa,hafalan_id:itemId,hasil,tanggal:tg,catatan:cat})));await hfMuatSetoran();hfRefresh();toast(hasil==='lancar'?'Setoran Lancar dicatat':'Dicatat: perlu mengulang')})}
async function hfHapusSetoran(rid){if(!await konfirmasi('Hapus catatan setoran ini? Status hafalan kembali menjadi Belum.',{bahaya:1,judul:'Hapus setoran',ya:'Hapus'}))return;
 hfTgl=($('#hfTgl')||{}).value||hfTgl;guard(async()=>{await dbq(db.from('hafalan_setoran').delete().eq('id',rid));await hfMuatSetoran();hfRefresh();toast('Setoran dihapus')})}
function hfDaftarHTML(){
 if(!S.hfJenis.length)return '<div class="note">Belum ada jenis hafalan. Buat dulu di tab Jenis.</div><div class="tb"><button class="btn success" onclick="hfHal(\'jenis\');hfTambahJenis()">+ Tambah jenis</button></div>';
 const kl=S.kelas.find(k=>k.nama===hfDK);let h=S.hfJenis.some(j=>j.cakupan==='kelas')?`<div class="tb tab-choice">${cpick('hfDKPick','kelas',hfDK,pkKelasOpt(),'hfPilihDK','Pilih kelas untuk hafalan per kelas')}</div>`:'';
 h+='<div class="note">Hafalan <b>wajib semua kelas</b> otomatis berlaku di setiap kelas. Hafalan <b>per kelas</b> diisi per kelas: pilih kelasnya di atas.</div>';
 h+=`<div class="tbbox"><b>📥 Impor daftar hafalan dari Excel</b><div class="mu" style="margin:4px 0 8px">Unduh template, isi kolom Kelas, Jenis, dan Judul hafalan (kelas dan jenis dipilih dari dropdown), lalu impor. Semua sheet yang headernya sesuai template dibaca sekaligus, dan kelas dibaca dari isi kolom Kelas, bukan dari nama sheet. Hafalan yang sudah ada dilewati.</div><div class="tb" style="flex-wrap:wrap;margin:0"><button class="btn soft sm grow dl" onclick="hfTemplate(this)">⬇ Template (XLSX)</button><button class="btn success sm grow" onclick="document.getElementById('hfFile').click()">⬆ Impor (XLSX)</button><input type="file" id="hfFile" accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel" class="hid" onchange="hfImporDipilih(this)"></div></div>`;
 S.hfJenis.forEach(j=>{const pk=j.cakupan==='kelas',sel=hfMd===j.id;h+=`<div class="tbkh hfkh"><span>${esc(j.nama)} <span class="mu">· ${pk?'Per kelas'+(kl?' · Kelas '+esc(kl.nama):''):'Wajib semua kelas'}</span></span><button type="button" class="btn sm hfdel ${sel?'danger':'soft'}" title="Hapus massal" aria-label="Hapus massal" onclick="hfMode(${j.id})">🗑️</button></div>`;
  if(pk&&!kl){h+=PKH;return}
  const it=S.hfItem.filter(i=>i.jenis_id===j.id&&(pk?i.kelas_id===kl.id:i.kelas_id==null));
  if(sel){const nPil=it.filter(i=>hfPil.has(i.id)).length;
   h+=tab([`<label class="hfcl"><input type="checkbox" class="hfcb" id="hfAll" ${it.length&&nPil===it.length?'checked':''} onchange="hfPilSemua(${j.id},this.checked)" aria-label="Pilih semua"></label>`,'Hafalan','Target'],it.map(i=>`<tr><td style="width:44px"><label class="hfcl"><input type="checkbox" class="hfcb" data-j="${j.id}" data-id="${i.id}" ${hfPil.has(i.id)?'checked':''} onchange="hfUpd(${j.id})"></label></td><td><b>${esc(i.judul)}</b></td><td>${esc(i.target||'')}</td></tr>`).join(''),'Belum ada hafalan.')+`<div class="tb"><button type="button" class="btn sm danger" id="hfDelBtn" onclick="hfHapusMasal(${j.id})" ${nPil?'':'disabled'}>🗑️ Hapus terpilih (${nPil})</button><button type="button" class="btn sm soft" onclick="hfMode(${j.id})">Batal</button></div>`;return}
  h+=tab(['Hafalan','Target','Aksi'],it.map(i=>`<tr><td><b>${esc(i.judul)}</b></td><td>${esc(i.target||'')}</td><td style="width:1%;white-space:nowrap"><div class="hfak2"><button class="btn sm soft" onclick="hfUbahItem(${i.id})">✏ Ubah</button><button class="btn sm danger" onclick="hfHapusItem(${i.id})">Hapus</button></div></td></tr>`).join(''),'Belum ada hafalan.')+`<div class="tb"><button class="btn sm success" onclick="hfTambahItem(${j.id})">+ Tambah hafalan</button></div>`});
 return h}
/* --- Hafalan: hapus massal dengan centang --- */
function hfMode(jid){if(hfMd===jid){hfMd=0;hfPil=new Set();return renderV()}
 const j=hfJ(jid);if(j.cakupan==='kelas'&&!S.kelas.some(k=>k.nama===hfDK))return toast('Pilih kelas dulu',false);
 hfMd=jid;hfPil=new Set();renderV()}
function hfUpd(jid){const c=[...document.querySelectorAll('.hfcb[data-j="'+jid+'"]')];
 hfPil=new Set(c.filter(x=>x.checked).map(x=>+x.dataset.id));
 const a=document.getElementById('hfAll');if(a)a.checked=c.length>0&&c.every(x=>x.checked);
 const b=document.getElementById('hfDelBtn');if(b){b.disabled=!hfPil.size;b.textContent='🗑️ Hapus terpilih ('+hfPil.size+')'}}
function hfPilSemua(jid,on){document.querySelectorAll('.hfcb[data-j="'+jid+'"]').forEach(x=>{x.checked=!!on});hfUpd(jid)}
async function hfHapusMasal(jid){const j=hfJ(jid),pk=j.cakupan==='kelas',kl=S.kelas.find(k=>k.nama===hfDK);
 const ada=new Set(S.hfItem.filter(i=>i.jenis_id===jid&&(pk?(kl&&i.kelas_id===kl.id):i.kelas_id==null)).map(i=>i.id));
 const ids=[...hfPil].filter(x=>ada.has(x));
 if(!ids.length)return toast('Centang dulu hafalan yang mau dihapus',false);
 let n=0,nx=false;try{for(let a=0;a<ids.length;a+=100){const r=await db.from('hafalan_setoran').select('id',{count:'exact',head:true}).in('hafalan_id',ids.slice(a,a+100));if(r.error)throw r.error;n+=r.count||0}}catch(e){nx=true}
 if(!await konfirmasi('Hapus '+ids.length+' hafalan yang dicentang?'+(nx?' (jumlah catatan setoran belum bisa dicek)':n?' '+n+' catatan setoran anak tetap tersimpan sebagai riwayat, tetapi tidak dihitung lagi.':''),{bahaya:1,judul:'Hapus hafalan terpilih',ya:'Hapus '+ids.length}))return;
 guard(async()=>{try{for(let a=0;a<ids.length;a+=100)await dbq(db.from('hafalan_item').delete().in('id',ids.slice(a,a+100)))}
  finally{hfMd=0;hfPil=new Set();await muatHafalan();renderV()}
  toast(ids.length+' hafalan dihapus')})}
function hfTambahItem(jid){const j=hfJ(jid),pk=j.cakupan==='kelas',kl=S.kelas.find(k=>k.nama===hfDK);if(pk&&!kl)return toast('Pilih kelas dulu',false);
 form('Tambah hafalan: '+j.nama,[{k:'judul',l:'Judul hafalan (contoh: Surah Al-Ikhlas)'},{k:'target',l:'Target (opsional, contoh: ayat 1-4)'}],async v=>{if(!v.judul)throw new Error('Judul wajib diisi');
  const n=S.hfItem.filter(i=>i.jenis_id===jid&&(pk?i.kelas_id===kl.id:i.kelas_id==null)).length+1;
  await pkTry(()=>dbq(db.from('hafalan_item').insert({jenis_id:jid,kelas_id:pk?kl.id:null,judul:v.judul,target:v.target||null,urutan:n,dibuat_oleh:me})));
  await muatHafalan();renderV();toast('Hafalan ditambahkan')})}
function hfUbahItem(id){const i=S.hfItem.find(x=>x.id===id);if(!i)return;
 form('Ubah hafalan',[{k:'judul',l:'Judul hafalan',v:i.judul},{k:'target',l:'Target (opsional)',v:i.target||''}],async v=>{if(!v.judul)throw new Error('Judul wajib diisi');
  await pkTry(()=>dbq(db.from('hafalan_item').update({judul:v.judul,target:v.target||null}).eq('id',id)));await muatHafalan();renderV();toast('Hafalan disimpan')})}
async function hfHapusItem(id){const i=S.hfItem.find(x=>x.id===id);if(!i)return;let n=0,nx=false;
 try{const r=await db.from('hafalan_setoran').select('id',{count:'exact',head:true}).eq('hafalan_id',id);if(r.error)throw r.error;n=r.count||0}catch(e){nx=true}
 if(!await konfirmasi('Hapus hafalan "'+i.judul+'"?'+(nx?' (jumlah catatan setoran belum bisa dicek)':n?' '+n+' catatan setoran anak tetap tersimpan sebagai riwayat, tetapi tidak dihitung lagi.':''),{bahaya:1,judul:'Hapus hafalan',ya:'Hapus'}))return;
 guard(async()=>{await dbq(db.from('hafalan_item').delete().eq('id',id));await muatHafalan();renderV();toast('Hafalan dihapus')})}
function hfJenisHTML(){
 const rows=S.hfJenis.map(j=>{const n=S.hfItem.filter(i=>i.jenis_id===j.id).length;
  return `<tr><td><b>${esc(j.nama)}</b></td><td>${hfCakL[j.cakupan]}</td><td>${n}</td><td><div class="tb" style="margin:0;flex-wrap:wrap"><button class="btn sm soft" onclick="hfUbahJenis(${j.id})">✏ Ubah</button><button class="btn sm danger" onclick="hfHapusJenis(${j.id})">Hapus</button></div></td></tr>`}).join('');
 return `<div class="note">Semua guru boleh menambah, mengubah, dan menghapus jenis hafalan. <b>Wajib semua kelas</b>: daftar berlaku untuk seluruh kelas. <b>Per kelas</b>: daftar diisi per kelas. Cakupan hanya dapat diubah oleh Kepala Sekolah, Wakil, atau Operator.</div><div class="tb"><button class="btn success" onclick="hfTambahJenis()">+ Tambah jenis</button></div>`+tab(['Jenis','Cakupan','Hafalan','Aksi'],rows,'Belum ada jenis hafalan.')}
function hfTambahJenis(){form('Tambah jenis hafalan',[{k:'nama',l:'Nama jenis (contoh: Surah pendek, Doa harian)'},{k:'cak',l:'Cakupan',o:['Wajib semua kelas','Per kelas']}],async v=>{
 if(!v.nama)throw new Error('Nama jenis wajib diisi');
 await pkTry(()=>dbq(db.from('hafalan_jenis').insert({nama:v.nama,cakupan:hfCakV[v.cak]||'wajib',urutan:S.hfJenis.length+1,dibuat_oleh:me})));
 await muatHafalan();renderV();toast('Jenis hafalan ditambahkan')})}
function hfUbahJenis(id){const j=S.hfJenis.find(x=>x.id===id);if(!j)return;const kep=adalahKepala();
 form('Ubah jenis hafalan',[{k:'nama',l:'Nama jenis',v:j.nama},kep?{k:'cak',l:'Cakupan (hanya Kepala Sekolah dan Wakil)',o:['Wajib semua kelas','Per kelas'],v:hfCakL[j.cakupan]}:{k:'cak',l:'Cakupan (hanya Kepala Sekolah dan Wakil yang dapat mengubah)',ro:1,v:hfCakL[j.cakupan]}],async v=>{
 if(!v.nama)throw new Error('Nama jenis wajib diisi');
 const baru=kep?(hfCakV[v.cak]||j.cakupan):j.cakupan,n=S.hfItem.filter(i=>i.jenis_id===id).length;
 if(baru!==j.cakupan&&n>0&&!await konfirmasi('Mengubah cakupan menjadi "'+hfCakL[baru]+'" akan menghapus '+n+' hafalan di jenis ini. Catatan setoran anak tetap tersimpan sebagai riwayat. Lanjutkan?',{bahaya:1,judul:'Ubah cakupan',ya:'Ubah dan hapus hafalan'}))throw new Error('Perubahan dibatalkan');
 await pkTry(()=>dbq(db.from('hafalan_jenis').update({nama:v.nama}).eq('id',id)));
 if(baru!==j.cakupan)await pkTry(()=>dbq(db.rpc('hafalan_ubah_cakupan',{p_jenis:id,p_cakupan:baru})));
 await muatHafalan();renderV();toast('Jenis hafalan disimpan')})}
async function hfHapusJenis(id){const j=S.hfJenis.find(x=>x.id===id);if(!j)return;const n=S.hfItem.filter(i=>i.jenis_id===id).length;
 if(!await konfirmasi('Hapus jenis "'+j.nama+'"?'+(n?' '+n+' hafalan di dalamnya ikut terhapus. Catatan setoran anak tetap tersimpan sebagai riwayat.':''),{bahaya:1,judul:'Hapus jenis hafalan',ya:'Hapus'}))return;
 guard(async()=>{await dbq(db.from('hafalan_jenis').delete().eq('id',id));await muatHafalan();renderV();toast('Jenis hafalan dihapus')})}
function hfRekapHTML(){const sem=hfK==='*',pil=hfPilKelas(1);if(!hfK)return pil+PKH;const kl=S.kelas.find(k=>k.nama===hfK);if(!kl&&!sem)return pil+PKH;
 if(hfSetK!==hfK)return pil+'<div class="note">⏳ Memuat setoran...</div>';
 if(sem){const sis=S.siswa.filter(s=>s.aktif).sort(urutKN),tm=new Map(),T=id=>{if(!tm.has(id))tm.set(id,hfTarget(id));return tm.get(id)};
  if(!sis.some(s=>T(s.kelas_id).length))return pil+'<div class="note">Belum ada daftar hafalan di kelas mana pun.</div>';
  return pil+`<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm grow" onclick="hfUnduh('pdf',this)">⬇ Rekap (PDF)</button><button class="btn soft sm grow" onclick="hfUnduh('xlsx',this)">⬇ Rekap (XLSX)</button></div>`+tab(['Nama','Kelas','Lancar','Mengulang','Belum'],sis.map(s=>{const t=T(s.kelas_id),st=hfStat(s.id,t);return `<tr><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas||'-')}</td><td>${st.l} / ${st.t}</td><td>${st.u}</td><td>${st.t-st.l-st.u}</td></tr>`}).join(''),'Belum ada siswa aktif.')}
 const tgt=hfTarget(kl.id),sis=S.siswa.filter(s=>s.aktif&&s.kelas_id===kl.id);
 if(!tgt.length)return pil+'<div class="note">Belum ada daftar hafalan untuk kelas ini.</div>';
 return pil+`<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm grow" onclick="hfUnduh('pdf',this)">⬇ Rekap (PDF)</button><button class="btn soft sm grow" onclick="hfUnduh('xlsx',this)">⬇ Rekap (XLSX)</button></div>`+tab(['Nama','Lancar','Mengulang','Belum'],sis.map(s=>{const st=hfStat(s.id,tgt);return `<tr><td><b>${esc(s.nama)}</b></td><td>${st.l} / ${st.t}</td><td>${st.u}</td><td>${st.t-st.l-st.u}</td></tr>`}).join(''),'Belum ada siswa aktif di kelas ini.')}
async function hfUnduh(jenis,btn){await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,'Menyiapkan...'))return;
 try{await jedaUnduh();const sem=hfK==='*',kl=sem?{nama:'Semua kelas'}:S.kelas.find(k=>k.nama===hfK);if(!kl)throw new Error('Pilih kelas dulu');if(hfSetK!==hfK)throw new Error('Data setoran masih dimuat, coba lagi sebentar');
  const tgt=sem?[]:hfTarget(kl.id),sis=sem?S.siswa.filter(s=>s.aktif).sort(urutKN):S.siswa.filter(s=>s.aktif&&s.kelas_id===kl.id),tM=new Map(),TK=id=>{if(!tM.has(id))tM.set(id,hfTarget(id));return tM.get(id)},nf=ns().replace(/[^\w]+/g,'-')+'-Kelas-'+kl.nama.replace(/[^\w]+/g,'-');
  if(jenis==='xlsx'){await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat. Muat ulang halaman');
   const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();
   const hd=(ws,H)=>H.forEach((h,i)=>{const c=ws.getCell(1,i+1);c.value=h;c.font={bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9E3F7'}}});
   if(sem){const w1=wb.addWorksheet('Rekap');w1.columns=[{width:6},{width:32},{width:18},{width:12},{width:12},{width:10},{width:14}];hd(w1,['No','Nama','Kelas','Lancar','Mengulang','Belum','Total hafalan']);
    sis.forEach((s,n)=>{const st=hfStat(s.id,TK(s.kelas_id));w1.addRow([n+1,s.nama,s.kelas||'',st.l,st.u,st.t-st.l-st.u,st.t])});
    const used=new Set(['Rekap']);S.kelas.forEach(k=>{const ss=sis.filter(s=>s.kelas_id===k.id),tg=TK(k.id);if(!ss.length||!tg.length)return;const w2=wb.addWorksheet(namaSheetSiswa('Rincian '+k.nama,used));w2.columns=[{width:32},...tg.map(()=>({width:18}))];hd(w2,['Nama',...tg.map(i=>(hfJ(i.jenis_id).nama||'')+': '+i.judul)]);
     ss.forEach(s=>{const st=hfStat(s.id,tg);w2.addRow([s.nama,...tg.map(i=>{const x=st.m.get(i.id);return x?(x.hasil==='lancar'?'Lancar ':'Mengulang ')+x.tanggal:''})])})})}
   else{const w1=wb.addWorksheet('Rekap');w1.columns=[{width:6},{width:32},{width:12},{width:12},{width:10},{width:14}];hd(w1,['No','Nama','Lancar','Mengulang','Belum','Total hafalan']);
   sis.forEach((s,n)=>{const st=hfStat(s.id,tgt);w1.addRow([n+1,s.nama,st.l,st.u,st.t-st.l-st.u,st.t])});
   const w2=wb.addWorksheet('Rincian');w2.columns=[{width:32},...tgt.map(()=>({width:18}))];hd(w2,['Nama',...tgt.map(i=>(hfJ(i.jenis_id).nama||'')+': '+i.judul)]);
   sis.forEach(s=>{const st=hfStat(s.id,tgt);w2.addRow([s.nama,...tgt.map(i=>{const x=st.m.get(i.id);return x?(x.hasil==='lancar'?'Lancar ':'Mengulang ')+x.tanggal:''})])})}
   for(const ws of wb.worksheets){const k=sem?(ws.name==='Rekap'?'':ws.name.replace(/^Rincian /,'')):kl.nama,row=ws.rowCount+2;await xlsxTtdRekap(wb,ws,k,row,1,4,5);if(k)ws.getCell(row+5,1).value='Wali Kelas: '+(ttdWali(k)?.nama||'-');ws.getCell(row+5,5).value='Kepala Sekolah: '+(ttdKepsek().nama||'-');if(ttdKepsek().nip)ws.getCell(row+6,5).value='NIP. '+ttdKepsek().nip}await tulisXlsx(wb,'Rekap-Hafalan-'+nf+'-'+TODAY+'.xlsx');toast('Rekap hafalan sedang diproses, mohon ditunggu');return}
  const d=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),tg=ttdKepsek(),wl=sem?null:ttdWali(kl.nama);
  d.setFont('helvetica','bold');d.setFontSize(13);d.setTextColor(0,0,0);d.text('REKAP HAFALAN - '+ns().toUpperCase(),105,14,{align:'center'});
  d.setFont('helvetica','normal');d.setFontSize(9);d.text((sem?'Semua kelas':'Kelas '+kl.nama)+'  |  Tahun ajaran '+((S.set&&S.set.tahun_ajaran)||'-')+(sem?'':'  |  Wali kelas: '+(wl?wl.nama:'-'))+'  |  '+fmt(TODAY),105,20,{align:'center'});
  const hs={fillColor:[118,80,184],halign:'center'};
  let y;
  if(sem){d.autoTable({startY:26,head:[['No','Nama','Kelas','Lancar','Mengulang','Belum']],body:sis.map((s,n)=>{const st=hfStat(s.id,TK(s.kelas_id));return[n+1,s.nama,s.kelas||'',st.l+' / '+st.t,st.u,st.t-st.l-st.u]}),theme:'grid',styles:{fontSize:8.5,cellPadding:1.6},headStyles:hs,columnStyles:{0:{halign:'center',cellWidth:10},3:{halign:'center'},4:{halign:'center'},5:{halign:'center'}}});y=d.lastAutoTable.finalY+10}
  else{d.autoTable({startY:26,head:[['No','Nama','Lancar','Mengulang','Belum']],body:sis.map((s,n)=>{const st=hfStat(s.id,tgt);return[n+1,s.nama,st.l+' / '+st.t,st.u,st.t-st.l-st.u]}),theme:'grid',styles:{fontSize:8.5,cellPadding:1.6},headStyles:hs,columnStyles:{0:{halign:'center',cellWidth:10},2:{halign:'center'},3:{halign:'center'},4:{halign:'center'}}});
  y=d.lastAutoTable.finalY+8;if(y>255){d.addPage();y=20}
  d.setFont('helvetica','bold');d.setFontSize(10);d.text('Daftar hafalan kelas',14,y);
  d.autoTable({startY:y+3,head:[['No','Jenis','Hafalan','Target']],body:tgt.map((i,n)=>[n+1,hfJ(i.jenis_id).nama||'-',i.judul,i.target||'']),theme:'grid',styles:{fontSize:8.5,cellPadding:1.6},headStyles:hs,columnStyles:{0:{halign:'center',cellWidth:10}}});
  y=d.lastAutoTable.finalY+10}
  if(y+42>285){d.addPage();y=20}
  await pdfTtdRekap(d,sem?'':kl.nama,y);
  d.save('rekap-hafalan-'+nf+'-'+TODAY+'.pdf');toast('Rekap hafalan sedang diproses, mohon ditunggu')}
 catch(e){toast('Gagal mengunduh: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
/* --- Hafalan: template dan impor Excel (batch) --- */
let HFI={rows:[],sheets:0,err:[],dup:0,dupFile:0,skip:[]};
const hfNorm=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase();
const hfKey=(j,k,t)=>j+'|'+(k||0)+'|'+hfNorm(t);
async function hfTemplate(btn){await muatLib('exceljs');if(!setUnduhBusy(btn,true,'Menyiapkan...'))return;
 try{await jedaUnduh();await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
  if(!S.hfJenis.length)throw new Error('Buat dulu minimal satu jenis hafalan di tab Jenis');
  const N=1000,ln={style:'thin',color:{argb:'FFCFD9D3'}},wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();
  const kl=['Wajib semua kelas',...S.kelas.map(k=>k.nama)],jn=S.hfJenis.map(j=>j.nama),head=['Kelas','Jenis','Judul Hafalan','Target (Opsional)'];
  const fk=['Pilihan!$A$2:$A$'+(kl.length+1)],fj=['Pilihan!$B$2:$B$'+(jn.length+1)];
  const mk=nama=>{const ws=wb.addWorksheet(nama);ws.columns=[{width:26},{width:24},{width:40},{width:26}];ws.addRow(head);ws.getRow(1).height=24;
   ws.getRow(1).eachCell(c=>{c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176B3A'}};c.alignment={horizontal:'center',vertical:'middle'};c.border={top:ln,left:ln,bottom:ln,right:ln}});
   ws.views=[{state:'frozen',ySplit:1}];
   for(let r=2;r<=N;r++){
    ws.getCell(r,1).dataValidation={type:'list',allowBlank:true,formulae:fk,showErrorMessage:true,errorStyle:'stop',errorTitle:'Kelas tidak valid',error:'Pilih kelas dari daftar. Untuk hafalan semua kelas pilih "Wajib semua kelas".',showInputMessage:true,promptTitle:'Kelas',prompt:'Pilih dari daftar'};
    ws.getCell(r,2).dataValidation={type:'list',allowBlank:true,formulae:fj,showErrorMessage:true,errorStyle:'stop',errorTitle:'Jenis tidak valid',error:'Pilih jenis hafalan dari daftar yang tersedia di sistem.',showInputMessage:true,promptTitle:'Jenis',prompt:'Pilih dari daftar'}}};
  mk('Hafalan');mk('Hafalan 2');
  const ls=wb.addWorksheet('Pilihan',{state:'hidden'});ls.getCell('A1').value='Kelas';ls.getCell('B1').value='Jenis';kl.forEach((n,i)=>{ls.getCell(i+2,1).value=n});jn.forEach((n,i)=>{ls.getCell(i+2,2).value=n});
  const pt=wb.addWorksheet('Petunjuk');pt.columns=[{width:30},{width:30},{width:38},{width:28}];
  const tx=['PETUNJUK IMPOR DAFTAR HAFALAN','',
   '1. Isi sheet "Hafalan". Anda boleh memakai beberapa sheet (sheet "Hafalan 2" atau salinan sheet lain) asal baris pertamanya sama dengan template. Nama sheet bebas dan tidak dipakai.',
   '2. Kolom Kelas dan Jenis dipilih dari dropdown. Kelas dibaca dari isi kolom Kelas pada tiap baris, bukan dari nama sheet.',
   '3. "Wajib semua kelas" hanya untuk jenis yang cakupannya Wajib semua kelas. Kelas tertentu hanya untuk jenis yang cakupannya Per kelas.',
   '4. Judul hafalan maksimal 100 huruf dan target maksimal 120 huruf. Jangan mengubah judul kolom di baris pertama.',
   '5. Hafalan yang sama dengan daftar yang sudah ada (kelas, jenis, dan judul sama) dilewati. Impor hanya menambah, tidak mengubah atau menghapus.','',
   'Contoh pengisian (jangan disalin ke sheet data kecuali memang diperlukan):'];
  tx.forEach(t=>pt.addRow([t]));pt.getRow(1).font={name:'Arial',size:13,bold:true};
  const jw=S.hfJenis.find(j=>j.cakupan==='wajib'),jk=S.hfJenis.find(j=>j.cakupan==='kelas'),k0=S.kelas[0];
  pt.addRow(head).font={bold:true};
  if(jw)pt.addRow(['Wajib semua kelas',jw.nama,'Surah Al-Fatihah','Ayat 1-7']);
  if(jk&&k0)pt.addRow([k0.nama,jk.nama,'Doa sebelum makan','']);
  pt.addRow([]);pt.addRow(['Jenis hafalan saat ini','Cakupan']).font={bold:true};S.hfJenis.forEach(j=>pt.addRow([j.nama,hfCakL[j.cakupan]]));
  await tulisXlsx(wb,'template-daftar-hafalan.xlsx');toast('Template daftar hafalan sedang diproses, mohon ditunggu')}
 catch(e){toast('Gagal membuat template: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
function hfImporDipilih(el){const f=el.files&&el.files[0];el.value='';if(!f)return;
 guard(async()=>{
  await muatLib('xlsx');if(typeof XLSX==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
  if(!/\.xlsx?$/i.test(f.name))throw new Error('Gunakan file Excel (.xlsx) dari tombol Template');
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),HEAD=['kelas','jenis','judul hafalan','target (opsional)'];
  const mj=new Map(S.hfJenis.map(j=>[hfNorm(j.nama),j])),mk=new Map(S.kelas.map(k=>[hfNorm(k.nama),k]));
  const ada=new Set(S.hfItem.map(i=>hfKey(i.jenis_id,i.kelas_id,i.judul))),lihat=new Set();
  const ok=[],err=[],skip=[],sheets=[],grup=new Map();let dup=0,dupF=0,total=0;
  const G=l=>{if(!grup.has(l))grup.set(l,{baru:0,dup:0,err:0});return grup.get(l)};
  wb.SheetNames.forEach(nm=>{const a=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,defval:''});const h=(a[0]||[]).map(hfNorm);
   if(!HEAD.every((x,i)=>h[i]===x)){skip.push(nm);return}
   sheets.push(nm);
   a.slice(1).forEach((r,ix)=>{const c=r.map(x=>String(x==null?'':x).trim()),row=ix+2;if(!c.slice(0,4).some(Boolean))return;total++;
    const [kl,jn,judul,tg]=c,wajib=/^wajib/.test(hfNorm(kl)),kelas=wajib?null:mk.get(hfNorm(kl)),jenis=mj.get(hfNorm(jn)),lbl=wajib?'Wajib semua kelas':(kelas?kelas.nama:(kl||'(kolom Kelas kosong)'));
    const bad=m=>{err.push('Sheet '+nm+' - Baris '+row+' ('+(judul||'-')+'): '+m);G(lbl).err++};
    if(!kl)return bad('kolom Kelas kosong');
    if(!wajib&&!kelas)return bad('kelas "'+kl+'" tidak ada di sistem');
    if(!jn)return bad('kolom Jenis kosong');
    if(!jenis)return bad('jenis "'+jn+'" tidak ada di sistem');
    if(wajib&&jenis.cakupan!=='wajib')return bad('jenis "'+jenis.nama+'" khusus per kelas, pilih kelasnya di kolom Kelas');
    if(!wajib&&jenis.cakupan!=='kelas')return bad('jenis "'+jenis.nama+'" adalah wajib semua kelas, pilih "Wajib semua kelas" di kolom Kelas');
    if(!judul)return bad('judul hafalan kosong');
    if(judul.length>100)return bad('judul lebih dari 100 huruf');
    if(tg.length>120)return bad('target lebih dari 120 huruf');
    const key=hfKey(jenis.id,kelas?kelas.id:null,judul);
    if(ada.has(key)){dup++;G(lbl).dup++;return}
    if(lihat.has(key)){dupF++;G(lbl).dup++;return}
    lihat.add(key);G(lbl).baru++;ok.push({jenis_id:jenis.id,kelas_id:kelas?kelas.id:null,judul,target:tg||null})})});
  if(!sheets.length)throw new Error('Tidak ditemukan sheet data yang sesuai template. Pastikan header tabel ada di baris pertama.');
  if(!total)throw new Error('Semua sheet data kosong.');
  if(ok.length>5000)throw new Error('Maksimal 5000 hafalan baru per impor. Pecah menjadi beberapa file');
  HFI={rows:ok,sheets:sheets.length,err,dup,dupFile:dupF,skip};
  hfPratinjau(grup)})}
function hfPratinjau(grup){const H=HFI,tg=[...grup.entries()].sort((a,b)=>{const o=n=>n==='Wajib semua kelas'?-1:S.kelas.findIndex(k=>k.nama===n);return(o(a[0])-o(b[0]))||String(a[0]).localeCompare(String(b[0]),'id')});
 resetTutup();$('#mt').textContent='Pratinjau impor daftar hafalan';
 $('#mbd').innerHTML=`<div class="note">📄 Sheet data terdeteksi: <b>${H.sheets}</b>${H.skip.length?` · sheet dilewati: ${H.skip.map(esc).join(', ')}`:''}<br>✅ Akan ditambah: <b>${H.rows.length}</b> hafalan<br>⏭ Duplikat dilewati: <b>${H.dup+H.dupFile}</b><br>❌ Bermasalah (tidak diimpor): <b>${H.err.length}</b></div>`
  +tab(['Kelas','Baru','Duplikat','Bermasalah'],tg.map(([n,v])=>`<tr><td><b>${esc(n)}</b></td><td>${v.baru}</td><td>${v.dup}</td><td>${v.err}</td></tr>`).join(''),'Tidak ada baris')
  +(H.err.length?`<div class="tbkh">Baris bermasalah</div><div class="note" style="max-height:240px;overflow:auto;border:1px solid #d62839;color:#d62839">${H.err.slice(0,100).map(esc).join('<br>')}${H.err.length>100?`<br>... dan ${H.err.length-100} lainnya`:''}</div>`:'')
  +(H.rows.length?'':'<div class="note">Tidak ada hafalan baru yang bisa diimpor.</div>');
 const m=$('#ms');m.className='btn success';m.disabled=false;m.style.display=H.rows.length?'':'none';m.textContent='Impor '+H.rows.length+' hafalan';m.onclick=hfImporKirim;
 $('#md').classList.add('besar');$('#md').classList.add('show')}
async function hfImporKirim(){const H=HFI,rows=H.rows;if(!rows.length)return;const BATCH=200,paket=Math.ceil(rows.length/BATCH),b=$('#ms');let tambah=0,dup=0,n=0;b.disabled=true;
 try{ld(1);
  for(let i=0;i<rows.length;i+=BATCH){n++;$('#ldt').textContent='Mengimpor hafalan '+Math.min(i+BATCH,rows.length)+' dari '+rows.length+'...';
   const chunk=rows.slice(i,i+BATCH);let r;
   try{r=await dbq(db.rpc('hafalan_impor',{p_sekolah:SEK,p_baris:chunk}))}
   catch(e){throw new Error('Paket '+n+' dari '+paket+' gagal: '+dbMsg(e)+(n>1?'. Paket sebelumnya sudah masuk. Ulangi impor untuk melanjutkan, yang sudah masuk akan dilewati':''))}
   tambah+=Number(r&&r.ditambah)||0;dup+=Number(r&&r.duplikat)||0}
 }catch(e){ld(0);b.disabled=false;try{await muatHafalan()}catch(_){}renderV();toast((e&&e.message)||String(e),false);return}
 ld(0);closeM();try{await muatHafalan()}catch(_){}renderV();
 info('Hasil impor daftar hafalan','<div class="note">📄 Sheet data terdeteksi: <b>'+H.sheets+'</b><br>✅ Berhasil ditambah: <b>'+tambah+'</b> hafalan<br>⏭ Duplikat dilewati: <b>'+(H.dup+H.dupFile+dup)+'</b><br>❌ Bermasalah (tidak diimpor): <b>'+H.err.length+'</b></div>'+(H.err.length?'<div class="mu" style="max-height:200px;overflow:auto">'+H.err.slice(0,100).map(esc).join('<br>')+'</div>':''))}
V.tabungan=()=>{if(!S.tab)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat tabungan...</div></div></div>';
 const sis=S.tab.filter(r=>r.kelas_nama===tabK),hal=[['in','⬇ Pemasukan'],['out','⬆ Pengeluaran'],['rek','📊 Rekap &amp; Laporan']];
 const pil=tabP==='rek'?dt('month',tabBln,'tabSetBln(this.value)'):cpick('tabSiswaPick','nama siswa',tabS,sis.map(x=>({value:x.siswa_id,label:x.nama+(x.nisn?' · '+x.nisn:'')})),'tabPilihS','Pilih siswa');
 return `<div class="panel"><div class="ph">💰 Tabungan Siswa</div><div class="pb"><div class="utabs">${hal.map(x=>`<button class="utab${tabP===x[0]?' on':''}" onclick="tabHal('${x[0]}')">${x[1]}</button>`).join('')}</div><div class="tb tab-choice">${cpick('tabKelasPick','kelas',tabK,(tabP==='rek'?[{value:'*',label:'Semua kelas'}]:[]).concat(S.kelas.map(k=>({value:k.nama,label:k.nama}))),'tabPilihK','Pilih kelas')}</div>${tabK?`<div class="tb tab-choice">${pil}</div>`:''}${!tabK?PKH:tabP==='rek'?tabRekHTML():tabFormHTML(tabP==='out')}</div></div>`};
function tabFormHTML(out){const r=S.tab.find(x=>x.siswa_id===tabS&&x.kelas_nama===tabK);if(!r)return '<div class="note">Pilih siswa terlebih dahulu</div>';
 const wali=tabAdaWali(tabK),batal=new Set(tabRw.filter(x=>x.membatalkan_id).map(x=>x.membatalkan_id)),asc=tabBarisAsc(tabRw);
 const kotak=out&&!wali?`<div class="note">Penarikan hanya boleh dilakukan oleh wali kelas (${esc(tabWali(tabK))}).</div>`:`<div class="tb" style="flex-wrap:wrap"><input id="tbJml" class="input grow" inputmode="numeric" placeholder="Jumlah ${out?'penarikan':'setoran'} (Rp)" oninput="this.value=fmtIn(this.value)">${dt('date',TODAY,'','',{id:'tbTgl',max:TODAY})}<input id="tbCat" class="input grow" placeholder="Catatan (opsional)"><button class="btn ${out?'orange':'success'}" onclick="tabSimpan('${out?'tarik':'setor'}')">${out?'− Tarik':'+ Setor'}</button></div>`;
 const rows=asc.slice().reverse().map(o=>{const x=o.x;return `<tr style="${batal.has(x.id)?'opacity:.5;text-decoration:line-through':''}"><td>${fmt(x.tanggal)}</td><td>${jamJkt(x.dibuat)}</td><td>${tabJenis(x)}</td><td style="text-align:right;color:#1f9d55">${o.m===''?'':rp(o.m)}</td><td style="text-align:right;color:#d64545">${o.k===''?'':rp(o.k)}</td><td style="text-align:right"><b>${rp(o.s)}</b></td><td>${esc(x.catatan||'')}${x.nama_pengubah?`<div class="mu">✏ diedit oleh ${esc(x.nama_pengubah)}</div>`:''}</td><td>${esc(x.nama_pencatat||'-')}</td><td><div class="tb" style="margin:0;flex-wrap:wrap">${tabBisaUbah(x,batal)?`<button class="btn sm soft" onclick="tabUbah(${x.id})">✏ Ubah</button>`:''}${x.sumber==='manual'&&!batal.has(x.id)?`<button class="btn sm danger" onclick="tabBatal(${x.id},${tabS})">Batalkan</button>`:''}</div></td></tr>`}).join('');
 return tab(['Nama','Kelas','Wali kelas'],`<tr><td><b>${esc(r.nama)}</b></td><td>${esc(r.kelas_nama)}</td><td>${esc(tabWali(tabK))}</td></tr>`)+`<div class="saldo-highlight"><small>Saldo saat ini</small><b>${rp(r.saldo)}</b></div>`+kotak+`<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm grow" onclick="tabUnduhS('pdf',this)">⬇ Rekap siswa (PDF)</button><button class="btn soft sm grow" onclick="tabUnduhS('xlsx',this)">⬇ Rekap siswa (XLSX)</button></div>`+tab(['Tanggal','Jam','Jenis','Masuk','Keluar','Saldo','Catatan','Dicatat oleh','Aksi'],rows,'Belum ada transaksi.')}
const tabCat=x=>(x.catatan||'')+(x.nama_pengubah?(x.catatan?' ':'')+'(diedit oleh '+x.nama_pengubah+')':'');
function tabBisaUbah(x,batal){if(x.sumber!=='manual'||batal.has(x.id)||Date.now()-new Date(x.dibuat).getTime()>7*864e5)return false;return x.jenis==='tarik'?tabAdaWali(tabK):(adalahKepala()||x.dicatat_oleh===me)}
function tabUbah(id){const x=tabRw.find(r=>r.id===id);if(!x)return;
 form('Ubah '+(x.jenis==='setor'?'setoran':'penarikan')+' (maks. 7 hari sejak dicatat)',[{k:'jml',l:'Jumlah (Rp)',v:fmtIn(x.jumlah)},{k:'tgl',l:'Tanggal',t:'date',v:x.tanggal},{k:'cat',l:'Catatan (opsional)',v:x.catatan||''}],async v=>{
  const jml=Number(String(v.jml||'').replace(/\D/g,''));if(!jml)throw new Error('Isi jumlah dengan angka lebih dari 0');
  const baru=await dbq(db.rpc('tabungan_ubah',{p_id:id,p_jumlah:jml,p_tanggal:v.tgl||x.tanggal,p_catatan:(v.cat||'').trim()||null}));
  await muatTabungan();await tabMuatRw();toast('Transaksi diperbarui. Saldo '+rp(baru));renderV()});
 const e=$('#f_jml');if(e)e.oninput=function(){this.value=fmtIn(this.value)};$('#ms').textContent='Simpan perubahan'}
function tabSimpan(jenis){const jml=Number(String($('#tbJml').value).replace(/\D/g,'')),r=S.tab.find(x=>x.siswa_id===tabS);if(!jml)return toast('Isi jumlah dengan angka lebih dari 0',false);if(jenis==='tarik'&&jml>Number(r.saldo))return toast('Saldo tidak cukup. Saldo sekarang '+rp(r.saldo),false);
 return guard(async()=>{const baru=await dbq(db.rpc('tabungan_catat',{p_siswa:tabS,p_jenis:jenis,p_jumlah:jml,p_tanggal:$('#tbTgl').value||null,p_catatan:($('#tbCat').value||'').trim()||null}));await muatTabungan();await tabMuatRw();toast((jenis==='setor'?'Setoran ':'Penarikan ')+rp(jml)+' dicatat. Saldo '+rp(baru));renderV();return true})}
function tabUnduhS(t,btn){const r=S.tab.find(x=>x.siswa_id===tabS);if(!r)return;const rows=tabBarisAsc(tabRw).reverse().map(o=>[fmt(o.x.tanggal),jamJkt(o.x.dibuat),tabJenis(o.x),o.m,o.k,o.s,tabCat(o.x),o.x.nama_pencatat||'-']);
 tabBerkas(t,'rekap-tabungan-'+r.nama.replace(/[^\w]+/g,'-'),'REKAP TABUNGAN','Nama: '+r.nama+'  |  NISN: '+(r.nisn||'-')+'  |  Kelas: '+r.kelas_nama+'  |  Saldo: '+rp(r.saldo),['Tanggal','Jam','Jenis','Masuk (Rp)','Keluar (Rp)','Saldo (Rp)','Catatan','Dicatat oleh'],rows,r.kelas_nama,btn,[3,4,5])}
function tabRekHTML(){rkMuatStatus('tabungan');const D=tabRekD;if(!D)return '<div class="note">⏳ Memuat rekap...</div>';const T=k=>D.reduce((a,d)=>a+d[k],0),R=v=>`<td style="text-align:right">${rp(v)}</td>`;
 const rows=D.map((d,i)=>`<tr><td>${i+1}</td><td><b>${esc(d.r.nama)}</b></td><td>${tabK==='*'?esc(d.r.kelas_nama||'-'):esc(tabWali(tabK))}</td>${R(d.awal)}${R(d.masuk)}${R(d.keluar)}<td style="text-align:right"><b>${rp(d.akhir)}</b></td><td>${rkSel(siswaById(d.r.siswa_id)||{id:d.r.siswa_id},'tabungan','Laporan tabungan '+fmtB(tabBln))}</td><td><div class="tb" style="margin:0;flex-wrap:wrap"><button class="btn sm soft" onclick="tabRiwBulan(${d.r.siswa_id})">Riwayat</button><button class="btn sm success" onclick="tabKirim(${d.r.siswa_id})">📤 Kirim</button><button class="btn sm soft" onclick="tabLihatPesan(${d.r.siswa_id})">👁 Lihat pesan</button></div></td></tr>`).join('');
 return `<div class="tb" style="flex-wrap:wrap"><button class="btn success grow" onclick="tabUnduhK('pdf',this)">⬇ Rekap (PDF)</button><button class="btn grow" onclick="tabUnduhK('xlsx',this)">⬇ Rekap (XLSX)</button><button class="btn orange grow" onclick="tabKirimSemua()">📤 Kirim laporan ke orang tua</button><button class="btn soft grow" onclick="tabLihatPesanSemua()">👁 Lihat pesan</button><button class="btn soft grow" onclick="riwayatKirim()">📋 Riwayat kirim</button><button class="btn soft grow" onclick="rkSegar('tabungan',this)">🔄 Perbarui status</button></div><div class="cards"><div class="card stat"><b>${rp(T('akhir'))}</b>Total saldo akhir</div><div class="card stat"><b>${rp(T('masuk'))}</b>Masuk ${fmtB(tabBln)}</div><div class="card stat"><b>${rp(T('keluar'))}</b>Keluar ${fmtB(tabBln)}</div></div>`+tab(['No','Nama',tabK==='*'?'Kelas':'Wali kelas','Saldo awal','Masuk','Keluar','Saldo akhir','Status pesan','Aksi'],rows,tabK==='*'?'Tidak ada data tabungan siswa.':'Tidak ada siswa di kelas ini.')}
function tabRiwBulan(id){const d=(tabRekD||[]).find(x=>x.r.siswa_id===id);if(!d)return;info('Riwayat '+d.r.nama+' - '+fmtB(tabBln),tab(['Tanggal','Jam','Jenis','Masuk','Keluar','Catatan','Dicatat oleh'],d.bl.slice().sort(tabCmp).reverse().map(x=>`<tr><td>${fmt(x.tanggal)}</td><td>${jamJkt(x.dibuat)}</td><td>${tabJenis(x)}</td><td style="text-align:right">${x.jenis==='setor'?rp(x.jumlah):''}</td><td style="text-align:right">${x.jenis==='tarik'?rp(x.jumlah):''}</td><td>${esc(tabCat(x))}</td><td>${esc(x.nama_pencatat||'-')}</td></tr>`).join(''),'Tidak ada transaksi bulan ini.'))}
function tabUnduhK(t,btn){const D=tabRekD||[];if(!D.length)return toast(tabK==='*'?'Tidak ada data tabungan siswa':'Tidak ada siswa di kelas ini',false);const sem=tabK==='*',T=k=>D.reduce((a,d)=>a+d[k],0),w=sem?'':tabWali(tabK);
 if(sem)return tabUnduhSemuaKelas(t,btn,D);
 const rows=D.map((d,i)=>[i+1,d.r.nama,w,d.awal,d.masuk,d.keluar,d.akhir]).concat([['','JUMLAH','',T('awal'),T('masuk'),T('keluar'),T('akhir')]]);
 tabBerkas(t,'rekap-tabungan-kelas-'+tabK.replace(/[^\\w]+/g,'-')+'-'+tabBln,'REKAP TABUNGAN KELAS','Kelas '+tabK+'  |  Wali kelas: '+w+'  |  Bulan '+fmtB(tabBln),['No','Nama','Wali kelas','Saldo awal (Rp)','Masuk (Rp)','Keluar (Rp)','Saldo akhir (Rp)'],rows,tabK,btn,[3,4,5,6])}
async function tabUnduhSemuaKelas(t,btn,D){
 await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,'Membuat rekap semua kelas...'))return;
 try{await jedaUnduh();const G=S.kelas.map(k=>[k.nama,D.filter(x=>x.r.kelas_nama===k.nama)]).filter(x=>x[1].length);if(!G.length)throw new Error('Tidak ada data rekap tabungan untuk kelas ini');
  const nf='rekap-tabungan-semua-kelas-'+tabBln;
  if(t==='xlsx'){
   const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();const used=new Set();
   for(const [k,list] of G){const ws=wb.addWorksheet(namaSheetSiswa(k,used));ws.columns=[{width:6},{width:32},{width:24},{width:18},{width:18},{width:18},{width:18}];
    ws.addRow(['REKAP TABUNGAN SISWA - '+ns()]);ws.mergeCells(1,1,1,7);ws.getRow(1).font={bold:true,size:14};
    ws.addRow(['Kelas '+k+' | Wali kelas: '+(ttdWali(k)?.nama||'-')+' | Bulan '+fmtB(tabBln)]);ws.mergeCells(2,1,2,7);
    ws.addRow(['No','Nama','Wali kelas','Saldo awal (Rp)','Masuk (Rp)','Keluar (Rp)','Saldo akhir (Rp)']);ws.getRow(3).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6B46C1'}};c.alignment={horizontal:'center',vertical:'middle'}});
    const sum=a=>list.reduce((v,x)=>v+x[a],0);list.forEach((x,i)=>ws.addRow([i+1,x.r.nama,ttdWali(k)?.nama||'-',x.awal,x.masuk,x.keluar,x.akhir]));ws.addRow(['','JUMLAH','',sum('awal'),sum('masuk'),sum('keluar'),sum('akhir')]);
    const row=ws.rowCount+2;await xlsxTtdRekap(wb,ws,k,row,1,5,6);ws.getCell(row+5,1).value='Wali Kelas: '+(ttdWali(k)?.nama||'-');ws.getCell(row+5,6).value='Kepala Sekolah: '+(ttdKepsek().nama||'-');if(ttdKepsek().nip)ws.getCell(row+6,6).value='NIP. '+ttdKepsek().nip;
   }
   await tulisXlsx(wb,nf+'.xlsx');
  }else{
   const d=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
   for(let i=0;i<G.length;i++){if(i)d.addPage();const [k,list]=G[i],sum=a=>list.reduce((v,x)=>v+x[a],0);
    d.setFont('helvetica','bold');d.setFontSize(13);d.text('REKAP TABUNGAN SISWA - '+ns().toUpperCase(),105,14,{align:'center'});
    d.setFont('helvetica','normal');d.setFontSize(8.5);d.text('Kelas '+k+' | Wali kelas: '+(ttdWali(k)?.nama||'-')+' | Bulan '+fmtB(tabBln)+' | Dicetak '+fmt(TODAY),105,20,{align:'center'});
    const body=list.map((x,n)=>[n+1,x.r.nama,ttdWali(k)?.nama||'-',rp(x.awal),rp(x.masuk),rp(x.keluar),rp(x.akhir)]).concat([['','JUMLAH','',rp(sum('awal')),rp(sum('masuk')),rp(sum('keluar')),rp(sum('akhir'))]]);
    d.autoTable({startY:27,head:[['No','Nama','Wali kelas','Saldo awal','Masuk','Keluar','Saldo akhir']],body,theme:'grid',styles:{fontSize:8,cellPadding:1.6},headStyles:{fillColor:[107,70,193],halign:'center'},columnStyles:{0:{halign:'center',cellWidth:9},1:{cellWidth:44},2:{cellWidth:34},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'}}});
    let y=d.lastAutoTable.finalY+10;if(y+42>285){d.addPage();y=20}await pdfTtdRekap(d,k,y);
   }
   d.save(nf+'.pdf');
  }
  toast('Rekap tabungan semua kelas berhasil disiapkan ('+G.length+' kelas)')}
 catch(e){toast('Gagal mengunduh rekap tabungan: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}
}
function pesanTab(d){const s=d.r;return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_\n\nBerikut laporan tabungan ananda.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas_nama+'\nBulan : *'+fmtB(tabBln)+'*\ndi '+ns()+'\n\nSaldo awal: '+rp(d.awal)+'\nTotal masuk: '+rp(d.masuk)+'\nTotal keluar: '+rp(d.keluar)+'\n*Saldo akhir: '+rp(d.akhir)+'*\n\n📝*RIWAYAT TABUNGAN*\n\n'+(d.bl.length?d.bl.map((x,i)=>(i+1)+'. '+fmt(x.tanggal)+'  '+(x.jenis==='setor'?'Setor +':'Tarik -')+rp(x.jumlah)).join('\n'):'Tidak ada transaksi bulan ini.')+'\n\nTerima kasih 🙏🏻\n_Waalaikumsalam warahmatullahi wabarakatuh_'}
const tabPesan=s=>pesanTab((tabRekD||[]).find(d=>d.r.siswa_id===s.id));
async function tabKirim(id){const s=siswaById(id);if(!s||!s.wa)return toast('Orang tua belum punya nomor WhatsApp',false);if(await konfirmasi('Kirim laporan tabungan '+fmtB(tabBln)+' '+s.pan+' ke '+s.wa+'?',{judul:'Kirim laporan',ikon:'📤',ya:'Kirim'}))kirimList([s],tabPesan)}
async function tabKirimSemua(){const l=(tabRekD||[]).map(d=>siswaById(d.r.siswa_id)).filter(Boolean);if(!l.length)return toast('Tidak ada anak',false);if(await konfirmasi('Kirim laporan tabungan '+fmtB(tabBln)+' ke '+l.length+' orang tua sekarang?'+(l.length>1?'\n\nPesan dijadwalkan bertahap (jeda 15-30 detik per anak), perkiraan semua terkirim '+estJadwal(l.length)+'. Halaman boleh ditutup setelah proses penjadwalan selesai (beberapa detik).':''),{judul:'Kirim semua laporan',ikon:'📤',ya:'Kirim'}))kirimList(l,tabPesan)}
async function tabBerkas(t,nm,judul,sub,head,rows,kls,btn,num){await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,'Membuat berkas...'))return;
 try{await jedaUnduh();const tg=ttdKepsek(),wl=ttdWali(kls),n=head.length,nu=num||[];
  if(t==='pdf'){const d=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),cs={};nu.forEach(i=>cs[i]={halign:'right'});
   d.setFont('helvetica','bold');d.setFontSize(13);d.text(judul+' - '+ns().toUpperCase(),105,14,{align:'center'});d.setFont('helvetica','normal');d.setFontSize(8.5);d.text(d.splitTextToSize(sub,180),105,20,{align:'center'});
   d.autoTable({startY:28,head:[head],body:rows.map(r=>r.map((v,i)=>nu.includes(i)&&v!==''?Number(v).toLocaleString('id-ID'):String(v))),columnStyles:cs,theme:'grid',styles:{fontSize:8,cellPadding:1.6},headStyles:{fillColor:[118,80,184],halign:'center'}});
   let y=d.lastAutoTable.finalY+10;if(y+42>285){d.addPage();y=20}
   await pdfTtdRekap(d,kls,y);d.save(nm+'.pdf')}
  else{await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
   const F='Arial',wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Tabungan'),mid={vertical:'middle',horizontal:'center'},fl=a=>({type:'pattern',pattern:'solid',fgColor:{argb:a}});
   const mg=(r,a,b,v,o)=>{if(a<b)ws.mergeCells(r,a,r,b);const c=ws.getCell(r,a);c.value=v;c.font=Object.assign({name:F,size:10},o||{});c.alignment=mid;return c};
   let c=mg(1,1,n,judul+' - '+ns().toUpperCase(),{size:13,bold:true,color:{argb:'FFFFFFFF'}});c.fill=fl('FF7650B8');ws.getRow(1).height=26;c=mg(2,1,n,sub,{size:9,color:{argb:'FF4B3A75'}});c.fill=fl('FFEEE5FB');
   head.forEach((h,i)=>{const x=ws.getCell(4,i+1);x.value=h;x.font={name:F,size:10,bold:true,color:{argb:'FFFFFFFF'}};x.fill=fl('FF7650B8');x.alignment=mid});
   rows.forEach((r,j)=>r.forEach((v,i)=>{const x=ws.getCell(5+j,i+1);x.value=nu.includes(i)&&v!==''?Number(v):v;x.font={name:F,size:10};if(nu.includes(i))x.numFmt='#,##0';x.border={bottom:{style:'hair',color:{argb:'FFCFD9D3'}}}}));
   for(let i=1;i<=n;i++)ws.getColumn(i).width=Math.min(40,Math.max(12,...[head[i-1]].concat(rows.map(r=>r[i-1])).map(v=>String(v==null?'':v).length+3)));
   const r0=5+rows.length+2,a2=Math.max(2,Math.floor(n/3)),b1=Math.max(a2+1,n-a2+1),B={name:F,size:10,bold:true},N={name:F,size:10};[2,3,4].forEach(i=>{ws.getRow(r0+i).height=18});
   mg(r0,b1,n,tg.kota?{richText:[{text:tg.kota+',',font:B},{text:' '+tg.tgl,font:N}]}:tg.tgl);mg(r0+1,b1,n,'( Kepala Sekolah )');mg(r0+5,b1,n,tg.nama||'................................',{bold:true,underline:true});if(tg.nip)mg(r0+6,b1,n,'Nip. '+tg.nip);
   if(wl){mg(r0,1,a2,{richText:[{text:'Mengetahui,',font:B},{text:' Wali kelas',font:N}]});mg(r0+1,1,a2,'( '+wl.kelas+' )');mg(r0+5,1,a2,wl.nama,{bold:true,underline:true});if(wl.nip)mg(r0+6,1,a2,'Nip. '+wl.nip)}
   await xlsxTtdRekap(wb,ws,kls,r0+1,1,b1-1,b1);await tulisXlsx(wb,nm+'.xlsx')}
  toast('Berkas '+(t==='xlsx'?'XLSX':'PDF')+' sedang diproses, mohon ditunggu')}catch(e){toast('Gagal mengunduh: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

const tabJenis=x=>x.sumber==='pembatalan'?'Pembatalan':x.sumber==='saldo_awal'?'Saldo awal':x.jenis==='setor'?'Setor':'Tarik';
function tabRiwayat(sid){const r=(S.tab||[]).find(x=>x.siswa_id===sid)||{nama:'',saldo:0};
 guard(async()=>{const t=await dbq(db.from('tabungan_transaksi').select('*').eq('siswa_id',sid).order('id',{ascending:false}).limit(200));
  const batal=new Set(t.filter(x=>x.membatalkan_id).map(x=>x.membatalkan_id));
  const baris=t.map(x=>`<tr style="${batal.has(x.id)?'opacity:.5;text-decoration:line-through':''}"><td>${fmt(x.tanggal)}</td><td>${tabJenis(x)}</td><td style="text-align:right;color:${x.jenis==='setor'?'#1f9d55':'#d64545'}">${x.jenis==='setor'?'+':'−'}${rp(x.jumlah)}</td><td>${esc(x.catatan||'')}<div class="mu">${esc(x.nama_pencatat||'')}</div></td><td>${x.sumber==='manual'&&!batal.has(x.id)?`<button class="btn sm danger" onclick="tabBatal(${x.id},${sid})">Batalkan</button>`:''}</td></tr>`).join('');
  info('Riwayat - '+r.nama+' (saldo '+rp(r.saldo)+')',t.length?tab(['Tanggal','Jenis','Jumlah','Catatan','Aksi'],baris):'<div class="mu">Belum ada transaksi.</div>')})}
function tabBatal(id,sid){form('Batalkan transaksi',[{k:'a',l:'Alasan pembatalan (wajib)'}],async v=>{
  if((v.a||'').trim().length<3)throw new Error('Isi alasan pembatalan');
  await dbq(db.rpc('tabungan_batalkan',{p_id:id,p_alasan:v.a.trim()}));await muatTabungan();await tabMuatRw();toast('Transaksi dibatalkan');renderV()});$('#ms').textContent='Batalkan transaksi'}
function sheetTabungan(wb,nama,rows,kls){
 const F='Arial',ws=wb.addWorksheet(String(nama).replace(/[\\\/\?\*\[\]:]/g,'-').slice(0,31),{pageSetup:{orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0}});
 const fl=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}),ln={style:'thin',color:{argb:'FFCFD9D3'}},bd={top:ln,left:ln,bottom:ln,right:ln},mid={horizontal:'center',vertical:'middle'};
 ws.columns=[{width:6},{width:34},{width:18},{width:16},{width:18}];
 ws.mergeCells(1,1,1,5);ws.mergeCells(2,1,2,5);
 const a=ws.getCell(1,1);a.value='REKAP TABUNGAN SISWA - '+ns().toUpperCase();a.font={name:F,size:13,bold:true,color:{argb:'FFFFFFFF'}};a.fill=fl('FF6B46C1');a.alignment=mid;ws.getRow(1).height=26;
 const b=ws.getCell(2,1);b.value=(kls?'Kelas '+kls:'Semua kelas')+'   |   Per '+fmt(TODAY);b.font={name:F,size:10,color:{argb:'FFFFFFFF'}};b.fill=fl('FF6B46C1');b.alignment=mid;
 ['No','Nama','NISN','Kelas','Saldo (Rp)'].forEach((h,i)=>{const c=ws.getCell(4,i+1);c.value=h;c.font={name:F,size:10,bold:true};c.fill=fl('FFE9E3F7');c.border=bd;c.alignment=mid});
 let r=5,tot=0;rows.forEach((x,i)=>{tot+=Number(x.saldo);[i+1,x.nama,x.nisn||'',x.kelas_nama||'',Number(x.saldo)].forEach((val,j)=>{const c=ws.getCell(r,j+1);c.value=val;c.font={name:F,size:10};c.border=bd;c.alignment={vertical:'middle',horizontal:j===4?'right':j===1?'left':'center'};if(j===4)c.numFmt='#,##0';if(j===2)c.numFmt='@'});r++});
 ws.mergeCells(r,1,r,4);const t=ws.getCell(r,1);t.value='TOTAL';t.font={name:F,size:10,bold:true};t.alignment={horizontal:'right'};t.border=bd;const tv=ws.getCell(r,5);tv.value=tot;tv.numFmt='#,##0';tv.font={name:F,size:10,bold:true};tv.border=bd;tv.alignment={horizontal:'right'};
 const tg=ttdKepsek(bulan),wl=kls?ttdWali(kls):null,r0=r+3;
 const blok=(c1,c2,rr,val,o)=>{ws.mergeCells(rr,c1,rr,c2);const x=ws.getCell(rr,c1);x.value=val;x.font=Object.assign({name:F,size:10},o||{});x.alignment=mid};
 blok(4,5,r0,(tg.kota?tg.kota+', ':'')+tg.tgl);blok(4,5,r0+1,'( Kepala Sekolah )');blok(4,5,r0+5,tg.nama||'................................',{bold:true,underline:true});if(tg.nip)blok(4,5,r0+6,'Nip. '+tg.nip);
 if(wl){blok(1,3,r0,'Mengetahui, Wali kelas');blok(1,3,r0+1,'( '+wl.kelas+' )');blok(1,3,r0+5,wl.nama,{bold:true,underline:true});if(wl.nip)blok(1,3,r0+6,'Nip. '+wl.nip)}
 ws.views=[{state:'frozen',ySplit:4}];return ws}
function unduhTabungan(jenis){guard(async()=>{await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat. Muat ulang halaman');
 const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();const nf=ns().replace(/[^\w]+/g,'-');
 if(jenis==='rekap'){const d=(S.tab||[]).filter(r=>Number(r.saldo)!==0||r.aktif);
  const wsAll=sheetTabungan(wb,'Semua kelas',d,'');await xlsxTtdRekap(wb,wsAll,'',wsAll.rowCount-5,1,3,4);for(const k of S.kelas){const x=d.filter(r=>r.kelas_nama===k.nama);if(x.length){const ws=sheetTabungan(wb,k.nama,x,k.nama);await xlsxTtdRekap(wb,ws,k.nama,ws.rowCount-5,1,3,4)}}
  await tulisXlsx(wb,'Rekap-Tabungan-'+nf+'-'+TODAY+'.xlsx');toast('Rekap tabungan sedang diproses, mohon ditunggu');return}
 const semua=[];for(let a=0;a<50000;a+=1000){const p=await dbq(db.from('tabungan_transaksi').select('*').order('id',{ascending:true}).range(a,a+999));semua.push(...p);if(p.length<1000)break}
 const ws=wb.addWorksheet('Riwayat'),H=['Tanggal','Nama','NISN','Kelas','Jenis','Jumlah (Rp)','Catatan','Dicatat oleh','Waktu catat'];
 ws.columns=[{width:12},{width:30},{width:16},{width:14},{width:14},{width:16},{width:40},{width:22},{width:18}];
 H.forEach((h,i)=>{const c=ws.getCell(1,i+1);c.value=h;c.font={bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9E3F7'}}});
 semua.forEach((x,i)=>{const r=i+2,v=[x.tanggal,x.nama_siswa,x.nisn||'',x.kelas_nama||'',tabJenis(x),(x.jenis==='setor'?1:-1)*Number(x.jumlah),x.catatan||'',x.nama_pencatat||'',new Date(x.dibuat).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})];v.forEach((val,j)=>{const c=ws.getCell(r,j+1);c.value=val;if(j===5)c.numFmt='#,##0;[Red]-#,##0';if(j===2)c.numFmt='@'})});
 ws.views=[{state:'frozen',ySplit:1}];await xlsxTtdRekap(wb,ws,'',ws.rowCount+2,1,6,7);
 await tulisXlsx(wb,'Riwayat-Tabungan-'+nf+'-'+TODAY+'.xlsx');toast('Riwayat tabungan sedang diproses ('+semua.length+' baris), mohon ditunggu')})}
function addKelas(){form('Tambah Kelas',[{k:'nama',l:'Nama kelas'},{k:'jam',l:'Batas jam masuk',t:'time',v:'07:30'}],async v=>{if(!v.nama||S.kelas.some(k=>k.nama===v.nama))throw new Error('Nama kelas kosong atau sudah ada');await dbq(db.from('kelas').insert({nama:v.nama,jam_masuk:v.jam||'07:30'}));await muatDasar();renderV()})}
function ubahKelas(id){const k=S.kelas.find(x=>x.id===id);form('Ubah nama kelas',[{k:'nama',l:'Nama kelas',v:k.nama}],async v=>{if(!v.nama)throw new Error('Nama kelas wajib diisi');if(S.kelas.some(x=>x.id!==id&&x.nama.toLowerCase()===v.nama.toLowerCase()))throw new Error('Nama kelas sudah dipakai');await dbq(db.from('kelas').update({nama:v.nama}).eq('id',id));await muatDasar();toast('Nama kelas diubah');renderV()})}
const setJam=(id,j)=>guard(async()=>{await dbq(db.from('kelas').update({jam_masuk:j}).eq('id',id));await muatDasar();toast('Jam masuk disimpan')});
async function delKelas(id){const k=S.kelas.find(x=>x.id===id);if(S.siswa.some(s=>s.kelas_id===id))return toast('Masih ada siswa di kelas ini',false);if(!await konfirmasi('Hapus kelas '+k.nama+'?',{judul:'Hapus kelas',ya:'Hapus',bahaya:1}))return;guard(async()=>{await dbq(db.from('kelas').delete().eq('id',id));await muatDasar();renderV()})}
