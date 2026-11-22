/* ---------- sakelar push per sekolah yang diatur Developer ---------- */
function devPushDari(sid){const r=(S.devPush||[]).find(x=>Number(x.sekolah_id)===Number(sid));return r?{piket:r.push_piket!==false,absensi:r.push_absensi!==false,tabungan:r.push_tabungan!==false,hafalan:r.push_hafalan!==false}:null}
function devPushBadge(sid){const d=devPushDari(sid);if(!d)return '-';
 return `<div style="display:flex;flex-direction:column;gap:4px;min-width:110px">${[['piket','🧹 Piket'],['absensi','✅ Absensi'],['tabungan','💰 Tabungan'],['hafalan','📖 Hafalan']].map(([k,n])=>`<label class="swp"><span>${n}</span><span class="sw"><input type="checkbox" ${d[k]?'checked':''} onchange="devAturPush(${sid},'${k}',this.checked)"><i></i></span></label>`).join('')}</div>`}
function devPushCatatan(){return S.devPush?`<div class="note" style="margin-top:8px">Sakelar Push Notifikasi: bila dimatikan, pilihan itu tidak tampil di Pengaturan sekolah dan push jenis itu berhenti dikirim. Centang yang sudah dipilih Kepala Sekolah tidak hilang, jadi saat dinyalakan lagi kembali seperti semula.</div>`:`<div class="note" style="margin-top:8px;color:var(--rd)">Data sakelar push belum tersedia. Jalankan skrip SQL langkah-push-developer.sql di Supabase.</div>`}
async function devAturPush(sid,jenis,on){
 const sk=(S.devSek||[]).find(x=>x.id===sid)||{},NM={piket:'pengingat piket',absensi:'notifikasi absensi',tabungan:'notifikasi tabungan',hafalan:'notifikasi Hafalan'};
 if(!on&&!await konfirmasi('Matikan '+NM[jenis]+' untuk '+(sk.nama||'sekolah ini')+'? Pilihannya tidak akan tampil lagi di Pengaturan Kepala Sekolah, dan push jenis ini berhenti dikirim ke orang tua.',{judul:'Matikan notifikasi push',ya:'Matikan',bahaya:1})){renderV();return}
 guard(async()=>{try{await dbq(db.rpc('developer_atur_push',{p_sekolah:sid,p_jenis:jenis,p_aktif:!!on}));
  S.devPush=await dbq(db.rpc('developer_push_daftar')).catch(()=>S.devPush);
  toast((on?'Dinyalakan: ':'Dimatikan: ')+NM[jenis]+' untuk '+(sk.nama||'sekolah'))}
  finally{renderV()}})}
let CFG_SID=null;
function panelWebhook(){return `<div class="panel"><div class="ph">🔗 Alamat Webhook</div><div class="pb"><div class="note">Satu alamat Webhook untuk semua akun Fonnte sekolah Anda: pasang alamat yang sama di setiap perangkat Fonnte. Alamat ini rahasia dan unik untuk sekolah Anda, jadi disembunyikan. Untuk melihatnya, masukkan kata sandi akun Anda.</div><div class="tb"><button class="btn success" onclick="mintaWebhook(false)">🔓 Tampilkan alamat</button><button class="btn danger" onclick="mintaWebhook(true)">♻ Buat ulang kunci</button></div></div></div>`}
function cfgIsi(){const R=RHS||{},tks=R.tokens||[],grp=R.grup||[],ai=R.kunci_ai||{},pts=R.penerima_tes||[];
 const pilihan=pts.some(x=>String(x.id)===String(penerimaTesId))?penerimaTesId:'';
 penerimaTesId=String(pilihan||'');
 const daftarPenerima=pts.length?`<select id="penerimaTes" class="select" style="width:100%;max-width:420px" onchange="penerimaTesId=this.value"><option value="" disabled ${!penerimaTesId?'selected':''}>Pilih nomor tujuan tes terlebih dahulu</option>${pts.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===penerimaTesId?'selected':''}>${esc(x.nama)} — ${esc(({kepala_sekolah:'Kepala Sekolah',wakil_kepala:'Wakil Kepala Sekolah',operator:'Operator',pengelola:'Pengelola/Pengasuh'})[x.role]||x.role)} ${x.nomor?'('+esc(x.nomor)+')':'(nomor belum diisi)'}</option>`).join('')}</select>`:'<div class="note">Belum ada anggota aktif dengan nomor WhatsApp yang bisa dipilih untuk uji tes.</div>';
 const mm=RHS===null?'<div class="note">⏳ Memuat konfigurasi...</div>':'',err=R.error?`<div class="note" style="color:var(--rd)">⚠ ${esc(R.error)}</div>`:'';
 const aiSt=RHS===null?'<span class="badge Belum">Memuat...</span>':ai.ada?`<span class="badge Hadir">Terisi ${esc(ai.tampil||'')}</span>`:'<span class="badge Belum">Belum diisi</span>';
 const namaT=id=>{const t=tks.find(x=>x.id===id);return t?t.label:'Token utama'};
 const map=R.pemetaan||[],kelasCfg=R.kelas||[];
 const barisT=tks.length?tks.map(t=>`<div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0"><div><b>${esc(t.label)}</b> <span class="badge Hadir">${esc(t.tampil||'')}</span>${t.perangkat?`<div class="mu">Perangkat ${esc(fmtWA(t.perangkat))}</div>`:''}</div><div class="tb" style="margin:0"><button class="btn sm soft" onclick="tesToken(${t.id})">🧪 Tes</button><button class="btn sm danger" onclick="hapusToken(${t.id})">🗑</button></div></div>`).join(''):'<div class="mu">Belum ada token Fonnte.</div>';
 const barisG=grp.length?grp.map(g=>{const terhubung=map.filter(x=>Number(x.grup_wa_id)===Number(g.id));const namaK=terhubung.map(x=>x.kelas_nama);return `<div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin:6px 0"><div style="flex:1;min-width:170px"><b>${esc(g.label||'Grup')}</b><div class="mu" style="word-break:break-all">${esc(g.grup_id)} · ${esc(namaT(g.token_id))}</div><div class="mu" style="margin-top:5px">Kelas: ${namaK.length?namaK.map(esc).join(', '):'Belum ada kelas terhubung'}</div></div><div class="tb" style="margin:0"><button class="btn sm success" ${kelasCfg.length?'':'disabled'} onclick="sambungkanKelas(${g.id})">☑ Sambungkan Kelas</button><button class="btn sm danger" onclick="hapusGrup(${g.id})">🗑</button></div></div>`}).join(''):'<div class="mu">Belum ada ID grup.</div>';
 const pemetaanHtml=`<div class="fd" style="margin-top:18px;padding-top:14px;border-top:1px dashed var(--bd)"><label class="l">🔗 Hubungkan Kelas ke Grup WhatsApp</label><div class="note">Tekan “Sambungkan Kelas” pada masing-masing ID grup, lalu centang kelas yang akan menerima pemberitahuan melalui grup tersebut. Satu grup dapat dihubungkan dengan beberapa kelas.</div></div>`;
 return `<div class="note">Kunci dan token tidak ditampilkan lagi setelah disimpan. Satu sekolah boleh memakai beberapa akun Fonnte dan beberapa grup WhatsApp (misalnya satu grup per kelas), semuanya lewat satu alamat Webhook. Setiap uji tes wajib memilih nomor tujuan dari anggota aktif sekolah yang tersedia. Notifikasi rutin tetap mengikuti nomor WhatsApp Kepala Sekolah di Profil.</div>${mm}${err}
<div class="fd" style="margin-top:10px"><label class="l">Nomor tujuan uji tes WhatsApp</label>${daftarPenerima}</div>
<div class="fd" style="margin-top:12px;padding:12px;border:1px solid var(--bd);border-radius:13px;background:var(--bg)">
<label class="l">🔑 Akun API Key Gemini <span class="badge ${(R.gemini_keys||[]).filter(x=>x.aktif).length>=5?'Alpa':'Hadir'}">${(R.gemini_keys||[]).filter(x=>x.aktif).length}/5 aktif</span></label>
<div class="note">Setiap sekolah dapat menyimpan maksimal 5 API Key aktif. Sistem AI akan menggunakan daftar akun ini secara bergantian sesuai mekanisme rotasi dan pemulihan yang sudah berjalan.</div>
${barisGemini(R.gemini_keys||[],ai)}
<button class="btn success sm" style="margin-top:9px" ${(R.gemini_keys||[]).filter(x=>x.aktif).length>=5?'disabled':''} onclick="tambahGeminiKey()">＋ Tambah akun Gemini</button>

</div>
<div class="fd" style="margin-top:16px"><label class="l">Token Fonnte</label>${barisT}<button id="btnTambahToken" class="btn sm success" onclick="tambahToken()">+ Token Fonnte</button></div>
<div class="fd" style="margin-top:16px"><label class="l">ID Group WhatsApp</label>${barisG}<button class="btn sm success" ${tks.length?'':'disabled'} onclick="tambahGrup()">+ ID Group</button>${tks.length?'':'<div class="mu">Tambahkan token Fonnte dulu.</div>'}</div>${pemetaanHtml}`}
function barisGemini(keys,ai){
 if(!keys.length)return ai.ada?'<div class="note">Masih ada API Key lama. Tambahkan akun Gemini baru agar pengelolaan memakai daftar akun.</div>':'<div class="mu">Belum ada akun Gemini yang terdaftar.</div>';
 return keys.map(k=>{const aktif=!!k.aktif, status=k.error_permanen?'Perlu perbaikan':(k.status|| (aktif?'Belum diuji':'Nonaktif'));return `<div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0;padding:9px 10px;border:1px solid var(--bd);border-radius:10px;background:var(--card)">
 <div style="min-width:150px;flex:1"><b>${esc(k.label||'Akun Gemini')}</b> <span class="badge ${aktif?'Hadir':'Belum'}">${aktif?'Aktif':'Nonaktif'}</span><div class="mu">Hasil tes: ${esc(status)}${k.kode_error?' · Kode: '+esc(k.kode_error):''}</div>${k.detail_error?'<div class="mu" style="color:var(--danger)">Keterangan: '+esc(k.detail_error)+'</div>':''}${k.terakhir_dicoba?'<div class="mu">Terakhir diuji: '+esc(new Date(k.terakhir_dicoba).toLocaleString('id-ID'))+'</div>':''}${k.terakhir_berhasil?'<div class="mu">Terakhir berhasil: '+esc(new Date(k.terakhir_berhasil).toLocaleString('id-ID'))+'</div>':''}${k.terakhir_error?'<div class="mu">Terakhir gagal: '+esc(new Date(k.terakhir_error).toLocaleString('id-ID'))+'</div>':''}</div>
 <div style="display:flex;gap:6px;flex-wrap:wrap"><button class="btn sm soft" onclick="tesGeminiKey(${Number(k.id)})">🧪 Tes</button><button class="btn sm danger" onclick="hapusGeminiKey(${Number(k.id)})">Hapus</button></div></div>`}).join('');
}
async function tesGeminiKey(id){
 if(!penerimaTesId)return toast('Pilih nomor tujuan tes WhatsApp terlebih dahulu',false);
 guard(async()=>{const j=await apiPengaturan({aksi:'gemini_key_tes',id,penerima_id:penerimaTesId});await segarCfg();toast(j.pesan||(j.berhasil?'API Key berfungsi':'API Key bermasalah'),!!j.berhasil)});
}
function tambahGeminiKey(){
 const aktif=((RHS||{}).gemini_keys||[]).filter(x=>x.aktif).length;
 if(aktif>=5)return toast('Maksimal 5 API Key Gemini aktif per sekolah',false);
 form('Tambah akun Gemini',[{k:'label',l:'Nama akun (contoh: Gemini Utama)'},{k:'api_key',l:'API Key Gemini',t:'password'}],async v=>{
  const label=String(v.label||'').trim(),api_key=String(v.api_key||'').trim();
  if(!label)throw new Error('Nama akun wajib diisi');
  if(!api_key)throw new Error('Masukkan API Key Gemini');
  await apiPengaturan({aksi:'gemini_key_tambah',label,api_key});
  await segarCfg();toast('Akun Gemini berhasil ditambahkan');
 });
}
async function hapusGeminiKey(id){
 if(!await konfirmasi('Hapus akun API Key Gemini ini? Layanan AI akan memakai akun aktif lainnya.',{judul:'Hapus akun Gemini',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{await apiPengaturan({aksi:'gemini_key_hapus',id});await segarCfg();toast('Akun Gemini dihapus')});
}
function panelKonfigurasi(){return `<div class="panel" id="pnKonfig"><div class="ph">⚙ Konfigurasi</div><div class="pb">${cfgIsi()}</div></div>`}
function sambungkanKelas(grupId){const R=RHS||{},ks=R.kelas||[],map=R.pemetaan||[],g=(R.grup||[]).find(x=>Number(x.id)===Number(grupId));if(!g||!ks.length)return toast('Data grup atau kelas belum tersedia',false);const terpilih=map.filter(x=>Number(x.grup_wa_id)===Number(grupId));const ids=new Set(terpilih.map(x=>Number(x.kelas_id)));const daftar=ks.map(k=>`<label class="cbl" style="display:flex;align-items:center;gap:10px;padding:10px 8px;border-bottom:1px solid var(--bd)"><input type="checkbox" class="cbKelasGrup" value="${k.id}" ${ids.has(Number(k.id))?'checked':''}><span>${esc(k.nama)}</span></label>`).join('');info('Sambungkan Kelas · '+(g.label||'Grup WhatsApp'),`<div class="note">Centang semua kelas yang akan mengirim pemberitahuan libur ke grup ini.</div><div style="max-height:55vh;overflow:auto;margin:10px 0">${daftar}</div><div class="tb" style="justify-content:flex-end"><button class="btn soft" onclick="closeM()">Batal</button><button class="btn success" onclick="simpanSambunganKelas(${g.id})">Simpan Hubungan</button></div>`)}
async function simpanSambunganKelas(grupId){const R=RHS||{},map=R.pemetaan||[],checks=[...document.querySelectorAll('.cbKelasGrup:checked')],pilihan=new Set(checks.map(x=>Number(x.value))),lama=map.filter(x=>Number(x.grup_wa_id)===Number(grupId));guard(async()=>{for(const x of lama){if(!pilihan.has(Number(x.kelas_id)))await apiPengaturan({aksi:'pemetaan_hapus',id:x.id})}const sudah=new Set(lama.map(x=>Number(x.kelas_id)));for(const id of pilihan){if(!sudah.has(id))await apiPengaturan({aksi:'pemetaan_tambah',kelas_id:id,grup_wa_id:grupId})}closeM();await segarCfg();toast('Hubungan kelas untuk grup berhasil disimpan')})}
async function hapusPemetaan(id){if(!await konfirmasi('Hapus hubungan kelas dan grup ini?',{judul:'Hapus pemetaan',ya:'Hapus',bahaya:1}))return;guard(async()=>{await apiPengaturan({aksi:'pemetaan_hapus',id});await segarCfg();toast('Hubungan kelas dan grup dihapus')})}
async function segarCfg(){await muatRahasia();if(CFG_SID)setTimeout(tampilCfgModal,250);else renderV()}
function tampilCfgModal(){const sk=(S.devSek||[]).find(x=>x.id===CFG_SID)||{};info('Konfigurasi - '+(sk.nama||''),cfgIsi()+`<div class="tb" style="margin-top:14px;flex-wrap:wrap"><button class="btn soft" onclick="closeM();setTimeout(()=>mintaWebhook(false,${CFG_SID}),150)">🔓 Alamat Webhook</button><button class="btn danger" onclick="closeM();setTimeout(()=>mintaWebhook(true,${CFG_SID}),150)">♻ Buat ulang kunci</button></div>`)}
function konfigSekolah(sid){CFG_SID=sid;RHS=null;tampilCfgModal();muatRahasia().then(()=>{if(CFG_SID===sid)tampilCfgModal()})}
function tambahToken(){form('Tambah token Fonnte',[{k:'label',l:'Nama (contoh Kelas A)'},{k:'token',l:'Token Fonnte',t:'password'},{k:'perangkat',l:'Nomor WhatsApp perangkat (opsional, contoh 08123456789)'}],async v=>{
  if(!v.token)throw new Error('Isi token Fonnte');await apiPengaturan({aksi:'token_tambah',label:v.label,token:v.token,perangkat:v.perangkat});await segarCfg();toast('Token ditambahkan. Tekan Tes untuk memastikan token benar')})}
async function hapusToken(id){const t=((RHS||{}).tokens||[]).find(x=>x.id===id);if(!await konfirmasi('Hapus token '+(t?t.label:'ini')+'? Grup yang memakainya akan memakai token utama.',{judul:'Hapus token',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{await apiPengaturan({aksi:'token_hapus',id});await segarCfg();toast('Token dihapus')})}
function tambahGrup(){const tks=(RHS||{}).tokens||[];if(!tks.length)return toast('Tambahkan token Fonnte dulu',false);
 const op=['Token utama (otomatis)',...tks.map(t=>t.label+' (#'+t.id+')')];
 form('Tambah ID Group',[{k:'gid',l:'ID grup WhatsApp (contoh 120363410620341838@g.us)'},{k:'label',l:'Nama grup (contoh Kelas A)'},{k:'tk',l:'Akun Fonnte pemilik grup',o:op}],async v=>{
  const m=/\(#(\d+)\)$/.exec(v.tk||'');await apiPengaturan({aksi:'grup_tambah',grup_id:v.gid,label:v.label,token_id:m?Number(m[1]):null});await segarCfg();toast('ID grup ditambahkan')})}
async function hapusGrup(id){if(!await konfirmasi('Hapus ID grup ini? Pesan dari grup tersebut tidak lagi diproses.',{judul:'Hapus ID grup',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{await apiPengaturan({aksi:'grup_hapus',id});await segarCfg();toast('ID grup dihapus')})}
function tesToken(id){if(!penerimaTesId)return toast('Pilih nomor tujuan tes WhatsApp terlebih dahulu',false);guard(async()=>{const j=await apiPengaturan({aksi:'tes_fonnte',id,penerima_id:penerimaTesId});toast(j.pesan||'Pesan tes terkirim')})}
function tesAI(btn){if(!penerimaTesId)return toast('Pilih nomor tujuan tes WhatsApp terlebih dahulu',false);guard(async()=>{const j=await apiPengaturan({aksi:'tes_ai',penerima_id:penerimaTesId});toast(j.pesan||'API AI berfungsi')})}
function webhookBantuan(baru,sid){(baru?konfirmasi('Kunci lama langsung berhenti berlaku. Alamat baru harus dipasang ulang di Fonnte. Lanjutkan?',{judul:'Buat ulang kunci',ya:'Buat ulang',bahaya:1}):Promise.resolve(true)).then(ok=>{if(!ok)return;
 guard(async()=>{const j=await apiPengaturan({aksi:baru?'buat_ulang_webhook':'webhook',...(sid?{sekolah_id:sid}:{})});setTimeout(()=>tampilWebhook(j.url,baru),200)})})}
function mintaWebhook(baru,sid){if(MB())return webhookBantuan(baru,sid);form(baru?'Buat ulang kunci Webhook':'Tampilkan alamat Webhook',[{k:'sandi',l:'Kata sandi akun Anda',t:'password',pkb:1}],async v=>{
 if(!v.sandi&&!pkBuktiFresh())throw new Error('Isi kata sandi akun Anda atau verifikasi dengan passkey');
 if(baru&&!await konfirmasi('Kunci lama langsung berhenti berlaku. Alamat baru harus dipasang ulang di Fonnte. Lanjutkan?',{judul:'Buat ulang kunci',ya:'Buat ulang',bahaya:1}))return;
 const j=await apiPengaturan({aksi:baru?'buat_ulang_webhook':'webhook',...bodyBukti(v.sandi),...(sid?{sekolah_id:sid}:{})});setTimeout(()=>tampilWebhook(j.url,baru),200)})}
function tampilWebhook(url,baru){info('Alamat Webhook sekolah Anda','<div class="note">'+(baru?'Kunci baru sudah aktif. Pasang ulang alamat ini di Fonnte.':'Salin alamat ini lalu tempel di pengaturan Webhook Fonnte.')+'</div><input class="input" id="whUrl" readonly value="'+esc(url)+'" onclick="this.select()"><div class="tb" style="margin-top:10px"><button class="btn success" onclick="salinTeks($(\'#whUrl\').value)">📋 Salin</button></div><div class="note" style="margin-top:14px">Alamat khusus kabar <b>status pengiriman</b> (opsional): tempel di kolom webhook status Fonnte bila ada kolom terpisah. Bila hanya ada satu kolom webhook, cukup pakai alamat di atas: kabar status dialihkan otomatis.</div><input class="input" id="whUrl2" readonly value="'+esc(String(url).replace('/api/webhook','/api/status-kirim'))+'" onclick="this.select()"><div class="tb" style="margin-top:10px"><button class="btn soft" onclick="salinTeks($(\'#whUrl2\').value)">📋 Salin alamat status</button></div>')}
async function salinTeks(t){try{await navigator.clipboard.writeText(t);toast('Tersalin')}catch(e){const i=$('#whUrl');if(i){i.select();try{document.execCommand('copy');toast('Tersalin')}catch(_){toast('Gagal menyalin, salin manual',false)}}}}
function woptGuru(sel){return '<option value="">- Belum ada -</option>'+S.guru.filter(g=>g.aktif||g.id===sel).map(g=>`<option value="${g.id}" ${g.id===sel?'selected':''}>${esc(g.nama)}</option>`).join('')}
function setWaliKelas(id,v){guard(async()=>{await dbq(db.from('kelas').update({wali_profil_id:v||null}).eq('id',id));const k=S.kelas.find(x=>x.id===id);if(k)k.wali=v||null;toast(v?'Wali kelas disimpan':'Wali kelas dikosongkan')})}
function skalaLogo(src,w,h){let cur=src,cw=src.width,ch=src.height;
 while(cw/2>=w&&ch/2>=h){const n=document.createElement('canvas');n.width=cw=Math.floor(cw/2);n.height=ch=Math.floor(ch/2);const x=n.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,0,0,cw,ch);cur=n}
 const o=document.createElement('canvas');o.width=w;o.height=h;const x=o.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='high';x.drawImage(cur,0,0,w,h);return o}
function logoKecil(file){return new Promise((ok,gagal)=>{const u=URL.createObjectURL(file),im=new Image();
 im.onerror=()=>{URL.revokeObjectURL(u);gagal(new Error('File bukan gambar yang valid'))};
 im.onload=()=>{URL.revokeObjectURL(u);try{for(const sz of (im.width/im.height>1.3?[576,480,384,320,256,200]:[384,320,256,200])){const r=Math.min(1,sz/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*r)),h=Math.max(1,Math.round(im.height*r));
  const cv=skalaLogo(im,w,h);
  for(const f of ['image/png','image/webp']){const d=cv.toDataURL(f,.95);if(d.startsWith('data:'+f)&&d.length<=148000)return ok(d)}}
  gagal(new Error('Logo terlalu besar setelah diperkecil (maksimal sekitar 110 KB). Gunakan gambar yang lebih sederhana'))}catch(e){gagal(e)}}
 im.src=u})}
async function simpanLogo(v){const r=await dbq(db.from('pengaturan').update({logo:v}).select('id'));if(!r||!r.length)throw new Error('Pengaturan sekolah tidak ditemukan atau Anda tidak berhak mengubahnya');
 S.set.logo=v;try{kartuCacheBersih()}catch(e){}try{await Kartu.siapkanLogo(v)}catch(e){}terapLogo();renderV()}
async function pilihLogo(inp){const f=inp.files&&inp.files[0];inp.value='';if(!f)return;if(MB&&MB())return toast('Tidak tersedia di mode bantuan',false);
 if(f.size>2*1024*1024)return toast('Ukuran file maksimum 2 MB. File Anda '+(f.size/1048576).toFixed(1)+' MB',false);
 let v;try{ld(1,'Memproses gambar...');v=await logoKecil(f)}catch(e){return toast((e&&e.message)||String(e),false)}finally{ld(0)}
 if(!await konfirmasi('Logo ini akan disimpan sebagai logo sekolah dan tampil di menu samping, dashboard, dan kartu pelajar.',{ikon:'🖼️',judul:'Simpan logo ini?',ya:'Simpan',gambar:v}))return;
 guard(async()=>{try{await simpanLogo(v)}catch(e){if(/logo/i.test(String(e&&e.message))&&/column|kolom|schema/i.test(String(e.message)))throw new Error('Kolom logo belum ada di database. Jalankan di Supabase SQL Editor: ALTER TABLE pengaturan ADD COLUMN logo text;');throw e}toast('Logo sekolah disimpan')})}
async function hapusLogo(){if(MB&&MB())return toast('Tidak tersedia di mode bantuan',false);
 if(!await konfirmasi('Hapus logo sekolah?\n\nLogo di menu samping, dashboard, dan kartu pelajar akan kembali ke tampilan bawaan.',{bahaya:true,judul:'Hapus logo',ya:'Hapus'}))return;
 guard(async()=>{await simpanLogo(null);toast('Logo sekolah dihapus')})}

const stempelOk=v=>typeof v==='string'&&v.length<=150000&&/^data:image\/(png|webp|jpeg);base64,/.test(v);
const stempelHtml=()=>stempelOk(S.set&&S.set.stempel)?'<img alt="Stempel sekolah" src="'+esc(S.set.stempel)+'">':'🔴';
async function simpanStempel(v){const r=await dbq(db.from('pengaturan').update({stempel:v}).select('id'));if(!r||!r.length)throw new Error('Pengaturan sekolah tidak ditemukan atau Anda tidak berhak mengubahnya');S.set.stempel=v;renderV()}
function stempelKecil(file){return new Promise((ok,gagal)=>{const u=URL.createObjectURL(file),im=new Image();im.onerror=()=>{URL.revokeObjectURL(u);gagal(new Error('File bukan gambar yang valid'))};im.onload=()=>{URL.revokeObjectURL(u);try{let hasil='';for(const sz of [512,448,384,320,256,200]){const r=Math.min(1,sz/Math.max(im.width,im.height)),w=Math.max(1,Math.round(im.width*r)),h=Math.max(1,Math.round(im.height*r)),cv=skalaLogo(im,w,h);for(const f of ['image/png','image/webp']){const d=cv.toDataURL(f,.94);if(d.startsWith('data:'+f)&&d.length<=148000){hasil=d;break}}if(hasil)break}if(hasil)ok(hasil);else gagal(new Error('Stempel terlalu besar setelah diperkecil. Gunakan gambar yang lebih sederhana'))}catch(e){gagal(e)}};im.src=u})}
async function pilihStempel(inp){const f=inp.files&&inp.files[0];inp.value='';if(!f)return;if(MB&&MB())return toast('Tidak tersedia di mode bantuan',false);if(f.size>2*1024*1024)return toast('Ukuran file maksimum 2 MB',false);let v;try{ld(1,'Memproses stempel...');v=await stempelKecil(f)}catch(e){return toast(e.message||String(e),false)}finally{ld(0)}if(!await konfirmasi('Gunakan gambar ini sebagai stempel sekolah pada raport?',{ikon:'🔴',judul:'Simpan stempel?',ya:'Simpan',gambar:v}))return;guard(async()=>{await simpanStempel(v);toast('Stempel sekolah disimpan')})}
async function hapusStempel(){if(MB&&MB())return toast('Tidak tersedia di mode bantuan',false);if(!await konfirmasi('Hapus stempel sekolah dari raport?',{bahaya:true,judul:'Hapus stempel',ya:'Hapus'}))return;guard(async()=>{await simpanStempel(null);toast('Stempel sekolah dihapus')})}
function simpanAlamat(btn){const al=$('#alInp').value.trim(),kt=$('#ktInp').value.trim();if(btn)btn.disabled=true;
 return guard(async()=>{try{const r=await dbq(db.from('pengaturan').update({alamat:al||null,kota:kt||null}).select('id'));if(!r||!r.length)throw new Error('Pengaturan sekolah tidak ditemukan');S.set.alamat=al;S.set.kota=kt;toast('Alamat sekolah disimpan');renderV();return true}finally{if(btn)btn.disabled=false}})}
async function simpanNamaSekolah(btn){const v=String($('#nsInp').value||'').replace(/\s+/g,' ').trim();
 if(!v)return toast('Nama sekolah wajib diisi',false);if(v===ns())return toast('Nama sekolah belum berubah',false);
 if(btn)btn.disabled=true;ld(1,'Menyimpan nama sekolah...');
 try{if(SEK!=null){let ok=false;
  try{const x=await dbq(db.from('sekolah').update({nama:v}).eq('id',SEK).select('id'));ok=!!(x&&x.length)}catch(e){}
  if(!ok){try{await dbq(db.rpc('ubah_nama_sekolah',{p_sekolah:String(SEK),p_nama:v}));ok=true}catch(e){}}
  if(!ok)throw new Error('Nama di tabel sekolah tidak bisa diubah. Jalankan file langkah9-nama-sekolah.sql di Supabase SQL Editor, lalu coba lagi')}
 const r=await dbq(db.from('pengaturan').update({nama_sekolah:v}).select('id'));if(!r||!r.length)throw new Error('Nama sekolah tidak tersimpan. Pastikan baris pengaturan (id 1) ada dan Anda berhak mengubahnya');
  S.set.nama_sekolah=v;try{localStorage.setItem('nama_sekolah',v);sessionStorage.setItem('bukaView','pengaturan')}catch(e){}
  ld(0);const o=document.createElement('div');o.className='nsfx';o.innerHTML='<div class="nsb"><div class="nsi">🏫</div><div class="nsc">✓</div><b></b><small>Nama sekolah disimpan. Memuat ulang...</small></div>';o.querySelector('b').textContent=v;document.body.appendChild(o);
  try{const _i=document.getElementById('nsInp');if(_i)_i.defaultValue=v}catch(_e){}setTimeout(()=>location.reload(),1700);return true}
 catch(e){ld(0);if(btn)btn.disabled=false;const m=(e&&e.message)||String(e);toast(/nama_sekolah/.test(m)&&!/tidak tersimpan/.test(m)?'Kolom nama_sekolah belum ada di tabel pengaturan. Jalankan SQL penambahan kolom di Supabase terlebih dahulu':m,false)}}
