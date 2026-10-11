/* kartu.js - generator kartu siswa + isi QR, dipakai bersama oleh Index dan portal orang tua.
   Ubah DOMAIN_PORTAL hanya jika alamat aplikasi berpindah. Kartu yang sudah dicetak
   tetap membawa domain lama, jadi domain lama harus tetap aktif. */
(function(g){
'use strict';
const DOMAIN_PORTAL='https://absensi-1486.vercel.app';
const tglDMY=iso=>iso?String(iso).slice(8,10)+'/'+String(iso).slice(5,7)+'/'+String(iso).slice(0,4):'';
const jkNama=x=>x==='L'?'Laki-laki':x==='P'?'Perempuan':'';
/* isi QR: URL portal. Pemindai absensi mengembalikannya menjadi kode lewat kodeDariQR */
function urlQR(kode){return DOMAIN_PORTAL+'/p/'+kode}
function kodeDariQR(t){t=String(t==null?'':t).trim();
 if(/^https?:\/\//i.test(t)){try{const m=new URL(t).pathname.match(/^\/p\/([0-9a-f-]{36})\/?$/i);return m?m[1]:''}catch(e){return ''}}
 return t}
function qrObj(kode){const o=qrcode(0,'M');o.addData(kode);o.make();return o}
function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath()}
function buatKartu(s,opt){
 const K=3,cv=document.createElement('canvas');cv.width=660*K;cv.height=420*K;const c=cv.getContext('2d');c.scale(K,K);const F='system-ui,-apple-system,Segoe UI,Roboto,sans-serif';let g;
 rr(c,0,0,660,420,34);c.save();c.clip();c.fillStyle='#eef8f6';c.fillRect(0,0,660,420);c.fillStyle='#d4e6ea';for(let y=104;y<380;y+=26)for(let x=14;x<660;x+=26){c.beginPath();c.arc(x,y,1.3,0,7);c.fill()}
 g=c.createLinearGradient(0,0,660,0);g.addColorStop(0,'#0e9a68');g.addColorStop(.55,'#0e8f8a');g.addColorStop(1,'#0f64b8');c.fillStyle=g;c.fillRect(0,0,660,92);c.fillStyle='#e9c921';c.fillRect(0,92,660,5);
 const yr=String(s.masuk||'')||String(opt.tahun||opt.hari).slice(0,4);
 c.textAlign='center';c.textBaseline='middle';c.fillStyle='#f5e23d';c.font='bold 17px '+F;c.fillText('KARTU PELAJAR',330,22);
 c.fillStyle='#fff';const _nm=String(opt.nama||'').toUpperCase();let nz=32;c.font='bold '+nz+'px '+F;while(c.measureText(_nm).width>580&&nz>12){nz--;c.font='bold '+nz+'px '+F}c.fillText(_nm,330,52);
 c.font='14px '+F;c.fillText('Tahun Terdaftar : '+yr,330,79);
 c.textAlign='left';c.fillStyle='#0b4f7c';c.font='bold 12px '+F;c.fillText('NAMA LENGKAP',38,116);c.fillText('INFORMASI SISWA',38,180);
 g=c.createLinearGradient(38,0,426,0);g.addColorStop(0,'#e9f4b4');g.addColorStop(1,'#f8f8c4');rr(c,38,127,388,40,9);c.fillStyle=g;c.fill();
 c.save();rr(c,38,127,388,40,9);c.clip();c.fillStyle='#1b7a3c';c.fillRect(38,127,6,40);c.restore();rr(c,38,127,388,40,9);c.lineWidth=1.5;c.strokeStyle='#5aa05a';c.stroke();
 const nm=s.nama.toUpperCase();let fs=24;c.font='bold '+fs+'px '+F;while(c.measureText(nm).width>365&&fs>11){fs--;c.font='bold '+fs+'px '+F}c.fillStyle='#0b4a2a';c.fillText(nm,54,148);
 const wa=s.wa?'0'+String(s.wa).replace(/^62/,''):'-';
 const rows=[['Kelas',s.kelas||'-','#3b82c4','🎓','#5aa9d6','#ffffff'],['NISN',s.nisn||'-','#3b6fb0','🪪','#e0b84a','#fffdf2'],['Tanggal Lahir',tglDMY(s.tgl)||'-','#2fa088','📅','#6bc3b0','#f0fbf8'],['Jenis Kelamin',jkNama(s.jk)||'-','#3aa0e0','♂','#6bb8e0','#f0f8fd'],['Alamat',s.alamat||'-','#2e9c4f','📍','#6cc08a','#f0fbf3'],['WA Ortu',wa,'#1f8a4c','💬','#2a7d55','#eefaf2']];
 rows.forEach((p,i)=>{const y=190+i*31;rr(c,38,y,388,26,13);c.fillStyle=p[5];c.fill();c.lineWidth=1.5;c.strokeStyle=p[4];c.stroke();
  c.beginPath();c.arc(56,y+13,9.5,0,7);c.fillStyle=p[2];c.fill();c.textAlign='center';c.fillStyle='#fff';c.font='11px '+F;c.fillText(p[3],56,y+14);
  c.textAlign='left';c.fillStyle='#111';c.font='600 13px '+F;c.fillText(p[0],76,y+14);c.fillText(':',170,y+14);
  let vz=13;c.font='bold '+vz+'px '+F;while(c.measureText(p[1]).width>232&&vz>8){vz--;c.font='bold '+vz+'px '+F}c.fillText(p[1],182,y+14)});
 rr(c,440,142,190,190,16);c.fillStyle='#fff';c.fill();c.setLineDash([5,4]);c.lineWidth=2.5;c.strokeStyle='#3aa0c8';c.stroke();c.setLineDash([]);
 const o=qrObj(opt.qr),n=o.getModuleCount(),cl=Math.floor(176*K/n)/K,sz=cl*n,qx=535-sz/2,qy=237-sz/2;c.fillStyle='#000';for(let r=0;r<n;r++)for(let q=0;q<n;q++)if(o.isDark(r,q))c.fillRect(qx+q*cl,qy+r*cl,cl,cl);
 rr(c,440,342,190,28,14);c.fillStyle='#2e8b57';c.fill();c.beginPath();c.arc(458,356,9,0,7);c.fillStyle='#fff';c.fill();c.textAlign='center';c.fillStyle='#2e8b57';c.font='bold 12px '+F;c.fillText('✓',458,356);
 c.textAlign='left';c.fillStyle='#fff';c.font='italic bold 12.5px '+F;c.fillText('Aktif Selama Jadi Siswa',473,357);
 g=c.createLinearGradient(0,0,660,0);g.addColorStop(0,'#0a6a4a');g.addColorStop(1,'#c9d02a');c.fillStyle=g;c.fillRect(0,388,660,32);c.textAlign='center';c.fillStyle='#fff';c.font='italic bold 13px '+F;c.fillText('"Awal yang TEPAT Adalah satu langkah yang HEBAT!"',330,404);
 c.restore();rr(c,3,3,654,414,32);c.lineWidth=6;c.strokeStyle='#12a072';c.stroke();const u=cv.toDataURL('image/png');return u}
g.Kartu={DOMAIN_PORTAL,urlQR,kodeDariQR,qrObj,buatKartu,tglDMY,jkNama};
})(window);
