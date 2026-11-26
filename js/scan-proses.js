/* ringkasan di akhir sesi scan: perubahan status + koreksi dari server, dalam satu jendela */
function ringkasAkhir(u,k,sisa){
 const ub=u.concat(k.filter(z=>z.j==='ubah')),sd=k.filter(z=>z.j==='sudah'),gl=k.filter(z=>z.j==='gagal');
 if(!ub.length&&!sd.length&&!gl.length&&!sisa)return;let h='';
 if(ub.length)h+='<div class="note">'+ub.length+' anak sebelumnya sudah punya status, dan statusnya kini diganti otomatis berdasarkan hasil scan.</div>'+tab(['Anak','Status semula','Sekarang','Jam'],ub.map(z=>`<tr><td><b>${esc(z.pan)}</b><div class="mu">${esc(z.nama)}</div></td><td>${badge(z.dari)}</td><td>${badge(z.ke)}</td><td>${esc(z.jam)}</td></tr>`).join(''));
 if(sd.length)h+='<div class="note" style="margin-top:12px">'+sd.length+' anak ternyata sudah tercatat dari perangkat lain (atau diubah guru) sebelum scan ini. Data di server dipertahankan, jadi absensi anak tetap benar.</div>'+tab(['Anak','Terdengar saat scan','Tercatat di server'],sd.map(z=>`<tr><td><b>${esc(z.pan)}</b><div class="mu">${esc(z.nama)}</div></td><td>${esc(z.lokal)}</td><td>${esc(z.server)}</td></tr>`).join(''));
 if(gl.length)h+='<div class="note" style="margin-top:12px;border-color:#d83d4d">'+gl.length+' scan tidak tersimpan di server.</div>'+tab(['Anak','Keterangan'],gl.map(z=>`<tr><td><b>${esc(z.pan)}</b><div class="mu">${esc(z.nama)}</div></td><td>${esc(z.alasan)}</td></tr>`).join(''));
 if(sisa)h+='<div class="note" style="margin-top:12px">'+sisa+' scan masih tersimpan di HP dan akan dikirim otomatis saat koneksi memungkinkan.</div>';
 info('Ringkasan sesi scan',h)}
/* dipanggil saat sesi scan berakhir: pastikan semua terkirim (maks 4 detik), lalu tampilkan ringkasan */
async function scanAkhir(u){_akhirTunggu=true;try{
 const t0=Date.now();
 while(aqJumlah()>0&&!netMati()&&Date.now()-t0<4000){aqKirimSegera();await new Promise(r=>setTimeout(r,300))}
 const k=scanKoreksi;scanKoreksi=[];ringkasAkhir(u,k,aqJumlah())}
 catch(e){}finally{_akhirTunggu=false}}
/* penyegaran cache absensi hari ini, HANYA selama berada di scanner (awal sesi, tiap 2 menit, saat layar aktif lagi) */
let _segB=false;
async function scanSegarkan(){
 if(_segB||!me||!SEK||!(scanner||usbOn)||document.hidden||netMati()||_aBusy||busy)return;
 _segB=true;const m0=_mut,tg=TODAY;
 try{let rows=[],from=0;for(;;){const d=await dbq(db.from('absensi').select('siswa_id,status,cara,catatan,jam_datang').eq('tanggal',tg).order('id').range(from,from+999));rows=rows.concat(d);if(d.length<1000)break;from+=1000}
  if(m0!==_mut||_aBusy||busy||tg!==TODAY||!(scanner||usbOn))return;/* ada scan/pengiriman selama mengambil data: hasil ini basi, buang */
  const baru={};rows.forEach(r=>{baru[r.siswa_id]=fromRow(r)});
  aqBaca().filter(b=>b&&b.row&&b.sek===SEK&&b.row.tanggal===tg).forEach(b=>{const e=baru[b.row.siswa_id];if(!e||(e.st!=='Hadir'&&e.st!=='Terlambat'))baru[b.row.siswa_id]={st:cap(b.row.status),cara:'scan',cat:'',jam:jamJkt(b.row.jam_datang),iso:b.row.jam_datang}});
  S.absen[tg]=baru;scRefresh()}
 catch(e){}finally{_segB=false}}
setInterval(scanSegarkan,120000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)scanSegarkan()});
function ringkasUbah(u){info('Perubahan status pada sesi scan','<div class="note">'+u.length+' anak sebelumnya sudah punya status, dan statusnya kini diganti otomatis berdasarkan hasil scan.</div>'+tab(['Anak','Status semula','Sekarang','Jam'],u.map(x=>`<tr><td><b>${esc(x.pan)}</b><div class="mu">${esc(x.nama)}</div></td><td>${badge(x.dari)}</td><td>${badge(x.ke)}</td><td>${esc(x.jam)}</td></tr>`).join('')))}
async function stopScan(m){if(!scanner)return;const s=scanner;scanner=null;const w0=$('#rw');if(m==='restart'&&w0)w0.style.minHeight=w0.offsetHeight+'px';try{await s.stop();s.clear()}catch(e){}if(m==='restart')return;resetRw();
 const u=scanUbah;scanUbah=[];if(m!=='keluar')scanAkhir(u)}
let tanyaKam=false;
async function toggleScan(){unlockAC();if(!scanner)suaraPanas();if(!scanner)return mulaiScan();if(tanyaKam)return;tanyaKam=true;const n=$('#cfn');if(n)n.textContent='Belum';
 let ya=false;try{ya=await konfirmasi('Apakah proses scan sudah selesai?',{judul:'Selesai scan?',ikon:'✅',ya:'Ya, selesai'})}finally{if(n)n.textContent='Batal';tanyaKam=false}
 if(ya&&scanner)await stopScan()}
function balikKamera(){cam=cam==='belakang'?'depan':'belakang';const l=$('#camlbl');if(l)l.textContent=cam;if(scanner){ovMuat();mulaiScan()}}
async function onScan(mentah){if(scanPrep&&scanPrep.aktif)return;const cr=cariKode(mentah),kode=cr.s?String(cr.s.kode_scan||'').toUpperCase():cr.k||String(mentah||'').slice(0,40);const now=Date.now();if(busy||(kode===lastKode&&now-lastAt<(usbOn?1500:4000))){if(usbOn&&!busy)usbInfo('Kartu yang sama baru saja dipindai.');return}busy=true;lastKode=kode;lastAt=now;
 try{{const h=hariIni();if(h!==TODAY){TODAY=h;liburPrompted={};okL={};try{await muatRange(TODAY,TODAY)}catch(e){peringatan('Absensi hari baru gagal dimuat',e)}}}
  const s=cr.s&&cr.s.aktif?cr.s:null;if(cr.uji)return hasil('Kartu uji terbaca, tidak dicatat sebagai absensi.',true);
  if(cr.lama)return hasil('Kartu lama sudah tidak berlaku. Gunakan kartu baru.',false);
  if(!s)return hasil(cr.s?(cr.s.pan||cr.s.nama)+' berstatus nonaktif.':(cr.k?'QR tidak dikenal: kode '+cr.k+' tidak ada di data siswa.':'QR tidak dikenal.'),false);
  if(scanKelas&&scanKelas!=='*'&&s.kelas!==scanKelas)return hasil(`${s.pan} bukan siswa kelas ${scanKelas} (kelas ${s.kelas||'-'}).`,false);
  if(!await okLib(s.kelas,TODAY))return hasil('Kelas '+(s.kelas||'-')+' libur hari ini, absensi tidak dicatat.',false);
  const iso=new Date().toISOString(),jm=jamJkt(iso),lim=(S.kelas.find(k=>k.nama===s.kelas)||{jam:'23:59'}).jam,st=jm>lim?'Terlambat':'Hadir';
  const baris={siswa_id:s.id,tanggal:TODAY,status:low(st),cara:'scan',catatan:null,jam_datang:iso,diubah:iso,diubah_oleh:me};
  /* cek ke cache absensi hari ini di HP (tanpa menunggu server) */
  const lo=A(TODAY)[s.id],ada=lo?{st:lo.st,jam:lo.jam}:null;
  if(ada&&(ada.st==='Hadir'||ada.st==='Terlambat')){scLast={s,duplikat:true};return hasil(`${s.pan} sudah tercatat ${ada.st.toLowerCase()} jam ${ada.jam}.`,false,`${s.nama||s.pan} telah tercatat`)}
  const antri=netMati();_mut++;
  /* simpan di HP dulu (permanen), lalu dikirim ke server di belakang layar; suara tidak menunggu server */
  aqTambah(baris,s,{st,jm,lama:ada?ada.st:''});
  (S.absen[TODAY]=S.absen[TODAY]||{})[s.id]={st,cara:'scan',cat:'',jam:jm,iso};if(ada)scanUbah.push({pan:s.pan,nama:s.nama,dari:ada.st,ke:st,jam:jm});scLast={s,st,jm};hasil(`${s.pan} ${st.toLowerCase()}, jam ${jm}.`+(ada?` (sebelumnya ${ada.st.toLowerCase()})`:'')+(antri?' Disimpan di HP, dikirim saat internet kembali.':''),true);const h=$('#hist');if(h)h.innerHTML=histHTML();scRefresh();
  aqKirimSegera()}
 catch(e){hasil('Gagal: '+(e.message||e),false)}finally{busy=false}}
