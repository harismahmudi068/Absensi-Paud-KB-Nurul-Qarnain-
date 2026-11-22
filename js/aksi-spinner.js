/* ---------- spinner hanya untuk tindakan pengelolaan data ---------- */
(function(){let n=0;const asli=window.fetch.bind(window);
 window.fetch=function(){n++;return asli.apply(null,arguments).finally(()=>{n=Math.max(0,n-1)})};
 const aksiData=/^(simpan|tambah|ubah|edit|hapus|keluarkan|impor|import|kirim|setujui|tolak|konfirmasi|terbitkan|buat|perbarui|update)(\b|\s)/i;
 document.addEventListener('click',e=>{const b=e.target&&e.target.closest?e.target.closest('button.btn'):null;
  if(!b||b.disabled||b.classList.contains('busy')||b.classList.contains('download-busy'))return;
  const label=String(b.textContent||'').trim().replace(/^[^\p{L}\p{N}]*/u,'');
  if(!aksiData.test(label))return;
  const t0=Date.now();let tampil=false,selesai=false;
  const cek=()=>{if(selesai||!b.isConnected)return;
   if(Date.now()-t0<700){setTimeout(cek,100);return}
   if(n>0){if(!tampil&&!b.disabled){b.classList.add('busy');tampil=true}setTimeout(cek,120)}
   else{if(tampil)b.classList.remove('busy');selesai=true}
  };
  setTimeout(cek,0);
  setTimeout(()=>{selesai=true;if(tampil&&b.isConnected)b.classList.remove('busy')},20000);
 },true)})();
