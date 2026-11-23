/* Fitur pendukung raport: PDF, alumni, dan pratinjau pesan WhatsApp */

/* ---- PDF raport: DESAIN ada di /rapor.js (dipakai bersama portal). Di sini hanya menyiapkan data ---- */
async function pnPdfBuat(rs,infoFn,nf,btn){await muatLib('pdf');if(!setUnduhBusy(btn,true,'Membuat PDF...'))return;
 try{await jedaUnduh();const logo=await Rapor.logoPng(S.set&&S.set.logo).catch(()=>null),stempel=await Rapor.logoPng(S.set&&S.set.stempel).catch(()=>null),infos=rs.map(r=>infoFn(r)||{}),ids=[];
  rs.forEach((r,i)=>{const w=infos[i].wali||ttdWali(r.kelas_nama),k=infos[i].kepsek||ttdKepsek(),pg=r.fmt==='perkembangan'?pkPengelola([w&&w.id,k&&k.id]):null;if(w&&w.id)ids.push(w.id);if(k&&k.id)ids.push(k.id);if(pg&&pg.id)ids.push(pg.id)});
  const sig=await ttdPngAmbil(ids);
  const Ds=rs.map((r,ix)=>{const i=infos[ix];if(r.fmt==='perkembangan')return pkSusun(r,logo,{...i,ttd:sig,stempel});i.wali=i.wali||ttdWali(r.kelas_nama);i.kepsek=i.kepsek||ttdKepsek();if(i.wali&&i.wali.id)i.wali.ttd=sig[i.wali.id]||null;if(i.kepsek&&i.kepsek.id)i.kepsek.ttd=sig[i.kepsek.id]||null;if(r.status!=='terbit'){const ko=pkKepO(r);if(ko.keputusan)r=Object.assign({},r,{keputusan:ko.keputusan,kelas_tujuan:ko.kelasTujuan||null})}return Rapor.susun(r,{logo,stempel,sekolah:ns(),alamat:(S.set&&S.set.alamat)||'',kota:kotaTtd(),nama:i.nama,nisn:i.nisn,wali:i.wali,kepsek:i.kepsek})});
  await Rapor.pdf(Ds,nf);toast('PDF raport sedang diproses, mohon ditunggu')}
 catch(e){toast('Gagal membuat PDF: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}
async function pnPdf(ids,btn){const rs=pnRap.filter(r=>ids.includes(r.id));if(!rs.length)return toast('Belum ada raport tersimpan untuk diunduh',false);
 const nmS=r=>(siswaById(r.siswa_id)||{}).nama||'';
 const kix=r=>{const i=S.kelas.findIndex(k=>k.nama===r.kelas_nama);return i<0?999:i},urut=rs.slice().sort((a,b)=>(kix(a)-kix(b))||nmS(a).localeCompare(nmS(b),'id')),r0=urut[0],bersih=t=>String(t||'').replace(/[^\w\-]+/g,'-').replace(/^-+|-+$/g,'');
 const nf=urut.length===1?'Raport-'+bersih(nmS(r0))+'-'+r0.jenis+'-S'+r0.semester:'Raport-'+bersih(new Set(urut.map(r=>r.kelas_nama)).size>1?'Semua-kelas':r0.kelas_nama)+'-'+r0.jenis+'-S'+r0.semester+'-'+bersih(r0.tahun_ajaran);
 return pnPdfBuat(urut,r=>{const s=siswaById(r.siswa_id)||{};return{nama:s.nama,nisn:s.nisn,wali:ttdWali(r.kelas_nama),kepsek:ttdKepsek()}},nf,btn)}



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
