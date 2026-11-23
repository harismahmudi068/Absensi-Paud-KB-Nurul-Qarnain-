/* ---------- siswa ---------- */
let ssel=new Set(),sk='',sNon=false;
function togNonaktif(){sNon=!sNon;ssel.clear();renderV()}
let sHapusMode=false,attQ='',kkQ='',loQ='',gQ='';
function bukaHapusSiswa(){sHapusMode=true;ssel.clear();renderV()}
function batalHapusSiswa(){sHapusMode=false;ssel.clear();renderV()}
V.siswa=()=>{
 const shown=S.siswa.filter(s=>(sNon?!s.aktif:sk&&(sk==='*'||s.kelas===sk))&&(s.nama.toLowerCase().includes(q.toLowerCase())||String(s.nisn||'').includes(q.trim())||cocokWA(s.wa,q)));
 const all=shown.length>0&&shown.every(s=>ssel.has(s.id));
 const aksi=sHapusMode
   ? `<button id="sHapusBtn" class="btn danger sm" ${ssel.size?'':'disabled'} onclick="hapusSiswaTerpilih()">🗑 Hapus terpilih (${ssel.size})</button><button class="btn soft sm" onclick="batalHapusSiswa()">✖ Batal</button>`
   : `<button class="btn danger sm" onclick="bukaHapusSiswa()">🗑 Hapus</button>`;
 const head=sHapusMode
   ? ['<input type="checkbox" '+(all?'checked':'')+' id="sCekAll" onchange="pilihSemuaSiswa(this.checked)">','No','Nama','NISN','Kelas','Tempat, Tgl Lahir','JK','Alamat','Tahun Masuk','WhatsApp Ortu','Status','Aksi']
   : ['No','Nama','NISN','Kelas','Tempat, Tgl Lahir','JK','Alamat','Tahun Masuk','WhatsApp Ortu','Status','Aksi'];
 return `<div class="panel"><div class="ph">👥 Data Siswa <span class="tb tbgrid" style="margin:0">${aksi}<button class="btn ${sNon?'success':'soft'} sm" onclick="togNonaktif()">${sNon?'✖ Tutup Nonaktif':'⏸ Nonaktif ('+S.siswa.filter(x=>!x.aktif).length+')'}</button><button class="btn soft sm" onclick="templat('siswa')">⬇ Template</button><button class="btn soft sm" onclick="pilihXlsx('siswa')">⬆ Impor XLSX</button><button class="btn success sm add" onclick="addSiswa()">+ Siswa</button></span></div><div class="pb"><div class="tb"><select class="select" onchange="sk=this.value;sNon=false;ssel.clear();renderV()">${kopt3(sk)}</select><input id="q" class="input grow search-smooth" placeholder="Cari nama, NISN, atau nomor WhatsApp..." value="${esc(q)}" oninput="cariSiswaInput(this)"></div><div class="tb"><button class="btn success sm dl" onclick="unduhSiswa('pdf',this,sk||'*')">⬇ PDF</button><button class="btn sm dl pdf" onclick="unduhSiswa('xlsx',this,sk||'*')">⬇ XLSX</button></div>${sNon?'<div class="note" style="border:2px solid #d99a27">Menampilkan <b>seluruh siswa nonaktif</b> dari semua kelas. Ketuk menu ✏️ pada siswa lalu pilih Aktifkan untuk mengaktifkannya kembali, atau pilih kelas untuk kembali ke daftar biasa.</div>':''}<div class="note">File XLSX dapat diedit kembali dan dipisahkan menjadi <b>sheet per kelas</b>. Pilih <b>Semua kelas</b> untuk seluruh data. Tombol ini tersedia untuk semua guru.</div>${tab(head,'<tbody id="sb"></tbody>').replace('<tbody><tbody id="sb"></tbody></tbody>','<tbody id="sb">'+siswaRows()+'</tbody>')}</div></div>`;
};
function siswaRows(){if(!sk&&!sNon)return '<tr><td colspan="12" class="mu" style="text-align:center">'+PKM+'</td></tr>';const hs=S.siswa.filter(s=>(sNon?!s.aktif:(sk==='*'||s.kelas===sk))&&(s.nama.toLowerCase().includes(q.toLowerCase())||String(s.nisn||'').includes(q.trim())||cocokWA(s.wa,q))).map((s,i)=>{
 const pilih=sHapusMode?`<td><input type="checkbox" class="cks" data-id="${s.id}" ${ssel.has(s.id)?'checked':''} onchange="pilihSiswa(${s.id},this.checked)"></td>`:'';
 return `<tr style="cursor:pointer" title="Ketuk kolom baris siswa untuk mengedit profil" onclick="if(!event.target.closest('button,input')&&!event.target.closest('td:nth-last-child(-n+3)'))ubahSiswa(${s.id})">${pilih}<td>${i+1}</td><td><b>${esc(s.nama)}</b><div class="mu">${esc(s.pan)}</div></td><td>${esc(s.nisn||'-')}</td><td>${esc(s.kelas)}</td><td>${esc(ttlPjg(s.tempat,s.tgl))||'-'}</td><td>${jkNama(s.jk)||'-'}</td><td>${esc(s.alamat||'-')}</td><td>${s.masuk||'-'}</td><td><span class="wa-siswa-cell">${nomorHtml(s.wa)}<button type="button" class="wa-edit-btn" onclick="editWaSiswa(${s.id})" title="Ubah nomor WhatsApp" aria-label="Ubah nomor WhatsApp siswa ${esc(s.nama)}">✏️</button></span></td><td>${s.aktif?'<span class="badge Hadir">Aktif</span>':`<button type="button" class="badge Belum" style="cursor:pointer;border:0;font:inherit" title="Ketuk untuk mengaktifkan" onclick="togSiswa(${s.id})">Nonaktif ▶ Aktifkan</button>`}</td><td><button class="btn sm soft aksi-btn" aria-label="Aksi" onclick="aksiSiswa(${s.id},this)">✏️</button></td></tr>`;
}).join('');return hs||(sNon?'<tr><td colspan="12" class="mu" style="text-align:center">Tidak ada siswa nonaktif.</td></tr>':'')}

function editWaSiswa(id){
 const s=siswaById(id);if(!s)return;
 info('Ubah nomor WhatsApp · '+s.nama,`
 <div class="fd"><label class="l" for="waSiswaInp">Nomor WhatsApp orang tua</label><input id="waSiswaInp" class="input" type="tel" inputmode="tel" autocomplete="tel" maxlength="20" value="${esc(nomorLokal(s.wa))}" placeholder="08xxxxxxxxxx"><div class="mu" style="margin-top:5px">Gunakan nomor aktif WhatsApp. Nomor boleh diawali 08 atau 628.</div></div>
 <div class="tb" style="margin-top:12px"><button type="button" class="btn soft grow" onclick="closeM()">Batal</button><button type="button" class="btn success grow" onclick="simpanWaSiswa(${id})">💾 Simpan</button></div>`);
 setTimeout(()=>{const e=$('#waSiswaInp');if(e){e.focus();e.select();e.addEventListener('keydown',ev=>{if(ev.key==='Enter')simpanWaSiswa(id)})}},80);
}
function simpanWaSiswa(id){
 const s=siswaById(id),el=$('#waSiswaInp');if(!s||!el)return;
 const raw=el.value.trim(),wa=raw?normWA(raw):'';
 if(raw&&!/^628\d{8,12}$/.test(wa))return toast('Nomor WhatsApp tidak valid. Gunakan nomor Indonesia yang benar.',false);
 if(wa===normWA(s.wa))return closeM();
 guard(async()=>{
  await setWali(id,wa);
  await muatDasar();
  closeM();toast('Nomor WhatsApp '+s.nama+' berhasil diperbarui');renderV();
 });
}

function cariSiswaInput(el){q=el.value;const tb=$('#sb');if(tb)tb.innerHTML=siswaRows();}
/* centang cepat: hanya ubah kotak, hitungan, dan tombol yang terlihat (tanpa membangun ulang halaman) */
/* seluruh sel yang berisi kotak centang ikut menjadi area ketuk */
document.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('#v td,#v th');if(!c||e.target.tagName==='INPUT')return;const k=c.firstElementChild;if(!k||c.children.length!==1||k.tagName!=='INPUT'||k.type!=='checkbox'||k.disabled||c.textContent.trim())return;k.checked=!k.checked;k.dispatchEvent(new Event('change',{bubbles:true}))});
function cekHdr(id,tot,n){const a=document.getElementById(id);if(a){a.checked=tot>0&&n===tot;a.indeterminate=n>0&&n<tot}}
function cekBtn(id,n,t){const b=document.getElementById(id);if(b){b.disabled=!n;b.textContent=t+' ('+n+')'}}
function cekBaris(sel){return [...document.querySelectorAll(sel)]}
function siswaCekUI(){const r=cekBaris('#sb .cks');cekHdr('sCekAll',r.length,r.filter(x=>x.checked).length);cekBtn('sHapusBtn',ssel.size,'🗑 Hapus terpilih')}
function pilihSiswa(id,on){on?ssel.add(id):ssel.delete(id);siswaCekUI()}
function pilihSemuaSiswa(on){cekBaris('#sb .cks').forEach(x=>{x.checked=on;const i=+x.dataset.id;on?ssel.add(i):ssel.delete(i)});siswaCekUI()}
async function setWali(sid,wa){await dbq(db.from('siswa_wali').delete().eq('siswa_id',sid));if(!wa)return;const w=await dbq(db.from('wali').upsert({no_wa:wa},{onConflict:'no_wa'}).select().single());await dbq(db.from('siswa_wali').insert({siswa_id:sid,wali_id:w.id}))}
const kid=n=>(S.kelas.find(k=>k.nama.toLowerCase()===String(n||'').trim().toLowerCase())||{}).id||null;
function belumAdaKelas(){if(!kelola())return toast('Belum ada kelas. Minta Kepala Sekolah menambahkannya di menu Pengaturan',false);info('Belum ada kelas','<div style="text-align:center;padding:6px 4px"><div style="font-size:42px">🏫</div><p>Siswa harus dimasukkan ke dalam kelas. Tambahkan kelas terlebih dahulu.</p><button class="btn success" style="width:100%" onclick="closeM();addKelas()">+ Tambah Kelas</button><button class="btn soft" style="width:100%;margin-top:8px" onclick="lompatPengaturan(\'pnKelas\')">Buka Pengaturan Kelas</button></div>')}
function addSiswa(){if(!S.kelas.length)return belumAdaKelas();form('Tambah Siswa',[{k:'nama',l:'Nama lengkap'},{k:'pan',l:'Nama panggilan'},{k:'nisn',l:'NISN (opsional)',t:'tel'},{k:'kelas',l:'Kelas',o:S.kelas.map(k=>k.nama)},{k:'wa',l:'WhatsApp orang tua (08...)',t:'tel'},{k:'tempat',l:'Tempat lahir (opsional)'},{k:'tgl',l:'Tanggal lahir (opsional)',t:'date',ref:(+TODAY.slice(0,4)-4)+'-01-01'},{k:'jk',l:'Jenis kelamin',o:['-','Laki-laki','Perempuan']},{k:'alamat',l:'Alamat (opsional)'},{k:'masuk',l:'Tahun masuk',t:'year',v:TODAY.slice(0,4)}],async v=>{if(!v.nama||!v.pan)throw new Error('Nama dan panggilan wajib diisi');const nisn=normNISN(v.nisn);if(!validNISN(nisn))throw new Error('NISN harus tepat 10 digit atau dikosongkan');
 const dup=nisn?S.siswa.find(x=>x.nisn===nisn):null;if(dup)throw new Error('NISN sudah digunakan oleh '+dup.nama);
 const s=await dbq(db.from('siswa').insert({nama:v.nama,nama_panggilan:v.pan,nisn:nisn||null,kelas_id:kid(v.kelas),...siswaExtra(v)}).select().single());await setWali(s.id,normWA(v.wa));await muatDasar();toast('Siswa tersimpan');renderV()})}
function ubahSiswa(id){const s=siswaById(id);form('Ubah Siswa',[{k:'nama',l:'Nama lengkap',v:s.nama},{k:'pan',l:'Nama panggilan',v:s.pan},{k:'nisn',l:'NISN (opsional)',t:'tel',v:s.nisn},{k:'kelas',l:'Kelas (hanya dibaca, pindah kelas lewat menu Kelola Siswa)',ro:1,v:s.kelas||'-'},{k:'wa',l:'WhatsApp orang tua',t:'tel',v:s.wa},{k:'tempat',l:'Tempat lahir (opsional)',v:s.tempat},{k:'tgl',l:'Tanggal lahir (opsional)',t:'date',v:s.tgl,ref:(+TODAY.slice(0,4)-4)+'-01-01'},{k:'jk',l:'Jenis kelamin',o:['-','Laki-laki','Perempuan'],v:jkNama(s.jk)||'-'},{k:'alamat',l:'Alamat (opsional)',v:s.alamat},{k:'masuk',l:'Tahun masuk',t:'year',v:String(s.masuk||'')}],async v=>{if(!v.nama||!v.pan)throw new Error('Nama dan panggilan wajib diisi');const nisn=normNISN(v.nisn);if(!validNISN(nisn))throw new Error('NISN harus tepat 10 digit atau dikosongkan');
 const dup=nisn?S.siswa.find(x=>x.id!==id&&x.nisn===nisn):null;if(dup)throw new Error('NISN sudah digunakan oleh '+dup.nama);
 await dbq(db.from('siswa').update({nama:v.nama,nama_panggilan:v.pan,nisn:nisn||null,...siswaExtra(v)}).eq('id',id));if(normWA(v.wa)!==s.wa)await setWali(id,normWA(v.wa));await muatDasar();toast('Data siswa diperbarui');renderV()});
 $('#mbd').insertAdjacentHTML('afterbegin',fotoBlok(s));fotoSiap(s).then(()=>fotoBlokUlang(s))}
function togSiswa(id){guard(async()=>{const s=siswaById(id);await dbq(db.from('siswa').update({aktif:!s.aktif}).eq('id',id));s.aktif=!s.aktif;toast(s.nama+(s.aktif?' diaktifkan':' dinonaktifkan'));renderV()})}
