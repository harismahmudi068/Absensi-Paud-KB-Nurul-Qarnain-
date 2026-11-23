/* ---------- login + navigasi ---------- */
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

/* ---------- terjemahan pesan error ke Bahasa Indonesia ---------- */
const ERR_ID=[
 [/Non-Webauthn|ERROR_PASSTHROUGH/i,'Terjadi kesalahan pada passkey. Coba lagi, atau masuk dengan kata sandi'],
 [/InvalidStateError|already registered|PREVIOUSLY_REGISTERED/i,'Perangkat ini sudah terdaftar sebagai passkey untuk akun ini'],
 [/NotAllowedError|operation either timed out|not allowed by the user agent|timed out or was not allowed/i,'Dibatalkan atau waktu habis'],
 [/AbortError|ceremony was aborted|operation was aborted/i,'Proses dibatalkan'],
 [/NotSupportedError|WebAuthn is not supported|not supported by this browser/i,'Perangkat atau browser ini tidak mendukung passkey'],
 [/SecurityError/i,'Domain situs tidak cocok dengan Relying Party ID di Supabase'],
 [/Failed to fetch|NetworkError|Load failed|network request failed/i,'Koneksi internet bermasalah. Periksa jaringan lalu coba lagi'],
 [/Invalid login credentials/i,'Username atau kata sandi salah'],
 [/JWT expired|invalid JWT|Auth session missing|Invalid Refresh Token|Refresh Token Not Found/i,'Sesi login sudah berakhir, silakan masuk kembali'],
 [/Email not confirmed|Phone not confirmed/i,'Akun belum terverifikasi'],
 [/User not found/i,'Akun tidak ditemukan'],
 [/User is banned|user_banned/i,'Akun diblokir'],
 [/Password should be at least|password.*at least 6/i,'Kata sandi minimal 6 karakter'],
 [/different from the old password|same password/i,'Kata sandi baru harus berbeda dari yang lama'],
 [/rate limit|too many requests|over_request_rate_limit/i,'Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi'],
 [/row-level security|permission denied|\bForbidden\b|not authorized/i,'Anda tidak memiliki izin untuk tindakan ini'],
 [/duplicate key|unique constraint/i,'Data sudah ada atau sudah dipakai'],
 [/violates foreign key/i,'Data masih dipakai oleh data lain sehingga tidak bisa diubah atau dihapus'],
 [/violates not-null|null value in column|violates check constraint/i,'Ada data wajib yang belum diisi atau tidak valid'],
 [/Internal Server Error|Bad Gateway|Service Unavailable|Gateway Time-?out|Request Timeout/i,'Server sedang bermasalah. Coba lagi beberapa saat'],
 [/Unexpected token|is not valid JSON|Unexpected end of JSON/i,'Respons server tidak dapat dibaca. Coba lagi'],
 [/Cannot read propert|is not a function|is not defined|Cannot access .* before initialization/i,'Terjadi kesalahan pada aplikasi. Muat ulang halaman lalu coba lagi']];
function idErr(m){const t=String(m==null?'':m);for(const [re,id] of ERR_ID)if(re.test(t))return id;return t}
/* ---------- passkey (sidik jari / wajah / PIN perangkat) ---------- */
/* CATATAN: passkey memakai flag experimental supabase-js (lihat createClient). Bila setelah upgrade API-nya berubah/hilang, PK_OK jadi false dan fitur passkey disembunyikan, bukan error. Uji passkey setiap menaikkan versi supabase-js. */
const PK_OK=!!(window.PublicKeyCredential&&navigator.credentials)&&typeof db.auth.signInWithPasskey==='function'&&typeof db.auth.registerPasskey==='function'&&!!db.auth.passkey&&typeof db.auth.passkey.list==='function',PK_KEY='pk_aktif';
function pkSet(on){try{on?localStorage.setItem(PK_KEY,'1'):localStorage.removeItem(PK_KEY)}catch(e){}tampilTombolPasskey()}
function pkAda(){try{return localStorage.getItem(PK_KEY)==='1'}catch(e){return false}}
function tampilTombolPasskey(){const b=$('#lpk');if(b)b.classList.toggle('hid',!(PK_OK&&pkAda()))}
const pkKode=e=>String((e&&(e.code||e.name))||'')+' '+String((e&&e.message)||e||'')+(e&&e.cause?' '+String(e.cause.name||'')+' '+String(e.cause.message||''):'');
function pkPesan(e){const m=pkKode(e);
 if(/NotAllowed|cancel|abort|timed out/i.test(m))return 'Dibatalkan atau waktu habis';
 if(/passkey_disabled/.test(m))return 'Passkey belum diaktifkan di Supabase (Authentication → Passkeys)';
 if(/webauthn_credential_not_found/.test(m))return 'Passkey belum diaktifkan untuk akun ini di perangkat ini. Masuk dengan kata sandi, lalu aktifkan passkey di menu Profil Saya';
 if(/webauthn_credential_exists|InvalidStateError|PREVIOUSLY_REGISTERED|already registered/i.test(m))return 'Perangkat ini sudah terdaftar sebagai passkey untuk akun ini';
 if(/too_many_passkeys/.test(m))return 'Jumlah passkey sudah mencapai batas, hapus yang lama dulu';
 if(/email_not_confirmed|phone_not_confirmed/.test(m))return 'Akun belum terverifikasi';
 if(/user_banned/.test(m))return 'Akun diblokir';
 if(/SecurityError/.test(m))return 'Domain situs tidak cocok dengan Relying Party ID di Supabase';
 const r=idErr(m);return r!==m?r:idErr(String((e&&e.message)||e||'Gagal memakai passkey. Coba lagi atau masuk dengan kata sandi'))}
/* pemilih akun passkey kustom: akun yang pernah masuk dengan passkey di perangkat ini disimpan (username, nama, id kredensial) */
const b64u={enc:buf=>{const a=new Uint8Array(buf);let t='';for(let i=0;i<a.length;i++)t+=String.fromCharCode(a[i]);return btoa(t).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')},
 dec:str=>{str=String(str).replace(/-/g,'+').replace(/_/g,'/');while(str.length%4)str+='=';const bin=atob(str),a=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)a[i]=bin.charCodeAt(i);return a.buffer}};
function pkAkunList(){try{const a=JSON.parse(localStorage.getItem('pk_akun')||'[]');return Array.isArray(a)?a.filter(x=>x&&x.c&&x.u):[]}catch(e){return []}}
function pkAkunSimpan(a){try{localStorage.setItem('pk_akun',JSON.stringify(a.slice(0,8)))}catch(e){}}
function pkAkunTambah(u,n,c){pkAkunSimpan([{u,n,c}].concat(pkAkunList().filter(x=>x.u!==u&&x.c!==c)))}
function pkAkunHapus(c){pkAkunSimpan(pkAkunList().filter(x=>x.c!==c))}
/* Alur resmi supabase-js tetap dipakai; kita hanya (1) menyempitkan pilihan ke satu akun dan (2) mencatat id kredensial yang dipakai */
function pkSadap(o){const asli=navigator.credentials.get;
 navigator.credentials.get=function(x){try{if(o.allowId&&x&&x.publicKey)x.publicKey.allowCredentials=[{type:'public-key',id:b64u.dec(o.allowId)}]}catch(e){}
  return asli.call(navigator.credentials,x).then(c=>{try{if(c&&c.id)o.hasil=c.id}catch(e){}return c})};
 return ()=>{try{delete navigator.credentials.get}catch(e){}}}
function pkSadapBuat(o){const asli=navigator.credentials.create;
 navigator.credentials.create=function(x){return asli.call(navigator.credentials,x).then(c=>{try{if(c&&c.id)o.hasil=c.id}catch(e){}return c})};
 return ()=>{try{delete navigator.credentials.create}catch(e){}}}
/* verifikasi dengan passkey sebagai pengganti "kata sandi saat ini" (hanya bila passkey sudah aktif) */
let PKOK=0;const pkFresh=()=>Date.now()-PKOK<240000;
const bodySandi=sd=>(!sd&&pkFresh())?{verifikasi:'passkey'}:{sandi_sekarang:sd};
/* bukti passkey terpisah: sesi utama (termasuk verifikasi 2 langkah Developer) tidak diganti */
let PKB=null;const pkBuktiFresh=()=>!!PKB&&Date.now()-PKB.w<240000;
const bodyBukti=sd=>(!sd&&pkBuktiFresh())?{verifikasi:'passkey',bukti_passkey:PKB.t}:{sandi:sd};
async function pkBukti(){const {data:{session:lama}}=await db.auth.getSession();const a=pkAkunList().find(x=>PROFIL&&x.u===PROFIL.username),o={allowId:a?a.c:null,hasil:null},pulih=pkSadap(o);
 try{const x=await db.auth.signInWithPasskey();if(x.error)throw x.error;const u=x.data&&x.data.user,sn=x.data&&x.data.session;
  if(!u||!sn)throw new Error('Passkey tidak menghasilkan sesi');
  if(u.id!==me)throw new Error('Passkey milik akun lain. Silakan masuk kembali');
  PKB={t:sn.access_token,w:Date.now()}}
 catch(e){throw new Error(pkPesan(e))}
 finally{pulih();if(lama){try{await db.auth.setSession({access_token:lama.access_token,refresh_token:lama.refresh_token})}catch(e){console.warn('Sesi lama belum bisa dipulihkan',e)}}}}
const pkTersedia=()=>PK_OK&&!MB()&&!!PROFIL&&(pkAda()||(Array.isArray(S.pk)&&S.pk.length>0));
async function pkVerifikasi(){const a=pkAkunList().find(x=>PROFIL&&x.u===PROFIL.username),o={allowId:a?a.c:null,hasil:null},pulih=pkSadap(o);
 try{const x=await db.auth.signInWithPasskey();if(x.error)throw x.error;const u=x.data&&x.data.user;
  if(!u)throw new Error('Passkey tidak menghasilkan sesi');
  if(u.id!==me){try{await db.auth.signOut()}catch(e){}setTimeout(()=>location.reload(),600);throw new Error('Passkey milik akun lain. Silakan masuk kembali')}
  PKOK=Date.now()}
 catch(e){throw new Error(pkPesan(e))}finally{pulih()}}
function pasangPkForm(k,bukti){PKOK=0;PKB=null;if(!pkTersedia())return;const el=$('#f_'+k),fd=el&&el.closest('.fd');if(!fd||fd.querySelector('.pkv'))return;
 const b=document.createElement('button');b.type='button';b.className='btn soft sm pkv';b.style.marginTop='8px';b.textContent='🔑 Atau verifikasi dengan passkey';
 b.onclick=()=>guard(async()=>{await(bukti?pkBukti():pkVerifikasi());el.value='';el.disabled=true;el.placeholder='Terverifikasi dengan passkey';b.textContent='✓ Terverifikasi dengan passkey';b.disabled=true;toast('Passkey terverifikasi')},1);
 fd.appendChild(b)}
function masukPasskey(){const b=$('#lpk');if(!b||b.disabled)return;$('#lerr').textContent='';
 if(pkAkunList().length)return pilihAkunPasskey();pkMasuk(null)}
function pilihAkunPasskey(){const a=pkAkunList();
 info('Masuk dengan passkey','<div class="note">Pilih akun yang ingin dipakai masuk dengan sidik jari.</div>'
  +a.map(x=>`<div style="display:flex;gap:6px;margin:6px 0"><button class="btn soft" style="flex:1;text-align:left" onclick="closeM();pkMasuk('${esc(x.c)}')">👤 <b>${esc(x.n||x.u)}</b><div class="mu">${esc(x.u)}</div></button><button class="btn sm danger" title="Hapus dari daftar" onclick="pkAkunHapus('${esc(x.c)}');pilihAkunPasskey()">✕</button></div>`).join('')
  +'<button class="btn soft" style="width:100%;margin-top:6px" onclick="closeM();pkMasuk(null)">Akun lain di HP ini…</button>')}
function pkMasuk(credId){const b=$('#lpk');if(b&&b.disabled)return;if(b)b.disabled=true;$('#lerr').textContent='';
 guard(async()=>{const o={allowId:credId||null,hasil:null},pulih=pkSadap(o);
  try{let x;try{x=await db.auth.signInWithPasskey()}finally{pulih()}
   if(x.error)throw x.error;if(!x.data||!x.data.session)throw new Error('Passkey tidak menghasilkan sesi');
   pkSet(true);try{sessionStorage.removeItem('sekolah_aktif')}catch(e){}await mulai();
   if(o.hasil&&PROFIL&&x.data.user&&PROFIL.id===x.data.user.id)pkAkunTambah(PROFIL.username,PROFIL.nama,o.hasil)}
  catch(e){if(/webauthn_credential_not_found/.test(pkKode(e))){if(credId)pkAkunHapus(credId);else pkSet(false)}$('#lerr').textContent=pkPesan(e)}},1).finally(()=>{if(b)b.disabled=false})}
async function muatPasskeySaya(){S.pk=null;S.pkErr='';if(!PK_OK||MB())return;
 try{const r=await db.auth.passkey.list();if(r.error)throw r.error;S.pk=r.data||[];if(S.pk.length)pkSet(true)}catch(e){S.pkErr=pkPesan(e)}}
async function muatProfilSaya(){if(role!=='Developer')await muatProfil();const {data:{session}}=await db.auth.getSession();S.pfs=session?session.user:null;await muatPasskeySaya()}
function daftarPasskey(){if(MB())return toast('Tidak tersedia di mode bantuan',false);
 guard(async()=>{const o={hasil:null},pulih=pkSadapBuat(o);
  try{try{const {error}=await db.auth.registerPasskey();if(error)throw error}finally{pulih()}
   pkSet(true);if(o.hasil&&PROFIL)pkAkunTambah(PROFIL.username,PROFIL.nama,o.hasil);toast('Passkey berhasil diaktifkan')}
  catch(e){if(/webauthn_credential_exists|InvalidStateError|PREVIOUSLY_REGISTERED|already registered/i.test(pkKode(e))){pkSet(true);throw new Error('Perangkat ini sudah terdaftar sebagai passkey. Tombol masuk dengan passkey sekarang aktif')}throw new Error(pkPesan(e))}
  await muatPasskeySaya();renderV()})}
/* hubungkan passkey yang sudah ada ke daftar pilihan login di browser ini (tanpa kirim apa pun ke server) */
function pkIngatAkun(){if(MB()||!PROFIL)return toast('Tidak tersedia di mode bantuan',false);
 guard(async()=>{let c;try{c=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rpId:location.hostname,userVerification:'preferred',timeout:60000}})}catch(e){throw new Error(pkPesan(e))}
  if(!c||!c.id)throw new Error('Passkey tidak terbaca');
  try{if(c.response&&c.response.userHandle){const u=new Uint8Array(c.response.userHandle),t=new TextDecoder().decode(u),re=/^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
    const id=re.test(t)?t:(u.length===16?Array.from(u).map(v=>v.toString(16).padStart(2,'0')).join(''):null);
    if(id&&id.replace(/-/g,'').toLowerCase()!==String(me).replace(/-/g,'').toLowerCase())throw new Error('Itu passkey akun lain. Ulangi dan pilih akun Anda sendiri')}}
  catch(e){if(/akun lain/.test(String(e.message)))throw e}
  pkAkunTambah(PROFIL.username,PROFIL.nama,c.id);pkSet(true);toast('Akun ini sudah masuk daftar pilihan login di HP ini');renderV()})}
function renamePasskey(id){if(MB())return toast('Tidak tersedia di mode bantuan',false);const x=(S.pk||[]).find(k=>k.id===id)||{};
 form('Ubah nama passkey',[{k:'nama',l:'Nama passkey (mis. HP Samsung Bu Ani)',v:x.friendly_name||''}],async v=>{const n=(v.nama||'').trim();if(!n)throw new Error('Nama wajib diisi');if(n.length>120)throw new Error('Maksimal 120 karakter');
  const r=await db.auth.passkey.update({passkeyId:id,friendlyName:n});if(r.error)throw r.error;await muatPasskeySaya();toast('Nama passkey diubah');renderV()})}
async function hapusPasskey(id){if(MB())return toast('Tidak tersedia di mode bantuan',false);
 if(!await konfirmasi('Hapus passkey ini? Perangkat tersebut tidak bisa lagi dipakai masuk dengan sidik jari.',{bahaya:true,ya:'Hapus'}))return;
 guard(async()=>{const r=await db.auth.passkey.delete({passkeyId:id});if(r.error)throw r.error;await muatPasskeySaya();toast('Passkey dihapus');renderV()})}

/* ---------- halaman Profil Saya ---------- */
function editProfilSaya(){if(MB())return toast('Tidak tersedia di mode bantuan',false);const dev=role==='Developer',g=PROFIL;if(!g)return;
 const f=[{k:'nama',l:'Nama',v:g.nama},{k:'nip',l:'NIP (opsional)',v:g.nip||''}];
 if(!dev)f.push({k:'user',l:'Username',v:g.username},{k:'sandi',l:'Kata sandi baru (kosongkan bila tidak diganti)',t:'password'},{k:'lama',l:'Kata sandi saat ini (wajib bila mengganti username atau kata sandi)',t:'password'});
 setTimeout(()=>{if(!dev)pasangPkForm('lama')},0);
 form('Ubah profil saya',f,async v=>{
  const user=dev?g.username:(v.user||'').trim().toLowerCase();
  if(!v.nama||!user)throw new Error('Nama dan username wajib diisi');
  if(!dev){if(v.sandi&&v.sandi.length<6)throw new Error('Kata sandi minimal 6 karakter');
   if(!/^[a-z0-9._-]{3,20}$/.test(user))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah')}
  const ubahAkun=!dev&&(user!==g.username||!!v.sandi);
  if(ubahAkun&&!v.lama&&!pkFresh())throw new Error('Isi kata sandi saat ini atau verifikasi dengan passkey untuk mengganti username atau kata sandi');
  if(ubahAkun)await apiGuru({aksi:'akun_sendiri',username:user,sandi_baru:v.sandi||'',...bodySandi(v.lama)});
  const nip=(v.nip||'').trim()||null;
  await dbq(db.from('profil').update({nama:v.nama,nip}).eq('id',me));
  meNama=v.nama;PROFIL.nama=v.nama;PROFIL.nip=nip;if(ubahAkun)PROFIL.username=user;
  if(!dev)await muatProfil();toast(ubahAkun?'Profil dan akun diperbarui':'Profil diperbarui');renderAll()})}
/* ---------- verifikasi 2 langkah (TOTP) khusus Developer ---------- */
function tampilDua(h){$('#lg').classList.add('hid');$('#ap').classList.add('hid');$('#bn').classList.add('hid');$('#dua').classList.remove('hid');$('#duaIsi').innerHTML=h;$('#duaErr').textContent=''}
async function batalDuaFaktor(){try{await db.auth.signOut()}catch(e){}loginView()}
function salinDua(s){try{navigator.clipboard.writeText(s).then(()=>toast('Kunci disalin'),()=>toast('Tidak bisa menyalin, salin manual',false))}catch(e){toast('Tidak bisa menyalin, salin manual',false)}}
async function tempelDua(){const e=$('#duaErr'),i=$('#duaKode');if(!i)return;e.textContent='';
 try{const t=await navigator.clipboard.readText(),k=String(t||'').replace(/\D/g,'').slice(0,6);
  if(!k){e.textContent='Tidak ada angka di clipboard. Salin kode dari aplikasi autentikator lebih dulu.';return}
  i.value=k;i.focus();if(k.length<6)e.textContent='Hanya '+k.length+' angka yang terbaca. Pastikan kode terdiri dari 6 angka.'}
 catch(x){e.textContent='Tidak bisa membaca clipboard. Tekan lama di kolom kode lalu pilih Tempel.'}}
const DUA_INPUT=fid=>`<label class="mu" style="display:block;text-align:center;margin-bottom:6px">Kode 6 angka dari aplikasi</label><div style="position:relative;margin-bottom:10px"><input id="duaKode" class="input" inputmode="numeric" autocomplete="one-time-code" maxlength="6" style="width:100%;box-sizing:border-box;margin:0;text-align:center;letter-spacing:6px;font-size:20px;padding-left:48px;padding-right:48px" onkeydown="if(event.key==='Enter')kirimDua('${fid}')"><button type="button" id="tempelBtn" aria-label="Tempel" title="Tempel" onclick="tempelDua()" style="position:absolute;right:4px;top:50%;transform:translateY(-50%);width:40px;height:40px;padding:0;border:0;background:none;box-shadow:none;font-size:20px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">📋</button></div><button id="duaBtn" class="btn success" style="width:100%" onclick="kirimDua('${fid}')">Verifikasi</button>`;
async function cekDuaFaktor(){
 const a=await db.auth.mfa.getAuthenticatorAssuranceLevel();if(a.error)throw a.error;
 if(a.data.currentLevel==='aal2')return true;
 const f=await db.auth.mfa.listFactors();if(f.error)throw f.error;
 const t=(f.data.totp||[])[0];
 if(t)tampilDua('<p class="mu" style="text-align:center;margin:0 0 14px">Buka aplikasi autentikator (mis. Google Authenticator) lalu masukkan kode 6 angka untuk akun Developer.</p>'+DUA_INPUT(t.id));
 else await formDaftarDua();
 return false}
async function formDaftarDua(){
 tampilDua('<p class="mu" style="text-align:center">Menyiapkan...</p>');
 const l=await db.auth.mfa.listFactors();
 for(const x of ((l.data&&l.data.all)||[]))if(x.factor_type==='totp'&&x.status!=='verified')await db.auth.mfa.unenroll({factorId:x.id});
 const r=await db.auth.mfa.enroll({factorType:'totp',friendlyName:'Developer',issuer:'Absensi PAUD'});
 if(r.error){tampilDua('<div class="note">Gagal menyiapkan verifikasi 2 langkah: '+esc(r.error.message)+'</div>');return}
 const t=r.data.totp;
 tampilDua(`<div class="note">Akun Developer wajib memakai verifikasi 2 langkah. Pasang <b>Google Authenticator</b> (atau Microsoft Authenticator) di HP lebih dulu.</div>
 <p class="mu" style="margin:12px 0 6px"><b>Langkah 1.</b> Ketuk tombol ini, aplikasi autentikator akan terbuka:</p>
 <a class="btn success" style="display:block;text-align:center;text-decoration:none" href="${esc(t.uri)}">🔑 Buka di aplikasi autentikator</a>
 <p class="mu" style="margin:12px 0 6px">Bila tidak terbuka, pilih "Masukkan kunci penyiapan" di aplikasi lalu isi kunci ini:</p>
 <div style="display:flex;gap:8px;align-items:center"><code style="flex:1;word-break:break-all;background:#f4f4f4;padding:8px;border-radius:8px;user-select:all">${esc(t.secret)}</code><button class="btn sm soft" onclick="salinDua('${esc(t.secret)}')">Salin</button></div>
 <p class="mu" style="margin:8px 0 0;color:var(--rd)">Simpan kunci ini di tempat aman. Bila HP hilang, kunci ini dipakai untuk memasang ulang.</p>
 <details style="margin:10px 0"><summary class="mu">Tampilkan kode QR (bila dibuka dari komputer/HP lain)</summary><img id="duaQr" alt="Kode QR" style="width:100%;max-width:220px;display:block;margin:8px auto"></details>
 <p class="mu" style="margin:12px 0 6px"><b>Langkah 2.</b> Masukkan kode 6 angka yang tampil di aplikasi:</p>`+DUA_INPUT(r.data.id));
 const q=$('#duaQr');if(q)q.src=t.qr_code}
async function kirimDua(fid){const b=$('#duaBtn'),e=$('#duaErr');if(!b||b.disabled)return;e.textContent='';
 const kode=($('#duaKode').value||'').replace(/\s/g,'');
 if(!/^\d{6}$/.test(kode)){e.textContent='Masukkan 6 angka dari aplikasi autentikator';return}
 b.disabled=true;b.innerHTML='<span class="bs"></span>Memeriksa...';
 try{const c=await db.auth.mfa.challenge({factorId:fid});if(c.error)throw c.error;
  const v=await db.auth.mfa.verify({factorId:fid,challengeId:c.data.id,code:kode});if(v.error)throw v.error;
  $('#dua').classList.add('hid');await mulai()}
 catch(x){const m=(x&&x.message)||String(x);e.textContent=/invalid|expired/i.test(m)?'Kode salah atau sudah kedaluwarsa. Coba kode terbaru.':m;b.disabled=false;b.textContent='Verifikasi'}}
const galatSesi=e=>{const m=String((e&&e.message)||e||'').toLowerCase(),c=String((e&&(e.status||e.code))||'');return c==='401'||c==='PGRST301'||/jwt|refresh.?token|not authenticated|invalid.{0,12}token|auth session missing/.test(m)};
async function gagalMuat(e){
 if(galatSesi(e)){try{await db.auth.signOut()}catch(x){}return loginView('Sesi berakhir, silakan masuk lagi')}
 try{ld(0)}catch(x){}
 const mentah=String((e&&e.message)||e||'Kesalahan tidak diketahui'),detail=String((e&&e.stack)||mentah);
 if(role==='Developer')console.error('[Developer startup error]',e);
 let g=document.getElementById('gm');if(g)g.remove();
 g=document.createElement('div');g.id='gm';g.style.cssText='position:fixed;inset:0;z-index:200;background:var(--bg,#f6fbf5);color:var(--tx,#20352a);display:flex;align-items:center;justify-content:center;padding:24px;text-align:center;overflow:auto';
 g.innerHTML='<div style="max-width:520px;width:100%"><div style="font-size:42px">📡</div><h3 style="margin:10px 0 6px">Gagal memuat data</h3><div style="color:var(--mu,#6d7d73);font-size:14px;margin-bottom:14px">'+esc(idErr(mentah))+'<br>Akun Anda tetap masuk. Periksa sambungan internet lalu coba lagi.</div>'+(role==='Developer'?'<details style="text-align:left;margin:12px 0;padding:10px;border:1px solid var(--bd,#ddd);border-radius:10px"><summary style="cursor:pointer;font-weight:600">Rincian kesalahan untuk pemeriksaan</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;max-height:35vh;overflow:auto;margin-top:10px">'+esc(detail)+'</pre></details>':'')+'<button class="btn success" style="width:100%" id="gmUlang">Coba lagi</button><button class="btn soft" style="width:100%;margin-top:8px" id="gmKeluar">Keluar</button></div>';
 document.body.appendChild(g);
 g.querySelector('#gmUlang').onclick=()=>{g.remove();mulai()};
 g.querySelector('#gmKeluar').onclick=async()=>{g.remove();try{await db.auth.signOut()}catch(x){}loginView('')}}
async function mulai(){const {data:{session}}=await db.auth.getSession();if(!session)return loginView();
 try{me=session.user.id;
  const pf=await dbq(db.from('profil').select('id,nama,username,role,aktif,nip,dibuat').eq('id',me).maybeSingle());
  if(!pf||!pf.aktif){await db.auth.signOut();return loginView('Akun ini tidak terdaftar atau sudah dinonaktifkan')}
  PROFIL=pf;
  if(pf.role==='developer'){MEMB=[];if(!await cekDuaFaktor())return;return await masukDeveloper()}
  MEMB=(await dbq(db.from('keanggotaan').select('sekolah_id,role,sekolah(nama,status)').eq('profil_id',me).eq('aktif',true))).filter(x=>x.sekolah&&x.sekolah.status==='aktif').map(x=>({sekolah_id:x.sekolah_id,nama:x.sekolah.nama,role:x.role}));
  if(!MEMB.length){await db.auth.signOut();return loginView('Akun ini belum terhubung ke sekolah yang aktif. Hubungi Kepala Sekolah.')}
  let ingat=null;try{ingat=Number(sessionStorage.getItem('sekolah_aktif'))}catch(e){}
  const pilih=MEMB.length===1?MEMB[0]:MEMB.find(m=>m.sekolah_id===ingat);
  if(pilih)await masukSekolah(pilih);else tampilPilihSekolah()}
 catch(e){await gagalMuat(e)}}
async function masukDeveloper(){try{cmKosong();SEK=null;TTD_GURU={};TTD_GURU_SEK=null;TTD_GURU_DEV_DONE=false;TTD_PROFIL=null;TTD_PROFIL_USER=null;role='Developer';meNama=PROFIL.nama;
  S.absen={};S.pesan=[];S.siswa=[];S.kelas=[];S.guru=[];S.libur=[];S.nasional=[];S.nasMap=new Map();S.mingguan=[];S.set={};RHS=null;izinKelola=null;izinExp=0;S.devGuru=null;draft=null;gsel.clear();gHapusMode=false;ssel.clear();sHapusMode=false;
  try{sessionStorage.removeItem('sekolah_aktif');sessionStorage.removeItem('bukaView')}catch(e){}
  terapNama();$('#lg').classList.add('hid');$('#ap').classList.remove('hid');$('#bn').classList.remove('hid');view='dashboard';pasangBanner();await go('dashboard')}
 catch(e){await gagalMuat(e)}}
async function masukSekolah(m){try{cmKosong();SEK=m.sekolah_id;TTD_GURU={};TTD_GURU_SEK=null;TTD_PROFIL=null;TTD_PROFIL_USER=null;role=LBL[m.role];meNama=PROFIL.nama;try{sessionStorage.setItem('sekolah_aktif',SEK)}catch(e){}
  S.absen={};S.pesan=[];RHS=null;CFG_SID=null;izinKelola=null;izinExp=0;S.devGuru=null;draft=null;mMulti=false;mSel.clear();attKelas='';scanKelas='';kk='';rk='';lo='';q='';gQ='';gsel.clear();gHapusMode=false;ssel.clear();sHapusMode=false;
  KONFIG_NANTI=false;await muatDasar();if(adalahKepala()||role==='Developer')muatRahasia().then(()=>{if(view==='dashboard'&&!$('#ap').classList.contains('hid'))renderV()});$('#lg').classList.add('hid');$('#ap').classList.remove('hid');$('#bn').classList.remove('hid');
  let bv=null;try{bv=sessionStorage.getItem('menu_terakhir')||sessionStorage.getItem('bukaView');sessionStorage.removeItem('bukaView')}catch(e){}view=(bv&&allowed(bv))?bv:'dashboard';pasangBanner();await go(view);if(adalahKepala())setTimeout(sapaAwal,300)}
 catch(e){await gagalMuat(e)}}
function tampilPilihSekolah(){info('Pilih sekolah','<div class="note">Akun Anda terdaftar di lebih dari satu sekolah. Pilih sekolah yang ingin dibuka.</div>'+MEMB.map(m=>`<button class="btn success" style="width:100%;margin:6px 0;display:flex;justify-content:space-between;gap:10px" onclick="pilihSekolah(${m.sekolah_id})"><span>🏫 ${esc(m.nama)}</span><small>${esc(LBL[m.role])}</small></button>`).join(''));{const b=$('#mtp');if(b){b.textContent='Keluar';b.className='btn danger';b.onclick=()=>{closeM();keluar()}}}}
async function pilihSekolah(id){const m=MEMB.find(x=>x.sekolah_id===id);if(!m)return;closeM();ld(1,'Membuka sekolah...');try{await masukSekolah(m)}finally{ld(0)}}
async function gantiSekolah(){if(scanKunci())return tolakKunci();if(!await jagaTanya('semua'))return;await stopScan();drw(0);tampilPilihSekolah()}
/* ---- Beralih akun tanpa keluar: pilih akun passkey lain di HP ini, verifikasi, lalu aplikasi dimuat ulang ke akun itu.
   Akun sekarang tetap aktif bila dibatalkan atau gagal. ---- */
const akunLain=()=>(PK_OK&&!MB())?pkAkunList().filter(x=>!PROFIL||x.u!==PROFIL.username):[];
async function beralihAkun(){if(scanKunci())return tolakKunci();if(MB())return toast('Tidak tersedia di mode bantuan',false);if(!await jagaTanya('semua'))return;await stopScan();drw(0);
 const a=akunLain();if(!a.length)return toast('Belum ada akun lain di HP ini. Aktifkan passkey di akun lain lewat menu Profil Saya',false);
 info('Beralih akun','<div class="note">Pilih akun yang ingin dibuka. Anda akan diminta sidik jari atau kunci layar akun itu. Bila dibatalkan, akun sekarang tetap aktif.</div>'
  +(PROFIL?'<div class="mu" style="margin:6px 0">Akun sekarang: <b>'+esc(PROFIL.nama||PROFIL.username)+'</b></div>':'')
  +a.map(x=>`<button class="btn soft" style="width:100%;text-align:left;margin:6px 0" onclick="closeM();pkBeralih('${esc(x.c)}')">👤 <b>${esc(x.n||x.u)}</b><div class="mu">${esc(x.u)}</div></button>`).join(''))}
function pkBeralih(credId){guard(async()=>{
 const o={allowId:credId,hasil:null},pulih=pkSadap(o);let x;
 try{try{x=await db.auth.signInWithPasskey()}finally{pulih()}
  if(x.error)throw x.error;if(!x.data||!x.data.session||!x.data.user)throw new Error('Passkey tidak menghasilkan sesi')}
 catch(e){
  if(/webauthn_credential_not_found/.test(pkKode(e)))pkAkunHapus(credId);
  throw new Error(pkPesan(e))}
 if(x.data.user.id===me)return toast('Itu akun yang sedang dipakai');
 ld(1,'Beralih akun...');
 try{sessionStorage.clear()}catch(e){}
 try{if('caches' in window){const ks=await caches.keys();await Promise.all(ks.map(k=>caches.delete(k)))}}catch(e){}
 try{const c=new URL(location.href);c.search='';c.hash='';location.replace(c.href)}catch(e){location.reload()}
},1)}
async function tanyaKeluar(){
 if(!await jagaTanya('semua'))return;
 const banyak=Array.isArray(MEMB)&&MEMB.length>1&&role!=='Developer',banyakAkun=akunLain().length>0;
 info('Keluar dari halaman ini?','<div style="text-align:center"><div style="font-size:42px;line-height:1">🚪</div><div class="mu" style="font-size:14px;margin:10px 0 16px">Apakah Anda benar-benar ingin keluar dari halaman ini?'+(banyak?'<br>Akun Anda terdaftar di lebih dari satu sekolah, jadi Anda juga bisa beralih sekolah tanpa keluar.':'')+(banyakAkun?'<br>Ada akun lain di HP ini, jadi Anda juga bisa beralih akun tanpa keluar.':'')+'</div><div class="fg"><button class="btn danger" style="width:100%" onclick="closeM();keluar()">Ya, keluar</button>'+(banyak?'<button class="btn success" style="width:100%" onclick="closeM();gantiSekolah()">🔁 Beralih sekolah</button>':'')+(banyakAkun?'<button class="btn success" style="width:100%" onclick="closeM();beralihAkun()">👤 Beralih akun</button>':'')+'<button class="btn soft" style="width:100%" onclick="closeM()">Batal</button></div></div>')}
async function keluar(){
  if(scanKunci())return tolakKunci();
  /*
   * LOGOUT TOTAL APLIKASI
   * Membersihkan sesi Supabase + seluruh storage/cache milik origin aplikasi.
   * Tidak menghapus data browser di luar situs/aplikasi ini.
   */
  const origin=location.origin;

  try{await stopScan('keluar')}catch(e){}

  // 1. Putuskan sesi Supabase terlebih dahulu.
  try{await db.auth.signOut({scope:'global'})}
  catch(e){try{await db.auth.signOut()}catch(_e){}}

  // 2. Bersihkan sessionStorage dan localStorage aplikasi.
  try{sessionStorage.clear()}catch(e){}
  const _pks={};try{['pk_aktif','pk_akun','tema_ui','logo_sekolah','suara_scanner','antrian_scan'].forEach(k=>{const v=localStorage.getItem(k);if(v!=null)_pks[k]=v})}catch(e){}
  try{Object.keys(localStorage).filter(k=>/^pk_(off|pil)_/.test(k)).forEach(k=>{_pks[k]=localStorage.getItem(k)})}catch(e){}
  try{localStorage.clear()}catch(e){}
  try{Object.keys(_pks).forEach(k=>localStorage.setItem(k,_pks[k]))}catch(e){}

  // 3. Hapus cookie yang dapat diakses JavaScript pada origin ini.
  try{
    const cookies=document.cookie?document.cookie.split(';'):[];
    for(const c of cookies){
      const eq=c.indexOf('=');
      const name=(eq>=0?c.slice(0,eq):c).trim();
      if(!name)continue;
      document.cookie=name+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
      document.cookie=name+'=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain='+location.hostname;
    }
  }catch(e){}

  // 4. Bersihkan Cache Storage milik aplikasi.
  try{
    if('caches' in window){
      const keys=await caches.keys();
      await Promise.all(keys.map(k=>caches.delete(k)));
    }
  }catch(e){}

  // 5. Lepaskan Service Worker agar tidak menghidupkan kembali state lama.
  try{
    if('serviceWorker' in navigator){
      const regs=await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.filter(r=>!/\/sw\.js(\?|$)/.test((r.active||r.waiting||r.installing||{scriptURL:''}).scriptURL||'')).map(r=>r.unregister()));
    }
  }catch(e){}

  // 6. Hapus seluruh IndexedDB database pada origin ini bila browser mendukungnya.
  try{
    if(indexedDB && typeof indexedDB.databases==='function'){
      const dbs=await indexedDB.databases();
      await Promise.all((dbs||[]).map(x=>{
        if(!x||!x.name)return Promise.resolve();
        return new Promise(resolve=>{
          const req=indexedDB.deleteDatabase(x.name);
          req.onsuccess=req.onerror=req.onblocked=()=>resolve();
        });
      }));
    }
  }catch(e){}

  // 7. Reset variabel runtime sebelum memuat ulang.
  try{
    SEK=null;MEMB=[];PROFIL=null;me=null;meNama='';role='';view='dashboard';
    S={siswa:[],kelas:[],guru:[],libur:[],mingguan:[],set:{},absen:{},pesan:[],kirim:{}};
    draft=null;RHS=null;izinKelola=null;izinExp=0;
    okL={};liburPrompted={};scanner=null;busy=false;lastKode='';lastAt=0;usbOn=false;usbQ=[];usbPh='idle';
    sessionStorage.clear();
  }catch(e){}

  // 8. Hard reload ke URL bersih tanpa parameter/hash lama.
  try{
    const clean=new URL(location.href);
    clean.search='';
    clean.hash='';
    location.replace(clean.href);
  }catch(e){
    location.reload();
  }
}
let drwT=null;
function drw(o){const d=$('#drw');if(o){clearTimeout(drwT);d.classList.remove('closing');d.classList.add('show');return}
 if(!d.classList.contains('show')||d.classList.contains('closing'))return;
 d.classList.add('closing');clearTimeout(drwT);drwT=setTimeout(()=>d.classList.remove('show','closing'),310)}

/* Pencarian menu dan fitur: hasil dipilih manual, tidak ada navigasi saat mengetik. */
const CARI_FITUR=[
 ...MENUS.map(m=>({id:m[0],label:m[1],path:m[1],icon:m[2],type:'menu'})),
 {id:'pnAlpa',label:'Alpa Otomatis',path:'Pengaturan → Alpa Otomatis',icon:'⏰',type:'pengaturan'},
 {id:'pnNotifLibur',label:'Notifikasi Libur',path:'Pengaturan → Notifikasi Libur',icon:'🔔',type:'pengaturan'},
 {id:'pnTabungan',label:'Pengaturan Tabungan',path:'Pengaturan → Tabungan',icon:'💰',type:'pengaturan'},
 {id:'pnPiket',label:'Jadwal Piket',path:'Pengaturan → Jadwal Piket',icon:'🧹',type:'pengaturan'},
 {id:'pnHafalan',label:'Pengaturan Hafalan',path:'Pengaturan → Hafalan',icon:'📖',type:'pengaturan'},
 {id:'pnNotifOrtu',label:'Notifikasi Orang Tua',path:'Pengaturan → Notifikasi Orang Tua',icon:'📨',type:'pengaturan'},
 {id:'pnNama',label:'Nama Sekolah',path:'Pengaturan → Nama Sekolah',icon:'🏫',type:'pengaturan'},
 {id:'pnLogo',label:'Logo Sekolah',path:'Pengaturan → Logo Sekolah',icon:'🖼️',type:'pengaturan'},
 {id:'pnStempel',label:'Stempel Sekolah',path:'Pengaturan → Stempel Sekolah',icon:'🔖',type:'pengaturan'},
 {id:'pnFotoOrtu',label:'Foto Orang Tua',path:'Pengaturan → Foto Orang Tua',icon:'👨‍👩‍👧',type:'pengaturan'},
 {id:'pnAlamat',label:'Alamat Sekolah',path:'Pengaturan → Alamat Sekolah',icon:'📍',type:'pengaturan'},
 {id:'pnKonfig',label:'Konfigurasi Webhook',path:'Pengaturan → Konfigurasi Webhook',icon:'🔗',type:'pengaturan'},
 {id:'kel',label:'Pengaturan Penilaian, Kelompok dan Indikator',path:'Penilaian Siswa → Pengaturan',icon:'⚙️',type:'penilaian'},
 {id:'nilai',label:'Penilaian Siswa',path:'Penilaian Siswa → Penilaian',icon:'📝',type:'penilaian'},
 {id:'mapel',label:'Mapel dan KKM',path:'Penilaian Siswa → Mapel & KKM',icon:'📚',type:'penilaian'},
 {id:'kep',label:'Keputusan Akhir',path:'Penilaian Siswa → Keputusan Akhir',icon:'🎓',type:'penilaian'},
 {id:'kirim',label:'Kirim Laporan Raport',path:'Penilaian Siswa → Kirim Laporan',icon:'📤',type:'penilaian'},
 /* Tab di dalam menu utama */
 {id:'pindah',label:'Pindah Kelas',path:'Kelola Siswa → Pindah Kelas',icon:'↔️',type:'tab',parent:'kelola'},
 {id:'naik',label:'Naik Kelas',path:'Kelola Siswa → Naik Kelas',icon:'⬆️',type:'tab',parent:'kelola'},
 {id:'tinggal',label:'Tinggal Kelas',path:'Kelola Siswa → Tinggal Kelas',icon:'🔁',type:'tab',parent:'kelola'},
 {id:'lulus',label:'Kelulusan',path:'Kelola Siswa → Kelulusan',icon:'🎓',type:'tab',parent:'kelola'},
 {id:'pengesahan',label:'Pengesahan',path:'Kelola Siswa → Pengesahan',icon:'✅',type:'tab',parent:'kelola'},
 {id:'in',label:'Pemasukan Tabungan',path:'Tabungan → Pemasukan',icon:'⬇️',type:'tab',parent:'tabungan'},
 {id:'out',label:'Pengeluaran Tabungan',path:'Tabungan → Pengeluaran',icon:'⬆️',type:'tab',parent:'tabungan'},
 {id:'rek',label:'Rekap dan Laporan Tabungan',path:'Tabungan → Rekap & Laporan',icon:'📊',type:'tab',parent:'tabungan'},
 {id:'jadwal',label:'Jadwal Piket',path:'Jadwal Piket → Jadwal',icon:'📅',type:'tab',parent:'piket'},
 {id:'jenis',label:'Jenis Piket',path:'Jadwal Piket → Jenis Piket',icon:'🏷️',type:'tab',parent:'piket'},
 {id:'setor',label:'Setor Hafalan',path:'Hafalan → Setor',icon:'✍️',type:'tab',parent:'hafalan'},
 {id:'daftar',label:'Daftar Hafalan',path:'Hafalan → Daftar Hafalan',icon:'📋',type:'tab',parent:'hafalan'},
 {id:'rekap',label:'Rekap Hafalan',path:'Hafalan → Rekap',icon:'📊',type:'tab',parent:'hafalan'},
 {id:'jenis',label:'Jenis Hafalan',path:'Hafalan → Jenis',icon:'🏷️',type:'tab',parent:'hafalan'},
 {id:'masuk',label:'Pesan Masuk',path:'Pesan WA → Pesan Masuk',icon:'💬',type:'tab',parent:'pesan'},
 {id:'riwayat',label:'Riwayat Status Pesan',path:'Pesan WA → Riwayat Status Pesan',icon:'📋',type:'tab',parent:'pesan'}
];
let cariTerbuka=false,cariHasil=[],cariPilih=0;
function pencarianToggle(){
 const p=$('#dashSearchPanel');if(!p)return;
 cariTerbuka=!cariTerbuka;p.hidden=!cariTerbuka;
 if(cariTerbuka){setTimeout(()=>$('#dashSearchInput')?.focus(),50);pencarianInput($('#dashSearchInput')?.value||'')}
 else pencarianTutup();
}
function pencarianTutup(){
 cariTerbuka=false;const p=$('#dashSearchPanel');if(p)p.hidden=true;
 const i=$('#dashSearchInput');if(i)i.value='';
 const r=$('#dashSearchResults');if(r)r.innerHTML='';
 cariHasil=[];cariPilih=0;
}
function pencarianCocok(q,item){
 const norm=x=>String(x||'').toLocaleLowerCase('id').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const kata=norm(q).split(/\s+/).filter(Boolean),target=norm(item.label+' '+item.path);
 if(!kata.length)return false;
 const tokens=target.split(' ');
 return kata.every(k=>tokens.some(t=>t.startsWith(k)||t.includes(k))||target.includes(k));
}
function pencarianInput(v){
 const r=$('#dashSearchResults');if(!r)return;
 const q=String(v||'').trim();cariPilih=0;
 if(!q){cariHasil=[];r.innerHTML='<div class="dash-search-empty">Ketik nama menu atau fitur yang ingin dicari.</div>';return}
 cariHasil=CARI_FITUR.filter(x=>allowed(x.type==='tab'?x.parent:x.type==='pengaturan'?'pengaturan':x.type==='penilaian'?'penilaian':x.id)&&pencarianCocok(q,x)).slice(0,10);
 r.innerHTML=cariHasil.length?cariHasil.map((x,i)=>'<button type="button" class="dash-search-result" role="option" aria-selected="'+(i===0)+'" onclick="pencarianBuka('+i+')"><span class="dsr-icon">'+x.icon+'</span><span class="dsr-main"><span class="dsr-name">'+esc(x.label)+'</span><span class="dsr-path">'+esc(x.path)+'</span></span><span aria-hidden="true">›</span></button>').join(''):'<div class="dash-search-empty">Tidak ada menu atau fitur yang cocok.</div>';
}
function pencarianKey(e){
 if(e.key==='Escape'){e.preventDefault();pencarianTutup();return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  if(!cariHasil.length)return;e.preventDefault();cariPilih=(cariPilih+(e.key==='ArrowDown'?1:-1)+cariHasil.length)%cariHasil.length;
  document.querySelectorAll('.dash-search-result').forEach((b,i)=>b.setAttribute('aria-selected',String(i===cariPilih)));
  document.querySelectorAll('.dash-search-result')[cariPilih]?.scrollIntoView({block:'nearest'});return
 }
 if(e.key==='Enter'&&cariHasil.length){e.preventDefault();pencarianBuka(cariPilih)}
}
async function pencarianBuka(i){
 const x=cariHasil[i];if(!x)return;
 pencarianTutup();
 if(x.type==='pengaturan')return lompatPengaturan(x.id);
 if(x.type==='penilaian'){await go('penilaian');pnHal(x.id);return}
 if(x.type==='tab'){
  await go(x.parent);
  if(x.parent==='kelola')return klTab(x.id);
  if(x.parent==='tabungan')return tabHal(x.id);
  if(x.parent==='piket')return pkHal(x.id);
  if(x.parent==='hafalan')return hfHal(x.id);
  if(x.parent==='pesan')return pesHal(x.id);
  return;
 }
 return go(x.id);
}
document.addEventListener('click',e=>{const p=$('#dashSearchPanel'),b=$('#dashSearchToggle');if(cariTerbuka&&p&&!p.contains(e.target)&&b&&!b.contains(e.target))pencarianTutup()});

async function go(id){if(scanKunci()&&id!=='scan')return tolakKunci();if(!await jagaTanya('semua'))return;tpTutup();usbStop(true);await stopScan();TODAY=hariIni();const paksa=(id===view);view=id;try{if(allowed(id))sessionStorage.setItem('menu_terakhir',id)}catch(e){}if(id!=='pesan'){pHapusMode=false;pesTab='masuk';psel.clear()}if(id==='scan')kunciMulai();drw(0);if(id!=='absensi')draft=null;liburPrompted={};$('#v').innerHTML='';ld(1);
 try{if(LOAD[id]){const ck=cmKunci(id);if(!(ck&&!paksa&&cmOk(ck[0],ck[1]))){const v0=cmVer;await LOAD[id](paksa);if(ck&&v0===cmVer)cmCatat(ck[0],v0)}}}catch(e){toast(e.message||e,false)}finally{ld(0)}renderAll();scrollTo(0,0)}
function renderAll(){
 const ms=MENUS.filter(m=>allowed(m[0])),bt=m=>`<button class="${view===m[0]?'on':''}" onclick="go('${m[0]}')"><span>${m[2]}</span>${m[1]}</button>`;let h;
 if(role==='Developer')h=ms.map(bt).join('');
 else{const pakai=new Set();h=MENU_GRUP.map(([j,ids])=>{const it=ids.map(i=>ms.find(m=>m[0]===i)).filter(Boolean);it.forEach(m=>pakai.add(m[0]));return it.length?`<div class="ngrp"><div class="ngt">${j}</div>${it.map(bt).join('')}</div>`:''}).join('');const sisa=ms.filter(m=>!pakai.has(m[0]));if(sisa.length)h+=`<div class="ngrp">${sisa.map(bt).join('')}</div>`}
 const hx=h+(MEMB.length>1?'<button onclick="gantiSekolah()"><span>🔁</span>Beralih sekolah</button>':'')+(akunLain().length?'<button onclick="beralihAkun()"><span>👤</span>Beralih akun</button>':'');$('#sn').innerHTML=hx;$('#dn').innerHTML=hx;const pref=(role==='Developer'?['developer']:['dashboard','absensi','scan','tabungan']).filter(allowed).slice(0,4);
 $('#bn').innerHTML=pref.map(id=>{const m=MENUS.find(x=>x[0]===id);return `<button class="${view===id?'on':''}" onclick="go('${id}')"><span>${id==='scan'?'<svg width="32" height="32" viewBox="0 0 32 32" style="display:block;margin:-2px auto 1px"><rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="none" stroke="currentColor" stroke-width="2.4"/><g fill="currentColor"><rect x="7" y="8" width="2" height="16"/><rect x="10.5" y="8" width="1" height="16"/><rect x="13" y="8" width="3" height="16"/><rect x="17.5" y="8" width="1.2" height="16"/><rect x="20.2" y="8" width="2.2" height="16"/><rect x="24" y="8" width="1" height="16"/></g></svg>':m[2]}</span>${m[1]}</button>`}).join('')+`<button onclick="drw(1)"><span>☰</span>Menu</button>`;
 $('#dt').textContent=fmt(TODAY);$('#who').textContent=meNama+' - '+role+(MEMB.length>1?' · '+((MEMB.find(m=>m.sekolah_id===SEK)||{}).nama||''):'');renderV()}
let ko='landscape',km='terpisah';
let ks='depan';
let kartuTok=0;
const jedaGambar=()=>new Promise(r=>{let selesai=false;const f=()=>{if(selesai)return;selesai=true;r()};try{requestAnimationFrame(f)}catch(e){setTimeout(f,16)}setTimeout(f,80)});
let kartuIO=null;
/* gambar kartu dibuat hanya untuk yang terlihat atau hampir terlihat; foto diunduh paralel (maks 4) */
async function muatGambarKartu(){
 const tok=++kartuTok,imgs=[...document.querySelectorAll('#v img[data-kartu-id]')],st=$('#kartuStatus');
 if(kartuIO){try{kartuIO.disconnect()}catch(e){}kartuIO=null}
 const stat=(on,n)=>{if(!st)return;st.style.display=on?'flex':'none';if(on)st.innerHTML='<span class="kspn sm"></span><span>Menyiapkan kartu'+(n>1?' ('+n+' menunggu)':'')+'...</span>'};
 const siswaDari=im=>im.dataset.kartuId==='uji'?siswaUji():siswaById(Number(im.dataset.kartuId));
 const antre=[],pfAntre=[];let jalan=false,pf=0;
 const pfJalan=()=>{while(pf<4&&pfAntre.length){const s=pfAntre.shift();pf++;fotoSiap(s).catch(()=>{}).finally(()=>{pf--;pfJalan()})}};
 const jarakLayar=im=>{if(!im||!im.isConnected)return Infinity;const r=im.getBoundingClientRect();if(r.bottom>=0&&r.top<=window.innerHeight)return 0;return Math.min(Math.abs(r.top),Math.abs(r.bottom-window.innerHeight))};
 const ambilPrioritas=()=>{let ix=0,jarak=Infinity;for(let i=0;i<antre.length;i++){const d=jarakLayar(antre[i]);if(d<jarak){jarak=d;ix=i;if(d===0)break}}return antre.splice(ix,1)[0]};
 const isi=async im=>{const s=siswaDari(im);
  if(s){const sd=im.dataset.sisi||'depan';if(sd==='depan')await fotoSiap(s);if(tok!==kartuTok)return;im.src=kartuUrl(s,sd,true);im.alt='Kartu '+sd+' '+(s.pan||'');try{await im.decode()}catch(e){}}
  const w=im.closest('.kwrap');if(w)w.classList.add('siap')};
 const pompa=async()=>{if(jalan)return;jalan=true;
  try{while(antre.length){if(tok!==kartuTok)return;stat(true,antre.length);await jedaGambar();if(tok!==kartuTok)return;const im=ambilPrioritas();if(!im||!im.isConnected)continue;try{await isi(im)}catch(e){console.warn('Kartu gagal dibuat',e)}}}
  finally{jalan=false;if(tok===kartuTok&&!antre.length)stat(false)}};
 const masuk=im=>{if(antre.includes(im))return;const s=siswaDari(im);if(s&&(im.dataset.sisi||'depan')==='depan'&&s.foto_path&&!fotoMuat(s))pfAntre.push(s);antre.push(im);pfJalan();pompa()};
 if(!('IntersectionObserver' in window)){imgs.forEach(masuk);return}
 const io=new IntersectionObserver(es=>{for(const e of es){if(!e.isIntersecting)continue;io.unobserve(e.target);masuk(e.target)}},{rootMargin:'500px 0px'});
 kartuIO=io;imgs.forEach(im=>io.observe(im));
}
function renderV(){
 tutupAksi();const _tb=view==='kelola'||view==='tabungan'||view==='piket'||view==='hafalan'||view==='penilaian'||view==='pesan',_sl=_tb?(document.querySelector('#v .utabs')||{}).scrollLeft:0;
 $('#v').innerHTML=V[view]();if(view==='dashboard'&&window.AbsensiPWA)AbsensiPWA.updateButton();
 if(document.getElementById('hrJam'))hrMulai();
 if(role==='Developer')renderNavDev();
 enhanceCustomSelects($('#v'));
 if(_tb)utabTengah(_sl);
 if(view==='kartu')muatGambarKartu().catch(e=>toast('Gagal menyiapkan kartu: '+(e.message||e),false));
}
function form(t,f,cb){window._otpAktif=f.some(x=>!!x.ver);window._fver={};f.forEach(x=>{if(x.ver)_fver[x.k]=x.ver});$('#ms').textContent='Simpan';$('#ms').style.display='';$('#mt').textContent=t;$('#mbd').innerHTML='<div class="fg">'+f.map(x=>`<div class="fd"><label class="l">${x.l}</label>${x.ro?`<input id="f_${x.k}" class="input" value="${esc(x.v||'')}" readonly style="background:#f1f5f2;color:var(--mu)">`:x.o?`<select id="f_${x.k}" class="select">${x.o.map(o=>`<option ${o===x.v?'selected':''}>${esc(o)}</option>`).join('')}</select>`:x.t==='date'||x.t==='year'?dt(x.t,x.v||'','','',{id:'f_'+x.k,min:x.t==='year'?'1990-01-01':(x.min||'2000-01-01'),max:x.t==='year'?(+TODAY.slice(0,4)+1)+'-12-31':'2099-12-31',kosong:x.t==='date',ref:x.ref}):x.t==='time'?dt('time',x.v||'','','',{id:'f_'+x.k}):x.ver?`<div style="display:flex;gap:8px"><input id="f_${x.k}" class="input" inputmode="numeric" maxlength="6" autocomplete="one-time-code" style="flex:1" value="${esc(x.v||'')}"><button type="button" class="btn soft" onclick="formVer('${x.k}')">Verifikasi</button></div><div id="fv_${x.k}" class="mu" style="margin-top:4px"></div>`:`<input id="f_${x.k}" class="input" type="${x.t||'text'}" value="${esc(x.v||'')}">`}</div>`).join('')+'</div>';
 enhanceCustomSelects($('#mbd'));enhanceSecretInputs($('#mbd'));f.forEach(x=>{if(x.pkb)setTimeout(()=>pasangPkForm(x.k,1),0)});
 $('#ms').onclick=()=>{const v={};f.forEach(x=>v[x.k]=$('#f_'+x.k).value.trim());return Promise.resolve().then(()=>cb(v)).then(()=>{closeM();return true}).catch(e=>{toast(e.message||String(e),false);return false})};$('#md').classList.add('show');jagaModal(t,$('#ms').onclick,!window._otpAktif&&!JG_TOLAK.test(String(t)))}
async function formVer(k){const el=$('#f_'+k),o=$('#fv_'+k),fn=window._fver&&_fver[k];if(!el||!fn||!o)return;const kode=el.value.trim();
 if(!/^\d{6}$/.test(kode)){o.style.color='var(--rd)';o.textContent='Kode harus 6 angka';return}
 o.style.color='';o.textContent='Memeriksa...';
 try{await fn(kode);o.style.color='#1f9d55';o.textContent='✓ Kode benar. Silakan lanjutkan.'}catch(e){o.style.color='var(--rd)';o.textContent='✗ '+idErr(e.message||e)}}
async function verifikasiDaftar(){const wa=normWA($('#dfWa').value),kode=$('#dfKd').value.trim(),o=$('#dfVs');
 if(!/^628\d{8,12}$/.test(wa)){o.style.color='var(--rd)';o.textContent='Isi nomor WhatsApp dulu';return}
 if(!/^\d{6}$/.test(kode)){o.style.color='var(--rd)';o.textContent='Kode harus 6 angka';return}
 o.style.color='';o.textContent='Memeriksa...';
 try{await apiPublik({aksi:'otp_cek',keperluan:'daftar',nomor:wa,kode});o.style.color='#1f9d55';o.textContent='✓ Kode benar. Silakan lanjutkan.'}catch(e){o.style.color='var(--rd)';o.textContent='✗ '+idErr(e.message||e)}}
function closeM(){delete JGM.modal;const pv=$('#rpPrev');if(pv){pv.querySelectorAll('canvas').forEach(c=>{c.width=c.height=0});pv.innerHTML=''}$('#md').classList.remove('show','besar');window._otpAktif=false;window._pnOk=null;const m=$('#ms');if(m){m.className='btn success';m.disabled=false}resetTutup()}
/* Verifikasi kode (OTP): bila popup tertutup tanpa sengaja, tombol yang sama langsung membuka lagi pemasukan kode (10 menit) */
const OTP_TUNDA={};
function otpSimpan(k,meta,buka,mulai){OTP_TUNDA[k]={t:Date.now(),meta:meta||{},buka,mulai}}
function otpHapus(k){delete OTP_TUNDA[k]}
function otpLanjut(k,cek,args){const p=OTP_TUNDA[k];if(!p)return false;if(Date.now()-p.t>10*60000||(cek&&!cek(p.meta))){delete OTP_TUNDA[k];return false}
 p.buka(...(args||[]));const b=$('#mbd');if(b)b.insertAdjacentHTML('beforeend','<div class="note" style="margin-top:10px">Kode yang sudah dikirim tadi masih bisa dipakai. Bila kode tidak masuk atau sudah kedaluwarsa, kirim kode baru.<div class="tb" style="margin:8px 0 0"><button type="button" class="btn soft sm" onclick="otpUlang(\''+k+'\')">↻ Kirim kode baru</button></div></div>');return true}
function otpUlang(k){const p=OTP_TUNDA[k];delete OTP_TUNDA[k];closeM();if(p&&p.mulai)setTimeout(p.mulai,150)}
async function tutupM(){if(!await jagaTanya(['modal']))return;if(window._otpAktif&&$('#md').classList.contains('show')){const ya=await konfirmasi('Kode verifikasi sudah dikirim. Bila ditutup, tekan tombol yang sama lagi dalam 10 menit untuk langsung memasukkan kode tanpa mengirim kode baru.\n\nTutup sekarang?',{judul:'Tutup verifikasi?',ikon:'🔑',ya:'Tutup'});if(!ya)return}closeM()}
function konfirmasi(pesan,o){o=o||{};const _g=$('#cfg');if(_g){if(o.gambar){_g.src=o.gambar;_g.style.display='block'}else{_g.removeAttribute('src');_g.style.display='none'}}return new Promise(res=>{const m=$('#cf'),y=$('#cfy'),n=$('#cfn');$('#cfi').textContent=o.ikon||(o.bahaya?'🗑️':'❓');$('#cft').textContent=o.judul||'Konfirmasi';$('#cfm').textContent=pesan;y.textContent=o.ya||'Ya';y.className='btn '+(o.bahaya?'danger':'success');
 const kd=e=>{if(e.key==='Escape')fin(false)},fin=v=>{document.removeEventListener('keydown',kd);m.classList.remove('show');y.onclick=n.onclick=m.onclick=null;res(v)};
 document.addEventListener('keydown',kd);y.onclick=()=>fin(true);n.onclick=()=>fin(false);m.onclick=e=>{if(e.target===m)fin(false)};m.classList.add('show');y.focus()})}
const V={};
function nomorHilangProfil(){if(MB())return toast('Tidak tersedia di mode bantuan',false);
 const sk=(MEMB.find(m=>m.sekolah_id===SEK)||{}).nama||'';if(!sk||!PROFIL)return toast('Data sekolah tidak ditemukan',false);
 if(otpLanjut('hilang_profil'))return;
 form('Nomor WhatsApp hilang',[{k:'wa',l:'Nomor WhatsApp BARU yang aktif (contoh 08123456789)'}],async v=>{
  const wa=normWA(v.wa);if(!/^628\d{8,12}$/.test(wa))throw new Error('Nomor WhatsApp baru tidak valid');
  await apiPublik({aksi:'hilang_otp',nomor:wa});toast('Kode dikirim ke nomor baru');
  const bukaV=()=>{form('Verifikasi nomor baru',[{k:'kode',l:'Kode 6 angka yang dikirim ke nomor baru ('+fmtWA(wa)+')',ver:kd=>apiPublik({aksi:'otp_cek',keperluan:'nomor_hilang',nomor:wa,kode:kd})},{k:'ubaru',l:'Username baru (kosongkan bila tidak ingin mengganti)'},{k:'sandi',l:'Kata sandi baru (kosongkan bila tidak ingin mengganti)',t:'password'},{k:'sandi2',l:'Ulangi kata sandi baru',t:'password'}],async z=>{
    if(!/^\d{6}$/.test(z.kode))throw new Error('Kode harus 6 angka');
    const ub=(z.ubaru||'').trim().toLowerCase();
    if(ub&&!/^[a-z0-9._-]{3,20}$/.test(ub))throw new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah');
    if(z.sandi&&z.sandi.length<6)throw new Error('Kata sandi minimal 6 karakter');
    if(z.sandi!==(z.sandi2||''))throw new Error('Ulangi kata sandi dengan benar');
    await apiPublik({aksi:'hilang_kirim',nama:PROFIL.nama,nama_sekolah:sk,username_lama:PROFIL.username,nomor:wa,kode:z.kode,username_baru:ub,sandi_baru:z.sandi||''});otpHapus('hilang_profil');
    setTimeout(()=>info('Permintaan terkirim','<div class="note">Permintaan ganti nomor sudah dikirim ke admin untuk diperiksa. Anda akan dikabari lewat WhatsApp di nomor baru setelah disetujui. Nomor, username, dan kata sandi lama tidak berubah sebelum disetujui.</div>'),150)});$('#ms').textContent='Kirim permintaan'};otpSimpan('hilang_profil',{},bukaV,()=>nomorHilangProfil());setTimeout(bukaV,150)});$('#ms').textContent='Kirim kode ke nomor baru'}
/* ---------- pengingat kelengkapan profil & passkey di dashboard ---------- */
async function muatStatusProfil(){try{if(role==='Developer'||MB()||!me)return;
 S.nomor=await muatNomor();
 if(S.pkUid!==me){S.pkUid=me;await muatPasskeySaya()}}catch(e){}}
function notifProfil(){if(role==='Developer'||MB()||!PROFIL)return '';const m=[];
 if(!String(PROFIL.nip||'').trim())m.push('NIP');
 if(S.nomor&&!String(S.nomor[me]||'').trim())m.push('nomor WhatsApp');
 if(PK_OK&&Array.isArray(S.pk)&&!S.pk.length)m.push('passkey (masuk dengan sidik jari)');
 if(!m.length)return '';
 return `<div><b>👤 Profil belum lengkap.</b><div class="mu">Belum diisi: ${m.join(', ')}. Lengkapi di menu Profil Saya agar akun Anda aman dan mudah dipakai masuk.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="lompatKe('profil','${(String(PROFIL.nip||'').trim()&&S.nomor&&String(S.nomor[me]||'').trim())?'pnPasskey':'pnProfil'}')">Atur sekarang</button></div></div>`}
/* ---------- notifikasi fitur belum aktif (alpa otomatis, libur mingguan, tabungan) ---------- */
const fiturBelum=()=>{const L=[];if(!S.set)return L;
 if(!S.set.alpa_aktif)L.push({n:'⏰ Alpa otomatis',t:'alpa otomatis',f:"lompatPengaturan('pnAlpa','cbAlpa')"});
 if(!S.set.notif_libur_aktif||!S.set.notif_libur_mingguan){const b=[];if(!S.set.notif_libur_aktif)b.push('notifikasi libur');if(!S.set.notif_libur_mingguan)b.push('libur mingguan');L.push({n:'🔔 Notifikasi libur ('+b.join(' dan ')+')',t:'notifikasi libur ('+b.join(' dan ')+')',f:"lompatPengaturan('pnNotifLibur','"+(!S.set.notif_libur_aktif?'cbNotifLibur':'cbNotifMingguan')+"')"})}
 if(!S.set.tabungan_aktif)L.push({n:'💰 Tabungan siswa',t:'tabungan siswa',f:"lompatPengaturan('pnTabungan','cbTabungan')"});
  if(!S.set.piket_aktif)L.push({n:'🧹 Jadwal piket',t:'jadwal piket',f:"lompatPengaturan('pnPiket','cbPiket')"});
  if(!S.set.hafalan_aktif)L.push({n:'📖 Hafalan',t:'hafalan',f:"lompatPengaturan('pnHafalan','cbHafalan')"});
 return L};
function notifFitur(){if(role==='Developer'||!me)return '';const L=fiturBelum();if(!L.length)return '';
 if(adalahKepala())return `<div><b>🔔 Fitur belum aktif.</b><div class="mu">Fitur berikut belum diaktifkan. Tekan Atur untuk langsung membuka pengaturannya.</div>${L.map(x=>`<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:8px"><span>${x.n}</span><button class="btn sm success" onclick="${x.f}">Atur</button></div>`).join('')}</div>`;
 return `<div><b>🔔 Fitur belum aktif.</b><div class="mu">Belum aktif: ${L.map(x=>x.t).join(', ')}. Silakan informasikan kepada Kepala Sekolah agar fitur ini diaktifkan di Pengaturan.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="hubungiKepala()">💬 Hubungi Kepala Sekolah</button>${(S.guru||[]).some(g=>g.role==='operator'&&g.aktif)?`<button class="btn sm success" onclick="hubungiOperator()">💬 Hubungi Operator</button>`:''}</div></div>`}
async function hubungiKepala(){
 const G=S.guru||[],N=S.nomor||{},ada=g=>g.aktif&&String(N[g.id]||'').trim();
 const kp=G.filter(g=>g.role==='kepala_sekolah').find(ada)||G.filter(g=>g.role==='wakil_kepala').find(ada);
 let nomor=kp?String(N[kp.id]):(S.nomorKepala||'');
 if(!String(nomor).trim()){try{nomor=String(await dbq(db.rpc('nomor_wa_kepala',{p_sekolah:SEK}))||'').trim();if(nomor)S.nomorKepala=nomor}catch(e){nomor=''}}
 if(!String(nomor).trim())return toast('Nomor WhatsApp Kepala Sekolah belum tersedia. Silakan sampaikan langsung kepada Kepala Sekolah',false);
 bukaWAFitur(nomor)}
function bukaWAFitur(nomor){
 let d=String(nomor).replace(/\D/g,'');if(d.startsWith('0'))d='62'+d.slice(1);else if(d.startsWith('8'))d='62'+d;
 const L=fiturBelum().map(x=>x.t),teks='Assalamualaikum, saya '+meNama+' (guru '+ns()+'). Mohon fitur '+(L.length?L.join(', '):'yang belum aktif')+' diaktifkan di menu Pengaturan. Terima kasih.';
 let pergi=false;const tandai=()=>{pergi=true},vis=()=>{if(document.hidden)pergi=true};
 document.addEventListener('visibilitychange',vis);window.addEventListener('pagehide',tandai);window.addEventListener('blur',tandai);
 setTimeout(()=>{document.removeEventListener('visibilitychange',vis);window.removeEventListener('pagehide',tandai);window.removeEventListener('blur',tandai);if(!pergi)toast('Anda tidak memiliki aplikasi WhatsApp',false)},2200);
 const a=document.createElement('a');a.href='whatsapp://send?phone='+d+'&text='+encodeURIComponent(teks);a.style.display='none';document.body.appendChild(a);a.click();setTimeout(()=>a.remove(),500)}
let OPSX=[];
async function hubungiOperator(){
 let ops=[];
 try{ops=((await dbq(db.rpc('nomor_wa_operator',{p_sekolah:SEK})))||[]).filter(o=>String(o.no_wa||'').trim())}catch(e){ops=[]}
 if(!ops.length)return toast('Nomor WhatsApp Operator belum tersedia. Silakan sampaikan langsung kepada Operator',false);
 if(ops.length===1)return bukaWAFitur(ops[0].no_wa);
 OPSX=ops;
 info('Hubungi Operator','<div class="note">Pilih operator yang ingin dihubungi.</div>'+ops.map((o,i)=>`<button class="btn success" style="width:100%;margin:6px 0;text-align:left" onclick="closeM();bukaWAFitur(OPSX[${i}].no_wa)">💬 ${esc(o.nama||'Operator')}</button>`).join(''));
 {const b=$('#mtp');if(b){b.textContent='Tutup';b.className='btn soft';b.onclick=()=>tutupM()}}
}
async function muatRingDash(){try{if(role==='Developer'||MB()||!SEK)return;KL.ring=(await dbq(db.rpc('keputusan_validasi',{p_sekolah:SEK})))||null}catch(e){console.warn('Validasi keputusan akhir tahun gagal dimuat',e)}}
function mulaiSahkan(kid){KL.tab='pengesahan';KL.dq='';KL.dk='';KL.hm=false;KL.hs.clear();lompatKe('kelola','klKelas'+kid)}
function notifSahKelas(){if(!me||!KL.ring)return '';
 const r=KL.ring,head=adalahKepala()||(role==='Developer'&&MB()),mine=new Set((S.kelas||[]).filter(k=>k.wali===me).map(k=>k.id));
 const L=(r.kelas||[]).filter(k=>(head||mine.has(k.kelas_id))&&k.sementara>0&&!(r.masalah||[]).some(x=>String(x.kelas_id)===String(k.kelas_id)));
 if(!L.length)return '';
 return `<div><b>✅ Kelas Anda perlu disahkan.</b><div class="mu">${L.length>1?'Kelas yang perlu disahkan: '+L.map(k=>esc(k.nama)).join(', ')+'. Tombol Mulai membuka kelas paling atas ('+esc(L[0].nama)+').':'Keputusan akhir tahun kelas '+esc(L[0].nama)+' menunggu pengesahan Anda.'}</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="mulaiSahkan(${L[0].kelas_id})">Mulai</button></div></div>`}
function notifTahunBaru(){if(!(adalahKepala()||(role==='Developer'&&MB()))||!KL.ring)return '';
 const r=KL.ring,ks=(r.kelas||[]).filter(k=>k.total>0);
 if(!ks.length||(r.masalah||[]).length||!ks.every(k=>k.sementara===0&&k.belum===0&&k.disahkan>0))return '';
 return `<div><b>🎓 Semua kelas sudah disahkan.</b><div class="mu">Tinggal menunggu tahun ajaran baru dimulai. Tekan Mulai untuk membuka menu Tahun Ajaran Baru.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="lompatKe('tahunajaran','pnTahunAjaran','btnTahunBaru')">Mulai</button></div></div>`}
function notifGabung(){const a=[bannerKonfigIsi(),notifProfil(),notifSahKelas(),notifTahunBaru(),notifFitur()].filter(Boolean);if(!a.length)return '';
 return `<div class="note" style="border-left:4px solid #d7a72f;margin:16px 0">${a.map((x,i)=>i?`<div style="border-top:1px solid #dfeadc;margin-top:12px;padding-top:12px">${x}</div>`:x).join('')}</div>`}
V.profil=()=>{setTimeout(()=>ttdProfilMuat(),0);const p=PROFIL||{},dev=role==='Developer',u=S.pfs||{},mb=MB();
 const wa=(S.nomor&&S.nomor[me])||'',sk=(typeof MEMB!=='undefined'&&MEMB.find(m=>m.sekolah_id===SEK)||{}).nama||'';
 const row=(l,v)=>`<div class="mu">${l}</div><div style="word-break:break-word"><b>${v||'<span class="mu">-</span>'}</b></div>`;
 const data=[row('Nama lengkap',esc(p.nama||'')),row('Username',esc(p.username||'')),row('Peran',esc(role||'')),row('NIP',esc(p.nip||'')),
  row('WhatsApp',dev?'':(wa?esc(fmtWA(wa)):'')),row('Sekolah',dev?'':esc(sk)),
  row('Status',p.aktif?'<span class="badge Hadir">Aktif</span>':'<span class="badge Belum">Nonaktif</span>'),
  row('Terdaftar',p.dibuat?esc(waktuId(p.dibuat)):''),row('Email akun',esc(u.email||'')),row('Terakhir masuk',u.last_sign_in_at?esc(waktuId(u.last_sign_in_at)):''),
  row('ID akun','<span style="font-size:11px">'+esc(me||'')+'</span>')].join('');
 const aksi=mb?'<div class="note">Mode bantuan: data hanya bisa dilihat.</div>':`<div class="tb" style="margin-top:12px"><button class="btn success" onclick="editProfilSaya()">✏️ Ubah profil${dev?'':' &amp; sandi'}</button>${dev?'':'<button class="btn soft" onclick="gantiNomor()">📱 Ubah nomor</button><button class="btn soft" onclick="nomorHilangProfil()">📵 Nomor hilang</button>'}</div>`;
 let pk;
 if(mb)pk='<div class="note">Passkey tidak tersedia di mode bantuan.</div>';
 else if(!PK_OK)pk='<div class="note">Passkey tidak tersedia di browser atau versi aplikasi ini. Gunakan Chrome atau Safari versi terbaru di HP.</div>';
 else if(S.pkErr)pk='<div class="note" style="color:var(--rd)">⚠ '+esc(S.pkErr)+'</div>';
 else{const L=S.pk||[];
  pk='<div class="note">Dengan passkey, Anda bisa masuk cukup dengan sidik jari, wajah, atau PIN layar HP. Kata sandi tetap bisa dipakai. Status di perangkat ini: <b>'+(pkAda()?'passkey aktif':'belum diaktifkan')+'</b>.</div>'
   +(L.length?'<div class="tw"><table><tbody>'+L.map((x,i)=>`<tr><td class="no">${i+1}</td><td><b>${esc(x.friendly_name||'Passkey')}</b><div class="mu">Dibuat ${x.created_at?esc(waktuId(x.created_at)):'-'}${x.last_used_at?' · terakhir dipakai '+esc(waktuId(x.last_used_at)):''}</div></td><td style="white-space:nowrap"><button class="btn sm soft" onclick="renamePasskey('${x.id}')">Ubah nama</button> <button class="btn sm danger" onclick="hapusPasskey('${x.id}')">Hapus</button></td></tr>`).join('')+'</tbody></table></div>':'<div class="mu" style="margin:10px 0">Belum ada passkey di akun ini.</div>')
   +'<button class="btn success" style="width:100%;margin-top:10px" onclick="daftarPasskey()">+ Aktifkan passkey di perangkat ini</button>'
   +(L.length&&!pkAkunList().some(x=>x.u===p.username)?'<button class="btn soft" style="width:100%;margin-top:8px" onclick="pkIngatAkun()">🔗 Tambahkan akun ini ke pilihan login</button><div class="mu" style="margin-top:4px">Cukup sekali per browser agar akun muncul di daftar pilihan masuk sidik jari. Bila muncul beberapa akun, pilih akun Anda sendiri.</div>':'')}
 return `<div class="panel" id="pnProfil"><div class="ph">👤 Profil Saya</div><div class="pb"><div style="display:grid;grid-template-columns:110px 1fr;gap:10px 12px;align-items:start">${data}</div>${aksi}</div></div><div class="panel" id="pnTtdProfil"><div class="ph">✍️ Tanda Tangan Saya</div><div class="pb" id="ttdProfilBox"><div class="mu">Memuat tanda tangan...</div></div></div><div class="panel" id="pnPasskey"><div class="ph">🔐 Passkey (sidik jari / wajah)</div><div class="pb">${pk}</div></div>`};

/* ---------- panduan awal kepala sekolah ---------- */
let KONFIG_NANTI=false;
const langkahWajib=()=>[
 {ok:S.kelas.length>0,t:'Tambah kelas',d:'Belum ada kelas. Siswa tidak bisa ditambahkan tanpa kelas.',b:'Atur Kelas',f:"lompatPengaturan('pnKelas','btnTambahKelas')"},
 {ok:!!String((S.set&&S.set.nama_sekolah)||'').trim(),t:'Isi nama sekolah',d:'Tampil di menu, kartu pelajar, rekap, dan pesan ke orang tua.',b:'Atur Nama',f:"lompatPengaturan('pnNama','nsInp')"},
 {ok:!!String((S.set&&S.set.kota)||'').trim(),t:'Isi kota / kabupaten',d:'Dipakai pada tanda tangan Kepala Sekolah di rekap.',b:'Isi Kota',f:"lompatPengaturan('pnAlamat','ktInp')"}];
/* arahkan ke kartu: judul tidak tertutup header, kartu panjang langsung ke kotak/tombol tujuan, lalu berkedip 5 detik */
const KEDIP_MS=5200;
function kedip(el){if(!el)return;el.classList.remove('sorot');void el.offsetWidth;el.classList.add('sorot');clearTimeout(el._kd);el._kd=setTimeout(()=>el.classList.remove('sorot'),KEDIP_MS)}
function sorotKe(id,fokus,ulang){const p=$('#'+id);if(!p)return;
 const f=fokus?$('#'+fokus):null,top=($('.top')||{offsetHeight:0}).offsetHeight,bn=$('#bn'),bw=(bn&&getComputedStyle(bn).display!=='none')?bn.offsetHeight:0;
 const atas=top+10,ruang=innerHeight-atas-bw-10,r=p.getBoundingClientRect();let dy;
 if(r.height<=ruang||!f)dy=r.top-atas;
 else{const fr=f.getBoundingClientRect();dy=fr.top-atas-Math.max(0,(ruang-fr.height)/2)}
 if(Math.abs(dy)>2)window.scrollBy({top:dy,behavior:ulang?'auto':'smooth'});
 if(!ulang){kedip(p);if(f&&r.height>ruang)kedip(f.closest('.fd,label,.tb')||f);if(f&&/^(checkbox|radio)$/.test(f.type||''))setTimeout(()=>{try{f.focus({preventScroll:true})}catch(e){}},500)}
 else if(!p.classList.contains('sorot'))kedip(p)}
async function lompatKe(v,id,fokus){closeM();await go(v);setTimeout(()=>sorotKe(id,fokus),150);setTimeout(()=>sorotKe(id,fokus,true),1100)}
function lompatPengaturan(id,fokus){return lompatKe('pengaturan',id,fokus)}
function kedipHalaman(){setTimeout(()=>kedip($('#v .panel')),200)}
function panduanAwal(){if(!adalahKepala())return '';const L=langkahWajib(),n=L.filter(x=>x.ok).length;if(n===L.length)return '';
 return `<div class="panel" style="border:2px solid #d7a72f"><div class="ph">🚀 Panduan Awal <span class="mu">${n} dari ${L.length} selesai</span></div><div class="pb"><div class="note">Lengkapi data sekolah berikut agar aplikasi siap dipakai. Tombol akan langsung membawa Anda ke bagian yang tepat.</div>${L.map(x=>`<div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0"><div><b>${x.ok?'✅':'⬜'} ${x.t}</b><div class="mu">${x.d}</div></div>${x.ok?'':`<button class="btn sm success" onclick="${x.f}">${x.b}</button>`}</div>`).join('')}</div></div>`}
function konfigKurang(){const k='kf_'+SEK;
 if(RHS&&!RHS.error){const m=[];if(!String(RHS.nomor_kepala||'').trim())m.push('Nomor Kepala Sekolah');if(!(RHS.tokens||[]).length)m.push('Token Fonnte');try{localStorage.setItem(k,JSON.stringify(m))}catch(e){}return m}
 if(RHS===null){try{const c=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(c))return c}catch(e){}return ['Nomor Kepala Sekolah','Token Fonnte']}
 return null}
function bannerKonfigIsi(){if(!adalahKepala()||KONFIG_NANTI)return '';const m=konfigKurang();if(!m||!m.length)return '';
 return `<div><b>⚙ Konfigurasi belum lengkap.</b><div class="mu">Belum diisi: ${m.join(', ')}. Nomor WhatsApp Kepala Sekolah diatur melalui menu Profil Saya, sedangkan token Fonnte diatur di sini. Keduanya diperlukan agar notifikasi WhatsApp dapat berjalan. ID Group dan Kunci AI bersifat opsional.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="${m.includes('Nomor Kepala Sekolah') ? "lompatKe('profil','pnProfil')" : "lompatPengaturan('pnKonfig','btnTambahToken')"}">Atur sekarang</button><button class="btn sm soft" onclick="KONFIG_NANTI=true;renderV()">Atur nanti</button></div></div>`}
function sapaAwal(){if(!adalahKepala())return;const L=langkahWajib().filter(x=>!x.ok);if(!L.length)return;const k='sapa_'+SEK;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
 info('Selamat Datang 👋','<div style="text-align:center;padding:6px 4px"><div style="font-size:42px">🏫</div><p>Sekolah Anda belum siap dipakai. Masih ada <b>'+L.length+' hal</b> yang perlu diisi: '+L.map(x=>x.t.toLowerCase()).join(', ')+'.</p><button class="btn success" style="width:100%" onclick="closeM();'+L[0].f.replace(/"/g,'&quot;')+'">Mulai atur: '+L[0].b+'</button><button class="btn soft" style="width:100%;margin-top:8px" onclick="closeM()">Nanti</button></div>')}
const tglHero=d=>{const t=String(d||'').split('-');return t.length===3?t[2]+'/'+t[1]+'/'+t[0]:''};
function jamHero(){const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);return p.hour+'<span class="hr-c" style="opacity:'+(+p.second%2?0:1)+'">:</span>'+p.minute+'<span class="hr-w">WIB</span>'}
function hrMulai(){if(window._hrTimer)return;const t=()=>{window._hrTimer=null;const e=document.getElementById('hrJam');if(!e||document.hidden)return;const h=jamHero();if(e.innerHTML!==h)e.innerHTML=h;window._hrTimer=setTimeout(t,1000-Date.now()%1000+15)};window._hrTimer=setTimeout(t,0)}
let rkOpen=false,rkKelas='',rkQ='';
V.dashboard=()=>{if(role==='Developer')return devDashboard();const a=A(TODAY),l=act(),c={Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0},kosong=()=>({t:0,Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0}),pk={};
 S.kelas.forEach(k=>{pk[k.nama]=kosong()});
 l.forEach(s=>{const st=dayStat(s,TODAY);c[st]++;const p=pk[s.kelas]||(pk[s.kelas]=kosong());p.t++;p[st]++});
 const kl=key=>Object.keys(pk).map(nm=>{const p=pk[nm],v=key==='Hadir'?p.Hadir+p.Terlambat:p[key];return `<div class="${v?'':'z'}" role="button" tabindex="0" style="cursor:pointer" title="Lihat nama anak kelas ${esc(nm)}" onclick="event.stopPropagation();bukaDetailStatusDashboard('${key}',this.dataset.kelas)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();bukaDetailStatusDashboard('${key}',this.dataset.kelas)}" data-kelas="${esc(nm)}"><b>${esc(nm)}</b> : ${v} dari ${p.t} orang</div>`}).join('');
 const n=l.length||1,cs=[['Hadir',c.Hadir+c.Terlambat,'termasuk '+c.Terlambat+' terlambat','#159447','Hadir'],['Terlambat',c.Terlambat,'','#d99a27','Terlambat'],['Izin',c.Izin,'','#248fe9','Izin'],['Sakit',c.Sakit,'','#ef5361','Sakit'],['Alpa',c.Alpa,'','#7a4be5','Alpa'],['Libur',c.Libur,'','#526b84','Libur'],['Belum Absen',c.Belum,'perlu ditindaklanjuti','#c98a1b','Belum']];
 return `<div class="hero hero2"><div class="hr-top"><span id="hrJam">${jamHero()}</span><span>${tglHero(TODAY)}</span></div><div class="hr-body"><div><h1>Selamat Datang 👋🏻<br>di ${esc(ns())}</h1></div><i>${logoHtml()}</i></div><p class="hr-belum">${c.Belum} anak belum absen.</p></div><div id="absensiPwaInstall" class="panel" hidden style="margin-top:12px"><div class="pb" style="padding:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:160px"><b>📲 Instal Absensi 1486</b><div class="mu">Akses lebih cepat langsung dari layar utama HP.</div></div><button type="button" class="btn success sm" onclick="pasangAbsensiPWA()">Instal Aplikasi</button></div></div>${panduanAwal()}${notifGabung()}
 <div class="panel"><div class="ph">⚡ Aksi Cepat</div><div class="pb"><div class="quick"><button style="background:#168b47" onclick="go('absensi')">✍️ Absensi</button><button style="background:#d7a72f" onclick="go('scan')">📷 Scan</button><button style="background:#7650b8" onclick="go('siswa')">👤 Siswa</button>${S.set&&S.set.tabungan_aktif?'<button style="background:#2a806c" onclick="go(\'tabungan\')">💰 Tabungan</button>':'<button style="background:#2a806c" onclick="go(\'rekap\')">📚 Rekap</button>'}</div></div></div>
 <div class="stats">${cs.map(x=>`<div class="card stat" style="cursor:pointer" role="button" tabindex="0" title="Lihat nama anak" onclick="bukaDetailStatusDashboard('${x[4]}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();bukaDetailStatusDashboard('${x[4]}')}"><b style="color:${x[3]}">${x[1]}</b>${x[0]}<div class="mu">${x[2]||'&nbsp;'}</div><div class="bar"><i style="width:${Math.round(x[1]*100/n)}%;background:${x[3]}"></i></div>${S.kelas.length?`<div class="kls" style="color:${x[3]}">${kl(x[4])}</div>`:''}</div>`).join('')}</div>
 <div class="panel"><div class="ph rk-h" onclick="toggleRekapHari()"><span>📋 Rekap Hari Ini</span><span class="mu">${fmt(TODAY)} <span class="rk-arrow">${rkOpen?'▲':'▼'}</span></span></div>${rkOpen?`<div class="pb"><div class="rekap-filter"><input id="rkq" class="input" placeholder="Cari nama anak..." value="${esc(rkQ)}" oninput="cariRekapHari(this)"><select class="select" onchange="rkKelas=this.value;renderV()">${rkOpt()}</select></div><div id="rkTab" style="margin-top:10px">${rekapHariTabel()}</div></div>`:''}</div>`};
function bukaDetailStatusDashboard(status,kelasFilter){
 const semua=act().filter(s=>!kelasFilter||s.kelas===kelasFilter),a=A(TODAY),pilih=semua.filter(s=>{const st=dayStat(s,TODAY);return status==='Hadir'?(st==='Hadir'||st==='Terlambat'):st===status});
 const waktuUrut=s=>{const r=a[s.id];const t=r&&(r.iso||r.waktu);if(!t)return Number.POSITIVE_INFINITY;const n=Date.parse(t);return Number.isFinite(n)?n:Number.POSITIVE_INFINITY};
 const urut=pilih.sort((x,y)=>String(x.kelas||'').localeCompare(String(y.kelas||''),'id')||waktuUrut(x)-waktuUrut(y)||String(x.nama||'').localeCompare(String(y.nama||''),'id'));
 const judul=(status==='Hadir'?'Hadir (termasuk terlambat)':status==='Belum'?'Belum Absen':status)+(kelasFilter?' · '+kelasFilter:'');
 let html='<div class="mu" style="margin-bottom:8px">'+fmt(TODAY)+' · '+urut.length+' anak'+(status==='Hadir'?' · status Hadir dan Terlambat':'')+'</div>';
 if(!urut.length){html+='<div class="note">Tidak ada anak dengan status '+esc(judul)+' hari ini.</div>'}else{
  let kelas='';
  urut.forEach((s,i)=>{
   if(s.kelas!==kelas){kelas=s.kelas;html+='<div style="margin:8px 0 3px;padding:6px 9px;border-radius:8px;background:var(--bg);font-weight:800">'+esc(kelas||'Tanpa kelas')+'</div>'}
   const r=a[s.id],st=dayStat(s,TODAY),w=r&&r.waktu?jamJkt(r.waktu):'',datang=r&&r.jam?'Datang '+r.jam+' WIB':'',catat=r?((w?w+' WIB':'-')+' · '+namaPencatatAbsensi(r)):'Belum ada catatan waktu/pencatat',ringkas=(datang?datang+' · ':'')+catat;
   const meta='<span class="dash-status-meta">'+(r&&r.jam?'<span>Jam datang: <b>'+esc(r.jam)+' WIB</b></span>':'')+'<span>Diubah: <b>'+(w?esc(w)+' WIB':'-')+'</b></span><span>Oleh: <b>'+esc(r?namaPencatatAbsensi(r):'Belum tersedia')+'</b></span></span>';
    html+='<div class="dash-status-row"><span class="dash-status-no">'+(i+1)+'.</span><b class="dash-status-name" title="'+esc(s.nama)+'">'+esc(s.nama)+'</b><span>'+badge(st)+'</span>'+meta+'</div>';
  });
 }
 info('📋 '+judul,html);
}

const rkOpt=()=>'<option value="">- Pilih kelas -</option><option value="*" '+(rkKelas==='*'?'selected':'')+'>Semua kelas</option>'+kopt(rkKelas,0);
function toggleRekapHari(){rkOpen=!rkOpen;renderV()}
function rekapHariData(){const z=rkQ.toLowerCase().trim();return act().filter(s=>rkKelas&&(rkKelas==='*'||s.kelas===rkKelas)&&(!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z)))}
function rekapHariTabel(){if(!rkKelas)return PKH;const a=A(TODAY),l=rekapHariData();
 const rows=l.map((s,i)=>{const r=a[s.id],w=r&&r.waktu?jamJkt(r.waktu):'',catat=r?((w?'<b>'+esc(w)+' WIB</b>':'-')+'<br><span class="mu">'+esc(namaPencatatAbsensi(r))+'</span>'):'-';return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas)}</td><td>${badge(dayStat(s,TODAY))}</td><td>${r?esc((r.jam?r.jam+' WIB · ':'')+r.cara+(r.cat?' - '+r.cat:'')):''}</td><td>${catat}</td></tr>`}).join('');
 return '<div class="mu" style="margin-bottom:6px">Menampilkan '+l.length+' anak</div>'+tab(['No','Nama','Kelas','Status','Keterangan','Dicatat/diubah · Oleh'],rows,'Tidak ada anak yang cocok.')}
function cariRekapHari(el){rkQ=el.value;const t=$('#rkTab');if(t)t.innerHTML=rekapHariTabel()}
