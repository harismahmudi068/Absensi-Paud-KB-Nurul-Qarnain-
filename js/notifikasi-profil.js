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
