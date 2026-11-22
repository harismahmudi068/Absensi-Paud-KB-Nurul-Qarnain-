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


function pkAkunList(){try{const a=JSON.parse(localStorage.getItem('pk_akun')||'[]');return Array.isArray(a)?a.filter(x=>x&&x.c&&x.u):[]}catch(e){return []}}
function pkAkunSimpan(a){try{localStorage.setItem('pk_akun',JSON.stringify(a.slice(0,8)))}catch(e){}}
function pkAkunTambah(u,n,c){pkAkunSimpan([{u,n,c}].concat(pkAkunList().filter(x=>x.u!==u&&x.c!==c)))}
function pkAkunHapus(c){pkAkunSimpan(pkAkunList().filter(x=>x.c!==c))}
/* Alur resmi supabase-js tetap dipakai; kita hanya (1) menyempitkan pilihan ke satu akun dan (2) mencatat id kredensial yang dipakai */
