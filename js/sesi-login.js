/* ---------- login + navigasi ---------- */
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
