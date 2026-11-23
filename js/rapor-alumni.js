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

