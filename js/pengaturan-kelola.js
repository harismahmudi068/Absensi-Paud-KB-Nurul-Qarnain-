/* ---------- pengaturan ---------- */
function panelKelasHtml(){
 if(!adalahKepala()){
  const wn=id=>{const g=S.guru.find(x=>x.id===id);return g?g.nama:'-'};
  return `<div class="panel" id="pnKelas"><div class="ph">🏫 Kelas dan Jam Masuk</div><div class="pb"><div class="note">Batas jam masuk menentukan status Terlambat saat scan. Urutan kelas menentukan arah naik kelas. Data ini hanya dapat diubah oleh Kepala Sekolah, Wakil Kepala Sekolah, Pengelola/Pengasuh, atau Operator.</div><div class="cls">${S.kelas.map(k=>`<div class="ci"><b>Kelas ${esc(k.nama)}</b><span>Batas masuk <b>${esc(k.jam)}</b></span><span>Wali kelas <b>${esc(wn(k.wali))}</b></span><span>Urutan <b>${k.urutan==null?'-':k.urutan}</b></span>${k.akhir?'<span><b>✓ Kelas akhir (kelulusan)</b></span>':''}</div>`).join('')||'<div class="mu">Belum ada kelas.</div>'}</div></div></div>`}
 return `<div class="panel" id="pnKelas"><div class="ph">🏫 Kelas dan Jam Masuk <button id="btnTambahKelas" class="btn success" onclick="addKelas()">+ Tambah Kelas</button></div><div class="pb"><div class="note">Batas jam masuk menentukan status Terlambat saat scan. Urutan kelas (1, 2, 3, ...) menentukan arah naik kelas: siswa hanya boleh naik ke kelas dengan urutan lebih tinggi. Centang Kelas akhir pada kelas yang menjadi kelas kelulusan. Batas masuk, wali kelas, urutan kelas, dan Kelas akhir tersimpan otomatis begitu diubah.</div><div class="cls">${S.kelas.map(k=>`<div class="ci"><b>Kelas ${esc(k.nama)}</b><span>Batas masuk ${dt('time',k.jam,"setJam("+k.id+",this.value)")}</span><span>Wali kelas <select class="select" onchange="setWaliKelas(${k.id},this.value)">${woptGuru(k.wali)}</select></span><span>Urutan <select class="select urutan-sel" data-urutan="1" onchange="setUrutan(${k.id},this.value)">${urutanOpt(k.urutan)}</select></span><span><label class="cbl"><input type="checkbox" ${k.akhir?'checked':''} onchange="setKelasAkhir(${k.id},this.checked)"> Kelas akhir (kelulusan)</label></span><div class="ci-act"><button class="btn sm soft" onclick="ubahKelas(${k.id})">Ubah nama kelas</button><button class="btn sm danger" onclick="delKelas(${k.id})">Hapus</button></div></div>`).join('')}</div></div></div>`}
V.kelasjam=()=>panelKelasHtml();
/* kartu Tahun Ajaran dipakai bersama oleh menu Tahun Ajaran Baru dan Pengaturan */
const panelTahunAjaranHtml=()=>`<div class="panel" id="pnTahunAjaran"><div class="ph">🎓 Tahun Ajaran <span class="mu">Sekarang: ${esc(S.set.tahun_ajaran||'-')}</span></div><div class="pb"><div class="note">Tahun ajaran baru hanya bisa dimulai setelah keputusan akhir tahun (naik kelas, tinggal kelas, lulus) disahkan di menu Kelola Siswa. Siswa naik dan tinggal kelas tetap tersimpan; siswa lulus, siswa nonaktif, dan wali yang tidak lagi punya anak di sekolah akan dihapus. Seluruh absensi lama, laporan orang tua, dan pesan WhatsApp juga dihapus. Data guru dan kelas tetap ada. Unduh rekap total tahun ajaran di bawah ini sebelum menghapus. Bila masih ada saldo Tabungan Siswa, Anda memilih apakah saldo siswa yang naik atau tinggal kelas dibawa (riwayat diringkas jadi satu saldo awal) atau seluruh tabungan ditutup. Saldo dan riwayat siswa lulus dan nonaktif selalu dihapus. PDF rekap tabungan per kelas wajib diunduh di halaman konfirmasi.</div>
<div class="tb"><span class="mu">Dari</span>${dt('month',taA,"taA=this.value")}<span class="mu">Sampai</span>${dt('month',taB,"taB=this.value")}<select class="select" onchange="taK=this.value">${kopt(taK,1)}</select></div>
<div class="tb dlgrid"><button class="btn success sm dl" onclick="unduhTA('pdf',this)">⬇ Rekap TA (PDF)</button><button class="btn sm dl pdf" onclick="unduhTA('xlsx',this)">⬇ Rekap TA (XLSX)</button><button class="btn success sm dl" onclick="unduhSiswa('pdf',this,taK||'*')">⬇ Data Siswa (PDF)</button><button class="btn sm dl pdf" onclick="unduhSiswa('xlsx',this,taK||'*')">⬇ Data Siswa (XLSX)</button></div>
<div class="note">Pilih kelas tertentu atau semua kelas. Setiap bulan tampil di halaman (PDF) atau sheet (XLSX) tersendiri, lengkap dengan tanda tangan Kepala Sekolah.</div>
<button id="btnTahunBaru" class="btn danger" onclick="tahunBaru()">Mulai tahun ajaran baru</button></div></div>`;
V.tahunajaran=()=>`${taInit()}${panelTahunAjaranHtml()}`;
V.pengaturan=()=>`${taInit()}${panelTahunAjaranHtml()}
<div class="panel" id="pnNama"><div class="ph">🏫 Nama Sekolah</div><div class="pb"><div class="note">Nama ini tampil di menu samping, dashboard, kartu pelajar, riwayat/rekap absensi (PDF dan XLSX), serta pesan laporan orang tua. Setelah disimpan, halaman dimuat ulang otomatis.</div><div class="tb"><input id="nsInp" class="input grow" maxlength="80" value="${esc(ns())}" placeholder="Nama sekolah" onkeydown="if(event.key==='Enter')simpanNamaSekolah($('#nsBtn'))"><button id="nsBtn" class="btn success" onclick="simpanNamaSekolah(this)">💾 Simpan</button></div></div></div>
<div class="panel" id="pnLogo"><div class="ph">🖼️ Logo Sekolah</div><div class="pb"><div class="note">Logo tampil di menu samping, dashboard, dan kartu pelajar. Gunakan gambar persegi atau bulat (PNG transparan paling bagus). Ukuran file maksimum <b>2 MB</b> (PNG, JPG, atau WebP). Gambar otomatis diperkecil saat disimpan.</div><div class="tb" style="align-items:center;gap:14px"><div class="lgprev">${logoHtml()}</div><div style="display:flex;flex-direction:column;gap:8px"><input id="lgFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="pilihLogo(this)"><button class="btn success" onclick="$('#lgFile').click()">⬆ ${logoOk(S.set.logo)?'Ganti logo':'Unggah logo'}</button>${logoOk(S.set.logo)?'<button class="btn danger" onclick="hapusLogo()">🗑 Hapus logo</button>':''}</div></div></div></div>
<div class="panel" id="pnStempel"><div class="ph">🔴 Stempel Sekolah</div><div class="pb"><div class="note">Stempel digunakan pada area tanda tangan raport, di atas nama penandatangan. Gunakan gambar dengan latar transparan (PNG disarankan). Ukuran file maksimum <b>2 MB</b>.</div><div class="tb" style="align-items:center;gap:14px"><div class="lgprev">${stempelHtml()}</div><div style="display:flex;flex-direction:column;gap:8px"><input id="stFile" type="file" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="pilihStempel(this)"><button class="btn success" onclick="$('#stFile').click()">⬆ ${stempelOk(S.set.stempel)?'Ganti stempel':'Unggah stempel'}</button>${stempelOk(S.set.stempel)?'<button class="btn danger" onclick="hapusStempel()">🗑 Hapus stempel</button>':''}</div></div></div></div>
<div class="panel" id="pnFotoOrtu"><div class="ph">📷 Foto Siswa</div><div class="pb"><div class="note">Bila diaktifkan, orang tua dapat mengunggah atau mengganti foto anak sendiri lewat Halaman Siswa (tombol Upload/Ubah foto). Foto yang tidak sesuai dapat dihapus kapan saja lewat Data Siswa, Ubah Siswa, Hapus foto. Bila dimatikan, hanya sekolah yang dapat mengubah foto.</div>
<div class="tb cbrow"><label class="cbl"><input id="cbFotoOrtu" type="checkbox" ${S.set.izin_foto_ortu!==false?'checked':''} onchange="setIzinFoto(this.checked)"> Izinkan orang tua mengubah foto anak</label></div></div></div>
<div class="panel" id="pnAlamat"><div class="ph">📍 Alamat Sekolah</div><div class="pb"><div class="note">Kota dipakai pada tanda tangan Kepala Sekolah di rekap (contoh: Jember, Minggu 4 Oktober 2026).</div><div class="fg"><div class="fd"><label class="l">Alamat sekolah</label><input id="alInp" class="input" maxlength="150" value="${esc(S.set.alamat||'')}" placeholder="Jl. Contoh, RT/RW 00/01, Desa Contoh"></div><div class="fd"><label class="l">Kota / kabupaten (untuk tanda tangan rekap)</label><input id="ktInp" class="input" maxlength="60" value="${esc(S.set.kota||'')}" placeholder="contoh Jember"></div></div><button class="btn success" style="margin-top:14px" onclick="simpanAlamat(this)">💾 Simpan alamat</button></div></div>
${panelKelasHtml()}
<div class="panel" id="pnAlpa"><div class="ph">⏰ Alpa Otomatis</div><div class="pb"><div class="note">Anak yang belum tercatat sampai jam ini otomatis berstatus Alpa (tidak berlaku di hari libur). Server menjalankannya tepat pada jam yang diatur. Bila orang tua mengabari izin sesudahnya, statusnya diubah. Notifikasi alpa dikirim lewat WhatsApp ke Kepala Sekolah (daftar alpa semua kelas) dan ke setiap wali kelas (daftar alpa kelasnya saja). Wakil Kepala Sekolah dan guru lain yang bukan wali kelas tidak menerima. Wali kelas hanya menerima bila sudah dipilih di Kelas dan Jam Masuk serta memiliki nomor WhatsApp yang valid di profilnya. Orang tua tidak menerima notifikasi ini.</div>
<div class="tb cbrow"><label class="cbl"><input id="cbAlpa" type="checkbox" ${S.set.alpa_aktif?'checked':''} onchange="setAlpa({alpa_aktif:this.checked})"> Aktifkan alpa otomatis</label>${dt('time',S.set.jam,"setAlpa({alpa_jam:this.value})")}</div></div></div>
<div class="panel" id="pnNotifLibur"><div class="ph">🔔 Notifikasi Libur</div><div class="pb"><div class="note">Notifikasi libur dikirim lewat WhatsApp ke Kepala Sekolah dan ke semua anggota aktif sekolah (wakil, operator, dan guru) yang memiliki nomor WhatsApp valid di profilnya, bila hari ini ada libur nasional atau libur tanggal yang meliburkan kelas atau sekolah. Anggota yang nomornya kosong atau tidak valid dilewati, dan orang tua tidak menerima notifikasi ini. Libur mingguan hanya diberitahukan bila opsi di bawah dicentang, sesuai hari libur yang Anda atur di Jadwal Libur. Atur jam kirim setelah pukul 00.30 agar libur hari itu sudah tercatat. Bila jam baru hari ini sudah lewat, pesan dikirim mulai besok. Nomor WhatsApp Kepala Sekolah diambil dari Profil Saya, sedangkan token Fonnte diatur di Pengaturan > Koneksi. Nomor anggota lain diambil dari profil masing-masing.</div>
<div class="tb cbrow"><label class="cbl"><input id="cbNotifLibur" type="checkbox" ${S.set.notif_libur_aktif?'checked':''} onchange="setNotifLibur({notif_libur_aktif:this.checked})"> Aktifkan notifikasi libur</label>${dt('time',S.set.njam,"setNotifLibur({notif_libur_jam:this.value})")}</div><div class="tb cbrow"><label class="cbl"><input id="cbNotifMingguan" type="checkbox" ${S.set.notif_libur_mingguan?'checked':''} onchange="setNotifLibur({notif_libur_mingguan:this.checked})"> Beritahu juga libur mingguan</label></div></div></div>
<div class="panel" id="pnTabungan"><div class="ph">💰 Tabungan Siswa</div><div class="pb"><div class="note">Aktifkan bila sekolah mengelola tabungan siswa. Menu Tabungan tersedia untuk guru dan kepala sekolah. Transaksi setoran manual dapat diedit oleh guru yang mencatat transaksi tersebut selama maksimal 7 hari; Kepala Sekolah juga dapat mengubah transaksi setoran. Penarikan mengikuti aturan wali kelas. Pembatalan tetap tersedia untuk koreksi. Data tabungan tidak ikut pembersihan harian otomatis, hanya dibersihkan saat tahun ajaran baru dimulai.</div><div class="tb cbrow"><label class="cbl"><input id="cbTabungan" type="checkbox" ${S.set.tabungan_aktif?'checked':''} onchange="setTabungan(this.checked)"> Aktifkan tabungan siswa</label></div></div></div>
<div class="panel" id="pnPiket"><div class="ph">🧹 Jadwal Piket</div><div class="pb"><div class="note">Aktifkan bila sekolah memakai jadwal piket. Menu Jadwal Piket tersedia untuk guru dan kepala sekolah, dan semua guru boleh mengubah jenis serta jadwalnya. ${S.set.push_piket_diizinkan===false?'':'Pengingat ke orang tua memakai notifikasi push (tanpa kuota WhatsApp): pukul 18.00 WIB untuk piket besok dan pukul 05.00 WIB untuk piket hari ini, hanya untuk orang tua yang sudah mengaktifkan pengingat di Halaman Siswa. '}Hanya Kepala Sekolah dan Wakil yang dapat mengaktifkan atau menonaktifkan.</div><div class="tb cbrow"><label class="cbl"><input id="cbPiket" type="checkbox" ${S.set.piket_aktif?'checked':''} onchange="setPiket(this.checked)"> Aktifkan jadwal piket</label></div>${S.set.push_piket_diizinkan===false?'':`<div class="tb cbrow"><label class="cbl"><input id="cbNotifPiket" type="checkbox" ${S.set.notif_piket_aktif?'checked':''} ${S.set.piket_aktif?'':'disabled'} onchange="setNotifPiket(this.checked)"> Kirim pengingat piket ke orang tua (push)</label></div>`}</div></div>
${panelNotifOrtu()}
<div class="panel" id="pnHafalan"><div class="ph">📖 Hafalan</div><div class="pb"><div class="note">Aktifkan bila sekolah mencatat hafalan siswa. Menu Hafalan tersedia untuk guru dan kepala sekolah. Semua guru boleh menambah, mengubah, dan menghapus jenis, daftar hafalan, serta mencatat setoran (Lancar atau Mengulang). Hafalan wajib semua kelas berlaku untuk seluruh kelas, hafalan per kelas diisi per kelas. Catatan setoran dihapus saat tahun ajaran baru dimulai, sedangkan daftar hafalan tetap. Hanya Kepala Sekolah dan Wakil yang dapat mengaktifkan atau menonaktifkan.</div><div class="tb cbrow"><label class="cbl"><input id="cbHafalan" type="checkbox" ${S.set.hafalan_aktif?'checked':''} onchange="setHafalan(this.checked)"> Aktifkan hafalan</label></div></div></div>
${panelWebhook()}${panelKonfigurasi()}`;
function panelNotifOrtu(){
 const abs=S.set.push_absensi_diizinkan!==false,tab=S.set.push_tabungan_diizinkan!==false,haf=S.set.push_hafalan_diizinkan!==false;
 if(!abs&&!tab&&!haf)return '';
 const jenis=[abs?'Absensi':'',tab?'Tabungan':'',haf?'Hafalan':''].filter(Boolean);const judul='Notifikasi '+jenis.join(', ');
 const catatan='Orang tua yang sudah mengaktifkan notifikasi di Halaman Siswa menerima pemberitahuan di HP mereka (tanpa kuota WhatsApp)'
  +(abs?' setelah absensi anak hari ini tercatat, baik dari scanner, input manual guru, laporan orang tua, maupun WhatsApp. Ada jeda sekitar 2 menit agar koreksi guru tidak terkirim sebagai status yang salah.':'.')
  +(tab?' Notifikasi tabungan menampilkan nominal transaksi dan saldo akhir, sehingga isinya dapat terbaca di layar kunci HP orang tua.':'')
  +(haf?' Notifikasi Hafalan dikirim setelah guru mencatat setoran hari ini, dengan hasil, materi, dan nama guru pencatat.':'')
  +' Setiap orang tua dapat memilih sendiri jenis notifikasi yang ingin diterima.';
 return `<div class="panel" id="pnNotifOrtu"><div class="ph">📲 ${judul}</div><div class="pb"><div class="note">${catatan}</div>`
  +(abs?`<div class="tb cbrow"><label class="cbl"><input id="cbNotifAbsensi" type="checkbox" ${S.set.notif_absensi_aktif?'checked':''} onchange="setNotifAbsensi(this.checked)"> Kirim notifikasi absensi ke orang tua (push)</label></div>`:'')
  +(tab?`<div class="tb cbrow"><label class="cbl"><input id="cbNotifTabungan" type="checkbox" ${S.set.notif_tabungan_aktif?'checked':''} ${S.set.tabungan_aktif?'':'disabled'} onchange="setNotifTabungan(this.checked)"> Kirim notifikasi tabungan ke orang tua (push, dengan nominal dan saldo)</label></div>`:'')
  +(haf?`<div class="tb cbrow"><label class="cbl"><input id="cbNotifHafalan" type="checkbox" ${S.set.notif_hafalan_aktif?'checked':''} ${S.set.hafalan_aktif?'':'disabled'} onchange="setNotifHafalan(this.checked)"> Kirim notifikasi Hafalan ke orang tua (push)</label></div>`:'')
  +`</div></div>`}
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
const setIzinFoto=v=>guard(async()=>{try{await dbq(db.from('pengaturan').update({izin_foto_ortu:!!v}))}catch(e){if(/izin_foto_ortu/i.test(String((e&&e.message)||e)))throw new Error('Kolom izin_foto_ortu belum ada. Jalankan SQL Tahap 3 di Supabase.');throw e}await muatDasar();toast(v?'Orang tua boleh mengubah foto anak':'Orang tua tidak dapat mengubah foto anak');renderV()});
const setAlpa=o=>guard(async()=>{await dbq(db.from('pengaturan').update(o));await muatDasar();toast('Pengaturan disimpan');renderV()});
const setNotifLibur=o=>guard(async()=>{if(o.notif_libur_jam&&o.notif_libur_jam<'00:30')throw new Error('Jam notifikasi libur minimal 00.30');await dbq(db.from('pengaturan').update(o));await muatDasar();toast('Pengaturan disimpan');renderV()});
const rp=n=>'Rp '+(Number(n)||0).toLocaleString('id-ID');
const setTabungan=on=>guard(async()=>{await dbq(db.from('pengaturan').update({tabungan_aktif:!!on}));await muatDasar();S.tab=null;toast(on?'Tabungan siswa diaktifkan. Menu Tabungan sekarang tersedia':'Tabungan siswa dinonaktifkan. Data tetap tersimpan');renderAll()});
let TB={rg:null,mode:null,pdf:false,rows:[]};
const tbLanjut=x=>x.status!=='Lulus'&&x.status!=='Nonaktif';
const tbPerlakuan=x=>!tbLanjut(x)?'Dihapus':TB.mode==='bawa'?'Dibawa':TB.mode==='tutup'?'Dihapus':'-';
function tbGrup(){const m=new Map();TB.rows.forEach(x=>{const k=x.kelas||'-';if(!m.has(k))m.set(k,[]);m.get(k).push(x)});
 const ord=n=>{const i=S.kelas.findIndex(c=>c.nama===n);return i<0?999:i};
 return [...m.entries()].sort((p,q)=>ord(p[0])-ord(q[0])||String(p[0]).localeCompare(String(q[0]),'id'))}
function tbTabelHtml(){const G=tbGrup();
 const jl=TB.rows.filter(x=>!tbLanjut(x)).reduce((a,x)=>a+Number(x.saldo),0),jn=TB.rows.filter(tbLanjut).reduce((a,x)=>a+Number(x.saldo),0);
 const nasib=TB.mode==='bawa'?'dibawa ke tahun ajaran baru':TB.mode==='tutup'?'dihapus (tutup buku)':'menunggu pilihan Anda';
 let h=`<div class="note"><b>Saldo siswa lulus dan nonaktif: ${rp(jl)}</b> (dihapus bersama riwayatnya)<br><b>Saldo siswa naik kelas dan tinggal kelas: ${rp(jn)}</b> (${nasib})<br><b>Total: ${rp(jl+jn)}</b> dari ${TB.rows.length} siswa</div>`;
 G.forEach(([k,list])=>{const w=ttdWali(k),tot=list.reduce((a,x)=>a+Number(x.saldo),0);
  const rows=list.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.nama)}</td><td>${esc(x.status)}</td><td style="text-align:right">${rp(x.saldo)}</td><td>${tbPerlakuan(x)}</td></tr>`).join('')+`<tr><td colspan="3"><b>Jumlah kelas ${esc(k)}</b></td><td style="text-align:right"><b>${rp(tot)}</b></td><td></td></tr>`;
  h+=`<div class="tbkh">Kelas ${esc(k)} <span class="mu">· Wali kelas: ${esc(w?w.nama:'-')} · ${list.length} siswa</span></div>`+tab(['No','Nama','Status','Saldo','Perlakuan'],rows)});
 return h}
function tbPilih(m){TB.mode=m;TB.pdf=false;TB.tabDownloaded=false;const e=$('#tbTabel');if(e)e.innerHTML=tbTabelHtml();tbCek()}
function tbCek(){const lb=($('#tbLabel')||{}).value||'',ok=($('#tbOk')||{}).value||'',s=[];
 if(TB.rows.length){s.push([!!TB.mode,'Pilih perlakuan saldo tabungan']);s.push([TB.tabDownloaded,'Unduh rekap tabungan per kelas (PDF atau XLSX)'])}else if(TB.tabCount>0)s.push([TB.tabDownloaded,'Unduh riwayat tabungan lengkap (PDF atau XLSX)']);if(TB.absCount>0)s.push([TB.absDownloaded,'Unduh seluruh riwayat absensi semua kelas (PDF atau XLSX)'])
 s.push([lb.trim().length>0,'Isi tahun ajaran baru']);s.push([ok.trim()==='MULAI','Ketik MULAI']);
 const e=$('#tbSyarat');if(e)e.innerHTML=s.map(x=>`<div style="color:${x[0]?'#159447':'var(--mu)'};font-weight:${x[0]?800:600}">${x[0]?'✓':'○'} ${x[1]}</div>`).join('');
 const b=$('#ms');if(b)b.disabled=!s.every(x=>x[0])}
async function tbUnduhPdf(btn){await muatLib('pdf');if(!TB.mode)return toast('Pilih dulu perlakuan saldo (bawa atau tutup buku)',false);
 if(!setUnduhBusy(btn,true,'Membuat PDF...'))return;
 try{await jedaUnduh();const G=tbGrup(),d=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  for(let gi=0;gi<G.length;gi++){const [k,list]=G[gi];if(gi)d.addPage();const wl=ttdWali(k),tot=list.reduce((a,x)=>a+Number(x.saldo),0);
   d.setFont('helvetica','bold');d.setFontSize(13);d.setTextColor(0,0,0);d.text('REKAP TABUNGAN AKHIR TAHUN AJARAN - '+ns().toUpperCase(),105,14,{align:'center'});
   d.setFont('helvetica','normal');d.setFontSize(8.5);d.text(d.splitTextToSize('Tahun ajaran '+(TB.rg.tahun_ajaran||'-')+'  |  Kelas '+k+'  |  Wali kelas: '+(wl?wl.nama:'-')+'  |  Saldo siswa naik/tinggal kelas: '+(TB.mode==='bawa'?'dibawa ke tahun ajaran baru':'dihapus (tutup buku)'),180),105,20,{align:'center'});
   const body=list.map((x,i)=>[i+1,x.nama,x.nisn||'-',x.status,Number(x.saldo).toLocaleString('id-ID'),tbPerlakuan(x)]).concat([['','JUMLAH','','',tot.toLocaleString('id-ID'),'']]);
   d.autoTable({startY:28,head:[['No','Nama','NISN','Status','Saldo (Rp)','Perlakuan']],body,columnStyles:{4:{halign:'right'}},theme:'grid',styles:{fontSize:8,cellPadding:1.6},headStyles:{fillColor:[118,80,184],halign:'center'}});
   let y=d.lastAutoTable.finalY+10;if(y+42>285){d.addPage();y=20}
   await pdfTtdRekap(d,k,y);
  }
  d.save('rekap-tabungan-akhir-tahun-'+ns().replace(/[^\\w]+/g,'-')+'-'+TODAY+'.pdf');TB.pdf=true;TB.tabDownloaded=true;tbCek();toast('PDF rekap tabungan per kelas sedang diproses, mohon ditunggu')}
 catch(e){toast('Gagal mengunduh: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
async function tbUnduhXlsx(btn){
 if(!TB.mode)return toast('Pilih dulu perlakuan saldo (bawa atau tutup buku)',false);
 await muatLib('exceljs');if(!setUnduhBusy(btn,true,'Membuat XLSX tabungan...'))return;
 try{await jedaUnduh();const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();const used=new Set(),G=tbGrup();
  for(const [k,list] of G){const ws=sheetTabungan(wb,namaSheetSiswa(k,used),list,k);await xlsxTtdRekap(wb,ws,k,ws.rowCount-5,1,3,4)}
  await tulisXlsx(wb,'rekap-tabungan-akhir-tahun-'+ns().replace(/[^\w]+/g,'-')+'-'+TODAY+'.xlsx');
  TB.tabDownloaded=true;tbCek();toast('XLSX rekap tabungan berhasil disiapkan')
 }catch(e){toast('Gagal membuat XLSX tabungan: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}
}
async function taUnduhAbsensi(jenis,btn){
 const berhasil=await unduhTA(jenis,btn,true);
 if(berhasil){TB.absDownloaded=true;tbCek()}
 return berhasil;
}
async function pdfTtdRekap(d,kls,y){
 const w=ttdWali(kls),tg=ttdKepsek(),sig=await ttdPngAmbil([w&&w.id,tg.id]).catch(()=>({})),st=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null);
 const pw=d.internal.pageSize.getWidth(),kanan=pw-46,yy=y+3;
 if(w)pdfTtd(d,46,yy,'Mengetahui,',' Wali kelas',w.kelas,w.nama,w.nip);
 pdfTtd(d,kanan,yy,tg.kota?tg.kota+',':'',(tg.kota?' ':'')+tg.tgl,'Kepala Sekolah',tg.nama,tg.nip);
 const add=(data,x,py,ww,hh)=>{if(!data)return;try{d.addImage(data,'PNG',x,py,ww,hh)}catch(e){}};
 if(tg.id&&sig[tg.id])add(sig[tg.id],kanan-16,yy+10,32,13);
 if(st&&st.url)add(st.url,kanan-49,yy+8,28,28);
 if(w&&w.id&&sig[w.id])add(sig[w.id],30,yy+10,32,13);
}
async function xlsxTtdRekap(wb,ws,kls,row,waliCol,kepStampCol,kepSigCol){
 const w=ttdWali(kls),tg=ttdKepsek(),sig=await ttdPngAmbil([w&&w.id,tg.id]).catch(()=>({})),st=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null);
 const img=async(url)=>{if(!url)return null;try{let data=String(url),m=data.match(/^data:image\/(png|jpeg);base64,/i);if(!m){const im=new Image();im.crossOrigin='anonymous';im.src=data;await new Promise((ok,no)=>{im.onload=ok;im.onerror=no});const cv=document.createElement('canvas');cv.width=im.naturalWidth;cv.height=im.naturalHeight;cv.getContext('2d').drawImage(im,0,0);data=cv.toDataURL('image/png');m=data.match(/^data:image\/(png|jpeg);base64,/i)}if(!m)return null;return wb.addImage({base64:data.slice(data.indexOf(',')+1),extension:m[1].toLowerCase()==='jpeg'?'jpeg':'png'})}catch(e){console.warn('Gambar tanda tangan/stempel XLSX gagal diproses:',e);return null}};
 const adaGambar=id=>id!==null&&id!==undefined;
 const [stamp,head,wali]=await Promise.all([img(S.set&&S.set.stempel),img(tg.id&&sig[tg.id]),img(w&&w.id&&sig[w.id])]);
 if(!adaGambar(wali)&&!adaGambar(stamp)&&!adaGambar(head))return;
 // Ambil dua area gabungan tanda tangan dari tabel yang sudah dibuat; teks dan posisi kolom tidak diubah.
 const merges=Object.values(ws._merges||{}).filter(m=>m&&Number.isFinite(m.top)&&Number.isFinite(m.left)&&Number.isFinite(m.bottom)&&Number.isFinite(m.right));
 const byRow=new Map();merges.forEach(m=>{if(m.top===m.bottom){if(!byRow.has(m.top))byRow.set(m.top,[]);byRow.get(m.top).push(m)}});
 const pairs=[...byRow.entries()].filter(([,v])=>v.length>=1).sort((a,b)=>b[0]-a[0]);
 const pair=pairs.find(([r,v])=>v.some(m=>tg.nama&&String(ws.getCell(r,m.left).value||'').includes(tg.nama))||v.some(m=>w&&w.nama&&String(ws.getCell(r,m.left).value||'').includes(w.nama)));
 if(!pair){
  // Sebagian ekspor XLSX tidak memakai sel gabungan untuk baris nama.
  // Jangan batalkan seluruh gambar hanya karena area gabungan tidak ditemukan.
  const fallback=(id,col,width,height)=>{if(!adaGambar(id)||!Number.isFinite(Number(col)))return;ws.addImage(id,{tl:{col:Math.max(0,Number(col)-1),row:Math.max(0,Number(row)+1)},ext:{width,height}})};
  const sigW=Math.round(32/25.4*96),sigH=Math.round(13/25.4*96),stampW=Math.round(28/25.4*96),stampH=stampW;
  fallback(stamp,kepStampCol,stampW,stampH);
  fallback(head,kepSigCol,sigW,sigH);
  fallback(wali,waliCol,sigW,sigH);
  return;
 }
 const nameRow=pair[0],areas=pair[1].sort((a,b)=>a.left-b.left),waliArea=areas.length>1?areas[0]:null,kepArea=areas[areas.length-1];
 const widths=ws.columns.map(c=>Math.max(1,(Number(c.width)||8.43)*7+5));
 const xAt=c=>widths.slice(0,Math.max(0,c-1)).reduce((a,v)=>a+v,0);
 const yAt=r=>{let v=0;for(let i=1;i<r;i++)v+=(ws.getRow(i).height||15)*96/72;return v};
 const rangeBox=(m)=>({x:xAt(m.left),width:xAt(m.right+1)-xAt(m.left)});
 const sigW=Math.round(32/25.4*96),sigH=Math.round(13/25.4*96),stampW=Math.round(28/25.4*96),stampH=stampW;
 const top=nameRow-3,bottom=nameRow-1,y=yAt(top),h=yAt(bottom+1)-y;
 const anchor=(box,width,height,ratio)=>{const x=box.x+box.width*ratio-width/2,yy=y+(h-height)/2;let col=1;while(col<widths.length&&x>=xAt(col+1))col++;let rr=1;while(rr<ws.rowCount+1&&yy>=yAt(rr+1))rr++;return{tl:{col:col-1+(x-xAt(col))/widths[col-1],row:rr-1+(yy-yAt(rr))/((ws.getRow(rr).height||15)*96/72)}}};
 const kp=rangeBox(kepArea);
 if(adaGambar(wali)&&waliArea)ws.addImage(wali,{...anchor(rangeBox(waliArea),sigW,sigH,.5),ext:{width:sigW,height:sigH}});
 // Stempel berada di bagian kiri area kepala sekolah, tanda tangan di bagian kanan.
 if(adaGambar(stamp))ws.addImage(stamp,{...anchor(kp,stampW,stampH,.38),ext:{width:stampW,height:stampH}});
 if(adaGambar(head))ws.addImage(head,{...anchor(kp,sigW,sigH,.78),ext:{width:sigW,height:sigH}});
}
async function tbUnduhRiwayat(jenis,btn){await muatLib(jenis==='pdf'?'pdf':'exceljs');if(!setUnduhBusy(btn,true,'Membuat riwayat tabungan...'))return;try{await jedaUnduh();const semua=[];for(let off=0;off<50000;off+=1000){const page=await dbq(db.from('tabungan_transaksi').select('*').eq('sekolah_id',SEK).order('id',{ascending:true}).range(off,off+999));semua.push(...(page||[]));if(!page||page.length<1000)break}if(!semua.length)throw new Error('Tidak ada riwayat tabungan untuk diunduh');const map=new Map();semua.forEach(x=>{const k=x.kelas_nama||'Tanpa kelas';if(!map.has(k))map.set(k,[]);map.get(k).push(x)});const G=[...map.entries()].sort((a,b)=>a[0].localeCompare(b[0],'id')),nf='riwayat-tabungan-seluruh-kelas-'+TODAY;if(jenis==='xlsx'){const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();const used=new Set();for(const [k,rows] of G){const ws=wb.addWorksheet(namaSheetSiswa(k,used));ws.columns=[{width:13},{width:30},{width:16},{width:22},{width:15},{width:17},{width:38},{width:24},{width:20}];ws.addRow(['RIWAYAT TABUNGAN - '+ns()]);ws.mergeCells(1,1,1,9);ws.getRow(1).font={bold:true,size:14};ws.addRow(['Kelas '+k+' | Seluruh riwayat tersimpan | Dicetak '+fmt(TODAY)]);ws.mergeCells(2,1,2,9);ws.addRow(['Tanggal','Nama','NISN','Kelas','Jenis','Jumlah (Rp)','Catatan','Dicatat oleh','Waktu catat']);ws.getRow(3).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6B46C1'}};c.alignment={horizontal:'center',vertical:'middle'}});rows.forEach(x=>ws.addRow([x.tanggal,x.nama_siswa,x.nisn||'',x.kelas_nama||'',tabJenis(x),(x.jenis==='setor'?1:-1)*Number(x.jumlah),x.catatan||'',x.nama_pencatat||'',new Date(x.dibuat).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})]));const row=ws.rowCount+2;await xlsxTtdRekap(wb,ws,k,row,1,7,8);ws.getCell(row+5,1).value='Wali Kelas: '+(ttdWali(k)?.nama||'-');ws.getCell(row+5,8).value='Kepala Sekolah: '+(ttdKepsek().nama||'-');if(ttdKepsek().nip)ws.getCell(row+6,8).value='NIP. '+ttdKepsek().nip}await tulisXlsx(wb,nf+'.xlsx')}else{const d=new window.jspdf.jsPDF({unit:'mm',format:'a4'});for(let i=0;i<G.length;i++){if(i)d.addPage();const [k,rows]=G[i];d.setFont('helvetica','bold');d.setFontSize(13);d.text('RIWAYAT TABUNGAN - '+ns().toUpperCase(),105,14,{align:'center'});d.setFont('helvetica','normal');d.setFontSize(8.5);d.text('Kelas '+k+' | Seluruh riwayat tersimpan | Dicetak '+fmt(TODAY),105,20,{align:'center'});d.autoTable({startY:27,head:[['Tanggal','Nama','NISN','Jenis','Jumlah (Rp)','Catatan','Dicatat oleh']],body:rows.map(x=>[fmt(x.tanggal),x.nama_siswa,x.nisn||'-',tabJenis(x),(x.jenis==='setor'?'+':'-')+rp(x.jumlah),x.catatan||'',x.nama_pencatat||'-']),theme:'grid',styles:{fontSize:7.5,cellPadding:1.5},headStyles:{fillColor:[107,70,193],halign:'center'}});let y=d.lastAutoTable.finalY+10;if(y+42>285){d.addPage();y=20}await pdfTtdRekap(d,k,y)}d.save(nf+'.pdf')}TB.tabDownloaded=true;tbCek();toast('Riwayat tabungan berhasil disiapkan ('+semua.length+' transaksi)')}catch(e){toast('Gagal mengunduh riwayat tabungan: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
async function tbMulai(){const lb=($('#tbLabel')||{}).value.trim(),ok=($('#tbOk')||{}).value.trim();
 if(!lb||ok!=='MULAI')return toast('Isi tahun ajaran dan ketik MULAI',false);
 if(TB.rows.length&&(!TB.mode||!TB.tabDownloaded))return toast('Pilih perlakuan saldo dan unduh rekap tabungan (PDF atau XLSX) dulu',false);if(!TB.rows.length&&TB.tabCount>0&&!TB.tabDownloaded)return toast('Unduh riwayat tabungan lengkap (PDF atau XLSX) terlebih dahulu',false);if(TB.absCount>0&&!TB.absDownloaded)return toast('Unduh seluruh riwayat absensi (PDF atau XLSX) terlebih dahulu',false);
 const rg=TB.rg,pt=TB.rows.length?TB.mode:null,b=$('#ms');b.disabled=true;
 try{ld(1);const fotoSebelum=S.siswa.map(x=>x.foto_path).filter(Boolean);await dbq(db.rpc('mulai_tahun_ajaran',{label:lb,p_sekolah:SEK,p_tabungan:pt}));closeM();
  S.absen={};S.tab=null;KL.data=null;AL.data=null;KL.sel.clear();await muatDasar();
  try{const pakai=new Set(S.siswa.map(x=>x.foto_path).filter(Boolean)),yatim=fotoSebelum.filter(p=>!pakai.has(p));if(yatim.length){await db.storage.from(FOTO_BUCKET).remove(yatim);yatim.forEach(p=>{FC.delete(p);FU.delete(p)});fotoCsHapus(yatim)}}catch(e){console.warn('Foto siswa lulus belum terhapus dari penyimpanan',e)}
  toast('Tahun ajaran baru dimulai. Keputusan diterapkan: '+rg.naik+' naik kelas, '+rg.tinggal+' tinggal kelas, '+(rg.lulus||0)+' lulus (masuk menu Alumni)'+(pt==='bawa'?'. Saldo tabungan siswa yang lanjut dibawa, tabungan siswa lulus dihapus':pt==='tutup'?'. Seluruh tabungan siswa dihapus (tutup buku)':''));await go('dashboard')}
 catch(e){toast((e&&e.message)||String(e),false);b.disabled=false;tbCek()}finally{ld(0)}}
async function tahunBaru(){
 let rg;try{ld(1);rg=await dbq(db.rpc('tahun_baru_ringkasan',{p_sekolah:SEK}))}catch(e){return toast((e&&e.message)||String(e),false)}finally{ld(0)}
 if(!rg.siap){const li=(rg.alasan||[]).map(a=>'<li>'+esc(a)+'</li>').join(''),mm=(rg.masalah||[]).slice(0,20).map(x=>`<tr><td>${esc(x.nama)}</td><td>${esc(x.kelas)}</td><td>${esc(x.masalah)}</td></tr>`).join('');
  info('Tahun ajaran baru belum bisa dimulai',`<div class="note" style="border:2px solid #d99a27;background:#fff8df"><b>Keputusan akhir tahun belum siap:</b><ul style="margin:6px 0 0 18px">${li}</ul></div>${mm?tab(['Siswa','Kelas','Masalah'],mm):''}<div class="tb"><button class="btn success" onclick="closeM();go('kelola')">Buka Kelola Siswa</button></div>`);return}
 if(!Array.isArray(rg.daftar_saldo)){info('Database perlu diperbarui','<div class="note" style="border:2px solid #d99a27;background:#fff8df">Fungsi database tahun ajaran baru belum diperbarui ke versi terbaru. Jalankan berkas SQL pembaruan di Supabase terlebih dahulu, lalu coba lagi.</div>');return}
 TB={rg,mode:null,pdf:false,tabDownloaded:false,tabCount:0,absDownloaded:false,absCount:0,rows:rg.daftar_saldo};
 const dh=rg.daftar_hapus||[],nm=dh.slice(0,40).map(x=>esc(x.nama)+' ('+esc(x.sebab)+')').join(', ')+(dh.length>40?', dan '+(dh.length-40)+' lainnya':'');const absCountRes=await dbq(db.from('absensi').select('id').eq('sekolah_id',SEK).limit(1)),tabCountRes=await dbq(db.from('tabungan_transaksi').select('id').eq('sekolah_id',SEK).limit(1));TB.absCount=Array.isArray(absCountRes)&&absCountRes.length?1:0;TB.absDownloaded=TB.absCount===0;TB.tabCount=Array.isArray(tabCountRes)&&tabCountRes.length?1:0;TB.tabDownloaded=TB.tabCount===0;
 const ops=`<label class="tbop"><input type="radio" name="tbm" onchange="tbPilih('bawa')"><span><b>Bawa saldo</b> siswa yang naik kelas dan tinggal kelas ke tahun ajaran baru. Riwayat transaksi dihapus, tiap siswa hanya punya satu baris saldo awal sebesar saldo akhirnya.</span></label><label class="tbop"><input type="radio" name="tbm" onchange="tbPilih('tutup')"><span><b>Tutup buku:</b> seluruh tabungan semua siswa di sekolah ini (saldo dan riwayat) dihapus. Saldo dianggap sudah dikembalikan ke wali.</span></label>`;
 const tabSec=TB.rows.length?`<div class="tbbox"><b>💰 Tabungan siswa yang masih bersaldo</b><div class="mu" style="margin:4px 0 8px">Saldo dan riwayat siswa lulus dan nonaktif selalu dihapus. Pilih perlakuan untuk siswa yang lanjut, lalu unduh salah satu arsip: PDF rekap saldo per kelas atau XLSX riwayat transaksi lengkap per kelas. Setelah Mulai, riwayat tidak bisa dikembalikan.</div>${ops}<div id="tbTabel">${tbTabelHtml()}</div><div class="tb" style="margin:10px 0 0"><button type="button" class="btn success sm dl" onclick="tbUnduhPdf(this)">⬇ Rekap tabungan (PDF)</button><button type="button" class="btn sm dl pdf" onclick="tbUnduhRiwayat('xlsx',this)">⬇ Riwayat tabungan lengkap (XLSX)</button></div></div>`:TB.tabCount>0?`<div class="tbbox"><b>💰 Riwayat tabungan</b><div class="mu">Tidak ada saldo yang perlu dibawa, tetapi masih ada transaksi tabungan yang akan dibersihkan. Unduh salah satu format untuk arsip.</div><div class="tb"><button class="btn success sm dl" onclick="tbUnduhRiwayat('pdf',this)">⬇ Riwayat Tabungan (PDF)</button><button class="btn sm dl pdf" onclick="tbUnduhRiwayat('xlsx',this)">⬇ Riwayat Tabungan (XLSX)</button></div></div>`:`<div class="note">Tidak ada saldo maupun riwayat tabungan yang perlu diarsipkan.</div>`;
 $('#mt').textContent='Mulai tahun ajaran baru';
 $('#mbd').innerHTML=`<div class="note" style="border:2px solid #d99a27;background:#fff8df"><b>Ringkasan penerapan keputusan (tahun ajaran ${esc(rg.tahun_ajaran)})</b><br>⬆️ Naik kelas: ${rg.naik} siswa dipindah ke kelas tujuan<br>🔁 Tinggal kelas: ${rg.tinggal} siswa tetap di kelasnya<br>🎓 Lulus: ${rg.lulus} siswa (dicatat ke menu Alumni, lalu dihapus dari daftar siswa)<br><br><b>Dihapus permanen (siswa naik kelas dan tinggal kelas TIDAK dihapus):</b><br>- Seluruh absensi, laporan orang tua, dan pesan WhatsApp tahun lalu<br>${rg.setoran_hafalan?`- ${rg.setoran_hafalan} catatan setoran hafalan (semua siswa; daftar hafalan tetap)<br>`:''}${rg.jadwal_piket_kelas?`- ${rg.jadwal_piket_kelas} jadwal piket per kelas (piket seluruh kelas tetap)<br>`:''}- ${dh.length} siswa (lulus ${rg.lulus}, nonaktif ${rg.nonaktif}) beserta ${rg.wali_hapus} data wali yang tidak punya anak lain di sekolah ini${nm?'<div style="max-height:110px;overflow:auto;margin-top:6px;font-size:12px">'+nm+'</div>':''}${rg.nonaktif>0?`<div class="tb" style="margin:10px 0 0"><button type="button" class="btn success sm dl" onclick="unduhSiswa('pdf',this,'*',true)">⬇ Data Siswa (PDF)</button><button type="button" class="btn sm dl pdf" onclick="unduhSiswa('xlsx',this,'*',true)">⬇ Data Siswa (XLSX)</button></div><b>Disarankan mengunduh data siswa karena ada ${rg.nonaktif} siswa nonaktif yang seluruh datanya akan dihapus.</b>`:''}</div>${TB.absCount>0?`<div class="tbbox"><b>📚 Riwayat absensi seluruh kelas</b><div class="mu">Unduh hanya riwayat absensi yang benar-benar tersimpan. Bulan tanpa data otomatis dilewati; hasil dikelompokkan per kelas, dari bulan pertama yang memiliki data sampai bulan terakhir. PDF memakai halaman per kelas-bulan dan XLSX memakai sheet per kelas-bulan.</div><div class="tb"><button class="btn success sm dl" onclick="taUnduhAbsensi('pdf',this)">⬇ Riwayat Absensi (PDF)</button><button class="btn sm dl pdf" onclick="taUnduhAbsensi('xlsx',this)">⬇ Riwayat Absensi (XLSX)</button></div></div>`:''}${tabSec}
<div class="tbbox"><div class="fd"><label class="l">Tahun ajaran baru (contoh 2027/2028)</label><input id="tbLabel" class="input" autocomplete="off" oninput="tbCek()"></div><div class="fd" style="margin-top:10px"><label class="l">Ketik MULAI (huruf kapital semua) untuk menerapkan keputusan akhir tahun dan memulai tahun ajaran baru</label><input id="tbOk" class="input" autocomplete="off" oninput="tbCek()"></div><div id="tbSyarat" style="margin-top:10px;font-size:13px"></div><div class="mu" style="margin-top:8px">Dengan menekan tombol Mulai, Anda menyatakan sudah memeriksa seluruh daftar di atas dan menyetujui penghapusan data secara permanen.</div></div>`;
 const m=$('#ms');m.style.display='';m.textContent='Mulai tahun ajaran baru';m.className='btn danger';m.onclick=tbMulai;
 $('#md').classList.add('besar');$('#md').classList.add('show');tbCek();
 jagaIsian('Tahun ajaran baru',()=>!!$('#tbLabel')&&(($('#tbLabel').value||'').trim()!==''||(($('#tbOk')||{}).value||'').trim()!==''),()=>{const a=$('#tbLabel'),b=$('#tbOk');if(a)a.value='';if(b)b.value='';tbCek()})}
/* ---------- Kelola Siswa: kenaikan kelas, tinggal kelas, kelulusan, pengesahan ---------- */
let KL={tab:'pindah',asal:'',tujuan:'',q:'',dq:'',dk:'',hm:false,hs:new Set(),sel:new Set(),data:null,ring:null,map:new Map()};
const KJ={naik:'Naik kelas',tinggal:'Tinggal kelas',lulus:'Lulus'},KJC={naik:'Izin',tinggal:'Sakit',lulus:'Alpa'},KST={sementara:'Sementara',disahkan:'Disahkan',diterapkan:'Diterapkan'},KSC={sementara:'Terlambat',disahkan:'Hadir',diterapkan:'Libur'};
const kb=(c,t)=>`<span class="badge ${c}">${esc(t)}</span>`;
async function muatKelola(){
 const ta=S.set.tahun_ajaran;
 const [d,r]=await Promise.all([dbq(db.from('keputusan_akhir_tahun').select('*').eq('sekolah_id',SEK).eq('tahun_ajaran',ta).order('nama_siswa')),dbq(db.rpc('keputusan_validasi',{p_sekolah:SEK}))]);
 KL.data=d||[];KL.ring=r||null;KL.map=new Map(KL.data.filter(x=>x.siswa_id).map(x=>[x.siswa_id,x]));
}
function simpanKelas(id,el){const ci=el.closest('.ci'),inp=ci&&ci.querySelector('select[data-urutan]');if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();if(inp)inp.blur();setUrutan(id,inp?inp.value:'')}
const urutanOpt=n=>'<option value=""'+(n==null?' selected':'')+'>-</option>'+Array.from({length:Math.max(12,n||0)},(_,i)=>'<option value="'+(i+1)+'"'+(n===i+1?' selected':'')+'>'+(i+1)+'</option>').join('');
const setUrutan=(id,v)=>guard(async()=>{const n=String(v).trim()===''?null:parseInt(v,10);if(n!==null&&!(n>=1&&n<=12))throw new Error('Urutan kelas harus angka 1 sampai 12');await dbq(db.from('kelas').update({urutan:n}).eq('id',id));const k=S.kelas.find(x=>x.id===id);if(k)k.urutan=n;toast('Urutan kelas disimpan')});
const setKelasAkhir=(id,on)=>guard(async()=>{await dbq(db.from('kelas').update({kelas_akhir:!!on}).eq('id',id));const k=S.kelas.find(x=>x.id===id);if(k)k.akhir=!!on;toast(on?'Ditandai sebagai kelas akhir':'Tanda kelas akhir dilepas')});
/* kelas tujuan naik: hanya 1 atau 2 tingkat (urutan) di atas kelas asal */
const kelasTujuanNaik=u=>{if(u==null)return[];const lv=[...new Set(S.kelas.filter(c=>c.urutan!=null&&c.urutan>u).map(c=>c.urutan))].sort((a,b)=>a-b).slice(0,2);return S.kelas.filter(c=>lv.includes(c.urutan))};
const klOpsi=(l,sel,ph)=>`<option value="">${ph}</option>`+l.map(k=>`<option value="${k.id}" ${String(k.id)===String(sel)?'selected':''}>${esc(k.nama)}</option>`).join('');
const klAsalList=()=>S.kelas.filter(k=>KL.tab==='lulus'?k.akhir:KL.tab==='naik'?!k.akhir:true);
/* pindah kelas: urutan sama, atau 1 tingkat berikutnya */
const kelasTujuanPindah=a=>{const nx=[...new Set(S.kelas.filter(c=>c.urutan!=null&&c.urutan>a.urutan).map(c=>c.urutan))].sort((x,y)=>x-y)[0];return S.kelas.filter(c=>c.id!==a.id&&c.urutan!=null&&(c.urutan===a.urutan||c.urutan===nx))};
const klTujuanList=()=>{const a=S.kelas.find(k=>String(k.id)===String(KL.asal));return a&&a.urutan!=null?(KL.tab==='pindah'?kelasTujuanPindah(a):kelasTujuanNaik(a.urutan)):[]};
const klSiswa=()=>{const z=KL.q.toLowerCase().trim();return S.siswa.filter(s=>s.aktif&&!klKunci(s)&&KL.asal&&String(s.kelas_id)===String(KL.asal)&&(!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z))).sort((a,b)=>a.nama.localeCompare(b.nama,'id'))};
const klKunci=s=>{const d=KL.map.get(s.id);return !!d&&d.status!=='sementara'};
const klInfo=d=>kb(KJC[d.jenis],KJ[d.jenis])+(d.jenis==='naik'&&d.kelas_tujuan_nama?' → '+esc(d.kelas_tujuan_nama):'')+' '+kb(KSC[d.status],KST[d.status]);
const klBolehSahkan=kid=>{const k=S.kelas.find(x=>String(x.id)===String(kid));return !!k&&(k.wali===me||adalahKepala()||(role==='Developer'&&MB()));};
const klListHtml=()=>tab(['','No','Nama','NISN','Keputusan'],klSiswa().map((s,i)=>{const d=KL.map.get(s.id);return `<tr><td><input type="checkbox" class="ckkl" ${KL.sel.has(s.id)?'checked':''} ${klKunci(s)?'disabled':''} onchange="klPilih(${s.id},this.checked)"></td><td>${i+1}</td><td><b>${esc(s.nama)}</b><div class="mu">${esc(s.pan||'')}</div></td><td>${esc(s.nisn||'-')}</td><td>${d?klInfo(d):'<span class="mu">Belum diputuskan</span>'}</td></tr>`}).join(''),KL.asal?'Tidak ada siswa aktif yang cocok di kelas ini.':'<span class="pk-warn">⚠️ Pilih kelas asal terlebih dahulu</span>');
const klRingkasHtml=()=>{const n=KL.sel.size,nm=[...KL.sel].map(id=>(siswaById(id)||{}).nama).filter(Boolean);return `<b>${n} siswa dipilih</b>`+(n?'<div class="mu" style="margin-top:4px">'+nm.slice(0,10).map(esc).join(', ')+(nm.length>10?', dan '+(nm.length-10)+' lainnya':'')+'</div>':'')};
const klRefresh=()=>{const a=$('#klList'),b=$('#klRingkas');if(a)a.innerHTML=klListHtml();if(b)b.innerHTML=klRingkasHtml()};
function klTab(t){KL.tab=t;KL.asal='';KL.tujuan='';KL.q='';KL.sel.clear();renderV()}
function klAsal(v){KL.asal=v;KL.tujuan='';KL.sel.clear();renderV()}
function klTujuan(v){KL.tujuan=v}
function klPilih(id,on){on?KL.sel.add(id):KL.sel.delete(id);const b=$('#klRingkas');if(b)b.innerHTML=klRingkasHtml()}
function klSemua(on){klSiswa().filter(s=>!klKunci(s)).forEach(s=>on?KL.sel.add(s.id):KL.sel.delete(s.id));cekBaris('#v .ckkl:not(:disabled)').forEach(x=>x.checked=on);const b=$('#klRingkas');if(b)b.innerHTML=klRingkasHtml()}
function klCari(el){KL.q=el.value;klRefresh()}
function klCariDaftar(el){KL.dq=el.value;const a=$('#klDaftar');if(a)a.innerHTML=klDaftarHtml()}
const klJudul={naik:['Proses Kenaikan Kelas','Pilih kelas asal dan kelas tujuan, lalu centang siswa yang naik. Kelas tujuan hanya bisa 1 atau 2 tingkat di atas kelas asal, bebas memilih salah satunya.'],tinggal:['Proses Tinggal Kelas','Pilih kelas asal, lalu centang siswa yang tetap berada di kelas yang sama pada tahun ajaran berikutnya.'],lulus:['Proses Kelulusan','Pilih kelas akhir, lalu centang siswa yang dinyatakan lulus. Data siswa lulus tidak langsung berubah.'],pindah:['Pindah Kelas','Pindahkan siswa ke kelas lain dengan urutan yang SAMA atau 1 tingkat berikutnya (misalnya kelas urutan 1 boleh ke urutan 1 atau urutan 2). Berlaku langsung, bukan keputusan akhir tahun.']};
function klProsesHtml(){
 const t=KL.tab,all=klSiswa().filter(s=>!klKunci(s)),sem=all.length>0&&all.every(s=>KL.sel.has(s.id)),as=klAsalList();
 const tanpa=S.kelas.filter(k=>k.urutan==null).map(k=>k.nama),adaAkhir=S.kelas.some(k=>k.akhir);
 let w='';
 if((t==='naik'||t==='pindah')&&tanpa.length)w+=`<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ Urutan kelas belum diisi untuk: ${tanpa.map(esc).join(', ')}. ${kelola()?'Isi di menu Kelas dan Jam Masuk.':'Minta Kepala Sekolah mengisinya di menu Kelas dan Jam Masuk.'}</div>`;
 if(t==='lulus'&&!adaAkhir)w+=`<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ Belum ada kelas yang ditandai sebagai Kelas akhir. ${kelola()?'Atur di menu Kelas dan Jam Masuk.':'Minta Kepala Sekolah mengaturnya di menu Kelas dan Jam Masuk.'}</div>`;
 if((t==='naik'||t==='pindah')&&KL.asal&&!klTujuanList().length&&!tanpa.length)w+=`<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ ${t==='pindah'?'Tidak ada kelas lain dengan urutan yang sama atau 1 tingkat berikutnya dari kelas asal.':'Tidak ada kelas dengan urutan lebih tinggi dari kelas asal.'}</div>`;
 const btn={naik:'Proses Kenaikan Kelas',tinggal:'Proses Tinggal Kelas',lulus:'Proses Kelulusan',pindah:'Pindahkan Siswa'}[t];
 return `<div class="note">${klJudul[t][1]}${t==='pindah'?' Siswa langsung berpindah kelas.':' Keputusan disimpan sebagai <b>sementara</b>, siswa belum dipindahkan.'}</div>${w}
<div class="tb${(t==='naik'||t==='pindah')?'':' tb-full'}"><select class="select grow" onchange="klAsal(this.value)">${klOpsi(as,KL.asal,t==='lulus'?'- Kelas akhir -':'- Kelas asal -')}</select>${(t==='naik'||t==='pindah')?`<select class="select grow" onchange="klTujuan(this.value)">${klOpsi(klTujuanList(),KL.tujuan,'- Kelas tujuan -')}</select>`:''}</div>
<div class="tb"><input class="input grow" style="flex:1 1 100%;width:100%" placeholder="Cari nama atau NISN" value="${esc(KL.q)}" oninput="klCari(this)"></div>
<label class="mu" style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="klCekAll" ${sem?'checked':''} onchange="klSemua(this.checked)"> Pilih semua yang terlihat</label>
<div id="klList">${klListHtml()}</div><div class="note" id="klRingkas" style="margin-top:12px">${klRingkasHtml()}</div>
<button class="btn success" onclick="klProses()">${btn}</button>`;
}
async function klProses(){
 const j=KL.tab;if(j==='pindah')return klPindah();
 if(!KL.asal)return toast(j==='lulus'?'Pilih kelas akhir terlebih dahulu':'Pilih kelas asal terlebih dahulu',false);
 if(j==='naik'&&!KL.tujuan)return toast('Pilih kelas tujuan terlebih dahulu',false);
 const ids=[...KL.sel];if(!ids.length)return toast('Belum ada siswa yang dipilih',false);
 const asal=S.kelas.find(k=>String(k.id)===String(KL.asal)),tuj=S.kelas.find(k=>String(k.id)===String(KL.tujuan));
 const ada=ids.map(id=>KL.map.get(id)).filter(Boolean);
 let msg={naik:'Naikkan ',tinggal:'Tinggalkan kelas ',lulus:'Luluskan '}[j]+ids.length+' siswa dari kelas '+asal.nama+(j==='naik'?' ke kelas '+tuj.nama:'')+'.\n\nKeputusan disimpan sebagai SEMENTARA. Siswa belum dipindahkan dan baru berlaku setelah keputusan disahkan dan tahun ajaran baru dimulai.';
 if(ada.length)msg+='\n\n'+ada.length+' siswa sudah punya keputusan sementara dan akan DIGANTI:\n'+ada.slice(0,8).map(d=>'- '+d.nama_siswa+' ('+KJ[d.jenis]+(d.jenis==='naik'&&d.kelas_tujuan_nama?' ke '+d.kelas_tujuan_nama:'')+')').join('\n')+(ada.length>8?'\n... dan '+(ada.length-8)+' lainnya':'');
 if(!await konfirmasi(msg,{judul:klJudul[j][0],ikon:'📝',ya:'Simpan keputusan'}))return;
 guard(async()=>{
  const r=await dbq(db.rpc('keputusan_simpan',{p_sekolah:SEK,p_jenis:j,p_kelas_asal:Number(KL.asal),p_kelas_tujuan:j==='naik'?Number(KL.tujuan):null,p_siswa:ids,p_timpa:true}));
  KL.sel.clear();await muatKelola();renderV();
  const tot=(r.disimpan||0)+(r.ditimpa||0);
  if(r.dilewati&&r.dilewati.length)info('Sebagian siswa dilewati',`<div class="note">${tot} keputusan tersimpan (sementara, belum final). ${r.dilewati.length} siswa dilewati:</div>`+tab(['Siswa','Alasan'],r.dilewati.map(x=>`<tr><td>${esc(x.nama)}</td><td>${esc(x.alasan)}</td></tr>`).join('')));
  else toast(tot+' keputusan tersimpan sebagai sementara. Belum final: sahkan di tab Pengesahan');
 });
}
/* ----- Pengesahan ----- */
const klDaftarList=()=>{const z=KL.dq.toLowerCase().trim();return (KL.data||[]).filter(d=>(!KL.dk||d.kelas_asal_nama===KL.dk)&&(!z||d.nama_siswa.toLowerCase().includes(z)||String(d.kelas_asal_nama||'').toLowerCase().includes(z)))};
const klDaftarHtml=()=>{const l=klDaftarList(),m=KL.hm;
 return tab((m?['']:[]).concat(['No','Siswa','Kelas asal','Keputusan','Aksi']),l.map((d,i)=>`<tr>${m?`<td><input type="checkbox" ${KL.hs.has(d.id)?'checked':''} ${d.status==='diterapkan'?'disabled':''} onchange="klHPilih(${d.id},this.checked)"></td>`:''}<td>${i+1}</td><td><b>${esc(d.nama_siswa)}</b></td><td>${esc(d.kelas_asal_nama||'-')}</td><td>${klInfo(d)}</td><td>${d.status==='sementara'?`${klBolehSahkan(d.kelas_asal_id)?`<button class="btn sm success" onclick="klSahkanSiswa(${d.id})">✔ Sahkan</button>`:''}<button class="btn sm danger" onclick="klHapus(${d.id})">Hapus</button>`:d.status==='disahkan'?`<button class="btn sm soft" onclick="klKoreksi(${d.id})">Koreksi</button>`:''}</td></tr>`).join(''),'Belum ada keputusan yang diproses.')};
const klHapusBar=()=>{const l=klDaftarList().filter(d=>d.status!=='diterapkan');
 if(!KL.hm)return l.length?`<div class="tb" style="margin-top:8px"><button class="btn danger sm" title="Hapus massal" onclick="klHMode(true)">🗑️🧹</button></div>`:'';
 const semua=l.length&&l.every(d=>KL.hs.has(d.id));
 return `<div class="tb" style="margin-top:8px"><label class="mu" style="display:flex;gap:6px;align-items:center"><input type="checkbox" ${semua?'checked':''} onchange="klHSemua(this.checked)"> Pilih semua (${l.length})</label><button class="btn danger sm" onclick="klHapusMassal()">🗑️ Hapus terpilih (<span id="klHSel">${KL.hs.size}</span>)</button><button class="btn soft sm" onclick="klHMode(false)">Batal</button></div>`};
function klHRefresh(){const a=$('#klDaftar'),b=$('#klHBar');if(a)a.innerHTML=klDaftarHtml();if(b)b.innerHTML=klHapusBar()}
function klHMode(on){KL.hm=!!on;KL.hs.clear();klHRefresh()}
function klHPilih(id,on){on?KL.hs.add(id):KL.hs.delete(id);const c=$('#klHSel');if(c)c.textContent=KL.hs.size}
function klHSemua(on){klDaftarList().filter(d=>d.status!=='diterapkan').forEach(d=>on?KL.hs.add(d.id):KL.hs.delete(d.id));klHRefresh()}
async function klHapusMassal(){
 const pil=[...KL.hs].map(id=>(KL.data||[]).find(d=>d.id===id)).filter(Boolean);if(!pil.length)return toast('Belum ada data yang dipilih',false);
 const sm=pil.filter(d=>d.status==='sementara'),sh=pil.filter(d=>d.status==='disahkan');
 const jalan=alasan=>guard(async()=>{const gagal=[];
  if(sm.length)await dbq(db.rpc('keputusan_hapus',{p_sekolah:SEK,p_ids:sm.map(d=>d.id)}));
  for(let i=0;i<sh.length;i+=5)await Promise.all(sh.slice(i,i+5).map(d=>dbq(db.rpc('keputusan_koreksi',{p_id:d.id,p_jenis:'batal',p_kelas_tujuan:null,p_alasan:alasan})).catch(e=>gagal.push(d.nama_siswa+': '+(e.message||e)))));
  KL.hs.clear();KL.hm=false;await muatKelola();renderV();
  toast((pil.length-gagal.length)+' keputusan dihapus'+(gagal.length?', '+gagal.length+' gagal ('+gagal[0]+')':''),!gagal.length)});
 if(sh.length){form('Hapus '+pil.length+' keputusan ('+sh.length+' sudah disahkan)',[{k:'a',l:'Alasan (wajib, dicatat bersama nama Anda)'}],async v=>{if(v.a.length<3)throw new Error('Isi alasan');await jalan(v.a)});$('#ms').textContent='Hapus';return}
 if(!await konfirmasi('Hapus '+pil.length+' keputusan terpilih?\n\n'+pil.slice(0,10).map(d=>d.nama_siswa).join('\n')+(pil.length>10?'\n... dan '+(pil.length-10)+' lainnya':'')+'\n\nSiswa kembali berstatus belum diputuskan.',{judul:'Hapus keputusan terpilih',ya:'Hapus semua',bahaya:1}))return;
 jalan('')}
async function klHapus(id){const d=(KL.data||[]).find(x=>x.id===id);if(!d)return;
 if(!await konfirmasi('Hapus keputusan sementara untuk '+d.nama_siswa+'? Siswa kembali berstatus belum diputuskan.',{judul:'Hapus keputusan',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{await dbq(db.rpc('keputusan_hapus',{p_sekolah:SEK,p_ids:[id]}));await muatKelola();renderV();toast('Keputusan dihapus')})}
function klKoreksi(id){const d=(KL.data||[]).find(x=>x.id===id);if(!d)return;
 const LB={'Naik kelas':'naik','Tinggal kelas':'tinggal','Lulus':'lulus','Batalkan keputusan (kembali belum diputuskan)':'batal'},kn=S.kelas.map(k=>k.nama);
 form('Koreksi keputusan - '+d.nama_siswa,[{k:'j',l:'Keputusan baru',o:Object.keys(LB),v:KJ[d.jenis]},{k:'t',l:'Kelas tujuan (khusus Naik kelas)',o:['-',...kn],v:d.kelas_tujuan_nama||'-'},{k:'a',l:'Alasan koreksi (wajib, dicatat bersama nama Anda)'}],async v=>{
  const jn=LB[v.j],tj=S.kelas.find(k=>k.nama===v.t);
  if(jn==='naik'&&!tj)throw new Error('Pilih kelas tujuan untuk Naik kelas');
  if(v.a.length<3)throw new Error('Isi alasan koreksi');
  await dbq(db.rpc('keputusan_koreksi',{p_id:id,p_jenis:jn,p_kelas_tujuan:jn==='naik'?tj.id:null,p_alasan:v.a}));
  await muatKelola();renderV();toast('Koreksi tersimpan dan dicatat')})}
V.kelola=()=>{
 if(!KL.data)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat keputusan akhir tahun...</div></div></div>';
 const T=[['pindah','↔️ Pindah Kelas'],['naik','⬆️ Naik Kelas'],['tinggal','🔁 Tinggal Kelas'],['lulus','🎓 Kelulusan'],['pengesahan','✅ Pengesahan']];
 return `<div class="panel"><div class="ph">Kelola Siswa <span class="mu">Tahun ajaran diproses: ${esc(S.set.tahun_ajaran||'-')}</span></div><div class="pb"><div class="utabs kl">${T.map(t=>`<button class="utab${KL.tab===t[0]?' on':''}" onclick="klTab('${t[0]}')">${t[1]}</button>`).join('')}</div>${KL.tab==='pengesahan'?klPengesahanHtml():klProsesHtml()}</div></div>`;
};

/* ---------- pembantu data siswa lengkap (tgl lahir, jenis kelamin, alamat, tahun masuk) ---------- */
const BLN_PJ=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const tglPjg=iso=>{const p=String(iso||'').split('-');return p.length===3&&BLN_PJ[+p[1]-1]?(+p[2])+' '+BLN_PJ[+p[1]-1]+' '+p[0]:''};
const ttlPjg=(t,iso)=>{t=String(t||'').trim();const d=tglPjg(iso);return t&&d?t+', '+d:(d||t)};
const tglDMY=iso=>iso?String(iso).slice(8,10)+'/'+String(iso).slice(5,7)+'/'+String(iso).slice(0,4):'';
const jkNama=x=>x==='L'?'Laki-laki':x==='P'?'Perempuan':'';
function siswaExtra(v){const th=Number(String(v.masuk||'').trim()),mx=Number(TODAY.slice(0,4))+1;
 if(!(th>=1990&&th<=mx))throw new Error('Tahun masuk harus tahun 4 digit antara 1990 dan '+mx);
 const tp=String(v.tempat||'').replace(/\s+/g,' ').trim();if(tp.length>50)throw new Error('Tempat lahir maksimal 50 karakter');
 return {tempat_lahir:tp||null,tgl_lahir:v.tgl||null,jenis_kelamin:v.jk==='Laki-laki'?'L':v.jk==='Perempuan'?'P':null,alamat:(v.alamat||'').trim()||null,tahun_masuk:th}}
function parseTglLahir(v){v=String(v==null?'':v).trim();if(!v)return null;let d,m,y,mt;
 if(mt=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)){d=+mt[1];m=+mt[2];y=+mt[3]}
 else if(mt=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)){y=+mt[1];m=+mt[2];d=+mt[3]}
 else if(/^\d{5}$/.test(v)&&typeof XLSX!=='undefined'){const c=XLSX.SSF.parse_date_code(+v);if(!c)return 'x';y=c.y;m=c.m;d=c.d}
 else return 'x';
 const dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d||y<1990||y>Number(TODAY.slice(0,4)))return 'x';
 return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function parseJK(v){v=String(v==null?'':v).trim().toLowerCase();if(!v)return null;if(['l','laki','laki-laki','laki laki','pria'].includes(v))return 'L';if(['p','perempuan','wanita'].includes(v))return 'P';return 'x'}
function parseMasuk(v){v=String(v==null?'':v).trim();if(!v)return Number(TODAY.slice(0,4));const n=Number(v);return /^\d{4}$/.test(v)&&n>=1990&&n<=Number(TODAY.slice(0,4))+1?n:'x'}

/* ---------- Pindah kelas (urutan sama atau 1 tingkat berikutnya) ---------- */
async function klPindah(){
 if(!KL.asal)return toast('Pilih kelas asal terlebih dahulu',false);
 if(!KL.tujuan)return toast('Pilih kelas tujuan terlebih dahulu',false);
 const ids=[...KL.sel];if(!ids.length)return toast('Belum ada siswa yang dipilih',false);
 const asal=S.kelas.find(k=>String(k.id)===String(KL.asal)),tuj=S.kelas.find(k=>String(k.id)===String(KL.tujuan));
 const ada=ids.map(id=>KL.map.get(id)).filter(Boolean);
 let msg='Pindahkan '+ids.length+' siswa dari kelas '+asal.nama+' ke kelas '+tuj.nama+'.\n\nSiswa LANGSUNG berpindah kelas sekarang.';
 if(ada.length)msg+='\n\n'+ada.length+' siswa punya keputusan akhir tahun sementara yang akan DIHAPUS karena kelasnya berubah. Proses ulang keputusannya setelah pindah.';
 if(!await konfirmasi(msg,{judul:'Pindah Kelas',ikon:'↔️',ya:'Pindahkan'}))return;
 guard(async()=>{
  const r=await dbq(db.rpc('siswa_pindah_kelas',{p_sekolah:SEK,p_siswa:ids,p_kelas_asal:Number(KL.asal),p_kelas_tujuan:Number(KL.tujuan)}));
  KL.sel.clear();await muatDasar();await muatKelola();renderV();
  if(r.dilewati&&r.dilewati.length)info('Sebagian siswa dilewati',`<div class="note">${r.dipindah} siswa dipindahkan. ${r.dilewati.length} siswa dilewati:</div>`+tab(['Siswa','Alasan'],r.dilewati.map(x=>`<tr><td>${esc(x.nama)}</td><td>${esc(x.alasan)}</td></tr>`).join('')));
  else toast(r.dipindah+' siswa dipindahkan ke kelas '+tuj.nama+(r.keputusan_dihapus?'. '+r.keputusan_dihapus+' keputusan sementara dihapus, proses ulang bila perlu':''));
 });
}

/* ---------- Pengesahan per kelas (oleh wali kelas) ---------- */
function klPengesahanHtml(){
 const r=KL.ring||{},m=r.masalah||[],ok=(r.naik||0)+(r.tinggal||0)+(r.lulus||0);
 const cards=[['Total siswa aktif',r.total],['Sudah diputuskan',ok],['Naik kelas',r.naik],['Tinggal kelas',r.tinggal],['Lulus',r.lulus],['Belum diputuskan',r.belum],['Belum disahkan',r.sementara],['Sudah disahkan',r.disahkan]];
 const ringkas=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px">${cards.map(c=>`<div class="note" style="margin:0;text-align:center"><b style="font-size:22px;display:block">${c[1]||0}</b>${c[0]}</div>`).join('')}</div>`;
 const ks=(r.kelas||[]).map(k=>{
  const mk=m.filter(x=>String(x.kelas_id)===String(k.kelas_id));
  const st=!k.total?kb('Belum','Tidak ada siswa'):mk.length?kb('Terlambat',mk.length+' perlu diperiksa'):k.sementara>0?kb('Izin','Siap disahkan'):k.disahkan>0?kb('Hadir','Sudah disahkan'):kb('Belum','Belum ada keputusan');
  const wali=k.wali_nama?'Wali kelas: <b>'+esc(k.wali_nama)+'</b>':'Belum ada wali kelas; pengesahan hanya oleh kelompok akun kepala sekolah';
  const aksi=k.sementara>0&&!mk.length?(k.boleh?`<button class="btn success sm" onclick="klSahkan(${k.kelas_id})">✔ Sahkan kelas ${esc(k.nama)}</button>`:`<span style="color:#d62839;font-weight:700">⚠️ Hanya wali kelas (${esc(k.wali_nama||'-')}) yang dapat mengesahkan kelas ini</span>`):'';
  return `<div class="note" id="klKelas${k.kelas_id}" style="margin:0 0 10px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b>Kelas ${esc(k.nama)}</b>${st}</div><div class="mu" style="margin:4px 0">${wali}</div><div class="mu">${k.total} siswa · naik ${k.naik} · tinggal ${k.tinggal} · lulus ${k.lulus} · belum diputuskan ${k.belum}</div>${mk.length?tab(['Siswa','Masalah'],mk.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.masalah)}</td></tr>`).join('')):''}${aksi?'<div class="tb" style="margin:10px 0 0">'+aksi+'</div>':''}</div>`}).join('');
 const lain=m.filter(x=>x.kelas_id==null);
 const tanpa=lain.length?`<div class="note" style="border-color:#d99a27;background:#fff8df"><b>⚠ Siswa tanpa kelas yang valid (${lain.length}):</b>`+tab(['Siswa','Masalah'],lain.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.masalah)}</td></tr>`).join(''))+'</div>':'';
 return `<div class="note"><span style="color:#166534;font-weight:700">Pengesahan dapat dilakukan wali kelas atau kelompok akun kepala sekolah.</span> Jika kelas memiliki wali kelas, keduanya berhak mengesahkan. Jika tidak memiliki wali kelas, hanya kelompok akun kepala sekolah yang berhak. Pengesahan bisa dilakukan satu per satu pada daftar siswa atau sekaligus per kelas. Pengesahan hanya menetapkan keputusan sebagai resmi. Siswa baru dipindahkan, tinggal kelas, atau lulus ketika Kepala Sekolah memulai tahun ajaran baru, setelah SEMUA kelas disahkan.</div>${ringkas}${ks||'<div class="note">Belum ada kelas aktif.</div>'}${tanpa}
<div class="tb klf" style="margin-top:12px"><input class="input grow" placeholder="Cari nama atau kelas" value="${esc(KL.dq)}" oninput="klCariDaftar(this)"><select class="select" onchange="klKelasDaftar(this.value)"><option value="">Semua kelas</option>${S.kelas.map(k=>`<option value="${esc(k.nama)}" ${KL.dk===k.nama?'selected':''}>${esc(k.nama)}</option>`).join('')}</select></div><div id="klHBar">${klHapusBar()}</div><div id="klDaftar">${klDaftarHtml()}</div>`;
}
async function klSahkanSiswa(id){
 const d=(KL.data||[]).find(x=>x.id===id);if(!d||d.status!=='sementara'||!klBolehSahkan(d.kelas_asal_id))return;
 if(!await konfirmasi('Sahkan keputusan '+KJ[d.jenis]+' untuk '+d.nama_siswa+'? Keputusan ini menjadi final dan hanya dapat diubah melalui Koreksi yang dicatat.',{judul:'Sahkan keputusan siswa',ikon:'✅',ya:'Ya, sahkan'}))return;
 guard(async()=>{const x=await dbq(db.rpc('keputusan_sahkan_siswa',{p_id:id}));await muatKelola();renderV();toast('Keputusan '+x.siswa+' berhasil disahkan')});
}
async function klSahkan(kid){
 await guard(muatKelola);renderV();
 const r=KL.ring||{},k=(r.kelas||[]).find(x=>x.kelas_id===kid);if(!k)return;
 const mk=(r.masalah||[]).filter(x=>x.kelas_id===kid);
 if(mk.length)return toast('Pengesahan ditolak: '+mk.length+' siswa kelas '+k.nama+' belum diputuskan atau bermasalah',false);
 if(!(k.sementara>0))return toast(k.disahkan>0?'Kelas '+k.nama+' sudah disahkan':'Belum ada keputusan untuk disahkan',false);
 const sm=(KL.data||[]).filter(d=>d.status==='sementara'&&d.kelas_asal_id===kid),c=j=>sm.filter(d=>d.jenis===j).length;
 if(!await konfirmasi('Sahkan keputusan akhir tahun kelas '+k.nama+' (tahun ajaran '+r.tahun_ajaran+')?\n\nTotal siswa: '+sm.length+'\n- Naik kelas: '+c('naik')+'\n- Tinggal kelas: '+c('tinggal')+'\n- Lulus: '+c('lulus')+'\n\nSetelah disahkan keputusan menjadi final (perubahan hanya lewat Koreksi yang dicatat). Siswa belum dipindahkan sampai tahun ajaran baru dimulai.',{judul:'Sahkan kelas '+k.nama,ikon:'✅',ya:'Ya, sahkan'}))return;
 guard(async()=>{const x=await dbq(db.rpc('keputusan_sahkan',{p_sekolah:SEK,p_kelas:kid}));await muatKelola();renderV();toast('Kelas '+x.kelas+': '+x.disahkan+' keputusan disahkan')});
}

/* ---------- Alumni ---------- */
/* ---------- menu aksi siswa (ikon pensil) ---------- */
function aksiSiswa(id,btn){
 const ada=document.getElementById('aksiMenu'),sama=ada&&ada.dataset.id===String(id);tutupAksi();if(sama)return;
 const s=siswaById(id);if(!s)return;
 const m=document.createElement('div');m.id='aksiMenu';m.className='aksi-menu';m.dataset.id=String(id);
 m.innerHTML=`<button onclick="tutupAksi();ubahSiswa(${id})">✏️ Ubah</button><button onclick="tutupAksi();togSiswa(${id})">${s.aktif?'⏸ Nonaktifkan':'▶ Aktifkan'}</button><button class="rd" onclick="tutupAksi();hapusSiswa(${id})">🗑 Hapus</button>`;
 document.body.appendChild(m);
 const r=btn.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
 const x=Math.min(Math.max(8,r.right-w),window.innerWidth-w-8);let y=r.bottom+6;if(y+h>window.innerHeight-8)y=Math.max(8,r.top-h-6);
 m.style.left=x+'px';m.style.top=y+'px';
 setTimeout(()=>{document.addEventListener('click',aksiLuar,true);window.addEventListener('scroll',tutupAksi,true)},0);
}
function aksiLuar(e){const m=document.getElementById('aksiMenu');if(m&&!m.contains(e.target))tutupAksi()}
function tutupAksi(){const m=document.getElementById('aksiMenu');if(m)m.remove();document.removeEventListener('click',aksiLuar,true);window.removeEventListener('scroll',tutupAksi,true)}
/* ---------- tab bergulir ke tengah ---------- */
function utabTengah(sl){const c=document.querySelector('#v .utabs');if(!c)return;if(sl)c.scrollLeft=sl;const a=c.querySelector('.utab.on');if(!a)return;requestAnimationFrame(()=>{c.scrollTo({left:Math.max(0,a.offsetLeft-(c.clientWidth-a.offsetWidth)/2),behavior:'smooth'})})}
function klKelasDaftar(v){KL.dk=v;const a=$('#klDaftar');if(a)a.innerHTML=klDaftarHtml()}

/* ---------- Alumni (dilipat sebelum tahun dipilih, hapus terpilih) ---------- */
let AL={data:null,q:'',th:'',mode:false,sel:new Set()};
async function muatAlumni(){AL.data=(await dbq(db.from('alumni').select('*').eq('sekolah_id',SEK).order('tahun_lulus',{ascending:false}).order('nama')))||[]}
const alTerbuka=()=>AL.th!=='';
const alFilter=semua=>{const z=AL.q.toLowerCase().trim();return(AL.data||[]).filter(a=>(semua||alTerbuka())&&(!z||String(a.nama).toLowerCase().includes(z))&&(AL.th===''||AL.th==='*'||String(a.tahun_lulus)===AL.th))};
const alListHtml=()=>{
 if(!alTerbuka())return `<div class="note">📂 Daftar alumni dilipat. Pilih tahun lulus untuk menampilkannya (${(AL.data||[]).length} alumni tersimpan).</div>`;
 const l=alFilter(),m=AL.mode;
 return tab((m?['']:[]).concat(['No','Nama','Tempat, Tgl Lahir','JK','Alamat','WhatsApp','Tahun Masuk','Tahun Lulus','Kepala Sekolah','Raport']),l.map((a,i)=>`<tr>${m?`<td><input type="checkbox" class="ckal" ${AL.sel.has(a.id)?'checked':''} onchange="alPilih(${a.id},this.checked)"></td>`:''}<td>${i+1}</td><td><b>${esc(a.nama)}</b></td><td>${esc(ttlPjg(a.tempat_lahir,a.tgl_lahir))||'-'}</td><td>${jkNama(a.jenis_kelamin)||'-'}</td><td>${esc(a.alamat||'-')}</td><td>${nomorHtml(a.no_wa)} <button type="button" class="salin" onclick="alUbahWa(${a.id})" title="Ubah nomor WhatsApp" aria-label="Ubah nomor WhatsApp"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button></td><td>${a.tahun_masuk||'-'}</td><td>${a.tahun_lulus}</td><td>${esc(a.kepala_sekolah||'-')}</td><td><button class="btn sm soft" onclick="alRapor(${a.id})">📄 Raport</button></td></tr>`).join(''),'Tidak ada alumni yang cocok.')};
const alHapusBtn=()=>{if(AL.mode||!adalahKepala()||!alTerbuka()||!alFilter().length)return '';return `<button class="btn danger sm" onclick="alMode(true)">🗑 Hapus</button>`};
const alBarHtml=()=>{if(!adalahKepala()||!alTerbuka())return '';const l=alFilter();if(!l.length)return '';
 if(!AL.mode)return '';
 const semua=l.every(a=>AL.sel.has(a.id));
 return `<div class="tb"><label class="mu" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="alCekAll" ${semua?'checked':''} onchange="alSemua(this.checked)"> Pilih semua (${l.length})</label><button class="btn danger sm" onclick="alHapusTerpilih()">🗑 Hapus terpilih (<span id="alSel">${AL.sel.size}</span>)</button><button class="btn soft sm" onclick="alMode(false)">Batal</button></div>`};
const alJmlText=()=>alTerbuka()?alFilter().length+' dari '+(AL.data||[]).length+' alumni':(AL.data||[]).length+' alumni tersimpan';
const alRefresh=()=>{const a=$('#alList'),b=$('#alJml'),c=$('#alBar'),h=$('#alHapusSlot');if(h)h.innerHTML=alHapusBtn();if(a)a.innerHTML=alListHtml();if(b)b.textContent=alJmlText();if(c)c.innerHTML=alBarHtml()};
function alCari(el){AL.q=el.value;alRefresh()}
function alTahun(v){AL.th=v;AL.sel.clear();renderV()}
function alUbahWa(id){const a=(AL.data||[]).find(x=>x.id===id);if(!a)return;form('Ubah WhatsApp Alumni',[{k:'wa',l:'Nomor WhatsApp orang tua',t:'tel',v:a.no_wa?('0'+String(a.no_wa).replace(/^62/,'')) :''}],async v=>{const wa=normWA(v.wa);if(wa&&!/^628[0-9]{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');await dbq(db.rpc('alumni_wa_ubah',{p_id:id,p_no_wa:wa||null}));a.no_wa=wa||null;alRefresh();toast('Nomor WhatsApp alumni diperbarui')})}
function alMode(on){AL.mode=on;AL.sel.clear();renderV()}
function alCekUI(){const c=$('#alSel');if(c)c.textContent=AL.sel.size;const l=alFilter();const a=document.getElementById('alCekAll');if(a)a.checked=l.length>0&&l.every(x=>AL.sel.has(x.id))}
function alPilih(id,on){on?AL.sel.add(id):AL.sel.delete(id);alCekUI()}
function alSemua(on){alFilter().forEach(a=>on?AL.sel.add(a.id):AL.sel.delete(a.id));cekBaris('#v .ckal').forEach(x=>x.checked=on);alCekUI()}
async function alHapusTerpilih(){
 if(!adalahKepala())return toast('Hanya Kepala Sekolah atau Wakil yang dapat menghapus data alumni',false);
 const ids=[...AL.sel];if(!ids.length)return toast('Belum ada alumni yang dipilih',false);
 const nm=ids.map(id=>(AL.data.find(a=>a.id===id)||{}).nama).filter(Boolean);
 if(!await konfirmasi('Hapus PERMANEN '+ids.length+' data alumni?\n\n'+nm.slice(0,10).join('\n')+(nm.length>10?'\n... dan '+(nm.length-10)+' lainnya':'')+'\n\nData tidak bisa dikembalikan. Unduh dulu bila masih diperlukan.',{judul:'Hapus data alumni',ya:'Hapus permanen',bahaya:1}))return;
 guard(async()=>{const n=await dbq(db.rpc('alumni_hapus',{p_sekolah:SEK,p_ids:ids}));AL.sel.clear();AL.mode=false;await muatAlumni();renderV();toast(n+' data alumni dihapus')});
}
V.alumni=()=>{
 if(!AL.data)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat data alumni...</div></div></div>';
 const ths=[...new Set(AL.data.map(a=>a.tahun_lulus))].sort((a,b)=>b-a);
 return `<div class="panel"><div class="ph">🏅 Data Alumni <span class="mu" id="alJml">${alJmlText()}</span></div><div class="pb">
<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ Data alumni hanya disimpan <b>2 tahun</b> sejak siswa dinyatakan lulus, setelah itu dihapus otomatis oleh sistem. Silakan <b>unduh data terbaru</b> sebelum dihapus.</div>
<div class="tb"><input class="input grow" placeholder="Cari nama alumni..." value="${esc(AL.q)}" oninput="alCari(this)"><select class="select" onchange="alTahun(this.value)"><option value="">- Pilih tahun lulus -</option><option value="*" ${AL.th==='*'?'selected':''}>Semua tahun lulus</option>${ths.map(t=>`<option value="${t}" ${String(t)===AL.th?'selected':''}>Lulus ${t}</option>`).join('')}</select></div>
<div class="tb"><button class="btn success sm dl" onclick="unduhAlumni('pdf',this)">⬇ PDF</button><button class="btn sm dl pdf" onclick="unduhAlumni('xlsx',this)">⬇ XLSX</button><span id="alHapusSlot" style="display:contents">${alHapusBtn()}</span></div>
<div id="alBar">${alBarHtml()}</div><div id="alList">${alListHtml()}</div></div></div>`;
};
/* ---------- Developer: hapus alumni per tahun ---------- */
function devAlumniPanel(){const r=S.devAlRing,sel=S.devAlTh||'',list=S.devAlList||[],sk=S.devAlSek,P=S.devAlPil||(S.devAlPil=new Set());
 const opt='<option value="">- Pilih tahun alumni -</option>'+(r||[]).map(x=>`<option value="${x.tahun_lulus}" ${String(x.tahun_lulus)===sel?'selected':''}>Lulus ${x.tahun_lulus} (${x.jumlah} alumni, ${x.sekolah_jml} sekolah)</option>`).join('');
 const pilS=sk?sk.filter(x=>P.has(x.sekolah_id)):[],nSel=sk?pilS.reduce((a,x)=>a+x.jumlah,0):list.length,semua=!!(sk&&sk.length&&pilS.length===sk.length);
 const tampil=sk?list.filter(x=>pilS.some(s=>s.sekolah===x.sekolah)):list;
 const pilih=sel&&sk?`<div class="note" style="margin:8px 0"><b>Pilih sekolah yang alumninya dihapus:</b><label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" ${semua?'checked':''} onchange="devAlSemua(this.checked)"> <b>Semua sekolah</b></label>${sk.map(x=>`<label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" ${P.has(x.sekolah_id)?'checked':''} onchange="devAlSek(${x.sekolah_id},this.checked)"> ${esc(x.sekolah)} <span class="mu">(${x.jumlah} alumni)</span></label>`).join('')}</div>`:'';
 return `<div class="panel"><div class="ph">🏅 5. Hapus data alumni</div><div class="pb"><div class="note" style="color:var(--rd)">Menghapus PERMANEN data alumni untuk tahun lulus yang dipilih, hanya di sekolah yang Anda centang, dan tidak bisa dikembalikan. Data alumni juga terhapus otomatis setelah 2 tahun.${sk===null&&sel?' <b>Pilihan sekolah belum aktif (SQL tambahan belum dijalankan): penghapusan berlaku untuk SEMUA sekolah.</b>':''}</div>${r?(r.length?`<div class="tb"><select class="select grow" onchange="devAlPilih(this.value)">${opt}</select></div>`:'<div class="note">Belum ada data alumni.</div>'):'<div class="note">Data alumni belum bisa dimuat. Pastikan SQL langkah 8 sudah dijalankan.</div>'}${pilih}${sel?`<details style="margin:8px 0"><summary><b>Lihat daftar nama (${tampil.length} orang)</b></summary>${tab(['No','Sekolah','Nama'],tampil.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.sekolah)}</td><td><b>${esc(x.nama)}</b></td></tr>`).join(''),'Tidak ada data')}</details><button class="btn danger" ${(sk&&!P.size)?'disabled':''} onclick="devHapusAlumni()">🗑 Hapus alumni lulus ${esc(sel)} (${nSel} orang${sk?' di '+pilS.length+' sekolah':''})</button>`:''}</div></div>`}
function devAlPilih(v){guard(async()=>{S.devAlTh=v;S.devAlList=v?(await dbq(db.rpc('developer_alumni_daftar',{p_tahun:Number(v)})))||[]:[];S.devAlSek=null;S.devAlPil=new Set();
 if(v){try{S.devAlSek=(await dbq(db.rpc('developer_alumni_per_sekolah',{p_tahun:Number(v)})))||[]}catch(e){S.devAlSek=null}}renderV()})}
function devAlRender(){const y=window.scrollY;renderV();window.scrollTo(0,y)}
function devAlSek(id,on){const P=S.devAlPil||(S.devAlPil=new Set());on?P.add(id):P.delete(id);devAlRender()}
function devAlSemua(on){const P=S.devAlPil=new Set();if(on)(S.devAlSek||[]).forEach(x=>P.add(x.sekolah_id));devAlRender()}
function devHapusAlumni(){const th=S.devAlTh,sk=S.devAlSek,P=S.devAlPil||new Set();if(!th)return toast('Pilih tahun alumni terlebih dahulu',false);
 if(sk&&!P.size)return toast('Pilih minimal satu sekolah',false);
 const pil=sk?sk.filter(x=>P.has(x.sekolah_id)):[],n=sk?pil.reduce((a,x)=>a+x.jumlah,0):(S.devAlList||[]).length,semua=!sk||pil.length===sk.length;
 form('Hapus data alumni lulus '+th,[{k:'kf',l:'Ketik HAPUS ALUMNI untuk menghapus permanen '+n+' data alumni lulus '+th+(sk?(semua?' dari SEMUA sekolah':' dari: '+pil.map(x=>x.sekolah).join(', ')):'')}],async v=>{
  if(v.kf!=='HAPUS ALUMNI')throw new Error('Ketik persis: HAPUS ALUMNI');
  const h=semua?await dbq(db.rpc('developer_hapus_alumni',{p_tahun:Number(th)})):await dbq(db.rpc('developer_hapus_alumni_sekolah',{p_tahun:Number(th),p_sekolah:pil.map(x=>x.sekolah_id)}));
  S.devAlRing=await dbq(db.rpc('developer_alumni_ringkas')).catch(()=>null);S.devAlTh='';S.devAlList=[];S.devAlSek=null;S.devAlPil=new Set();toast(h+' data alumni dihapus');renderV()});$('#ms').textContent='Hapus permanen'}

async function unduhAlumni(t,btn){await muatLib(['exceljs','pdf']);
 if(!setUnduhBusy(btn,true,t==='xlsx'?'Membuat XLSX alumni...':'Membuat PDF alumni...'))return;
 try{await jedaUnduh();const l=alFilter(true);if(!l.length)throw new Error('Tidak ada data alumni untuk diunduh');
  const H=['No','Nama','Tempat, Tanggal Lahir','Jenis Kelamin','Alamat','WhatsApp','Tahun Masuk','Tahun Lulus','Kepala Sekolah'],rows=l.map((a,i)=>[i+1,a.nama,ttlPjg(a.tempat_lahir,a.tgl_lahir),jkNama(a.jenis_kelamin),a.alamat||'',a.no_wa?('0'+String(a.no_wa).replace(/^62/,'')):'',a.tahun_masuk||'',a.tahun_lulus,a.kepala_sekolah||'']);
  if(t==='xlsx'){await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
   const wb=new ExcelJS.Workbook();wb.creator=ns();const ws=wb.addWorksheet('Alumni'),ln={style:'thin',color:{argb:'FFCFD9D3'}};
   ws.columns=[{width:6},{width:28},{width:30},{width:16},{width:36},{width:20},{width:14},{width:14},{width:26}];ws.addRow(H);ws.getRow(1).height=24;
   ws.getRow(1).eachCell(c=>{c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176B3A'}};c.alignment={horizontal:'center',vertical:'middle'};c.border={top:ln,left:ln,bottom:ln,right:ln}});
   rows.forEach(x=>{const r=ws.addRow(x);r.eachCell(c=>{c.font={name:'Arial',size:10};c.border={top:ln,left:ln,bottom:ln,right:ln};c.alignment={vertical:'middle'}});r.getCell(3).numFmt='@';r.getCell(6).numFmt='@'});
   ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:'I'+(rows.length+1)};await tulisXlsx(wb,'data-alumni.xlsx')}
  else{const d=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});d.setFont('helvetica','bold');d.setFontSize(14);d.setTextColor(23,107,58);d.text('DATA ALUMNI - '+ns().toUpperCase(),148.5,10,{align:'center'});d.setFontSize(9);d.setTextColor(80,100,90);d.text('Dicetak '+fmt(TODAY),148.5,16,{align:'center'});
   d.autoTable({startY:21,head:[H],body:rows,theme:'grid',styles:{font:'helvetica',fontSize:8.5,cellPadding:2.5,valign:'middle'},headStyles:{fillColor:[23,107,58],textColor:[255,255,255],fontStyle:'bold',halign:'center'},columnStyles:{0:{cellWidth:8},1:{cellWidth:40},2:{cellWidth:38},3:{cellWidth:18},4:{cellWidth:38},5:{cellWidth:28},6:{cellWidth:16},7:{cellWidth:16},8:{cellWidth:38}}});d.save('data-alumni.pdf')}
  toast(l.length+' data alumni sedang diproses, mohon ditunggu')}catch(e){toast('Gagal mengunduh data alumni: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

