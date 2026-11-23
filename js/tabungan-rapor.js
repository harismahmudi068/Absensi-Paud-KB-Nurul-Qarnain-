/* ---------- Tabungan Siswa ---------- */
let tabK='',tabQ='';
async function muatTabungan(){const a=await dbq(db.rpc('tabungan_saldo',{p_sekolah:SEK}));S.tab=a||[];if(tabP==='rek'&&tabK)await tabRekRaw()}
const fmtIn=v=>String(v||'').replace(/\D/g,'').replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
let tabP='in',tabS=0,tabBln=TODAY.slice(0,7),tabRw=[],tabRekD=null;
const tabWali=k=>{const w=ttdWali(k);return w?w.nama:'-'},tabAdaWali=k=>{const x=S.kelas.find(c=>c.nama===k);return !!x&&x.wali===me};
async function tabHal(p){if(p!==tabP&&!await jagaTanya(['tabungan'])){renderV();return}tabP=p;if(p!=='rek'&&tabK==='*'){tabK='';tabS=0;tabRw=[]}tabRekD=null;renderV();if(p==='rek')tabMuatRek()}
async function tabPilihK(v){if(v!==tabK&&!await jagaTanya(['tabungan'])){renderV();return}tabK=v;tabS=0;tabRw=[];tabRekD=null;renderV();if(tabP==='rek'&&v)tabMuatRek()}
async function tabPilihS(v){if((Number(v)||0)!==tabS&&!await jagaTanya(['tabungan'])){renderV();return}tabS=Number(v)||0;guard(async()=>{await tabMuatRw();renderV()})}
function tabSetBln(v){if(!/^\d{4}-\d{2}$/.test(v||''))return;tabBln=v;tabRekD=null;renderV();tabMuatRek()}
async function tabMuatRw(){tabRw=tabS?(await dbq(db.from('tabungan_transaksi').select('*').eq('siswa_id',tabS).order('id',{ascending:true}).limit(5000)))||[]:[]}
async function tabRekRaw(){const sem=tabK==='*',kx=n=>{const i=S.kelas.findIndex(k=>k.nama===n);return i<0?999:i},ids=(sem?S.tab.filter(r=>Number(r.saldo)!==0||r.aktif).slice().sort((a,b)=>kx(a.kelas_nama)-kx(b.kelas_nama)||String(a.nama).localeCompare(String(b.nama),'id')):S.tab.filter(r=>r.kelas_nama===tabK)).map(r=>r.siswa_id);if(!ids.length){tabRekD=[];return}
 const y=+tabBln.slice(0,4),m=+tabBln.slice(5,7),aw=tabBln+'-01',ak=tabBln+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0'),all=[];
 for(let a=0;a<50000;a+=1000){const p=await dbq(db.from('tabungan_transaksi').select('*').in('siswa_id',ids).lte('tanggal',ak).order('id',{ascending:true}).range(a,a+999));all.push(...p);if(p.length<1000)break}
 const net=l=>l.reduce((a,x)=>a+(x.jenis==='setor'?1:-1)*Number(x.jumlah),0),sum=(l,j)=>l.filter(x=>x.jenis===j).reduce((a,x)=>a+Number(x.jumlah),0);
 tabRekD=ids.map(id=>{const t=all.filter(x=>x.siswa_id===id),bl=t.filter(x=>x.tanggal>=aw),awl=net(t.filter(x=>x.tanggal<aw));return{r:S.tab.find(x=>x.siswa_id===id),bl,awal:awl,masuk:sum(bl,'setor'),keluar:sum(bl,'tarik'),akhir:awl+net(bl)}})}
function tabMuatRek(){if(!tabK)return;guard(async()=>{await tabRekRaw();renderV()})}
const tabCmp=(a,b)=>a.tanggal!==b.tanggal?(a.tanggal<b.tanggal?-1:1):(a.dibuat!==b.dibuat?(a.dibuat<b.dibuat?-1:1):a.id-b.id);
const tabBarisAsc=rw=>{let s=0;return rw.slice().sort(tabCmp).map(x=>{const m=x.jenis==='setor'?Number(x.jumlah):'',k=x.jenis==='tarik'?Number(x.jumlah):'';s+=(m||0)-(k||0);return{x,m,k,s}})};
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

/* --- Penilaian Siswa (raport) - tahap 2: Mapel & KKM, Penilaian --- */
const PN_TAB=[['kel','⚙️ Pengaturan'],['nilai','📝 Penilaian'],['mapel','📚 Mapel &amp; KKM'],['kep','🎓 Keputusan akhir'],['kirim','📤 Kirim laporan']];
/* Mapel & KKM hanya tampil bila pengelompokan siswa = per kelas (bukan per usia) */
const pnTabs=()=>{const kelas=typeof pkSkala==='function'?(pkMode()==='kelas'&&pkSkala()==='angka'):true,a=PN_TAB.filter(x=>x[0]!=='mapel'||kelas);if(pnTab==='mapel'&&!kelas)pnTab='kel';return a};
let pnTab='kel',pnK='',pnAll=false,PN_ALL=new Map(),pnSem=1,pnJenis='UTS',pnMapel=[],pnRap=[],pnKeh={},pnKey='',pnSis=0,pnKepKep=new Map(),pnKepOk=true;
const pnKl=n=>S.kelas.find(k=>k.nama===n);
const pnBoleh=kl=>!!kl&&(['Kepala Sekolah','Wakil Kepala Sekolah','Pengelola/Pengasuh','Operator','Guru'].includes(role)||(role==='Developer'&&MB()));
const pnGalat=e=>{const m=dbMsg(e);return /row-level security|permission denied/i.test(m)?'Anda tidak memiliki izin mengubah penilaian kelas ini':m};
const pnTry=async f=>{try{return await f()}catch(e){throw new Error(pnGalat(e))}};
const pnKunci=()=>(pnAll?'*':pnK)+'|'+pnSem+'|'+pnJenis;
const pnUas2=()=>pnJenis==='UAS'&&pnSem===2;
function pnRangeDef(){const m=String(S.set.tahun_ajaran||'').match(/(\d{4})/);const y=m?+m[1]:(+TODAY.slice(0,4)-(+TODAY.slice(5,7)<7?1:0));return pnSem===1?[y+'-07-01',y+'-12-31']:[(y+1)+'-01-01',(y+1)+'-06-30']}
let pnTgl={};
const pnRangeKey=()=>'pnRange|'+SEK+'|'+(S.set.tahun_ajaran||'')+'|'+pnSem;
const pnOkTgl=x=>/^\d{4}-\d\d-\d\d$/.test(x);
function pnRange(){const k=pnRangeKey();if(!pnTgl[k]){try{const j=JSON.parse(localStorage.getItem(k)||'null');if(j&&pnOkTgl(j[0])&&pnOkTgl(j[1])&&j[0]<=j[1])pnTgl[k]=j}catch(_){}}return pnTgl[k]||pnRangeDef()}
function pnSetTgl(i,v){if(!pnOkTgl(v))return;const r=pnRange().slice();r[i]=v;if(r[0]>r[1]){toast('Tanggal mulai tidak boleh setelah tanggal berakhir',false);renderV();return}
 const k=pnRangeKey();pnTgl[k]=r;try{localStorage.setItem(k,JSON.stringify(r))}catch(_){}pnKey='';renderV();pnMuatLagi()}
function pnResetTgl(){const k=pnRangeKey();delete pnTgl[k];try{localStorage.removeItem(k)}catch(_){}pnKey='';renderV();pnMuatLagi()}
const pnPred=(n,k)=>Rapor.pred(n,k);
const pnPredCls={A:'hadir',B:'hadir',C:'terlambat',D:'Alpa'};
const pnDesk=(p,m)=>Rapor.desk(p,m);
function pnNum(s){s=String(s==null?'':s).trim().replace(',','.');if(s==='')return null;const n=Number(s);if(!isFinite(n)||n<0||n>100)throw new Error('nilai harus antara 0 dan 100');return Math.round(n*100)/100}
function pnAng(s,l){const n=Number(String(s).trim());if(!Number.isInteger(n)||n<0||n>100)throw new Error(l+' harus angka bulat 0 sampai 100');return n}
const urutKelasSiswa=()=>{const o=new Map(S.kelas.map((k,i)=>[k.id,i]));return act().filter(s=>o.has(s.kelas_id)).sort((a,b)=>(o.get(a.kelas_id)-o.get(b.kelas_id))||a.nama.localeCompare(b.nama,'id'))};
const pnDaftar=()=>{if(pnAll)return urutKelasSiswa();const kl=pnKl(pnK);return kl?act().filter(s=>s.kelas_id===kl.id).sort((a,b)=>a.nama.localeCompare(b.nama,'id')):[]};
/* Mode "Semua kelas": pnK sementara berisi kelas siswa yang sedang diproses (pnCtx), supaya semua fungsi per kelas tetap bekerja. Tampilan daftar selalu kembali ke '*'. */
function pnCtx(kid){if(!pnAll)return pnKl(pnK);const k=S.kelas.find(c=>c.id===kid);if(!k){pnK='*';pnMapel=[];return null}pnK=k.nama;pnMapel=PN_ALL.get(k.id)||[];return k}
function pnFix(){if(!pnAll)return;const s=siswaById(pnSis);if(s)pnCtx(s.kelas_id)}
const pnKlSiswa=s=>s?S.kelas.find(c=>c.id===s.kelas_id):null;
const pnIzin=ids=>pnAll?ids.filter(id=>{const r=pnRap.find(x=>x.id===id),k=r&&pnKlSiswa(siswaById(r.siswa_id));return !!k&&pnBoleh(k)}):ids;
const pnBagiKelas=ids=>{const g=new Map();pnRap.filter(r=>ids.includes(r.id)).forEach(r=>{const s=siswaById(r.siswa_id),kid=s?s.kelas_id:0;if(!g.has(kid))g.set(kid,[]);g.get(kid).push(r)});return g};
const pnSemuaHdr=(kl,n)=>`<tr><td colspan="${n}" style="background:rgba(120,90,200,.12);font-weight:700">Kelas ${esc(kl?kl.nama:'-')}</td></tr>`;
const pnLengkap=r=>!!r&&r.nilai.length===pnMapel.length&&pnMapel.every(m=>{const x=r.nilai.find(y=>y.m===m.nama);return x&&x.n!=null&&x.k===m.kkm&&String(x.a||'').trim()===pnAN(m)});
/* ---- pemuatan hemat (Kelola Raport) ----
   - mapel & KKM per kelas: cache 2 menit (otomatis basi setiap ada penulisan, lihat cmVer)
   - kelompok & master indikator (PKR): dimuat ulang hanya bila basi; salinan indikator (hash) tidak pernah berubah
   - kehadiran: dihitung di server (fungsi SQL rapor_kehadiran); bila belum dipasang, otomatis memakai cara lama
   - keputusan akhir tahun: hanya dibaca pada UAS Semester 2 (satu-satunya tempat yang memakainya)
   - daftar raport & nilai siswa selalu dibaca segar */
const SESI=1e13/* cache sepanjang sesi: baru hilang bila halaman dimuat ulang, keluar akun, atau ada simpan/ubah/hapus dari perangkat ini */;
const PN_MEM=new Map();let PN_RPC_OK=true,PK_V=-1;
async function pnKehHitung(ids,r){
 if(PN_RPC_OK){try{
  const bagi=[];for(let i=0;i<ids.length;i+=200)bagi.push(ids.slice(i,i+200));
  const hs=await Promise.all(bagi.map(b=>dbq(db.rpc('rapor_kehadiran',{p_siswa:b,p_dari:r[0],p_sampai:r[1]}))));
  return hs.flat().map(x=>({siswa_id:x.siswa_id,status:x.status,jumlah:+x.jumlah||0}))
 }catch(e){if(/PGRST202|42883|could not find|does not exist/i.test(String((e&&(e.code+' '+e.message))||'')))PN_RPC_OK=false;console.warn('rapor_kehadiran gagal, memakai cara lama',e)}}
 const rows=await pgAll(()=>db.from('absensi').select('siswa_id,status').in('siswa_id',ids).in('status',['sakit','izin','alpa']).gte('tanggal',r[0]).lte('tanggal',r[1])),m=new Map();
 rows.forEach(x=>{const k=x.siswa_id+'|'+x.status;m.set(k,(m.get(k)||0)+1)});
 return [...m].map(([k,n])=>{const q=k.split('|');return{siswa_id:+q[0],status:q[1],jumlah:n}})}
async function pkMuatHemat(){
 if(PKR.loaded&&!PKR.galat&&PK_V===refVer){
  const perlu=[...new Set(pnRap.map(r=>r.salinan_hash).filter(h=>h&&!PKR.sal.has(h)))];
  if(perlu.length)((await dbq(db.from('rapor_salinan').select('hash,isi').in('hash',perlu)))||[]).forEach(x=>PKR.sal.set(x.hash,x.isi));
  return}
 const v0=refVer;await pkMuat();if(!PKR.galat&&v0===refVer)PK_V=v0}
/* muat ulang HANYA mapel kelas ini, dipakai setelah tambah/ubah/hapus mapel, KKM, atau aspek. Nilai, kehadiran, keputusan, dan master tidak terpengaruh, jadi tidak dibaca ulang. Bila tampilan belum termuat penuh, memakai pnMuat biasa. */
async function pnMuatMapel(){const kl=pnKl(pnK);if(!kl||pnKey!==pnKunci())return pnMuat();
 const k0=pnK,v0=refVer,d=await dbq(db.from('rapor_mapel').select('*').eq('kelas_id',kl.id).order('urutan').order('id'));
 if(pnK!==k0)return;pnMapel=d||[];if(v0===refVer)PN_MEM.set(kl.id,{v:v0,d:pnMapel})}
async function pnMuat(){if(pnAll)return pnMuatSemua();const kl=pnKl(pnK);pnKey='';pnMapel=[];pnRap=[];pnKeh={};pnKepKep=new Map();pnKepOk=true;if(!kl)return;
 const ids=act().filter(s=>s.kelas_id===kl.id).map(s=>s.id),ta=S.set.tahun_ajaran||'',r=pnRange(),v0=refVer;
 const kepQ=ids.length&&pnUas2()?dbq(db.from('keputusan_akhir_tahun').select('id,siswa_id,jenis,kelas_tujuan_nama,status').eq('sekolah_id',SEK).in('siswa_id',ids).eq('tahun_ajaran',ta)).catch(()=>{pnKepOk=false;return[]}):[];
 const me=PN_MEM.get(kl.id),mapQ=me&&me.v===refVer?me.d:dbq(db.from('rapor_mapel').select('*').eq('kelas_id',kl.id).order('urutan').order('id')).then(v=>{if(v0===refVer)PN_MEM.set(kl.id,{v:v0,d:v});return v});
 const [m,rp,kh,kp]=await Promise.all([
  mapQ,
  ids.length?pgAll(()=>db.from('rapor').select('*').in('siswa_id',ids).eq('tahun_ajaran',ta).eq('semester',pnSem).eq('jenis',pnJenis)):[],
  ids.length?pnKehHitung(ids,r):[],
  kepQ]);
 pnMapel=m||[];pnRap=rp||[];(kp||[]).forEach(x=>pnKepKep.set(x.siswa_id,x));(kh||[]).forEach(x=>{const o=pnKeh[x.siswa_id]||(pnKeh[x.siswa_id]={sakit:0,izin:0,alpa:0});if(o[x.status]!=null)o[x.status]+=x.jumlah});await pkMuatHemat();pnKey=pnKunci()}
async function pnMuatSemua(){pnKey='';pnMapel=[];pnRap=[];pnKeh={};pnKepKep=new Map();pnKepOk=true;PN_ALL=new Map();
 const ids=urutKelasSiswa().map(s=>s.id),ta=S.set.tahun_ajaran||'',r=pnRange(),v0=refVer,bagi=[];
 for(let i=0;i<ids.length;i+=200)bagi.push(ids.slice(i,i+200));
 const kepQ=ids.length&&pnUas2()?Promise.all(bagi.map(b=>dbq(db.from('keputusan_akhir_tahun').select('id,siswa_id,jenis,kelas_tujuan_nama,status').eq('sekolah_id',SEK).in('siswa_id',b).eq('tahun_ajaran',ta)))).then(a=>a.flat()).catch(()=>{pnKepOk=false;return[]}):[];
 const miss=[];S.kelas.forEach(k=>{const m=PN_MEM.get(k.id);if(m&&m.v===refVer)PN_ALL.set(k.id,m.d);else miss.push(k.id)});
 const mapQ=miss.length?pgAll(()=>db.from('rapor_mapel').select('*').in('kelas_id',miss).order('urutan').order('id')).then(d=>{const g=new Map();miss.forEach(id=>g.set(id,[]));(d||[]).forEach(x=>{if(g.has(x.kelas_id))g.get(x.kelas_id).push(x)});g.forEach((arr,id)=>{PN_ALL.set(id,arr);if(v0===refVer)PN_MEM.set(id,{v:v0,d:arr})})}):null;
 const [,rp,kh,kp]=await Promise.all([mapQ,Promise.all(bagi.map(b=>pgAll(()=>db.from('rapor').select('*').in('siswa_id',b).eq('tahun_ajaran',ta).eq('semester',pnSem).eq('jenis',pnJenis)))).then(a=>a.flat()),ids.length?pnKehHitung(ids,r):[],kepQ]);
 pnRap=rp||[];(kp||[]).forEach(x=>pnKepKep.set(x.siswa_id,x));(kh||[]).forEach(x=>{const o=pnKeh[x.siswa_id]||(pnKeh[x.siswa_id]={sakit:0,izin:0,alpa:0});if(o[x.status]!=null)o[x.status]+=x.jumlah});
 await pkMuatHemat();pnKey=pnKunci();
 if(pnK!=='*'){const k=pnKl(pnK);pnMapel=k?(PN_ALL.get(k.id)||[]):[]}}
const pnMuatLagi=()=>pnMuat().then(()=>renderV()).catch(e=>toast(dbMsg(e),false));
const pnPilihK=v=>{pnAll=(v==='*');pnK=v;pnKey='';renderV();pnMuatLagi()};
const pnSetSem=v=>{pnSem=+v;pnKey='';renderV();pnMuatLagi()};
const pnSetJenis=v=>{pnJenis=v;pnKey='';renderV();pnMuatLagi()};
const pnPilihSiswa=v=>{renderV();pnBuka(+v)};
const pnHal=t=>{pnTab=t;if((t==='mapel'||t==='kel')&&pnAll){pnAll=false;pnK='';pnKey='';pnMapel=[];pnRap=[]}if(t==='kep'&&!pnUas2()){pnSem=2;pnJenis='UAS';pnKey='';renderV();pnMuatLagi();return}renderV()};
const pnPilK=sm=>`<div class="tb tab-choice">${cpick('pnKelasPick','kelas',pnK,(sm?[{value:'*',label:'Semua kelas'}]:[]).concat(pkKelasOpt()),'pnPilihK','Pilih kelas')}</div>`;
const pnPeriode=()=>`<div class="tb pnper"><select class="select" onchange="pnSetSem(this.value)"><option value="1"${pnSem===1?' selected':''}>Semester 1</option><option value="2"${pnSem===2?' selected':''}>Semester 2</option></select><select class="select" onchange="pnSetJenis(this.value)"><option value="UTS"${pnJenis==='UTS'?' selected':''}>UTS (Tengah Semester)</option><option value="UAS"${pnJenis==='UAS'?' selected':''}>UAS (Akhir Semester)</option></select></div>`;
V.penilaian=()=>{if(pnAll)pnCtx(0);return `<div class="panel"><div class="ph">📝 Penilaian Siswa <span class="mu">Tahun ajaran: ${esc(S.set.tahun_ajaran||'-')}</span></div><div class="pb"><div class="utabs">${pnTabs().map(x=>`<button class="utab${pnTab===x[0]?' on':''}" onclick="pnHal('${x[0]}')">${x[1]}</button>`).join('')}</div>${pnIsiTab()}</div></div>`};

/* ---- Tab Mapel & KKM ---- */
const pnAN=m=>String((m&&m.aspek)||'').trim();
function pnAspekList(){const o=[],s=new Set();pnMapel.forEach(m=>{const a=pnAN(m),k=a.toLowerCase();if(a&&!s.has(k)){s.add(k);o.push(a)}});return o}
function pnAspekNorm(v){const a=String(v||'').replace(/\s+/g,' ').trim();if(a.length>60)throw new Error('Nama aspek maksimal 60 huruf');if(!a)return null;return pnAspekList().find(x=>x.toLowerCase()===a.toLowerCase())||a}
const PN_TANPA='(Tanpa aspek / Lainnya)';
/* daftar aspek: kelas ini dulu, lalu aspek dari kelas lain di sekolah */
async function pnAspekPilihan(){const o=[],s=new Set(),add=a=>{a=String(a||'').replace(/\s+/g,' ').trim();const k=a.toLowerCase();if(a&&!s.has(k)){s.add(k);o.push(a)}};pnAspekList().forEach(add);
 try{const r=await dbq(db.from('rapor_mapel').select('aspek').in('kelas_id',S.kelas.map(k=>k.id)).not('aspek','is',null));(r||[]).forEach(x=>add(x.aspek))}catch(_){}
 return o}
const pnAspekFd=(L,cur)=>[{k:'aspek',l:'Aspek (pilih dari kelas ini atau kelas lain)',o:[PN_TANPA].concat(L),v:cur||PN_TANPA},{k:'aspekb',l:'Aspek baru (isi hanya bila belum ada di daftar)'}];
const pnAspekAmbil=v=>{const b=String(v.aspekb||'').trim();return pnAspekNorm(b||(v.aspek===PN_TANPA?'':v.aspek))};
const PNPM={on:false,sel:new Set()};
function pnPmToggle(){PNPM.on=!PNPM.on;PNPM.sel=new Set();renderV()}
function pnPmSemua(){const all=pnMapel.length&&PNPM.sel.size===pnMapel.length;PNPM.sel=all?new Set():new Set(pnMapel.map(m=>m.id));renderV()}
function pnPmCek(id,on){if(on)PNPM.sel.add(id);else PNPM.sel.delete(id);const bt=$('#pnPmHps');if(bt){bt.textContent='🗑 Hapus terpilih ('+PNPM.sel.size+')';bt.disabled=!PNPM.sel.size}}
async function pnHapusBanyak(){const kl=pnKl(pnK);if(!pnBoleh(kl))return;const ids=[...PNPM.sel].filter(id=>pnMapel.some(m=>m.id===id));if(!ids.length)return toast('Centang mata pelajaran yang ingin dihapus',false);
 const nm=pnMapel.filter(m=>ids.includes(m.id)).map(m=>m.nama);
 if(!await konfirmasi('Hapus '+ids.length+' mata pelajaran dari kelas '+kl.nama+'?\n\n'+nm.slice(0,10).map(x=>'- '+x).join('\n')+(nm.length>10?'\n... dan '+(nm.length-10)+' lainnya':'')+'\n\nRaport yang sudah tersimpan tidak berubah, tetapi nilai draf mapel ini tidak akan ikut tersimpan lagi.',{bahaya:1,judul:'Hapus mata pelajaran terpilih',ya:'Hapus '+ids.length}))return;
 guard(async()=>{for(let i=0;i<ids.length;i+=200)await pnTry(()=>dbq(db.from('rapor_mapel').delete().in('id',ids.slice(i,i+200))));PNPM.on=false;PNPM.sel=new Set();await pnMuatMapel();renderV();toast(ids.length+' mata pelajaran dihapus')})}
function pnMapelHTML(){const pil=pnPilK();if(!pnK)return pil+PKH;const kl=pnKl(pnK);if(!kl)return pil+PKH;
 if(pnKey!==pnKunci())return pil+'<div class="note">⏳ Memuat...</div>';
 const b=pnBoleh(kl);let h=pil;if(!b||!pnMapel.length){PNPM.on=false;PNPM.sel=new Set()}
 if(b&&!kl.wali)h+='<div class="note">Kelas ini belum punya wali kelas, jadi semua guru dapat mengatur mata pelajaran dan KKM.</div>';
 if(!b)h+='<div class="note">Anda hanya dapat melihat. Mata pelajaran dan KKM kelas ini hanya dapat diubah oleh wali kelasnya, Kepala Sekolah, atau Wakil.</div>';
 if(b)h+=`<div class="tb" style="flex-wrap:wrap"><button class="btn success sm" onclick="pnTambah()">+ Tambah mapel</button>${pnMapel.length?'<button class="btn soft sm" onclick="pnKkmSemua()">Atur KKM semua</button>':'<button class="btn soft sm" onclick="pnBawaan(this)">Isi mapel bawaan</button>'}<button class="btn soft sm" onclick="pnSalin()">Salin dari kelas lain</button>${pnMapel.length?'<button class="btn soft sm" onclick="pnAspek()">Kelola aspek</button><button class="btn soft sm" onclick="pnPmToggle()">'+(PNPM.on?'✖ Batal pilih':'☑ Pilih mapel')+'</button>':''}</div>`;
 if(b&&PNPM.on&&pnMapel.length)h+=`<div class="tb" style="flex-wrap:wrap;align-items:center"><button class="btn soft sm" onclick="pnPmSemua()">${PNPM.sel.size===pnMapel.length?'Hapus semua centang':'Pilih semua'}</button><button class="btn danger sm" id="pnPmHps" onclick="pnHapusBanyak()"${PNPM.sel.size?'':' disabled'}>🗑 Hapus terpilih (${PNPM.sel.size})</button><span class="mu">Centang mapel yang ingin dihapus sekaligus.</span></div>`;
 if(!pnMapel.length)h+='<div class="note">Belum ada mata pelajaran untuk kelas '+esc(kl.nama)+'.'+(b?' Tekan <b>Isi mapel bawaan</b> (8 mapel SD) atau tambah satu per satu.':'')+'</div>';
 else if(b&&PNPM.on)h+=tab(['Pilih','No','Mata pelajaran','Aspek','KKM'],pnMapel.map((m,i)=>`<tr><td><input type="checkbox" onchange="pnPmCek(${m.id},this.checked)"${PNPM.sel.has(m.id)?' checked':''}></td><td>${i+1}</td><td><b>${esc(m.nama)}</b></td><td>${pnAN(m)?esc(pnAN(m)):'<span class="mu">Lainnya</span>'}</td><td>${m.kkm}</td></tr>`).join(''));
 else h+=tab(['No','Mata pelajaran','Aspek','KKM'].concat(b?['Aksi']:[]),pnMapel.map((m,i)=>`<tr><td>${i+1}</td><td><b>${esc(m.nama)}</b></td><td>${pnAN(m)?esc(pnAN(m)):'<span class="mu">Lainnya</span>'}</td><td>${m.kkm}</td>${b?`<td><button class="btn sm soft" onclick="pnUbah(${m.id})">✎</button> <button class="btn sm danger" onclick="pnHapus(${m.id})">🗑</button></td>`:''}</tr>`).join(''));
 return h}
function pnAspek(){const kl=pnKl(pnK);if(!pnBoleh(kl))return;const L=pnAspekList();
 info('Kelola aspek',(L.length?'<div class="note">Aspek mengelompokkan mata pelajaran di raport. Urutan aspek mengikuti urutan mapelnya. Aspek baru dibuat lewat isian Aspek pada formulir mapel. Menghapus aspek tidak menghapus mapelnya; mapel itu pindah ke Lainnya.</div>'+tab(['Aspek','Mapel','Aksi'],L.map((a,i)=>`<tr><td><b>${esc(a)}</b></td><td>${pnMapel.filter(m=>pnAN(m).toLowerCase()===a.toLowerCase()).length}</td><td><button class="btn sm soft" onclick="pnAspekUbah(${i})">✎</button> <button class="btn sm danger" onclick="pnAspekHapus(${i})">🗑</button></td></tr>`).join('')):'<div class="note">Belum ada aspek. Isi kolom Aspek saat menambah atau mengubah mata pelajaran.</div>'))}
const pnAspekIds=a=>pnMapel.filter(m=>pnAN(m).toLowerCase()===String(a).toLowerCase()).map(m=>m.id);
function pnAspekUbah(i){const kl=pnKl(pnK),a=pnAspekList()[i];if(!pnBoleh(kl)||!a)return;closeM();
 form('Ubah nama aspek',[{k:'nama',l:'Nama aspek',v:a}],async v=>{let nm=String(v.nama||'').replace(/\s+/g,' ').trim();if(!nm)throw new Error('Nama aspek wajib diisi. Untuk menghapus aspek, gunakan tombol hapus.');if(nm.length>60)throw new Error('Nama aspek maksimal 60 huruf');
  const lain=pnAspekList().find(x=>x.toLowerCase()===nm.toLowerCase()&&x.toLowerCase()!==a.toLowerCase());if(lain)nm=lain;
  await pnTry(()=>dbq(db.from('rapor_mapel').update({aspek:nm}).in('id',pnAspekIds(a))));await pnMuatMapel();renderV();toast('Aspek diperbarui. Simpan ulang draf nilai agar raport memakai aspek baru')})}
async function pnAspekHapus(i){const kl=pnKl(pnK),a=pnAspekList()[i];if(!pnBoleh(kl)||!a)return;closeM();
 if(!await konfirmasi('Hapus aspek '+a+'? Mata pelajarannya tidak dihapus, hanya pindah ke Lainnya.',{bahaya:1,judul:'Hapus aspek',ya:'Hapus'}))return;
 guard(async()=>{await pnTry(()=>dbq(db.from('rapor_mapel').update({aspek:null}).in('id',pnAspekIds(a))));await pnMuatMapel();renderV();toast('Aspek dihapus')})}
async function pnTambah(){const kl=pnKl(pnK);if(!pnBoleh(kl))return;const AS=await pnAspekPilihan();
 form('Tambah mata pelajaran',[{k:'nama',l:'Nama mata pelajaran'}].concat(pnAspekFd(AS,''),[{k:'kkm',l:'KKM (0 sampai 100)',v:'70',t:'number'}]),async v=>{
  const nm=v.nama.trim();if(!nm)throw new Error('Nama mata pelajaran wajib diisi');const kk=pnAng(v.kkm,'KKM'),u=Math.max(0,...pnMapel.map(m=>m.urutan||0))+1;
  await pnTry(()=>dbq(db.from('rapor_mapel').insert({kelas_id:kl.id,nama:nm,kkm:kk,urutan:u,aspek:pnAspekAmbil(v)})));await pnMuatMapel();renderV();toast('Mata pelajaran ditambahkan')})}
async function pnUbah(id){const kl=pnKl(pnK),m=pnMapel.find(x=>x.id===id);if(!pnBoleh(kl)||!m)return;const AS=await pnAspekPilihan();
 form('Ubah mata pelajaran',[{k:'nama',l:'Nama mata pelajaran',v:m.nama}].concat(pnAspekFd(AS,pnAN(m)),[{k:'kkm',l:'KKM (0 sampai 100)',v:String(m.kkm),t:'number'},{k:'urutan',l:'Urutan tampil (angka kecil tampil lebih dulu)',v:String(m.urutan||0),t:'number'}]),async v=>{
  const nm=v.nama.trim();if(!nm)throw new Error('Nama mata pelajaran wajib diisi');const kk=pnAng(v.kkm,'KKM'),u=pnAng(v.urutan,'Urutan');
  await pnTry(()=>dbq(db.from('rapor_mapel').update({nama:nm,kkm:kk,urutan:u,aspek:pnAspekAmbil(v)}).eq('id',id)));await pnMuatMapel();renderV();toast('Mata pelajaran diperbarui')})}
async function pnHapus(id){const kl=pnKl(pnK),m=pnMapel.find(x=>x.id===id);if(!pnBoleh(kl)||!m)return;
 if(!await konfirmasi('Hapus mata pelajaran '+m.nama+' dari kelas '+kl.nama+'? Raport yang sudah tersimpan tidak berubah, tetapi nilai draf mapel ini tidak akan ikut tersimpan lagi.',{bahaya:1,judul:'Hapus mata pelajaran',ya:'Hapus'}))return;
 guard(async()=>{await pnTry(()=>dbq(db.from('rapor_mapel').delete().eq('id',id)));await pnMuatMapel();renderV();toast('Mata pelajaran dihapus')})}
function pnBawaan(btn){const kl=pnKl(pnK);if(!pnBoleh(kl))return;
 guard(async()=>{const n=await pnTry(()=>dbq(db.rpc('rapor_mapel_bawaan',{p_kelas:kl.id})));await pnMuatMapel();renderV();toast(n?n+' mata pelajaran bawaan ditambahkan':'Kelas ini sudah punya mata pelajaran')})}
function pnKkmSemua(){const kl=pnKl(pnK);if(!pnBoleh(kl)||!pnMapel.length)return;
 form('Atur KKM semua mata pelajaran',[{k:'kkm',l:'KKM untuk semua mapel di kelas '+kl.nama+' (0 sampai 100)',v:String(pnMapel[0].kkm),t:'number'}],async v=>{
  const kk=pnAng(v.kkm,'KKM');await pnTry(()=>dbq(db.from('rapor_mapel').update({kkm:kk}).eq('kelas_id',kl.id)));await pnMuatMapel();renderV();toast('KKM semua mapel diubah menjadi '+kk)})}
async function pnSalin(){const kl=pnKl(pnK);if(!pnBoleh(kl))return;let ada;try{const r=await dbq(db.from('rapor_mapel').select('kelas_id').in('kelas_id',S.kelas.map(k=>k.id)));ada=new Set((r||[]).map(x=>x.kelas_id))}catch(e){return toast('Gagal memeriksa kelas: '+(e.message||e),false)}
 const lain=S.kelas.filter(k=>k.id!==kl.id&&ada.has(k.id)).map(k=>k.nama);if(!lain.length)return toast('Belum ada kelas lain yang punya mata pelajaran untuk disalin',false);
 form('Salin mapel dari kelas lain',[{k:'dari',l:'Salin dari kelas',o:['Pilih kelas'].concat(lain)}],async v=>{
  const sr=pnKl(v.dari);if(!sr)throw new Error('Pilih kelas asal terlebih dahulu');
  const src=await dbq(db.from('rapor_mapel').select('nama,kkm,urutan,aspek').eq('kelas_id',sr.id).order('urutan').order('id'));
  const ada=new Set(pnMapel.map(m=>m.nama.trim().toLowerCase()));let u=Math.max(0,...pnMapel.map(m=>m.urutan||0));
  const baru=(src||[]).filter(m=>!ada.has(String(m.nama).trim().toLowerCase())).map(m=>({kelas_id:kl.id,nama:m.nama,kkm:m.kkm,urutan:++u,aspek:m.aspek||null}));
  if(!baru.length)throw new Error('Tidak ada mata pelajaran baru untuk disalin');
  await pnTry(()=>dbq(db.from('rapor_mapel').insert(baru)));await pnMuatMapel();renderV();toast(baru.length+' mata pelajaran disalin dari kelas '+sr.nama)})}

/* ---- Tab Penilaian ---- */
function pnNilaiHTML(){if(pnAll)return pnNilaiSemua();const pil=pnPilK(1)+pnPeriode();if(!pnK)return pil+PKH;const kl=pnKl(pnK);if(!kl)return pil+PKH;
 if(!S.set.tahun_ajaran)return pil+'<div class="note">Tahun ajaran belum diatur. Isi dulu di menu Pengaturan.</div>';
 if(pnKey!==pnKunci())return pil+'<div class="note">⏳ Memuat...</div>';
 const b=pnBoleh(kl),rg=pnRange();
 if((pkSkala()==='level'||!pnMapel.length)&&!pnDaftar().some(pkFmtS)){if(pkSkala()==='level')return pil+'<div class="note">Siswa kelas '+esc(kl.nama)+' belum masuk kelompok raport. Atur kelompok dan indikatornya di tab <b>Pengaturan</b>.</div>'+(b?'<div class="tb"><button class="btn success" onclick="pnHal(\'kel\')">⚙️ Buka Pengaturan</button></div>':'');
  return pil+'<div class="note">Belum ada mata pelajaran untuk kelas '+esc(kl.nama)+'. Atur dulu di tab <b>Mapel &amp; KKM</b>.</div>'+(b?'<div class="tb"><button class="btn success" onclick="pnHal(\'mapel\')">📚 Atur mapel</button></div>':'')}
 const sis=pnDaftar();if(!sis.length)return pil+'<div class="note">Belum ada siswa aktif di kelas ini.</div>';
 const map=new Map(pnRap.map(r=>[r.siswa_id,r]));let nt=0,nd=0,siap=[];
 const rows=sis.map((s,i)=>{const r=map.get(s.id);if(pkFmtS(s)){const q=pkInfo(s,r,i,b);if(q.terbit)nt++;else if(r)nd++;if(q.siap)siap.push(q.siap);return q.tr}if(pkSkala()==='level'&&!r)return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>-</td><td><span class="mu">Indikator kelompok belum diatur</span></td><td>${b?'<div class="pnka"><button class="btn pnk soft" onclick="pnHal(\'kel\')">⚙️ Atur</button></div>':''}</td></tr>`;const terbit=!!r&&r.status==='terbit',lk=pnLengkap(r);if(terbit)nt++;else if(r)nd++;const kep=pnKepKep.get(s.id);if(r&&!terbit&&lk)siap.push(r.id);
  const isi=r?r.nilai.filter(x=>x.n!=null).length:0,tot=r&&terbit?r.nilai.length:pnMapel.length;
  const stt=terbit?'<span class="badge hadir">Terbit</span>'+(r.dikirim_pada?'<div class="mu">Terkirim '+fmt(String(r.dikirim_pada).slice(0,10))+'</div>':''):r?'<span class="badge terlambat">Draf</span>'+(pnUas2()&&lk&&!kep?'<div class="mu">Siap diterbitkan (tanpa keputusan)</div>':'')+(!lk&&isi===r.nilai.length&&r.nilai.length?'<div class="mu">Mapel/KKM berubah, simpan ulang</div>':''):'<span class="mu">Belum diisi</span>';
  const bt=b&&r&&!terbit&&lk?`<button class="btn pnk success" onclick="pnTerbit([${r.id}])">🚀 Terbitkan</button>`:'';
  return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${isi} / ${tot}</td><td>${stt}</td><td><div class="pnka"><button class="btn pnk ${terbit||!b?'soft':'success'}" onclick="pnBuka(${s.id})">${terbit||!b?'👁 Lihat nilai':'✍️ Isi'}</button>${bt}${terbit&&b?`<button class="btn pnk soft" onclick="pnTerbitUlang([${r.id}])">🔄 Terbitkan ulang</button>`:''}${r?`<button class="btn pnk soft" onclick="pnKepLihat(${s.id})">Raport 👀</button><button class="btn pnk soft" onclick="pnPdf([${r.id}],this)">📄 Download PDF</button>`:''}</div></td></tr>`}).join('');
 const tgl=`<div class="tbbox"><b>📅 Periode perhitungan kehadiran</b><div class="mu" style="margin:4px 0 8px">Sakit, izin, dan alpa dihitung dari absensi pada rentang tanggal ini. Atur sesuai kalender sekolah.</div><div class="tb" style="flex-wrap:wrap;align-items:center;margin:0"><span class="mu">Mulai</span>${dt('date',rg[0],'pnSetTgl(0,this.value)','',{id:'pnTa'})}<span class="mu">sampai</span>${dt('date',rg[1],'pnSetTgl(1,this.value)','',{id:'pnTb'})}<button class="btn soft sm" onclick="pnResetTgl()">↺ Bawaan semester</button></div><div class="mu" style="margin-top:6px">Angka kehadiran yang sudah tersimpan di draf tidak berubah. Untuk menghitung ulang satu siswa, buka lembar nilainya lalu tekan ↻ Ambil dari absensi.</div></div>`;
 const cari=`<div class="tb tab-choice">${cpick('pnSiswaPick','nama siswa','',sis.map(s=>({value:s.id,label:s.nama})),'pnPilihSiswa','Cari nama siswa')}</div>`;
 let h=pil+cari+tgl+`<div class="note">Kelas <b>${esc(kl.nama)}</b> · ${pnSem===1?'Semester 1':'Semester 2'} · ${pnJenis}. Terbit: <b>${nt}</b> · Draf: <b>${nd}</b> · Belum diisi: <b>${sis.length-nt-nd}</b>.${b?(kl.wali?'':'<br>Kelas ini belum punya wali kelas, jadi semua guru dapat mengisi dan menerbitkan.'):'<br>Anda hanya dapat melihat nilai kelas ini.'}</div>`;
 if(pnUas2())h+='<div class="note">UAS Semester 2 adalah ujian kenaikan kelas. Keputusan naik, tinggal, atau lulus tidak wajib: dicetak pada raport bila sudah ada, dan bisa diisi di bagian bawah lembar nilai atau di menu <b>Kelola Siswa</b>.'+(pnKepOk?'':' <b>Data keputusan tidak dapat dibaca.</b>')+'</div>';
 if((b&&siap.length)||pnRap.length)h+=`<div class="pntb">${b&&siap.length?`<button class="btn pnk success" onclick="pnTerbit([${siap.join(',')}])">🚀 Terbitkan semua yang lengkap (${siap.length})</button>`:''}${pnRap.length?`<button class="btn pnk soft" onclick="pnPdf([${pnRap.map(r=>r.id).join(',')}],this)">📄 Unduh PDF raport kelas (${pnRap.length} siswa)</button>`:''}</div>`;
 return h+tab(['No','Nama','Nilai terisi','Status','Aksi'],rows)}
function pnNilaiSemua(){const pil=pnPilK(1)+pnPeriode();
 if(!S.set.tahun_ajaran)return pil+'<div class="note">Tahun ajaran belum diatur. Isi dulu di menu Pengaturan.</div>';
 if(pnKey!==pnKunci())return pil+'<div class="note">⏳ Memuat...</div>';
 const rg=pnRange(),sis=pnDaftar();if(!sis.length)return pil+'<div class="note">Belum ada siswa aktif.</div>';
 const map=new Map(pnRap.map(r=>[r.siswa_id,r]));let nt=0,nd=0,siap=[],no=0,kid=null,bAda=false;
 const rows=sis.map(s=>{const kl=pnCtx(s.kelas_id),b=pnBoleh(kl),r=map.get(s.id);if(b)bAda=true;let h='';
  if(s.kelas_id!==kid){kid=s.kelas_id;no=0;h=pnSemuaHdr(kl,5)}const i=no++;
  if(pkFmtS(s)){const q=pkInfo(s,r,i,b);if(q.terbit)nt++;else if(r)nd++;if(q.siap&&b)siap.push(q.siap);return h+q.tr}
  if(pkSkala()==='level'&&!r)return h+`<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>-</td><td><span class="mu">Indikator kelompok belum diatur</span></td><td></td></tr>`;
  if(pkSkala()!=='level'&&!pnMapel.length&&!r)return h+`<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>-</td><td><span class="mu">Mapel kelas belum diatur (tab Mapel &amp; KKM)</span></td><td></td></tr>`;
  const terbit=!!r&&r.status==='terbit',lk=pnLengkap(r);if(terbit)nt++;else if(r)nd++;const kep=pnKepKep.get(s.id);if(r&&!terbit&&lk&&b)siap.push(r.id);
  const isi=r?r.nilai.filter(x=>x.n!=null).length:0,tot=r&&terbit?r.nilai.length:pnMapel.length;
  const stt=terbit?'<span class="badge hadir">Terbit</span>'+(r.dikirim_pada?'<div class="mu">Terkirim '+fmt(String(r.dikirim_pada).slice(0,10))+'</div>':''):r?'<span class="badge terlambat">Draf</span>'+(pnUas2()&&lk&&!kep?'<div class="mu">Siap diterbitkan (tanpa keputusan)</div>':'')+(!lk&&isi===r.nilai.length&&r.nilai.length?'<div class="mu">Mapel/KKM berubah, simpan ulang</div>':''):'<span class="mu">Belum diisi</span>';
  const bt=b&&r&&!terbit&&lk?`<button class="btn pnk success" onclick="pnTerbit([${r.id}])">🚀 Terbitkan</button>`:'';
  return h+`<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${isi} / ${tot}</td><td>${stt}</td><td><div class="pnka"><button class="btn pnk ${terbit||!b?'soft':'success'}" onclick="pnBuka(${s.id})">${terbit||!b?'👁 Lihat nilai':'✍️ Isi'}</button>${bt}${terbit&&b?`<button class="btn pnk soft" onclick="pnTerbitUlang([${r.id}])">🔄 Terbitkan ulang</button>`:''}${r?`<button class="btn pnk soft" onclick="pnKepLihat(${s.id})">Raport 👀</button><button class="btn pnk soft" onclick="pnPdf([${r.id}],this)">📄 Download PDF</button>`:''}</div></td></tr>`}).join('');
 pnCtx(0);
 const tgl=`<div class="tbbox"><b>📅 Periode perhitungan kehadiran</b><div class="mu" style="margin:4px 0 8px">Sakit, izin, dan alpa dihitung dari absensi pada rentang tanggal ini. Atur sesuai kalender sekolah.</div><div class="tb" style="flex-wrap:wrap;align-items:center;margin:0"><span class="mu">Mulai</span>${dt('date',rg[0],'pnSetTgl(0,this.value)','',{id:'pnTa'})}<span class="mu">sampai</span>${dt('date',rg[1],'pnSetTgl(1,this.value)','',{id:'pnTb'})}<button class="btn soft sm" onclick="pnResetTgl()">↺ Bawaan semester</button></div><div class="mu" style="margin-top:6px">Angka kehadiran yang sudah tersimpan di draf tidak berubah. Untuk menghitung ulang satu siswa, buka lembar nilainya lalu tekan ↻ Ambil dari absensi.</div></div>`;
 const cari=`<div class="tb tab-choice">${cpick('pnSiswaPick','nama siswa','',sis.map(s=>({value:s.id,label:s.nama+' · '+(s.kelas||'')})),'pnPilihSiswa','Cari nama siswa')}</div>`;
 let h=pil+cari+tgl+`<div class="note"><b>Semua kelas</b> · ${pnSem===1?'Semester 1':'Semester 2'} · ${pnJenis}. Terbit: <b>${nt}</b> · Draf: <b>${nd}</b> · Belum diisi: <b>${sis.length-nt-nd}</b>.${bAda?'':'<br>Anda hanya dapat melihat nilai.'}</div>`;
 if(pnUas2())h+='<div class="note">UAS Semester 2 adalah ujian kenaikan kelas. Keputusan naik, tinggal, atau lulus tidak wajib: dicetak pada raport bila sudah ada, dan bisa diisi di bagian bawah lembar nilai atau di menu <b>Kelola Siswa</b>.'+(pnKepOk?'':' <b>Data keputusan tidak dapat dibaca.</b>')+'</div>';
 if(siap.length||pnRap.length)h+=`<div class="pntb">${siap.length?`<button class="btn pnk success" onclick="pnTerbit([${siap.join(',')}])">🚀 Terbitkan semua yang lengkap (${siap.length})</button>`:''}${pnRap.length?`<button class="btn pnk soft" onclick="pnPdf([${pnRap.map(r=>r.id).join(',')}],this)">📄 Unduh PDF raport semua kelas (${pnRap.length} siswa)</button>`:''}</div>`;
 return h+tab(['No','Nama','Nilai terisi','Status','Aksi'],rows)}
function pnNilaiRows(ent,dis){const g=Rapor.aspekGrup(ent),nm=g.some(x=>x.a);return g.map((o,gi)=>(nm?`<div class="tbkh">${String.fromCharCode(65+gi)}. ${esc(o.a||'Lainnya')}</div>`:'')+o.rows.map(({x:e,i})=>{const p=pnPred(e.n,e.k);return `<div class="pnrow"><div class="pnm"><b>${esc(e.m)}</b><div class="mu">KKM ${e.k}</div></div><input id="pnN${i}" class="input pnin" inputmode="decimal" maxlength="6" placeholder="0-100" value="${e.n==null?'':e.n}"${dis} oninput="pnHit(${i})"><span id="pnP${i}" class="badge ${pnPredCls[p]||''}">${p||'-'}</span></div><details class="pnd"><summary class="mu">Deskripsi${e.d?' (diubah)':' (otomatis)'}</summary><textarea id="pnD${i}" class="input" rows="2" maxlength="300" placeholder="${esc(p?pnDesk(p,e.m):'Dibuat otomatis sesuai predikat')}"${dis}>${esc(e.d||'')}</textarea></details>`}).join('')).join('')}
/* keputusan akhir tahun di form nilai angka (opsional, UAS Semester 2); memakai pkKepHTML/pkKepSimpan dari rapor-p.js */
function pnKepForm(sid,b,kl){if(!pnUas2())return'';const kp=pnKepKep.get(sid)||null;return pkKepHTML({sid,b,kep:kp,kj:kp?kp.jenis:'',kt:kp&&kp.kelas_tujuan_nama?String((S.kelas.find(c=>c.nama===kp.kelas_tujuan_nama)||{}).id||''):''},kl)}
function pnBuka(sid){const s=siswaById(sid),kl=s?pnCtx(s.kelas_id):null;if(!s||!kl)return;pnSis=sid;resetTutup();window._kepE=null;if(pkFmtS(s))return pkBuka(sid);
 const rap=pnRap.find(r=>r.siswa_id===sid),kunci=!!rap&&rap.status==='terbit',b=pnBoleh(kl)&&!kunci,keh=pnKeh[sid]||{sakit:0,izin:0,alpa:0},dis=b?'':' disabled';
 const ent=kunci?rap.nilai.map(x=>({m:x.m,k:x.k,a:String(x.a||'').trim(),n:x.n,d:x.d})):pnMapel.map(m=>{const x=rap&&rap.nilai.find(y=>y.m===m.nama);return{m:m.nama,k:m.kkm,a:pnAN(m),n:x?x.n:null,d:x?x.d:null}});
 window._pnEnt=ent;const v=rap?{sakit:rap.sakit,izin:rap.izin,alpa:rap.alpa,catatan:rap.catatan||''}:{sakit:keh.sakit,izin:keh.izin,alpa:keh.alpa,catatan:''};
 let h=`<div class="note">Kelas ${esc(kl.nama)} · ${pnSem===1?'Semester 1':'Semester 2'} · ${pnJenis} · ${esc(S.set.tahun_ajaran||'')}${kunci?' · <b>Terbit (terkunci)</b>':rap?' · Draf':''}</div>`;
 h+=pnNilaiRows(ent,dis);
 h+=`<div class="tbkh">Kehadiran <span class="mu">(hari)</span></div><div class="tb" style="flex-wrap:wrap;align-items:flex-end"><div class="fd" style="flex:1;min-width:80px"><label class="l">Sakit</label><input id="pnSk" class="input" inputmode="numeric" maxlength="3" value="${v.sakit}"${dis}></div><div class="fd" style="flex:1;min-width:80px"><label class="l">Izin</label><input id="pnIz" class="input" inputmode="numeric" maxlength="3" value="${v.izin}"${dis}></div><div class="fd" style="flex:1;min-width:80px"><label class="l">Tanpa keterangan</label><input id="pnAl" class="input" inputmode="numeric" maxlength="3" value="${v.alpa}"${dis}></div></div>${b?`<div class="tb" style="flex-wrap:wrap;align-items:center"><button class="btn soft sm" onclick="pnAmbilKeh()">↻ Ambil dari absensi</button><span class="mu">${fmt(pnRange()[0])} sampai ${fmt(pnRange()[1])}</span></div>`:''}`;
 h+=`<div class="tbkh">Catatan wali kelas</div><textarea id="pnCat" class="input" rows="3" maxlength="600" placeholder="Catatan untuk orang tua (opsional)"${dis}>${esc(v.catatan)}</textarea>`;
 h+=pnKepForm(sid,b,kl);
 h+=b?`<div class="tb" style="flex-wrap:wrap;margin-top:12px"><button class="btn success grow" onclick="pnSimpan(false)">💾 Simpan draf</button><button class="btn soft grow" onclick="pnSimpan(true)">Simpan &amp; berikutnya ➜</button></div><div class="tb"><button class="btn success grow" onclick="pnSimpan('terbitlanjut')">🚀 Terbitkan &amp; lanjutkan</button></div>`:kunci?(pnBoleh(kl)?`<div class="note">Raport ini sudah terbit dan terkunci. Untuk mengubahnya, batalkan penerbitan dulu.</div><div class="tb"><button class="btn danger" onclick="pnBatal(${rap.id})">Batalkan penerbitan</button></div>`:'<div class="note">Raport ini sudah terbit dan terkunci.</div>'):'<div class="note">Anda hanya dapat melihat nilai kelas ini.</div>';
 if(rap)h+=`<div class="tb"><button class="btn soft sm" onclick="pnPdf([${rap.id}],this)">📄 Unduh PDF (data yang tersimpan)</button></div>`;
 $('#mt').textContent=(kunci?'Raport ':'Nilai ')+s.nama;{const ms=$('#ms');if(b){ms.style.display='';ms.textContent='💾 Simpan draf';ms.className='btn success';ms.disabled=false;ms.onclick=()=>pnSimpan(false)}else ms.style.display='none'}$('#mbd').innerHTML=h;$('#md').classList.add('besar');$('#md').classList.add('show');if(b)jagaModal((kunci?'Raport ':'Nilai ')+s.nama,()=>pnSimpan(false));else jagaModal(0,0,false)}
function pnHit(i){const e=(window._pnEnt||[])[i],el=$('#pnN'+i),c=$('#pnP'+i),t=$('#pnD'+i);if(!e||!el||!c)return;let n=null;
 try{n=pnNum(el.value)}catch(_){c.textContent='!';c.className='badge Alpa';return}
 const p=pnPred(n,e.k);c.textContent=p||'-';c.className='badge '+(pnPredCls[p]||'');if(t)t.placeholder=p?pnDesk(p,e.m):'Dibuat otomatis sesuai predikat'}
function pnAmbilKeh(){const k=pnKeh[pnSis]||{sakit:0,izin:0,alpa:0};$('#pnSk').value=k.sakit;$('#pnIz').value=k.izin;$('#pnAl').value=k.alpa;toast('Kehadiran diisi dari absensi. Tekan Simpan untuk menyimpan')}
function pnBaca(){const ent=window._pnEnt||[];
 const nilai=ent.map((e,i)=>{let n;try{n=pnNum($('#pnN'+i).value)}catch(x){throw new Error(e.m+': '+x.message)}const t=$('#pnD'+i),d=t&&t.value.trim()?t.value.trim():null;return Object.assign({m:e.m,k:e.k,n,d},e.a?{a:e.a}:{})});
 const ang=id=>{const v=String($(id).value).trim()||'0';if(!/^\d{1,3}$/.test(v))throw new Error('Jumlah hari kehadiran harus berupa angka bulat');return +v};
 const ke=window._kepE,kjEl=$('#pkKj'),ktEl=$('#pkKt');if(ke&&kjEl){ke.kj=kjEl.value;if(ktEl)ke.kt=ktEl.value}
 return{nilai,sakit:ang('#pnSk'),izin:ang('#pnIz'),alpa:ang('#pnAl'),catatan:($('#pnCat').value||'').trim()||null,kepAda:!!(ke&&kjEl),kj:ke&&kjEl?(ke.kj||''):'',kt:ke&&kjEl&&ke.kj==='naik'?(ke.kt||''):''}}
/* pasang satu baris raport hasil simpan ke daftar kelas tanpa memuat ulang semuanya */
function pnPasang(row){if(!row||!row.siswa_id)return false;const i=pnRap.findIndex(x=>x.siswa_id===row.siswa_id);if(i>=0)pnRap[i]=row;else pnRap.push(row);return true}
function pnSimpan(lanjut){pnFix();const kl=pnKl(pnK);if(!kl||!pnBoleh(kl))return;let d;try{d=pnBaca()}catch(e){return toast(e.message,false)}
 if(d.kepAda&&d.kj==='naik'&&!d.kt)return toast('Pilih kelas tujuan untuk keputusan Naik kelas',false);
 const sis=pnDaftar(),nxt=sis[sis.findIndex(x=>x.id===pnSis)+1],kos=(d.nilai||[]).filter(x=>x.n==null).map(x=>x.m);
 if(lanjut==='terbitlanjut'){if(kos.length)return toast('Belum bisa diterbitkan. Nilai belum diisi: '+kos.join(', '),false);if(!pnOkTerbit()){pnTanyaTerbit().then(ya=>{if(ya)pnSimpan('terbitlanjut')});return}}
 return guard(async()=>{const hs=await pnTry(()=>dbq(db.from('rapor').upsert({siswa_id:pnSis,kelas_id:kl.id,kelas_nama:kl.nama,tahun_ajaran:S.set.tahun_ajaran,semester:pnSem,jenis:pnJenis,status:'draf',nilai:d.nilai,sakit:d.sakit,izin:d.izin,alpa:d.alpa,catatan:d.catatan},{onConflict:'siswa_id,tahun_ajaran,semester,jenis'}).select('*')));
  if(!pnPasang((hs||[])[0]))await pnMuat();
  let kepGagal='';if(d.kepAda){try{await pkKepSimpan(window._kepE,kl,{kj:d.kj,kt:d.kt})}catch(x){kepGagal=' Keputusan akhir tahun TIDAK tersimpan: '+(x.message||x)}}
  if(lanjut==='terbitlanjut'){await pnTerbitLanjut(pnSis,kepGagal);return true}
  if(lanjut&&nxt){renderV();pnBuka(nxt.id);toast('Tersimpan. Lanjut ke '+nxt.nama+(kos.length?'. Belum diisi: '+kos.join(', ')+'.':'')+kepGagal,!kepGagal)}else{closeM();renderV();toast('Draf nilai tersimpan'+(kos.length?'. Belum diisi: '+kos.join(', ')+'.':'')+kepGagal,!kepGagal)}return true})}
/* Terbitkan & lanjutkan (angka dan level): simpan, terbitkan siswa ini, lalu buka siswa berikutnya yang belum terbit.
   Konfirmasi hanya ditanya sekali per kelas dan periode selama popup belum ditutup. */
const pnOkKey=()=>pnK+'|'+pnSem+'|'+pnJenis,pnOkTerbit=()=>window._pnOk===pnOkKey();
async function pnTanyaTerbit(){const ya=await konfirmasi('Terbitkan raport siswa ini lalu lanjut ke siswa berikutnya? Setelah terbit, raport terkunci dan dapat dilihat orang tua di portal anak. Untuk mengubahnya, penerbitan harus dibatalkan dulu.\n\nKonfirmasi ini tidak ditanyakan lagi untuk siswa berikutnya selama popup nilai tidak ditutup.',{judul:'Terbitkan dan lanjutkan',ya:'Terbitkan',ikon:'🚀'});if(ya)window._pnOk=pnOkKey();return ya}
async function pnTerbitLanjut(sid,ktr){const kl=pnCtx((siswaById(sid)||{}).kelas_id),r=pnRap.find(x=>x.siswa_id===sid),s=siswaById(sid);if(!kl||!r||!s)return;
 if(r.fmt!=='perkembangan'&&!pnLengkap(r))throw new Error('Draf tersimpan, tetapi belum bisa diterbitkan karena nilai belum lengkap');
 const kur=pkKurang([r]);if(kur.length)throw new Error('Draf tersimpan, tetapi indikator belum lengkap: '+kur.join(', '));
 await pnTerbitInti([r.id]);
 const sis=pnDaftar(),i=sis.findIndex(x=>x.id===sid),nxt=sis.slice(i+1).find(x=>{const q=pnRap.find(y=>y.siswa_id===x.id);return !q||q.status!=='terbit'});
 renderV();
 if(nxt){pnBuka(nxt.id);toast('Raport '+s.nama+' diterbitkan. Lanjut ke '+nxt.nama+'.'+(ktr||''),!ktr)}
 else{closeM();toast('Raport '+s.nama+' diterbitkan. Tidak ada siswa berikutnya yang belum terbit.'+(ktr||''),!ktr)}}
/* inti penerbitan: dipanggil di dalam guard(). UAS Semester 2 membawa keputusan akhir ke dalam raport */
async function pnTerbitInti(ids,baru){
 if(pnAll){for(const [kid,arr] of pnBagiKelas(ids)){if(!pnCtx(kid))continue;await pnTerbitInti1(arr.map(r=>r.id),baru)}pnCtx(0);await pnMuat();return}
 await pnTerbitInti1(ids,baru);await pnMuat()}
async function pnTerbitInti1(ids,baru){const kl=pnKl(pnK),semua=pnRap.filter(r=>ids.includes(r.id)),rows=semua.filter(r=>r.fmt!=='perkembangan'),w=ttdWali(kl.nama)||{},k=ttdKepsek()||{};
 const ttd={wali_nama:w.nama||null,wali_nip:w.nip||null,kepsek_nama:k.nama||null,kepsek_nip:k.nip||null};
 if(semua.length>rows.length)await pkTerbitInti(semua,ttd,baru);
 if(!rows.length);else if(pnUas2()){const baris=rows.map(r=>{const kp=pnKepKep.get(r.siswa_id);return{siswa_id:r.siswa_id,kelas_id:r.kelas_id,kelas_nama:r.kelas_nama,tahun_ajaran:r.tahun_ajaran,semester:r.semester,jenis:r.jenis,status:'terbit',nilai:r.nilai,sakit:r.sakit,izin:r.izin,alpa:r.alpa,catatan:r.catatan,keputusan:kp?kp.jenis:null,kelas_tujuan:kp&&kp.jenis==='naik'?(kp.kelas_tujuan_nama||null):null,...ttd}});
  await pnTry(()=>dbq(db.from('rapor').upsert(baris,{onConflict:'siswa_id,tahun_ajaran,semester,jenis'})))}
 else await pnTry(()=>dbq(db.from('rapor').update({status:'terbit',...ttd}).in('id',rows.map(r=>r.id))))}
async function pnTerbit(ids){const kl=pnAll?null:pnKl(pnK);if(pnAll)ids=pnIzin(ids);else if(!kl||!pnBoleh(kl))return;if(!ids.length)return;
 const rows=pnRap.filter(r=>ids.includes(r.id));if(!rows.length)return;
 {const kur=pnAll?(()=>{const o=[];for(const [kid,arr] of pnBagiKelas(ids)){pnCtx(kid);o.push(...pkKurang(arr))}pnCtx(0);return o})():pkKurang(rows);if(kur.length)return info('Indikator belum lengkap','<div class="note">Lengkapi penilaian untuk:</div><div class="mu">'+kur.map(esc).join('<br>')+'</div>')}
 if(!await konfirmasi('Terbitkan raport '+ids.length+' siswa '+(pnAll?'dari semua kelas':'kelas '+kl.nama)+'? Setelah terbit, raport terkunci dan dapat dilihat orang tua di portal anak. Untuk mengubahnya, penerbitan harus dibatalkan dulu.',{judul:'Terbitkan raport',ya:'Terbitkan',ikon:'🚀'}))return;
 guard(async()=>{await pnTerbitInti(ids);renderV();toast(ids.length+' raport diterbitkan')})}
/* terbitkan ulang: tarik ke draf lalu terbitkan lagi dengan data terbaru (nilai, kehadiran, keputusan, nama wali kelas dan kepala sekolah) */
async function pnTerbitUlang(ids,baru){const kl=pnAll?null:pnKl(pnK);if(pnAll)ids=pnIzin(ids);else if(!kl||!pnBoleh(kl))return;if(!ids.length)return;
 const rows=pnRap.filter(r=>ids.includes(r.id)&&r.status==='terbit');if(!rows.length)return;
 if(baru){const kur=pnAll?(()=>{const o=[];for(const [kid,arr] of pnBagiKelas(rows.map(r=>r.id))){pnCtx(kid);o.push(...pkKurang(arr,true))}pnCtx(0);return o})():pkKurang(rows,true);if(kur.length)return info('Indikator terbaru belum lengkap','<div class="note">Master punya indikator yang belum dinilai. Batalkan penerbitan, buka lembar nilai, tekan <b>Pakai indikator terbaru</b>, isi, lalu terbitkan. Siswa:</div><div class="mu">'+kur.map(esc).join('<br>')+'</div>')}
 if(!await konfirmasi('Terbitkan ulang raport '+rows.length+' siswa '+(pnAll?'dari semua kelas':'kelas '+kl.nama)+'? Raport ditarik ke draf lalu langsung diterbitkan lagi dengan data terbaru. Status "Terkirim" akan diulang dari awal, jadi tautan perlu dikirim lagi bila diperlukan.'+(rows.some(r=>r.fmt==='perkembangan')?(baru?' Indikator raport perkembangan diganti dengan indikator terbaru.':' Raport perkembangan tetap memakai indikator lama.'):''),{judul:'Terbitkan ulang raport',ya:'Terbitkan ulang',ikon:'🔄'}))return;
 const idr=rows.map(r=>r.id);
 guard(async()=>{await pnTry(()=>dbq(db.from('rapor').update({status:'draf'}).in('id',idr)));await pnMuat();
  try{await pnTerbitInti(idr,baru)}catch(e){renderV();throw new Error('Raport sudah ditarik ke draf tetapi gagal diterbitkan ulang ('+(e.message||e)+'). Tekan Terbitkan untuk mengulang.')}
  renderV();toast(idr.length+' raport diterbitkan ulang')})}
async function pnBatal(id){const kl=pnCtx((siswaById((pnRap.find(x=>x.id===id)||{}).siswa_id)||{}).kelas_id);if(!kl||!pnBoleh(kl))return;
 if(!await konfirmasi('Batalkan penerbitan raport ini? Raport kembali menjadi draf dan tidak lagi tampil di portal orang tua sampai diterbitkan ulang.',{bahaya:1,judul:'Batalkan penerbitan',ya:'Batalkan',ikon:'↩️'}))return;
 guard(async()=>{await pnTry(()=>dbq(db.from('rapor').update({status:'draf'}).eq('id',id)));await pnMuat();closeM();renderV();toast('Penerbitan dibatalkan, raport kembali menjadi draf')})}

/* ---- Tahap 4: Keputusan akhir, Kirim laporan (WhatsApp), Raport di menu Alumni ---- */
const KEPT={naik:'Naik kelas',tinggal:'Tinggal kelas',lulus:'Lulus'},KEPS={sementara:'Sementara',disahkan:'Disahkan',diterapkan:'Diterapkan'};
const pnIsiTab=()=>pnTab==='mapel'?pnMapelHTML():pnTab==='kel'?pkKelHTML():pnTab==='kep'?pnKepHTML():pnTab==='kirim'?pnKirimHTML():pnNilaiHTML();
const pnJenisTxt=j=>j==='UTS'?'Ujian Tengah Semester (UTS)':'Ujian Akhir Semester (UAS)';

/* ---- Tab Keputusan akhir (kesiapan raport UAS Semester 2) ---- */
/* lihat raport dari tab Keputusan akhir: pratinjau yang sama dengan halaman Raport (Rapor.pratinjau), keputusan terbaru ikut tampil */
function pnKepLihatHTML(s,r){const stt=r.status==='terbit'?'<span class="badge hadir">Terbit</span>':'<span class="badge terlambat">Draf</span>';
 return `<div class="rpv"><div class="note"><b>${esc(s.nama)}</b>${s.nisn?' · NISN '+esc(s.nisn):''}<br>Kelas ${esc(r.kelas_nama||'-')} · TA ${esc(r.tahun_ajaran)} · Semester ${esc(r.semester)} · ${esc(r.jenis)} ${stt}</div>
  <div class="tb" style="flex-wrap:wrap;align-items:center"><button type="button" class="btn soft sm" onclick="rpZoom(-80)">➖ Perkecil</button><button type="button" class="btn soft sm" onclick="rpZoom(80)">➕ Perbesar</button><span class="mu">Geser untuk melihat bagian lain</span></div>
  <div id="rpPrev" class="rpprev"><div class="note">⏳ Menyiapkan raport...</div></div>
  <div class="tb" style="flex-wrap:wrap"><button type="button" class="btn success grow" onclick="pnPdf([${r.id}],this)">📄 Unduh PDF</button></div></div>`}
function pnKepLihat(sid){const kl=pnCtx((siswaById(sid)||{}).kelas_id),r0=pnRap.find(x=>x.siswa_id===sid),s=siswaById(sid);if(!kl||!r0||!s)return toast('Raport siswa ini belum ada',false);
 guard(async()=>{let r=r0;if(r.fmt!=='perkembangan'&&r.status!=='terbit'){const ko=pkKepO(r);if(ko.keputusan)r=Object.assign({},r,{keputusan:ko.keputusan,kelas_tujuan:ko.kelasTujuan||null})}
  const D=await rpDataD(r);info('Raport '+s.nama,pnKepLihatHTML(s,r));$('#md').classList.add('besar');
  const w=$('#rpPrev'),bd=$('#mbd');RP.lb=Math.min(1000,Math.max(240,((w&&w.clientWidth)||((bd&&bd.clientWidth)||360)-24)-20));Rapor.pratinjau(w,[D],RP.lb)})}
function pnKepHTML(){if(pnAll)return pnKepSemua();const pil=pnPilK(1);if(!pnK)return pil+PKH;const kl=pnKl(pnK);if(!kl)return pil+PKH;
 if(!S.set.tahun_ajaran)return pil+'<div class="note">Tahun ajaran belum diatur. Isi dulu di menu Pengaturan.</div>';
 if(pnKey!==pnKunci())return pil+'<div class="note">⏳ Memuat...</div>';
 const b=pnBoleh(kl),sis=pnDaftar();if(!sis.length)return pil+'<div class="note">Belum ada siswa aktif di kelas ini.</div>';
 const map=new Map(pnRap.map(r=>[r.siswa_id,r]));let siap=[],ulang=[],nt=0,nk=0;
 const rows=sis.map((s,i)=>{if(pkFmtS(s)){const r=map.get(s.id),k=pnKepKep.get(s.id),terbit=!!r&&r.status==='terbit',M=pkMasterS(s,r),h=M?pkHitung(M,(r&&r.data&&r.data.n)||{}):{tot:0,isi:0},lk=h.tot>0&&h.isi===h.tot;if(k)nk++;
   const kt=k?'<b>'+esc(KEPT[k.jenis]||k.jenis)+'</b>'+(k.jenis==='naik'&&k.kelas_tujuan_nama?' → '+esc(k.kelas_tujuan_nama):'')+'<div class="mu">'+esc(KEPS[k.status]||k.status)+'</div>':'<span class="mu">Belum diputuskan</span>';
   const beda=terbit&&((r.keputusan||'')!==(k?k.jenis:'')||((r.kelas_tujuan||'')!==(k&&k.jenis==='naik'?(k.kelas_tujuan_nama||''):'')));let st,aksi='';
   if(terbit){nt++;ulang.push(r.id);st='<span class="badge hadir">Terbit</span>'+(beda?'<div class="mu" style="color:var(--rd)">⚠ Keputusan berbeda dengan yang tercetak di raport. Terbitkan ulang agar raport mengikuti keputusan terbaru.</div>':'');if(b)aksi=`<div class="pnka"><button class="btn pnk ${beda?'success':'soft'}" onclick="pnTerbitUlang([${r.id}])">🔄 Terbitkan ulang</button></div>`}
   else if(!r)st='<span class="mu">Belum diisi</span>';
   else if(!lk)st='<span class="badge terlambat">Draf</span><div class="mu">Indikator belum lengkap ('+h.isi+'/'+h.tot+')</div>';
   else if(!k)st='<span class="badge terlambat">Draf</span><div class="mu">Belum siap: keputusan akhir tahun belum diisi</div>';
   else{st='<span class="badge terlambat">Draf</span><div class="mu">Siap diterbitkan</div>';siap.push(r.id);if(b)aksi=`<div class="pnka"><button class="btn pnk success" onclick="pnTerbit([${r.id}])">🚀 Terbitkan</button></div>`}
   return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${kt}</td><td>${st}</td><td>${aksi}${r?`<div class="pnka"><button class="btn pnk soft" onclick="pnKepLihat(${s.id})">👁 Lihat</button></div>`:''}</td></tr>`}
  const r=map.get(s.id),k=pnKepKep.get(s.id),terbit=!!r&&r.status==='terbit',lk=pnLengkap(r);if(k)nk++;
  const kt=k?'<b>'+esc(KEPT[k.jenis]||k.jenis)+'</b>'+(k.jenis==='naik'&&k.kelas_tujuan_nama?' → '+esc(k.kelas_tujuan_nama):'')+'<div class="mu">'+esc(KEPS[k.status]||k.status)+'</div>':'<span class="mu">Belum diputuskan</span>';
  let st,aksi='';const beda=terbit&&((r.keputusan||'')!==(k?k.jenis:'')||((r.kelas_tujuan||'')!==(k&&k.jenis==='naik'?(k.kelas_tujuan_nama||''):'')));
  if(terbit){nt++;ulang.push(r.id);if(b)aksi=`<div class="pnka"><button class="btn pnk ${beda?'success':'soft'}" onclick="pnTerbitUlang([${r.id}])">🔄 Terbitkan ulang</button></div>`;
   st='<span class="badge hadir">Terbit</span>'+(beda?'<div class="mu" style="color:var(--rd)">⚠ Berbeda dengan keputusan terbaru. Terbitkan ulang agar raport mengikuti keputusan terbaru.</div>':'')}
  else if(!r)st='<span class="mu">Nilai belum diisi</span>';
  else if(!lk)st='<span class="badge terlambat">Draf</span><div class="mu">Nilai belum lengkap</div>';
  else if(!k)st='<span class="badge terlambat">Draf</span><div class="mu">Belum siap: keputusan akhir tahun belum diisi</div>';
   else{st='<span class="badge terlambat">Draf</span><div class="mu">Siap diterbitkan</div>';siap.push(r.id);if(b)aksi=`<div class="pnka"><button class="btn pnk success" onclick="pnTerbit([${r.id}])">🚀 Terbitkan</button></div>`}
  return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${kt}</td><td>${st}</td><td>${aksi}${r?`<div class="pnka"><button class="btn pnk soft" onclick="pnKepLihat(${s.id})">👁 Lihat</button></div>`:''}</td></tr>`}).join('');
 let h=pil+`<div class="note">Raport <b>UAS Semester 2</b> kelas <b>${esc(kl.nama)}</b> wajib memiliki keputusan naik, tinggal, atau lulus sebelum diterbitkan. Isi di bagian bawah lembar nilai atau melalui menu <b>Kelola Siswa</b>. Diputuskan: <b>${nk}</b> dari ${sis.length} siswa. Raport terbit: <b>${nt}</b>.</div>`;
 if(!pnKepOk)h+='<div class="note" style="color:var(--rd)">Data keputusan tidak dapat dibaca. Hubungi Kepala Sekolah atau muat ulang halaman.</div>';
 h+=`<div class="pntb">${b&&siap.length?`<button class="btn pnk success" onclick="pnTerbit([${siap.join(',')}])">🚀 Terbitkan yang siap (${siap.length})</button>`:''}${b&&ulang.length?`<button class="btn pnk soft" onclick="pnTerbitUlang([${ulang.join(',')}])">🔄 Terbitkan ulang semua (${ulang.length})</button>`:''}<button class="btn pnk soft" onclick="go('kelola')">🎓 Buka Kelola Siswa</button></div>`;
 return h+tab(['No','Nama','Keputusan akhir','Raport UAS Sem. 2','Aksi'],rows)}

function pnKepSemua(){const pil=pnPilK(1);
 if(!S.set.tahun_ajaran)return pil+'<div class="note">Tahun ajaran belum diatur. Isi dulu di menu Pengaturan.</div>';
 if(pnKey!==pnKunci())return pil+'<div class="note">⏳ Memuat...</div>';
 const sis=pnDaftar();if(!sis.length)return pil+'<div class="note">Belum ada siswa aktif.</div>';
 const map=new Map(pnRap.map(r=>[r.siswa_id,r]));let siap=[],ulang=[],nt=0,nk=0,no=0,kid=null;
 const rows=sis.map(s=>{const kl=pnCtx(s.kelas_id),b=pnBoleh(kl);let h='';if(s.kelas_id!==kid){kid=s.kelas_id;no=0;h=pnSemuaHdr(kl,5)}const i=no++;
  const r=map.get(s.id),k=pnKepKep.get(s.id),terbit=!!r&&r.status==='terbit';if(k)nk++;
  const kt=k?'<b>'+esc(KEPT[k.jenis]||k.jenis)+'</b>'+(k.jenis==='naik'&&k.kelas_tujuan_nama?' → '+esc(k.kelas_tujuan_nama):'')+'<div class="mu">'+esc(KEPS[k.status]||k.status)+'</div>':'<span class="mu">Belum diputuskan</span>';
  const beda=terbit&&((r.keputusan||'')!==(k?k.jenis:'')||((r.kelas_tujuan||'')!==(k&&k.jenis==='naik'?(k.kelas_tujuan_nama||''):'')));let st,aksi='';
  if(pkFmtS(s)){const M=pkMasterS(s,r),hh=M?pkHitung(M,(r&&r.data&&r.data.n)||{}):{tot:0,isi:0},lk=hh.tot>0&&hh.isi===hh.tot;
   if(terbit){nt++;if(b)ulang.push(r.id);st='<span class="badge hadir">Terbit</span>'+(beda?'<div class="mu" style="color:var(--rd)">⚠ Keputusan berbeda dengan yang tercetak di raport. Terbitkan ulang agar raport mengikuti keputusan terbaru.</div>':'');if(b)aksi=`<div class="pnka"><button class="btn pnk ${beda?'success':'soft'}" onclick="pnTerbitUlang([${r.id}])">🔄 Terbitkan ulang</button></div>`}
   else if(!r)st='<span class="mu">Belum diisi</span>';
   else if(!lk)st='<span class="badge terlambat">Draf</span><div class="mu">Indikator belum lengkap ('+hh.isi+'/'+hh.tot+')</div>';
   else if(!k)st='<span class="badge terlambat">Draf</span><div class="mu">Belum siap: keputusan akhir tahun belum diisi</div>';
   else{st='<span class="badge terlambat">Draf</span><div class="mu">Siap diterbitkan</div>';if(b){siap.push(r.id);aksi=`<div class="pnka"><button class="btn pnk success" onclick="pnTerbit([${r.id}])">🚀 Terbitkan</button></div>`}}
  }else{const lk=pnLengkap(r);
   if(terbit){nt++;if(b){ulang.push(r.id);aksi=`<div class="pnka"><button class="btn pnk ${beda?'success':'soft'}" onclick="pnTerbitUlang([${r.id}])">🔄 Terbitkan ulang</button></div>`}st='<span class="badge hadir">Terbit</span>'+(beda?'<div class="mu" style="color:var(--rd)">⚠ Berbeda dengan keputusan terbaru. Terbitkan ulang agar raport mengikuti keputusan terbaru.</div>':'')}
   else if(!r)st='<span class="mu">Nilai belum diisi</span>';
   else if(!lk)st='<span class="badge terlambat">Draf</span><div class="mu">Nilai belum lengkap</div>';
   else if(!k)st='<span class="badge terlambat">Draf</span><div class="mu">Belum siap: keputusan akhir tahun belum diisi</div>';
   else{st='<span class="badge terlambat">Draf</span><div class="mu">Siap diterbitkan</div>';if(b){siap.push(r.id);aksi=`<div class="pnka"><button class="btn pnk success" onclick="pnTerbit([${r.id}])">🚀 Terbitkan</button></div>`}}}
  return h+`<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${kt}</td><td>${st}</td><td>${aksi}${r?`<div class="pnka"><button class="btn pnk soft" onclick="pnKepLihat(${s.id})">👁 Lihat</button></div>`:''}</td></tr>`}).join('');
 pnCtx(0);
 let h=pil+`<div class="note">Raport <b>UAS Semester 2</b> <b>semua kelas</b> wajib memiliki keputusan naik, tinggal, atau lulus sebelum diterbitkan. Isi di bagian bawah lembar nilai atau melalui menu <b>Kelola Siswa</b>. Diputuskan: <b>${nk}</b> dari ${sis.length} siswa. Raport terbit: <b>${nt}</b>.</div>`;
 if(!pnKepOk)h+='<div class="note" style="color:var(--rd)">Data keputusan tidak dapat dibaca. Hubungi Kepala Sekolah atau muat ulang halaman.</div>';
 h+=`<div class="pntb">${siap.length?`<button class="btn pnk success" onclick="pnTerbit([${siap.join(',')}])">🚀 Terbitkan yang siap (${siap.length})</button>`:''}${ulang.length?`<button class="btn pnk soft" onclick="pnTerbitUlang([${ulang.join(',')}])">🔄 Terbitkan ulang semua (${ulang.length})</button>`:''}<button class="btn pnk soft" onclick="go('kelola')">🎓 Buka Kelola Siswa</button></div>`;
 return h+tab(['No','Nama','Keputusan akhir','Raport UAS Sem. 2','Aksi'],rows)}

/* ---- Tab Kirim laporan: kirim TAUTAN raport lewat WhatsApp (Fonnte), bukan lampiran file ---- */
function pnPesan(arr){const sk=ns(),per=pnJenisTxt(pnJenis)+' Semester '+pnSem+' · TA '+S.set.tahun_ajaran;let isi;
 if(arr.length===1){const s=arr[0];isi='Berikut tautan raport ananda di '+sk+'.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas+'\nPeriode : *'+per+'*\n\n🔗 '+linkSiswa(s)+'#rapor'}
 else isi='Berikut tautan raport ananda di '+sk+'.\nPeriode : *'+per+'*\n\n'+arr.map((s,i)=>(i+1)+'. *'+s.nama+'* ('+s.kelas+')\n🔗 '+linkSiswa(s)+'#rapor').join('\n\n');
 return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_\n\n'+isi+'\n\nMelalui tautan ini Bapak/Ibu dapat melihat dan mengunduh raport ananda. Mohon tautan tidak dibagikan kepada orang lain.\n\nTerima kasih 🙏🏻\n_Waalaikumsalam warahmatullahi wabarakatuh_'}
/* Pratinjau pesan: tampilan mirip gelembung WhatsApp, persis isi yang akan dikirim */
function pnBubble(teks){let h=esc(teks);h=h.replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/(^|[\s>])_([^_\n<>]+)_(?=[\s<.,!?]|$)/g,'$1<i>$2</i>').replace(/\n/g,'<br>');
 return '<div style="background:#dcf8c6;color:#1f2a1f;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5;word-break:break-word;max-height:55vh;overflow:auto;box-shadow:0 1px 2px rgba(0,0,0,.15)">'+h+'</div>'}
function pnLihatPesan(id){const kl=pnAll?true:pnKl(pnK);if(!kl)return;const map=new Map(pnRap.map(r=>[r.siswa_id,r]));let arr,wa,ket;
 if(id){const s=siswaById(id),r=map.get(id);if(!s||!r||r.status!=='terbit')return toast('Raport siswa ini belum terbit',false);arr=[s];wa=s.wa;ket='Pesan untuk orang tua '+(s.pan||s.nama)}
 else{const terbit=pnDaftar().filter(s=>{const r=map.get(s.id);return r&&r.status==='terbit'});if(!terbit.length)return toast('Belum ada raport terbit di kelas ini',false);
  const belum=terbit.filter(s=>!map.get(s.id).dikirim_pada),{g}=grupLink(belum.length?belum:terbit);
  if(g.length){arr=g[0].arr;wa=g[0].wa;ket='Contoh pesan (nomor pertama yang akan dikirim)'}else{arr=[terbit[0]];wa=terbit[0].wa;ket='Contoh pesan'}}
 tampilPesan(ket,wa,pnPesan(arr),arr.length,'Tautan membuka halaman Rapor anak di portal.')}
function pnKirimSemua(){rkMuatStatus('raport');const pil=pnPilK(1)+pnPeriode();
 if(!S.set.tahun_ajaran)return pil+'<div class="note">Tahun ajaran belum diatur. Isi dulu di menu Pengaturan.</div>';
 if(pnKey!==pnKunci())return pil+'<div class="note">⏳ Memuat...</div>';
 const sis=pnDaftar();if(!sis.length)return pil+'<div class="note">Belum ada siswa aktif.</div>';
 const bOk=s=>pnBoleh(pnKlSiswa(s)),map=new Map(pnRap.map(r=>[r.siswa_id,r])),terbit=sis.filter(s=>{const r=map.get(s.id);return r&&r.status==='terbit'}),belum=terbit.filter(s=>!map.get(s.id).dikirim_pada);
 const {g,tanpa}=grupLink(belum.filter(bOk));let no=0,kid=null;
 const rows=sis.map(s=>{let hd='';if(s.kelas_id!==kid){kid=s.kelas_id;no=0;hd=pnSemuaHdr(pnKlSiswa(s),6)}const i=no++,b=bOk(s);const r=map.get(s.id),ok=!!r&&r.status==='terbit';
  const st=!ok?'<span class="mu">Belum terbit</span>':r.dikirim_pada?'<span class="badge hadir">Terkirim</span><div class="mu">'+fmt(String(r.dikirim_pada).slice(0,10))+'</div>':'<span class="badge terlambat">Belum dikirim</span>';
  const kirim=ok&&b?(s.wa&&s.kode_qr?`<button class="btn pnk success" onclick="pnKirimSatu(${s.id})">${r.dikirim_pada?'📤 Kirim ulang':'📤 Kirim'}</button><button class="btn pnk soft" onclick="pnSalinLink(${s.id})">🔗 Salin tautan</button>`:'<span class="mu" style="text-align:center">Tanpa nomor WA</span>'):'';
  const aksi=ok?`<div class="pnka">${kirim}${s.kode_qr?`<button class="btn pnk soft" onclick="pnLihatPesan(${s.id})">👁 Lihat pesan</button>`:''}</div>`:'';
  return hd+`<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${s.wa?nomorHtml(s.wa):'<span class="mu">-</span>'}</td><td>${st}</td><td>${ok?rkSel(s,'raport',pnJudul()):'<span class="mu">–</span>'}</td><td>${aksi}</td></tr>`}).join('');
 let h=pil+`<div class="note"><b>Semua kelas</b> · Semester ${pnSem} · ${pnJenis}. Yang dikirim hanya <b>tautan</b> raport lewat WhatsApp. Orang tua membuka tautan lalu langsung masuk ke halaman Rapor anak. Raport terbit: <b>${terbit.length}</b> · belum dikirim: <b>${belum.length}</b>${tanpa.length?' · tanpa nomor WA: <b>'+tanpa.length+'</b>':''}.<br>Pengiriman hanya untuk kelas yang Anda kelola (wali kelas, Kepala Sekolah, atau Wakil).</div>`;
 if(terbit.length)h+=`<div class="pntb">${g.length?`<button class="btn pnk success" onclick="pnKirimBelum()">📤 Kirim ke yang belum dikirim (${g.length} nomor)</button>`:''}<button class="btn pnk soft" onclick="pnLihatPesan(0)">👁 Lihat pesan</button><button class="btn pnk soft" onclick="riwayatKirim()">📋 Riwayat kirim</button><button class="btn pnk soft" onclick="rkSegar('raport',this)">🔄 Perbarui status</button></div>`;
 return h+tab(['No','Nama','Nomor WA','Status','Status pesan','Aksi'],rows)}
function pnKirimHTML(){if(pnAll)return pnKirimSemua();rkMuatStatus('raport');const pil=pnPilK(1)+pnPeriode();if(!pnK)return pil+PKH;const kl=pnKl(pnK);if(!kl)return pil+PKH;
 if(!S.set.tahun_ajaran)return pil+'<div class="note">Tahun ajaran belum diatur. Isi dulu di menu Pengaturan.</div>';
 if(pnKey!==pnKunci())return pil+'<div class="note">⏳ Memuat...</div>';
 const b=pnBoleh(kl),sis=pnDaftar();if(!sis.length)return pil+'<div class="note">Belum ada siswa aktif di kelas ini.</div>';
 const map=new Map(pnRap.map(r=>[r.siswa_id,r])),terbit=sis.filter(s=>{const r=map.get(s.id);return r&&r.status==='terbit'}),belum=terbit.filter(s=>!map.get(s.id).dikirim_pada);
 const {g,tanpa}=grupLink(belum);
 const rows=sis.map((s,i)=>{const r=map.get(s.id),ok=!!r&&r.status==='terbit';
  const st=!ok?'<span class="mu">Belum terbit</span>':r.dikirim_pada?'<span class="badge hadir">Terkirim</span><div class="mu">'+fmt(String(r.dikirim_pada).slice(0,10))+'</div>':'<span class="badge terlambat">Belum dikirim</span>';
  const kirim=ok&&b?(s.wa&&s.kode_qr?`<button class="btn pnk success" onclick="pnKirimSatu(${s.id})">${r.dikirim_pada?'📤 Kirim ulang':'📤 Kirim'}</button><button class="btn pnk soft" onclick="pnSalinLink(${s.id})">🔗 Salin tautan</button>`:'<span class="mu" style="text-align:center">Tanpa nomor WA</span>'):'';
  const aksi=ok?`<div class="pnka">${kirim}${s.kode_qr?`<button class="btn pnk soft" onclick="pnLihatPesan(${s.id})">👁 Lihat pesan</button>`:''}</div>`:'';
  return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${s.wa?nomorHtml(s.wa):'<span class="mu">-</span>'}</td><td>${st}</td><td>${ok?rkSel(s,'raport',pnJudul()):'<span class="mu">–</span>'}</td><td>${aksi}</td></tr>`}).join('');
 let h=pil+`<div class="note">Kelas <b>${esc(kl.nama)}</b> · Semester ${pnSem} · ${pnJenis}. Yang dikirim hanya <b>tautan</b> raport lewat WhatsApp. Orang tua membuka tautan lalu langsung masuk ke halaman Rapor anak. Raport terbit: <b>${terbit.length}</b> · belum dikirim: <b>${belum.length}</b>${tanpa.length?' · tanpa nomor WA: <b>'+tanpa.length+'</b>':''}.${b?'':'<br>Hanya wali kelas, Kepala Sekolah, atau Wakil yang dapat mengirim.'}</div>`;
 if(terbit.length)h+=`<div class="pntb">${b&&g.length?`<button class="btn pnk success" onclick="pnKirimBelum()">📤 Kirim ke yang belum dikirim (${g.length} nomor)</button>`:''}<button class="btn pnk soft" onclick="pnLihatPesan(0)">👁 Lihat pesan</button><button class="btn pnk soft" onclick="riwayatKirim()">📋 Riwayat kirim</button><button class="btn pnk soft" onclick="rkSegar('raport',this)">🔄 Perbarui status</button></div>`;
 return h+tab(['No','Nama','Nomor WA','Status','Status pesan','Aksi'],rows)}
async function pnKirimGrup(g,judul){const kl=pnKl(pnK);let ok=0,gagal=[],ids=[];const MT={...rkMeta('raport'),judul:pnJudul()};ld(1);
 try{if(g.length===1){const x=g[0];try{await apiKirim(x.wa,pnPesan(x.arr),{...MT,label:x.pan,siswa_ids:idsDari(x)});ok++;x.arr.forEach(s=>{const r=pnRap.find(y=>y.siswa_id===s.id);if(r)ids.push(r.id)})}catch(e){gagal.push(x.pan+' ('+(e.message||e)+')')}}
  else{const hs=await kirimBertahap(g.map(x=>({nomor:x.wa,teks:pnPesan(x.arr),label:x.pan,siswa_ids:idsDari(x)})),MT);hs.forEach((h,i)=>{const x=g[i];if(h&&h.ok){ok++;x.arr.forEach(s=>{const r=pnRap.find(y=>y.siswa_id===s.id);if(r)ids.push(r.id)})}else gagal.push(x.pan+' ('+((h&&h.error)||'gagal')+')')})}}finally{ld(0)}
 if(ids.length){try{await pnTry(()=>dbq(db.from('rapor').update({dikirim_pada:new Date().toISOString()}).in('id',ids)))}catch(e){gagal.push('Gagal mencatat status terkirim: '+(e.message||e))}}
 try{await pnMuat()}catch(e){}try{await rkMuatStatus('raport',true)}catch(e){}renderV();
 info(judul||'Hasil pengiriman raport','<div class="note">'+(g.length>1?'📅 Terjadwal':'✅ Berhasil')+': <b>'+ok+'</b> pesan<br>❌ Gagal: <b>'+gagal.length+'</b></div>'+(g.length>1&&ok?'<div class="mu">Fonnte mengirim bertahap dengan jeda 15-30 detik per nomor. Halaman boleh ditutup. Tanda Terkirim dicatat saat jadwal diterima; status sebenarnya ada di Riwayat kirim.</div>':'')+(g.length>1?'<div class="tb" style="margin-top:10px"><button class="btn soft" onclick="closeM();setTimeout(riwayatKirim,150)">📋 Lihat riwayat kirim</button></div>':'')+(gagal.length?'<div class="mu">'+gagal.map(esc).join('<br>')+'</div>':''));toast(ok+(g.length>1?' terjadwal, ':' terkirim, ')+gagal.length+' gagal',!gagal.length)}
async function pnKirimBelum(){const kl=pnAll?true:pnKl(pnK);if(!kl||(!pnAll&&!pnBoleh(kl)))return;const map=new Map(pnRap.map(r=>[r.siswa_id,r]));
 const {g,tanpa}=grupLink(pnDaftar().filter(s=>{const r=map.get(s.id);return r&&r.status==='terbit'&&!r.dikirim_pada&&(!pnAll||pnBoleh(pnKlSiswa(s)))}));if(!g.length)return toast('Tidak ada raport yang perlu dikirim',false);
 const est=estJadwal(g.length);
 if(await konfirmasi('Kirim tautan raport '+pnJenis+' Semester '+pnSem+(pnAll?' semua kelas':' kelas '+kl.nama)+' ke '+g.length+' nomor orang tua sekarang?'+(tanpa.length?'\n\n'+tanpa.length+' siswa dilewati karena belum punya nomor WA.':'')+'\n\nPesan dijadwalkan bertahap (jeda 15-30 detik per nomor), perkiraan semua terkirim '+est+'. Halaman boleh ditutup setelah proses penjadwalan selesai (beberapa detik).',{judul:'Kirim tautan raport',ikon:'📤',ya:'Kirim'}))pnKirimGrup(g)}
async function pnKirimSatu(id){const kl=pnCtx((siswaById(id)||{}).kelas_id),s=siswaById(id),r=pnRap.find(x=>x.siswa_id===id);if(!kl||!pnBoleh(kl)||!s||!r||r.status!=='terbit')return;if(!s.wa||!s.kode_qr)return toast('Anak ini belum punya nomor WA orang tua',false);
 if(await konfirmasi('Kirim tautan raport '+(s.pan||s.nama)+' ke '+waLokal(s.wa)+'?'+(r.dikirim_pada?'\n\nRaport ini sudah pernah dikirim. Pesan akan dikirim ulang.':''),{judul:'Kirim tautan raport',ikon:'📤',ya:'Kirim'}))pnKirimGrup([{wa:String(s.wa),pan:s.pan||s.nama,arr:[s]}])}
async function pnSalinLink(id){const s=siswaById(id);if(!s||!s.kode_qr)return toast('Tautan anak belum tersedia',false);const ok=await salinLink(linkSiswa(s)+'#rapor');ok?toast('Tautan raport '+(s.pan||s.nama)+' disalin'):toast('Tidak bisa menyalin, coba lagi',false)}

/* ---- Raport alumni (menu Alumni): hanya raport terbit, ikut terhapus bila data alumni dihapus ---- */
async function alRapor(id){const a=(AL.data||[]).find(x=>x.id===id);if(!a)return;
 guard(async()=>{const rs=await dbq(db.from('rapor').select('*').eq('alumni_id',id).eq('status','terbit').order('tahun_ajaran').order('semester').order('jenis',{ascending:false}));
  window._alRap=rs||[];window._alA=a;
  if(typeof PKR!=='undefined'&&window._alRap.some(r=>r.fmt==='perkembangan')){
   try{if(!PKR.loaded)await pkMuat();
    const hs=[...new Set(window._alRap.map(r=>r.salinan_hash).filter(x=>x&&!PKR.sal.has(x)))];
    if(hs.length){const sal=await dbq(db.from('rapor_salinan').select('hash,isi').in('hash',hs));(sal||[]).forEach(x=>PKR.sal.set(x.hash,x.isi))}
   }catch(e){console.warn('Indikator raport alumni belum termuat',e)}}
  if(!window._alRap.length){info('Raport '+a.nama,'<div class="note">Tidak ada raport terbit yang tersimpan untuk alumni ini.</div>');return}
  info('Raport '+a.nama,'<div class="mu" style="margin-bottom:8px">Raport tersimpan selama data alumni ada, lalu terhapus bersama data alumni.</div>'+window._alRap.map((r,i)=>`<div class="tb" style="align-items:center"><div style="flex:1"><b>${r.jenis} Semester ${r.semester}</b><div class="mu">TA ${esc(r.tahun_ajaran)} · Kelas ${esc(r.kelas_nama||'-')}</div></div><button class="btn sm soft" onclick="alRaporLihat(${i})">👁 Lihat</button><button class="btn sm soft" onclick="alRaporPdf([${i}],this)">📄 PDF</button></div>`).join('')+`<div class="tb"><button class="btn success" onclick="alRaporPdf([${window._alRap.map((_,i)=>i).join(',')}],this)">📄 Unduh semua (${window._alRap.length})</button></div>`)})}
async function alRaporD(a,r,logo,stempel){
 if(r.fmt==='perkembangan')return pkSusun(r,logo,{alumni:true,nama:a.nama,nisn:a.nisn||'',tempat:a.tempat_lahir||'',tgl:a.tgl_lahir||'',stempel});
 return Rapor.susun(r,{logo,stempel,sekolah:ns(),alamat:(S.set&&S.set.alamat)||'',kota:kotaTtd(),nama:a.nama,nisn:a.nisn||'',wali:null,kepsek:null})}
/* pratinjau satu raport alumni (satu siswa, satu raport) */
function alRaporLihat(i){const a=window._alA,r=(window._alRap||[])[i];if(!a||!r)return;
 guard(async()=>{await muatLib('pdf');const logo=await Rapor.logoPng(S.set&&S.set.logo).catch(()=>null),stempel=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null),D=await alRaporD(a,r,logo,stempel);
  info('Raport '+a.nama,`<div class="rpv"><div class="note"><b>${esc(a.nama)}</b>${a.nisn?' · NISN '+esc(a.nisn):''}<br>Kelas ${esc(r.kelas_nama||'-')} · TA ${esc(r.tahun_ajaran)} · Semester ${esc(r.semester)} · ${esc(r.jenis)}</div>
  <div class="tb" style="flex-wrap:wrap;align-items:center"><button type="button" class="btn soft sm" onclick="rpZoom(-80)">➖ Perkecil</button><button type="button" class="btn soft sm" onclick="rpZoom(80)">➕ Perbesar</button><span class="mu">Geser untuk melihat bagian lain</span></div>
  <div id="rpPrev" class="rpprev"><div class="note">⏳ Menyiapkan raport...</div></div>
  <div class="tb" style="flex-wrap:wrap"><button type="button" class="btn soft grow" onclick="closeM();alRapor(${a.id})">⬅ Daftar raport</button><button type="button" class="btn success grow" onclick="alRaporPdf([${i}],this)">📄 Unduh PDF</button></div></div>`);
  $('#md').classList.add('besar');
  const w=$('#rpPrev'),bd=$('#mbd');RP.lb=Math.min(1000,Math.max(240,((w&&w.clientWidth)||((bd&&bd.clientWidth)||360)-24)-20));Rapor.pratinjau(w,[D],RP.lb)})}
function alRaporPdf(idx,btn){const a=window._alA,rs=idx.map(i=>window._alRap[i]).filter(Boolean);if(!a||!rs.length)return;
 const bersih=t=>String(t||'').replace(/[^\w\-]+/g,'-').replace(/^-+|-+$/g,'');
 pnPdfBuat(rs,r=>({alumni:true,nama:a.nama,nisn:a.nisn||'',tempat:a.tempat_lahir||'',tgl:a.tgl_lahir||'',wali:null,kepsek:null}),'Raport-'+bersih(a.nama)+(rs.length===1?'-'+rs[0].jenis+'-S'+rs[0].semester+'-'+bersih(rs[0].tahun_ajaran):'-semua'),btn)}

/* ---- PDF raport: DESAIN ada di /rapor.js (dipakai bersama portal). Di sini hanya menyiapkan data ---- */
async function pnPdfBuat(rs,infoFn,nf,btn){await muatLib('pdf');if(!setUnduhBusy(btn,true,'Membuat PDF...'))return;
 try{await jedaUnduh();const logo=await Rapor.logoPng(S.set&&S.set.logo).catch(()=>null),stempel=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null),infos=rs.map(r=>infoFn(r)||{}),ids=[];
  rs.forEach((r,i)=>{const w=infos[i].wali||ttdWali(r.kelas_nama),k=infos[i].kepsek||ttdKepsek(),pg=r.fmt==='perkembangan'?pkPengelola([w&&w.id,k&&k.id]):null;if(w&&w.id)ids.push(w.id);if(k&&k.id)ids.push(k.id);if(pg&&pg.id)ids.push(pg.id)});
  const sig=await ttdPngAmbil(ids);
  const Ds=rs.map((r,ix)=>{const i=infos[ix];if(r.fmt==='perkembangan')return pkSusun(r,logo,{...i,ttd:sig,stempel});i.wali=i.wali||ttdWali(r.kelas_nama);i.kepsek=i.kepsek||ttdKepsek();if(i.wali&&i.wali.id)i.wali.ttd=sig[i.wali.id]||null;if(i.kepsek&&i.kepsek.id)i.kepsek.ttd=sig[i.kepsek.id]||null;if(r.status!=='terbit'){const ko=pkKepO(r);if(ko.keputusan)r=Object.assign({},r,{keputusan:ko.keputusan,kelas_tujuan:ko.kelasTujuan||null})}return Rapor.susun(r,{logo,stempel,sekolah:ns(),alamat:(S.set&&S.set.alamat)||'',kota:kotaTtd(),nama:i.nama,nisn:i.nisn,wali:i.wali,kepsek:i.kepsek})});
  await Rapor.pdf(Ds,nf);toast('PDF raport sedang diproses, mohon ditunggu')}
 catch(e){toast('Gagal membuat PDF: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
async function pnPdf(ids,btn){const rs=pnRap.filter(r=>ids.includes(r.id));if(!rs.length)return toast('Belum ada raport tersimpan untuk diunduh',false);
 const nmS=r=>(siswaById(r.siswa_id)||{}).nama||'';
 const kix=r=>{const i=S.kelas.findIndex(k=>k.nama===r.kelas_nama);return i<0?999:i},urut=rs.slice().sort((a,b)=>(kix(a)-kix(b))||nmS(a).localeCompare(nmS(b),'id')),r0=urut[0],bersih=t=>String(t||'').replace(/[^\w\-]+/g,'-').replace(/^-+|-+$/g,'');
 const nf=urut.length===1?'Raport-'+bersih(nmS(r0))+'-'+r0.jenis+'-S'+r0.semester:'Raport-'+bersih(new Set(urut.map(r=>r.kelas_nama)).size>1?'Semua-kelas':r0.kelas_nama)+'-'+r0.jenis+'-S'+r0.semester+'-'+bersih(r0.tahun_ajaran);
 return pnPdfBuat(urut,r=>{const s=siswaById(r.siswa_id)||{};return{nama:s.nama,nisn:s.nisn,wali:ttdWali(r.kelas_nama),kepsek:ttdKepsek()}},nf,btn)}

