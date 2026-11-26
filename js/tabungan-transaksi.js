/* --- Tabungan: transaksi, rekap, dan unduh --- */
V.tabungan=()=>{if(!S.tab)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat tabungan...</div></div></div>';
 const sis=S.tab.filter(r=>r.kelas_nama===tabK),hal=[['in','⬇ Pemasukan'],['out','⬆ Pengeluaran'],['rek','📊 Rekap &amp; Laporan']];
 const pil=tabP==='rek'?dt('month',tabBln,'tabSetBln(this.value)'):cpick('tabSiswaPick','nama siswa',tabS,sis.map(x=>({value:x.siswa_id,label:x.nama+(x.nisn?' · '+x.nisn:'')})),'tabPilihS','Pilih siswa');
 return `<div class="panel"><div class="ph">💰 Tabungan Siswa</div><div class="pb"><div class="utabs">${hal.map(x=>`<button class="utab${tabP===x[0]?' on':''}" onclick="tabHal('${x[0]}')">${x[1]}</button>`).join('')}</div><div class="tb tab-choice">${cpick('tabKelasPick','kelas',tabK,(tabP==='rek'?[{value:'*',label:'Semua kelas'}]:[]).concat(S.kelas.map(k=>({value:k.nama,label:k.nama}))),'tabPilihK','Pilih kelas')}</div>${tabK?`<div class="tb tab-choice">${pil}</div>`:''}${!tabK?PKH:tabP==='rek'?tabRekHTML():tabFormHTML(tabP==='out')}</div></div>`};
function tabFormHTML(out){const r=S.tab.find(x=>x.siswa_id===tabS&&x.kelas_nama===tabK);if(!r)return '<div class="note">Pilih siswa terlebih dahulu</div>';
 const wali=tabAdaWali(tabK),batal=new Set(tabRw.filter(x=>x.membatalkan_id).map(x=>x.membatalkan_id)),asc=tabBarisAsc(tabRw);
 const kotak=out&&!wali?`<div class="note">Penarikan hanya boleh dilakukan oleh wali kelas (${esc(tabWali(tabK))}).</div>`:`<div class="tb" style="flex-wrap:wrap"><input id="tbJml" class="input grow" inputmode="numeric" placeholder="Jumlah ${out?'penarikan':'setoran'} (Rp)" oninput="this.value=fmtIn(this.value)">${dt('date',TODAY,'','',{id:'tbTgl',max:TODAY})}<input id="tbCat" class="input grow" placeholder="Catatan (opsional)"><button class="btn ${out?'orange':'success'}" onclick="tabSimpan('${out?'tarik':'setor'}')">${out?'− Tarik':'+ Setor'}</button></div>`;
 const rows=asc.slice().reverse().map(o=>{const x=o.x;return `<tr style="${batal.has(x.id)?'opacity:.5;text-decoration:line-through':''}"><td>${fmt(x.tanggal)}</td><td>${jamJkt(x.dibuat)}</td><td>${tabJenis(x)}</td><td style="text-align:right;color:#1f9d55">${o.m===''?'':rp(o.m)}</td><td style="text-align:right;color:#d64545">${o.k===''?'':rp(o.k)}</td><td style="text-align:right"><b>${rp(o.s)}</b></td><td>${esc(x.catatan||'')}${x.nama_pengubah?`<div class="mu">✏ diedit oleh ${esc(x.nama_pengubah)}</div>`:''}</td><td>${esc(x.nama_pencatat||'-')}</td><td><div class="tb" style="margin:0;flex-wrap:wrap">${tabBisaUbah(x,batal)?`<button class="btn sm soft" onclick="tabUbah(${x.id})">✏ Ubah</button>`:''}${x.sumber==='manual'&&!batal.has(x.id)?`<button class="btn sm danger" onclick="tabBatal(${x.id},${tabS})">Batalkan</button>`:''}</div></td></tr>`}).join('');
 return tab(['Nama','Kelas','Wali kelas'],`<tr><td><b>${esc(r.nama)}</b></td><td>${esc(r.kelas_nama)}</td><td>${esc(tabWali(tabK))}</td></tr>`)+`<div class="saldo-highlight"><small>Saldo saat ini</small><b>${rp(r.saldo)}</b></div>`+kotak+`<div class="tb" style="flex-wrap:wrap"><button class="btn soft sm grow" onclick="tabUnduhS('pdf',this)">⬇ Rekap siswa (PDF)</button><button class="btn soft sm grow" onclick="tabUnduhS('xlsx',this)">⬇ Rekap siswa (XLSX)</button></div>`+tab(['Tanggal','Jam','Jenis','Masuk','Keluar','Saldo','Catatan','Dicatat oleh','Aksi'],rows,'Belum ada transaksi.')}
const tabCat=x=>(x.catatan||'')+(x.nama_pengubah?(x.catatan?' ':'')+'(diedit oleh '+x.nama_pengubah+')':'');
function tabBisaUbah(x,batal){if(x.sumber!=='manual'||batal.has(x.id)||Date.now()-new Date(x.dibuat).getTime()>7*864e5)return false;return x.jenis==='tarik'?tabAdaWali(tabK):(adalahKepala()||x.dicatat_oleh===me)}
function tabUbah(id){const x=tabRw.find(r=>r.id===id);if(!x)return;
 form('Ubah '+(x.jenis==='setor'?'setoran':'penarikan')+' (maks. 7 hari sejak dicatat)',[{k:'jml',l:'Jumlah (Rp)',v:fmtIn(x.jumlah)},{k:'tgl',l:'Tanggal',t:'date',v:x.tanggal},{k:'cat',l:'Catatan (opsional)',v:x.catatan||''}],async v=>{
  const jml=Number(String(v.jml||'').replace(/\D/g,''));if(!jml)throw new Error('Isi jumlah dengan angka lebih dari 0');
  const baru=await dbq(db.rpc('tabungan_ubah',{p_id:id,p_jumlah:jml,p_tanggal:v.tgl||x.tanggal,p_catatan:(v.cat||'').trim()||null}));
  await muatTabungan();await tabMuatRw();toast('Transaksi diperbarui. Saldo '+rp(baru));renderV()});
 const e=$('#f_jml');if(e)e.oninput=function(){this.value=fmtIn(this.value)};$('#ms').textContent='Simpan perubahan'}
function tabSimpan(jenis){const jml=Number(String($('#tbJml').value).replace(/\D/g,'')),r=S.tab.find(x=>x.siswa_id===tabS);if(!jml)return toast('Isi jumlah dengan angka lebih dari 0',false);if(jenis==='tarik'&&jml>Number(r.saldo))return toast('Saldo tidak cukup. Saldo sekarang '+rp(r.saldo),false);
 return guard(async()=>{const baru=await dbq(db.rpc('tabungan_catat',{p_siswa:tabS,p_jenis:jenis,p_jumlah:jml,p_tanggal:$('#tbTgl').value||null,p_catatan:($('#tbCat').value||'').trim()||null}));await muatTabungan();await tabMuatRw();toast((jenis==='setor'?'Setoran ':'Penarikan ')+rp(jml)+' dicatat. Saldo '+rp(baru));renderV();return true})}
function tabUnduhS(t,btn){const r=S.tab.find(x=>x.siswa_id===tabS);if(!r)return;const rows=tabBarisAsc(tabRw).reverse().map(o=>[fmt(o.x.tanggal),jamJkt(o.x.dibuat),tabJenis(o.x),o.m,o.k,o.s,tabCat(o.x),o.x.nama_pencatat||'-']);
 tabBerkas(t,'rekap-tabungan-'+r.nama.replace(/[^\w]+/g,'-'),'REKAP TABUNGAN','Nama: '+r.nama+'  |  NISN: '+(r.nisn||'-')+'  |  Kelas: '+r.kelas_nama+'  |  Saldo: '+rp(r.saldo),['Tanggal','Jam','Jenis','Masuk (Rp)','Keluar (Rp)','Saldo (Rp)','Catatan','Dicatat oleh'],rows,r.kelas_nama,btn,[3,4,5])}
function tabRekHTML(){rkMuatStatus('tabungan');const D=tabRekD;if(!D)return '<div class="note">⏳ Memuat rekap...</div>';const T=k=>D.reduce((a,d)=>a+d[k],0),R=v=>`<td style="text-align:right">${rp(v)}</td>`;
 const rows=D.map((d,i)=>`<tr><td>${i+1}</td><td><b>${esc(d.r.nama)}</b></td><td>${tabK==='*'?esc(d.r.kelas_nama||'-'):esc(tabWali(tabK))}</td>${R(d.awal)}${R(d.masuk)}${R(d.keluar)}<td style="text-align:right"><b>${rp(d.akhir)}</b></td><td>${rkSel(siswaById(d.r.siswa_id)||{id:d.r.siswa_id},'tabungan','Laporan tabungan '+fmtB(tabBln))}</td><td><div class="tb" style="margin:0;flex-wrap:wrap"><button class="btn sm soft" onclick="tabRiwBulan(${d.r.siswa_id})">Riwayat</button><button class="btn sm success" onclick="tabKirim(${d.r.siswa_id})">📤 Kirim</button><button class="btn sm soft" onclick="tabLihatPesan(${d.r.siswa_id})">👁 Lihat pesan</button></div></td></tr>`).join('');
 return `<div class="tb" style="flex-wrap:wrap"><button class="btn success grow" onclick="tabUnduhK('pdf',this)">⬇ Rekap (PDF)</button><button class="btn grow" onclick="tabUnduhK('xlsx',this)">⬇ Rekap (XLSX)</button><button class="btn orange grow" onclick="tabKirimSemua()">📤 Kirim laporan ke orang tua</button><button class="btn soft grow" onclick="tabLihatPesanSemua()">👁 Lihat pesan</button><button class="btn soft grow" onclick="riwayatKirim()">📋 Riwayat kirim</button><button class="btn soft grow" onclick="rkSegar('tabungan',this)">🔄 Perbarui status</button></div><div class="cards"><div class="card stat"><b>${rp(T('akhir'))}</b>Total saldo akhir</div><div class="card stat"><b>${rp(T('masuk'))}</b>Masuk ${fmtB(tabBln)}</div><div class="card stat"><b>${rp(T('keluar'))}</b>Keluar ${fmtB(tabBln)}</div></div>`+tab(['No','Nama',tabK==='*'?'Kelas':'Wali kelas','Saldo awal','Masuk','Keluar','Saldo akhir','Status pesan','Aksi'],rows,tabK==='*'?'Tidak ada data tabungan siswa.':'Tidak ada siswa di kelas ini.')}
function tabRiwBulan(id){const d=(tabRekD||[]).find(x=>x.r.siswa_id===id);if(!d)return;info('Riwayat '+d.r.nama+' - '+fmtB(tabBln),tab(['Tanggal','Jam','Jenis','Masuk','Keluar','Catatan','Dicatat oleh'],d.bl.slice().sort(tabCmp).reverse().map(x=>`<tr><td>${fmt(x.tanggal)}</td><td>${jamJkt(x.dibuat)}</td><td>${tabJenis(x)}</td><td style="text-align:right">${x.jenis==='setor'?rp(x.jumlah):''}</td><td style="text-align:right">${x.jenis==='tarik'?rp(x.jumlah):''}</td><td>${esc(tabCat(x))}</td><td>${esc(x.nama_pencatat||'-')}</td></tr>`).join(''),'Tidak ada transaksi bulan ini.'))}
function tabUnduhK(t,btn){const D=tabRekD||[];if(!D.length)return toast(tabK==='*'?'Tidak ada data tabungan siswa':'Tidak ada siswa di kelas ini',false);const sem=tabK==='*',T=k=>D.reduce((a,d)=>a+d[k],0),w=sem?'':tabWali(tabK);
 if(sem)return tabUnduhSemuaKelas(t,btn,D);
 const rows=D.map((d,i)=>[i+1,d.r.nama,w,d.awal,d.masuk,d.keluar,d.akhir]).concat([['','JUMLAH','',T('awal'),T('masuk'),T('keluar'),T('akhir')]]);
 tabBerkas(t,'rekap-tabungan-kelas-'+tabK.replace(/[^\\w]+/g,'-')+'-'+tabBln,'REKAP TABUNGAN KELAS','Kelas '+tabK+'  |  Wali kelas: '+w+'  |  Bulan '+fmtB(tabBln),['No','Nama','Wali kelas','Saldo awal (Rp)','Masuk (Rp)','Keluar (Rp)','Saldo akhir (Rp)'],rows,tabK,btn,[3,4,5,6])}
async function tabUnduhSemuaKelas(t,btn,D){
 await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,'Membuat rekap semua kelas...'))return;
 try{await jedaUnduh();const G=S.kelas.map(k=>[k.nama,D.filter(x=>x.r.kelas_nama===k.nama)]).filter(x=>x[1].length);if(!G.length)throw new Error('Tidak ada data rekap tabungan untuk kelas ini');
  const nf='rekap-tabungan-semua-kelas-'+tabBln;
  if(t==='xlsx'){
   const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();const used=new Set();
   for(const [k,list] of G){const ws=wb.addWorksheet(namaSheetSiswa(k,used));ws.columns=[{width:6},{width:32},{width:24},{width:18},{width:18},{width:18},{width:18}];
    ws.addRow(['REKAP TABUNGAN SISWA - '+ns()]);ws.mergeCells(1,1,1,7);ws.getRow(1).font={bold:true,size:14};
    ws.addRow(['Kelas '+k+' | Wali kelas: '+(ttdWali(k)?.nama||'-')+' | Bulan '+fmtB(tabBln)]);ws.mergeCells(2,1,2,7);
    ws.addRow(['No','Nama','Wali kelas','Saldo awal (Rp)','Masuk (Rp)','Keluar (Rp)','Saldo akhir (Rp)']);ws.getRow(3).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF6B46C1'}};c.alignment={horizontal:'center',vertical:'middle'}});
    const sum=a=>list.reduce((v,x)=>v+x[a],0);list.forEach((x,i)=>ws.addRow([i+1,x.r.nama,ttdWali(k)?.nama||'-',x.awal,x.masuk,x.keluar,x.akhir]));ws.addRow(['','JUMLAH','',sum('awal'),sum('masuk'),sum('keluar'),sum('akhir')]);
    const row=ws.rowCount+2;await xlsxTtdRekap(wb,ws,k,row,1,5,6);ws.getCell(row+5,1).value='Wali Kelas: '+(ttdWali(k)?.nama||'-');ws.getCell(row+5,6).value='Kepala Sekolah: '+(ttdKepsek().nama||'-');if(ttdKepsek().nip)ws.getCell(row+6,6).value='NIP. '+ttdKepsek().nip;
   }
   await tulisXlsx(wb,nf+'.xlsx');
  }else{
   const d=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
   for(let i=0;i<G.length;i++){if(i)d.addPage();const [k,list]=G[i],sum=a=>list.reduce((v,x)=>v+x[a],0);
    d.setFont('helvetica','bold');d.setFontSize(13);d.text('REKAP TABUNGAN SISWA - '+ns().toUpperCase(),105,14,{align:'center'});
    d.setFont('helvetica','normal');d.setFontSize(8.5);d.text('Kelas '+k+' | Wali kelas: '+(ttdWali(k)?.nama||'-')+' | Bulan '+fmtB(tabBln)+' | Dicetak '+fmt(TODAY),105,20,{align:'center'});
    const body=list.map((x,n)=>[n+1,x.r.nama,ttdWali(k)?.nama||'-',rp(x.awal),rp(x.masuk),rp(x.keluar),rp(x.akhir)]).concat([['','JUMLAH','',rp(sum('awal')),rp(sum('masuk')),rp(sum('keluar')),rp(sum('akhir'))]]);
    d.autoTable({startY:27,head:[['No','Nama','Wali kelas','Saldo awal','Masuk','Keluar','Saldo akhir']],body,theme:'grid',styles:{fontSize:8,cellPadding:1.6},headStyles:{fillColor:[107,70,193],halign:'center'},columnStyles:{0:{halign:'center',cellWidth:9},1:{cellWidth:44},2:{cellWidth:34},3:{halign:'right'},4:{halign:'right'},5:{halign:'right'},6:{halign:'right'}}});
    let y=d.lastAutoTable.finalY+10;if(y+42>285){d.addPage();y=20}await pdfTtdRekap(d,k,y);
   }
   d.save(nf+'.pdf');
  }
  toast('Rekap tabungan semua kelas berhasil disiapkan ('+G.length+' kelas)')}
 catch(e){toast('Gagal mengunduh rekap tabungan: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}
}
function pesanTab(d){const s=d.r;return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_\n\nBerikut laporan tabungan ananda.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas_nama+'\nBulan : *'+fmtB(tabBln)+'*\ndi '+ns()+'\n\nSaldo awal: '+rp(d.awal)+'\nTotal masuk: '+rp(d.masuk)+'\nTotal keluar: '+rp(d.keluar)+'\n*Saldo akhir: '+rp(d.akhir)+'*\n\n📝*RIWAYAT TABUNGAN*\n\n'+(d.bl.length?d.bl.map((x,i)=>(i+1)+'. '+fmt(x.tanggal)+'  '+(x.jenis==='setor'?'Setor +':'Tarik -')+rp(x.jumlah)).join('\n'):'Tidak ada transaksi bulan ini.')+'\n\nTerima kasih 🙏🏻\n_Waalaikumsalam warahmatullahi wabarakatuh_'}
const tabPesan=s=>pesanTab((tabRekD||[]).find(d=>d.r.siswa_id===s.id));
async function tabKirim(id){const s=siswaById(id);if(!s||!s.wa)return toast('Orang tua belum punya nomor WhatsApp',false);if(await konfirmasi('Kirim laporan tabungan '+fmtB(tabBln)+' '+s.pan+' ke '+s.wa+'?',{judul:'Kirim laporan',ikon:'📤',ya:'Kirim'}))kirimList([s],tabPesan)}
async function tabKirimSemua(){const l=(tabRekD||[]).map(d=>siswaById(d.r.siswa_id)).filter(Boolean);if(!l.length)return toast('Tidak ada anak',false);if(await konfirmasi('Kirim laporan tabungan '+fmtB(tabBln)+' ke '+l.length+' orang tua sekarang?'+(l.length>1?'\n\nPesan dijadwalkan bertahap (jeda 15-30 detik per anak), perkiraan semua terkirim '+estJadwal(l.length)+'. Halaman boleh ditutup setelah proses penjadwalan selesai (beberapa detik).':''),{judul:'Kirim semua laporan',ikon:'📤',ya:'Kirim'}))kirimList(l,tabPesan)}
async function tabBerkas(t,nm,judul,sub,head,rows,kls,btn,num){await muatLib(['exceljs','pdf']);if(!setUnduhBusy(btn,true,'Membuat berkas...'))return;
 try{await jedaUnduh();const tg=ttdKepsek(),wl=ttdWali(kls),n=head.length,nu=num||[];
  if(t==='pdf'){const d=new window.jspdf.jsPDF({unit:'mm',format:'a4'}),cs={};nu.forEach(i=>cs[i]={halign:'right'});
   d.setFont('helvetica','bold');d.setFontSize(13);d.text(judul+' - '+ns().toUpperCase(),105,14,{align:'center'});d.setFont('helvetica','normal');d.setFontSize(8.5);d.text(d.splitTextToSize(sub,180),105,20,{align:'center'});
   d.autoTable({startY:28,head:[head],body:rows.map(r=>r.map((v,i)=>nu.includes(i)&&v!==''?Number(v).toLocaleString('id-ID'):String(v))),columnStyles:cs,theme:'grid',styles:{fontSize:8,cellPadding:1.6},headStyles:{fillColor:[118,80,184],halign:'center'}});
   let y=d.lastAutoTable.finalY+10;if(y+42>285){d.addPage();y=20}
   await pdfTtdRekap(d,kls,y);d.save(nm+'.pdf')}
  else{await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
   const F='Arial',wb=new ExcelJS.Workbook(),ws=wb.addWorksheet('Tabungan'),mid={vertical:'middle',horizontal:'center'},fl=a=>({type:'pattern',pattern:'solid',fgColor:{argb:a}});
   const mg=(r,a,b,v,o)=>{if(a<b)ws.mergeCells(r,a,r,b);const c=ws.getCell(r,a);c.value=v;c.font=Object.assign({name:F,size:10},o||{});c.alignment=mid;return c};
   let c=mg(1,1,n,judul+' - '+ns().toUpperCase(),{size:13,bold:true,color:{argb:'FFFFFFFF'}});c.fill=fl('FF7650B8');ws.getRow(1).height=26;c=mg(2,1,n,sub,{size:9,color:{argb:'FF4B3A75'}});c.fill=fl('FFEEE5FB');
   head.forEach((h,i)=>{const x=ws.getCell(4,i+1);x.value=h;x.font={name:F,size:10,bold:true,color:{argb:'FFFFFFFF'}};x.fill=fl('FF7650B8');x.alignment=mid});
   rows.forEach((r,j)=>r.forEach((v,i)=>{const x=ws.getCell(5+j,i+1);x.value=nu.includes(i)&&v!==''?Number(v):v;x.font={name:F,size:10};if(nu.includes(i))x.numFmt='#,##0';x.border={bottom:{style:'hair',color:{argb:'FFCFD9D3'}}}}));
   for(let i=1;i<=n;i++)ws.getColumn(i).width=Math.min(40,Math.max(12,...[head[i-1]].concat(rows.map(r=>r[i-1])).map(v=>String(v==null?'':v).length+3)));
   const r0=5+rows.length+2,a2=Math.max(2,Math.floor(n/3)),b1=Math.max(a2+1,n-a2+1),B={name:F,size:10,bold:true},N={name:F,size:10};[2,3,4].forEach(i=>{ws.getRow(r0+i).height=18});
   mg(r0,b1,n,tg.kota?{richText:[{text:tg.kota+',',font:B},{text:' '+tg.tgl,font:N}]}:tg.tgl);mg(r0+1,b1,n,'( Kepala Sekolah )');mg(r0+5,b1,n,tg.nama||'................................',{bold:true,underline:true});if(tg.nip)mg(r0+6,b1,n,'Nip. '+tg.nip);
   if(wl){mg(r0,1,a2,{richText:[{text:'Mengetahui,',font:B},{text:' Wali kelas',font:N}]});mg(r0+1,1,a2,'( '+wl.kelas+' )');mg(r0+5,1,a2,wl.nama,{bold:true,underline:true});if(wl.nip)mg(r0+6,1,a2,'Nip. '+wl.nip)}
   await xlsxTtdRekap(wb,ws,kls,r0+1,1,b1-1,b1);await tulisXlsx(wb,nm+'.xlsx')}
  toast('Berkas '+(t==='xlsx'?'XLSX':'PDF')+' sedang diproses, mohon ditunggu')}catch(e){toast('Gagal mengunduh: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

const tabJenis=x=>x.sumber==='pembatalan'?'Pembatalan':x.sumber==='saldo_awal'?'Saldo awal':x.jenis==='setor'?'Setor':'Tarik';
function tabRiwayat(sid){const r=(S.tab||[]).find(x=>x.siswa_id===sid)||{nama:'',saldo:0};
 guard(async()=>{const t=await dbq(db.from('tabungan_transaksi').select('*').eq('siswa_id',sid).order('id',{ascending:false}).limit(200));
  const batal=new Set(t.filter(x=>x.membatalkan_id).map(x=>x.membatalkan_id));
  const baris=t.map(x=>`<tr style="${batal.has(x.id)?'opacity:.5;text-decoration:line-through':''}"><td>${fmt(x.tanggal)}</td><td>${tabJenis(x)}</td><td style="text-align:right;color:${x.jenis==='setor'?'#1f9d55':'#d64545'}">${x.jenis==='setor'?'+':'−'}${rp(x.jumlah)}</td><td>${esc(x.catatan||'')}<div class="mu">${esc(x.nama_pencatat||'')}</div></td><td>${x.sumber==='manual'&&!batal.has(x.id)?`<button class="btn sm danger" onclick="tabBatal(${x.id},${sid})">Batalkan</button>`:''}</td></tr>`).join('');
  info('Riwayat - '+r.nama+' (saldo '+rp(r.saldo)+')',t.length?tab(['Tanggal','Jenis','Jumlah','Catatan','Aksi'],baris):'<div class="mu">Belum ada transaksi.</div>')})}
function tabBatal(id,sid){form('Batalkan transaksi',[{k:'a',l:'Alasan pembatalan (wajib)'}],async v=>{
  if((v.a||'').trim().length<3)throw new Error('Isi alasan pembatalan');
  await dbq(db.rpc('tabungan_batalkan',{p_id:id,p_alasan:v.a.trim()}));await muatTabungan();await tabMuatRw();toast('Transaksi dibatalkan');renderV()});$('#ms').textContent='Batalkan transaksi'}
function sheetTabungan(wb,nama,rows,kls){
 const F='Arial',ws=wb.addWorksheet(String(nama).replace(/[\\\/\?\*\[\]:]/g,'-').slice(0,31),{pageSetup:{orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0}});
 const fl=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}),ln={style:'thin',color:{argb:'FFCFD9D3'}},bd={top:ln,left:ln,bottom:ln,right:ln},mid={horizontal:'center',vertical:'middle'};
 ws.columns=[{width:6},{width:34},{width:18},{width:16},{width:18}];
 ws.mergeCells(1,1,1,5);ws.mergeCells(2,1,2,5);
 const a=ws.getCell(1,1);a.value='REKAP TABUNGAN SISWA - '+ns().toUpperCase();a.font={name:F,size:13,bold:true,color:{argb:'FFFFFFFF'}};a.fill=fl('FF6B46C1');a.alignment=mid;ws.getRow(1).height=26;
 const b=ws.getCell(2,1);b.value=(kls?'Kelas '+kls:'Semua kelas')+'   |   Per '+fmt(TODAY);b.font={name:F,size:10,color:{argb:'FFFFFFFF'}};b.fill=fl('FF6B46C1');b.alignment=mid;
 ['No','Nama','NISN','Kelas','Saldo (Rp)'].forEach((h,i)=>{const c=ws.getCell(4,i+1);c.value=h;c.font={name:F,size:10,bold:true};c.fill=fl('FFE9E3F7');c.border=bd;c.alignment=mid});
 let r=5,tot=0;rows.forEach((x,i)=>{tot+=Number(x.saldo);[i+1,x.nama,x.nisn||'',x.kelas_nama||'',Number(x.saldo)].forEach((val,j)=>{const c=ws.getCell(r,j+1);c.value=val;c.font={name:F,size:10};c.border=bd;c.alignment={vertical:'middle',horizontal:j===4?'right':j===1?'left':'center'};if(j===4)c.numFmt='#,##0';if(j===2)c.numFmt='@'});r++});
 ws.mergeCells(r,1,r,4);const t=ws.getCell(r,1);t.value='TOTAL';t.font={name:F,size:10,bold:true};t.alignment={horizontal:'right'};t.border=bd;const tv=ws.getCell(r,5);tv.value=tot;tv.numFmt='#,##0';tv.font={name:F,size:10,bold:true};tv.border=bd;tv.alignment={horizontal:'right'};
 const tg=ttdKepsek(bulan),wl=kls?ttdWali(kls):null,r0=r+3;
 const blok=(c1,c2,rr,val,o)=>{ws.mergeCells(rr,c1,rr,c2);const x=ws.getCell(rr,c1);x.value=val;x.font=Object.assign({name:F,size:10},o||{});x.alignment=mid};
 blok(4,5,r0,(tg.kota?tg.kota+', ':'')+tg.tgl);blok(4,5,r0+1,'( Kepala Sekolah )');blok(4,5,r0+5,tg.nama||'................................',{bold:true,underline:true});if(tg.nip)blok(4,5,r0+6,'Nip. '+tg.nip);
 if(wl){blok(1,3,r0,'Mengetahui, Wali kelas');blok(1,3,r0+1,'( '+wl.kelas+' )');blok(1,3,r0+5,wl.nama,{bold:true,underline:true});if(wl.nip)blok(1,3,r0+6,'Nip. '+wl.nip)}
 ws.views=[{state:'frozen',ySplit:4}];return ws}
function unduhTabungan(jenis){guard(async()=>{await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat. Muat ulang halaman');
 const wb=new ExcelJS.Workbook();wb.creator=ns();wb.created=new Date();const nf=ns().replace(/[^\w]+/g,'-');
 if(jenis==='rekap'){const d=(S.tab||[]).filter(r=>Number(r.saldo)!==0||r.aktif);
  const wsAll=sheetTabungan(wb,'Semua kelas',d,'');await xlsxTtdRekap(wb,wsAll,'',wsAll.rowCount-5,1,3,4);for(const k of S.kelas){const x=d.filter(r=>r.kelas_nama===k.nama);if(x.length){const ws=sheetTabungan(wb,k.nama,x,k.nama);await xlsxTtdRekap(wb,ws,k.nama,ws.rowCount-5,1,3,4)}}
  await tulisXlsx(wb,'Rekap-Tabungan-'+nf+'-'+TODAY+'.xlsx');toast('Rekap tabungan sedang diproses, mohon ditunggu');return}
 const semua=[];for(let a=0;a<50000;a+=1000){const p=await dbq(db.from('tabungan_transaksi').select('*').order('id',{ascending:true}).range(a,a+999));semua.push(...p);if(p.length<1000)break}
 const ws=wb.addWorksheet('Riwayat'),H=['Tanggal','Nama','NISN','Kelas','Jenis','Jumlah (Rp)','Catatan','Dicatat oleh','Waktu catat'];
 ws.columns=[{width:12},{width:30},{width:16},{width:14},{width:14},{width:16},{width:40},{width:22},{width:18}];
 H.forEach((h,i)=>{const c=ws.getCell(1,i+1);c.value=h;c.font={bold:true};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FFE9E3F7'}}});
 semua.forEach((x,i)=>{const r=i+2,v=[x.tanggal,x.nama_siswa,x.nisn||'',x.kelas_nama||'',tabJenis(x),(x.jenis==='setor'?1:-1)*Number(x.jumlah),x.catatan||'',x.nama_pencatat||'',new Date(x.dibuat).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})];v.forEach((val,j)=>{const c=ws.getCell(r,j+1);c.value=val;if(j===5)c.numFmt='#,##0;[Red]-#,##0';if(j===2)c.numFmt='@'})});
 ws.views=[{state:'frozen',ySplit:1}];await xlsxTtdRekap(wb,ws,'',ws.rowCount+2,1,6,7);
 await tulisXlsx(wb,'Riwayat-Tabungan-'+nf+'-'+TODAY+'.xlsx');toast('Riwayat tabungan sedang diproses ('+semua.length+' baris), mohon ditunggu')})}
