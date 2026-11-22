/* ---------- menu aksi siswa (ikon pensil) ---------- */
function aksiSiswa(id,btn){
 const ada=document.getElementById('aksiMenu'),sama=ada&&ada.dataset.id===String(id);tutupAksi();if(sama)return;
 const s=siswaById(id);if(!s)return;
 const m=document.createElement('div');m.id='aksiMenu';m.className='aksi-menu';m.dataset.id=String(id);
 m.innerHTML=`<button onclick="tutupAksi();ubahSiswa(${id})">✏️ Ubah</button><button onclick="tutupAksi();togSiswa(${id})">${s.aktif?'⏸ Nonaktifkan':'▶ Aktifkan'}</button><button class="rd" onclick="tutupAksi();hapusSiswa(${id})">🗑 Hapus</button>`;
 document.body.appendChild(m);
 const r=btn.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight;
 const x=Math.min(Math.max(8,r.right-w),window.innerWidth-w-8);let y=r.bottom+6;if(y+h>window.innerHeight-8)y=Math.max(8,r.top-h-6);
 m.style.left=x+'px';m.style.top=y+'px';
 setTimeout(()=>{document.addEventListener('click',aksiLuar,true);window.addEventListener('scroll',tutupAksi,true)},0);
}
function aksiLuar(e){const m=document.getElementById('aksiMenu');if(m&&!m.contains(e.target))tutupAksi()}
function tutupAksi(){const m=document.getElementById('aksiMenu');if(m)m.remove();document.removeEventListener('click',aksiLuar,true);window.removeEventListener('scroll',tutupAksi,true)}
