/* ---------- absensi manual ---------- */
let catBuka=new Set();
function catToggle(id){if(catBuka.has(id))catBuka.delete(id);else catBuka.add(id);const b=document.getElementById('cb'+id),t=document.getElementById('ct'+id),buka=catBuka.has(id);if(b)b.hidden=!buka;if(t)t.setAttribute('aria-expanded',buka);if(buka&&b){const x=b.querySelector('textarea');if(x)x.focus()}}
function catIsi(id,el){if(!draft||!draft[id])return;draft[id].cat=el.value;draft[id].ketik=true;const t=document.getElementById('ct'+id);if(t)t.classList.toggle('isi',!!el.value.trim())}
function namaPencatatAbsensi(r){
 if(!r)return 'Belum tersedia';
 if(r.oleh){const g=(S.guru||[]).find(x=>String(x.id)===String(r.oleh));return g?g.nama:'Petugas sekolah';}
 const c=String(r.cara||'').toLowerCase();
 if(c==='whatsapp')return 'Wali murid · WhatsApp';
 if(c==='dashboard siswa')return 'Orang tua · Portal';
 if(c==='otomatis')return 'Sistem otomatis';
 return 'Belum tercatat';
}
function absensiCards(l,lv){return lv.map((s,i)=>{const d=draft[s.id],cur=d?d.st:'',rec=A(attDate)[s.id],waktu=rec&&rec.waktu?jamJkt(rec.waktu):'',oleh=namaPencatatAbsensi(rec);return `<div class="card sc c${i%4+1}"><span class="nbadge" title="Nomor urut">${i+1}</span><div class="av">${ini(s.pan)}</div><div class="sn">${esc(s.pan)}</div><div class="sk">${esc(s.nama)} - ${esc(s.kelas)}${d&&d.cara!=='manual'?' - via '+esc(d.cara):''} ${cur==='Libur'?badge('Libur'):''}</div><div class="sk" style="margin-top:-7px">NISN: ${esc(s.nisn||'-')}</div>${rec?'<div class="sk" style="font-size:11px;line-height:1.5;margin-top:3px">'+(rec.jam? 'Jam datang: <b>'+esc(rec.jam)+' WIB</b><br>':'')+'Dicatat/diubah: <b>'+(waktu?esc(waktu)+' WIB':'-')+'</b><br>Oleh: <b>'+esc(oleh)+'</b></div>':''}<div class="sb">${ST.map(x=>`<button data-s="${x}" class="${cur===x?'sel':''}" onclick="pick(${s.id},'${x}')">${x}</button>`).join('')}<button class="clr" ${cur?'':'disabled'} onclick="clr(${s.id})">Kosongkan</button></div>${cur==='Izin'||cur==='Sakit'? `<div class="izin-durasi"><label for="durasi${s.id}">Lama ${cur.toLowerCase()} (hari sekolah aktif)</label><select id="durasi${s.id}" class="input" onchange="setDurasi(${s.id},this.value)">${Array.from({length:30},(_,j)=>j+1).map(n=>`<option value="${n}" ${(Number(d.hariAktif)|| (cur==='Izin'?1:3))===n?'selected':''}>${n} hari</option>`).join('')}</select><small>Hari libur tidak dihitung.</small></div>`:''}${cur?`<button type="button" id="ct${s.id}" class="cat-t${d.cat&&d.cat.trim()?' isi':''}" aria-expanded="${catBuka.has(s.id)}" onclick="catToggle(${s.id})">📝 Catatan (opsional)<span class="cat-dot"></span></button><div id="cb${s.id}" class="cat-b"${catBuka.has(s.id)?'':' hidden'}><textarea rows="2" maxlength="200" placeholder="Catatan (opsional)" oninput="catIsi(${s.id},this)">${esc(d.cat||'')}</textarea></div>`:''}</div>`}).join('')||(attKelas?(attQ?'<div class="mu">Nama siswa tidak ditemukan.</div>':'<div class="mu">Belum ada siswa.</div>'):PKH)}
V.absensi=()=>{if(mMulti)return mhView();if(!draft)draft=JSON.parse(JSON.stringify(A(attDate)));const l=act().filter(s=>attKelas&&(attKelas==='*'||s.kelas===attKelas)),lv=l.filter(s=>!attQ||s.nama.toLowerCase().includes(attQ.toLowerCase())||s.pan.toLowerCase().includes(attQ.toLowerCase())||String(s.nisn||'').includes(attQ.trim())||cocokWA(s.wa,attQ)),lib=infoLiburTerpilih(attDate,attKelas),isi=l.filter(s=>draft[s.id]).length;const key='manual|'+liburKey(attDate,attKelas);if(attKelas&&lib&&!liburPrompted[key]){liburPrompted[key]=true;setTimeout(async()=>{await cekLiburSebelumAbsensi(attKelas,attDate);if(view==='absensi')renderV()},0)}
 return `<div class="panel"><div class="ph">✍️ Absensi Manual</div><div class="pb"><div class="tb">${dt('date',attDate,'if(this.value)setAtt(this.value)','att-date-pick',{id:'attTgl'})}${cpick('absKelasPick','kelas',attKelas,[{value:'*',label:'Semua kelas'}].concat(S.kelas.map(k=>({value:k.nama,label:k.nama}))), 'setAttKelas','Pilih kelas')}<input id="attCari" class="input grow" placeholder="Cari nama siswa..." value="${esc(attQ)}" oninput="cariAbsensiInput(this)"><button class="btn soft sm" style="margin:4px auto 0;align-self:center" onclick="mhToggle()">📆 Multi Hari</button><button class="btn orange sm dl" style="margin:4px auto 0;align-self:center" onclick="markLibur()">🏖 Liburkan siswa</button></div><div class="note">📅 Guru dapat mengisi dan mengedit absensi untuk tanggal sebelumnya, hari ini, maupun tanggal yang akan datang.</div>
 ${lib?`<div class="note">🏖 ${esc(lib)} sedang libur. Konfirmasi diperlukan sebelum absensi dapat dimulai.</div>`:''}
 <div class="cards">${absensiCards(l,lv)}</div></div></div>
 <div style="height:76px"></div><div class="save"><div><b>${isi} dari ${l.length} terisi</b><div class="mu">${l.length-isi} dikosongkan (bisa diisi orang tua lewat WhatsApp)</div></div><button class="btn success sm dl" style="padding:7px 18px" onclick="saveAtt()">💾 Simpan</button></div>`};
async function setAttKelas(v){if(!mMulti&&(v||'')!==attKelas&&!await jagaTanya(['absensi'])){renderV();return}attKelas=v||'';attQ='';draft=null;catBuka.clear();mSel.clear();liburPrompted={};document.querySelectorAll('.cpick.open').forEach(x=>x.classList.remove('open'));renderV()}
function cariAbsensiInput(el){attQ=el.value;const l=act().filter(s=>attKelas&&(attKelas==='*'||s.kelas===attKelas)),lv=l.filter(s=>!attQ||s.nama.toLowerCase().includes(attQ.toLowerCase())||s.pan.toLowerCase().includes(attQ.toLowerCase())||String(s.nisn||'').includes(attQ.trim())||cocokWA(s.wa,attQ));const c=document.querySelector('#v .cards');if(c){c.innerHTML=mMulti?mhCards(lv):absensiCards(l,lv);if(mMulti)mhUpd()}}
async function setAtt(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return toast('Tanggal absensi tidak valid',false);if(v!==attDate&&!await jagaTanya(['absensi'])){renderV();return}attDate=v;draft=null;catBuka.clear();liburPrompted={};guard(async()=>{await muatRange(v,v);renderV()})}
async function pick(id,st){const s=siswaById(id);if(!await okLib(s.kelas,attDate))return;const o=draft[id]||{},sama=o.st===st,adaJam=['Hadir','Terlambat'],pakaiJam=adaJam.includes(o.st)&&adaJam.includes(st);draft[id]={st,cara:'manual',cat:(sama||o.ketik)?(o.cat||''):'',ketik:!!o.ketik,jam:pakaiJam?(o.jam||''):'',iso:pakaiJam?(o.iso||null):null,hariAktif:st==='Izin'||st==='Sakit'?(sama&&o.hariAktif?o.hariAktif:(st==='Izin'?1:3)):null};renderV()}
function setDurasi(id,v){if(!draft||!draft[id]||!['Izin','Sakit'].includes(draft[id].st))return;const n=Math.max(1,Math.min(30,parseInt(v,10)||1));draft[id].hariAktif=n;const el=document.getElementById('durasi'+id);if(el)el.value=String(n)}
function clr(id){delete draft[id];renderV()}
function saveAtt(){return guard(async()=>{const before=A(attDate),ups=[],del=[],now=new Date().toISOString(),rentang={};let akhir=attDate,bentrok=0;
 const terlindungi=st=>['hadir','terlambat','libur'].includes(low(st||''));
 Object.keys(draft).forEach(id=>{const d=draft[id],b=before[id],multi=['Izin','Sakit'].includes(d.st);if(!b||b.st!==d.st||b.cara!==d.cara||(b.cat||'')!==(d.cat||'')){if(!(multi&&b&&terlindungi(b.st)))ups.push({siswa_id:+id,tanggal:attDate,status:low(d.st),cara:d.cara,catatan:(d.cat||'').trim()||null,jam_datang:d.iso||null,diubah:now,diubah_oleh:me})}});
 Object.keys(before).forEach(id=>{if(!draft[id])del.push(+id)});
 for(const [id,d] of Object.entries(draft)){if(!['Izin','Sakit'].includes(d.st))continue;const siswa=siswaById(+id);if(!siswa)continue;const hari=Number(d.hariAktif)||(d.st==='Izin'?1:3);rentang[id]={status:d.st,kelas:siswa.kelas,hari};let hitung=0,tgl=attDate,langkah=0;while(hitung<hari&&langkah<180){if(!isLibur(tgl,siswa.kelas)){hitung++;akhir=tgl>akhir?tgl:akhir}tgl=tglTambah(tgl,1);langkah++}}
 if(akhir>attDate)await muatRange(attDate,akhir);
 let dimuatSampai=akhir;
 for(const [id,r] of Object.entries(rentang)){let hitung=0,tgl=attDate,langkah=0;while(hitung<r.hari&&langkah<180){if(!isLibur(tgl,r.kelas)){if(tgl>dimuatSampai){const batas=tglTambah(tgl,13);await muatRange(tgl,batas);dimuatSampai=batas}const ada=A(tgl)[id],stAda=ada?low(ada.st):'';if(stAda!=='libur'){hitung++;akhir=tgl>akhir?tgl:akhir;if(tgl!==attDate){if(!terlindungi(stAda))ups.push({siswa_id:+id,tanggal:tgl,status:low(r.status),cara:'manual',catatan:(draft[id].cat||'').trim()||null,jam_datang:null,diubah:now,diubah_oleh:me});else bentrok++}}}tgl=tglTambah(tgl,1);langkah++}}
 if(ups.length)await dbq(db.from('absensi').upsert(ups,{onConflict:'siswa_id,tanggal'}));
 if(del.length)await dbq(db.from('absensi').delete().eq('tanggal',attDate).in('siswa_id',del));
 await muatRange(attDate,akhir);draft=null;toast((ups.length||del.length?'Absensi tersimpan':'Tidak ada perubahan')+(bentrok?' · '+bentrok+' tanggal terlindungi tidak diubah':''));renderV();return true})}
let mlpResolve=null,mlpTerpilih=new Set(),mlpKeterangan='';
function renderPilihLibur(){const list=$('#mlp-list'),j=$('#mlp-jumlah'),info=$('#mlp-info'),ok=$('#mlp-ok');if(!list)return;const kelas=(S.kelas||[]).slice().sort((a,b)=>a.nama.localeCompare(b.nama,'id'));list.innerHTML=kelas.map(k=>{const n=act().filter(s=>s.kelas===k.nama).length;return '<label class="cbl card" style="padding:10px 12px;border-radius:12px"><input type="checkbox" value="'+Number(k.id)+'" '+(mlpTerpilih.has(Number(k.id))?'checked':'')+' onchange="toggleKelasPilihLibur('+Number(k.id)+',this.checked)"><span style="flex:1"><b>'+esc(k.nama)+'</b><span class="mu" style="display:block;font-size:11px">'+n+' siswa aktif</span></span></label>'}).join('')||'<div class="mu">Belum ada kelas.</div>';j.textContent=mlpTerpilih.size+' kelas dipilih';const total=act().filter(s=>(S.kelas||[]).some(k=>mlpTerpilih.has(Number(k.id))&&k.nama===s.kelas)).length;info.textContent=total+' siswa akan ditandai Libur pada '+fmt(attDate)+'.';ok.disabled=!mlpTerpilih.size;}
function toggleKelasPilihLibur(id,on){if(on)mlpTerpilih.add(Number(id));else mlpTerpilih.delete(Number(id));renderPilihLibur()}
function pilihSemuaLibur(){mlpTerpilih=new Set((S.kelas||[]).map(k=>Number(k.id)));renderPilihLibur()}
function tutupPilihLibur(v){const m=$('#mlp');if(m)m.classList.remove('show');if(mlpResolve){const f=mlpResolve;mlpResolve=null;f(v?({ids:[...mlpTerpilih],keterangan:String(mlpKeterangan||'').trim()}):null)}}
function dialogPilihKelasLibur(){return new Promise(resolve=>{mlpResolve=resolve;const semua=(S.kelas||[]).map(k=>Number(k.id));mlpTerpilih=new Set(attKelas&&attKelas!=='*'?(S.kelas||[]).filter(k=>k.nama===attKelas).map(k=>Number(k.id)):semua);mlpKeterangan='';const ket=$('#mlp-keterangan');if(ket)ket.value='';renderPilihLibur();$('#mlp').classList.add('show')})}
function markLibur(){if(!attKelas)return toast(PK,false);dialogPilihKelasLibur().then(pilihan=>{if(!pilihan||!pilihan.ids.length)return;const ids=pilihan.ids,keterangan=pilihan.keterangan;guard(async()=>{const namaKelas=(S.kelas||[]).filter(k=>ids.includes(Number(k.id))).map(k=>k.nama),siswa=act().filter(s=>namaKelas.includes(s.kelas)),now=new Date().toISOString();if(!siswa.length)return toast('Tidak ada siswa aktif pada kelas yang dipilih',false);await dbq(db.rpc('hapus_pembatalan_libur_saat_ditetapkan',{p_sekolah:SEK,p_tanggal:attDate,p_kelas:ids}));const rows=siswa.map(s=>({siswa_id:s.id,tanggal:attDate,status:'libur',cara:'manual',catatan:null,jam_datang:null,diubah:now,diubah_oleh:me}));await dbq(db.from('absensi').upsert(rows,{onConflict:'siswa_id,tanggal'}));if(S.absen[attDate])siswa.forEach(s=>delete S.absen[attDate][s.id]);S.absen[attDate]=S.absen[attDate]||{};siswa.forEach(s=>{S.absen[attDate][s.id]={st:'Libur',cara:'manual',cat:'',jam:'',iso:null}});draft=null;Object.keys(okL).filter(x=>x.startsWith(attDate+'|')).forEach(x=>delete okL[x]);Object.keys(liburPrompted).filter(x=>x.startsWith(attDate+'|')).forEach(x=>delete liburPrompted[x]);let infoKirim='';if(attDate===TODAY){try{const hasil=await apiLiburkanSiswaHariIni(attDate,ids,keterangan);infoKirim=hasil.duplicate?' · notifikasi libur hari ini sudah pernah diproses (tidak dikirim ulang)':hasil.dilewati?' · '+hasil.pesan:' · WA: '+hasil.kepala+' kepala sekolah, '+hasil.staf+' staf, '+hasil.grup+' grup dijadwalkan'+(hasil.gagal?' ('+hasil.gagal+' gagal: '+(hasil.detail_gagal||[]).join('; ')+')':'');}catch(e){infoKirim=' · notifikasi WhatsApp gagal: '+(e.message||e)}}else if(attDate>TODAY){infoKirim=' · notifikasi WhatsApp hanya dikirim untuk libur hari ini'}toast(siswa.length+' siswa dari '+namaKelas.length+' kelas ('+namaKelas.join(', ')+') ditandai Libur'+infoKirim);await go('dashboard')})})}
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
/* ---------- scan ---------- */
/* ---------- scanner keyboard (USB / Bluetooth HID) ---------- */
let usbOn=false,usbQ=[],usbRun=false,usbT=null,usbRT=null,usbPh='idle',usbUjiNama='',usbUjiOto=false,usbOtoNext=false,scanMode='kamera',usbRes=null,usbResT=null;
const USB_RE=/^[A-Z0-9]{8}$/i;
const IC_CAM='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l2-2h6l2 2h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',IC_BC='<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="5" width="2" height="14"/><rect x="7" y="5" width="1" height="14"/><rect x="10" y="5" width="3" height="14"/><rect x="15" y="5" width="1" height="14"/><rect x="18" y="5" width="3" height="14"/></svg>';
const segHTML=()=>`<div class="seg2" role="tablist"><button type="button" role="tab" class="${scanMode==='kamera'?'on':''}" onclick="setScanMode('kamera')">${IC_CAM}<span>Kamera</span></button><button type="button" role="tab" class="${scanMode==='scanner'?'on':''}" onclick="setScanMode('scanner')">${IC_BC}<span>Scanner</span></button></div>`;
const kameraHTML=()=>`<div class="rw" id="rw"><div id="reader"></div><div class="fb" id="fb"></div><div id="scRes">${scCardHtml||''}</div><button class="flip nobusy" onclick="balikKamera()" title="Balik kamera">🔄</button></div><div class="tb" style="justify-content:center"><button class="btn success" id="bs" style="min-width:180px" onclick="toggleScan()">Mulai scan</button></div><button type="button" class="ujilnk" onclick="unduhUjiScan(this)">Unduh kartu uji</button>`;
const USB_CAP={idle:'Scanner belum disiapkan.',selesai:'Scan selesai.',cek:'Memeriksa scanner...',prep:'Sedang menyiapkan foto siswa...',uji:'Uji scanner: silakan scan kartu uji (atau satu kartu anak). Hanya untuk uji, tidak dicatat sebagai absensi.',siap:'Scanner sudah siap, silakan tekan tombol Mulai scan',scan:'Silakan scan kartu ID anak'};
function usbLayIsi(){const ph=usbPh,cap=USB_CAP[ph]||USB_CAP.idle,r=(ph==='scan'||ph==='uji')?usbRes:null;let cls=ph,main;
 if(r&&r.cek)main='<div class="mu">'+esc(r.m)+'</div>';
 else if(r){cls=r.ok?'ok':'no';main=`<div class="usbic ${cls}">${r.ok?CEK:SIL}</div><b style="color:${r.ok?'var(--g)':'var(--rd)'}">${esc(r.t)}</b><div>${esc(r.m)}</div>`}
 else main=ph==='siap'?`<b style="color:var(--g)">Uji berhasil</b><div>Kartu ${esc(usbUjiNama)} terbaca</div><div class="mu">(tidak dicatat)</div>${usbUjiOto?'<div class="mu" style="color:#92400e">Lewat isian otomatis. Scanner fisik belum diuji.</div>':''}`:ph==='uji'?'<div class="mu" style="color:#92400e">Menunggu kartu uji...</div>':ph==='scan'?'<div class="mu">Menunggu kartu...</div>':ph==='cek'?'<div class="spin"></div>':'<div class="mu">Layar hasil scan</div>';
 return{cls,html:`<div class="usbcap"><span class="dot"></span><span>${cap}</span></div><div class="usbmain">${main}</div><div class="fb" id="fb"></div>`}}
function usbLayRender(){const L=$('#usbLay');if(!L)return;const o=usbLayIsi();L.className='usblay '+o.cls;L.innerHTML=o.html}
const usbPanel=()=>{const ph=usbPh,o=usbLayIsi(),
 bt={idle:['Siapkan scanner','usbSiap()','success'],prep:['Persiapan...','','success'],selesai:['Siapkan scanner','usbSiap()','success'],cek:['Memeriksa...','','success'],uji:['Batal','usbBatal()','soft'],siap:['Mulai scan','usbMulai()','success'],scan:['Selesai scan','usbTanyaSelesai()','success']}[ph]||['Siapkan scanner','usbSiap()','success'];
 return `<div class="usbw${scCardHtml?' tampil':''}"><div class="usblay ${o.cls}" id="usbLay">${o.html}</div><div id="scRes">${scCardHtml||''}</div></div><div class="mu usblbl">Kolom scanner (terisi otomatis)</div><input id="usbIn" class="input usbin" type="text" inputmode="none" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Menunggu scan..." ${usbOn?'':'disabled'} onkeydown="usbKd(event)" oninput="usbMasuk(this)" onblur="usbBlur()"><div class="mu usblbl" id="usbNote">Kode terakhir masuk: belum ada. Tidak perlu menekan Enter.</div><div class="tb" style="justify-content:center"><button class="btn ${bt[2]}" id="usbBs" style="min-width:180px" ${bt[1]?`onclick="${bt[1]}"`:'disabled'}>${bt[0]}</button></div>${ph==='uji'?'<button type="button" class="ujilnk" onclick="usbUjiOtomatis()">Tidak bawa kartu uji? Isi otomatis dengan kartu uji</button>':''}<button type="button" class="ujilnk" onclick="unduhUjiScan(this)">Unduh kartu uji</button>`};
const usbModal=()=>!!document.querySelector('.mb.show');
function usbFokus(){const i=$('#usbIn');if(i&&usbOn&&view==='scan'&&!usbModal())i.focus({preventScroll:true})}
async function setScanMode(m){unlockAC();if(m===scanMode)return;if(scanKunci())return tolakKunci();await stopScan();usbStop(true);scanMode=m;renderV()}
async function usbSiap(){unlockAC();if(!scanKelas)return toast(PK,false);await stopScan();usbPh='cek';usbOn=false;renderV();
 const ok=await cekLiburSebelumAbsensi(scanKelas,TODAY);
 if(view!=='scan'||usbPh!=='cek')return;
 if(!ok){usbPh='idle';renderV();return}
 await new Promise(r=>setTimeout(r,350));
 if(view!=='scan'||usbPh!=='cek')return;
 usbPh='uji';usbOn=true;usbQ=[];usbUjiOto=false;usbOtoNext=false;renderV();usbFokus()}
function usbBatal(){usbStop()}
async function usbMulai(){liburPrompted={};unlockAC();suaraPanas();usbPh='prep';usbOn=false;usbQ=[];lastKode='';lastAt=0;clearTimeout(usbResT);usbRes=null;if(!await scanFotoPersiapkan())return;usbPh='scan';usbOn=true;renderV();scanPrepLepas();usbFokus();scanSegarkan()}
async function usbTanyaSelesai(){if(usbPh!=='scan')return;const n=$('#cfn');if(n)n.textContent='Belum';
 let ya=false;try{ya=await konfirmasi('Apakah proses scan sudah selesai?',{judul:'Selesai scan?',ikon:'✅',ya:'Ya, selesai'})}finally{if(n)n.textContent='Batal'}
 if(ya)usbStop(false,'selesai');else usbFokus()}
function cariKode(mentah){const raw=String(mentah||'').trim();let k='';try{k=String(Kartu.kodeDariQR(raw)||'')}catch(e){}
 if(!k)return{s:null,k:'',lama:!!Kartu.kartuLama(raw)};
 if(k===KODE_UJI)return{s:null,k,uji:1};
 const s=S.siswa.find(x=>String(x.kode_scan||'').toUpperCase()===k);
 return{s:s||null,k}}
async function usbUjiScan(mentah){
 usbRes={cek:1,m:'Memeriksa kode...'};usbLayRender();
 try{
  const cr=cariKode(mentah),s=cr.s&&cr.s.aktif?cr.s:null;
  usbUjiOto=usbOtoNext;usbOtoNext=false;
  if(cr.uji){usbUjiNama='uji';usbOn=false;usbPh='siap';usbQ=[];usbRes=null;renderV();if(!ucap('pengujian berhasil'))beep(true);tanda(true);return}
  if(!s){const pesan=cr.s?(cr.s.pan||cr.s.nama)+' berstatus nonaktif, kartunya tidak bisa dipakai.':cr.lama?'Kartu lama sudah tidak berlaku. Gunakan kartu baru.':cr.k?'Kode '+cr.k+' tidak ada di data siswa. Coba kartu anak lain.':'QR tidak dikenal. Coba kartu anak lain.';
   usbRes={ok:false,t:'Uji gagal',m:pesan,tetap:1};usbLayRender();
   if(!ucap('Gagal'))beep(false);getarGagal();return}
  usbUjiNama=s.pan||s.nama;usbOn=false;usbPh='siap';usbQ=[];usbRes=null;renderV();if(!ucap('pengujian berhasil'))beep(true);tanda(true)
 }catch(e){usbRes={ok:false,t:'Uji gagal',m:String((e&&e.message)||e),tetap:1};usbLayRender()}}
function usbStop(jangan,fase){if(!usbOn&&usbPh==='idle'&&!fase)return;const aktif=usbOn;usbOn=false;usbPh=fase||'idle';usbQ=[];clearTimeout(usbT);clearTimeout(usbRT);clearTimeout(usbResT);usbRes=null;if(aktif){const u=scanUbah;scanUbah=[];scanAkhir(u)}if(!jangan)renderV()}
function usbKd(e){if(e.key!=='Enter')return;e.preventDefault();clearTimeout(usbT);const v=e.target.value;e.target.value='';usbKirim(v)}
function usbMasuk(el){clearTimeout(usbT);usbT=setTimeout(()=>{const v=el.value.trim();if(USB_RE.test(v)||Kartu.kartuLama(v)){el.value='';usbKirim(v)}},120)}
function usbBlur(){setTimeout(()=>{const a=document.activeElement;if(usbOn&&view==='scan'&&(!a||a===document.body))usbFokus()},200)}
function usbGlobal(e){if(!usbOn||view!=='scan'||e.ctrlKey||e.altKey||e.metaKey||!e.key||e.key.length!==1)return;
 const a=document.activeElement,t=a&&a.tagName;if(a&&a.id==='usbIn')return;
 if(t==='INPUT'||t==='TEXTAREA'||t==='SELECT'||(a&&a.isContentEditable))return;
 if(usbModal())return;const i=$('#usbIn');if(i)i.focus({preventScroll:true})}
document.addEventListener('keydown',usbGlobal,true);
async function usbKirim(raw){raw=String(raw||'').trim();if(!raw||!usbOn||scanPrep&&scanPrep.aktif)return;
 usbQ.push(raw);const nt=$('#usbNote');if(nt)nt.textContent='Kode terakhir masuk: '+raw.slice(0,12)+' (jam '+jamJkt(new Date().toISOString())+')';if(usbRun)return;usbRun=true;
 try{while(usbQ.length&&usbOn){
   const h=hariIni();
   if(h!==TODAY){TODAY=h;liburPrompted={};okL={};try{await muatRange(TODAY,TODAY)}catch(e){peringatan('Absensi hari baru gagal dimuat',e)}renderV();usbFokus()}
   {const k=usbQ.shift();if(usbPh==='uji')await usbUjiScan(k);else await onScan(k)}}}
 catch(e){hasil('Gagal: '+((e&&e.message)||e),false)}
 finally{usbRun=false;usbFokus()}}
const USB_HASIL_MS=5000;
const getarGagal=()=>{try{if(navigator.vibrate)navigator.vibrate(100)}catch(e){}};
const usbTampil=(m,ok)=>{clearTimeout(usbResT);usbRes={ok,t:ok?'Berhasil':'Gagal',m};usbLayRender();usbResT=setTimeout(()=>{usbRes=null;usbLayRender()},USB_HASIL_MS)};
const usbInfo=m=>{const n=$('#usbNote');if(n)n.textContent=m};
let scanKelas='',scanPrep=null,scanPrepRun=0;
const histHTML=()=>{const h=Object.entries(A(TODAY)).filter(e=>e[1].cara==='scan').map(e=>({s:S.siswa.find(x=>x.id==e[0]),r:e[1]})).filter(x=>x.s&&(!scanKelas||scanKelas==='*'||x.s.kelas===scanKelas)).sort((a,b)=>(b.r.jam||'').localeCompare(a.r.jam||''));
 return `<div class="ph">🕘 Riwayat Scan Hari Ini <span class="mu">${fmt(TODAY)} - ${h.length} anak</span></div><div class="pb">${tab(['Jam','Anak','Kelas','Status'],h.map(x=>`<tr><td><b>${esc(x.r.jam||'-')}</b></td><td>${esc(x.s.pan)}<div class="mu">${esc(x.s.nama)}</div></td><td>${esc(x.s.kelas)}</td><td>${badge(x.r.st)}</td></tr>`).join(''))}</div>`};
V.scan=()=>`<div class="panel"><div class="ph">📷 Scan Kartu</div><div class="pb">${scanPrep&&scanPrep.aktif?'<div class="scan-prep-overlay" id="scanPrepOverlay"><div class="scan-prep-card"><div class="spin"></div><b id="scanPrepTitle">Sedang persiapan scanner...</b><span id="scanPrepCount">0 / 0 foto disiapkan</span><div class="scan-prep-track"><i id="scanPrepBar"></i></div><small>Mohon tunggu. Foto siswa sedang diperiksa dan disiapkan agar tampil cepat saat kartu dipindai.</small></div></div>':''}${scanPrepCatatan()}<div class="sc-only scclk"><b id="scJam">${scWaktu()[0]}</b><span id="scTgl">${scWaktu()[1]}</span></div>${segHTML()}<div class="tb tb-full" style="justify-content:center">${cpick('scanKelasPick','kelas',scanKelas,[{value:'*',label:'Semua kelas'}].concat(S.kelas.map(k=>({value:k.nama,label:k.nama}))),'setScanKelas','Pilih kelas')}</div>${scanKelas?'':PKH}${scanMode==='scanner'&&usbPh==='scan'?'':suaraPanel()}${scanMode==='kamera'?kameraHTML():usbPanel()}<div id="hasil" style="margin-top:10px;font-weight:700;text-align:center"></div>${aqHtml()}${scDet()}</div></div><div class="panel" id="hist">${histHTML()}</div>`;
async function setScanKelas(v){document.querySelectorAll('.cpick.open').forEach(x=>x.classList.remove('open'));if((v||'')===scanKelas)return;if(scanKunci())return tolakKunci();await stopScan();usbStop(true);scanKelas=v||'';liburPrompted={};renderV();usbFokus()}
let AC=null;const unlockAC=()=>{try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){}};
function beep(ok){try{unlockAC();const t=AC.currentTime,nada=(f,m,d,jenis,v,f2)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=jenis;o.frequency.setValueAtTime(f,t+m);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+m+d);g.gain.setValueAtTime(.0001,t+m);g.gain.exponentialRampToValueAtTime(v,t+m+.012);g.gain.exponentialRampToValueAtTime(.0001,t+m+d);o.connect(g);g.connect(AC.destination);o.start(t+m);o.stop(t+m+d+.03)};
 if(ok){nada(1175,0,.1,'sine',.35);nada(1760,.09,.45,'sine',.35);nada(3520,.09,.2,'sine',.07)}
 else{nada(440,0,.22,'sawtooth',.4,330);nada(330,.25,.5,'sawtooth',.4,220);nada(880,0,.22,'square',.06,660)}}catch(e){}}
const CEK='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" fill-opacity=".92"/><path d="M28 52 L44 68 L73 34"/></svg>',SIL='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" fill-opacity=".92"/><path d="M33 33 L67 67 M67 33 L33 67"/></svg>';let fbT=null;
function tanda(ok){const f=$('#fb');if(!f)return;clearTimeout(fbT);f.className='fb';f.innerHTML=ok?CEK:SIL;void f.offsetWidth;f.className='fb show '+(ok?'ok':'no');fbT=setTimeout(()=>{f.className='fb'},ok?700:900)}
/* suara ucapan nama panggilan + status (Hadir/Terlambat); bila peramban tidak mendukung, kembali ke bunyi beep */
const SUARA_K='suara_scanner';
function suaraMuat(){try{const o=JSON.parse(localStorage.getItem(SUARA_K)||'{}');return{v:String(o.v||''),r:Math.min(1.5,Math.max(.6,+o.r||.95)),p:Math.min(1.8,Math.max(.6,+o.p||1))}}catch(e){return{v:'',r:.95,p:1}}}
let SUARA=suaraMuat(),suaraOpen=false;
const suaraSimpan=()=>{try{localStorage.setItem(SUARA_K,JSON.stringify(SUARA))}catch(e){}};
function suaraDaftar(){try{return(window.speechSynthesis.getVoices()||[]).filter(v=>/^id/i.test(v.lang))}catch(e){return[]}}
function suaraPilih(){let l=suaraDaftar();if(netMati()){const lk=l.filter(v=>v.localService);if(lk.length)l=lk}return l.find(v=>v.voiceURI===SUARA.v)||l.find(v=>/^id[-_]ID/i.test(v.lang))||l[0]||null}
function ucap(teks){try{const ss=window.speechSynthesis;if(!ss||!window.SpeechSynthesisUtterance)return false;
 const u=new SpeechSynthesisUtterance(teks);u.lang='id-ID';u.rate=SUARA.r;u.pitch=SUARA.p;u.volume=1;const v=suaraPilih();if(v)u.voice=v;
 u.onerror=()=>{try{beep(!/gagal|tidak|bukan|nonaktif|sudah tercatat/i.test(teks))}catch(e){}};ss.cancel();ss.speak(u);return true}catch(e){return false}}
/* C. pemanasan mesin suara (tanpa bunyi) saat sesi scan dimulai, agar ucapan pertama tidak telat */
let _suaraPanas=0;
function suaraPanas(){try{const ss=window.speechSynthesis;if(!ss||!window.SpeechSynthesisUtterance||Date.now()-_suaraPanas<60000)return;_suaraPanas=Date.now();const u=new SpeechSynthesisUtterance('a');u.lang='id-ID';u.volume=0;u.rate=2;const v=suaraPilih();if(v)u.voice=v;ss.speak(u)}catch(e){}}
function suaraOpsi(){const l=suaraDaftar(),c=suaraPilih();return l.length?l.map(v=>`<option value="${esc(v.voiceURI)}"${c&&c.voiceURI===v.voiceURI?' selected':''}>${esc(v.name)}</option>`).join(''):'<option value="">Suara bawaan perangkat</option>'}
const suaraPanel=()=>`<details class="suarabox"${suaraOpen?' open':''} ontoggle="suaraOpen=this.open"><summary>🔊 Pengaturan suara</summary><div class="suarabd"><label class="mu">Suara</label><select id="suaraSel" class="select" onchange="suaraUbah('v',this.value)">${suaraOpsi()}</select><label class="mu">Kecepatan: <b id="suaraRv">${SUARA.r.toFixed(2)}</b>×</label><input id="suaraR" type="range" min="0.6" max="1.5" step="0.05" value="${SUARA.r}" oninput="suaraUbah('r',this.value)"><label class="mu">Nada: <b id="suaraPv">${SUARA.p.toFixed(2)}</b></label><input id="suaraP" type="range" min="0.6" max="1.8" step="0.05" value="${SUARA.p}" oninput="suaraUbah('p',this.value)"><div class="tb" style="justify-content:center"><button type="button" class="btn soft sm" onclick="suaraCoba()">▶ Coba suara</button><button type="button" class="btn soft sm" onclick="suaraReset()">Atur ulang</button></div></div></details>`;
function suaraUbah(k,v){if(k==='v')SUARA.v=String(v);else SUARA[k]=+v;const r=$('#suaraRv'),p=$('#suaraPv');if(r)r.textContent=SUARA.r.toFixed(2);if(p)p.textContent=SUARA.p.toFixed(2);suaraSimpan()}
function suaraCoba(){unlockAC();if(!ucap('absensi siap'))toast('Perangkat ini tidak mendukung suara ucapan.',false)}
function suaraReset(){SUARA={v:'',r:.95,p:1};suaraSimpan();const s=$('#suaraSel'),r=$('#suaraR'),p=$('#suaraP');if(s)s.innerHTML=suaraOpsi();if(r)r.value=SUARA.r;if(p)p.value=SUARA.p;suaraUbah('r',SUARA.r);suaraUbah('p',SUARA.p)}
try{if(window.speechSynthesis)speechSynthesis.onvoiceschanged=()=>{const s=$('#suaraSel');if(s)s.innerHTML=suaraOpsi()}}catch(e){}
function hasil(m,ok,sw){const h=$('#hasil');if(!h)return;if(ok?!(scLast&&ucap((scLast.s.pan||scLast.s.nama)+' '+scLast.st.toLowerCase())):!ucap(sw||'Gagal'))beep(ok);if(!ok)getarGagal();scTampil(m,ok);
 if(scanMode==='scanner'&&usbPh==='scan'&&$('#usbLay')){h.textContent='';return}
 h.textContent=m;h.style.color=ok?'var(--g)':'var(--rd)';tanda(ok)}
function ovHapus(){const o=document.querySelector('#rw .camov');if(o)o.remove()}
function ovMuat(){const w=$('#rw');if(!w||w.querySelector('.camov'))return;const v=w.querySelector('#reader video'),o=document.createElement('div');o.className='camov';if(v&&v.videoWidth){try{const c=document.createElement('canvas');c.width=v.videoWidth;c.height=v.videoHeight;c.getContext('2d').drawImage(v,0,0,c.width,c.height);o.appendChild(c)}catch(e){}}const sp=document.createElement('div');sp.className='spin';o.appendChild(sp);w.style.minHeight=w.offsetHeight+'px';w.appendChild(o)}
function resetRw(){ovHapus();const b=$('#bs');if(b)b.textContent='Mulai scan';const w=$('#rw');if(w){w.classList.remove('on');w.style.minHeight=''}}
async function mulaiScan(){await muatLib('scan');
 if(scanner)await stopScan('restart');
 if(!scanKelas){resetRw();return toast(PK,false)}
 liburPrompted={};if(!await cekLiburSebelumAbsensi(scanKelas,TODAY)){resetRw();toast('Scan tidak dimulai: kelas libur hari ini.',false);return}
 try{if(!await scanFotoPersiapkan())return;scanner=new Html5Qrcode('reader');
  await scanner.start({facingMode:cam==='belakang'?'environment':'user'},{fps:15,qrbox:{width:220,height:220}},onScan,()=>{});$('#bs').textContent='Selesai scan';$('#rw').classList.add('on');$('#rw').style.minHeight='';ovHapus();scanPrepLepas();scanSegarkan()
 }catch(e){scanner=null;scanPrepLepas();resetRw();toast('Kamera tidak bisa dibuka. Izinkan akses kamera untuk situs ini.',false)}}
/* ---------- mode scan layar penuh ---------- */
let scLast=null,scT=null,scOpen=false,scCardHtml=null;
const scWaktu=()=>{const d=new Date();return[d.toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'}).replace(/\./g,':'),d.toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'numeric',month:'long',year:'numeric'})]};
setInterval(()=>{const j=$('#scJam');if(!j)return;const w=scWaktu();j.textContent=w[0];const t=$('#scTgl');if(t)t.textContent=w[1]},1000);
const scPlace=()=>'';
function scSet(h){scCardHtml=h;const e=$('#scRes');const _r=$('#rw');if(_r&&h)_r.style.setProperty('--rwh',_r.clientHeight+'px');if(e){e.innerHTML=h||scPlace();if(e.parentNode)e.parentNode.classList.toggle('tampil',!!h)}}
function scSumHTML(){const ab=A(TODAY),pk=new Map();let n=0;(scanKelas==='*'?S.kelas.map(k=>k.nama):[scanKelas]).forEach(k=>pk.set(k,{a:0,t:0}));
 S.siswa.forEach(x=>{if(!x.aktif)return;const p=pk.get(x.kelas);if(!p)return;p.t++;const r=ab[x.id];if(r&&r.cara==='scan'){p.a++;n++}});
 return `<b>Sudah scan: ${n} anak</b><div class="scchip">${[...pk].map(([k,p])=>`<span>${esc(k)} ${p.a}/${p.t}</span>`).join('')}</div>`}
const scDet=()=>`<details id="scDet" class="sc-only"${scOpen?' open':''} ontoggle="scOpen=this.open;if(scOpen)$('#scBody').innerHTML=histHTML()"><summary id="scSum">${scSumHTML()}</summary><div id="scBody">${scOpen?histHTML():''}</div></details>`;
function scRefresh(){const m=$('#scSum');if(m)m.innerHTML=scSumHTML();if(scOpen){const b=$('#scBody');if(b)b.innerHTML=histHTML()}}
function scTampil(m,ok){clearTimeout(scT);const L=scLast;scLast=null;
 if(!ok&&L&&L.duplikat){const s=L.s,im=fotoMuat(s);scSet(`<div class="scr bad" data-id="${s.id}">${im?`<img class="scf" src="${im.src}" alt="">`:''}<b>${esc(s.pan||s.nama)}</b><small>${esc(m)}</small>${s.nama&&s.nama!==s.pan?`<small>${esc(s.nama)}</small>`:''}</div>`);usbInfo('Terakhir dipindai: '+(s.pan||s.nama)+' (sudah tercatat)');if(!im&&s.foto_path)fotoSiap(s).then(g=>{const e=$('#scRes .scr[data-id="'+s.id+'"]');if(g&&e&&!e.querySelector('img')){const i=document.createElement('img');i.className='scf';i.src=g.src;i.alt='';e.prepend(i)}})}
 else if(!ok){scSet(`<div class="scr bad"><b>Tidak dicatat</b><small>${esc(m)}</small></div>`);usbInfo('Terakhir dipindai: '+m)}
 else if(!L){scSet(`<div class="scr ok"><b>${esc(m)}</b></div>`);usbInfo('Terakhir dipindai: '+m)}
 else{const s=L.s,im=fotoMuat(s);scSet(`<div class="scr ${L.st==='Hadir'?'ok':'tl'}" data-id="${s.id}">${im?`<img class="scf" src="${im.src}" alt="">`:''}<b>${esc(s.pan||s.nama)}</b><small>${L.st}, ${esc(L.jm)}</small>${s.nama&&s.nama!==s.pan?`<small>${esc(s.nama)}</small>`:''}</div>`);
  usbInfo('Terakhir dipindai: '+(s.pan||s.nama)+' ('+L.st.toLowerCase()+', jam '+L.jm+')');
  if(!im&&s.foto_path)fotoSiap(s).then(g=>{const e=$('#scRes .scr[data-id="'+s.id+'"]');if(g&&e&&!e.querySelector('img')){const i=document.createElement('img');i.className='scf';i.src=g.src;i.alt='';e.prepend(i)}})}
 scT=setTimeout(()=>scSet(null),3500)}
async function scPrefetch(){const l=S.siswa.filter(x=>x.aktif&&x.foto_path&&!fotoMuat(x)&&(scanKelas==='*'||x.kelas===scanKelas)).slice(0,120);let i=0;await Promise.all([0,1,2,3].map(async()=>{while(i<l.length){const s=l[i++];if(!scanKunci())return;await fotoSiap(s)}}))}
function scanPrepRender(){const e=$('#scanPrepCount'),b=$('#scanPrepBar'),t=$('#scanPrepTitle');if(!scanPrep)return;if(e)e.textContent=scanPrep.selesai+' / '+scanPrep.total+' foto disiapkan';if(b)b.style.width=(scanPrep.total?Math.round(scanPrep.selesai/scanPrep.total*100):100)+'%';if(t)t.textContent=scanPrep.total?'Sedang persiapan scanner...':'Tidak ada foto siswa yang perlu disiapkan'}
async function scanFotoPersiapkan(){const token=++scanPrepRun,l=S.siswa.filter(x=>x.aktif&&x.foto_path&&(scanKelas==='*'||x.kelas===scanKelas));scanPrep={aktif:true,lock:true,selesai:0,total:l.length,siap:0,gagal:0};renderV();kunciSinkron();let i=0;const pekerja=Array.from({length:6},async()=>{while(i<l.length&&token===scanPrepRun){const s=l[i++];try{const im=await fotoSiap(s);if(im)scanPrep.siap++;else scanPrep.gagal++}catch(e){scanPrep.gagal++}scanPrep.selesai++;scanPrepRender()}});await Promise.all(pekerja);if(token!==scanPrepRun)return false;scanPrep.aktif=false;scanPrep.selesai=true;renderV();kunciSinkron();return true}
function scanPrepLepas(){if(scanPrep)scanPrep.lock=false;kunciSinkron();const e=$('#scanPrepOverlay');if(e)e.remove()}
function scanPrepCatatan(){if(!scanPrep||!scanPrep.selesai)return '';return '<div class="scan-ready-note">✓ Scanner sudah siap! Silakan mulai peng-absenan 😊'+(scanPrep.gagal?'<small>'+scanPrep.gagal+' foto belum tersedia; absensi tetap bisa dilakukan.</small>':'')+'</div>'}
/* ---------- kunci halaman selama scan ---------- */
const scanKunci=()=>view==='scan'&&((!!scanPrep&&!!scanPrep.lock)||!!scanner||(usbOn&&usbPh==='scan'));
function tolakKunci(){toast('Scan sedang berjalan. Tekan Selesai scan dulu sebelum pindah halaman.',false);return true}
let _dashT=0;
let kunciAktif=false;
function kunciSinkron(){const k=scanKunci();if(k===kunciAktif)return;kunciAktif=k;document.body.classList.toggle('scan-kunci',k);if(k)wlAmbil();else wlLepas();if(k){scLast=null;scSet(null);scRefresh();try{history.pushState({scanKunci:1},'',location.href)}catch(e){}}}
let _kunciT=null;
function kunciMulai(){if(_kunciT)return;_kunciT=setInterval(()=>{kunciSinkron();if(view!=='scan'&&!kunciAktif&&!scanKunci()){clearInterval(_kunciT);_kunciT=null}},250)}
window.addEventListener('beforeunload',e=>{if(scanKunci()){e.preventDefault();e.returnValue=''}});
window.addEventListener('popstate',()=>{if(scanKunci()){try{history.pushState({scanKunci:1},'',location.href)}catch(e){}tolakKunci()}});
let scanUbah=[];
/* ---------- LAYAR TETAP MENYALA + PEMULIHAN + ANTRIAN OFFLINE ---------- */
let _wl=null,_hidAt=0,_pulih=false,_camGagal=0;
async function wlAmbil(){try{if(!('wakeLock' in navigator)||_wl||document.hidden)return;const w=await navigator.wakeLock.request('screen');_wl=w;w.addEventListener('release',()=>{if(_wl===w)_wl=null})}catch(e){_wl=null}}
function wlLepas(){try{if(_wl){const w=_wl;_wl=null;w.release().catch(()=>{})}}catch(e){}}
function kameraHidup(){const v=document.querySelector('#reader video'),st=v&&v.srcObject,t=st&&st.getVideoTracks&&st.getVideoTracks()[0];return !!(t&&t.readyState==='live'&&!t.muted&&!v.ended)}
async function pulihScan(lama){if(_pulih)return;_pulih=true;
 try{
  if(scanner){
   const v=document.querySelector('#reader video');try{if(v&&v.paused)await v.play()}catch(e){}
   await new Promise(r=>setTimeout(r,700));
   if(scanner&&!kameraHidup()){ovMuat();await mulaiScan()}
  }else if(usbOn){setTimeout(usbFokus,200)}
  if(lama>3000)toast('Scan sempat terhenti '+(lama>=60000?Math.round(lama/60000)+' menit':Math.round(lama/1000)+' detik')+' karena layar mati. Kartu yang dipindai saat itu tidak tercatat.',false)
 }catch(e){}finally{_pulih=false;_camGagal=0}}
document.addEventListener('visibilitychange',()=>{
 if(document.hidden){_hidAt=Date.now();return}
 const lama=_hidAt?Date.now()-_hidAt:0;_hidAt=0;
 try{aqKirim()}catch(e){}
 if(!scanKunci())return;
 wlAmbil();pulihScan(lama)});
/* pengawas tiap 5 detik: ambil ulang wake lock bila terlepas, dan nyalakan ulang kamera bila berhenti sendiri */
setInterval(()=>{if(document.hidden||!scanKunci())return;if(!_wl)wlAmbil();
 const rw=$('#rw');if(scanner&&!_pulih&&rw&&rw.classList.contains('on')){if(kameraHidup())_camGagal=0;else if(++_camGagal>=2)pulihScan(0)}},5000);
/* antrian scan saat internet putus: disimpan di HP lalu dikirim ulang otomatis */
const AQ_K='antrian_scan';let _aBusy=false;
/* status jaringan: begitu ketahuan putus, scan langsung ke antrian tanpa menunggu server (secepat saat online) */
let _netDown=false,_probeB=false;
const netMati=()=>navigator.onLine===false||_netDown;
function netTandai(mati){const sblm=_netDown;_netDown=!!mati;if(sblm&&!_netDown){try{aqKirim()}catch(e){}}}
const dbqT=(p,ms=3000)=>Promise.race([dbq(p),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
async function netProbe(){if(!_netDown||_probeB||document.hidden||navigator.onLine===false||!me)return;_probeB=true;
 try{await dbqT(db.from('absensi').select('siswa_id').limit(1),2500);netTandai(false)}catch(e){}finally{_probeB=false}}
setInterval(netProbe,5000);
const sementaraErr=e=>{const m=String((e&&(e.message||e.details))||e||''),c=String((e&&(e.code||e.status))||'');return /jwt|expired|not authenticated|unauthorized|auth session|bad gateway|service unavailable|gateway|temporar|overload|too many|rate limit|upstream|unexpected token|<html|is not valid json/i.test(m)||/^(5\d\d|401|408|429|PGRST301)$/.test(c)};
const jaringanErr=e=>{const m=String((e&&(e.message||e.details))||e||'');return navigator.onLine===false||/failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out|offline|ERR_INTERNET|ERR_NETWORK/i.test(m)};
const aqBaca=()=>{try{const a=JSON.parse(localStorage.getItem(AQ_K)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
const aqTulis=a=>{try{a.length?localStorage.setItem(AQ_K,JSON.stringify(a)):localStorage.removeItem(AQ_K)}catch(e){}};
const aqJumlah=()=>aqBaca().filter(x=>x.sek===SEK).length;
const aqTeks=()=>{const a=aqBaca().filter(z=>z&&z.row&&z.sek===SEK),off=netMati(),now=Date.now(),n=a.filter(z=>off||now-Date.parse(z.row.jam_datang)>4000).length;return n?'\u23F3 '+n+' scan belum terkirim ke server'+(off?', menunggu internet.':', sedang dikirim ulang.'):''};
const aqHtml=()=>{const t=aqTeks();return `<div id="aqInfo" class="mu" style="display:${t?'block':'none'};text-align:center;margin-top:6px;color:#92400e;font-weight:700">${t}</div>`};
function aqInfo(){const e=$('#aqInfo');if(!e)return;const t=aqTeks();e.style.display=t?'block':'none';e.textContent=t}
setInterval(aqInfo,2000);
function aqTambah(row,sw,ex){const a=aqBaca();if(a.some(x=>x.sek===SEK&&x.row.siswa_id===row.siswa_id&&x.row.tanggal===row.tanggal)){aqInfo();return}a.push(Object.assign({sek:SEK,row,pan:sw.pan||sw.nama,nama:sw.nama||'',n:0},ex||{}));aqTulis(a);aqInfo()}
const AQ_N=50;
let _aUlang=false,_mut=0,_akhirTunggu=false,scanKoreksi=[];
const aqKirimSegera=()=>{if(_aBusy){_aUlang=true;return}aqKirim()};
/* hasil dari server untuk satu scan yang tadi sudah diucapkan "hadir/terlambat" di HP */
function aqHasil(b,r){try{
 if(!r)return;
 const tgl=b.row.tanggal,sid=b.row.siswa_id,st=b.st||cap(b.row.status),jm=b.jm||jamJkt(b.row.jam_datang),pan=b.pan||'',nama=b.nama||'',lo=(S.absen[tgl]||{})[sid];
 if(r.hasil==='dicatat'){
  if(r.status_lama&&cap(r.status_lama)!==(b.lama||''))scanKoreksi.push({j:'ubah',pan,nama,dari:cap(r.status_lama),ke:st,jam:jm})}
 else if(r.hasil==='sudah_tercatat'){
  if(r.jam_datang&&Date.parse(r.jam_datang)===Date.parse(b.row.jam_datang))return;/* ini catatan kita sendiri (kirim ulang) */
  const sj=r.jam_datang?jamJkt(r.jam_datang):'-';
  scanKoreksi.push({j:'sudah',pan,nama,lokal:st+' '+jm,server:cap(r.status)+' '+sj});
  if(lo)S.absen[tgl][sid]=Object.assign({},lo,{st:cap(r.status),jam:r.jam_datang?sj:lo.jam,iso:r.jam_datang||lo.iso})}
 else{
  scanKoreksi.push({j:'gagal',pan,nama,alasan:r.hasil==='nonaktif'?'Anak berstatus nonaktif, absensi tidak tersimpan.':'Anak tidak ditemukan di sekolah ini, absensi tidak tersimpan.'});
  if(lo&&lo.iso===b.row.jam_datang)delete S.absen[tgl][sid]}
}catch(e){}}
function aqGagal(b){try{const tgl=b.row.tanggal,sid=b.row.siswa_id,lo=(S.absen[tgl]||{})[sid];
 scanKoreksi.push({j:'gagal',pan:b.pan||'',nama:b.nama||'',alasan:'Gagal dikirim ke server berulang kali, absensi tidak tersimpan. Catat ulang secara manual.'});
 if(lo&&lo.iso===b.row.jam_datang)delete S.absen[tgl][sid]}catch(e){}}
async function aqKirim(){
 if(_aBusy||!me||!SEK||netMati())return;const q=aqBaca().filter(b=>b&&b.row);if(!q.length){aqTulis([]);return}
 _aBusy=true;const kunci=b=>b.sek+'|'+b.row.siswa_id+'|'+b.row.tanggal,selesai=new Set();let ok=0,buang=0;
 try{
  const grup={};q.filter(b=>b.sek===SEK).forEach(b=>{(grup[b.row.tanggal]=grup[b.row.tanggal]||[]).push(b)});
  luar:for(const tgl of Object.keys(grup)){const arr=grup[tgl];
   for(let i=0;i<arr.length;i+=AQ_N){const part=arr.slice(i,i+AQ_N);
    try{
     /* 1 permintaan: server mengecek sekaligus menyimpan (yang sudah hadir/terlambat tidak ditimpa).
        Bila ditolak karena data bermasalah, ulangi satu per satu untuk mencari yang bermasalah */
     const kirim=arr=>dbqT(db.rpc('scan_absen',{p_baris:arr.map(b=>({siswa_id:b.row.siswa_id,tanggal:b.row.tanggal,status:b.row.status,jam_datang:b.row.jam_datang}))}),10000),masalah=new Set();
     const olah=(arr,res)=>{const m={};(Array.isArray(res)?res:[]).forEach(r=>{if(r)m[String(r.siswa_id)]=r});arr.forEach(b=>aqHasil(b,m[String(b.row.siswa_id)]))};
     try{olah(part,await kirim(part))}
     catch(e){if(jaringanErr(e)||sementaraErr(e))throw e;
      for(const b of part){try{olah([b],await kirim([b]))}catch(e2){if(jaringanErr(e2)||sementaraErr(e2))throw e2;masalah.add(kunci(b));b.n=(b.n||0)+1}}}
     part.forEach(b=>{if(!masalah.has(kunci(b))){selesai.add(kunci(b));ok++}})
    }catch(e){
     if(jaringanErr(e)){_netDown=true;break luar}
     /* galat server/sesi sementara: scan tetap disimpan di HP dan dicoba lagi nanti, tidak dihitung gagal */
     if(sementaraErr(e)){try{db.auth.getSession().catch(()=>{})}catch(x){}break luar}
     part.forEach(b=>{b.n=(b.n||0)+1})}
   }
  }
 }finally{
  const sisa=q.filter(b=>{if(selesai.has(kunci(b)))return false;if((b.n||0)>=10){buang++;aqGagal(b);return false}return true});
  const lain=aqBaca().filter(x=>x&&x.row&&!q.some(y=>y.sek===x.sek&&y.row.siswa_id===x.row.siswa_id&&y.row.tanggal===x.row.tanggal));
  aqTulis(sisa.concat(lain));_aBusy=false;_mut++;aqInfo();if(_aUlang){_aUlang=false;setTimeout(aqKirim,50)}}
 if(ok&&!scanner&&!usbOn&&!_akhirTunggu)toast(ok+' scan yang tersimpan di HP berhasil dikirim');
 if(buang)toast(buang+' scan gagal dikirim berulang kali dan tidak tersimpan. Lihat rinciannya di ringkasan scan.',false);
 if(scanKoreksi.length&&!scanner&&!usbOn&&!_akhirTunggu){const k=scanKoreksi;scanKoreksi=[];ringkasAkhir([],k,0)}}
window.addEventListener('online',()=>{netTandai(false);aqKirim()});window.addEventListener('offline',()=>{_netDown=true});
setInterval(aqKirim,15000);
/* ringkasan di akhir sesi scan: perubahan status + koreksi dari server, dalam satu jendela */
function ringkasAkhir(u,k,sisa){
 const ub=u.concat(k.filter(z=>z.j==='ubah')),sd=k.filter(z=>z.j==='sudah'),gl=k.filter(z=>z.j==='gagal');
 if(!ub.length&&!sd.length&&!gl.length&&!sisa)return;let h='';
 if(ub.length)h+='<div class="note">'+ub.length+' anak sebelumnya sudah punya status, dan statusnya kini diganti otomatis berdasarkan hasil scan.</div>'+tab(['Anak','Status semula','Sekarang','Jam'],ub.map(z=>`<tr><td><b>${esc(z.pan)}</b><div class="mu">${esc(z.nama)}</div></td><td>${badge(z.dari)}</td><td>${badge(z.ke)}</td><td>${esc(z.jam)}</td></tr>`).join(''));
 if(sd.length)h+='<div class="note" style="margin-top:12px">'+sd.length+' anak ternyata sudah tercatat dari perangkat lain (atau diubah guru) sebelum scan ini. Data di server dipertahankan, jadi absensi anak tetap benar.</div>'+tab(['Anak','Terdengar saat scan','Tercatat di server'],sd.map(z=>`<tr><td><b>${esc(z.pan)}</b><div class="mu">${esc(z.nama)}</div></td><td>${esc(z.lokal)}</td><td>${esc(z.server)}</td></tr>`).join(''));
 if(gl.length)h+='<div class="note" style="margin-top:12px;border-color:#d83d4d">'+gl.length+' scan tidak tersimpan di server.</div>'+tab(['Anak','Keterangan'],gl.map(z=>`<tr><td><b>${esc(z.pan)}</b><div class="mu">${esc(z.nama)}</div></td><td>${esc(z.alasan)}</td></tr>`).join(''));
 if(sisa)h+='<div class="note" style="margin-top:12px">'+sisa+' scan masih tersimpan di HP dan akan dikirim otomatis saat koneksi memungkinkan.</div>';
 info('Ringkasan sesi scan',h)}
/* dipanggil saat sesi scan berakhir: pastikan semua terkirim (maks 4 detik), lalu tampilkan ringkasan */
async function scanAkhir(u){_akhirTunggu=true;try{
 const t0=Date.now();
 while(aqJumlah()>0&&!netMati()&&Date.now()-t0<4000){aqKirimSegera();await new Promise(r=>setTimeout(r,300))}
 const k=scanKoreksi;scanKoreksi=[];ringkasAkhir(u,k,aqJumlah())}
 catch(e){}finally{_akhirTunggu=false}}
/* penyegaran cache absensi hari ini, HANYA selama berada di scanner (awal sesi, tiap 2 menit, saat layar aktif lagi) */
let _segB=false;
async function scanSegarkan(){
 if(_segB||!me||!SEK||!(scanner||usbOn)||document.hidden||netMati()||_aBusy||busy)return;
 _segB=true;const m0=_mut,tg=TODAY;
 try{let rows=[],from=0;for(;;){const d=await dbq(db.from('absensi').select('siswa_id,status,cara,catatan,jam_datang').eq('tanggal',tg).order('id').range(from,from+999));rows=rows.concat(d);if(d.length<1000)break;from+=1000}
  if(m0!==_mut||_aBusy||busy||tg!==TODAY||!(scanner||usbOn))return;/* ada scan/pengiriman selama mengambil data: hasil ini basi, buang */
  const baru={};rows.forEach(r=>{baru[r.siswa_id]=fromRow(r)});
  aqBaca().filter(b=>b&&b.row&&b.sek===SEK&&b.row.tanggal===tg).forEach(b=>{const e=baru[b.row.siswa_id];if(!e||(e.st!=='Hadir'&&e.st!=='Terlambat'))baru[b.row.siswa_id]={st:cap(b.row.status),cara:'scan',cat:'',jam:jamJkt(b.row.jam_datang),iso:b.row.jam_datang}});
  S.absen[tg]=baru;scRefresh()}
 catch(e){}finally{_segB=false}}
setInterval(scanSegarkan,120000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scanSegarkan()});
function ringkasUbah(u){info('Perubahan status pada sesi scan','<div class="note">'+u.length+' anak sebelumnya sudah punya status, dan statusnya kini diganti otomatis berdasarkan hasil scan.</div>'+tab(['Anak','Status semula','Sekarang','Jam'],u.map(x=>`<tr><td><b>${esc(x.pan)}</b><div class="mu">${esc(x.nama)}</div></td><td>${badge(x.dari)}</td><td>${badge(x.ke)}</td><td>${esc(x.jam)}</td></tr>`).join('')))}
async function stopScan(m){if(!scanner)return;const s=scanner;scanner=null;const w0=$('#rw');if(m==='restart'&&w0)w0.style.minHeight=w0.offsetHeight+'px';try{await s.stop();s.clear()}catch(e){}if(m==='restart')return;resetRw();
 const u=scanUbah;scanUbah=[];if(m!=='keluar')scanAkhir(u)}
let tanyaKam=false;
async function toggleScan(){unlockAC();if(!scanner)suaraPanas();if(!scanner)return mulaiScan();if(tanyaKam)return;tanyaKam=true;const n=$('#cfn');if(n)n.textContent='Belum';
 let ya=false;try{ya=await konfirmasi('Apakah proses scan sudah selesai?',{judul:'Selesai scan?',ikon:'✅',ya:'Ya, selesai'})}finally{if(n)n.textContent='Batal';tanyaKam=false}
 if(ya&&scanner)await stopScan()}
function balikKamera(){cam=cam==='belakang'?'depan':'belakang';const l=$('#camlbl');if(l)l.textContent=cam;if(scanner){ovMuat();mulaiScan()}}
async function onScan(mentah){if(scanPrep&&scanPrep.aktif)return;const cr=cariKode(mentah),kode=cr.s?String(cr.s.kode_scan||'').toUpperCase():cr.k||String(mentah||'').slice(0,40);const now=Date.now();if(busy||(kode===lastKode&&now-lastAt<(usbOn?1500:4000))){if(usbOn&&!busy)usbInfo('Kartu yang sama baru saja dipindai.');return}busy=true;lastKode=kode;lastAt=now;
 try{{const h=hariIni();if(h!==TODAY){TODAY=h;liburPrompted={};okL={};try{await muatRange(TODAY,TODAY)}catch(e){peringatan('Absensi hari baru gagal dimuat',e)}}}
  const s=cr.s&&cr.s.aktif?cr.s:null;if(cr.uji)return hasil('Kartu uji terbaca, tidak dicatat sebagai absensi.',true);
  if(cr.lama)return hasil('Kartu lama sudah tidak berlaku. Gunakan kartu baru.',false);
  if(!s)return hasil(cr.s?(cr.s.pan||cr.s.nama)+' berstatus nonaktif.':(cr.k?'QR tidak dikenal: kode '+cr.k+' tidak ada di data siswa.':'QR tidak dikenal.'),false);
  if(scanKelas&&scanKelas!=='*'&&s.kelas!==scanKelas)return hasil(`${s.pan} bukan siswa kelas ${scanKelas} (kelas ${s.kelas||'-'}).`,false);
  if(!await okLib(s.kelas,TODAY))return hasil('Kelas '+(s.kelas||'-')+' libur hari ini, absensi tidak dicatat.',false);
  const iso=new Date().toISOString(),jm=jamJkt(iso),lim=(S.kelas.find(k=>k.nama===s.kelas)||{jam:'23:59'}).jam,st=jm>lim?'Terlambat':'Hadir';
  const baris={siswa_id:s.id,tanggal:TODAY,status:low(st),cara:'scan',catatan:null,jam_datang:iso,diubah:iso,diubah_oleh:me};
  /* cek ke cache absensi hari ini di HP (tanpa menunggu server) */
  const lo=A(TODAY)[s.id],ada=lo?{st:lo.st,jam:lo.jam}:null;
  if(ada&&(ada.st==='Hadir'||ada.st==='Terlambat')){scLast={s,duplikat:true};return hasil(`${s.pan} sudah tercatat ${ada.st.toLowerCase()} jam ${ada.jam}.`,false,`${s.pan||s.nama} sudah tercatat`)}
  const antri=netMati();_mut++;
  /* simpan di HP dulu (permanen), lalu dikirim ke server di belakang layar; suara tidak menunggu server */
  aqTambah(baris,s,{st,jm,lama:ada?ada.st:''});
  (S.absen[TODAY]=S.absen[TODAY]||{})[s.id]={st,cara:'scan',cat:'',jam:jm,iso};if(ada)scanUbah.push({pan:s.pan,nama:s.nama,dari:ada.st,ke:st,jam:jm});scLast={s,st,jm};hasil(`${s.pan} ${st.toLowerCase()}, jam ${jm}.`+(ada?` (sebelumnya ${ada.st.toLowerCase()})`:'')+(antri?' Disimpan di HP, dikirim saat internet kembali.':''),true);const h=$('#hist');if(h)h.innerHTML=histHTML();scRefresh();
  aqKirimSegera()}
 catch(e){hasil('Gagal: '+(e.message||e),false)}finally{busy=false}}
/* ---------- kartu ---------- */
function qrObj(kode){const o=qrcode(0,'M');o.addData(kode);o.make();return o}
function qrSvg(kode,px){const o=qrObj(kode),n=o.getModuleCount(),m=2;let r='';for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(o.isDark(y,x))r+=`<rect x="${x+m}" y="${y+m}" width="1" height="1"/>`;return `<svg viewBox="0 0 ${n+m*2} ${n+m*2}" width="${px}" height="${px}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="#fff"/>${r}</svg>`}
const KC=new Map();
let _smA=null,_smN=-1,_sm=null;
