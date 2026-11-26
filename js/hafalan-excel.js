/* --- Hafalan: unduh dan impor Excel --- */
async function hfUnduh(jenis,btn){await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,'Menyiapkan...'))return;
 try{await jedaUnduh();const sem=hfK==='*',kl=sem?{nama:'Semua kelas'}:S.kelas.find(k=>k.nama===hfK);if(!kl)throw new Error('Pilih kelas dulu');if(hfSetK!==hfK)throw new Error('Data setoran masih dimuat, coba lagi sebentar');
  const tgt=sem?[]:hfTarget(kl.id),sis=sem?S.siswa.filter(s=>s.aktif).sort(urutKN):S.siswa.filter(s=>s.aktif&&s.kelas_id===kl.id),tM=new Map(),TK=id=>{if(!tM.has(id))tM.set(id,hfTarget(id));return tM.get(id)},nf=ns().replace(/[^\w]+/g,'-')+'-Kelas-'+kl.nama.replace(/[^\w]+/g,'-');
  if(jenis==='xlsx'){await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat. Muat ulang halaman');
   const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();
   const hd=(ws,H)=>H.forEach((h,i)=>{const c=ws.getCell(1,i+1);c.value=h;c.font={bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9E3F7'}}});
   if(sem){const w1=wb.addWorksheet('Rekap');w1.columns=[{width:6},{width:32},{width:18},{width:12},{width:12},{width:10},{width:14}];hd(w1,['No','Nama','Kelas','Lancar','Mengulang','Belum','Total hafalan']);
    sis.forEach((s,n)=>{const st=hfStat(s.id,TK(s.kelas_id));w1.addRow([n+1,s.nama,s.kelas||'',st.l,st.u,st.t-st.l-st.u,st.t])});
    const used=new Set(['Rekap']);S.kelas.forEach(k=>{const ss=sis.filter(s=>s.kelas_id===k.id),tg=TK(k.id);if(!ss.length||!tg.length)return;const w2=wb.addWorksheet(namaSheetSiswa('Rincian '+k.nama,used));w2.columns=[{width:32},...tg.map(()=>({width:18}))];hd(w2,['Nama',...tg.map(i=>(hfJ(i.jenis_id).nama||'')+': '+i.judul)]);
     ss.forEach(s=>{const st=hfStat(s.id,tg);w2.addRow([s.nama,...tg.map(i=>{const x=st.m.get(i.id);return x?(x.hasil==='lancar'?'Lancar ':'Mengulang ')+x.tanggal:''})])})})}
   else{const w1=wb.addWorksheet('Rekap');w1.columns=[{width:6},{width:32},{width:12},{width:12},{width:10},{width:14}];hd(w1,['No','Nama','Lancar','Mengulang','Belum','Total hafalan']);
   sis.forEach((s,n)=>{const st=hfStat(s.id,tgt);w1.addRow([n+1,s.nama,st.l,st.u,st.t-st.l-st.u,st.t])});
   const w2=wb.addWorksheet('Rincian');w2.columns=[{width:32},...tgt.map(()=>({width:18}))];hd(w2,['Nama',...tgt.map(i=>(hfJ(i.jenis_id).nama||'')+': '+i.judul)]);
   sis.forEach(s=>{const st=hfStat(s.id,tgt);w2.addRow([s.nama,...tgt.map(i=>{const x=st.m.get(i.id);return x?(x.hasil==='lancar'?'Lancar ':'Mengulang ')+x.tanggal:''})])})}
   for(const ws of wb.worksheets){const k=sem?(ws.name==='Rekap'?'':ws.name.replace(/^Rincian /,'')):kl.nama,row=ws.rowCount+2;await xlsxTtdRekap(wb,ws,k,row,1,4,5);if(k)ws.getCell(row+5,1).value='Wali Kelas: '+(ttdWali(k)?.nama||'-');ws.getCell(row+5,5).value='Kepala Sekolah: '+(ttdKepsek().nama||'-');if(ttdKepsek().nip)ws.getCell(row+6,5).value='NIP. '+ttdKepsek().nip}await tulisXlsx(wb,'Rekap-Hafalan-'+nf+'-'+TODAY+'.xlsx');toast('Rekap hafalan sedang diproses, mohon ditunggu');return}
  const d=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),tg=ttdKepsek(),wl=sem?null:ttdWali(kl.nama);
  d.setFont('helvetica','bold');d.setFontSize(13);d.setTextColor(0,0,0);d.text('REKAP HAFALAN - '+ns().toUpperCase(),105,14,{align:'center'});
  d.setFont('helvetica','normal');d.setFontSize(9);d.text((sem?'Semua kelas':'Kelas '+kl.nama)+'  |  Tahun ajaran '+((S.set&&S.set.tahun_ajaran)||'-')+(sem?'':'  |  Wali kelas: '+(wl?wl.nama:'-'))+'  |  '+fmt(TODAY),105,20,{align:'center'});
  const hs={fillColor:[118,80,184],halign:'center'};
  let y;
  if(sem){d.autoTable({startY:26,head:[['No','Nama','Kelas','Lancar','Mengulang','Belum']],body:sis.map((s,n)=>{const st=hfStat(s.id,TK(s.kelas_id));return[n+1,s.nama,s.kelas||'',st.l+' / '+st.t,st.u,st.t-st.l-st.u]}),theme:'grid',styles:{fontSize:8.5,cellPadding:1.6},headStyles:hs,columnStyles:{0:{halign:'center',cellWidth:10},3:{halign:'center'},4:{halign:'center'},5:{halign:'center'}}});y=d.lastAutoTable.finalY+10}
  else{d.autoTable({startY:26,head:[['No','Nama','Lancar','Mengulang','Belum']],body:sis.map((s,n)=>{const st=hfStat(s.id,tgt);return[n+1,s.nama,st.l+' / '+st.t,st.u,st.t-st.l-st.u]}),theme:'grid',styles:{fontSize:8.5,cellPadding:1.6},headStyles:hs,columnStyles:{0:{halign:'center',cellWidth:10},2:{halign:'center'},3:{halign:'center'},4:{halign:'center'}}});
  y=d.lastAutoTable.finalY+8;if(y>255){d.addPage();y=20}
  d.setFont('helvetica','bold');d.setFontSize(10);d.text('Daftar hafalan kelas',14,y);
  d.autoTable({startY:y+3,head:[['No','Jenis','Hafalan','Target']],body:tgt.map((i,n)=>[n+1,hfJ(i.jenis_id).nama||'-',i.judul,i.target||'']),theme:'grid',styles:{fontSize:8.5,cellPadding:1.6},headStyles:hs,columnStyles:{0:{halign:'center',cellWidth:10}}});
  y=d.lastAutoTable.finalY+10}
  if(y+42>285){d.addPage();y=20}
  await pdfTtdRekap(d,sem?'':kl.nama,y);
  d.save('rekap-hafalan-'+nf+'-'+TODAY+'.pdf');toast('Rekap hafalan sedang diproses, mohon ditunggu')}
 catch(e){toast('Gagal mengunduh: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
/* --- Hafalan: template dan impor Excel (batch) --- */
let HFI={rows:[],sheets:0,err:[],dup:0,dupFile:0,skip:[]};
const hfNorm=s=>String(s==null?'':s).replace(/\s+/g,' ').trim().toLowerCase();
const hfKey=(j,k,t)=>j+'|'+(k||0)+'|'+hfNorm(t);
async function hfTemplate(btn){await muatLib('exceljs');if(!setUnduhBusy(btn,true,'Menyiapkan...'))return;
 try{await jedaUnduh();await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
  if(!S.hfJenis.length)throw new Error('Buat dulu minimal satu jenis hafalan di tab Jenis');
  const N=1000,ln={style:'thin',color:{argb:'FFCFD9D3'}},wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();
  const kl=['Wajib semua kelas',...S.kelas.map(k=>k.nama)],jn=S.hfJenis.map(j=>j.nama),head=['Kelas','Jenis','Judul Hafalan','Target (Opsional)'];
  const fk=['Pilihan!$A$2:$A$'+(kl.length+1)],fj=['Pilihan!$B$2:$B$'+(jn.length+1)];
  const mk=nama=>{const ws=wb.addWorksheet(nama);ws.columns=[{width:26},{width:24},{width:40},{width:26}];ws.addRow(head);ws.getRow(1).height=24;
   ws.getRow(1).eachCell(c=>{c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176B3A'}};c.alignment={horizontal:'center',vertical:'middle'};c.border={top:ln,left:ln,bottom:ln,right:ln}});
   ws.views=[{state:'frozen',ySplit:1}];
   for(let r=2;r<=N;r++){
    ws.getCell(r,1).dataValidation={type:'list',allowBlank:true,formulae:fk,showErrorMessage:true,errorStyle:'stop',errorTitle:'Kelas tidak valid',error:'Pilih kelas dari daftar. Untuk hafalan semua kelas pilih "Wajib semua kelas".',showInputMessage:true,promptTitle:'Kelas',prompt:'Pilih dari daftar'};
    ws.getCell(r,2).dataValidation={type:'list',allowBlank:true,formulae:fj,showErrorMessage:true,errorStyle:'stop',errorTitle:'Jenis tidak valid',error:'Pilih jenis hafalan dari daftar yang tersedia di sistem.',showInputMessage:true,promptTitle:'Jenis',prompt:'Pilih dari daftar'}}};
  mk('Hafalan');mk('Hafalan 2');
  const ls=wb.addWorksheet('Pilihan',{state:'hidden'});ls.getCell('A1').value='Kelas';ls.getCell('B1').value='Jenis';kl.forEach((n,i)=>{ls.getCell(i+2,1).value=n});jn.forEach((n,i)=>{ls.getCell(i+2,2).value=n});
  const pt=wb.addWorksheet('Petunjuk');pt.columns=[{width:30},{width:30},{width:38},{width:28}];
  const tx=['PETUNJUK IMPOR DAFTAR HAFALAN','',
   '1. Isi sheet "Hafalan". Anda boleh memakai beberapa sheet (sheet "Hafalan 2" atau salinan sheet lain) asal baris pertamanya sama dengan template. Nama sheet bebas dan tidak dipakai.',
   '2. Kolom Kelas dan Jenis dipilih dari dropdown. Kelas dibaca dari isi kolom Kelas pada tiap baris, bukan dari nama sheet.',
   '3. "Wajib semua kelas" hanya untuk jenis yang cakupannya Wajib semua kelas. Kelas tertentu hanya untuk jenis yang cakupannya Per kelas.',
   '4. Judul hafalan maksimal 100 huruf dan target maksimal 120 huruf. Jangan mengubah judul kolom di baris pertama.',
   '5. Hafalan yang sama dengan daftar yang sudah ada (kelas, jenis, dan judul sama) dilewati. Impor hanya menambah, tidak mengubah atau menghapus.','',
   'Contoh pengisian (jangan disalin ke sheet data kecuali memang diperlukan):'];
  tx.forEach(t=>pt.addRow([t]));pt.getRow(1).font={name:'Arial',size:13,bold:true};
  const jw=S.hfJenis.find(j=>j.cakupan==='wajib'),jk=S.hfJenis.find(j=>j.cakupan==='kelas'),k0=S.kelas[0];
  pt.addRow(head).font={bold:true};
  if(jw)pt.addRow(['Wajib semua kelas',jw.nama,'Surah Al-Fatihah','Ayat 1-7']);
  if(jk&&k0)pt.addRow([k0.nama,jk.nama,'Doa sebelum makan','']);
  pt.addRow([]);pt.addRow(['Jenis hafalan saat ini','Cakupan']).font={bold:true};S.hfJenis.forEach(j=>pt.addRow([j.nama,hfCakL[j.cakupan]]));
  await tulisXlsx(wb,'template-daftar-hafalan.xlsx');toast('Template daftar hafalan sedang diproses, mohon ditunggu')}
 catch(e){toast('Gagal membuat template: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
function hfImporDipilih(el){const f=el.files&&el.files[0];el.value='';if(!f)return;
 guard(async()=>{
  await muatLib('xlsx');if(typeof XLSX==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
  if(!/\.xlsx?$/i.test(f.name))throw new Error('Gunakan file Excel (.xlsx) dari tombol Template');
  const wb=XLSX.read(await f.arrayBuffer(),{type:'array'}),HEAD=['kelas','jenis','judul hafalan','target (opsional)'];
  const mj=new Map(S.hfJenis.map(j=>[hfNorm(j.nama),j])),mk=new Map(S.kelas.map(k=>[hfNorm(k.nama),k]));
  const ada=new Set(S.hfItem.map(i=>hfKey(i.jenis_id,i.kelas_id,i.judul))),lihat=new Set();
  const ok=[],err=[],skip=[],sheets=[],grup=new Map();let dup=0,dupF=0,total=0;
  const G=l=>{if(!grup.has(l))grup.set(l,{baru:0,dup:0,err:0});return grup.get(l)};
  wb.SheetNames.forEach(nm=>{const a=XLSX.utils.sheet_to_json(wb.Sheets[nm],{header:1,defval:''});const h=(a[0]||[]).map(hfNorm);
   if(!HEAD.every((x,i)=>h[i]===x)){skip.push(nm);return}
   sheets.push(nm);
   a.slice(1).forEach((r,ix)=>{const c=r.map(x=>String(x==null?'':x).trim()),row=ix+2;if(!c.slice(0,4).some(Boolean))return;total++;
    const [kl,jn,judul,tg]=c,wajib=/^wajib/.test(hfNorm(kl)),kelas=wajib?null:mk.get(hfNorm(kl)),jenis=mj.get(hfNorm(jn)),lbl=wajib?'Wajib semua kelas':(kelas?kelas.nama:(kl||'(kolom Kelas kosong)'));
    const bad=m=>{err.push('Sheet '+nm+' - Baris '+row+' ('+(judul||'-')+'): '+m);G(lbl).err++};
    if(!kl)return bad('kolom Kelas kosong');
    if(!wajib&&!kelas)return bad('kelas "'+kl+'" tidak ada di sistem');
    if(!jn)return bad('kolom Jenis kosong');
    if(!jenis)return bad('jenis "'+jn+'" tidak ada di sistem');
    if(wajib&&jenis.cakupan!=='wajib')return bad('jenis "'+jenis.nama+'" khusus per kelas, pilih kelasnya di kolom Kelas');
    if(!wajib&&jenis.cakupan!=='kelas')return bad('jenis "'+jenis.nama+'" adalah wajib semua kelas, pilih "Wajib semua kelas" di kolom Kelas');
    if(!judul)return bad('judul hafalan kosong');
    if(judul.length>100)return bad('judul lebih dari 100 huruf');
    if(tg.length>120)return bad('target lebih dari 120 huruf');
    const key=hfKey(jenis.id,kelas?kelas.id:null,judul);
    if(ada.has(key)){dup++;G(lbl).dup++;return}
    if(lihat.has(key)){dupF++;G(lbl).dup++;return}
    lihat.add(key);G(lbl).baru++;ok.push({jenis_id:jenis.id,kelas_id:kelas?kelas.id:null,judul,target:tg||null})})});
  if(!sheets.length)throw new Error('Tidak ditemukan sheet data yang sesuai template. Pastikan header tabel ada di baris pertama.');
  if(!total)throw new Error('Semua sheet data kosong.');
  if(ok.length>5000)throw new Error('Maksimal 5000 hafalan baru per impor. Pecah menjadi beberapa file');
  HFI={rows:ok,sheets:sheets.length,err,dup,dupFile:dupF,skip};
  hfPratinjau(grup)})}
function hfPratinjau(grup){const H=HFI,tg=[...grup.entries()].sort((a,b)=>{const o=n=>n==='Wajib semua kelas'?-1:S.kelas.findIndex(k=>k.nama===n);return(o(a[0])-o(b[0]))||String(a[0]).localeCompare(String(b[0]),'id')});
 resetTutup();$('#mt').textContent='Pratinjau impor daftar hafalan';
 $('#mbd').innerHTML=`<div class="note">📄 Sheet data terdeteksi: <b>${H.sheets}</b>${H.skip.length?` · sheet dilewati: ${H.skip.map(esc).join(', ')}`:''}<br>✅ Akan ditambah: <b>${H.rows.length}</b> hafalan<br>⏭ Duplikat dilewati: <b>${H.dup+H.dupFile}</b><br>❌ Bermasalah (tidak diimpor): <b>${H.err.length}</b></div>`
  +tab(['Kelas','Baru','Duplikat','Bermasalah'],tg.map(([n,v])=>`<tr><td><b>${esc(n)}</b></td><td>${v.baru}</td><td>${v.dup}</td><td>${v.err}</td></tr>`).join(''),'Tidak ada baris')
  +(H.err.length?`<div class="tbkh">Baris bermasalah</div><div class="note" style="max-height:240px;overflow:auto;border:1px solid #d62839;color:#d62839">${H.err.slice(0,100).map(esc).join('<br>')}${H.err.length>100?`<br>... dan ${H.err.length-100} lainnya`:''}</div>`:'')
  +(H.rows.length?'':'<div class="note">Tidak ada hafalan baru yang bisa diimpor.</div>');
 const m=$('#ms');m.className='btn success';m.disabled=false;m.style.display=H.rows.length?'':'none';m.textContent='Impor '+H.rows.length+' hafalan';m.onclick=hfImporKirim;
 $('#md').classList.add('besar');$('#md').classList.add('show')}
async function hfImporKirim(){const H=HFI,rows=H.rows;if(!rows.length)return;const BATCH=200,paket=Math.ceil(rows.length/BATCH),b=$('#ms');let tambah=0,dup=0,n=0;b.disabled=true;
 try{ld(1);
  for(let i=0;i<rows.length;i+=BATCH){n++;$('#ldt').textContent='Mengimpor hafalan '+Math.min(i+BATCH,rows.length)+' dari '+rows.length+'...';
   const chunk=rows.slice(i,i+BATCH);let r;
   try{r=await dbq(db.rpc('hafalan_impor',{p_sekolah:SEK,p_baris:chunk}))}
   catch(e){throw new Error('Paket '+n+' dari '+paket+' gagal: '+dbMsg(e)+(n>1?'. Paket sebelumnya sudah masuk. Ulangi impor untuk melanjutkan, yang sudah masuk akan dilewati':''))}
   tambah+=Number(r&&r.ditambah)||0;dup+=Number(r&&r.duplikat)||0}
 }catch(e){ld(0);b.disabled=false;try{await muatHafalan()}catch(_){}renderV();toast((e&&e.message)||String(e),false);return}
 ld(0);closeM();try{await muatHafalan()}catch(_){}renderV();
 info('Hasil impor daftar hafalan','<div class="note">📄 Sheet data terdeteksi: <b>'+H.sheets+'</b><br>✅ Berhasil ditambah: <b>'+tambah+'</b> hafalan<br>⏭ Duplikat dilewati: <b>'+(H.dup+H.dupFile+dup)+'</b><br>❌ Bermasalah (tidak diimpor): <b>'+H.err.length+'</b></div>'+(H.err.length?'<div class="mu" style="max-height:200px;overflow:auto">'+H.err.slice(0,100).map(esc).join('<br>')+'</div>':''))}
