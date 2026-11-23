/* ---------- Login, pendaftaran, dan pemulihan akun ---------- */
function loginView(msg){tampilTombolPasskey();const _d=$('#dua');if(_d)_d.classList.add('hid');try{sessionStorage.removeItem('mode_bantuan');sessionStorage.removeItem('dev_sesi')}catch(e){}pasangBanner();S.set={};terapNama();$('#lg').classList.remove('hid');$('#ap').classList.add('hid');$('#bn').classList.add('hid');$('#lerr').textContent=idErr(msg||'')}
function formDaftarSekolah(){info('Daftarkan sekolah','<div class="note">Isi data sekolah dan akun Anda. Pendaftaran akan diperiksa admin; akun aktif setelah disetujui dan Anda dihubungi lewat WhatsApp.</div>'
 +'<div class="fg">'
 +'<div class="fd"><label class="l">Saya mendaftar sebagai</label><select id="dfPr" class="select tanpa-cari" onchange="ubahPeranDaftar()"><option value="kepala_sekolah">Kepala Sekolah</option><option value="operator">Operator</option></select></div>'
 +'<div class="fd"><label class="l">Nama sekolah</label><input id="dfSk" class="input" maxlength="80"></div>'
 +'<div class="fd"><label class="l">Alamat (opsional)</label><input id="dfAl" class="input" maxlength="150" placeholder="Jl. Contoh, RT/RW 00/01, Desa Contoh"></div>'
 +'<div class="fd"><label class="l">Kota / kabupaten (opsional)</label><input id="dfKt" class="input" maxlength="60" placeholder="contoh Jember"><div class="mu" style="margin-top:4px">Dipakai sebagai tempat tanda tangan Kepala Sekolah di rekap dan raport.</div></div>'
 +'<div class="fd"><label id="dfLNm" class="l">Nama kepala sekolah</label><input id="dfNm" class="input" maxlength="80"></div>'
 +'<div class="fd"><label id="dfLNip" class="l">NIP kepala sekolah (opsional)</label><input id="dfNip" class="input" maxlength="30"></div>'
 +'<div class="fd"><label id="dfLWa" class="l">Nomor WhatsApp kepala sekolah</label><div style="display:flex;gap:8px"><input id="dfWa" class="input" inputmode="tel" placeholder="08123456789" style="flex:1" oninput="dfAkun(false)"><button id="dfKb" type="button" class="btn soft" onclick="kirimKodeDaftar()">Kirim kode</button></div></div>'
 +'<div class="fd"><label class="l">Kode dari WhatsApp (6 angka)</label><div style="display:flex;gap:8px"><input id="dfKd" class="input" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="flex:1"><button id="dfVf" type="button" class="btn soft" onclick="verifikasiDaftar()">Verifikasi</button></div><div id="dfVs" class="mu" style="margin-top:4px"></div></div>'
 +'<div id="dfAkunInfo" class="note" style="display:none;margin:0 0 8px">♻️ Nomor ini sudah punya akun. Sekolah baru akan ditambahkan ke <b>akun lama</b> Anda: username, kata sandi, nama, dan NIP tidak diubah (kolomnya dibekukan). Peran di sekolah baru mengikuti pilihan Anda di atas. Setelah disetujui, masuk dengan username dan kata sandi lama, lalu pilih sekolah ini di halaman Pilih sekolah.</div>'
 +'<div class="fd"><label class="l">Username (huruf kecil, tanpa spasi)</label><input id="dfUs" class="input" autocapitalize="none" maxlength="20"></div>'
 +'<div class="fd"><label class="l">Kata sandi (minimal 6 karakter)</label><input id="dfPw" type="password" class="input" autocomplete="new-password"></div>'
 +'<div class="fd"><label class="l">Ulangi kata sandi</label><input id="dfPw2" type="password" class="input" autocomplete="new-password"></div>'
 +'<div id="dfKepala" style="display:none"><div class="note" style="margin:10px 0 6px">Data kepala sekolah (wajib). Akun kepala sekolah dibuat nanti oleh Anda lewat menu Guru, dan nomor ini menjadi penerima utama notifikasi alpa dan libur. Wali kelas dan anggota sekolah lain menerima sesuai nomor di profil masing-masing.</div>'
 +'<div class="fd"><label class="l">Nama kepala sekolah</label><input id="dfKn" class="input" maxlength="80"></div>'
 +'<div class="fd"><label class="l">NIP kepala sekolah (opsional)</label><input id="dfKnip" class="input" maxlength="30"></div>'
 +'<div class="fd"><label class="l">Nomor WhatsApp kepala sekolah</label><input id="dfKw" class="input" inputmode="tel" placeholder="08123456789"></div></div>'
 +'</div><div id="dfErr" class="mu" style="color:var(--rd);margin:6px 0"></div>'
 +'<button id="dfKirim" class="btn success" style="width:100%" onclick="kirimDaftar()">Kirim pendaftaran</button>');enhanceCustomSelects($('#mbd'));{const snap=jgSnap($('#mbd'));jagaIsian('Pendaftaran sekolah',()=>!!$('#dfSk')&&jgSnap($('#mbd'))!==snap)}}
function formReset(){info('Bantuan akun',`<div class="note">Pilih masalah yang Anda alami. Kode verifikasi dikirim ke nomor WhatsApp yang terdaftar di akun Anda.</div>
<button class="btn success" style="width:100%;margin:6px 0" onclick="mulaiReset('sandi')">🔐 Lupa sandi saja</button>
<button class="btn success" style="width:100%;margin:6px 0" onclick="mulaiReset('username')">👤 Lupa username saja</button>
<button class="btn success" style="width:100%;margin:6px 0" onclick="mulaiReset('keduanya')">🔁 Lupa username dan sandi</button>
<button class="btn soft" style="width:100%;margin:6px 0" onclick="mulaiReset('hilang')">📵 Nomor WhatsApp saya hilang</button>`)}
function mulaiReset(mode){if(mode==='hilang')return langkahHilang1();
 if(otpLanjut('reset',m=>m.mode===mode))return;
 const jd={sandi:'Lupa sandi',username:'Lupa username',keduanya:'Lupa username dan sandi'}[mode];
 form(jd,[{k:'wa',l:'Nomor WhatsApp yang terdaftar di akun Anda (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.wa);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');
  await apiPublik({aksi:'reset_kirim',nomor:wa});toast('Jika nomor terdaftar, kode dikirim ke WhatsApp');
  otpSimpan('reset',{mode,wa},()=>langkahReset2(mode,wa),()=>mulaiReset(mode));setTimeout(()=>langkahReset2(mode,wa),150)});$('#ms').textContent='Kirim kode'}
function langkahReset2(mode,wa){const f=[{k:'kode',l:'Kode 6 angka dari WhatsApp ('+fmtWA(wa)+')',ver:kd=>apiPublik({aksi:'otp_cek',keperluan:'reset',nomor:wa,kode:kd})}];
 if(mode!=='sandi')f.push({k:'user',l:'Username baru (huruf kecil, tanpa spasi)'});
 if(mode!=='username'){f.push({k:'sandi',l:'Kata sandi baru (minimal 6 karakter)',t:'password'});f.push({k:'sandi2',l:'Ulangi kata sandi baru',t:'password'})}
 form('Atur ulang akun',f,async v=>{
  if(!/^\d{6}$/.test(v.kode))throw new Error('Kode harus 6 angka');
  const un=(v.user||'').toLowerCase();
  if(mode!=='sandi'&&!/^[a-z0-9._-]{3,20}$/.test(un))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
  if(mode!=='username'){if((v.sandi||'').length<6)throw new Error('Kata sandi minimal 6 karakter');if(v.sandi!==v.sandi2)throw new Error('Ulangi kata sandi dengan benar')}
  const j=await apiPublik({aksi:'reset_selesai',mode,nomor:wa,kode:v.kode,username_baru:un,sandi_baru:v.sandi||''});otpHapus('reset');
  setTimeout(()=>info('Berhasil',`<div class="note">Akun Anda sudah diperbarui. Username Anda sekarang: <b>${esc(j.username)}</b>. Silakan masuk.</div>`),150)});$('#ms').textContent='Simpan'}
function langkahHilang1(){if(otpLanjut('hilang_publik'))return;form('Nomor WhatsApp hilang',[{k:'nama',l:'Nama lengkap'},{k:'sekolah',l:'Nama sekolah tempat Anda mengajar'},{k:'ulama',l:'Username lama (kosongkan bila lupa)'},{k:'wa',l:'Nomor WhatsApp BARU yang aktif (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.wa);if((v.nama||'').length<3||(v.sekolah||'').length<3)throw new Error('Isi nama lengkap dan nama sekolah');if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp baru tidak valid');
  await apiPublik({aksi:'hilang_otp',nomor:wa});toast('Kode dikirim ke nomor baru');
  const d={nama:v.nama,sekolah:v.sekolah,ulama:(v.ulama||'').toLowerCase(),wa};otpSimpan('hilang_publik',{},()=>langkahHilang2(d),()=>langkahHilang1());setTimeout(()=>langkahHilang2(d),150)});$('#ms').textContent='Kirim kode ke nomor baru'}
function langkahHilang2(d){form('Verifikasi dan data akun baru',[{k:'kode',l:'Kode 6 angka yang dikirim ke nomor baru ('+fmtWA(d.wa)+')',ver:kd=>apiPublik({aksi:'otp_cek',keperluan:'nomor_hilang',nomor:d.wa,kode:kd})},{k:'ubaru',l:'Username baru (kosongkan bila tidak ingin mengganti)'},{k:'sandi',l:'Kata sandi baru (kosongkan bila tidak ingin mengganti)',t:'password'},{k:'sandi2',l:'Ulangi kata sandi baru',t:'password'}],async v=>{
  if(!/^\d{6}$/.test(v.kode))throw new Error('Kode harus 6 angka');
  const ub=(v.ubaru||'').toLowerCase();
  if(ub&&!/^[a-z0-9._-]{3,20}$/.test(ub))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
  if(v.sandi&&v.sandi.length<6)throw new Error('Kata sandi minimal 6 karakter');
  if(v.sandi!==(v.sandi2||''))throw new Error('Ulangi kata sandi dengan benar');
  await apiPublik({aksi:'hilang_kirim',nama:d.nama,nama_sekolah:d.sekolah,username_lama:d.ulama,nomor:d.wa,kode:v.kode,username_baru:ub,sandi_baru:v.sandi||''});otpHapus('hilang_publik');
  setTimeout(()=>info('Permintaan terkirim','<div class="note">Permintaan Anda sudah dikirim ke admin untuk diperiksa. Anda akan dikabari lewat WhatsApp di nomor baru setelah disetujui. Akun lama Anda tidak berubah sebelum disetujui.</div>'),150)});$('#ms').textContent='Kirim permintaan'}
async function apiPublik(body){const r=await fetch('/api/publik',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const j=await r.json().catch(()=>({}));if(!r.ok){if(r.status===404)throw new Error('Layanan pendaftaran belum tersedia (404). Hubungi admin');throw new Error(j.error||('Gagal ('+r.status+')'))}return j}
function kirimKodeDaftar(){const b=$('#dfKb'),e=$('#dfErr');if(b.disabled)return;e.textContent='';const wa=$('#dfWa').value.trim();if(!wa){e.textContent='Isi nomor WhatsApp dulu';return}
 b.disabled=true;b.textContent='Mengirim...';
 apiPublik({aksi:'otp_kirim',keperluan:'daftar',nomor:wa}).then(r=>{window._dfAkun={wa:normWA(wa),ada:!!(r&&r.akun_ada)};dfAkun(window._dfAkun.ada);toast('Kode dikirim ke WhatsApp Anda');let n=60;b.textContent='Kirim ulang ('+n+')';const t=setInterval(()=>{n--;if(!$('#dfKb')){clearInterval(t);return}if(n<=0){clearInterval(t);b.disabled=false;b.textContent='Kirim ulang'}else b.textContent='Kirim ulang ('+n+')'},1000)}).catch(x=>{e.textContent=idErr(x.message||String(x));b.disabled=false;b.textContent='Kirim kode'})}
/* akun lama: kolom milik akun (nama, NIP, username, sandi) dibekukan; sekolah baru dipasang ke akun yang sudah ada */
function dfAkun(ada){if(!ada)window._dfAkun=null;const i=$('#dfAkunInfo');if(i)i.style.display=ada?'block':'none';
 ['dfNm','dfNip','dfUs','dfPw','dfPw2'].forEach(id=>{const e=$('#'+id);if(!e)return;if(ada){e.value='';e.disabled=true;e.placeholder='Memakai akun lama'}else{e.disabled=false;e.placeholder=''}})}
const dfLama=()=>{const a=window._dfAkun,w=$('#dfWa');return !!(a&&a.ada&&w&&a.wa===normWA(w.value))};
function ubahPeranDaftar(){const op=$('#dfPr').value==='operator';
 $('#dfLNm').textContent=op?'Nama Anda (operator)':'Nama kepala sekolah';
 $('#dfLNip').textContent=op?'NIP Anda (opsional)':'NIP kepala sekolah (opsional)';
 $('#dfLWa').textContent=op?'Nomor WhatsApp Anda (kode verifikasi dikirim ke nomor ini)':'Nomor WhatsApp kepala sekolah';
 $('#dfKepala').style.display=op?'block':'none'}
function kirimDaftar(){const b=$('#dfKirim'),e=$('#dfErr');if(b.disabled)return;e.textContent='';
 const op=$('#dfPr').value==='operator',lama=dfLama();
 const v={aksi:'daftar',peran:op?'operator':'kepala_sekolah',nama_sekolah:$('#dfSk').value.trim(),alamat:$('#dfAl').value.trim(),kota:$('#dfKt').value.trim(),nip:$('#dfNip').value.trim(),nomor:$('#dfWa').value.trim(),kode:$('#dfKd').value.trim(),username:$('#dfUs').value.trim().toLowerCase(),sandi:$('#dfPw').value};
 if(op){v.nama_operator=$('#dfNm').value.trim();v.nama_kepala=$('#dfKn').value.trim();v.nip_kepala=$('#dfKnip').value.trim();v.wa_kepala=$('#dfKw').value.trim()}else v.nama_kepala=$('#dfNm').value.trim();
 if(!v.nama_sekolah||!v.nomor||!v.kode||(op&&(!v.nama_kepala||!v.wa_kepala))||(!lama&&(!(op?v.nama_operator:v.nama_kepala)||!v.username||!v.sandi))){e.textContent='Lengkapi semua kolom yang wajib';return}
 if(!lama&&v.sandi!==$('#dfPw2').value){e.textContent='Kata sandi dan ulangannya tidak sama';return}
 b.disabled=true;b.innerHTML='<span class="bs"></span>Mengirim...';
 apiPublik(v).then(()=>{info('Pendaftaran terkirim','<div style="text-align:center;padding:10px 4px"><div style="font-size:42px">✅</div><h3 style="margin:8px 0">Terima kasih</h3><div class="mu">Pendaftaran sekolah <b>'+esc(v.nama_sekolah)+'</b> sudah kami terima. Admin akan memeriksa data Anda. '+(lama?'Setelah disetujui, sekolah ini muncul di <b>akun lama</b> Anda: masuk dengan username dan kata sandi lama, lalu pilih sekolah ini di halaman Pilih sekolah.':'Setelah disetujui, Anda bisa masuk dengan username <b>'+esc(v.username)+'</b>.')+(op&&!lama?' Setelah masuk, tambahkan akun Kepala Sekolah lewat menu Guru.':'')+'</div></div>')}).catch(x=>{e.textContent=idErr(x.message||String(x));b.disabled=false;b.textContent='Kirim pendaftaran'})}
function masuk(){const b=$('#lb');if(b.disabled)return;b.disabled=true;b.innerHTML='<span class="bs"></span>Memproses...';$('#lerr').textContent='';guard(async()=>{const u=$('#lu').value.trim(),pw=$('#lp').value;if(!u||!pw)throw new Error('Isi username dan kata sandi');let email=u;
 if(!u.includes('@')){const r=await db.rpc('email_dari_username',{u});if(r.error)throw r.error;if(!r.data)throw new Error('Username tidak ditemukan atau akun belum aktif. Bila Anda baru mendaftarkan sekolah, mohon tunggu persetujuan admin.');email=r.data}
 const {error}=await db.auth.signInWithPassword({email,password:pw});if(error)throw new Error('Username atau kata sandi salah');try{sessionStorage.removeItem('sekolah_aktif')}catch(e){}await mulai()},1).finally(()=>{b.disabled=false;b.textContent='Masuk'})}

