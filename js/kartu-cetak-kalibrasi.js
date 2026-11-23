/* ---------- urutan bersama & kalibrasi cetak belakang ---------- */
const kalBulat=v=>{v=Math.round((parseFloat(v)||0)*10)/10;return Math.max(-5,Math.min(5,v))},KALK='kartu_kalibrasi',KALKP='kartu_kalibrasi_portrait';
function kalMuat(){try{const o=JSON.parse(localStorage.getItem(KALK)||'{}');return{x:kalBulat(o.x),y:kalBulat(o.y)}}catch(e){return{x:0,y:0}}}
let KAL=kalMuat(),KALP=(()=>{try{const o=JSON.parse(localStorage.getItem(KALKP)||'{}');return{x:kalBulat(o.x),y:kalBulat(o.y)}}catch(e){return{x:0,y:0}}})(),kalT={x:0,y:0};
const daftarKartuTampil=()=>S.siswa.filter(s=>!kk||kk==='*'||s.kelas===kk).sort((a,b)=>kCmp(a,b)||(a.aktif===b.aktif?0:a.aktif?-1:1)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0));
const kbeku=(s,sd)=>`<div class="kwrap knon ${ko==='portrait'?'kportrait':''}"><div class="kspin"><div class="kspn"></div>Memuat kartu...</div><img class="kimg" data-kartu-id="${s.id}" data-sisi="${sd}" alt=""><div class="knlbl">Siswa nonaktif</div></div>`;
const kimgK=(s,sd)=>s.aktif?kimg(s,sd):kbeku(s,sd);
const kfotoBtn=(adaFoto,att)=>`<button type="button" class="kfb ${adaFoto?'ada-foto':'foto-kosong'}" aria-label="${adaFoto?'Pilihan foto siswa':'Upload foto siswa'}" title="${adaFoto?'Pilihan foto':'Upload foto'}" ${att}><svg viewBox="0 0 24 24" aria-hidden="true">${adaFoto?'':'<path d="M12 5v14M5 12h14"/>'}</svg></button>`;
const kdepanK=s=>`<div class="kfw ${ko==='portrait'?'kportrait':''}">${kimgK(s,'depan')}${kfotoBtn(!!s.foto_path,s.aktif?(s.foto_path?`onclick="kartuFotoAksi(${s.id})"`:`onclick="fotoPilih(${s.id})"`):'disabled title="Siswa nonaktif"')}</div>`;
const kelasLinkSemua=()=>S.siswa.filter(s=>kk==='*'||s.kelas===kk).sort((a,b)=>(kk==='*'?kCmp(a,b):0)||(a.aktif===b.aktif?0:a.aktif?-1:1)||String(a.nama).localeCompare(String(b.nama),'id'));
const daftarKartu=()=>act().filter(s=>!kk||kk==='*'||s.kelas===kk).sort((a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0));
const kalFmt=v=>v===0?'0':v.toFixed(1),kalTeks=o=>'X '+(o.x>0?'+':'')+kalFmt(o.x)+' mm, Y '+(o.y>0?'+':'')+kalFmt(o.y)+' mm';
function kalPrev(){const e=$('#kalPrev');if(!e)return;const w=ko==='portrait'?53.98:85.6,h=ko==='portrait'?85.6:53.98;e.innerHTML='<svg viewBox="-7 -7 '+(w+14)+' '+(h+14)+'" style="width:100%;max-width:270px;max-height:250px;display:block;margin:0 auto" aria-hidden="true"><rect x="0" y="0" width="'+w+'" height="'+h+'" rx="3" fill="none" stroke="#8a948d" stroke-width=".6" stroke-dasharray="2 1.5"/><rect x="'+kalT.x+'" y="'+kalT.y+'" width="'+w+'" height="'+h+'" rx="3" fill="rgba(21,148,71,.16)" stroke="#159447" stroke-width=".9"/><text x="'+(w/2)+'" y="'+(h/2)+'" font-size="6" text-anchor="middle" fill="currentColor" opacity=".7">'+kalTeks(kalT)+'</text></svg><div class="mu" style="font-size:12px;margin-top:4px">Abu putus-putus = posisi awal, hijau = posisi belakang setelah digeser (pratinjau dibesarkan)</div>'}
function kalTampil(){$('#kalx').value=kalFmt(kalT.x);$('#kaly').value=kalFmt(kalT.y);kalPrev()}
function kalBuka(){const o=ko==='portrait'?KALP:KAL;kalT={x:o.x,y:o.y};kalTampil();$('#kal').classList.add('show')}
async function kalTutup(){if(!await jagaTanya(['kal']))return;$('#kal').classList.remove('show')}
function kalUbah(k,d){kalT[k]=kalBulat(kalT[k]+d);kalTampil()}
function kalIsi(k,v){kalT[k]=kalBulat(v);kalTampil()}
function kalNol(){kalT={x:0,y:0};if(ko==='portrait'){KALP={x:0,y:0};try{localStorage.removeItem(KALKP)}catch(e){}}else{KAL={x:0,y:0};try{localStorage.removeItem(KALK)}catch(e){}}kalTampil()}
function kalSimpan(){const o={x:kalT.x,y:kalT.y};if(ko==='portrait'){KALP=o;try{localStorage.setItem(KALKP,JSON.stringify(o))}catch(e){}}else{KAL=o;try{localStorage.setItem(KALK,JSON.stringify(o))}catch(e){}}kalTutup();toast('Kalibrasi '+(ko==='portrait'?'portrait':'landscape')+' disimpan: '+kalTeks(o));return true}
async function kalUji(btn){await muatLib('pdf');if(!setUnduhBusy(btn,true,'Membuat lembar uji...'))return;try{await jedaUnduh();if(ko==='portrait'){const W=53.98,H=85.6,GX=8,GY=6,C=3,R=3,x0=(210-(C*W+(C-1)*GX))/2,y0=(297-(R*H+(R-1)*GY))/2,doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});[0,1].forEach(pg=>{if(pg)doc.addPage();doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(pg?'LEMBAR UJI PORTRAIT - BELAKANG':'LEMBAR UJI PORTRAIT - DEPAN',105,12,{align:'center'});doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text('A4 portrait, skala 100%, duplex flip on long edge.',105,17,{align:'center'});for(let p=0;p<C*R;p++){const col=pg?C-1-(p%C):p%C,row=Math.floor(p/C),x=x0+col*(W+GX)+(pg?kalT.x:0),y=y0+row*(H+GY)+(pg?kalT.y:0);doc.setDrawColor(110);doc.setLineWidth(.25);doc.setLineDashPattern([],0);doc.rect(x,y,W,H);doc.setLineWidth(.15);doc.line(x+W/2-7,y+H/2,x+W/2+7,y+H/2);doc.line(x+W/2,y+H/2-7,x+W/2,y+H/2+7);doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text(String(p+1),x+5,y+12);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(pg?'BELAKANG':'DEPAN',x+W-4,y+H-4,{align:'right'})}});doc.save('lembar-uji-kartu-portrait.pdf');toast('Lembar uji portrait dibuat');return}
 const KW=85.6,KH=53.98,GX=11,GY=11,C=2,R=4,x0=(210-(C*KW+(C-1)*GX))/2,y0=(297-(R*KH+(R-1)*GY))/2,doc=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
 [0,1].forEach(pg=>{if(pg)doc.addPage();
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(40);doc.text(pg?'LEMBAR UJI - BELAKANG':'LEMBAR UJI - DEPAN',105,12,{align:'center'});
  doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text('A4 portrait, skala 100%, duplex flip on long edge. Terawang ke cahaya: kotak bernomor sama harus berimpit.',105,17,{align:'center'});
  if(pg)doc.text('Geser belakang: '+kalTeks(kalT),105,21,{align:'center'});
  for(let p=0;p<C*R;p++){let c=p%C;const r=Math.floor(p/C);if(pg)c=C-1-c;const x=x0+c*(KW+GX)+(pg?kalT.x:0),y=y0+r*(KH+GY)+(pg?kalT.y:0);
   doc.setDrawColor(110);doc.setLineWidth(.25);doc.setLineDashPattern([],0);doc.rect(x,y,KW,KH);
   doc.setLineWidth(.15);doc.line(x+KW/2-7,y+KH/2,x+KW/2+7,y+KH/2);doc.line(x+KW/2,y+KH/2-7,x+KW/2,y+KH/2+7);
   doc.setFont('helvetica','bold');doc.setFontSize(18);doc.setTextColor(60);doc.text(String(p+1),x+5,y+12);
   doc.setFont('helvetica','normal');doc.setFontSize(8);doc.setTextColor(100);doc.text(pg?'BELAKANG':'DEPAN',x+KW-4,y+KH-4,{align:'right'})}});
 doc.save('lembar-uji-kartu.pdf');toast('Lembar uji dibuat, cetak bolak-balik lalu terawang ke cahaya')}catch(e){toast('Gagal membuat lembar uji: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

/* Garis potong putus-putus mengelilingi kartu, offset 1 mm di luar ukuran fisik kartu. */
function tandaPotongKartu(doc,x,y,w,h){doc.setDrawColor(95);doc.setLineWidth(.15);doc.setLineDashPattern([1,1],0);doc.rect(x-1,y-1,w+2,h+2);doc.setLineDashPattern([],0)}
async function unduhKartuBerdampingan(list,btn){
 const portrait=ko==='portrait',W=portrait?53.98:85.6,H=portrait?85.6:53.98,G=1;
 const doc=new window.jspdf.jsPDF({orientation:portrait?'landscape':'portrait',unit:'mm',format:'a4',compress:true});
 const perPage=portrait?4:4,cols=portrait?2:1,rows=portrait?2:4,GX=portrait?16:0,GY=portrait?14:11;
 const pairW=2*W+G,pairH=H;
 const x0=((portrait?297:210)-(cols*pairW+(cols-1)*GX))/2;
 const pageH=portrait?210:297; // A4 landscape untuk kartu portrait, A4 portrait untuk kartu landscape
 const y0=(pageH-(rows*pairH+(rows-1)*GY))/2;
 for(let i=0;i<list.length;i++){
  const p=i%perPage;
  if(i&&p===0)doc.addPage('a4',portrait?'landscape':'portrait');
  const col=portrait?p%cols:0,row=portrait?Math.floor(p/cols):p;
  const x=x0+col*(pairW+GX),y=y0+row*(pairH+GY),s=list[i],backOffset=portrait?KALP:KAL;
  if(portrait)await fotoSiap(s);
  const add=async(sd,xx,off)=>{
   const im=new Image();im.src=kartuUrl(s,sd);await im.decode();
   const cv=document.createElement('canvas');cv.width=portrait?1260:1980;cv.height=portrait?1980:1260;
   const ctx=cv.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,cv.width,cv.height);ctx.drawImage(im,0,0,cv.width,cv.height);
   doc.addImage(cv.toDataURL('image/jpeg',.92),'JPEG',xx+off.x,y+off.y,W,H);
  };
  await add('depan',x,{x:0,y:0});
  await add('belakang',x+W+G,backOffset);
  /* Satu garis potong putus-putus mengelilingi pasangan depan-belakang; tidak ada garis di celah tengah. */
  tandaPotongKartu(doc,x,y,pairW,pairH);
  if(btn){btn.innerHTML='<span class="dl-spin" aria-hidden="true"></span>Membuat pasangan kartu '+(i+1)+'/'+list.length+'...';await jedaKecil(0)}
 }
 doc.save('kartu-siswa-'+(portrait?'portrait':'landscape')+'-depan-belakang-berdampingan.pdf');
 toast(list.length+' pasangan kartu dibuat dalam PDF A4 '+(portrait?'landscape':'portrait'))
}
async function unduhKartuPortrait(list,btn){
 const sisi=ks==='keduanya'?['depan','belakang']:[ks],duo=ks==='keduanya';
 if(duo&&km==='berdampingan'){await unduhKartuBerdampingan(list,btn);return}
 /* Portrait terpisah: 3 kartu per baris x 3 baris (9 kartu/halaman), ukuran ID-1 vertikal tetap. */
 const W=53.98,H=85.6,GX=8,GY=6,C=3,R=3,PP=C*R,x0=(210-(C*W+(C-1)*GX))/2,y0=(297-(R*H+(R-1)*GY))/2;
 for(let fi=0;fi<sisi.length;fi++){const sd=sisi[fi],doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true}),off=sd==='belakang'?KALP:{x:0,y:0};
  for(let i=0;i<list.length;i++){const s=list[i];if(sd==='depan')await fotoSiap(s);if(i&&i%PP===0)doc.addPage();const p=i%PP,col=sd==='belakang'?C-1-(p%C):p%C,x=x0+col*(W+GX)+off.x,y=y0+Math.floor(p/C)*(H+GY)+off.y;const im=new Image();im.src=kartuUrl(s,sd);await im.decode();const cv=document.createElement('canvas');cv.width=1260;cv.height=1980;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1260,1980);c.drawImage(im,0,0,1260,1980);doc.addImage(cv.toDataURL('image/jpeg',.92),'JPEG',x,y,W,H);tandaPotongKartu(doc,x,y,W,H);if(btn){btn.innerHTML='<span class="dl-spin" aria-hidden="true"></span>Membuat PDF '+sd+' ('+(i+1)+'/'+list.length+')...';await jedaKecil(0)}}
  doc.save('kartu-siswa-portrait-'+sd+'.pdf');if(fi<sisi.length-1)await jedaKecil(700)
 }
 toast(duo?'Dua PDF portrait (depan dan belakang) selesai dibuat':'PDF kartu portrait selesai dibuat')
}
let kartuCetakDaftar=[],kartuCetakTerpilih=new Set(),kartuCetakTombol=null;
function kartuCetakHtml(){
 const q=String($('#kartuCetakCari')?.value||'').toLowerCase().trim();
 const rows=kartuCetakDaftar.filter(s=>!q||String(s.nama||'').toLowerCase().includes(q)||String(s.pan||'').toLowerCase().includes(q)||String(s.nisn||'').toLowerCase().includes(q));
 return rows.map(s=>'<label style="display:flex;align-items:center;gap:10px;padding:9px 6px;border-bottom:1px solid var(--bd);font-size:14px"><input type="checkbox" '+(kartuCetakTerpilih.has(String(s.id))?'checked':'')+' onchange="kartuCetakToggle(\''+String(s.id)+'\',this.checked)" style="width:18px;height:18px;flex:0 0 18px"><span style="min-width:0;flex:1"><b>'+esc(s.nama)+'</b><small style="display:block;color:var(--mu)">'+esc(s.kelas||'')+(s.aktif===false?' · Nonaktif':'')+'</small></span></label>').join('')||'<div class="note">Tidak ada siswa yang cocok.</div>';
}
function kartuCetakRender(){const box=$('#kartuCetakDaftar');if(box)box.innerHTML=kartuCetakHtml();const n=$('#kartuCetakJumlah');if(n)n.textContent=kartuCetakTerpilih.size+' dari '+kartuCetakDaftar.length+' siswa dipilih';const all=$('#kartuCetakSemua');if(all)all.textContent=kartuCetakTerpilih.size===kartuCetakDaftar.length?'Kosongkan pilihan':'Pilih semua';}
function kartuCetakToggle(id,on){on?kartuCetakTerpilih.add(String(id)):kartuCetakTerpilih.delete(String(id));kartuCetakRender()}
function kartuCetakCari(){kartuCetakRender()}
function kartuCetakSemua(){if(kartuCetakTerpilih.size===kartuCetakDaftar.length)kartuCetakTerpilih.clear();else kartuCetakDaftar.forEach(s=>kartuCetakTerpilih.add(String(s.id)));kartuCetakRender()}
function bukaPilihKartu(btn){
 if(!kk)return toast(PK,false);
 kartuCetakTombol=btn;kartuCetakDaftar=daftarKartuTampil().slice().sort((a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0));
 if(!kartuCetakDaftar.length)return toast('Tidak ada siswa pada kelas yang dipilih',false);
 kartuCetakTerpilih=new Set(kartuCetakDaftar.map(s=>String(s.id)));
 info('Pilih siswa yang akan dicetak','<div class="note">Kelas: <b>'+esc(kk==='*'?'Semua kelas':kk)+'</b>. Secara awal semua siswa terpilih; hilangkan centang pada siswa yang tidak ingin dicetak.</div><div class="tb" style="margin:8px 0"><input id="kartuCetakCari" class="input" style="flex:1;min-width:0" placeholder="Cari nama siswa..." oninput="kartuCetakCari()"><button type="button" id="kartuCetakSemua" class="btn soft sm" onclick="kartuCetakSemua()">Kosongkan pilihan</button></div><div id="kartuCetakJumlah" class="mu" style="margin:4px 0 8px"></div><div id="kartuCetakDaftar" style="max-height:48vh;overflow:auto;border:1px solid var(--bd);border-radius:12px;padding:4px"></div>');
 kartuCetakRender();
 $('#ms').style.display='';$('#ms').textContent='Cetak siswa dipilih';$('#ms').className='btn success';
 $('#ms').onclick=()=>{const ids=new Set(kartuCetakTerpilih);if(!ids.size){toast('Pilih minimal satu siswa',false);return}closeM();unduhKartu(kartuCetakTombol,ids)};
}
async function unduhKartu(btn,ids){if(!kk)return toast(PK,false);await muatLib('pdf');if(!setUnduhBusy(btn,true,'Membuat PDF kartu...'))return;try{await jedaUnduh();const list0=daftarKartuTampil().filter(s=>!ids||ids.has(String(s.id))).slice().sort((a,b)=>kCmp(a,b)||String(a.nama).localeCompare(String(b.nama),'id')||(a.id>b.id?1:a.id<b.id?-1:0)),tanpa=ks==='depan'?[]:list0.filter(x=>!String(x.kode_scan||'').trim()),list=list0.filter(x=>!tanpa.includes(x));if(ujiPdf)list.push(siswaUji());if(!list.length){toast(tanpa.length?'Semua anak di pilihan ini belum punya kode scan, kartu belakang tidak bisa dibuat':'Tidak ada siswa untuk dicetak',false);return}if(ko==='portrait'){await unduhKartuPortrait(list,btn);return}
 /* ukuran kartu = ID-1 / KTP 85,6 x 53,98 mm; jarak antar kartu (mm), ubah di sini bila perlu */
 const KW=85.6,KH=53.98,GX=11,GY=11,C=2,R=4,PP=C*R,x0=(210-(C*KW+(C-1)*GX))/2,y0=(297-(R*KH+(R-1)*GY))/2,dua=ks==='keduanya',sisiPdf=dua?['depan','belakang']:[ks];if(dua&&km==='berdampingan'){await unduhKartuBerdampingan(list,btn);return}
 /* gambar kartu untuk PDF dibuat JPEG (ukuran tetap 1980x1260) supaya PDF tidak perlu membongkar PNG besar: jauh lebih cepat, hasil tetap tajam */
 const taruh=async(doc,s,sd,x,y)=>{const u=kartuUrl(s,sd),im=new Image();im.src=u;await im.decode();const cv=document.createElement('canvas');cv.width=1980;cv.height=1260;const c=cv.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,1980,1260);c.drawImage(im,0,0,1980,1260);const j=cv.toDataURL('image/jpeg',.92);doc.addImage(j,'JPEG',x,y,KW,KH);tandaPotongKartu(doc,x,y,KW,KH);if(s.aktif===false){/* label di luar kartu, diputar 90° (terbaca dari bawah ke atas): kartu kiri → di margin kiri (terbaca bawah ke atas), kartu kanan → di margin kanan (terbaca atas ke bawah, menghadap keluar); jarak ±2,5 mm dari garis kartu; tidak mengganggu pemotongan */doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(212,32,47);const tl='SISWA NONAKTIF',tw=doc.getTextWidth(tl),kiri=(x+KW/2)<105;if(kiri)doc.text(tl,x-3.1,y+KH/2+tw/2,{angle:90});else doc.text(tl,x+KW+3.1,y+KH/2-tw/2,{angle:270});doc.setTextColor(0);doc.setFont('helvetica','normal')}};
 /* mode "Depan & belakang" = 2 file PDF: semua siswa sisi depan, lalu semua siswa sisi belakang (kolom dibalik + kalibrasi, siap cetak bolak-balik) */
 for(let fi=0;fi<sisiPdf.length;fi++){const sk=sisiPdf[fi],doc=new window.jspdf.jsPDF({unit:'mm',format:'a4',compress:true});
 for(let i=0;i<list.length;i++){const s=list[i];if(sk==='depan')await fotoSiap(s);if(i>0&&i%PP===0)doc.addPage();const p=i%PP;if(p===0){doc.setDrawColor(170);doc.setLineWidth(.15);doc.setLineDashPattern([1.2,1.2],0)}
  const cb=p%C,bl=sk==='belakang',cx=bl?C-1-cb:cb,o=bl?KAL:{x:0,y:0};await taruh(doc,s,sk,x0+cx*(KW+GX)+o.x,y0+Math.floor(p/C)*(KH+GY)+o.y);
  if(btn&&i<list.length-1){btn.innerHTML='<span class="dl-spin" aria-hidden="true"></span>Membuat PDF '+(dua?sk+' ('+(fi+1)+'/2) ':'kartu ')+(i+1)+'/'+list.length+'...';await jedaKecil(0)}}
 doc.save('kartu-siswa-'+sk+'.pdf');if(fi<sisiPdf.length-1)await new Promise(r=>setTimeout(r,800))}toast(list.length+' kartu sedang diproses, mohon ditunggu'+(dua?'. Hasilnya 2 file PDF: depan dan belakang':'')+(tanpa.length?'. '+tanpa.length+' anak dilewati karena belum punya kode scan':''))}catch(e){toast('Gagal membuat PDF: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
