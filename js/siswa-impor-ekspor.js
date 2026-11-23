/* ---------- download data siswa ---------- */
function kCmp(a,b){const f=n=>{const i=S.kelas.findIndex(k=>k.nama===n);return i<0?9999:i};return f(a.kelas)-f(b.kelas)||String(a.kelas).localeCompare(String(b.kelas),'id')}
const urutKN=(a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id');
function siswaRowsDownload(k,includeInactive){return S.siswa.filter(s=>(includeInactive||s.aktif)&&(!k||k==='*'||s.kelas===k)).sort((a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id'))}
function namaSheetSiswa(n,used){let x=String(n||'Kelas').replace(/[\\\/:*?\[\]]/g,' ').trim()||'Kelas';x=x.slice(0,31);let b=x,i=2;while(used.has(x)){const suf=' '+i++;x=b.slice(0,31-suf.length)+suf}used.add(x);return x}
function isiSheetSiswa(wb,list,nama){const ws=wb.addWorksheet(nama),ln={style:'thin',color:{argb:'FFCFD9D3'}},head=['Nama Lengkap','Nama Panggilan','NISN (Opsional)','Kelas','WhatsApp Ortu','Tempat Lahir (Opsional)','Tanggal Lahir (dd/mm/yyyy)','Jenis Kelamin','Alamat','Tahun Masuk (Opsional)'];ws.columns=[{width:28},{width:18},{width:18},{width:28},{width:20},{width:22},{width:24},{width:16},{width:34},{width:18}];ws.addRow(head);ws.getRow(1).height=24;ws.getRow(1).eachCell(c=>{c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176B3A'}};c.alignment={horizontal:'center',vertical:'middle'};c.border={top:ln,left:ln,bottom:ln,right:ln}});list.forEach(s=>{const r=ws.addRow([s.nama,s.pan||'',s.nisn||'',s.kelas||'',s.wa?('0'+String(s.wa).replace(/^62/,'')): '',s.tempat||'',tglDMY(s.tgl),jkNama(s.jk),s.alamat||'',String(s.masuk||'')]);r.eachCell(c=>{c.font={name:'Arial',size:10};c.border={top:ln,left:ln,bottom:ln,right:ln};c.alignment={vertical:'middle'}});r.getCell(3).numFmt='@';r.getCell(6).numFmt='@';r.getCell(7).numFmt='@';r.getCell(10).numFmt='@'});ws.getColumn(3).numFmt='@';ws.getColumn(6).numFmt='@';ws.getColumn(7).numFmt='@';ws.getColumn(10).numFmt='@';ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:'J'+Math.max(1,list.length+1)};return ws}
async function unduhSiswa(t,btn,k,includeInactive){await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,t==='xlsx'?'Membuat XLSX siswa...':'Membuat PDF siswa...'))return;try{await jedaUnduh();const list=siswaRowsDownload(k,!!includeInactive);if(!list.length)throw new Error('Tidak ada data siswa untuk diunduh');const groups=[];if(k&&k!=='*')groups.push([k,list]);else{const map=new Map();list.forEach(s=>{if(!map.has(s.kelas))map.set(s.kelas,[]);map.get(s.kelas).push(s)});map.forEach((v,n)=>groups.push([n,v]))}const suffix=k&&k!=='*'?'kelas-'+String(k).replace(/[^\w]+/g,'-'):'semua-kelas';
 if(t==='xlsx'){const wb=new ExcelJS.Workbook();wb.creator=ns();const used=new Set();groups.forEach(([n,v])=>isiSheetSiswa(wb,v,namaSheetSiswa(n,used)));await tulisXlsx(wb,'data-siswa-'+suffix+'.xlsx')}
 else{const d=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});groups.forEach(([n,v],gi)=>{if(gi)d.addPage();d.setFont('helvetica','bold');d.setFontSize(14);d.setTextColor(23,107,58);d.text('DATA SISWA - '+ns().toUpperCase(),148.5,10,{align:'center'});d.setFontSize(9);d.setTextColor(80,100,90);d.text('Kelas: '+n+'   |   Dicetak '+fmt(TODAY),148.5,16,{align:'center'});d.autoTable({startY:21,head:[['Nama Lengkap','Nama Panggilan','NISN','Kelas','WhatsApp Ortu','Tempat, Tgl Lahir','JK','Alamat','Thn Masuk']],body:v.map(s=>[s.nama,s.pan||'',s.nisn||'',s.kelas||'',s.wa?('0'+String(s.wa).replace(/^62/,'')):'',ttlPjg(s.tempat,s.tgl),jkNama(s.jk),s.alamat||'',s.masuk||'']),theme:'grid',styles:{font:'helvetica',fontSize:9,cellPadding:3,valign:'middle'},headStyles:{fillColor:[23,107,58],textColor:[255,255,255],fontStyle:'bold',halign:'center'},columnStyles:{0:{cellWidth:42},1:{cellWidth:26},2:{cellWidth:25},3:{cellWidth:20},4:{cellWidth:29},5:{cellWidth:44},6:{cellWidth:20},7:{cellWidth:44},8:{cellWidth:18}}})});d.save('data-siswa-'+suffix+'.pdf')}
 toast(list.length+' data siswa sedang diproses, mohon ditunggu')}catch(e){toast('Gagal mengunduh data siswa: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

async function hapusWaliYatim(wids){const ids=[...new Set(wids||[])];if(!ids.length)return 0;const r=await dbq(db.from('siswa_wali').select('wali_id').in('wali_id',ids));const used=new Set((r||[]).map(x=>x.wali_id));const orphan=ids.filter(id=>!used.has(id));if(!orphan.length)return 0;await dbq(db.from('wali').delete().in('id',orphan));return orphan.length}
async function hapusSiswaBatch(ids){const j=await dbq(db.rpc('hapus_siswa_batch',{p_sekolah:SEK,p_ids:ids}));if(!j||!j.siswa)throw new Error('Tidak ada data yang terhapus. Anda mungkin tidak punya izin, atau data sudah tidak ada.');
 j.fotoGagal=false;const ps=(j.foto||[]).filter(Boolean);if(ps.length){try{const r=await db.storage.from(FOTO_BUCKET).remove(ps);if(r&&r.error)j.fotoGagal=true}catch(e){j.fotoGagal=true}ps.forEach(p=>{FC.delete(p);FU.delete(p)});fotoCsHapus(ps)}return j}
async function hapusSiswa(id){const s=siswaById(id);if(!s)return;if(!await konfirmasi('Hapus '+s.nama+'? Seluruh riwayat absensi, tabungan (termasuk saldo), foto, dan data walinya ikut terhapus dan tidak bisa dikembalikan. Bila hanya berhenti sekolah, lebih baik Nonaktifkan.',{judul:'Hapus data anak',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{const j=await hapusSiswaBatch([id]);ssel.delete(id);S.absen={};S.tab=null;await muatDasar();toast('Data anak dihapus'+(j.wali?' beserta data wali':'')+(j.tabungan?' dan riwayat tabungan':'')+(j.fotoGagal?'. File foto gagal dihapus dari penyimpanan':''),!j.fotoGagal);renderV()})}
async function hapusSiswaTerpilih(){const ids=[...ssel].filter(id=>S.siswa.some(s=>s.id===id));if(!ids.length)return toast('Belum ada siswa yang dipilih',false);if(!await konfirmasi('Hapus '+ids.length+' siswa terpilih? Seluruh riwayat absensi, tabungan (termasuk saldo), foto, dan wali yang sudah tidak dipakai akan ikut terhapus dan tidak bisa dikembalikan.',{judul:'Hapus siswa terpilih',ya:'Hapus semua',bahaya:1}))return;guard(async()=>{const j=await hapusSiswaBatch(ids);ssel.clear();sHapusMode=false;S.absen={};S.tab=null;await muatDasar();toast(j.siswa+' anak dihapus'+(j.wali?', '+j.wali+' data wali ikut dihapus':'')+(j.tabungan?', '+j.tabungan+' catatan tabungan ikut dihapus':'')+(j.siswa<ids.length?' ('+(ids.length-j.siswa)+' anak tidak terhapus)':'')+(j.fotoGagal?'. File foto gagal dihapus dari penyimpanan':''),!j.fotoGagal);renderV()})}
let impK='';
function bukaPilihFile(k){impK=k;const f=$('#fx');f.value='';f.click()}
function pilihXlsx(k){if(k!=='guru'||role==='Developer'||MB()||(izinKelola&&Date.now()<izinExp))return bukaPilihFile(k);
 mintaIzin(()=>info('Pilih file Excel guru','<div class="note">Verifikasi berhasil dan berlaku 15 menit. Pilih file Excel yang berisi data guru sesuai template terbaru.</div><button class="btn success" style="width:100%" onclick="closeM();bukaPilihFile(\'guru\')">📂 Pilih file Excel</button>'))}
async function templat(k){await muatLib('exceljs');try{await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
 const sis=k==='siswa',wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Data'),N=500,cn=S.kelas.map(x=>x.nama),ln={style:'thin',color:{argb:'FFCFD9D3'}},
 head=sis?['Nama Lengkap','Nama Panggilan','NISN (Opsional)','Kelas','WhatsApp Ortu','Tempat Lahir (Opsional)','Tanggal Lahir (dd/mm/yyyy)','Jenis Kelamin','Alamat','Tahun Masuk (Opsional)']:['Nama','NIP (Opsional)','WhatsApp (Opsional)','Username','Kata Sandi','Role'],
 contoh=sis?['Muhammad Rayyan','Rayyan','1234567890',cn[0]||'','085712345678','Situbondo','25/12/2019','Laki-laki','Jl. Mawar No. 1',TODAY.slice(0,4)]:['Siti Aminah','198001012005011001','081234567890','siti','rahasia123','Guru'],
 dv=(col,formulae,judul,msg)=>{for(let r=2;r<=N;r++)ws.getCell(r,col).dataValidation={type:'list',allowBlank:true,formulae,showErrorMessage:true,errorStyle:'stop',errorTitle:judul+' tidak valid',error:msg,showInputMessage:true,promptTitle:judul,prompt:'Pilih dari daftar'}};
 wb.creator=ns();ws.columns=sis?[{width:28},{width:18},{width:18},{width:28},{width:20},{width:22},{width:24},{width:16},{width:34},{width:18}]:[{width:28},{width:24},{width:22},{width:20},{width:18},{width:26}];ws.addRow(head);ws.addRow(contoh);
 ws.getRow(1).height=24;ws.getRow(1).eachCell(c=>{c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176B3A'}};c.alignment={horizontal:'center',vertical:'middle'};c.border={top:ln,left:ln,bottom:ln,right:ln}});
 ws.getRow(2).eachCell(c=>{c.font={name:'Arial',size:10,italic:true,color:{argb:'FF7A8B80'}}});
 ws.views=[{state:'frozen',ySplit:1}];
 for(let r=2;r<=N;r++)ws.getCell(r,sis?3:3).numFmt='@';ws.getColumn(sis?3:3).numFmt='@';if(!sis){[2,3].forEach(c=>{for(let r=2;r<=N;r++)ws.getCell(r,c).numFmt='@';ws.getColumn(c).numFmt='@'})}
 if(sis){const wsB=wb.addWorksheet('Data 2');wsB.columns=ws.columns.map(c=>({width:c.width}));wsB.addRow(head);wsB.addRow(contoh);wsB.getRow(1).height=24;wsB.getRow(1).eachCell(c=>{c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176B3A'}};c.alignment={horizontal:'center',vertical:'middle'};c.border={top:ln,left:ln,bottom:ln,right:ln}});wsB.getRow(2).eachCell(c=>{c.font={name:'Arial',size:10,italic:true,color:{argb:'FF7A8B80'}}});wsB.views=[{state:'frozen',ySplit:1}];for(let r=2;r<=N;r++)wsB.getCell(r,3).numFmt='@';wsB.getColumn(3).numFmt='@';if(cn.length){const ls=wb.addWorksheet('Pilihan',{state:'hidden'});ls.getCell('A1').value='Kelas';cn.forEach((n,i)=>{ls.getCell(i+2,1).value=n});dv(4,['Pilihan!$A$2:$A$'+(cn.length+1)],'Kelas','Pilih nama kelas dari daftar yang tersedia di sistem.');for(let r=2;r<=N;r++)wsB.getCell(r,4).dataValidation={type:'list',allowBlank:true,formulae:['Pilihan!$A$2:$A$'+(cn.length+1)],showErrorMessage:true,errorStyle:'stop',errorTitle:'Kelas tidak valid',error:'Pilih nama kelas dari daftar yang tersedia di sistem.'}}}
 else dv(6,['"Guru,Operator,Wakil Kepala Sekolah"'],'Role','Role harus Guru, Operator, atau Wakil Kepala Sekolah.');
 if(sis)wb.worksheets.filter(w=>w.state!=='hidden').forEach(w=>{for(let r=2;r<=N;r++){
  w.getCell(r,6).numFmt='@';w.getCell(r,7).numFmt='@';w.getCell(r,10).numFmt='@';
  w.getCell(r,8).dataValidation={type:'list',allowBlank:true,formulae:['"Laki-laki,Perempuan"'],showErrorMessage:true,errorStyle:'stop',errorTitle:'Jenis kelamin tidak valid',error:'Pilih Laki-laki atau Perempuan dari daftar.',showInputMessage:true,promptTitle:'Jenis kelamin',prompt:'Pilih dari daftar'};
  w.getCell(r,7).dataValidation={type:'custom',allowBlank:true,formulae:['OR(G'+r+'="",AND(LEN(G'+r+')=10,MID(G'+r+',3,1)="/",MID(G'+r+',6,1)="/"))'],showErrorMessage:true,errorStyle:'stop',errorTitle:'Format tanggal salah',error:'Tulis tanggal lahir dengan format dd/mm/yyyy, contoh 25/12/2019.',showInputMessage:true,promptTitle:'Tanggal lahir',prompt:'Format dd/mm/yyyy, contoh 25/12/2019'}}
  w.getColumn(6).numFmt='@';w.getColumn(7).numFmt='@';w.getColumn(10).numFmt='@'});
 await tulisXlsx(wb,'template-'+(sis?'data-anak':'data-guru')+'.xlsx')}catch(e){toast('Gagal membuat template: '+(e.message||e),false)}}
function impor(inp){const f=inp.files[0];if(!f)return;const k=impK;guard(async()=>{
 await muatLib('xlsx');const wb=XLSX.read(await f.arrayBuffer(),{type:'array'});const DATA_HEAD=k==='siswa'?['nama lengkap','nama panggilan','nisn (opsional)','kelas','whatsapp ortu']:['nama','nip (opsional)','whatsapp (opsional)','username','kata sandi','role'];const sheets=[];wb.SheetNames.forEach(name=>{const ws=wb.Sheets[name];const a=XLSX.utils.sheet_to_json(ws,{header:1,defval:''});const h=(a[0]||[]).map(x=>String(x||'').trim().toLowerCase());if(DATA_HEAD.every((x,i)=>h[i]===x)){const baru=k==='siswa'&&String(h[5]||'').startsWith('tempat');sheets.push({name,ws,rows:a.slice(1).filter(r=>r.some(c=>String(c).trim())).map(r=>baru?[r[0],r[1],r[2],r[3],r[4],r[6],r[7],r[8],r[9],r[5]]:r)})}});if(!sheets.length)throw new Error('Tidak ditemukan sheet data yang sesuai template. Pastikan header tabel ada di baris pertama.');const rows=[],rowSheets=[];sheets.forEach(x=>x.rows.forEach(r=>{rows.push(r);rowSheets.push(x.name)}));if(!rows.length)throw new Error('Semua sheet data kosong.');
 if(!rows.length)throw new Error('File kosong atau formatnya tidak sesuai template');
 if(k==='guru'){const hd=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:''})[0]||[];if(!String(hd[2]||'').toLowerCase().includes('whatsapp'))throw new Error('Template impor guru sudah diperbarui. Unduh Template terbaru lalu isi ulang')}
 const BATCH=50;let ok=0,gagal=[];
 const fail=(i,r,e)=>gagal.push('Sheet '+(rowSheets[i]||'-')+' - Baris '+(i+2)+' ('+(r[0]||'-')+'): '+(e.message||e));
 if(k==='guru'){
   const valid=[];
   for(let i=0;i<rows.length;i++){
     const r=rows[i].map(c=>String(c).trim());$('#ldt').textContent='Memvalidasi '+(i+1)+' dari '+rows.length+'...';
     const [nama,nip,wa,user,sandi,rl]=r,role_=KEYR[Object.keys(KEYR).find(x=>x.toLowerCase()===(rl||'Guru').toLowerCase())],waN=wa?normWA(wa):'';
     if(!nama||!user){fail(i,r,new Error('nama/username kosong'));continue}
     if(!sandi||sandi.length<6){fail(i,r,new Error('Kata sandi minimal 6 karakter'));continue}
     if(!/^[a-z0-9._-]{3,20}$/.test(user.toLowerCase())){fail(i,r,new Error('Username 3-20 karakter: huruf kecil, angka, titik, minus, atau garis bawah'));continue}
     if(!role_||role_==='developer'||role_==='kepala_sekolah'){fail(i,r,new Error('role harus Guru, Operator, Pengelola/Pengasuh, atau Wakil Kepala Sekolah'));continue}
     if(waN&&!/^628\d{8,12}$/.test(waN)){fail(i,r,new Error('Nomor WhatsApp tidak valid'));continue}
     valid.push({row:i,r,data:{nama,nip:(nip||'').trim()||null,no_wa:waN,username:user,sandi,role:role_}});
   }
   for(let b=0;b<valid.length;b+=BATCH){
     const chunk=valid.slice(b,b+BATCH),data=chunk.map(x=>x.data);$('#ldt').textContent='Mengimpor guru '+Math.min(b+BATCH,valid.length)+' dari '+valid.length+'...';
     try{
       const j=await apiGuru({aksi:'tambah_batch',data,izin:izinKelola});
       (j.results||[]).forEach(x=>{const z=chunk[x.index];if(x.ok)ok++;else fail(z.row,rows[z.row].map(c=>String(c).trim()),new Error(x.error||'Gagal membuat akun'))});
       /* NIP kini disimpan oleh server saat akun dibuat */
     }catch(e){chunk.forEach(z=>fail(z.row,rows[z.row].map(c=>String(c).trim()),e))}
   }
   await muatProfil();
 }else{
   const valid=[];
   const existing=new Set(S.siswa.map(x=>String(x.nama||'').toLowerCase()+'|'+x.kelas_id));
   const incoming=new Set();let incomingNISN=new Set();
   for(let i=0;i<rows.length;i++){
     const r=rows[i].map(c=>String(c).trim());$('#ldt').textContent='Memvalidasi '+(i+1)+' dari '+rows.length+'...';
     const [nama,pan,nisnRaw,kl,wa,tglRaw,jkRaw,alamatRaw,masukRaw,tempatRaw]=r,nisn=normNISN(nisnRaw),kid_=kid(kl),key=String(nama||'').toLowerCase()+'|'+kid_;
     if(!nama){fail(i,r,new Error('nama kosong'));continue}
     if(!validNISN(nisn)){fail(i,r,new Error('NISN harus tepat 10 digit atau dikosongkan'));continue}
     if(!kid_){fail(i,r,new Error('kelas "'+kl+'" tidak ada'));continue}
     const tgl_=parseTglLahir(tglRaw),jk_=parseJK(jkRaw),masuk_=parseMasuk(masukRaw);
     const tempat_=String(tempatRaw||'').replace(/\s+/g,' ').trim();if(tempat_.length>50){fail(i,r,new Error('tempat lahir maksimal 50 karakter'));continue}
     if(tgl_==='x'){fail(i,r,new Error('tanggal lahir harus berformat dd/mm/yyyy (contoh 25/12/2019)'));continue}
     if(jk_==='x'){fail(i,r,new Error('jenis kelamin harus Laki-laki atau Perempuan'));continue}
     if(masuk_==='x'){fail(i,r,new Error('tahun masuk harus 4 digit angka'));continue}
     if(nisn&&S.siswa.some(x=>x.nisn===nisn)){fail(i,r,new Error('NISN '+nisn+' sudah digunakan'));continue}
     if(incomingNISN&&nisn&&incomingNISN.has(nisn)){fail(i,r,new Error('NISN '+nisn+' muncul lebih dari sekali'));continue}
     if(existing.has(key)||incoming.has(key)){fail(i,r,new Error('sudah ada'));continue}
     incoming.add(key);if(!incomingNISN)incomingNISN=new Set();if(nisn)incomingNISN.add(nisn);valid.push({row:i,r,data:{nama,nama_panggilan:pan||nama.split(' ')[0],nisn:nisn||null,kelas_id:kid_,wa:normWA(wa),tgl:tgl_,jk:jk_,alamat:(alamatRaw||'').trim()||null,masuk:masuk_,tempat:tempat_||null}});
   }
   for(let b=0;b<valid.length;b+=BATCH){
     const chunk=valid.slice(b,b+BATCH);$('#ldt').textContent='Mengimpor siswa '+Math.min(b+BATCH,valid.length)+' dari '+valid.length+'...';
     let inserted=[];
     try{inserted=await dbq(db.from('siswa').insert(chunk.map(x=>({nama:x.data.nama,nama_panggilan:x.data.nama_panggilan,nisn:x.data.nisn,kelas_id:x.data.kelas_id,tempat_lahir:x.data.tempat,tgl_lahir:x.data.tgl,jenis_kelamin:x.data.jk,alamat:x.data.alamat,tahun_masuk:x.data.masuk}))).select())}
     catch(e){
       for(const z of chunk){try{const n=await dbq(db.from('siswa').insert({nama:z.data.nama,nama_panggilan:z.data.nama_panggilan,nisn:z.data.nisn,kelas_id:z.data.kelas_id,tempat_lahir:z.data.tempat,tgl_lahir:z.data.tgl,jenis_kelamin:z.data.jk,alamat:z.data.alamat,tahun_masuk:z.data.masuk}).select().single());inserted.push(n);await setWali(n.id,z.data.wa);ok++}catch(err){fail(z.row,z.r,err)}}
       continue;
     }
     const byKey=new Map(inserted.map(n=>[String(n.nama).toLowerCase()+'|'+n.kelas_id,n]));
     const waliRows=chunk.filter(z=>z.data.wa).map(z=>({no_wa:z.data.wa}));
     try{
       if(waliRows.length)await dbq(db.from('wali').upsert(waliRows,{onConflict:'no_wa'}));
       const was=waliRows.length?await dbq(db.from('wali').select('id,no_wa').in('no_wa',[...new Set(waliRows.map(x=>x.no_wa))])):[];
       const wid=new Map(was.map(w=>[w.no_wa,w.id]));
       const rel=[];for(const z of chunk){const n=byKey.get(String(z.data.nama).toLowerCase()+'|'+z.data.kelas_id);if(!n)throw new Error('Data siswa hasil insert tidak ditemukan');if(z.data.wa)rel.push({siswa_id:n.id,wali_id:wid.get(z.data.wa)});}
       if(rel.length)await dbq(db.from('siswa_wali').insert(rel));
       ok+=chunk.length;
     }catch(e){
       for(const z of chunk){const n=byKey.get(String(z.data.nama).toLowerCase()+'|'+z.data.kelas_id);if(!n){fail(z.row,z.r,e);continue}try{if(z.data.wa)await setWali(n.id,z.data.wa);ok++}catch(err){fail(z.row,z.r,err)}}
     }
   }
   await muatDasar();
 }
 renderV();info('Hasil impor','<div class="note">📄 Sheet terdeteksi: <b>'+sheets.length+'</b><br>✅ Berhasil: <b>'+ok+'</b> data<br>❌ Gagal: <b>'+gagal.length+'</b> data</div>'+(gagal.length?'<div class="mu">'+gagal.map(esc).join('<br>')+'</div>':''))
})}
