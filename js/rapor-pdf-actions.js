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

