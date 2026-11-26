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
