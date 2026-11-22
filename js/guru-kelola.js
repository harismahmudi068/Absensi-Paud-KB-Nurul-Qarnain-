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
