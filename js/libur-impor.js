const LIBUR_TEMPLATE=[
['2026-12-24','Cuti Bersama Kelahiran Yesus Kristus (Natal)'],['2026-12-25','Kelahiran Yesus Kristus (Natal)'],
['2027-01-01','Tahun Baru 2027 Masehi'],['2027-01-05','Isra Mikraj Nabi Muhammad SAW'],['2027-02-05','Cuti Bersama Tahun Baru Imlek 2578 Kongzili'],['2027-02-06','Tahun Baru Imlek 2578 Kongzili'],
['2027-03-08','Hari Suci Nyepi (Tahun Baru Saka 1949)'],['2027-03-09','Cuti Bersama Idulfitri 1448 Hijriah'],['2027-03-10','Idulfitri 1448 Hijriah'],['2027-03-11','Idulfitri 1448 Hijriah'],
['2027-03-12','Cuti Bersama Idulfitri 1448 Hijriah'],['2027-03-15','Cuti Bersama Idulfitri 1448 Hijriah'],['2027-03-25','Cuti Bersama Wafat Yesus Kristus'],['2027-03-26','Wafat Yesus Kristus'],
['2027-03-28','Kebangkitan Yesus Kristus (Paskah)'],['2027-05-01','Hari Buruh Internasional'],['2027-05-06','Kenaikan Yesus Kristus'],['2027-05-17','Iduladha 1448 Hijriah'],
['2027-05-18','Cuti Bersama Iduladha 1448 Hijriah'],['2027-05-19','Cuti Bersama Waisak 2571 BE'],['2027-05-20','Hari Raya Waisak 2571 BE'],['2027-06-01','Hari Lahir Pancasila'],
['2027-06-06','1 Muharam Tahun Baru Islam 1449 Hijriah'],['2027-08-15','Maulid Nabi Muhammad SAW'],['2027-08-17','Proklamasi Kemerdekaan'],['2027-12-24','Cuti Bersama Kelahiran Yesus Kristus (Natal)'],
['2027-12-25','Kelahiran Yesus Kristus (Natal)'],['2027-12-26','Isra Mikraj Nabi Muhammad SAW']];
const tglLibur=v=>{v=String(v||'').trim();let m=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/),y,mo,d;if(m){y=+m[1];mo=+m[2];d=+m[3]}else if(m=v.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/)){d=+m[1];mo=+m[2];y=+m[3]}else return '';const t=new Date(Date.UTC(y,mo-1,d));if(t.getUTCFullYear()!==y||t.getUTCMonth()!==mo-1||t.getUTCDate()!==d)return '';return y+'-'+String(mo).padStart(2,'0')+'-'+String(d).padStart(2,'0')};
async function unduhTemplateLibur(btn){await muatLib('exceljs');
 if(!setUnduhBusy(btn,true,'Membuat template...'))return;
 try{await jedaUnduh();
  await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
  const F='Arial',N=300,H=4,R0=H+1,R1=H+N,fl=c=>({type:'pattern',pattern:'solid',fgColor:{argb:c}}),ln={style:'thin',color:{argb:'FFCFD9D3'}},bd={top:ln,left:ln,bottom:ln,right:ln},mid={horizontal:'center',vertical:'middle'};
  const wb=new ExcelJS.Workbook();wb.creator='Sistem Absensi';wb.created=new Date();
  const ws=wb.addWorksheet('Libur Nasional',{views:[{state:'frozen',ySplit:H,showGridLines:false}],properties:{tabColor:{argb:'FF176B3A'}},pageSetup:{orientation:'portrait',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:'+H}});
  ws.columns=[{width:7},{width:17},{width:13},{width:64}];
  ['A1:D1','A2:D2','A3:D3'].forEach(x=>ws.mergeCells(x));
  const t1=ws.getCell('A1'),t2=ws.getCell('A2'),t3=ws.getCell('A3');
  t1.value='TEMPLATE LIBUR NASIONAL';t1.font={name:F,size:16,bold:true,color:{argb:'FFFFFFFF'}};t1.fill=fl('FF176B3A');t1.alignment=mid;
  t2.value='Daftar libur nasional dan cuti bersama untuk seluruh sekolah';t2.font={name:F,size:10,color:{argb:'FF14532D'}};t2.fill=fl('FFDFF3E7');t2.alignment=mid;
  t3.value='Isi Tanggal dan Keterangan mulai baris '+R0+'. Kolom No dan Hari terisi otomatis. Baris contoh boleh diganti atau dihapus.';t3.font={name:F,size:9,italic:true,color:{argb:'FF6D7D73'}};t3.fill=fl('FFF7FAF8');t3.alignment={horizontal:'center',vertical:'middle',wrapText:true};
  ws.getRow(1).height=34;ws.getRow(2).height=22;ws.getRow(3).height=22;
  ['No','Tanggal','Hari','Keterangan'].forEach((h,i)=>{const c=ws.getCell(H,i+1);c.value=h;c.font={name:F,size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill=fl('FF176B3A');c.alignment=mid;c.border={top:{style:'medium',color:{argb:'FF0F4F2A'}},left:ln,right:ln,bottom:{style:'medium',color:{argb:'FF0F4F2A'}}}});
  ws.getRow(H).height=26;
  const HR_X=['Senin','Selasa','Rabu','Kamis','Jumat','Sabtu','Minggu'];
  for(let i=0;i<N;i++){const r=R0+i,d=LIBUR_TEMPLATE[i],z=i%2?'FFF4F9F5':'FFFFFFFF',row=ws.getRow(r);row.height=21;
   let tgl=null,hari='';if(d){const m=d[0].split('-').map(Number);tgl=new Date(Date.UTC(m[0],m[1]-1,m[2]));hari=LIBUR_HARI[tgl.getUTCDay()]}
   const a=row.getCell(1),b=row.getCell(2),c=row.getCell(3),k=row.getCell(4);
   a.value={formula:'IF(B'+r+'="","",ROW()-'+H+')',result:d?i+1:''};
   b.value=tgl;b.numFmt='dd/mm/yyyy';
   c.value={formula:'IF(B'+r+'="","",CHOOSE(WEEKDAY(B'+r+',2),"Senin","Selasa","Rabu","Kamis","Jumat","Sabtu","Minggu"))',result:hari};
   k.value=d?d[1]:null;
   [a,b,c,k].forEach((x,j)=>{x.fill=fl(z);x.border=bd;x.font={name:F,size:10,bold:j===1,color:{argb:j===0||j===2?'FF526B84':'FF1F2D26'}};x.alignment=j===3?{vertical:'middle',horizontal:'left',indent:1}:mid});
   b.dataValidation={type:'date',operator:'between',allowBlank:true,formulae:[new Date(Date.UTC(2000,0,1)),new Date(Date.UTC(2099,11,31))],showErrorMessage:true,errorStyle:'stop',errorTitle:'Tanggal tidak valid',error:'Isi tanggal yang benar, contoh 25/12/2026.',showInputMessage:true,promptTitle:'Tanggal',prompt:'Contoh: 25/12/2026'};
   k.dataValidation={type:'textLength',operator:'lessThanOrEqual',allowBlank:true,formulae:[200],showErrorMessage:true,errorStyle:'stop',errorTitle:'Keterangan terlalu panjang',error:'Keterangan maksimal 200 karakter.'};
  }
  ws.conditionalFormatting=[{ref:'A'+R0+':D'+R1,rules:[{type:'expression',priority:1,formulae:['AND($B'+R0+'<>"",WEEKDAY($B'+R0+',2)>5)'],style:{fill:{type:'pattern',pattern:'solid',bgColor:{argb:'FFFFE8BF'}},font:{color:{argb:'FF9A5B00'},bold:true}}}]}];
  ws.autoFilter={from:{row:H,column:1},to:{row:R1,column:4}};
  const wp=wb.addWorksheet('Petunjuk',{views:[{showGridLines:false}],properties:{tabColor:{argb:'FFD99A27'}}});
  wp.columns=[{width:6},{width:96}];wp.mergeCells('A1:B1');
  const p1=wp.getCell('A1');p1.value='PETUNJUK PENGISIAN';p1.font={name:F,size:15,bold:true,color:{argb:'FFFFFFFF'}};p1.fill=fl('FFD99A27');p1.alignment=mid;wp.getRow(1).height=32;
  const info=[
   'Isi sheet "Libur Nasional" mulai baris '+R0+', satu baris untuk satu tanggal.',
   'Tanggal dapat diketik 25/12/2026 atau 2026-12-25. Excel akan mengubahnya menjadi tanggal otomatis.',
   'Kolom No dan Hari terisi otomatis. Jangan diisi atau dihapus rumusnya.',
   'Libur beberapa hari berturut-turut (misal cuti bersama): tulis satu baris per tanggal.',
   'Keterangan maksimal 200 karakter. Bila dikosongkan, sistem menulis "Libur nasional".',
   'Tanggal Sabtu atau Minggu otomatis diberi warna oranye sebagai penanda.',
   'Simpan sebagai .xlsx, lalu unggah lewat tombol "Impor (XLSX)" di Kalender nasional (menu Developer). Format CSV tidak dipakai lagi.',
   'Sebelum disimpan, sistem menampilkan simulasi jumlah baris yang ditambah, diubah, dan dihapus.',
   'Perhatian: daftar di file menggantikan seluruh libur nasional. Tanggal lama yang tidak ada di file dihapus, dan tanggal yang sudah lewat dilewati.'
  ];
  info.forEach((tx,i)=>{const r=i+2,a=wp.getCell(r,1),b=wp.getCell(r,2),warn=i===info.length-1,z=warn?'FFFFF3D6':(i%2?'FFF4F9F5':'FFFFFFFF');
   a.value=i+1;b.value=tx;[a,b].forEach(x=>{x.fill=fl(z);x.border=bd});
   a.font={name:F,size:10,bold:true,color:{argb:'FFFFFFFF'}};a.fill=fl(warn?'FFD99A27':'FF176B3A');a.alignment=mid;
   b.font={name:F,size:10,bold:warn,color:{argb:warn?'FF7A4B00':'FF1F2D26'}};b.alignment={vertical:'middle',horizontal:'left',wrapText:true,indent:1};
   wp.getRow(r).height=tx.length>95?34:24});
  await tulisXlsx(wb,'template-libur-nasional.xlsx');toast('Template libur nasional (XLSX) sedang diproses, mohon ditunggu')
 }catch(e){toast('Gagal membuat template: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
const LIBUR_HARI=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
function bacaXlsxLibur(buf){
 const rows=[],err=[];
 const wb=XLSX.read(buf,{type:'array'}),nm=wb.SheetNames.find(n=>/libur/i.test(n))||wb.SheetNames[0],ws=wb.Sheets[nm];
 if(!ws)return {rows,err};
 const a=XLSX.utils.sheet_to_json(ws,{header:1,raw:true,defval:''});
 let h=-1,ct=0,ck=1;
 for(let i=0;i<Math.min(a.length,20)&&h<0;i++){const r=a[i]||[],j=r.findIndex(c=>/^\s*tanggal\s*$/i.test(String(c)));if(j>=0){h=i;ct=j;const k=r.findIndex(c=>/^\s*keterangan\s*$/i.test(String(c)));ck=k>=0?k:j+1}}
 const pad=n=>String(n).padStart(2,'0');
 const tg=v=>{if(v instanceof Date&&!isNaN(v))return v.getFullYear()+'-'+pad(v.getMonth()+1)+'-'+pad(v.getDate());if(typeof v==='number'&&isFinite(v)&&v>=20000&&v<=80000){const d=new Date(Date.UTC(1899,11,30)+Math.floor(v)*864e5);return d.getUTCFullYear()+'-'+pad(d.getUTCMonth()+1)+'-'+pad(d.getUTCDate())}return tglLibur(v)};
 const seen=new Map();
 for(let i=h+1;i<a.length;i++){const r=a[i]||[],tv=r[ct],kv=String(r[ck]==null?'':r[ck]).trim();
  if((tv===''||tv==null)&&!kv)continue;
  const t=tg(tv);if(!t){err.push('Baris '+(i+1)+': tanggal "'+String(tv==null?'':tv)+'" tidak valid');continue}
  if(seen.has(t))err.push('Baris '+(i+1)+': tanggal '+t+' ganda, dipakai baris ini (baris '+seen.get(t)+' diabaikan)');
  seen.set(t,i+1);
  const idx=rows.findIndex(x=>x.tanggal===t);const o={tanggal:t,keterangan:(kv||'Libur nasional').slice(0,200)};
  if(idx>=0)rows[idx]=o;else rows.push(o)}
 return {rows,err}}
function imporLiburDipilih(el){const f=el.files&&el.files[0];el.value='';if(!f)return;guard(async()=>{if(!/\.xlsx?$/i.test(f.name))throw new Error('Gunakan file Excel (.xlsx) dari tombol Template libur. Format CSV tidak didukung lagi.');await muatLib('xlsx');if(typeof XLSX==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');const {rows,err}=bacaXlsxLibur(await f.arrayBuffer());if(!rows.length)throw new Error(err[0]||'Tidak ada baris libur yang terbaca. Gunakan Template libur (XLSX).');if(err.length&&!await konfirmasi(err.length+' baris diabaikan:\n'+err.slice(0,5).join('\n')+'\n\nLanjutkan dengan '+rows.length+' baris lainnya?',{judul:'Sebagian baris tidak valid',ikon:'⚠️',ya:'Lanjutkan'}))return;const s=await dbq(db.rpc('impor_libur_nasional',{p_rows:rows,p_simulasi:true}));const ok=await konfirmasi('Simulasi impor libur nasional ('+s.baris+' tanggal, '+s.dari+' s.d. '+s.sampai+'):\n- tambah '+s.tambah+' tanggal\n- ubah keterangan '+s.ubah+'\n- hapus '+s.hapus+' (libur nasional lama yang tidak ada di file)'+(s.dilewati?'\n- dilewati '+s.dilewati+' (tanggal yang sudah lewat)':'')+'\n\nDaftar di file menggantikan seluruh libur nasional dan dipakai semua sekolah. Libur buatan sekolah tidak disentuh. Lanjutkan?',{judul:'Impor libur nasional',ikon:'📅',ya:'Ya, impor'});if(!ok)return;const h=await dbq(db.rpc('impor_libur_nasional',{p_rows:rows,p_simulasi:false}));toast('Selesai: tambah '+h.tambah+', ubah '+h.ubah+', hapus '+h.hapus);await muatKalNas();renderV()})}
const liburInfo=(d,k)=>{if(batalAda(d,k))return '';if(S.mingguan.includes(wd(d)))return 'libur mingguan hari '+HR[wd(d)];if(S.nasMap&&S.nasMap.has(d))return S.nasMap.get(d);const l=S.libur.find(x=>x.tgl<=d&&d<=(x.sampai||x.tgl)&&(!x.kelas||x.kelas===k));return l?(l.ket||'libur'):''};
const isLibur=(d,k)=>!!liburInfo(d,k);
const liburKey=(d,k)=>d+'|'+(k||'*');
const kelasTerpilih=(k)=>k&&k!=='*'?act().filter(s=>s.kelas===k):act();
const infoLiburTerpilih=(d,k)=>{const ss=kelasTerpilih(k),ks=[...new Set(ss.filter(s=>isLibur(d,s.kelas)).map(s=>s.kelas))];if(!ks.length)return '';return ks.length===1?'kelas '+ks[0]:'kelas '+ks.join(', ')};
const dayStat=(s,d)=>{const r=A(d)[s.id];return r?r.st:isLibur(d,s.kelas)&&!okL[liburKey(d,s.kelas)]?'Libur':d<=TODAY?'Belum':''};
const adaStatusLibur=(d,k)=>kelasTerpilih(k).some(s=>{const r=A(d)[s.id];return r&&r.st==='Libur'});
async function kosongkanAbsensiKelas(d,k){const ids=kelasTerpilih(k).map(s=>s.id);if(ids.length)await dbq(db.from('absensi').delete().eq('tanggal',d).in('siswa_id',ids));if(S.absen[d])ids.forEach(id=>delete S.absen[d][id]);if(draft&&d===attDate)ids.forEach(id=>delete draft[id]);}
async function kosongkanAbsensiLibur(d,k){const siswa=kelasTerpilih(k),ids=siswa.filter(s=>{const r=A(d)[s.id];return r&&r.st==='Libur'}).map(s=>s.id);if(ids.length)await dbq(db.from('absensi').delete().eq('tanggal',d).in('siswa_id',ids));if(S.absen[d])ids.forEach(id=>delete S.absen[d][id]);if(draft&&d===attDate)ids.forEach(id=>delete draft[id]);}
async function okLib(k,d){const i=liburInfo(d,k),ada=adaStatusLibur(d,k),key=liburKey(d,k);if((!i&&!ada)||okL[key])return true;if(liburPrompted[key])return false;liburPrompted[key]=1;const sumber=i?'terjadwal libur':'memiliki absensi berstatus Libur';const masuk=await konfirmasi(fmt(d)+': '+sumber+' untuk '+(k?'kelas '+k:'kelas yang dipilih')+'.\n\nHari ini tetap masuk seperti hari biasa?\n\nJika Ya, absensi berstatus Libur akan dikosongkan terlebih dahulu.',{judul:'Hari ini libur',ikon:'🏖',ya:'Ya, masuk'});if(!masuk)return false;if(i)await kosongkanAbsensiKelas(d,k);else await kosongkanAbsensiLibur(d,k);okL[key]=1;await catatBatal(d,k);return true;}
async function cekLiburSebelumAbsensi(k,d){const ss=kelasTerpilih(k),keys=[...new Set(ss.filter(s=>isLibur(d,s.kelas)||((A(d)[s.id]||{}).st==='Libur')).map(s=>s.kelas))].filter(kelas=>!okL[liburKey(d,kelas)]);if(!keys.length)return true;const nama=keys.length===1?'kelas '+keys[0]:'kelas '+keys.join(', ');const masuk=await konfirmasi(fmt(d)+': hari ini '+(keys.length===1?'terjadwal libur atau memiliki absensi berstatus Libur untuk '+nama:'terdapat kelas yang terjadwal libur atau memiliki absensi berstatus Libur ('+nama)+'.\n\nTetap masuk seperti hari biasa?\n\nJika Ya, absensi berstatus Libur akan dikosongkan terlebih dahulu.',{judul:'Hari ini libur',ikon:'🏖',ya:'Ya, masuk'});if(!masuk){keys.forEach(kelas=>liburPrompted[liburKey(d,kelas)]=1);return false;}for(const kelas of keys){if(isLibur(d,kelas))await kosongkanAbsensiKelas(d,kelas);else await kosongkanAbsensiLibur(d,kelas);okL[liburKey(d,kelas)]=1;}if(!k||k==='*')await catatBatal(d,'');else for(const kelas of keys)await catatBatal(d,kelas);return true;}
function hariBulan(b,rekap=false){const p=b.split('-').map(Number),n=new Date(p[0],p[1],0).getDate(),r=[];let batas=n;if(rekap){const prefix=b+'-',tercatat=Object.keys(S.absen).filter(d=>d.startsWith(prefix)&&Object.keys(S.absen[d]||{}).length).sort();const last=tercatat[tercatat.length-1]||'';const maxHari=last?Number(last.slice(8)):0;const ym=TODAY.slice(0,7);if(b===ym)batas=Math.max(Number(TODAY.slice(8)),maxHari);else if(b>ym)batas=maxHari;else batas=n}for(let i=1;i<=batas;i++){const d=b+'-'+String(i).padStart(2,'0');if(!rekap&&d>TODAY)break;r.push(d)}return r}
const statusRekap=(s,d)=>dayStat(s,d)||'Belum';
function ringkas(s,b,rekap=false){const c={Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0},ds=hariBulan(b,rekap);ds.forEach(d=>{const st=rekap?statusRekap(s,d):dayStat(s,d);c[st]=(c[st]||0)+1});const n=ds.length;return{c,n,ds,pct:n?Math.round((c.Hadir+c.Terlambat+c.Libur)*100/n):0}}
const segarkan=()=>dbq(db.rpc('segarkan_libur',{p_sekolah:SEK}));
