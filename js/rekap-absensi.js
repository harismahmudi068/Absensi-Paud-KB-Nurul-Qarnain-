/* Kelompok fitur: rekap absensi bulanan dan unduhan riwayat PDF/XLSX. */
/* ---------- rekap + unduh riwayat ---------- */
const LB={Hadir:'H',Terlambat:'T',Izin:'I',Sakit:'S',Alpa:'A',Libur:'L',Belum:'-'};
function matriks(b,k){const sem=k==='*',ds=hariBulan(b,true),l=act().filter(s=>!k||sem||s.kelas===k);if(sem)l.sort(urutKN);return{ds,rows:l.map((s,i)=>{const r=ringkas(s,b,true);return[i+1,s.nama,s.nisn||'-',s.kelas].concat(ds.map(d=>LB[statusRekap(s,d)])).concat([r.c.Hadir,r.c.Terlambat,r.c.Izin,r.c.Sakit,r.c.Alpa,r.c.Libur,r.pct+'%'])}),head:['No','Nama','NISN','Kelas'].concat(ds.map(d=>String(+d.slice(8)))).concat(['Hadir','Terlambat','Izin','Sakit','Alpa','Libur','% Hadir'])}}
let rkNQ='';
function rekapBulanTabel(){rkMuatStatus('laporan');const q=rkNQ.trim().toLowerCase(),l=act().filter(s=>rk&&(rk==='*'||s.kelas===rk)&&(!q||s.nama.toLowerCase().includes(q)||String(s.pan||'').toLowerCase().includes(q)||String(s.nisn||'').includes(q)||cocokWA(s.wa,q)));if(rk==='*')l.sort(urutKN);
 const rows=l.map((s,i)=>{const r=ringkas(s,bulan,true),wa=s.wa?nomorWAReport(s):'<span class="badge Sakit">Tanpa nomor</span>',aksi='<button class="btn sm success" '+(s.wa?'':'disabled')+' onclick="kirimSatu('+s.id+')">Kirim Pesan</button> <button class="btn sm soft" onclick="lihatPesan('+s.id+')">Lihat Pesan</button>';return '<tr><td>'+(i+1)+'</td><td><b>'+esc(s.nama)+'</b><div class="mu">'+esc(s.pan||'')+'</div></td><td>'+esc(s.nisn||'-')+'</td><td>'+esc(s.kelas)+'</td><td>'+r.c.Hadir+'</td><td>'+r.c.Terlambat+'</td><td>'+r.c.Izin+'</td><td>'+r.c.Sakit+'</td><td>'+r.c.Alpa+'</td><td>'+r.c.Libur+'</td><td><b>'+r.pct+'%</b></td><td>'+wa+'</td><td>'+rkSel(s,'laporan','Laporan '+fmtB(bulan))+'</td><td>'+aksi+'</td></tr>'}).join('');
 return tab(['No','Nama Anak','NISN','Kelas','Hadir','Terlambat','Izin','Sakit','Alpa','Libur','% Hadir','WhatsApp','Status Pesan','Aksi'],rows,rk?(q?'Tidak ada anak yang cocok.':''):PKM)}
function cariRekapBulan(el){rkNQ=el.value;const t=$('#rkBulanTab');if(t)t.innerHTML=rekapBulanTabel()}
V.rekap=()=>{const n=hariBulan(bulan,true).length;
 return `<div class="panel"><div class="ph">📚 Rekap Absensi <span class="mu">${n} hari dihitung</span></div><div class="pb"><div class="tb rekap-filter">${dt('month',bulan,"setBulan(this.value)")}<select class="select" onchange="rk=this.value;renderV()">${kopt2s(rk)}</select></div>
 <div class="tb"><input id="rkNama" class="input grow search-smooth" placeholder="Cari nama anak..." value="${esc(rkNQ)}" oninput="cariRekapBulan(this)"></div>
 <div class="tb"><button class="btn success sm dl" onclick="unduh('pdf',this)">⬇ Riwayat (PDF)</button><button class="btn sm dl pdf" onclick="unduh('xlsx',this)">⬇ Riwayat (XLSX)</button><button class="btn success sm dl" onclick="kirimSemuaRekap()">Kirim Semua</button><button class="btn sm dl" onclick="riwayatKirim()">Riwayat Kirim</button></div>
 <div class="note">Tabel di bawah adalah rekap jumlah bulan yang dipilih. Jika sudah ada absensi yang tercatat pada tanggal setelah hari ini, rekap dan berkas unduhan akan otomatis diperpanjang sampai tanggal catatan terakhir tersebut. Berkas unduhan berisi riwayat harian seluruh anak (H hadir, T terlambat, I izin, S sakit, A alpa, L libur). Persentase menghitung hari libur sebagai hadir. Pencarian nama hanya menyaring tabel ini, tidak memengaruhi berkas unduhan.</div>
 <div id="rkBulanTab">${rekapBulanTabel()}`};
async function kirimSemuaRekap(){if(!rk)return toast(PK,false);lo=rk;lb=bulan;loQ='';return kirimSemua()}
function setBulan(v){if(!/^\d{4}-\d{2}$/.test(v||''))return;bulan=v;lb=v;renderV();guard(async()=>{await muatBulan(v);renderV()})}
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
