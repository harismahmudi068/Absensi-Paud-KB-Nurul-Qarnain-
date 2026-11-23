/* antrian scan saat internet putus: disimpan di HP lalu dikirim ulang otomatis */
const AQ_K='antrian_scan';let _aBusy=false;
/* status jaringan: begitu ketahuan putus, scan langsung ke antrian tanpa menunggu server (secepat saat online) */
let _netDown=false,_probeB=false;
const netMati=()=>navigator.onLine===false||_netDown;
function netTandai(mati){const sblm=_netDown;_netDown=!!mati;if(sblm&&!_netDown){try{aqKirim()}catch(e){}}}
const dbqT=(p,ms=3000)=>Promise.race([dbq(p),new Promise((_,j)=>setTimeout(()=>j(new Error('timeout')),ms))]);
async function netProbe(){if(!_netDown||_probeB||document.hidden||navigator.onLine===false||!me)return;_probeB=true;
 try{await dbqT(db.from('absensi').select('siswa_id').limit(1),2500);netTandai(false)}catch(e){}finally{_probeB=false}}
setInterval(netProbe,5000);
const sementaraErr=e=>{const m=String((e&&(e.message||e.details))||e||''),c=String((e&&(e.code||e.status))||'');return /jwt|expired|not authenticated|unauthorized|auth session|bad gateway|service unavailable|gateway|temporar|overload|too many|rate limit|upstream|unexpected token|<html|is not valid json/i.test(m)||/^(5\d\d|401|408|429|PGRST301)$/.test(c)};
const jaringanErr=e=>{const m=String((e&&(e.message||e.details))||e||'');return navigator.onLine===false||/failed to fetch|networkerror|network request failed|load failed|fetch failed|timeout|timed out|offline|ERR_INTERNET|ERR_NETWORK/i.test(m)};
const aqBaca=()=>{try{const a=JSON.parse(localStorage.getItem(AQ_K)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
const aqTulis=a=>{try{a.length?localStorage.setItem(AQ_K,JSON.stringify(a)):localStorage.removeItem(AQ_K)}catch(e){}};
const aqJumlah=()=>aqBaca().filter(x=>x.sek===SEK).length;
const aqTeks=()=>{const a=aqBaca().filter(z=>z&&z.row&&z.sek===SEK),off=netMati(),now=Date.now(),n=a.filter(z=>off||now-Date.parse(z.row.jam_datang)>4000).length;return n?'\u23F3 '+n+' scan belum terkirim ke server'+(off?', menunggu internet.':', sedang dikirim ulang.'):''};
const aqHtml=()=>{const t=aqTeks();return `<div id="aqInfo" class="mu" style="display:${t?'block':'none'};text-align:center;margin-top:6px;color:#92400e;font-weight:700">${t}</div>`};
function aqInfo(){const e=$('#aqInfo');if(!e)return;const t=aqTeks();e.style.display=t?'block':'none';e.textContent=t}
setInterval(aqInfo,2000);
function aqTambah(row,sw,ex){const a=aqBaca();if(a.some(x=>x.sek===SEK&&x.row.siswa_id===row.siswa_id&&x.row.tanggal===row.tanggal)){aqInfo();return}a.push(Object.assign({sek:SEK,row,pan:sw.pan||sw.nama,nama:sw.nama||'',n:0},ex||{}));aqTulis(a);aqInfo()}
const AQ_N=50;
let _aUlang=false,_mut=0,_akhirTunggu=false,scanKoreksi=[];
const aqKirimSegera=()=>{if(_aBusy){_aUlang=true;return}aqKirim()};
/* hasil dari server untuk satu scan yang tadi sudah diucapkan "hadir/terlambat" di HP */
function aqHasil(b,r){try{
 if(!r)return;
 const tgl=b.row.tanggal,sid=b.row.siswa_id,st=b.st||cap(b.row.status),jm=b.jm||jamJkt(b.row.jam_datang),pan=b.pan||'',nama=b.nama||'',lo=(S.absen[tgl]||{})[sid];
 if(r.hasil==='dicatat'){
  if(r.status_lama&&cap(r.status_lama)!==(b.lama||''))scanKoreksi.push({j:'ubah',pan,nama,dari:cap(r.status_lama),ke:st,jam:jm})}
 else if(r.hasil==='sudah_tercatat'){
  if(r.jam_datang&&Date.parse(r.jam_datang)===Date.parse(b.row.jam_datang))return;/* ini catatan kita sendiri (kirim ulang) */
  const sj=r.jam_datang?jamJkt(r.jam_datang):'-';
  scanKoreksi.push({j:'sudah',pan,nama,lokal:st+' '+jm,server:cap(r.status)+' '+sj});
  if(lo)S.absen[tgl][sid]=Object.assign({},lo,{st:cap(r.status),jam:r.jam_datang?sj:lo.jam,iso:r.jam_datang||lo.iso})}
 else{
  scanKoreksi.push({j:'gagal',pan,nama,alasan:r.hasil==='nonaktif'?'Anak berstatus nonaktif, absensi tidak tersimpan.':'Anak tidak ditemukan di sekolah ini, absensi tidak tersimpan.'});
  if(lo&&lo.iso===b.row.jam_datang)delete S.absen[tgl][sid]}
}catch(e){}}
function aqGagal(b){try{const tgl=b.row.tanggal,sid=b.row.siswa_id,lo=(S.absen[tgl]||{})[sid];
 scanKoreksi.push({j:'gagal',pan:b.pan||'',nama:b.nama||'',alasan:'Gagal dikirim ke server berulang kali, absensi tidak tersimpan. Catat ulang secara manual.'});
 if(lo&&lo.iso===b.row.jam_datang)delete S.absen[tgl][sid]}catch(e){}}
async function aqKirim(){
 if(_aBusy||!me||!SEK||netMati())return;const q=aqBaca().filter(b=>b&&b.row);if(!q.length){aqTulis([]);return}
 _aBusy=true;const kunci=b=>b.sek+'|'+b.row.siswa_id+'|'+b.row.tanggal,selesai=new Set();let ok=0,buang=0;
 try{
  const grup={};q.filter(b=>b.sek===SEK).forEach(b=>{(grup[b.row.tanggal]=grup[b.row.tanggal]||[]).push(b)});
  luar:for(const tgl of Object.keys(grup)){const arr=grup[tgl];
   for(let i=0;i<arr.length;i+=AQ_N){const part=arr.slice(i,i+AQ_N);
    try{
     /* 1 permintaan: server mengecek sekaligus menyimpan (yang sudah hadir/terlambat tidak ditimpa).
        Bila ditolak karena data bermasalah, ulangi satu per satu untuk mencari yang bermasalah */
     const kirim=arr=>dbqT(db.rpc('scan_absen',{p_baris:arr.map(b=>({siswa_id:b.row.siswa_id,tanggal:b.row.tanggal,status:b.row.status,jam_datang:b.row.jam_datang}))}),10000),masalah=new Set();
     const olah=(arr,res)=>{const m={};(Array.isArray(res)?res:[]).forEach(r=>{if(r)m[String(r.siswa_id)]=r});arr.forEach(b=>aqHasil(b,m[String(b.row.siswa_id)]))};
     try{olah(part,await kirim(part))}
     catch(e){if(jaringanErr(e)||sementaraErr(e))throw e;
      for(const b of part){try{olah([b],await kirim([b]))}catch(e2){if(jaringanErr(e2)||sementaraErr(e2))throw e2;masalah.add(kunci(b));b.n=(b.n||0)+1}}}
     part.forEach(b=>{if(!masalah.has(kunci(b))){selesai.add(kunci(b));ok++}})
    }catch(e){
     if(jaringanErr(e)){_netDown=true;break luar}
     /* galat server/sesi sementara: scan tetap disimpan di HP dan dicoba lagi nanti, tidak dihitung gagal */
     if(sementaraErr(e)){try{db.auth.getSession().catch(()=>{})}catch(x){}break luar}
     part.forEach(b=>{b.n=(b.n||0)+1})}
   }
  }
 }finally{
  const sisa=q.filter(b=>{if(selesai.has(kunci(b)))return false;if((b.n||0)>=10){buang++;aqGagal(b);return false}return true});
  const lain=aqBaca().filter(x=>x&&x.row&&!q.some(y=>y.sek===x.sek&&y.row.siswa_id===x.row.siswa_id&&y.row.tanggal===x.row.tanggal));
  aqTulis(sisa.concat(lain));_aBusy=false;_mut++;aqInfo();if(_aUlang){_aUlang=false;setTimeout(aqKirim,50)}}
 if(ok&&!scanner&&!usbOn&&!_akhirTunggu)toast(ok+' scan yang tersimpan di HP berhasil dikirim');
 if(buang)toast(buang+' scan gagal dikirim berulang kali dan tidak tersimpan. Lihat rinciannya di ringkasan scan.',false);
 if(scanKoreksi.length&&!scanner&&!usbOn&&!_akhirTunggu){const k=scanKoreksi;scanKoreksi=[];ringkasAkhir([],k,0)}}
window.addEventListener('online',()=>{netTandai(false);aqKirim()});window.addEventListener('offline',()=>{_netDown=true});
setInterval(aqKirim,15000);
