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

/* ---------- rekap + unduh riwayat ---------- */
const LB={Hadir:'H',Terlambat:'T',Izin:'I',Sakit:'S',Alpa:'A',Libur:'L',Belum:'-'};
function matriks(b,k){const sem=k==='*',ds=hariBulan(b,true),l=act().filter(s=>!k||sem||s.kelas===k);if(sem)l.sort(urutKN);return{ds,rows:l.map((s,i)=>{const r=ringkas(s,b,true);return[i+1,s.nama,s.nisn||'-',s.kelas].concat(ds.map(d=>LB[statusRekap(s,d)])).concat([r.c.Hadir,r.c.Terlambat,r.c.Izin,r.c.Sakit,r.c.Alpa,r.c.Libur,r.pct+'%'])}),head:['No','Nama','NISN','Kelas'].concat(ds.map(d=>String(+d.slice(8)))).concat(['Hadir','Terlambat','Izin','Sakit','Alpa','Libur','% Hadir'])}}
let rkNQ='';
function rekapBulanTabel(){const q=rkNQ.trim().toLowerCase(),l=act().filter(s=>rk&&(rk==='*'||s.kelas===rk)&&(!q||s.nama.toLowerCase().includes(q)||String(s.pan||'').toLowerCase().includes(q)||String(s.nisn||'').includes(q)||cocokWA(s.wa,q)));if(rk==='*')l.sort(urutKN);
 const rows=l.map((s,i)=>{const r=ringkas(s,bulan,true);return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${esc(s.nisn||'-')}</td><td>${esc(s.kelas)}</td><td>${r.c.Hadir}</td><td>${r.c.Terlambat}</td><td>${r.c.Izin}</td><td>${r.c.Sakit}</td><td>${r.c.Alpa}</td><td>${r.c.Libur}</td><td><b>${r.pct}%</b></td></tr>`}).join('');
 return tab(['No','Nama','NISN','Kelas','Hadir','Terlambat','Izin','Sakit','Alpa','Libur','% Hadir'],rows,rk?(q?'Tidak ada anak yang cocok.':''):PKM)}
function cariRekapBulan(el){rkNQ=el.value;const t=$('#rkBulanTab');if(t)t.innerHTML=rekapBulanTabel()}
V.rekap=()=>{const n=hariBulan(bulan,true).length;
 return `<div class="panel"><div class="ph">📚 Rekap Absensi <span class="mu">${n} hari dihitung</span></div><div class="pb"><div class="tb rekap-filter">${dt('month',bulan,"setBulan(this.value)")}<select class="select" onchange="rk=this.value;renderV()">${kopt2s(rk)}</select></div>
 <div class="tb"><input id="rkNama" class="input grow search-smooth" placeholder="Cari nama anak..." value="${esc(rkNQ)}" oninput="cariRekapBulan(this)"></div>
 <div class="tb"><button class="btn success sm dl" onclick="unduh('pdf',this)">⬇ Riwayat (PDF)</button><button class="btn sm dl pdf" onclick="unduh('xlsx',this)">⬇ Riwayat (XLSX)</button></div>
 <div class="note">Tabel di bawah adalah rekap jumlah bulan yang dipilih. Jika sudah ada absensi yang tercatat pada tanggal setelah hari ini, rekap dan berkas unduhan akan otomatis diperpanjang sampai tanggal catatan terakhir tersebut. Berkas unduhan berisi riwayat harian seluruh anak (H hadir, T terlambat, I izin, S sakit, A alpa, L libur). Persentase menghitung hari libur sebagai hadir. Pencarian nama hanya menyaring tabel ini, tidak memengaruhi berkas unduhan.</div>
 <div id="rkBulanTab">${rekapBulanTabel()}</div></div></div>${V.laporanortu()}`};
function setBulan(v){if(!/^\d{4}-\d{2}$/.test(v||''))return;bulan=v;renderV();guard(async()=>{await muatBulan(v);renderV()})}
const HRS=['Min','Sen','Sel','Rab','Kam','Jum','Sab'],XC={H:['FFD9F7E8','FF14965C'],T:['FFFFF0C2','FF9A6A00'],I:['FFDCEFFF','FF1673BD'],S:['FFFFE0E4','FFD83D4D'],A:['FFEADFFF','FF6840C6'],L:['FFE5EDF4','FF526B84'],'-':['FFF3F4F3','FF9AA59E']};
async function tulisXlsx(wb,nama){const buf=await wb.xlsx.writeBuffer(),a=document.createElement('a');a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));a.download=nama;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),5000)}
async function xlsxRiwayat(M,nm){await muatLib('exceljs');
 await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
 const wb=new ExcelJS.Workbook(),ws=isiSheetRiwayat(wb,M,bulan,rk,'Riwayat');await xlsxTtdRekap(wb,ws,rk,5+M.rows.length+3,1,Math.max(2,ws.columnCount-2),Math.max(4,ws.columnCount));
 await tulisXlsx(wb,nm+'.xlsx')}
function isiSheetRiwayat(wb,M,bulan,rk,namaSheet){
 const n=M.ds.length,tot=4+n+7,F='Arial',
 ws=wb.addWorksheet(namaSheet,{views:[{state:'frozen',xSplit:4,ySplit:4}],pageSetup:{orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0}}),
 fl=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}),ln={style:'thin',color:{argb:'FFCFD9D3'}},bd={top:ln,left:ln,bottom:ln,right:ln},mid={horizontal:'center',vertical:'middle'},
 SUM=['H','T','I','S','A','L'],SH=['FF20B979','FFD99A27','FF248FE9','FFEF5361','FF7A4BE5','FF526B84','FF176B3A'];
 wb.creator=ns();
 ws.mergeCells(1,1,1,tot);ws.mergeCells(2,1,2,tot);
 const t1=ws.getCell(1,1),t2=ws.getCell(2,1);t1.value='RIWAYAT ABSENSI - '+ns().toUpperCase();t1.font={name:F,size:15,bold:true,color:{argb:'FFFFFFFF'}};t1.fill=fl('FF7650B8');t1.alignment=mid;
 t2.value='Bulan '+fmtB(bulan)+(rk&&rk!=='*'?' - Kelas '+rk:' - Semua kelas')+'   |   Dicetak '+fmt(TODAY);t2.font={name:F,size:10,color:{argb:'FF4B3A75'}};t2.fill=fl('FFEEE5FB');t2.alignment=mid;ws.getRow(1).height=28;ws.getRow(2).height=20;
 const hd=(c,top,color)=>{const x=ws.getCell(3,c);x.value=top;x.fill=fl(color);x.font={name:F,size:10,bold:true,color:{argb:'FFFFFFFF'}};x.alignment=mid;x.border=bd;ws.getCell(4,c).border=bd;ws.getCell(4,c).fill=fl(color)};
 ['No','Nama','NISN','Kelas'].forEach((h,i)=>{ws.mergeCells(3,i+1,4,i+1);hd(i+1,h,'FF176B3A')});
 M.ds.forEach((d,i)=>{const w=wd(d),we=w===0||w===6;ws.getCell(3,5+i).value=String(+d.slice(8));ws.getCell(3,5+i).font={name:F,size:10,bold:true,color:{argb:'FFFFFFFF'}};ws.getCell(3,5+i).fill=fl(we?'FFE0A030':'FF3B9E63');ws.getCell(3,5+i).alignment=mid;ws.getCell(3,5+i).border=bd;ws.getCell(4,5+i).value=HRS[w];ws.getCell(4,5+i).font={name:F,size:9,bold:true,color:{argb:'FFFFFFFF'}};ws.getCell(4,5+i).fill=fl(we?'FFE0A030':'FF3B9E63');ws.getCell(4,5+i).alignment=mid;ws.getCell(4,5+i).border=bd});
 ['Hadir','Terlambat','Izin','Sakit','Alpa','Libur','% Hadir'].forEach((h,i)=>{const c=5+n+i;ws.mergeCells(3,c,4,c);hd(c,h,SH[i])});
 ws.getRow(3).height=18;ws.getRow(4).height=20;
 M.rows.forEach((r,j)=>{const row=ws.getRow(5+j),z=j%2?'FFF4F9F5':'FFFFFFFF';row.height=19;
  r.forEach((v,k)=>{const c=row.getCell(k+1);c.border=bd;
   if(k<4){c.value=String(v??'');c.fill=fl(z);c.font={name:F,size:10,bold:k===1};c.alignment={vertical:'middle',horizontal:k===1?'left':k===2?'center':'left',indent:k===1?1:0};}
   else if(k<4+n){const x=XC[v]||XC['-'];c.value=String(v??'-');c.fill=fl(x[0]);c.font={name:F,size:10,bold:true,color:{argb:x[1]}};c.alignment=mid}
   else if(k<10+n){const x=XC[SUM[k-4-n]];c.value=Number(v)||0;c.fill=fl(x[0]);c.font={name:F,size:10,bold:true,color:{argb:x[1]}};c.alignment=mid}
   else{const pc=parseInt(v,10)||0;c.value=pc/100;c.numFmt='0%';c.fill=fl(z);c.font={name:F,size:10,bold:true,color:{argb:pc>=90?'FF14965C':pc>=70?'FF9A6A00':'FFD83D4D'}};c.alignment=mid}});});
 ws.getColumn(1).width=5;ws.getColumn(2).width=Math.min(40,Math.max(22,...M.rows.map(r=>String(r[1]).length+3)));ws.getColumn(3).width=14;ws.getColumn(4).width=Math.max(12,...M.rows.map(r=>String(r[3]).length+3));
 for(let c=5;c<=4+n;c++)ws.getColumn(c).width=6;for(let c=n+5;c<=n+10;c++)ws.getColumn(c).width=10;ws.getColumn(n+11).width=10;
 const lr=5+M.rows.length+1;ws.mergeCells(lr,1,lr,tot);const lg=ws.getCell(lr,1);lg.value='Keterangan: H = Hadir, T = Terlambat, I = Izin, S = Sakit, A = Alpa, L = Libur, - = belum tercatat. Persentase menghitung hari libur sebagai hadir. Tanggal berwarna oranye = Sabtu/Minggu.';lg.font={name:F,size:9,italic:true,color:{argb:'FF6D7D73'}};lg.alignment={vertical:'middle',horizontal:'left'};
 const tg=ttdKepsek(bulan),wl=ttdWali(rk),c0=Math.max(5,tot-4),r0=lr+2;
 const sgR=(r,v,o)=>{ws.mergeCells(r,c0,r,tot);const x=ws.getCell(r,c0);x.value=v;x.font=Object.assign({name:F,size:10},o||{});x.alignment=mid};
 const sgL=(r,v,o)=>{ws.mergeCells(r,2,r,4);const x=ws.getCell(r,2);x.value=v;x.font=Object.assign({name:F,size:10},o||{});x.alignment=mid};
 [2,3,4].forEach(i=>{ws.getRow(r0+i).height=18});
 sgR(r0,tg.kota?{richText:[{text:tg.kota+',',font:{name:F,size:10,bold:true}},{text:' '+tg.tgl,font:{name:F,size:10}}]}:tg.tgl);
 sgR(r0+1,'( Kepala Sekolah )');sgR(r0+5,tg.nama||'................................',{bold:true,underline:true});if(tg.nip)sgR(r0+6,'Nip. '+tg.nip);
 if(wl){sgL(r0,{richText:[{text:'Mengetahui,',font:{name:F,size:10,bold:true}},{text:' Wali kelas',font:{name:F,size:10}}]});sgL(r0+1,'( '+wl.kelas+' )');sgL(r0+5,wl.nama,{bold:true,underline:true});if(wl.nip)sgL(r0+6,'Nip. '+wl.nip)}
 return ws;
}
const kotaTtd=()=>String((S.set&&S.set.kota)||'').trim();
function fmtNip(v){const a=String(v||'').replace(/\D/g,'');return a.length===18?a.slice(0,8)+' '+a.slice(8,14)+' '+a.slice(14,15)+' '+a.slice(15):String(v||'').trim()}
function ttdKepsek(b){const g=S.guru.find(x=>x.role==='kepala_sekolah'&&x.aktif)||S.guru.find(x=>x.role==='kepala_sekolah')||{};return{id:g.id||null,kota:kotaTtd(),tgl:fmt(hariIni()),nama:g.nama||'',nip:fmtNip(g.nip)}}
function ttdWali(kls){if(!kls)return null;const k=S.kelas.find(x=>x.nama===kls);if(!k||!k.wali)return null;const g=S.guru.find(x=>x.id===k.wali);if(!g)return null;return{id:g.id,kelas:k.nama,nama:g.nama,nip:fmtNip(g.nip)}}
function pdfTtd(d,cx,y,tb,tn,peran,nama,nip){d.setFontSize(9);d.setTextColor(0,0,0);
 d.setFont('helvetica','bold');const w1=tb?d.getTextWidth(tb):0;d.setFont('helvetica','normal');const w2=d.getTextWidth(tn),x0=cx-(w1+w2)/2;
 if(tb){d.setFont('helvetica','bold');d.text(tb,x0,y)}
 d.setFont('helvetica','normal');d.text(tn,x0+w1,y);d.text('( '+peran+' )',cx,y+5,{align:'center'});
 const ny=y+5+22,nm=nama||'................................';d.setFont('helvetica','bold');d.text(nm,cx,ny,{align:'center'});const w=d.getTextWidth(nm);d.setLineWidth(.3);d.setDrawColor(0,0,0);d.line(cx-w/2,ny+1,cx+w/2,ny+1);
 if(nip){d.setFont('helvetica','normal');d.setFontSize(8);d.text('Nip. '+nip,cx,ny+5.5,{align:'center'})}}
const rgbX=a=>{const h=a.slice(-6);return[parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)]};
function pdfRiwayat(d,M,b,k){
 const n=M.ds.length,PW=297,PH=210,mg=6,FW=[7,40,21,14],SW=[9,12,8,8,8,8,10],SHC=['FF20B979','FFD99A27','FF248FE9','FFEF5361','FF7A4BE5','FF526B84','FF176B3A'],SUM=['H','T','I','S','A','L'],
 dw=Math.min(7,(PW-2*mg-FW.reduce((a,c)=>a+c,0)-SW.reduce((a,c)=>a+c,0))/n),tw=FW.reduce((a,c)=>a+c,0)+n*dw+SW.reduce((a,c)=>a+c,0),sx=(PW-tw)/2;
 d.setFillColor(...rgbX('FF7650B8'));d.rect(sx,mg,tw,9,'F');d.setFont('helvetica','bold');d.setFontSize(13);d.setTextColor(255,255,255);d.text('RIWAYAT ABSENSI - '+ns().toUpperCase(),sx+tw/2,mg+6.2,{align:'center'});
 d.setFillColor(...rgbX('FFEEE5FB'));d.rect(sx,mg+9,tw,6,'F');d.setFont('helvetica','normal');d.setFontSize(8);d.setTextColor(...rgbX('FF4B3A75'));d.text('Bulan '+fmtB(b)+(k&&k!=='*'?' - Kelas '+k:' - Semua kelas')+'   |   Dicetak '+fmt(TODAY),sx+tw/2,mg+13.2,{align:'center'});
 const HS=(c,sp,x)=>({content:c,rowSpan:sp,styles:Object.assign({fillColor:rgbX(x),textColor:[255,255,255],fontStyle:'bold',halign:'center',valign:'middle'},{})});
 const r1=['No','Nama','NISN','Kelas'].map(h=>HS(h,2,'FF176B3A')),r2=[];
 M.ds.forEach(dd=>{const w=wd(dd),f=rgbX(w===0||w===6?'FFE0A030':'FF3B9E63');r1.push({content:String(+dd.slice(8)),styles:{fillColor:f,textColor:[255,255,255],fontStyle:'bold',halign:'center',valign:'middle'}});r2.push({content:HRS[w],styles:{fillColor:f,textColor:[255,255,255],fontStyle:'bold',halign:'center',valign:'middle',fontSize:4.8}})});
 ['Hadir','Terlambat','Izin','Sakit','Alpa','Libur','% Hadir'].forEach((h,i)=>r1.push(HS(h,2,SHC[i])));
 const pd={top:.7,bottom:.7,left:.4,right:.4},body=M.rows.map((r,j)=>{const z=rgbX(j%2?'FFF4F9F5':'FFFFFFFF');return r.map((v,c)=>{
  if(c<4)return{content:String(v==null?'':v),styles:{fillColor:z,fontStyle:c===1?'bold':'normal',halign:c===2?'center':'left',cellPadding:c===1?{top:.7,bottom:.7,left:1.5,right:.4}:pd}};
  if(c<4+n){const x=XC[v]||XC['-'];return{content:String(v==null?'-':v),styles:{fillColor:rgbX(x[0]),textColor:rgbX(x[1]),fontStyle:'bold',halign:'center'}}}
  if(c<10+n){const x=XC[SUM[c-4-n]];return{content:String(Number(v)||0),styles:{fillColor:rgbX(x[0]),textColor:rgbX(x[1]),fontStyle:'bold',halign:'center'}}}
  const pc=parseInt(v,10)||0;return{content:pc+'%',styles:{fillColor:z,textColor:rgbX(pc>=90?'FF14965C':pc>=70?'FF9A6A00':'FFD83D4D'),fontStyle:'bold',halign:'center'}}})});
 const cs={};FW.forEach((w,i)=>cs[i]={cellWidth:w});for(let i=0;i<n;i++)cs[4+i]={cellWidth:dw};SW.forEach((w,i)=>cs[4+n+i]={cellWidth:w});
 d.autoTable({startY:mg+17,head:[r1,r2],body,columnStyles:cs,margin:{left:sx,right:sx,top:mg,bottom:mg},theme:'plain',tableWidth:tw,styles:{font:'helvetica',fontSize:6,cellPadding:pd,lineColor:rgbX('FFCFD9D3'),lineWidth:.1,valign:'middle',minCellHeight:5,textColor:[0,0,0],overflow:'linebreak'}});
 let y=d.lastAutoTable.finalY;d.setFont('helvetica','italic');d.setFontSize(6.5);d.setTextColor(...rgbX('FF6D7D73'));
 const lg=d.splitTextToSize('Keterangan: H = Hadir, T = Terlambat, I = Izin, S = Sakit, A = Alpa, L = Libur, - = belum tercatat. Persentase menghitung hari libur sebagai hadir. Tanggal berwarna oranye = Sabtu/Minggu.',tw);d.text(lg,sx,y+4);
 y=y+4+lg.length*3+6;if(y+40>PH-mg){d.addPage();y=mg+4}
 return y}
let taA='',taB='',taK='';
const taInit=()=>{if(!taA||!taB){const y=parseInt(String(S.set.tahun_ajaran||'').slice(0,4))||+TODAY.slice(0,4);taA=y+'-07';taB=TODAY.slice(0,7);if(taA>taB)taA=taB}return ''};
async function unduhTA(t,btn,arsipSemua=false){await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,arsipSemua?'Memproses seluruh riwayat...':(t==='xlsx'?'Membuat rekap XLSX...':'Membuat rekap PDF...')))return;if(arsipSemua)toast('Mohon ditunggu. Proses akan memakan sedikit waktu karena sistem mengunduh semua riwayat absensi selama 1 tahun ajaran penuh.');try{await jedaUnduh();
 let kelas,L=[],nm;
 if(arsipSemua){
  const [awal,akhir]=await Promise.all([
   dbq(db.from('absensi').select('tanggal').order('tanggal',{ascending:true}).limit(1)),
   dbq(db.from('absensi').select('tanggal').order('tanggal',{ascending:false}).limit(1))
  ]);
  if(!awal||!awal.length||!akhir||!akhir.length)throw new Error('Belum ada riwayat absensi tersimpan');
  await muatRange(awal[0].tanggal,akhir[0].tanggal);
  const ms=[...new Set(Object.keys(S.absen).filter(d=>d>=awal[0].tanggal&&d<=akhir[0].tanggal&&Object.keys(S.absen[d]||{}).length).map(d=>d.slice(0,7)))].sort();
  kelas=S.kelas.map(k=>k.nama);
  const siswaPerKelas=new Map(kelas.map(k=>[k,new Set(act().filter(s=>s.kelas===k).map(s=>String(s.id)))]));
  for(const k of kelas){
   const ids=siswaPerKelas.get(k);
   if(!ids||!ids.size)continue;
   for(const bln of ms){
    const ada=Object.keys(S.absen).some(d=>d.startsWith(bln+'-')&&Object.keys(S.absen[d]||{}).some(id=>ids.has(String(id))));
    if(!ada)continue;
    const M=matriks(bln,k);
    if(M.ds.length&&M.rows.length)L.push([bln,k,M]);
   }
  }
  if(!L.length)throw new Error('Tidak ditemukan riwayat absensi untuk siswa aktif di kelas yang tersedia');
  nm='riwayat-absensi-seluruh-data';
 }else{
  if(!taA||!taB)throw new Error('Pilih bulan mulai dan bulan akhir');if(taA>taB)throw new Error('Bulan mulai tidak boleh setelah bulan akhir');
  const ms=[];let y=+taA.slice(0,4),m=+taA.slice(5,7);for(;;){const bln=y+'-'+String(m).padStart(2,'0');ms.push(bln);if(bln>=taB)break;if(++m>12){m=1;y++}if(ms.length>24)throw new Error('Rentang maksimal 24 bulan')}
  kelas=!taK||taK==='*'?S.kelas.map(k=>k.nama):[taK];
  for(const bln of ms){await muatBulan(bln);for(const k of kelas){const M=matriks(bln,k);if(M.ds.length&&M.rows.length)L.push([bln,k,M])}}
  if(!L.length)throw new Error('Belum ada data pada rentang bulan ini'+(taK&&taK!=='*'?' untuk kelas '+taK:''));
  nm='rekap-tahun-ajaran-'+(taK&&taK!=='*'?'kelas-'+taK.replace(/[^\\w]+/g,'-')+'-':'')+taA+'-sd-'+taB;
 }
 if(t==='xlsx'){await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');const wb=new ExcelJS.Workbook();wb.creator=ns();const used=new Set();for(const [bln,k,M] of L){const ws=isiSheetRiwayat(wb,M,bln,k,namaSheetSiswa(k+' '+bln,used));await xlsxTtdRekap(wb,ws,k,5+M.rows.length+4,1,Math.max(2,ws.columnCount-2),Math.max(4,ws.columnCount))}await tulisXlsx(wb,nm+'.xlsx')}
 else{const d=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});for(let i=0;i<L.length;i++){if(i)d.addPage();const [bln,k,M]=L[i],y=pdfRiwayat(d,M,bln,k);await pdfTtdRekap(d,k,y)}d.save(nm+'.pdf')}
 toast('Unduhan '+(t==='xlsx'?'XLSX':'PDF')+' riwayat absensi berhasil dibuat.');return true}catch(e){toast('Gagal mengunduh: '+(e.message||e),false);return false}finally{setUnduhBusy(btn,false)}}
async function unduh(t,btn){await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,t==='xlsx'?'Membuat file XLSX...':'Membuat file PDF...'))return;try{await jedaUnduh();if(!rk)throw new Error('Pilih kelas atau Semua kelas terlebih dahulu');await muatBulan(bulan);
 const kelas=rk==='*'?S.kelas.map(k=>k.nama):[rk],L=[];for(const k of kelas){const M=matriks(bulan,k);if(M.ds.length&&M.rows.length)L.push([k,M])}
 if(!L.length)throw new Error('Belum ada data pada bulan ini');const nm='riwayat-absensi-'+(rk==='*'?'semua-kelas':'kelas-'+String(rk).replace(/[^\\w]+/g,'-'))+'-'+bulan;
 if(t==='xlsx'){await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');const wb=new ExcelJS.Workbook();wb.creator=ns();const used=new Set();for(const [k,M] of L){const ws=isiSheetRiwayat(wb,M,bulan,k,namaSheetSiswa(k,used));await xlsxTtdRekap(wb,ws,k,5+M.rows.length+4,1,Math.max(2,ws.columnCount-2),Math.max(4,ws.columnCount))}await tulisXlsx(wb,nm+'.xlsx')}
 else{const d=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});for(let i=0;i<L.length;i++){if(i)d.addPage();const [k,M]=L[i],y=pdfRiwayat(d,M,bulan,k);await pdfTtdRekap(d,k,y)}d.save(nm+'.pdf')}
 toast('File '+(t==='xlsx'?'XLSX':'PDF')+' seluruh kelas sedang diproses, mohon ditunggu')}catch(e){toast('Gagal mengunduh: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
/* ---------- laporan orang tua ---------- */
const catat=p=>p<50?'Mari kita motivasi ananda bersama-sama agar bisa lebih rutin hadir, supaya tidak tertinggal momen seru belajar dan bermain di sekolah.':p<70?'Mari kita semangati ananda agar bulan depan bisa lebih rajin lagi datang ke sekolah dan menikmati aktivitas bersama teman-teman.':p<=90?'Ayo kita terus pacu semangat ananda agar semakin konsisten dan tidak mudah absen dari kegiatan sekolah.':'Yuk pertahankan semangat dan kedisiplinan yang luar biasa ini agar ananda terus ceria dan optimal dalam mengikuti setiap kegiatan.';
function pesanOrtu(s,b){const r=ringkas(s,b,true),ln=r.ds.map((d,i)=>{const st=dayStat(s,d);return (i+1)+'. '+HR[wd(d)]+', '+d.slice(8)+'/'+d.slice(5,7)+'/'+d.slice(0,4)+'\n    Status : '+(st==='Belum'?'Belum tercatat':st)}).join('\n');
 return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_ \n\nberikut adalah riwayat kehadiran ananda.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas+'\nBulan : *'+fmtB(b)+'*\ndi '+ns()+'\n\nRingkasan:\n✅ Hadir: '+(r.c.Hadir+r.c.Terlambat)+' hari\n🏖 Libur: '+r.c.Libur+' hari\n📝 Izin: '+r.c.Izin+' hari\n🤒 Sakit: '+r.c.Sakit+' hari\n❌ Alpa: '+r.c.Alpa+' hari\n\n_Persentase kehadiran: *'+r.pct+'%*_\n\n📝*RIWAYAT ABSENSI*\n\n'+(ln||'Belum ada data.')+'\n\n _Catatan :_ \n'+catat(r.pct)+'\n\nTerima kasih 🙏🏻\n _Waalaikumsalam warahmatullahi wabarakatuh_'}
const loList=()=>lo==='*'?act().slice().sort((a,b)=>S.kelas.findIndex(k=>k.nama===a.kelas)-S.kelas.findIndex(k=>k.nama===b.kelas)):act().filter(s=>lo&&s.kelas===lo);
function nomorWAReport(s){const n=String(s.wa||'').replace(/\D/g,''),lokal=n.startsWith('62')?'0'+n.slice(2):n;return nomorHtml(s.wa)+' <button type="button" class="btn soft sm" title="Salin nomor WhatsApp" aria-label="Salin nomor WhatsApp" onclick="salinLink(\''+esc(lokal)+'\')">⧉</button>'}
function laporanRows(l){rkMuatStatus('laporan');const z=String(loQ||'').toLowerCase().trim();const f=l.filter(s=>!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z));return f.map((s,i)=>{const r=ringkas(s,lb,true);return `<tr><td>${i+1}</td><td><b>${esc(s.pan)}</b><div class="mu">${esc(s.nama)}${lo==='*'?' · Kelas '+esc(s.kelas||'-'):''}</div></td><td>${esc(s.nisn||'-')}</td><td>${s.wa?nomorWAReport(s):'<span class="badge Sakit">Tanpa nomor</span>'}</td><td>${r.c.Hadir+r.c.Terlambat}H ${r.c.Izin}I ${r.c.Sakit}S ${r.c.Alpa}A ${r.c.Libur}L<div class="mu">${r.pct}% dari ${r.n} hari</div></td><td>${rkSel(s,'laporan','Laporan '+fmtB(lb))}</td><td><button class="btn sm success" ${s.wa?'':'disabled'} onclick="kirimSatu(${s.id})">📤 Kirim Pesan</button> <button class="btn sm soft" onclick="lihatPesan(${s.id})">👁 Lihat Pesan</button></td></tr>`}).join('');}
V.laporanortu=()=>{const l=loList();
 const rows=laporanRows(l);
 return `<div class="panel"><div class="ph">📨 Laporan ke Orang Tua</div><div class="pb"><div class="note">Pesan berisi riwayat kehadiran sebulan penuh setiap anak, ringkasan, dan kalimat penutup sesuai persentase. Laporan dikirim lewat WhatsApp ke nomor orang tua. Setelah selesai, jumlah pesan yang berhasil dan gagal akan ditampilkan.</div>
 <div class="pntb"><button class="btn success" onclick="kirimSemua()">📤 Kirim Semua</button><button class="btn soft" onclick="lihatPesanSemua()">👁 Lihat Pesan</button><button class="btn soft" onclick="riwayatKirim()">📋 Riwayat Kirim</button><button class="btn soft" onclick="rkSegar('laporan',this)">🔄 Perbarui status</button></div>
 <div class="tb">${dt('month',lb,"setLb(this.value)",'lap-date-pick')}<select class="select" onchange="lo=this.value;loQ='';renderV()">${kopt2s(lo)}</select><input id="loCari" class="input grow search-smooth" placeholder="Cari nama anak, panggilan atau NISN..." value="${esc(loQ)}" oninput="cariLaporanInput(this)"></div><div class="tw"><table><thead><tr><th>No</th><th>Anak</th><th>NISN</th><th>WhatsApp</th><th>Rekap</th><th>Status pesan</th><th>Aksi</th></tr></thead><tbody id="loBody">${rows||`<tr><td colspan="7" class="mu" style="text-align:center">Belum ada data.</td></tr>`}</tbody></table></div>${!lo?PKH:''}</div></div>`};
function cariLaporanInput(el){loQ=el.value;const body=$('#loBody');if(body)body.innerHTML=laporanRows(loList());}
function setLb(v){lb=v;guard(async()=>{await muatBulan(v);renderV()})}
function tampilPesan(ket,wa,teks,jml,cat){info('Pratinjau pesan WhatsApp','<div class="mu" style="margin-bottom:6px">'+esc(ket)+'</div><div class="mu" style="margin-bottom:8px">Dikirim ke: <b>'+(wa?esc(waLokal(wa)):'belum ada nomor WA')+'</b>'+(jml>1?' · '+jml+' anak dalam satu pesan':'')+'</div>'+pnBubble(teks)+'<div class="mu" style="margin-top:8px">Isi pesan sama persis dengan yang akan dikirim.'+(cat?' '+esc(cat):'')+'</div>');
 $('#ms').textContent='Salin pesan';$('#ms').style.display='';$('#ms').onclick=async()=>{const ok=await salinLink(teks);ok?toast('Pesan disalin'):toast('Gagal menyalin, coba lagi',false)}}
function lihatPesan(id){const s=siswaById(id);if(!s)return;tampilPesan('Pesan untuk orang tua '+(s.pan||s.nama),s.wa,pesanOrtu(s,lb),1)}
function lihatPesanSemua(){if(!lo)return toast(PK,false);const l=loList();if(!l.length)return toast('Tidak ada anak',false);const s=l.find(x=>x.wa)||l[0];tampilPesan('Contoh pesan (anak pertama '+(lo==='*'?'semua kelas':'kelas '+lo)+': '+(s.pan||s.nama)+'). Tiap anak menerima pesan sendiri.',s.wa,pesanOrtu(s,lb),1)}
function lihatPesanLinkSatu(id){const s=siswaById(id);if(!s||!s.kode_qr)return toast('Link anak belum tersedia',false);tampilPesan('Pesan untuk orang tua '+(s.pan||s.nama),s.wa,pesanLink([s]),1)}
function lihatPesanLinkSemua(){if(!kk)return toast(PK,false);const {g}=grupLink(kelasLink());if(!g.length)return toast('Tidak ada anak yang punya nomor WA orang tua',false);tampilPesan('Contoh pesan (nomor pertama yang akan dikirim)',g[0].wa,pesanLink(g[0].arr),g[0].arr.length)}
function tabLihatPesan(id){const s=siswaById(id);if(!s)return;const d=(tabRekD||[]).find(x=>x.r.siswa_id===id);if(!d)return toast('Data rekap belum dimuat',false);tampilPesan('Pesan untuk orang tua '+(s.pan||s.nama),s.wa,pesanTab(d),1)}
function tabLihatPesanSemua(){const l=(tabRekD||[]).map(d=>siswaById(d.r.siswa_id)).filter(Boolean);if(!l.length)return toast('Tidak ada anak',false);const s=l.find(x=>x.wa)||l[0];tampilPesan('Contoh pesan (anak pertama: '+(s.pan||s.nama)+'). Tiap anak menerima pesan sendiri.',s.wa,tabPesan(s),1)}
async function apiKirim(nomor,teks,meta){const {data:{session}}=await db.auth.getSession();const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,nomor,teks,...(meta||{})})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Gagal ('+r.status+')')}
/* ---- Kirim massal bertahap: jadwal Fonnte, jeda acak 15-30 detik per nomor (diatur di api/kirim.js) ---- */
const KIRIM_BATCH=10,JEDA_RATA2=22.5;
function estJadwal(n){const d=Math.ceil(n*JEDA_RATA2);return d>=60?'sekitar '+Math.ceil(d/60)+' menit':'sekitar '+d+' detik'}
async function apiKirimBatch(items,mulai,meta){const {data:{session}}=await db.auth.getSession();const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,pesan:items.map(x=>({nomor:x.nomor,teks:x.teks,label:x.label,siswa_ids:x.siswa_ids})),mulai:mulai||0,...(meta||{})})});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Gagal ('+r.status+')');return j}
async function kirimBertahap(items,meta){const hasil=[];let mulai=0;
 for(let i=0;i<items.length;i+=KIRIM_BATCH){const bag=items.slice(i,i+KIRIM_BATCH);const el=$('#ldt');if(el)el.textContent='Menjadwalkan '+Math.min(i+bag.length,items.length)+' dari '+items.length+'...';
  try{const j=await apiKirimBatch(bag,mulai,meta);const hs=Array.isArray(j.hasil)?j.hasil:[];for(let k=0;k<bag.length;k++)hasil.push(hs[k]||{ok:false,error:'Tidak ada respons'});if(j.berikutnya)mulai=j.berikutnya}
  catch(e){bag.forEach(()=>hasil.push({ok:false,error:(e&&e.message)||String(e)}))}}
 return hasil}

async function apiKirimBatalkanLiburGrup(tanggal) {
 const {data:{session}}=await db.auth.getSession();
 if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');
 const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,aksi:'batalkan_libur_grup',tanggal})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||'Gagal membatalkan pesan grup ('+r.status+')');
 return j;
}

async function apiLiburkanSiswaHariIni(tanggal,kelasIds,keterangan){
 const {data:{session}}=await db.auth.getSession();
 if(!session)throw new Error('Sesi login sudah berakhir, silakan masuk kembali');
 const r=await fetch('/api/kirim',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+session.access_token,...hBT()},body:JSON.stringify({sekolah_id:SEK,aksi:'libur_manual',tanggal,kelas_ids:kelasIds,keterangan})});
 const j=await r.json().catch(()=>({}));
 if(!r.ok)throw new Error(j.error||'Gagal menjadwalkan notifikasi ('+r.status+')');
 return j;
}

async function kirimLiburGrupHariIni(kelasIds,tanggal) {
 const cfg=RHS&&Array.isArray(RHS.pemetaan)?RHS:await apiPengaturan({aksi:'baca'});
 const relasi=(cfg.pemetaan||[]).filter(x=>kelasIds.includes(Number(x.kelas_id)));
 if(!relasi.length)return {grup:0,terjadwal:0,gagal:0};
 const grupRows=cfg.grup||[];
 const namaSekolah=S.set&&S.set.nama_sekolah?S.set.nama_sekolah:'Sekolah';
 const namaKelas=new Map((S.kelas||[]).map(k=>[Number(k.id),k.nama]));
 const perGrup=new Map();
 for(const r of relasi){
  const g=grupRows.find(x=>Number(x.id)===Number(r.grup_wa_id));
  const nama=namaKelas.get(Number(r.kelas_id));
  if(!g||!g.grup_id||!nama)continue;
  if(!perGrup.has(Number(g.id)))perGrup.set(Number(g.id),{grup:g,kelas:[]});
  const row=perGrup.get(Number(g.id));
  if(!row.kelas.includes(nama))row.kelas.push(nama);
 }
 const tanggalTeks=new Date(tanggal+'T00:00:00+07:00').toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'Asia/Jakarta'});
 const teksGrup=kelas=>[
  '🌸 *INFORMASI LIBUR SEKOLAH*',
  '',
  'Assalamu’alaikum warahmatullahi wabarakatuh.',
  '',
  'Yth. Bapak/Ibu Wali Murid,',
  '',
  'Kami informasikan bahwa kegiatan belajar mengajar pada:',
  '',
  '📅 Hari/Tanggal: *'+tanggalTeks+'*',
  '',
  '🏫 Kelas yang diliburkan: *'+kelas.sort((a,b)=>a.localeCompare(b,'id')).join(', ')+'*',
  '',
  'Kegiatan belajar mengajar pada kelas tersebut diliburkan untuk hari ini. Kegiatan belajar kembali dilaksanakan sesuai jadwal sekolah.',
  '',
  'Terima kasih atas perhatian dan kerja sama Bapak/Ibu. 😊',
  '',
  'Wassalamu’alaikum warahmatullahi wabarakatuh.',
  '',
  '🏫 *'+namaSekolah+'*'
 ].join('\n');
 const items=[...perGrup.values()].map(x=>({nomor:x.grup.grup_id,teks:teksGrup(x.kelas),label:'Grup '+(x.grup.label||x.grup.grup_id)}));
 if(!items.length)return {grup:0,terjadwal:0,gagal:0};
 const meta={...rkMeta('libur'),tujuan:'grup',batch:'manual-libur-'+SEK+'-'+tanggal+'-'+kelasIds.join('-')};
 const hasil=await kirimBertahap(items,meta);
 return {grup:items.length,terjadwal:hasil.filter(x=>x&&x.ok).length,gagal:hasil.filter(x=>!x||!x.ok).length};
}

/* ===== Riwayat Kirim (tabel kirim_log; diisi server, status diperbarui webhook Fonnte) ===== */
const RK_JENIS={balasan:'Balasan pesan wali',laporan:'Laporan kehadiran',link:'Link halaman anak',tabungan:'Laporan tabungan',raport:'Tautan raport',libur:'Notifikasi libur',alpa:'Notifikasi alpa',lainnya:'Lainnya'};
function rkMeta(jenis){let judul=RK_JENIS[jenis]||'Pengiriman';try{if(jenis==='laporan')judul='Laporan '+fmtB(lb);else if(jenis==='tabungan')judul='Laporan tabungan '+fmtB(tabBln)}catch(e){}
 const batch=(window.crypto&&crypto.randomUUID)?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2,10);return{jenis,judul,batch}}
function rkWaktu(t){try{return new Date(t).toLocaleString('id-ID',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
function rkIkon(n,biru){const p1='<path d="M1.5 6L4.8 9.3L11.5 2"/>',p2='<path d="M5.5 6L8.8 9.3L15.5 2"/>';return'<svg class="rkck'+(biru?' rkbiru':'')+'" width="17" height="11" viewBox="0 0 18 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(n===2?p1+p2:p1)+'</svg>'}
function rkJam(t){if(!t)return'–';try{const d=new Date(t),z='Asia/Jakarta',tg=x=>x.toLocaleDateString('en-CA',{timeZone:z}),jm=d.toLocaleTimeString('en-GB',{timeZone:z,hourCycle:'h23',hour:'2-digit',minute:'2-digit',second:'2-digit'});return(tg(d)===tg(new Date())?'':d.toLocaleDateString('id-ID',{timeZone:z,day:'numeric',month:'short'})+' ')+jm}catch(e){return'–'}}
/* Tahap pesan: terjadwal -> diproses -> terkirim (sent, centang 1) -> sampai (delivered, centang 2) -> terbaca (read, centang 2 biru); gagal */
function rkTahap(r){if(r.status==='gagal')return'gagal';
 const sf=String(r.state_fonnte==null?'':r.state_fonnte).toLowerCase(),tf=String(r.status_fonnte||'').toLowerCase();
 if(r.waktu_terbaca||sf==='read'||sf==='4'||tf==='read')return'terbaca';
 if(r.waktu_sampai||sf==='delivered'||sf==='3'||tf==='delivered')return'sampai';
 if(r.status==='terkirim'||r.waktu_terkirim)return'terkirim';
 const sel=Date.now()-new Date(r.jadwal_pada||r.dibuat).getTime();if(sel<0)return'terjadwal';if(sel>15*60000)return'nokabar';return'proses'}
function rkLabel(t){return{gagal:['❌','Gagal'],terbaca:[rkIkon(2,1),'Terbaca'],sampai:[rkIkon(2),'Sampai'],terkirim:[rkIkon(1),'Terkirim'],proses:['🔄','Diproses'],terjadwal:['⏳','Terjadwal'],nokabar:['❔','Belum ada kabar']}[t]}
function rkChips(list){const c={};list.forEach(r=>{const t=rkTahap(r);c[t]=(c[t]||0)+1});
 return['terjadwal','proses','nokabar','terkirim','sampai','terbaca','gagal'].filter(t=>c[t]).map(t=>{const l=rkLabel(t);return'<span>'+l[0]+' '+l[1]+' '+c[t]+'</span>'}).join('')}
function rkBaris(r,dev){const t=rkTahap(r),lb=rkLabel(t),rank={terkirim:1,sampai:2,terbaca:3}[t]||0;
 const nm=dev?esc(r.label||'-'):esc(r.label||r.nomor);
 let ex='';if(r.error)ex=esc(r.error);else if(dev&&r.status_fonnte)ex='Fonnte: '+esc(r.status_fonnte)+((r.state_fonnte!==null&&r.state_fonnte!=='')?' / state '+esc(r.state_fonnte):'');
 let w='';if(t!=='gagal'){w+='<span>⏳ '+rkJam(r.jadwal_pada||r.dibuat)+'</span>';
  if(rank>=1)w+='<span>'+rkIkon(1)+' '+rkJam(r.waktu_terkirim)+'</span>';
  if(rank>=2)w+='<span>'+rkIkon(2)+' '+rkJam(r.waktu_sampai)+'</span>';
  if(rank>=3)w+='<span>'+rkIkon(2,1)+' '+rkJam(r.waktu_terbaca)+'</span>'}
 return'<div class="rkr"><div>'+nm+(ex?'<small>'+ex+'</small>':'')+(w?'<div class="rkw">'+w+'</div>':'')+'</div><div class="rkt2"><div class="rkt">'+lb[0]+' '+lb[1]+'</div>'+(fmtNomor(r.nomor)?'<div class="rkn">'+esc(fmtNomor(r.nomor))+'</div>':'')+'</div></div>'}
/* ===== Status pesan per anak (kolom di tabel yang punya tombol kirim satu per satu) ===== */
const RKS={};
const pnJudul=()=>'Tautan raport '+pnJenis+' Semester '+pnSem;
const idsDari=s=>Array.isArray(s.arr)?s.arr.map(a=>a.id):[s.id];
function rkCari(s,jenis,judul){const rows=(RKS[jenis]||{}).rows||[],wa=String(s.wa||'').replace(/\D/g,'');
 for(const r of rows){if(judul&&r.judul!==judul&&!(jenis==='raport'&&r.judul==='Tautan raport'))continue;
  if(Array.isArray(r.siswa_ids)&&r.siswa_ids.length){if(r.siswa_ids.some(x=>Number(x)===Number(s.id)))return r}
  else if(wa&&String(r.nomor)===wa&&r.label&&String(r.label).includes(s.pan||s.nama||'\u0000'))return r}
 return null}
function rkSelIsi(s,jenis,judul){const c=RKS[jenis];if(!c||(!c.t&&!c.err))return'<span class="mu">…</span>';if(c.err&&!c.t)return'<span class="mu" title="Status belum bisa dimuat">⚠</span>';
 const r=rkCari(s,jenis,judul);if(!r)return'<span class="mu">–</span>';
 const t=rkTahap(r),lb=rkLabel(t),sudah=t==='terkirim'||t==='sampai'||t==='terbaca';
 const w={terbaca:r.waktu_terbaca,sampai:r.waktu_sampai,terkirim:r.waktu_terkirim}[t]||(sudah?null:(t==='gagal'?r.dibuat:(r.jadwal_pada||r.dibuat)));
 return'<div class="rkt">'+lb[0]+' '+lb[1]+'</div>'+(w?'<div class="mu">'+rkJam(w)+'</div>':'')+(t==='gagal'&&r.error?'<div class="mu">'+esc(r.error)+'</div>':'')}
function rkSel(s,jenis,judul){return'<span class="rks" data-j="'+jenis+'" data-t="'+esc(judul||'')+'" data-s="'+s.id+'">'+rkSelIsi(s,jenis,judul||'')+'</span>'}
function rkIsiSel(){try{document.querySelectorAll('.rks').forEach(el=>{const id=Number(el.dataset.s),s=(S.siswa||[]).find(x=>x.id===id)||{id};el.innerHTML=rkSelIsi(s,el.dataset.j,el.dataset.t||'')})}catch(e){}}
function rkMuatStatus(jenis,paksa){const c=RKS[jenis]||(RKS[jenis]={rows:[],t:0,err:false,load:null});if(c.load)return c.load;if(!paksa&&c.t&&Date.now()-c.t<15000)return Promise.resolve();
 const kol='jenis,judul,label,nomor,status,status_fonnte,state_fonnte,error,jadwal_pada,dibuat,waktu_terkirim,waktu_sampai,waktu_terbaca';
 const q=k=>dbq(db.from('kirim_log').select(k).eq('sekolah_id',SEK).eq('jenis',jenis).order('dibuat',{ascending:false}).limit(500));
 c.load=(async()=>{try{let rows;try{rows=await q(kol+',siswa_ids')}catch(e1){rows=await q(kol)}c.rows=rows||[];c.t=Date.now();c.err=false}catch(e){c.err=true;console.error('Status pesan gagal dimuat:',e)}finally{c.load=null}rkIsiSel()})();return c.load}
async function rkSegar(jenis,btn){if(btn)btn.disabled=true;try{await rkMuatStatus(jenis,true);toast(RKS[jenis]&&RKS[jenis].err?'Status pesan belum bisa dimuat':'Status pesan diperbarui',!(RKS[jenis]&&RKS[jenis].err))}finally{if(btn)btn.disabled=false}}
function rkHtml(rows){if(!rows.length)return'<div class="note">Belum ada riwayat pengiriman. Riwayat muncul setelah tombol kirim dipakai.';
 const waktu=v=>{const t=v?Date.parse(v):NaN;return Number.isFinite(t)?t:0};
 const waktuKirim=r=>waktu(r.waktu_terkirim||r.jadwal_pada||r.dibuat);
 const m=new Map();rows.forEach(r=>{const k=r.batch_id||('tanpa-batch-'+String(r.dibuat||'')+'-'+String(r.nomor||''));if(!m.has(k))m.set(k,[]);m.get(k).push(r)});
 const grup=[...m.values()].map(list=>({list,terbaru:Math.max(...list.map(r=>waktu(r.dibuat))),awal:list.reduce((a,b)=>waktu(a.dibuat)<=waktu(b.dibuat)?a:b)})).sort((a,b)=>b.terbaru-a.terbaru);
 let h='';
 grup.slice(0,15).forEach(({list,awal})=>{
  const chip=(ik,tx,v)=>v?'<span>'+ik+' '+tx+' '+v+'</span>':'';
  const isi=list.slice().sort((a,b)=>waktuKirim(a)-waktuKirim(b)||waktu(a.dibuat)-waktu(b.dibuat));
  h+='<details class="rk"><summary><b>'+esc(awal.judul||RK_JENIS[awal.jenis]||'Pengiriman')+'</b><span class="mu"> · '+esc(rkWaktu(awal.dibuat))+' · '+list.length+' pesan</span><div class="rkc">'
   +rkChips(list)+'</div></summary><div class="rkb">'
   +isi.map(r=>rkBaris(r,0)).join('')+'</div></details>'});
 return h+'<div class="mu">Menampilkan pengiriman terbaru. Penanda seperti WhatsApp: ✓ terkirim, ✓✓ sampai ke HP, ✓✓ biru terbaca. Jam (WIB) dicatat saat kabar diterima server; terbaca hanya muncul bila penerima mengaktifkan tanda baca. Riwayat disimpan 7 hari.</div>'}
async function rkMuat(){try{const rows=await dbq(db.from('kirim_log').select('batch_id,jenis,judul,label,nomor,status,status_fonnte,state_fonnte,error,jadwal_pada,dibuat,waktu_terkirim,waktu_sampai,waktu_terbaca').eq('sekolah_id',SEK).order('dibuat',{ascending:false}).limit(400));
 const el=$('#rkIsi');if(el)el.innerHTML=rkHtml(rows||[])}catch(e){const el=$('#rkIsi');if(el)el.innerHTML='<div class="note">Riwayat belum bisa dibaca: '+esc(e.message||String(e))+'</div>'}}
function riwayatKirim(){info('📋 Riwayat Kirim','<div id="rkIsi"><div class="note">Memuat...</div></div><div class="tb" style="margin-top:12px"><button class="btn soft" onclick="rkMuat()">🔄 Perbarui</button></div>');rkMuat()}
/* ===== akhir Riwayat Kirim ===== */
async function kirimList(list,fn,judul){let ok=0,gagal=[];const JD=list.length>1;const MT=rkMeta(judul==='Hasil pengiriman link'?'link':(fn===tabPesan?'tabungan':'laporan'));ld(1);
 try{if(!JD){const s=list[0];$('#ldt').textContent='Mengirim 1 dari 1...';try{if(!s.wa)throw new Error('tanpa nomor');await apiKirim(s.wa,fn?fn(s):pesanOrtu(s,lb),{...MT,label:s.pan,siswa_ids:idsDari(s)});ok++}catch(e){gagal.push(s.pan+' ('+(e.message||e)+')')}}
 else{const idx=[],items=[];list.forEach((s,i)=>{if(!s.wa){gagal.push(s.pan+' (tanpa nomor)');return}idx.push(i);items.push({nomor:s.wa,teks:fn?fn(s):pesanOrtu(s,lb),label:s.pan,siswa_ids:idsDari(s)})});
  if(items.length){const hs=await kirimBertahap(items,MT);hs.forEach((h,k)=>{if(h&&h.ok)ok++;else gagal.push(list[idx[k]].pan+' ('+((h&&h.error)||'gagal')+')')})}}}finally{ld(0)}
 try{await rkMuatStatus(MT.jenis,true)}catch(e){}
 info(judul||'Hasil pengiriman laporan','<div class="note">'+(JD?'📅 Terjadwal':'✅ Berhasil')+': <b>'+ok+'</b> pesan<br>❌ Gagal: <b>'+gagal.length+'</b> pesan</div>'+(JD&&ok?'<div class="mu">Fonnte mengirim bertahap dengan jeda 15-30 detik per nomor. Halaman boleh ditutup. Status terkirim atau gagal diperbarui otomatis di Riwayat kirim.</div>':'')+(JD?'<div class="tb" style="margin-top:10px"><button class="btn soft" onclick="closeM();setTimeout(riwayatKirim,150)">📋 Lihat riwayat kirim</button></div>':'')+(gagal.length?'<div class="mu">'+gagal.map(esc).join('<br>')+'</div>':''));toast(ok+(JD?' terjadwal, ':' terkirim, ')+gagal.length+' gagal',!gagal.length)}
async function kirimSemua(){if(!lo)return toast(PK,false);const l=loList();if(!l.length)return toast('Tidak ada anak',false);if(await konfirmasi('Kirim laporan '+fmtB(lb)+' ke '+l.length+' orang tua sekarang?'+(l.length>1?'\n\nPesan dijadwalkan bertahap (jeda 15-30 detik per anak), perkiraan semua terkirim '+estJadwal(l.length)+'. Halaman boleh ditutup setelah proses penjadwalan selesai (beberapa detik).':''),{judul:'Kirim semua laporan',ikon:'📤',ya:'Kirim'}))kirimList(l)}
async function kirimSatu(id){const s=siswaById(id);if(await konfirmasi('Kirim laporan '+fmtB(lb)+' '+s.pan+' ke '+s.wa+'?',{judul:'Kirim laporan',ikon:'📤',ya:'Kirim'}))kirimList([s])}
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

/* ---------- jadwal libur ---------- */
let liburQ='',liburOpen={tgl:false,nas:false};
function liburPanels(){
 const q=(liburQ||'').trim().toLowerCase(),buka=k=>q||liburOpen[k]?'open':'';
 const lt=S.libur.filter(l=>!q||[fmt(l.tgl),l.sampai&&l.sampai!==l.tgl?fmt(l.sampai):'',l.tgl,l.sampai||'',l.ket||'',l.kelas||'Semua',HR[wd(l.tgl)]].join(' ').toLowerCase().includes(q));
 const nas=S.nasional||[],ln=nas.filter(l=>!q||[fmt(l.tgl),l.tgl,HR[wd(l.tgl)],l.ket||''].join(' ').toLowerCase().includes(q));
 const msg=q?'Tidak ada tanggal yang cocok.':'',hit=(a,b)=>q?a+' dari '+b:b;
 return `<details class="panel" ${buka('tgl')} ontoggle="if(!liburQ)liburOpen.tgl=this.open"><summary class="ph">📅 Libur Tanggal Tertentu <span class="mu">${hit(lt.length,S.libur.length)} tanggal</span></summary><div class="pb"><div class="note">Libur tanggal yang sudah lewat dihapus otomatis setiap tengah malam.</div>${tab(['No','Tanggal','Kelas','Keterangan','Aksi'],lt.map((l,i)=>`<tr><td>${i+1}</td><td>${fmt(l.tgl)}${l.sampai&&l.sampai!==l.tgl?' - '+fmt(l.sampai):''}</td><td>${esc(l.kelas||'Semua')}</td><td>${esc(l.ket)}${l.sumber==='nasional'?' <span class="badge Libur">Nasional</span>':''}</td><td><button class="btn sm danger" onclick="delLibur(${l.id})">Hapus</button></td></tr>`).join(''),msg)}</div></details>
<details class="panel" ${buka('nas')} ontoggle="if(!liburQ)liburOpen.nas=this.open"><summary class="ph">🇮🇩 Libur Nasional <span class="mu">${hit(ln.length,nas.length)} tanggal</span></summary><div class="pb"><div class="note">Libur nasional diperbarui oleh Developer dan berlaku untuk semua kelas. Tanggal yang sudah lewat dihapus otomatis. Daftar ini tidak bisa diubah di sini. Bila sekolah tetap masuk pada tanggal tertentu, buka menu Absensi pada tanggal itu lalu pilih Ya, masuk.</div>${nas.length?tab(['No','Tanggal','Keterangan'],ln.map((l,i)=>`<tr style="${l.tgl<TODAY?'opacity:.55':''}"><td>${i+1}</td><td>${fmt(l.tgl)} <span class="mu">${HR[wd(l.tgl)]}</span></td><td>${esc(l.ket)}</td></tr>`).join(''),msg):'<div class="mu" style="text-align:center">Belum ada libur nasional. Developer perlu mengimpor daftarnya.</div>'}</div></details>`}
function cariLibur(el){liburQ=el.value;const c=$('#liburPanels');if(c)c.innerHTML=liburPanels()}
V.libur=()=>`<div class="panel"><div class="ph">🔁 Libur Mingguan Tetap</div><div class="pb"><div class="note">Hari yang dipilih libur setiap minggu. Server mengisi status Libur otomatis sesuai jadwal ini walau website tidak dibuka.</div><div class="chips">${[1,2,3,4,5,6,0].map(d=>`<button class="chip ${S.mingguan.includes(d)?'on':''}" onclick="togHari(${d})">${HR[d]}</button>`).join('')}</div></div></div>
<div class="panel"><div class="pb" style="padding-top:14px"><div class="tb" style="align-items:center;margin:6px 0 4px"><input id="liburCari" class="input grow search-smooth" placeholder="Cari tanggal atau keterangan (mis. 24 Desember)..." value="${esc(liburQ)}" oninput="cariLibur(this)"><button class="btn success sm add" onclick="addLibur()">+ Libur</button></div></div></div>
<div id="liburPanels">${liburPanels()}</div>`;
function togHari(d){guard(async()=>{if(S.mingguan.includes(d))await dbq(db.from('libur_mingguan').delete().eq('hari',d));else await dbq(db.from('libur_mingguan').insert({hari:d}));await muatDasar();await segarkan();renderV()})}
function addLibur(){form('Tambah Libur',[{k:'tgl',l:'Mulai tanggal',t:'date',v:TODAY},{k:'sampai',l:'Sampai tanggal (kosongkan bila satu hari)',t:'date'},{k:'kelas',l:'Kelas',o:['Semua'].concat(S.kelas.map(k=>k.nama))},{k:'ket',l:'Keterangan / alasan libur'},{k:'masuk',l:'Tanggal masuk kembali (opsional)',t:'date'}],async v=>{if(!v.tgl)throw new Error('Pilih tanggal mulai');if(v.sampai&&v.sampai<v.tgl)throw new Error('Tanggal akhir sebelum tanggal mulai');if(v.masuk&&v.masuk<v.tgl)throw new Error('Tanggal masuk kembali tidak boleh sebelum libur');await dbq(db.from('libur_tanggal').insert({mulai:v.tgl,sampai:v.sampai||v.tgl,kelas_id:v.kelas==='Semua'?null:kid(v.kelas),keterangan:v.ket||null,masuk_kembali:v.masuk||null}));await muatDasar();await segarkan();renderV()})}
function editLibur(id){const l=S.libur.find(x=>x.id===id);if(!l)return;form('Ubah Libur',[{k:'tgl',l:'Mulai tanggal',t:'date',v:l.tgl},{k:'sampai',l:'Sampai tanggal',t:'date',v:l.sampai},{k:'kelas',l:'Kelas',o:['Semua'].concat(S.kelas.map(k=>k.nama)),v:l.kelas||'Semua'},{k:'ket',l:'Keterangan / alasan libur',v:l.ket},{k:'masuk',l:'Tanggal masuk kembali (opsional)',t:'date',v:l.masuk||''}],async v=>{if(!v.tgl)throw new Error('Pilih tanggal mulai');if(v.sampai&&v.sampai<v.tgl)throw new Error('Tanggal akhir sebelum tanggal mulai');if(v.masuk&&v.masuk<v.tgl)throw new Error('Tanggal masuk kembali tidak boleh sebelum libur');await dbq(db.from('libur_tanggal').update({mulai:v.tgl,sampai:v.sampai||v.tgl,kelas_id:v.kelas==='Semua'?null:kid(v.kelas),keterangan:v.ket||null,masuk_kembali:v.masuk||null}).eq('id',id));await muatDasar();await segarkan();renderV()})}
async function delLibur(id){if(!await konfirmasi('Hapus jadwal libur ini? Notifikasi yang belum dikirim juga akan dibatalkan.',{judul:'Hapus jadwal libur',ya:'Hapus',bahaya:1}))return;guard(async()=>{await dbq(db.from('libur_tanggal').delete().eq('id',id));await muatDasar();await segarkan();renderV()})}
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
