/* ---------- absensi multi hari (batch) ---------- */
const MH_MAKS=31,MH_CHUNK=500,MH_DEL=200,MH_ST=['Hadir','Terlambat','Izin','Sakit','Alpa','Libur','Kosongkan'];
let mMulti=false,mA=TODAY,mB=TODAY,mStatus='Hadir',mCat='',mLewat=true,mTimpa=false;const mSel=new Set();
const tglTambah=(d,n)=>{const x=new Date(d+'T00:00:00');x.setDate(x.getDate()+n);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
const mHari=()=>{const r=[];if(!/^\d{4}-\d{2}-\d{2}$/.test(mA)||!/^\d{4}-\d{2}-\d{2}$/.test(mB)||mB<mA)return r;for(let d=mA;d<=mB&&r.length<=MH_MAKS;d=tglTambah(d,1))r.push(d);return r};
function mhLv(){const l=act().filter(s=>attKelas&&(attKelas==='*'||s.kelas===attKelas)),q=attQ.toLowerCase();return {l,lv:l.filter(s=>!attQ||s.nama.toLowerCase().includes(q)||s.pan.toLowerCase().includes(q)||String(s.nisn||'').includes(attQ.trim())||cocokWA(s.wa,attQ))}}
function mhCards(lv){return lv.map((s,i)=>`<div class="card sc mh c${i%4+1}${mSel.has(s.id)?' msel':''}" data-id="${s.id}" onclick="mhTog(${s.id})"><span class="nbadge" title="Nomor urut">${i+1}</span><input type="checkbox" class="mh-ck" ${mSel.has(s.id)?'checked':''} onclick="event.stopPropagation();mhTog(${s.id})" aria-label="Pilih ${esc(s.pan)}"><div class="av">${ini(s.pan)}</div><div class="mh-t"><div class="sn">${esc(s.pan)}</div><div class="sk">${esc(s.nama)} - ${esc(s.kelas)}</div><div class="sk">NISN: ${esc(s.nisn||'-')}</div></div></div>`).join('')||(attKelas?(attQ?'<div class="mu">Nama siswa tidak ditemukan.</div>':'<div class="mu">Belum ada siswa.</div>'):PKH)}
function mhView(){const {lv}=mhLv(),hari=mHari(),maxB=tglTambah(mA,MH_MAKS-1);setTimeout(()=>{if(view==='absensi'&&mMulti)mhUpd()},0);
 return `<div class="panel"><div class="ph">✍️ Absensi Manual · Multi Hari</div><div class="pb"><div class="tb"><button class="btn sm mh-on" style="margin-top:4px" onclick="mhToggle()">📆 Multi Hari: Aktif</button>${cpick('absKelasPick','kelas',attKelas,[{value:'*',label:'Semua kelas'}].concat(S.kelas.map(k=>({value:k.nama,label:k.nama}))),'setAttKelas','Pilih kelas')}<input id="attCari" class="input grow" placeholder="Cari nama siswa..." value="${esc(attQ)}" oninput="cariAbsensiInput(this)"></div>
 <div class="mh-box"><div class="mh-row"><div class="mh-c"><div class="mh-lbl">Tanggal mulai</div>${dt('date',mA,'mhTglA(this.value)','',{id:'mhA'})}</div><div class="mh-c"><div class="mh-lbl">Tanggal akhir</div>${dt('date',mB,'mhTglB(this.value)','',{id:'mhB',min:mA,max:maxB})}</div></div>
 <div class="mu" style="margin-top:8px">${hari.length} hari dipilih (maksimal ${MH_MAKS} hari per proses). Hari libur ditentukan per kelas saat diterapkan.</div>
 <div class="mh-lbl" style="margin-top:12px">Status yang diterapkan</div><div class="mh-st">${MH_ST.map(x=>`<button type="button" class="${mStatus===x?'sel':''}${x==='Kosongkan'?' dng':''}" onclick="mhSt('${x}')">${x}</button>`).join('')}</div>
 ${mStatus!=='Kosongkan'?`<div class="mh-lbl" style="margin-top:12px">Catatan (opsional)</div><input id="mhCat" class="input" style="width:100%" maxlength="150" value="${esc(mCat)}" oninput="mCat=this.value" placeholder="Contoh: sakit demam / izin acara keluarga">`:''}
 ${mStatus!=='Libur'?`<label class="mh-opt"><input type="checkbox" ${mLewat?'checked':''} onchange="mLewat=this.checked;mhUpd()"><span>Lewati hari libur<br><span class="mu">Sabtu/Minggu, libur nasional, dan libur kelas tidak diubah.</span></span></label>`:''}
 ${mStatus!=='Kosongkan'?`<label class="mh-opt"><input type="checkbox" ${mTimpa?'checked':''} onchange="mTimpa=this.checked;mhUpd()"><span>Timpa data yang sudah terisi<br><span class="mu">Jika dimatikan, hanya tanggal yang masih kosong yang diisi.</span></span></label>`:''}</div>
 <div class="mh-all"><label><input type="checkbox" class="mh-ck" id="mhAll" onchange="mhAll(this.checked)"><span id="mhAllT">Pilih semua (${lv.length} tampil)</span></label><span id="mhCnt" class="mu"></span></div>
 <div class="cards">${mhCards(lv)}</div></div></div>
 <div style="height:76px"></div><div class="save"><div><b id="mhBarT"></b><div class="mu" id="mhBarS"></div></div><button id="mhGo" class="btn success sm dl" style="padding:7px 18px" onclick="mhTerapkan()">${mStatus==='Kosongkan'?'🗑 Kosongkan':'✅ Terapkan'}</button></div>`}
function mhUpd(){const {lv}=mhLv(),hari=mHari(),n=mSel.size,vis=lv.filter(s=>mSel.has(s.id)).length,all=$('#mhAll');if(all){all.checked=lv.length>0&&vis===lv.length;all.indeterminate=vis>0&&vis<lv.length}
 const at=$('#mhAllT');if(at)at.textContent='Pilih semua ('+lv.length+' tampil)';const c=$('#mhCnt');if(c)c.textContent=n+' dipilih';const t=$('#mhBarT');if(t)t.textContent=n+' anak × '+hari.length+' hari';
 const s=$('#mhBarS');if(s)s.textContent=mStatus==='Kosongkan'?'Menghapus isian absensi yang sudah ada':'Status '+mStatus+(mLewat&&mStatus!=='Libur'?' · lewati libur':'')+(mTimpa?' · timpa yang terisi':' · hanya yang kosong');const g=$('#mhGo');if(g)g.disabled=!n||!hari.length}
function mhTog(id){mSel.has(id)?mSel.delete(id):mSel.add(id);const c=document.querySelector('#v .card.mh[data-id="'+id+'"]');if(c){c.classList.toggle('msel',mSel.has(id));const k=c.querySelector('.mh-ck');if(k)k.checked=mSel.has(id)}mhUpd()}
function mhAll(on){const {lv}=mhLv();lv.forEach(s=>on?mSel.add(s.id):mSel.delete(s.id));document.querySelectorAll('#v .card.mh').forEach(c=>{c.classList.toggle('msel',on);const k=c.querySelector('.mh-ck');if(k)k.checked=on});mhUpd()}
function mhSt(x){mStatus=x;renderV()}
function mhTglA(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return;mA=v;if(mB<mA)mB=mA;const mx=tglTambah(mA,MH_MAKS-1);if(mB>mx)mB=mx;renderV()}
function mhTglB(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return;mB=v;renderV()}
async function mhToggle(){if(!await jagaTanya(mMulti?['multi']:['absensi']))return;if(!mMulti){if(draft&&JSON.stringify(draft)!==JSON.stringify(A(attDate))&&!await konfirmasi('Ada perubahan absensi tanggal ini yang belum disimpan. Beralih ke mode multi hari tanpa menyimpannya?',{judul:'Perubahan belum disimpan',ya:'Lanjutkan'}))return;mMulti=true;mA=attDate||TODAY;mB=mA;mSel.clear();mStatus='Hadir';mCat='';mLewat=true;mTimpa=false}else{mMulti=false;mSel.clear()}draft=null;renderV()}
function mhTerapkan(){
 if(!attKelas)return toast(PK,false);
 const hari=mHari();if(!hari.length)return toast('Rentang tanggal tidak valid',false);if(hari.length>MH_MAKS)return toast('Maksimal '+MH_MAKS+' hari per proses',false);
 const siswa=act().filter(s=>mSel.has(s.id)&&(attKelas==='*'||s.kelas===attKelas));if(!siswa.length)return toast('Pilih minimal satu anak',false);
 const kosong=mStatus==='Kosongkan',lewat=mLewat&&mStatus!=='Libur',cat=kosong?null:((mCat||'').trim().slice(0,150)||null),a=mA,b=mB,st=mStatus;
 return (async()=>{
  let termuat=false;await guard(async()=>{await muatRange(a,b);termuat=true});if(!termuat)return;
  const now=new Date().toISOString(),ups=[],hapus=new Map();let baru=0,timpa=0,timpaLuar=0,nLibur=0,nTerisi=0;
  for(const s of siswa)for(const d of hari){
   const e=A(d)[s.id];
   if(lewat&&(isLibur(d,s.kelas)||(e&&e.st==='Libur')))nLibur++;
   else if(kosong){if(e){if(!hapus.has(d))hapus.set(d,[]);hapus.get(d).push(s.id)}}
   else if(e&&!mTimpa)nTerisi++;
   else{if(e){timpa++;if(e.cara==='scan'||e.cara==='whatsapp')timpaLuar++}else baru++;ups.push({siswa_id:s.id,tanggal:d,status:low(st),cara:'manual',catatan:cat,jam_datang:null,diubah:now,diubah_oleh:me})}
  }
  const nHapus=[...hapus.values()].reduce((x,y)=>x+y.length,0),total=ups.length+nHapus;
  if(!total)return toast('Tidak ada data yang perlu diubah'+(nLibur||nTerisi?' ('+(nLibur?nLibur+' dilewati karena libur':'')+(nLibur&&nTerisi?', ':'')+(nTerisi?nTerisi+' sudah terisi':'')+')':''),false);
  if(total>20000)return toast('Terlalu banyak data ('+total+'). Kurangi jumlah anak atau rentang tanggal.',false);
  const rentang=a===b?fmt(a):fmt(a)+' s/d '+fmt(b);
  const pesan=(kosong?'Mengosongkan absensi':'Menerapkan status '+st.toUpperCase())+'\n\nAnak: '+siswa.length+'\nTanggal: '+rentang+' ('+hari.length+' hari)\n\n'
   +(kosong?'Dihapus: '+nHapus+' data':'Ditulis: '+ups.length+' data ('+baru+' baru'+(timpa?', '+timpa+' menimpa':'')+')')
   +(nLibur?'\nDilewati (libur): '+nLibur:'')+(nTerisi?'\nDilewati (sudah terisi): '+nTerisi:'')
   +(timpaLuar?'\n\n⚠️ '+timpaLuar+' data hasil scan/WhatsApp ikut tertimpa.':'')+(kosong?'\n\nTindakan ini tidak bisa dibatalkan.':'');
  if(!await konfirmasi(pesan,{judul:kosong?'Kosongkan absensi massal':'Terapkan absensi multi hari',ikon:kosong?'🗑️':'📆',ya:kosong?'Ya, kosongkan':'Ya, terapkan',bahaya:kosong}))return;
  let ok=0;const gagal=[];
  await guard(async()=>{let done=0;const prog=()=>{const t=$('#ldt');if(t)t.textContent='Menyimpan '+Math.min(done,total)+' dari '+total+' data...'};prog();
   for(let i=0;i<ups.length;i+=MH_CHUNK){const part=ups.slice(i,i+MH_CHUNK);try{await dbq(db.from('absensi').upsert(part,{onConflict:'siswa_id,tanggal'}));ok+=part.length}catch(e){gagal.push('Data ke-'+(i+1)+' s/d '+(i+part.length)+': '+idErr((e&&e.message)||String(e)))}done+=part.length;prog()}
   for(const [d,ids] of hapus)for(let i=0;i<ids.length;i+=MH_DEL){const part=ids.slice(i,i+MH_DEL);try{await dbq(db.from('absensi').delete().eq('tanggal',d).in('siswa_id',part));ok+=part.length}catch(e){gagal.push('Hapus '+fmt(d)+': '+idErr((e&&e.message)||String(e)))}done+=part.length;prog()}
   await muatRange(a,b)});
  draft=null;if(!gagal.length){mMulti=false;mSel.clear()}renderV();
  if(gagal.length)await konfirmasi(ok+' dari '+total+' data berhasil, '+gagal.length+' bagian gagal:\n\n'+gagal.slice(0,6).join('\n')+(gagal.length>6?'\n... dan '+(gagal.length-6)+' lainnya':'')+'\n\nSilakan periksa koneksi lalu ulangi proses untuk bagian yang gagal.',{judul:'Sebagian gagal disimpan',ikon:'⚠️',ya:'Tutup'});
  else toast((kosong?nHapus+' data dikosongkan':ok+' data absensi disimpan')+' untuk '+siswa.length+' anak');
  return !gagal.length
 })()}
