/* Kelompok fitur: jadwal piket, jenis penugasan, dan sakelar notifikasi terkait. */
/* ---------- Jadwal Piket dan Hafalan ---------- */
async function pgAll(mk){const o=[];for(let a=0;a<50000;a+=1000){const p=await dbq(mk().range(a,a+999));o.push(...(p||[]));if(!p||p.length<1000)break}return o}
const dbMsg=e=>{const m=String((e&&e.message)||e||'');return /duplicate key|_uq\b|_nama_uq/i.test(m)?'Data dengan isi yang sama sudah ada':m};
const pkTry=async f=>{try{return await f()}catch(e){throw new Error(dbMsg(e))}};
const setFitur=(o,msg)=>guard(async()=>{try{await dbq(db.from('pengaturan').update(o))}catch(e){renderV();throw e}await muatDasar();S.pkJenis=null;S.hfJenis=null;toast(msg);renderAll()});
const setPiket=on=>setFitur({piket_aktif:!!on},on?'Jadwal piket diaktifkan. Menu Jadwal Piket sekarang tersedia':'Jadwal piket dinonaktifkan. Data tetap tersimpan');
const setNotifPiket=on=>setFitur({notif_piket_aktif:!!on},on?'Pengingat piket ke orang tua diaktifkan':'Pengingat piket ke orang tua dimatikan');
const setNotifAbsensi=on=>setFitur({notif_absensi_aktif:!!on},on?'Notifikasi absensi ke orang tua diaktifkan':'Notifikasi absensi ke orang tua dimatikan');
const setNotifTabungan=on=>setFitur({notif_tabungan_aktif:!!on},on?'Notifikasi tabungan ke orang tua diaktifkan':'Notifikasi tabungan ke orang tua dimatikan');
const setNotifHafalan=on=>setFitur({notif_hafalan_aktif:!!on},on?'Notifikasi Hafalan ke orang tua diaktifkan':'Notifikasi Hafalan ke orang tua dimatikan');
const setHafalan=on=>setFitur({hafalan_aktif:!!on},on?'Hafalan diaktifkan. Menu Hafalan sekarang tersedia':'Hafalan dinonaktifkan. Data tetap tersimpan');
const LOADING_FITUR=t=>`<div class="panel"><div class="pb"><div class="note">⏳ Memuat ${t}...</div></div></div>`;
const pkKelasOpt=()=>S.kelas.map(k=>({value:k.nama,label:k.nama}));

/* --- Piket --- */
let pkTab='jadwal',pkJ=0,pkK='';
const pkCakL={kelas:'Per kelas',semua:'Seluruh kelas'},pkCakV={'Per kelas':'kelas','Seluruh kelas':'semua'};
async function muatPiket(){const [j,d]=await Promise.all([dbq(db.from('piket_jenis').select('*').order('urutan').order('id')),pgAll(()=>db.from('piket_jadwal').select('*').order('id'))]);S.pkJenis=j||[];S.pkJadwal=d||[];if(!S.pkJenis.some(x=>x.id===pkJ))pkJ=S.pkJenis[0]?S.pkJenis[0].id:0}
V.piket=()=>{if(!S.pkJenis)return LOADING_FITUR('jadwal piket');
 const hal=[['jadwal','📅 Jadwal'],['jenis','🏷️ Jenis piket']];
 return `<div class="panel"><div class="ph">🧹 Jadwal Piket</div><div class="pb"><div class="utabs">${hal.map(x=>`<button class="utab${pkTab===x[0]?' on':''}" onclick="pkHal('${x[0]}')">${x[1]}</button>`).join('')}</div>${pkTab==='jenis'?pkJenisHTML():pkJadwalHTML()}</div></div>`};
const pkHal=p=>{pkTab=p;renderV()};
const pkPilihJ=id=>{pkJ=id;renderV()},pkPilihK=v=>{pkK=v;renderV()};
function pkJenisHTML(){
 const rows=S.pkJenis.map(j=>{const n=S.pkJadwal.filter(x=>x.jenis_id===j.id).length;
  return `<tr><td><b>${esc(j.nama)}</b>${j.keterangan?`<div class="mu">${esc(j.keterangan)}</div>`:''}</td><td>${pkCakL[j.cakupan]}</td><td>${n}</td><td><div class="tb" style="margin:0;flex-wrap:wrap"><button class="btn sm soft" onclick="pkUbahJenis(${j.id})">✏ Ubah</button><button class="btn sm danger" onclick="pkHapusJenis(${j.id})">Hapus</button></div></td></tr>`}).join('');
 return `<div class="note">Semua guru boleh menambah, mengubah, dan menghapus jenis piket. <b>Per kelas</b>: pilih anak dalam satu kelas. <b>Seluruh kelas</b>: dapat berupa kelas utuh atau gabungan siswa dari berbagai kelas. Cakupan hanya dapat diubah oleh Kepala Sekolah, Wakil, atau Operator.</div><div class="tb"><button class="btn success" onclick="pkTambahJenis()">+ Tambah jenis</button></div>`+tab(['Jenis','Cakupan','Jadwal','Aksi'],rows,'Belum ada jenis piket.')}
function pkTambahJenis(){form('Tambah jenis piket',[{k:'nama',l:'Nama jenis (contoh: Piket kelas, Piket halaman)'},{k:'cak',l:'Cakupan',o:['Per kelas','Seluruh kelas']},{k:'ket',l:'Keterangan (opsional)'}],async v=>{
 if(!v.nama)throw new Error('Nama jenis wajib diisi');
 await pkTry(()=>dbq(db.from('piket_jenis').insert({nama:v.nama,cakupan:pkCakV[v.cak]||'kelas',keterangan:v.ket||null,urutan:S.pkJenis.length+1,dibuat_oleh:me})));
 await muatPiket();renderV();toast('Jenis piket ditambahkan')})}
function pkUbahJenis(id){const j=S.pkJenis.find(x=>x.id===id);if(!j)return;const kep=adalahKepala();
 form('Ubah jenis piket',[{k:'nama',l:'Nama jenis',v:j.nama},{k:'ket',l:'Keterangan (opsional)',v:j.keterangan||''},kep?{k:'cak',l:'Cakupan (hanya Kepala Sekolah dan Wakil)',o:['Per kelas','Seluruh kelas'],v:pkCakL[j.cakupan]}:{k:'cak',l:'Cakupan (hanya Kepala Sekolah dan Wakil yang dapat mengubah)',ro:1,v:pkCakL[j.cakupan]}],async v=>{
 if(!v.nama)throw new Error('Nama jenis wajib diisi');
 const baru=kep?(pkCakV[v.cak]||j.cakupan):j.cakupan,n=S.pkJadwal.filter(x=>x.jenis_id===id).length;
 if(baru!==j.cakupan&&n>0&&!await konfirmasi('Mengubah cakupan menjadi "'+pkCakL[baru]+'" akan menghapus '+n+' jadwal di jenis ini. Lanjutkan?',{bahaya:1,judul:'Ubah cakupan',ya:'Ubah dan hapus jadwal'}))throw new Error('Perubahan dibatalkan');
 await pkTry(()=>dbq(db.from('piket_jenis').update({nama:v.nama,keterangan:v.ket||null}).eq('id',id)));
 if(baru!==j.cakupan)await pkTry(()=>dbq(db.rpc('piket_ubah_cakupan',{p_jenis:id,p_cakupan:baru})));
 await muatPiket();renderV();toast('Jenis piket disimpan')})}
async function pkHapusJenis(id){const j=S.pkJenis.find(x=>x.id===id);if(!j)return;const n=S.pkJadwal.filter(x=>x.jenis_id===id).length;
 if(!await konfirmasi('Hapus jenis "'+j.nama+'"?'+(n?' '+n+' jadwal di dalamnya ikut terhapus.':''),{bahaya:1,judul:'Hapus jenis piket',ya:'Hapus'}))return;
 guard(async()=>{await dbq(db.from('piket_jenis').delete().eq('id',id));await muatPiket();renderV();toast('Jenis piket dihapus')})}
function pkJadwalHTML(){
 if(!S.pkJenis.length)return '<div class="note">Belum ada jenis piket. Buat dulu di tab Jenis piket.</div><div class="tb"><button class="btn success" onclick="pkHal(\'jenis\');pkTambahJenis()">+ Tambah jenis</button></div>';
 const j=S.pkJenis.find(x=>x.id===pkJ)||S.pkJenis[0],kl=S.kelas.find(k=>k.nama===pkK);
 const chips=`<div class="chips kecil">${S.pkJenis.map(x=>`<button class="chip ${x.id===j.id?'on':''}" onclick="pkPilihJ(${x.id})">${esc(x.nama)}</button>`).join('')}</div>`;
 const pilK=j.cakupan==='kelas'? `<div class="tb tab-choice" style="margin-top:14px">${cpick('pkKelasPick','kelas',pkK,pkKelasOpt(),'pkPilihK','Pilih kelas')}</div>`:'';
 if(j.cakupan==='kelas'&&!kl)return chips+pilK+PKH;
 const x_=id=>`<button type="button" class="pk-x" aria-label="Hapus" onclick="pkHapusBaris(${id})">✕</button>`;
 const kartu=[1,2,3,4,5,6,0].filter(d=>!S.mingguan.includes(d)).map(d=>{
  const rows=S.pkJadwal.filter(x=>x.jenis_id===j.id&&x.hari===d&&(j.cakupan==='semua'||x.kelas_id===kl.id));let isi;
  if(j.cakupan==='kelas'){
   isi=rows.map(x=>({x,s:siswaById(x.siswa_id)})).sort((a,b)=>String(a.s?a.s.nama:'').localeCompare(String(b.s?b.s.nama:''),'id')).map((o,n)=>`<div class="pkrow"><span>${n+1}. ${esc(o.s?o.s.nama:'?')}</span>${x_(o.x.id)}</div>`).join('');
  }else{
   isi=rows.map(x=>{
    if(x.mode_penugasan==='siswa_gabungan'){
     const s=siswaById(x.siswa_id),k=S.kelas.find(y=>y.id===x.kelas_id);
     return `<div class="pkrow"><span>${esc(s?s.nama:'Siswa tidak ditemukan')} <small class="mu">· Kelas ${esc(k?k.nama:'?')}</small></span>${x_(x.id)}</div>`;
    }
    const k=S.kelas.find(y=>y.id===x.kelas_id);
    return `<div class="tb" style="margin:4px 0;justify-content:space-between"><span><b>${x.kelas_id==null?'Seluruh kelas':'Kelas '+esc(k?k.nama:'?')}</b>${x.catatan?` <span class="mu">· ${esc(x.catatan)}</span>`:''}</span>${x_(x.id)}</div>`;
   }).join('');
  }
  return `<div class="pkday"><b>${HR[d]}</b><div style="margin-top:6px">${isi||'<span class="mu">Belum ada jadwal</span>'}</div><div class="tb" style="margin:8px 0 0"><button class="btn sm success" onclick="pkTambah(${d})">+ Tambah</button></div></div>`;
 }).join('');
 return chips+pilK+`<div class="note">Untuk cakupan seluruh kelas, jadwal dapat dibuat sebagai <b>kelas utuh</b> atau <b>gabungan siswa dari berbagai kelas</b>. Pengingat dikirim sesuai kelas dan anak yang ditugaskan.</div>`+kartu
}
const pkTambah=d=>{const j=S.pkJenis.find(x=>x.id===pkJ);if(!j)return;j.cakupan==='kelas'?pkTambahAnak(d):pkTambahSemua(d)};
function pkTambahAnak(d){const j=S.pkJenis.find(x=>x.id===pkJ),kl=S.kelas.find(k=>k.nama===pkK);if(!j||!kl)return;
 const ada=new Set(S.pkJadwal.filter(x=>x.jenis_id===j.id&&x.hari===d).map(x=>x.siswa_id)),sis=S.siswa.filter(s=>s.aktif&&s.kelas_id===kl.id&&!ada.has(s.id));
 if(!sis.length)return toast('Semua anak aktif di kelas ini sudah terjadwal pada hari tersebut',false);
 resetTutup();$('#mt').textContent=HR[d]+' · '+j.nama+' · Kelas '+kl.nama;
 $('#mbd').innerHTML=`<div class="note">Centang anak yang piket.</div><div id="pkCek">${sis.map(s=>`<label class="cbl" style="display:flex;gap:8px;padding:6px 0"><input type="checkbox" value="${s.id}"> ${esc(s.nama)}</label>`).join('')}</div><div class="fd" style="margin-top:8px"><label class="l">Catatan (opsional)</label><input id="pkCat" class="input" maxlength="120"></div>`;
 const m=$('#ms');m.style.display='';m.textContent='Simpan';
 const _sim=m.onclick=()=>guard(async()=>{const ids=[...document.querySelectorAll('#pkCek input:checked')].map(x=>+x.value);if(!ids.length)throw new Error('Pilih minimal satu anak');const cat=($('#pkCat').value||'').trim()||null;
  await pkTry(()=>dbq(db.from('piket_jadwal').insert(ids.map(id=>({jenis_id:j.id,hari:d,kelas_id:kl.id,siswa_id:id,mode_penugasan:'siswa_per_kelas',catatan:cat})))));
  closeM();await muatPiket();renderV();toast(ids.length+' anak dijadwalkan');return true});
 $('#md').classList.add('show');jagaModal(HR[d]+' (piket)',_sim)}
function pkTambahSemua(d){
 const j=S.pkJenis.find(x=>x.id===pkJ);if(!j)return;
 const judul=HR[d]+' · '+j.nama;
 const kelas=[...S.kelas].sort((a,b)=>String(a.nama).localeCompare(String(b.nama),'id'));
 const sudahKelas=new Set(S.pkJadwal.filter(x=>x.jenis_id===j.id&&x.hari===d&&x.mode_penugasan==='kelas_utuh'&&x.kelas_id!=null).map(x=>Number(x.kelas_id)));
 const tersediaKelas=kelas.filter(k=>!sudahKelas.has(Number(k.id)));
 const ada=new Set(S.pkJadwal.filter(x=>x.jenis_id===j.id&&x.hari===d&&x.siswa_id!=null).map(x=>Number(x.siswa_id)));
 const tersediaSiswa=act().filter(s=>s.kelas_id!=null&&!ada.has(Number(s.id))).sort((a,b)=>{
  const ka=S.kelas.find(k=>k.id===a.kelas_id),kb=S.kelas.find(k=>k.id===b.kelas_id);
  return String(ka?ka.nama:'').localeCompare(String(kb?kb.nama:''),'id')||String(a.nama).localeCompare(String(b.nama),'id');
 });
 resetTutup();$('#mt').textContent=judul;
 $('#mbd').innerHTML='<div class="fg"><div class="fd"><label class="l">Cara penugasan</label><select id="pkCara" class="select"><option value="">Silakan pilih cara</option><option value="kelas">Semua siswa perkelas</option><option value="gabungan">Gabungan siswa semua kelas</option></select></div></div><div id="pkArea"></div>';
 enhanceCustomSelects($('#mbd'));
 const area=$('#pkArea'),pilih=$('#pkCara'),btn=$('#ms');
 btn.style.display='none';btn.textContent='Simpan';btn.disabled=false;
 let modeAktif='';
 const tampilArea=mode=>{
  modeAktif=mode;
  if(mode==='kelas'){
   if(!tersediaKelas.length){area.innerHTML='<div class="note">Semua kelas sudah memiliki jadwal pada hari tersebut.</div>';btn.style.display='none';return}
   const daftar=tersediaKelas.map(k=>'<label class="cbl" style="display:flex;gap:9px;align-items:center;padding:9px 2px;border-bottom:1px solid var(--ln)"><input type="checkbox" value="'+k.id+'"> <b>'+esc(k.nama)+'</b><span class="mu" style="margin-left:auto">Seluruh siswa</span></label>').join('');
   area.innerHTML='<div class="note">Centang satu atau beberapa kelas. Semua siswa aktif di kelas yang dipilih akan mendapat tugas piket.</div><label class="cbl" style="display:flex;gap:9px;align-items:center;padding:9px 2px;font-weight:800"><input type="checkbox" id="pkPilihSemua"> Pilih semua kelas</label><div id="pkCek">'+daftar+'</div><div class="fd" style="margin-top:8px"><label class="l">Catatan (opsional)</label><input id="pkCat" class="input" maxlength="120"></div>';
  }else{
   if(!tersediaSiswa.length){area.innerHTML='<div class="note">Semua anak aktif sudah terjadwal pada hari tersebut.</div>';btn.style.display='none';return}
   let kelasAktif=null,daftar='';
   tersediaSiswa.forEach(s=>{
    const k=S.kelas.find(x=>x.id===s.kelas_id),namaK=k?k.nama:'Kelas?';
    if(namaK!==kelasAktif){kelasAktif=namaK;daftar+='<div class="tbkh" style="margin-top:10px">'+esc(namaK)+'</div>'}
    daftar+='<label class="cbl" style="display:flex;gap:8px;padding:6px 0"><input type="checkbox" value="'+s.id+'"> '+esc(s.nama)+'</label>';
   });
   area.innerHTML='<div class="note">Pilih siswa dari satu kelas atau beberapa kelas. Setiap anak disimpan dengan ID siswa dan kelas aslinya.</div><label class="cbl" style="display:flex;gap:9px;align-items:center;padding:9px 2px;font-weight:800"><input type="checkbox" id="pkPilihSemua"> Pilih semua siswa</label><div id="pkCek">'+daftar+'</div><div class="fd" style="margin-top:8px"><label class="l">Catatan (opsional)</label><input id="pkCat" class="input" maxlength="120"></div>';
  }
  $('#pkPilihSemua').onchange=e=>document.querySelectorAll('#pkCek input[type=checkbox]').forEach(x=>x.checked=e.target.checked);
  btn.style.display='';btn.disabled=false;
 };
 pilih.onchange=()=>{if(!pilih.value){modeAktif='';area.innerHTML='';btn.style.display='none';return}tampilArea(pilih.value)};
 const simpan=()=>guard(async()=>{
  if(!modeAktif)throw new Error('Silakan pilih cara penugasan terlebih dahulu');
  const ids=[...document.querySelectorAll('#pkCek input:checked')].map(x=>+x.value);
  if(!ids.length)throw new Error(modeAktif==='kelas'?'Pilih minimal satu kelas':'Pilih minimal satu siswa');
  const cat=($('#pkCat').value||'').trim()||null;
  let rows;
  if(modeAktif==='kelas'){
   const byId=new Map(tersediaKelas.map(k=>[Number(k.id),k]));
   rows=ids.map(id=>{const k=byId.get(id);if(!k)throw new Error('Data kelas tidak valid');return {jenis_id:j.id,hari:d,kelas_id:k.id,siswa_id:null,mode_penugasan:'kelas_utuh',catatan:cat}});
  }else{
   const byId=new Map(tersediaSiswa.map(s=>[Number(s.id),s]));
   rows=ids.map(id=>{const s=byId.get(id);if(!s)throw new Error('Data siswa tidak valid');return {jenis_id:j.id,hari:d,kelas_id:s.kelas_id,siswa_id:s.id,mode_penugasan:'siswa_gabungan',catatan:cat}});
  }
  await pkTry(()=>dbq(db.from('piket_jadwal').insert(rows)));
  closeM();await muatPiket();renderV();toast(modeAktif==='kelas'?ids.length+' kelas berhasil dijadwalkan':ids.length+' siswa gabungan dijadwalkan');return true;
 });
 btn.onclick=simpan;
 $('#md').classList.add('show');jagaModal(judul,simpan);
}
async function pkHapusBaris(id){const x=S.pkJadwal.find(y=>y.id===id);if(!x)return;const s=siswaById(x.siswa_id);
 if(!await konfirmasi('Hapus jadwal '+(s?s.nama+' ':'')+'pada hari '+HR[x.hari]+'?',{bahaya:1,judul:'Hapus jadwal piket',ya:'Hapus'}))return;
 guard(async()=>{await dbq(db.from('piket_jadwal').delete().eq('id',id));await muatPiket();renderV();toast('Jadwal dihapus')})}

