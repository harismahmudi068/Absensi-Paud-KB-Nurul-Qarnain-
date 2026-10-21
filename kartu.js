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
/* ---- logo: dimuat sekali lewat siapkanLogo(), lalu dipakai buatKartu secara sinkron ---- */
const LG=new Map();
function siapkanLogo(src){
 if(!src)return Promise.resolve(null);
 if(LG.has(src))return Promise.resolve(LG.get(src));
 return new Promise(res=>{const im=new Image();im.onload=()=>{LG.set(src,im);res(im)};im.onerror=()=>res(null);im.src=src})}
/* ---- pembantu gambar ---- */
function lsText(c,t,x,y,sp){for(const ch of t){c.fillText(ch,x,y);x+=c.measureText(ch).width+sp}}
function lsW(c,t,sp){let w=0;for(const ch of t)w+=c.measureText(ch).width+sp;return w-sp}
function fitFont(c,t,max,start,min,fmt){let z=start;c.font=fmt(z);while(c.measureText(t).width>max&&z>min){z-=.5;c.font=fmt(z)}return z}
function elips(c,t,max){if(c.measureText(t).width<=max)return t;while(t.length>1&&c.measureText(t+'\u2026').width>max)t=t.slice(0,-1);return t+'\u2026'}
/* teks ditebalkan: huruf berat + goresan tipis warna yang sama */
function tebal(c,s,x,y,w){c.fillText(s,x,y);c.save();c.lineWidth=w;c.lineJoin='round';c.strokeStyle=c.fillStyle;c.strokeText(s,x,y);c.restore()}
/* ---- ikon putih (vektor, tidak bergantung emoji/font perangkat) ---- */
const HJ='#0e5a3d',EM='#e0bd4a';
const garis=(c,w)=>{c.strokeStyle='#fff';c.fillStyle='#fff';c.lineWidth=w||1.5;c.lineCap='round';c.lineJoin='round'};
const TELEPON='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z';
const IK={
 orang(c,x,y){c.fillStyle='#fff';c.beginPath();c.arc(x,y-3.6,3.8,0,7);c.fill();c.beginPath();c.moveTo(x-7,y+7);c.quadraticCurveTo(x-7,y+0.8,x,y+0.8);c.quadraticCurveTo(x+7,y+0.8,x+7,y+7);c.closePath();c.fill()},
 topi(c,x,y){garis(c,1.4);c.beginPath();c.moveTo(x-8,y-1.5);c.lineTo(x,y-5.5);c.lineTo(x+8,y-1.5);c.lineTo(x,y+2.5);c.closePath();c.stroke();
  c.beginPath();c.moveTo(x-4.6,y+0.8);c.lineTo(x-4.6,y+4);c.quadraticCurveTo(x,y+6.8,x+4.6,y+4);c.lineTo(x+4.6,y+0.8);c.stroke();
  c.beginPath();c.moveTo(x+7.6,y-0.6);c.lineTo(x+7.6,y+3.8);c.stroke()},
 kartu(c,x,y){garis(c,1.3);rr(c,x-8,y-5.5,16,11,2);c.stroke();c.beginPath();c.arc(x-3.8,y-1.4,1.7,0,7);c.stroke();
  c.beginPath();c.moveTo(x-6.6,y+3.8);c.quadraticCurveTo(x-3.8,y+0.6,x-1,y+3.8);c.stroke();
  c.beginPath();c.moveTo(x+0.8,y-2.4);c.lineTo(x+5.8,y-2.4);c.moveTo(x+0.8,y+0.1);c.lineTo(x+5.8,y+0.1);c.moveTo(x+0.8,y+2.6);c.lineTo(x+5.8,y+2.6);c.stroke()},
 kalender(c,x,y){garis(c,1.3);rr(c,x-6.8,y-4.6,13.6,12,2);c.stroke();
  c.beginPath();c.moveTo(x-3.6,y-6.6);c.lineTo(x-3.6,y-3);c.moveTo(x+3.6,y-6.6);c.lineTo(x+3.6,y-3);c.moveTo(x-6.8,y-1);c.lineTo(x+6.8,y-1);c.stroke();
  c.textAlign='center';c.textBaseline='middle';c.font='bold 6.4px system-ui,sans-serif';c.fillText('17',x,y+3.4);c.textAlign='left'},
 pria(c,x,y){garis(c,1.9);c.beginPath();c.arc(x-1.8,y+1.8,4.3,0,7);c.stroke();
  c.beginPath();c.moveTo(x+1.4,y-1.4);c.lineTo(x+6,y-6);c.moveTo(x+1.6,y-6);c.lineTo(x+6,y-6);c.lineTo(x+6,y-1.6);c.stroke()},
 lokasi(c,x,y){garis(c,1.5);c.beginPath();c.arc(x,y-1.8,5.2,Math.PI*0.8,Math.PI*0.2,false);c.lineTo(x,y+7.2);c.closePath();c.stroke();c.beginPath();c.arc(x,y-1.8,1.9,0,7);c.stroke()},
 telepon(c,x,y){garis(c,1.5);c.save();c.translate(x-7.5,y-7.5);const s=15/24;c.scale(s,s);c.lineWidth=1.6/s;c.stroke(new Path2D(TELEPON));c.restore()}};
/* pola geometris bintang (latar kartu belakang) */
function pola(c,x0,y0,w,h,col,lw){c.save();c.beginPath();c.rect(x0,y0,w,h);c.clip();c.strokeStyle=col;c.lineWidth=lw;c.beginPath();
 const p=33,r=11.5,d=r*Math.SQRT2;
 for(let y=y0-p;y<y0+h+p;y+=p)for(let x=x0-p;x<x0+w+p;x+=p){const cx=x+p/2,cy=y+p/2;
  c.moveTo(cx-r,cy-r);c.lineTo(cx+r,cy-r);c.lineTo(cx+r,cy+r);c.lineTo(cx-r,cy+r);c.closePath();
  c.moveTo(cx-d,cy);c.lineTo(cx,cy-d);c.lineTo(cx+d,cy);c.lineTo(cx,cy+d);c.closePath()}
 c.stroke();c.restore()}
const kanvas=()=>{const K=3,cv=document.createElement('canvas');cv.width=660*K;cv.height=420*K;const c=cv.getContext('2d');c.scale(K,K);return{K,cv,c}};
const F='system-ui,-apple-system,Segoe UI,Roboto,sans-serif';
/* ---- KARTU DEPAN ---- Desain permanen. Kanvas 660x420 (rasio sama dengan desain acuan). */
function buatKartu(s,opt){
 const {cv,c}=kanvas();let gr;
 rr(c,0,0,660,420,22);c.save();c.clip();
 /* latar badan */
 gr=c.createLinearGradient(0,94,0,380);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#f0f9f5');c.fillStyle=gr;c.fillRect(0,0,660,420);
 /* header */
 gr=c.createLinearGradient(0,0,660,0);gr.addColorStop(0,'#0a5a3f');gr.addColorStop(.6,'#0e6a49');gr.addColorStop(1,'#0b5a40');c.fillStyle=gr;c.fillRect(0,0,660,94);
 c.fillStyle='rgba(255,255,255,.045)';c.beginPath();c.moveTo(150,94);c.bezierCurveTo(250,72,330,34,400,0);c.lineTo(520,0);c.bezierCurveTo(450,42,390,80,330,94);c.closePath();c.fill();
 c.beginPath();c.moveTo(518,94);c.bezierCurveTo(585,90,640,62,660,20);c.lineTo(660,94);c.closePath();
 gr=c.createLinearGradient(520,94,660,20);gr.addColorStop(0,'#b9ddcb');gr.addColorStop(1,'#eaf6f0');c.fillStyle=gr;c.fill();
 c.beginPath();c.moveTo(518,94);c.bezierCurveTo(585,90,640,62,660,20);c.lineWidth=2.4;c.strokeStyle='#f0cf5a';c.stroke();
 /* logo sekolah: kotak/tinggi tetap di area lama; logo panjang diberi ruang lebih lebar
    (garis emas dan judul bergeser ke kanan) agar tampil sebesar mungkin */
 const lg=opt.logo?LG.get(opt.logo):null;let gx=138;
 if(lg&&lg.width){const H0=82,asp=lg.width/lg.height,W0=Math.min(asp*H0,185),r=Math.min(W0/lg.width,H0/lg.height),w=lg.width*r,h=lg.height*r;
  gx=Math.max(138,Math.round(w+30));c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(lg,gx/2-w/2,47-h/2,w,h)}
 const tx=gx+19;
 /* judul */
 c.strokeStyle='#e9c55a';c.lineWidth=1.6;c.beginPath();c.moveTo(gx,22);c.lineTo(gx,81);c.stroke();
 c.textBaseline='middle';c.textAlign='left';
 c.fillStyle='#f2c94c';c.font='bold 15px '+F;lsText(c,'KARTU PELAJAR',tx,27,2.6);
 const yr=String(s.masuk||'')||String(opt.tahun||opt.hari).slice(0,4),_nm=String(opt.nama||'').toUpperCase();
 c.fillStyle='#fff';fitFont(c,_nm,512-tx,31,12,z=>'800 '+z+'px '+F);tebal(c,_nm,tx,53,.8);
 c.fillStyle='#e6f2ec';c.font='14px '+F;c.fillText('Tahun Terdaftar : '+yr,tx+1,78);
 /* nama lengkap */
 c.fillStyle=HJ;c.font='bold 11.5px '+F;lsText(c,'NAMA LENGKAP',29,112,.7);
 rr(c,25,123,401,34,17);gr=c.createLinearGradient(0,123,0,157);gr.addColorStop(0,'#f4faf7');gr.addColorStop(1,'#e2f1ea');c.fillStyle=gr;c.fill();c.lineWidth=1.3;c.strokeStyle='#2a8a68';c.stroke();
 c.beginPath();c.moveTo(42,123);c.lineTo(58,123);c.lineTo(69,140);c.lineTo(58,157);c.lineTo(42,157);c.arc(42,140,17,Math.PI/2,Math.PI*1.5);c.closePath();c.fillStyle=HJ;c.fill();IK.orang(c,43,140);
 const nm=String(s.nama||'').toUpperCase();c.fillStyle='#0b3d2b';fitFont(c,nm,335,17,9,z=>'800 '+z+'px '+F);tebal(c,elips(c,nm,335),80,140.5,.5);
 /* informasi siswa */
 c.fillStyle=HJ;c.font='bold 11.5px '+F;lsText(c,'INFORMASI SISWA',29,171,.7);const iw=29+lsW(c,'INFORMASI SISWA',.7)+9;
 c.lineWidth=2;c.strokeStyle='#e9c13a';c.beginPath();c.moveTo(iw,171);c.lineTo(iw+42,171);c.stroke();
 c.lineWidth=1.2;c.strokeStyle='#1b7a5a';c.beginPath();c.moveTo(iw+46,171);c.lineTo(417,171);c.stroke();
 const wa=s.wa?('0'+String(s.wa).replace(/\D/g,'').replace(/^62/,'').replace(/^0+/,'')).replace(/(\d{4})(?=\d)/g,'$1-'):'-';
 const rows=[['Kelas',s.kelas||'-',IK.topi],['NISN',s.nisn||'-',IK.kartu],['Tanggal Lahir',tglDMY(s.tgl)||'-',IK.kalender],['Jenis Kelamin',jkNama(s.jk)||'-',IK.pria],['Alamat',s.alamat||'-',IK.lokasi],['WA Ortu',wa,IK.telepon]];
 rows.forEach((p,i)=>{const y=183+i*30.6;
  rr(c,25,y,401,26,13);gr=c.createLinearGradient(0,y,0,y+26);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#e9f6f0');c.fillStyle=gr;c.fill();c.lineWidth=1.2;c.strokeStyle='#b4dccb';c.stroke();
  rr(c,25,y,40,26,13);c.fillStyle=HJ;c.fill();p[2](c,45,y+13);
  c.textAlign='left';c.textBaseline='middle';c.fillStyle='#0f4a33';fitFont(c,p[0],98,13.5,10,z=>'600 '+z+'px '+F);c.fillText(p[0],76,y+13.5);c.fillText(':',178,y+13.5);
  c.fillStyle='#10261c';fitFont(c,p[1],228,14,8,z=>'bold '+z+'px '+F);c.fillText(elips(c,p[1],228),190,y+13.5)});
 /* bingkai foto (rasio 3:4). Bila belum ada foto: siluet + keterangan */
 const fx=457,fy=125,fw=164,fh=215,ix=fx+8,iy=fy+8,iw2=fw-16,ih=fh-16,mx=fx+fw/2;
 rr(c,fx,fy,fw,fh,16);c.fillStyle='#fff';c.fill();c.lineWidth=4;c.strokeStyle='#18795a';c.stroke();
 const ft=opt.foto&&opt.foto.width?opt.foto:null;
 if(ft){c.save();rr(c,ix,iy,iw2,ih,10);c.clip();const r=Math.max(iw2/ft.width,ih/ft.height),w=ft.width*r,h=ft.height*r;c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(ft,ix+(iw2-w)/2,iy+(ih-h)/2,w,h);c.restore()}
 else{rr(c,ix,iy,iw2,ih,10);gr=c.createLinearGradient(0,iy,0,iy+ih);gr.addColorStop(0,'#eaf5f0');gr.addColorStop(1,'#dff0e8');c.fillStyle=gr;c.fill();
  c.save();c.setLineDash([4,3]);c.lineWidth=1.2;c.strokeStyle='#8fc4ad';rr(c,ix+1.5,iy+1.5,iw2-3,ih-3,9);c.stroke();c.restore();
  c.fillStyle='#a8d3c0';c.beginPath();c.arc(mx,208,10.5,0,7);c.fill();
  c.beginPath();c.moveTo(mx-20,241);c.bezierCurveTo(mx-20,225,mx-11,219,mx,219);c.bezierCurveTo(mx+11,219,mx+20,225,mx+20,241);c.closePath();c.fill();
  c.textAlign='left';c.textBaseline='middle';c.fillStyle='#2f8a67';c.font='bold 10px '+F;lsText(c,'FOTO',mx-lsW(c,'FOTO',2.4)/2,258,2.4);
  c.fillStyle='#4a9a7a';c.font='8.5px '+F;c.textAlign='center';c.fillText('3 \u00D7 4',mx,272)}
 c.textAlign='center';c.textBaseline='middle';c.fillStyle='#1d5e12';fitFont(c,'Aktif selama jadi siswa',152,14,9,z=>'italic 800 '+z+'px '+F);c.fillText('Aktif selama jadi siswa',mx,354);
 /* footer */
 gr=c.createLinearGradient(0,0,660,0);gr.addColorStop(0,'#0a5a3f');gr.addColorStop(1,'#0e6a49');c.fillStyle=gr;c.fillRect(0,378,660,42);
 c.beginPath();c.moveTo(520,420);c.bezierCurveTo(590,416,640,398,660,374);c.lineTo(660,420);c.closePath();c.fillStyle='rgba(125,196,165,.55)';c.fill();
 c.beginPath();c.moveTo(520,420);c.bezierCurveTo(590,416,640,398,660,374);c.lineWidth=2.4;c.strokeStyle='#f0cf5a';c.stroke();
 const kt='\u201CAwal yang TEPAT Adalah satu langkah yang HEBAT!\u201D';
 c.textAlign='center';c.fillStyle='#fff';fitFont(c,kt,290,12,9,z=>'italic 600 '+z+'px '+F);const tw=c.measureText(kt).width;c.fillText(kt,330,397.5);
 c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1;c.beginPath();c.moveTo(330-tw/2-62,397.5);c.lineTo(330-tw/2-12,397.5);c.moveTo(330+tw/2+12,397.5);c.lineTo(330+tw/2+62,397.5);c.stroke();
 c.restore();return cv.toDataURL('image/png')}
/* ---- KARTU BELAKANG ---- hanya identitas sekolah, nama anak, dan QR */
function buatBelakang(s,opt){
 const {K,cv,c}=kanvas();let gr;
 rr(c,0,0,660,420,22);c.save();c.clip();
 /* latar + pola */
 gr=c.createLinearGradient(0,0,0,420);gr.addColorStop(0,'#fbfdfc');gr.addColorStop(1,'#eef7f2');c.fillStyle=gr;c.fillRect(0,0,660,420);
 pola(c,0,91,660,287,'rgba(30,130,95,.15)',.6);
 /* header */
 gr=c.createLinearGradient(0,0,660,0);gr.addColorStop(0,'#0a5a3f');gr.addColorStop(.6,'#0e6a49');gr.addColorStop(1,'#0b5a40');c.fillStyle=gr;c.fillRect(0,0,660,91);
 pola(c,0,0,660,91,'rgba(255,255,255,.07)',.6);
 c.save();c.beginPath();c.rect(0,0,660,91);c.clip();c.strokeStyle=EM;c.lineWidth=1.3;c.fillStyle=EM;
 c.beginPath();c.arc(589,34,25.7,0,7);c.stroke();c.beginPath();c.arc(589,34,2.4,0,7);c.fill();
 c.strokeRect(551.7,-3,75.3,75.3);c.beginPath();c.moveTo(536,34);c.lineTo(589,-19);c.lineTo(642,34);c.lineTo(589,87);c.closePath();c.stroke();c.restore();
 /* logo */
 const lg=opt.logo?LG.get(opt.logo):null;let gx=138;
 if(lg&&lg.width){const H0=82,asp=lg.width/lg.height,W0=Math.min(asp*H0,185),r=Math.min(W0/lg.width,H0/lg.height),w=lg.width*r,h=lg.height*r;
  gx=Math.max(138,Math.round(w+30));c.imageSmoothingEnabled=true;c.imageSmoothingQuality='high';c.drawImage(lg,gx/2-w/2,45.5-h/2,w,h)}
 const tx=gx+19;
 c.strokeStyle='#e9c55a';c.lineWidth=1.6;c.beginPath();c.moveTo(gx,18);c.lineTo(gx,73);c.stroke();
 c.textBaseline='middle';c.textAlign='left';
 c.fillStyle='#f2c94c';c.font='bold 15px '+F;lsText(c,'KARTU ID CARD',tx,28,2.6);
 const _nm=String(opt.nama||'').toUpperCase();c.fillStyle='#fff';fitFont(c,_nm,538-tx,26,12,z=>'800 '+z+'px '+F);tebal(c,_nm,tx,57,.8);
 /* lingkaran hias di balik QR */
 c.beginPath();c.arc(330,234.5,143,0,7);c.lineWidth=1;c.strokeStyle='rgba(30,130,95,.12)';c.stroke();
 c.save();c.setLineDash([1.5,3.5]);c.beginPath();c.arc(330,234.5,131,0,7);c.lineWidth=1.2;c.strokeStyle='rgba(224,189,74,.8)';c.stroke();c.restore();
 /* QR */
 c.save();c.shadowColor='rgba(15,92,63,.22)';c.shadowBlur=18*K;c.shadowOffsetY=3*K;rr(c,199,103.5,262,262,18);c.fillStyle='#fff';c.fill();c.restore();
 rr(c,199,103.5,262,262,18);c.lineWidth=3.4;c.strokeStyle='#1b7a5a';c.stroke();
 const o=qrObj(opt.qr),n=o.getModuleCount(),cl=Math.floor(240*K/n)/K,sz=cl*n,qx=330-sz/2,qy=234.5-sz/2;c.fillStyle='#000';for(let r=0;r<n;r++)for(let q=0;q<n;q++)if(o.isDark(r,q))c.fillRect(qx+q*cl,qy+r*cl,cl,cl);
 /* footer */
 gr=c.createLinearGradient(0,0,660,0);gr.addColorStop(0,'#0a5a3f');gr.addColorStop(1,'#0e6a49');c.fillStyle=gr;c.fillRect(0,378,660,42);
 pola(c,0,378,660,42,'rgba(255,255,255,.06)',.6);
 c.beginPath();c.moveTo(520,420);c.bezierCurveTo(590,416,640,398,660,374);c.lineTo(660,420);c.closePath();c.fillStyle='rgba(125,196,165,.55)';c.fill();
 c.beginPath();c.moveTo(520,420);c.bezierCurveTo(590,416,640,398,660,374);c.lineWidth=2.4;c.strokeStyle='#f0cf5a';c.stroke();
 c.strokeStyle='rgba(255,255,255,.75)';c.lineWidth=1.1;c.beginPath();c.moveTo(126.7,398.5);c.lineTo(176.7,398.5);c.moveTo(483,398.5);c.lineTo(533,398.5);c.stroke();
 /* nama anak: di footer, rata tengah antara dua garis, tengah vertikal sejajar garis */
 const nm=String(s.nama||'').toUpperCase();c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#f2c94c';fitFont(c,nm,270,23,10,z=>'800 '+z+'px '+F);
 const _t=elips(c,nm,270),_cap=c.measureText('H').actualBoundingBoxAscent;tebal(c,_t,330,398.5+_cap/2,.6);
 c.restore();return cv.toDataURL('image/png')}
g.Kartu={DOMAIN_PORTAL,urlQR,kodeDariQR,qrObj,buatKartu,buatBelakang,siapkanLogo,tglDMY,jkNama};
})(window);
