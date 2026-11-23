V.profil=()=>{setTimeout(()=>ttdProfilMuat(),0);const p=PROFIL||{},dev=role==='Developer',u=S.pfs||{},mb=MB();
 const wa=(S.nomor&&S.nomor[me])||'',sk=(typeof MEMB!=='undefined'&&MEMB.find(m=>m.sekolah_id===SEK)||{}).nama||'';
 const row=(l,v)=>`<div class="mu">${l}</div><div style="word-break:break-word"><b>${v||'<span class="mu">-</span>'}</b></div>`;
 const data=[row('Nama lengkap',esc(p.nama||'')),row('Username',esc(p.username||'')),row('Peran',esc(role||'')),row('NIP',esc(p.nip||'')),
  row('WhatsApp',dev?'':(wa?esc(fmtWA(wa)):'')),row('Sekolah',dev?'':esc(sk)),
  row('Status',p.aktif?'<span class="badge Hadir">Aktif</span>':'<span class="badge Belum">Nonaktif</span>'),
  row('Terdaftar',p.dibuat?esc(waktuId(p.dibuat)):''),row('Email akun',esc(u.email||'')),row('Terakhir masuk',u.last_sign_in_at?esc(waktuId(u.last_sign_in_at)):''),
  row('ID akun','<span style="font-size:11px">'+esc(me||'')+'</span>')].join('');
 const aksi=mb?'<div class="note">Mode bantuan: data hanya bisa dilihat.</div>':`<div class="tb" style="margin-top:12px"><button class="btn success" onclick="editProfilSaya()">✏️ Ubah profil${dev?'':' &amp; sandi'}</button>${dev?'':'<button class="btn soft" onclick="gantiNomor()">📱 Ubah nomor</button><button class="btn soft" onclick="nomorHilangProfil()">📵 Nomor hilang</button>'}</div>`;
 let pk;
 if(mb)pk='<div class="note">Passkey tidak tersedia di mode bantuan.</div>';
 else if(!PK_OK)pk='<div class="note">Passkey tidak tersedia di browser atau versi aplikasi ini. Gunakan Chrome atau Safari versi terbaru di HP.</div>';
 else if(S.pkErr)pk='<div class="note" style="color:var(--rd)">⚠ '+esc(S.pkErr)+'</div>';
 else{const L=S.pk||[];
  pk='<div class="note">Dengan passkey, Anda bisa masuk cukup dengan sidik jari, wajah, atau PIN layar HP. Kata sandi tetap bisa dipakai. Status di perangkat ini: <b>'+(pkAda()?'passkey aktif':'belum diaktifkan')+'</b>.</div>'
   +(L.length?'<div class="tw"><table><tbody>'+L.map((x,i)=>`<tr><td class="no">${i+1}</td><td><b>${esc(x.friendly_name||'Passkey')}</b><div class="mu">Dibuat ${x.created_at?esc(waktuId(x.created_at)):'-'}${x.last_used_at?' · terakhir dipakai '+esc(waktuId(x.last_used_at)):''}</div></td><td style="white-space:nowrap"><button class="btn sm soft" onclick="renamePasskey('${x.id}')">Ubah nama</button> <button class="btn sm danger" onclick="hapusPasskey('${x.id}')">Hapus</button></td></tr>`).join('')+'</tbody></table></div>':'<div class="mu" style="margin:10px 0">Belum ada passkey di akun ini.</div>')
   +'<button class="btn success" style="width:100%;margin-top:10px" onclick="daftarPasskey()">+ Aktifkan passkey di perangkat ini</button>'
   +(L.length&&!pkAkunList().some(x=>x.u===p.username)?'<button class="btn soft" style="width:100%;margin-top:8px" onclick="pkIngatAkun()">🔗 Tambahkan akun ini ke pilihan login</button><div class="mu" style="margin-top:4px">Cukup sekali per browser agar akun muncul di daftar pilihan masuk sidik jari. Bila muncul beberapa akun, pilih akun Anda sendiri.</div>':'')}
 return `<div class="panel" id="pnProfil"><div class="ph">👤 Profil Saya</div><div class="pb"><div style="display:grid;grid-template-columns:110px 1fr;gap:10px 12px;align-items:start">${data}</div>${aksi}</div></div><div class="panel" id="pnTtdProfil"><div class="ph">✍️ Tanda Tangan Saya</div><div class="pb" id="ttdProfilBox"><div class="mu">Memuat tanda tangan...</div></div></div><div class="panel" id="pnPasskey"><div class="ph">🔐 Passkey (sidik jari / wajah)</div><div class="pb">${pk}</div></div>`};
