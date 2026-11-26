/* Fitur pendukung raport: PDF, alumni, dan pratinjau pesan WhatsApp */

/* ---- PDF raport: DESAIN ada di /rapor.js (dipakai bersama portal). Di sini hanya menyiapkan data ---- */
async function pnPdfBuat(rs,infoFn,nf,btn,opt){opt=opt||{};await muatLib('pdf');if(!setUnduhBusy(btn,true,'Membuat PDF...'))return false;
 try{await jedaUnduh();const logo=await Rapor.logoPng(S.set&&S.set.logo).catch(()=>null),stempel=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null),infos=rs.map(r=>infoFn(r)||{}),ids=[];
  rs.forEach((r,i)=>{const w=infos[i].wali||ttdWali(r.kelas_nama),k=infos[i].kepsek||ttdKepsek(),pg=r.fmt==='perkembangan'?pkPengelola([w&&w.id,k&&k.id]):null;if(w&&w.id)ids.push(w.id);if(k&&k.id)ids.push(k.id);if(pg&&pg.id)ids.push(pg.id)});
  const sig=await ttdPngAmbil(ids);
  const Ds=rs.map((r,ix)=>{const i=infos[ix];if(r.fmt==='perkembangan')return pkSusun(r,logo,{...i,ttd:sig,stempel});i.wali=i.wali||ttdWali(r.kelas_nama);i.kepsek=i.kepsek||ttdKepsek();if(i.wali&&i.wali.id)i.wali.ttd=sig[i.wali.id]||null;if(i.kepsek&&i.kepsek.id)i.kepsek.ttd=sig[i.kepsek.id]||null;if(r.status!=='terbit'){const ko=pkKepO(r);if(ko.keputusan)r=Object.assign({},r,{keputusan:ko.keputusan,kelas_tujuan:ko.kelasTujuan||null})}return Rapor.susun(r,{logo,stempel,sekolah:ns(),alamat:(S.set&&S.set.alamat)||'',kota:kotaTtd(),nama:i.nama,nisn:i.nisn,wali:i.wali,kepsek:i.kepsek})});
  if(opt.perFile){await Rapor.pdfBanyak(Ds,opt.names,opt.progress,opt.batchSize||4);toast(rs.length+' file PDF raport berhasil dibuat')}
  else{await Rapor.pdf(Ds,nf);toast('PDF raport sedang diproses, mohon ditunggu')}
  return true}
 catch(e){toast('Gagal membuat PDF: '+(e.message||e),false);return false}finally{setUnduhBusy(btn,false)}}
async function pnPdf(ids,btn,opt){const rs=pnRap.filter(r=>ids.includes(r.id));if(!rs.length)return toast('Belum ada raport tersimpan untuk diunduh',false);
 const nmS=r=>(siswaById(r.siswa_id)||{}).nama||'';
 const kix=r=>{const i=S.kelas.findIndex(k=>k.nama===r.kelas_nama);return i<0?999:i},urut=rs.slice().sort((a,b)=>(kix(a)-kix(b))||nmS(a).localeCompare(nmS(b),'id')),r0=urut[0],bersih=t=>String(t||'').replace(/[^\w\-]+/g,'-').replace(/^-+|-+$/g,'');
 const nf=urut.length===1?'Raport-'+bersih(nmS(r0))+'-'+r0.jenis+'-S'+r0.semester:'Raport-'+bersih(new Set(urut.map(r=>r.kelas_nama)).size>1?'Semua-kelas':r0.kelas_nama)+'-'+r0.jenis+'-S'+r0.semester+'-'+bersih(r0.tahun_ajaran);
 const safe=t=>bersih(t)||'Siswa',names=urut.map(r=>'Raport-'+safe(nmS(r))+'-'+r.jenis+'-S'+r.semester+'-'+safe(r.tahun_ajaran));
 const perFile=urut.length>1||!!(opt&&opt.perFile);
 return pnPdfBuat(urut,r=>{const s=siswaById(r.siswa_id)||{};return{nama:s.nama,nisn:s.nisn,wali:ttdWali(r.kelas_nama),kepsek:ttdKepsek()}},nf,btn,perFile?{perFile:true,names,progress:opt&&opt.progress,batchSize:4}:null)}



/* ---- Raport alumni (menu Alumni): hanya raport terbit, ikut terhapus bila data alumni dihapus ---- */
async function alRapor(id){const a=(AL.data||[]).find(x=>x.id===id);if(!a)return;
 guard(async()=>{const rs=await dbq(db.from('rapor').select('*').eq('alumni_id',id).eq('status','terbit').order('tahun_ajaran').order('semester').order('jenis',{ascending:false}));
  window._alRap=rs||[];window._alA=a;
  if(typeof PKR!=='undefined'&&window._alRap.some(r=>r.fmt==='perkembangan')){
   try{if(!PKR.loaded)await pkMuat();
    const hs=[...new Set(window._alRap.map(r=>r.salinan_hash).filter(x=>x&&!PKR.sal.has(x)))];
    if(hs.length){const sal=await dbq(db.from('rapor_salinan').select('hash,isi').in('hash',hs));(sal||[]).forEach(x=>PKR.sal.set(x.hash,x.isi))}
   }catch(e){console.warn('Indikator raport alumni belum termuat',e)}}
  if(!window._alRap.length){info('Raport '+a.nama,'<div class="note">Tidak ada raport terbit yang tersimpan untuk alumni ini.</div>');return}
  info('Raport '+a.nama,'<div class="mu" style="margin-bottom:8px">Raport tersimpan selama data alumni ada, lalu terhapus bersama data alumni.</div>'+window._alRap.map((r,i)=>`<div class="tb" style="align-items:center"><div style="flex:1"><b>${r.jenis} Semester ${r.semester}</b><div class="mu">TA ${esc(r.tahun_ajaran)} · Kelas ${esc(r.kelas_nama||'-')}</div></div><button class="btn sm soft" onclick="alRaporLihat(${i})">👁 Lihat</button><button class="btn sm soft" onclick="alRaporPdf([${i}],this)">📄 PDF</button></div>`).join('')+`<div class="tb"><button class="btn success" onclick="alRaporPdf([${window._alRap.map((_,i)=>i).join(',')}],this)">📄 Unduh semua (${window._alRap.length})</button></div>`)})}
async function alRaporD(a,r,logo,stempel){
 if(r.fmt==='perkembangan')return pkSusun(r,logo,{alumni:true,nama:a.nama,nisn:a.nisn||'',tempat:a.tempat_lahir||'',tgl:a.tgl_lahir||'',stempel});
 return Rapor.susun(r,{logo,stempel,sekolah:ns(),alamat:(S.set&&S.set.alamat)||'',kota:kotaTtd(),nama:a.nama,nisn:a.nisn||'',wali:null,kepsek:null})}
/* pratinjau satu raport alumni (satu siswa, satu raport) */
function alRaporLihat(i){const a=window._alA,r=(window._alRap||[])[i];if(!a||!r)return;
 guard(async()=>{await muatLib('pdf');const logo=await Rapor.logoPng(S.set&&S.set.logo).catch(()=>null),stempel=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null),D=await alRaporD(a,r,logo,stempel);
  info('Raport '+a.nama,`<div class="rpv"><div class="note"><b>${esc(a.nama)}</b>${a.nisn?' · NISN '+esc(a.nisn):''}<br>Kelas ${esc(r.kelas_nama||'-')} · TA ${esc(r.tahun_ajaran)} · Semester ${esc(r.semester)} · ${esc(r.jenis)}</div>
  <div class="tb" style="flex-wrap:wrap;align-items:center"><button type="button" class="btn soft sm" onclick="rpZoom(-80)">➖ Perkecil</button><button type="button" class="btn soft sm" onclick="rpZoom(80)">➕ Perbesar</button><span class="mu">Geser untuk melihat bagian lain</span></div>
  <div id="rpPrev" class="rpprev"><div class="note">⏳ Menyiapkan raport...</div></div>
  <div class="tb" style="flex-wrap:wrap"><button type="button" class="btn soft grow" onclick="closeM();alRapor(${a.id})">⬅ Daftar raport</button><button type="button" class="btn success grow" onclick="alRaporPdf([${i}],this)">📄 Unduh PDF</button></div></div>`);
  $('#md').classList.add('besar');
  const w=$('#rpPrev'),bd=$('#mbd');RP.lb=Math.min(1000,Math.max(240,((w&&w.clientWidth)||((bd&&bd.clientWidth)||360)-24)-20));Rapor.pratinjau(w,[D],RP.lb)})}
function alRaporPdf(idx,btn){const a=window._alA,rs=idx.map(i=>window._alRap[i]).filter(Boolean);if(!a||!rs.length)return;
 const bersih=t=>String(t||'').replace(/[^\w\-]+/g,'-').replace(/^-+|-+$/g,'');
 pnPdfBuat(rs,r=>({alumni:true,nama:a.nama,nisn:a.nisn||'',tempat:a.tempat_lahir||'',tgl:a.tgl_lahir||'',wali:null,kepsek:null}),'Raport-'+bersih(a.nama)+(rs.length===1?'-'+rs[0].jenis+'-S'+rs[0].semester+'-'+bersih(rs[0].tahun_ajaran):'-semua'),btn)}



function pnPesan(arr){const sk=ns(),per=pnJenisTxt(pnJenis)+' Semester '+pnSem+' · TA '+S.set.tahun_ajaran;let isi;
 if(arr.length===1){const s=arr[0];isi='Berikut tautan raport ananda di '+sk+'.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas+'\nPeriode : *'+per+'*\n\n🔗 '+linkSiswa(s)+'#rapor'}
 else isi='Berikut tautan raport ananda di '+sk+'.\nPeriode : *'+per+'*\n\n'+arr.map((s,i)=>(i+1)+'. *'+s.nama+'* ('+s.kelas+')\n🔗 '+linkSiswa(s)+'#rapor').join('\n\n');
 return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_\n\n'+isi+'\n\nMelalui tautan ini Bapak/Ibu dapat melihat dan mengunduh raport ananda. Mohon tautan tidak dibagikan kepada orang lain.\n\nTerima kasih 🙏🏻\n_Waalaikumsalam warahmatullahi wabarakatuh_'}
/* Pratinjau pesan: tampilan mirip gelembung WhatsApp, persis isi yang akan dikirim */
function pnBubble(teks){let h=esc(teks);h=h.replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/(^|[\s>])_([^_\n<>]+)_(?=[\s<.,!?]|$)/g,'$1<i>$2</i>').replace(/\n/g,'<br>');
 return '<div style="background:#dcf8c6;color:#1f2a1f;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5;word-break:break-word;max-height:55vh;overflow:auto;box-shadow:0 1px 2px rgba(0,0,0,.15)">'+h+'</div>'}

/* ---- Unduh Semua Raport: pilih siswa dalam kelas terpilih, lalu unduh PDF per anak secara batch ---- */
const PN_UND_UI={items:[],sel:new Set(),kelas:'',busy:false};
function pnUnduhSemuaBuka(){
 if(pnAll||!pnK){pnTab='nilai';renderV();return toast('Pilih satu kelas pada dropdown kelas di tab Penilaian, lalu tekan Unduh Semua Raport',false);}
 const kl=pnKl(pnK);if(!kl)return toast('Kelas yang dipilih tidak ditemukan',false);
 const sis=pnDaftar(),map=new Map(pnRap.map(r=>[r.siswa_id,r])),items=sis.map(s=>({s,r:map.get(s.id)||null}));
 if(!items.some(x=>x.r))return toast('Belum ada raport tersimpan untuk kelas '+kl.nama,false);
 PN_UND_UI.items=items;PN_UND_UI.sel=new Set();PN_UND_UI.kelas=kl.nama;PN_UND_UI.busy=false;
 const isi=items.map(({s,r})=>{const siap=!!r,st=siap?(r.status==='terbit'?'Terbit':'Draf'):'Belum ada raport tersimpan';
  return '<label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--bd);border-radius:12px;background:var(--card);'+(siap?'':'opacity:.55')+'">'+
   '<input type="checkbox" id="pnUnduhChk'+s.id+'" onchange="pnUnduhCek('+s.id+',this.checked)"'+(siap?'':' disabled')+' style="width:18px;height:18px;flex:0 0 auto">'+
   '<span style="flex:1;min-width:0"><b>'+esc(s.nama)+'</b><div class="mu" style="font-size:12px">'+st+'</div></span></label>'}).join('');
 info('Unduh Semua Raport','<div class="note">Kelas <b>'+esc(kl.nama)+'</b> · TA '+esc(S.set.tahun_ajaran||'-')+' · Semester '+pnSem+' · '+esc(pnJenis)+'. Centang siswa yang raportnya ingin diunduh. Setiap anak akan mendapatkan satu file PDF tersendiri.</div>'+
  '<div class="tb" style="align-items:center;justify-content:space-between"><button type="button" class="btn soft sm" id="pnUnduhPilih" onclick="pnUnduhPilihSemua()">Pilih semua</button><b id="pnUnduhJumlah">0 dipilih</b></div>'+
  '<div id="pnUnduhList" style="display:grid;gap:7px;max-height:48vh;overflow:auto;padding:1px">'+isi+'</div>'+
  '<div id="pnUnduhProgres" class="note" style="display:none;margin-top:10px"></div>'+
  '<div class="tb" style="margin-top:12px"><button type="button" class="btn success grow" id="pnUnduhBtn" onclick="pnUnduhMulai(this)" disabled>Unduh</button></div>');
 const ms=document.getElementById('ms'),tp=document.getElementById('mtp');if(ms)ms.style.display='none';if(tp)tp.textContent='Tutup';
}
function pnUnduhCek(id,on){if(PN_UND_UI.busy)return;if(on)PN_UND_UI.sel.add(id);else PN_UND_UI.sel.delete(id);pnUnduhHitung()}
function pnUnduhPilihSemua(){if(PN_UND_UI.busy)return;const ada=PN_UND_UI.items.filter(x=>x.r),semua=ada.length&&PN_UND_UI.sel.size===ada.length;
 PN_UND_UI.sel=semua?new Set():new Set(ada.map(x=>x.s.id));PN_UND_UI.items.forEach(x=>{const el=document.getElementById('pnUnduhChk'+x.s.id);if(el)el.checked=!!x.r&&PN_UND_UI.sel.has(x.s.id)});pnUnduhHitung()}
function pnUnduhHitung(){const n=PN_UND_UI.sel.size,tot=PN_UND_UI.items.filter(x=>x.r).length,j=document.getElementById('pnUnduhJumlah'),b=document.getElementById('pnUnduhBtn'),p=document.getElementById('pnUnduhPilih');
 if(j)j.textContent=n+' dipilih dari '+tot+' raport';if(b)b.disabled=!n||PN_UND_UI.busy;if(p)p.textContent=n===tot&&tot?'Hapus semua centang':'Pilih semua'}
function pnUnduhProgress(done,total,batch,batches){const el=document.getElementById('pnUnduhProgres');if(!el)return;el.style.display='block';el.textContent='Memproses batch '+batch+' dari '+batches+' · '+done+' / '+total+' PDF dibuat. Mohon tunggu sampai selesai.'}
async function pnUnduhMulai(btn){if(PN_UND_UI.busy)return;const chosen=PN_UND_UI.items.filter(x=>x.r&&PN_UND_UI.sel.has(x.s.id)),ids=chosen.map(x=>x.r.id);
 if(!ids.length)return toast('Centang raport siswa yang ingin diunduh',false);
 PN_UND_UI.busy=true;pnUnduhHitung();const el=document.getElementById('pnUnduhProgres');if(el){el.style.display='block';el.textContent='Menyiapkan '+ids.length+' raport...'}
 let ok=false;try{ok=await pnPdf(ids,btn,{perFile:true,progress:pnUnduhProgress})}catch(e){toast('Gagal membuat PDF: '+(e.message||e),false)}
 PN_UND_UI.busy=false;const b=document.getElementById('pnUnduhBtn');
 if(ok){if(el){el.textContent='Selesai. '+ids.length+' file PDF raport telah diproses untuk diunduh.';el.style.display='block'}if(b){b.textContent='Selesai';b.disabled=true}}
 else{if(el){el.textContent='Proses belum selesai. Periksa pesan kesalahan, lalu tekan Coba lagi.';el.style.display='block'}if(b){b.textContent='Coba lagi';b.disabled=false}}
}
