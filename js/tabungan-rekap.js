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
