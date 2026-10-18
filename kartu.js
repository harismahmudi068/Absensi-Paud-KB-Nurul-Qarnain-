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
function bintang(c,cx,cy,ro,ri,n,rot){c.beginPath();for(let i=0;i<n*2;i++){const r=i%2?ri:ro,a=rot+i*Math.PI/n;const x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);i?c.lineTo(x,y):c.moveTo(x,y)}c.closePath()}
/* lambang bawaan bila sekolah belum mengunggah logo */
function lambang(c,cx,cy){
 bintang(c,cx,cy,41,31,8,-Math.PI/2);c.fillStyle='#f0cf5a';c.fill();
 bintang(c,cx,cy,36,27,8,-Math.PI/2);c.fillStyle='#0d5a40';c.fill();c.lineWidth=1.6;c.strokeStyle='#fff';c.stroke();
 c.fillStyle='#fff';c.beginPath();c.moveTo(cx,cy+13);c.lineTo(cx-17,cy+9);c.lineTo(cx-17,cy-6);c.lineTo(cx,cy-2);c.closePath();c.fill();
 c.beginPath();c.moveTo(cx,cy+13);c.lineTo(cx+17,cy+9);c.lineTo(cx+17,cy-6);c.lineTo(cx,cy-2);c.closePath();c.fill();
 c.strokeStyle='#0d5a40';c.lineWidth=1;c.beginPath();c.moveTo(cx,cy-2);c.lineTo(cx,cy+13);c.stroke();
 bintang(c,cx,cy-17,3.6,1.5,5,-Math.PI/2);c.fillStyle='#f0cf5a';c.fill()}
/* ---- ikon putih (vektor, tidak bergantung emoji/font perangkat) ---- */
const HJ='#0e5a3d';
const IK={
 orang(c,x,y){c.fillStyle='#fff';c.beginPath();c.arc(x,y-3.6,3.8,0,7);c.fill();c.beginPath();c.moveTo(x-7,y+7);c.quadraticCurveTo(x-7,y+0.8,x,y+0.8);c.quadraticCurveTo(x+7,y+0.8,x+7,y+7);c.closePath();c.fill()},
 topi(c,x,y){c.fillStyle='#fff';c.beginPath();c.moveTo(x-8,y-1.5);c.lineTo(x,y-5.5);c.lineTo(x+8,y-1.5);c.lineTo(x,y+2.5);c.closePath();c.fill();
  c.beginPath();c.moveTo(x-4.5,y+1.2);c.lineTo(x-4.5,y+4.6);c.quadraticCurveTo(x,y+7,x+4.5,y+4.6);c.lineTo(x+4.5,y+1.2);c.lineTo(x,y+3.4);c.closePath();c.fill();
  c.strokeStyle='#fff';c.lineWidth=1;c.beginPath();c.moveTo(x+7.4,y-1);c.lineTo(x+7.4,y+4);c.stroke()},
 kartu(c,x,y){c.fillStyle='#fff';rr(c,x-8,y-5.5,16,11,2);c.fill();c.fillStyle=HJ;c.beginPath();c.arc(x-4,y-1.3,1.7,0,7);c.fill();
  c.beginPath();c.moveTo(x-7,y+3.6);c.quadraticCurveTo(x-4,y+0.4,x-1,y+3.6);c.closePath();c.fill();c.fillRect(x+0.5,y-2.6,5.6,1.1);c.fillRect(x+0.5,y-0.4,5.6,1.1);c.fillRect(x+0.5,y+1.8,5.6,1.1)},
 kalender(c,x,y){c.fillStyle='#fff';rr(c,x-7,y-5,14,12.5,2);c.fill();c.fillRect(x-4.2,y-7,1.8,3.4);c.fillRect(x+2.4,y-7,1.8,3.4);
  c.fillStyle=HJ;c.fillRect(x-7,y-5,14,3);c.textAlign='center';c.textBaseline='middle';c.font='bold 6.6px system-ui,sans-serif';c.fillText('17',x,y+3);c.textAlign='left'},
 pria(c,x,y){c.strokeStyle='#fff';c.lineWidth=1.9;c.lineCap='round';c.beginPath();c.arc(x-1.8,y+1.8,4.3,0,7);c.stroke();
  c.beginPath();c.moveTo(x+1.4,y-1.4);c.lineTo(x+6,y-6);c.moveTo(x+1.6,y-6);c.lineTo(x+6,y-6);c.lineTo(x+6,y-1.6);c.stroke();c.lineCap='butt'},
 lokasi(c,x,y){c.fillStyle='#fff';c.beginPath();c.arc(x,y-1.8,5.2,Math.PI*0.8,Math.PI*0.2,false);c.lineTo(x,y+7.4);c.closePath();c.fill();c.fillStyle=HJ;c.beginPath();c.arc(x,y-1.8,2,0,7);c.fill()},
 wa(c,x,y){c.strokeStyle='#fff';c.lineWidth=1.7;c.beginPath();c.arc(x,y-0.4,6,Math.PI*0.62,Math.PI*0.5+Math.PI*2-0.0,false);c.stroke();
  c.fillStyle='#fff';c.beginPath();c.moveTo(x-6.4,y+6.8);c.lineTo(x-5.9,y+2.4);c.lineTo(x-2.6,y+5.6);c.closePath();c.fill();
  c.lineWidth=2;c.lineCap='round';c.beginPath();c.arc(x+0.6,y-0.4,2.6,Math.PI*0.95,Math.PI*1.5);c.stroke();c.lineCap='butt'}};
/* ---- KARTU ---- Desain permanen. Ukuran kanvas 660x420 (rasio sama dengan desain acuan). */
function buatKartu(s,opt){
 const K=3,cv=document.createElement('canvas');cv.width=660*K;cv.height=420*K;const c=cv.getContext('2d');c.scale(K,K);
 const F='system-ui,-apple-system,Segoe UI,Roboto,sans-serif';let gr;
 rr(c,0,0,660,420,22);c.save();c.clip();
 /* latar badan */
 gr=c.createLinearGradient(0,94,0,380);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#f0f9f5');c.fillStyle=gr;c.fillRect(0,0,660,420);
 /* header */
 gr=c.createLinearGradient(0,0,660,0);gr.addColorStop(0,'#0a5a3f');gr.addColorStop(.6,'#0e6a49');gr.addColorStop(1,'#0b5a40');c.fillStyle=gr;c.fillRect(0,0,660,94);
 c.fillStyle='rgba(255,255,255,.045)';c.beginPath();c.moveTo(150,94);c.bezierCurveTo(250,72,330,34,400,0);c.lineTo(520,0);c.bezierCurveTo(450,42,390,80,330,94);c.closePath();c.fill();
 c.beginPath();c.moveTo(518,94);c.bezierCurveTo(585,90,640,62,660,20);c.lineTo(660,94);c.closePath();
 gr=c.createLinearGradient(520,94,660,20);gr.addColorStop(0,'#b9ddcb');gr.addColorStop(1,'#eaf6f0');c.fillStyle=gr;c.fill();
 c.beginPath();c.moveTo(518,94);c.bezierCurveTo(585,90,640,62,660,20);c.lineWidth=2.4;c.strokeStyle='#f0cf5a';c.stroke();
 /* logo sekolah */
 const lg=opt.logo?LG.get(opt.logo):null;
 if(lg&&lg.width){c.save();c.beginPath();c.arc(74,51,40,0,7);c.fillStyle='#fff';c.fill();c.clip();
  const bx=60,r=Math.min(bx/lg.width,bx/lg.height),w=lg.width*r,h=lg.height*r;c.drawImage(lg,74-w/2,51-h/2,w,h);c.restore();
  c.beginPath();c.arc(74,51,40,0,7);c.lineWidth=2;c.strokeStyle='#f0cf5a';c.stroke()}
 else lambang(c,74,51);
 /* judul */
 c.strokeStyle='#e9c55a';c.lineWidth=1.6;c.beginPath();c.moveTo(138,22);c.lineTo(138,81);c.stroke();
 c.textBaseline='middle';c.textAlign='left';
 c.fillStyle='#f2c94c';c.font='bold 15px '+F;lsText(c,'KARTU PELAJAR',157,27,2.6);
 const yr=String(s.masuk||'')||String(opt.tahun||opt.hari).slice(0,4),_nm=String(opt.nama||'').toUpperCase();
 c.fillStyle='#fff';fitFont(c,_nm,355,31,12,z=>'bold '+z+'px '+F);c.fillText(_nm,157,53);
 c.fillStyle='#e6f2ec';c.font='14px '+F;c.fillText('Tahun Terdaftar : '+yr,158,78);
 /* nama lengkap */
 c.fillStyle=HJ;c.font='bold 11.5px '+F;lsText(c,'NAMA LENGKAP',29,112,.7);
 rr(c,25,123,401,34,17);gr=c.createLinearGradient(0,123,0,157);gr.addColorStop(0,'#f4faf7');gr.addColorStop(1,'#e2f1ea');c.fillStyle=gr;c.fill();c.lineWidth=1.3;c.strokeStyle='#2a8a68';c.stroke();
 c.beginPath();c.moveTo(42,123);c.lineTo(58,123);c.lineTo(69,140);c.lineTo(58,157);c.lineTo(42,157);c.arc(42,140,17,Math.PI/2,Math.PI*1.5);c.closePath();c.fillStyle=HJ;c.fill();IK.orang(c,43,140);
 const nm=String(s.nama||'').toUpperCase();c.fillStyle='#0b3d2b';fitFont(c,nm,335,17,9,z=>'bold '+z+'px '+F);c.fillText(elips(c,nm,335),80,140.5);
 /* informasi siswa */
 c.fillStyle=HJ;c.font='bold 11.5px '+F;lsText(c,'INFORMASI SISWA',29,171,.7);const iw=29+lsW(c,'INFORMASI SISWA',.7)+9;
 c.lineWidth=2;c.strokeStyle='#e9c13a';c.beginPath();c.moveTo(iw,171);c.lineTo(iw+42,171);c.stroke();
 c.lineWidth=1.2;c.strokeStyle='#1b7a5a';c.beginPath();c.moveTo(iw+46,171);c.lineTo(417,171);c.stroke();
 const wa=s.wa?'0'+String(s.wa).replace(/^62/,''):'-';
 const rows=[['Kelas',s.kelas||'-',IK.topi],['NISN',s.nisn||'-',IK.kartu],['Tanggal Lahir',tglDMY(s.tgl)||'-',IK.kalender],['Jenis Kelamin',jkNama(s.jk)||'-',IK.pria],['Alamat',s.alamat||'-',IK.lokasi],['WA Ortu',wa,IK.wa]];
 rows.forEach((p,i)=>{const y=183+i*30.6;
  rr(c,25,y,401,26,13);gr=c.createLinearGradient(0,y,0,y+26);gr.addColorStop(0,'#ffffff');gr.addColorStop(1,'#e9f6f0');c.fillStyle=gr;c.fill();c.lineWidth=1.2;c.strokeStyle='#b4dccb';c.stroke();
  rr(c,25,y,40,26,13);c.fillStyle=HJ;c.fill();p[2](c,45,y+13);
  c.textAlign='left';c.textBaseline='middle';c.fillStyle='#0f4a33';c.font='600 12px '+F;c.fillText(p[0],76,y+13.5);c.fillText(':',178,y+13.5);
  c.fillStyle='#10261c';fitFont(c,p[1],228,12,8,z=>'bold '+z+'px '+F);c.fillText(elips(c,p[1],228),190,y+13.5)});
 /* QR */
 rr(c,439,118,200,204,16);c.fillStyle='#fff';c.fill();c.lineWidth=2.2;c.strokeStyle='#0f7a54';c.stroke();
 const o=qrObj(opt.qr),n=o.getModuleCount(),cl=Math.floor(172*K/n)/K,sz=cl*n,qx=539-sz/2,qy=220-sz/2;c.fillStyle='#000';for(let r=0;r<n;r++)for(let q=0;q<n;q++)if(o.isDark(r,q))c.fillRect(qx+q*cl,qy+r*cl,cl,cl);
 /* lencana aktif */
 rr(c,440,331,202,37,18.5);c.fillStyle=HJ;c.fill();
 c.beginPath();c.arc(467,349.5,12.5,0,7);c.fillStyle='#fff';c.fill();c.strokeStyle=HJ;c.lineWidth=2.4;c.lineCap='round';c.lineJoin='round';c.beginPath();c.moveTo(461.5,349.5);c.lineTo(465.5,353.5);c.lineTo(473,345.5);c.stroke();c.lineCap='butt';c.lineJoin='miter';
 c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1;c.beginPath();c.moveTo(490,340);c.lineTo(490,359);c.stroke();
 c.textAlign='left';c.textBaseline='middle';c.fillStyle='#fff';fitFont(c,'Aktif Selama Jadi Siswa',136,12.5,9,z=>'italic 600 '+z+'px '+F);c.fillText('Aktif Selama Jadi Siswa',500,350);
 /* footer */
 gr=c.createLinearGradient(0,0,660,0);gr.addColorStop(0,'#0a5a3f');gr.addColorStop(1,'#0e6a49');c.fillStyle=gr;c.fillRect(0,378,660,42);
 c.beginPath();c.moveTo(520,420);c.bezierCurveTo(590,416,640,398,660,374);c.lineTo(660,420);c.closePath();c.fillStyle='rgba(125,196,165,.55)';c.fill();
 c.beginPath();c.moveTo(520,420);c.bezierCurveTo(590,416,640,398,660,374);c.lineWidth=2.4;c.strokeStyle='#f0cf5a';c.stroke();
 const kt='\u201CAwal yang TEPAT Adalah satu langkah yang HEBAT!\u201D';
 c.textAlign='center';c.fillStyle='#fff';fitFont(c,kt,290,12,9,z=>'italic 600 '+z+'px '+F);const tw=c.measureText(kt).width;c.fillText(kt,330,397.5);
 c.strokeStyle='rgba(255,255,255,.8)';c.lineWidth=1;c.beginPath();c.moveTo(330-tw/2-62,397.5);c.lineTo(330-tw/2-12,397.5);c.moveTo(330+tw/2+12,397.5);c.lineTo(330+tw/2+62,397.5);c.stroke();
 c.restore();return cv.toDataURL('image/png')}
g.Kartu={DOMAIN_PORTAL,urlQR,kodeDariQR,qrObj,buatKartu,siapkanLogo,tglDMY,jkNama};
})(window);
