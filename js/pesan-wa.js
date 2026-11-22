/* Kelompok fitur: pesan WhatsApp masuk, riwayat status, dan pengelolaan pesan. */
/* ---------- pesan WA ---------- */
let psel=new Set(),pHapusMode=false,pesTab='masuk';
V.pesan=()=>{
 const tbar=`<div class="utabs">${[['masuk','💬 Pesan Masuk'],['riwayat','📋 Riwayat Status Pesan']].map(x=>`<button class="utab${pesTab===x[0]?' on':''}" onclick="pesHal('${x[0]}')">${x[1]}</button>`).join('')}</div>`;
 if(pesTab==='riwayat'){setTimeout(()=>{if(view==='pesan'&&pesTab==='riwayat')pesRkMuat()},0);
  return `<div class="panel"><div class="ph">💬 Pesan WA <button class="btn soft sm" onclick="pesRkMuat()">🔄 Perbarui</button></div><div class="pb">${tbar}<div class="tb"><select class="select" onchange="pesRkF=this.value;pesRkTampil()">${PES_ST.map(x=>`<option value="${x[0]}"${pesRkF===x[0]?' selected':''}>${x[1]}</option>`).join('')}</select></div><div id="rkIsi"><div class="note">Memuat...</div></div></div></div>`}
 const all=S.pesan.length&&S.pesan.every(p=>psel.has(p.id));
 const aksi=pHapusMode
  ?`<span class="tb tbgrid" style="margin:0"><button id="pHapusBtn" class="btn danger sm" ${psel.size?'':'disabled'} onclick="hapusPesan()">🗑 Hapus terpilih (${psel.size})</button><button class="btn soft sm" onclick="batalHapusPesan()">✖ Batal</button></span>`
  :`<button class="btn danger sm" onclick="bukaHapusPesan()">🗑 Hapus</button>`;
 const head=pHapusMode
  ?['<input type="checkbox" '+(all?'checked':'')+' id="pCekAll" onchange="pilihSemuaPesan(this.checked)">','Waktu','Dari','Isi','Hasil','Status Balasan','Aksi']
  :['Waktu','Dari','Isi','Hasil','Status Balasan','Aksi'];
 const rows=S.pesan.map(p=>`<tr>${pHapusMode?`<td><input type="checkbox" class="ckp" ${psel.has(p.id)?'checked':''} onchange="pilihPesan(${p.id},this.checked)"></td>`:''}<td>${esc(p.waktu)}</td><td>${esc(p.dari)}</td><td>${esc(p.isi)}</td><td>${esc(p.hasil)}</td><td>${pesBalasSel(p)}</td><td><div style="display:flex;flex-direction:column;gap:6px">${p.cek?`<button class="btn sm orange" onclick="doneMsg(${p.id})">Tandai selesai</button>`:'<span class="mu">Selesai</span>'}${p.dibalas?`<button class="btn sm soft" onclick="tandaiBalas(${p.id},false)">Batal dibalas</button>`:`<button class="btn sm success" onclick="tandaiBalas(${p.id},true)">Tandai dibalas</button>`}</div></td></tr>`).join('');
 return `<div class="panel"><div class="ph">💬 Pesan WhatsApp Masuk ${aksi}</div><div class="pb">${tbar}<div class="note">${pHapusMode?'Mode hapus aktif. Centang pesan yang ingin dihapus, atau centang kotak di judul kolom untuk memilih semua. Tekan Batal untuk keluar tanpa menghapus.':'Semua pesan dari orang tua tercatat di sini (100 terbaru). Tekan tombol Hapus bila ingin memilih pesan untuk dihapus.'}</div>${tab(head,rows)}</div></div>`};
let pesRkRows=[],pesRkF='';
const PES_ST=[['','Semua status'],['terjadwal','Terjadwal'],['proses','Diproses'],['nokabar','Belum ada kabar'],['terkirim','Terkirim'],['sampai','Sampai'],['terbaca','Terbaca'],['gagal','Gagal']];
function pesRkTampil(){const el=$('#rkIsi');if(!el)return;const f=pesRkF?pesRkRows.filter(r=>rkTahap(r)===pesRkF):pesRkRows;
 el.innerHTML=(pesRkF?'<div class="mu" style="margin-bottom:8px">Menampilkan '+f.length+' dari '+pesRkRows.length+' pesan</div>':'')+(pesRkF&&!f.length?'<div class="note">Tidak ada pesan dengan status ini.</div>':rkHtml(f))}
async function pesRkMuat(){try{const rows=await dbq(db.from('kirim_log').select('batch_id,jenis,judul,label,nomor,status,status_fonnte,state_fonnte,error,jadwal_pada,dibuat,waktu_terkirim,waktu_sampai,waktu_terbaca').eq('sekolah_id',SEK).order('dibuat',{ascending:false}).limit(400));pesRkRows=rows||[];pesRkTampil()}catch(e){const el=$('#rkIsi');if(el)el.innerHTML='<div class="note">Riwayat belum bisa dibaca: '+esc(e.message||String(e))+'</div>'}}
function pesBalasSel(p){if(p.auto)return '<div class="rkt">✅ Dibalas</div><div class="mu">otomatis · '+rkJam(p.auto)+'</div>';
 if(p.dibalas)return '<div class="rkt">✅ Sudah dibalas</div><div class="mu">manual'+(p.dibalasPada?' · '+rkJam(p.dibalasPada):'')+'</div>';
 return '<div class="rkt">⏳ Belum dibalas</div>'+(/^ragu/i.test(p.hasil||'')?'<div class="mu">⚠ Perlu perhatian</div>':'')}
function tandaiBalas(id,on){if(!PES_ADA_KOL)return toast('Kolom sudah_dibalas belum ada di tabel pesan_masuk. Jalankan SQL penambahan kolom di Supabase dulu.',false);
 guard(async()=>{await dbq(db.from('pesan_masuk').update({sudah_dibalas:on,dibalas_pada:on?new Date().toISOString():null}).eq('id',id));await muatPesan();renderV()})}
function pesHal(t){pesTab=t;pHapusMode=false;psel.clear();renderV()}
function bukaHapusPesan(){pHapusMode=true;psel.clear();renderV()}
function batalHapusPesan(){pHapusMode=false;psel.clear();renderV()}
function pesanCekUI(){const r=cekBaris('#v .ckp');cekHdr('pCekAll',r.length,r.filter(x=>x.checked).length);cekBtn('pHapusBtn',psel.size,'🗑 Hapus terpilih')}
function pilihPesan(id,on){on?psel.add(id):psel.delete(id);pesanCekUI()}
function pilihSemuaPesan(on){psel=new Set(on?S.pesan.map(p=>p.id):[]);cekBaris('#v .ckp').forEach(x=>x.checked=on);pesanCekUI()}
async function hapusPesan(){const ids=[...psel];if(!ids.length||!await konfirmasi('Hapus '+ids.length+' pesan terpilih? Tidak bisa dikembalikan.',{judul:'Hapus pesan',ya:'Hapus',bahaya:1}))return;guard(async()=>{await dbq(db.from('pesan_masuk').delete().in('id',ids));psel.clear();pHapusMode=false;await muatPesan();toast(ids.length+' pesan dihapus');renderV()})}

function doneMsg(id){guard(async()=>{await dbq(db.from('pesan_masuk').update({perlu_dicek:false}).eq('id',id));await muatPesan();renderV()})}
