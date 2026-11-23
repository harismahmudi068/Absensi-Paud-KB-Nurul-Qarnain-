/* ---------- panduan awal kepala sekolah ---------- */
let KONFIG_NANTI=false;
const langkahWajib=()=>[
 {ok:S.kelas.length>0,t:'Tambah kelas',d:'Belum ada kelas. Siswa tidak bisa ditambahkan tanpa kelas.',b:'Atur Kelas',f:"lompatPengaturan('pnKelas','btnTambahKelas')"},
 {ok:!!String((S.set&&S.set.nama_sekolah)||'').trim(),t:'Isi nama sekolah',d:'Tampil di menu, kartu pelajar, rekap, dan pesan ke orang tua.',b:'Atur Nama',f:"lompatPengaturan('pnNama','nsInp')"},
 {ok:!!String((S.set&&S.set.kota)||'').trim(),t:'Isi kota / kabupaten',d:'Dipakai pada tanda tangan Kepala Sekolah di rekap.',b:'Isi Kota',f:"lompatPengaturan('pnAlamat','ktInp')"}];
/* arahkan ke kartu: judul tidak tertutup header, kartu panjang langsung ke kotak/tombol tujuan, lalu berkedip 5 detik */
const KEDIP_MS=5200;
function kedip(el){if(!el)return;el.classList.remove('sorot');void el.offsetWidth;el.classList.add('sorot');clearTimeout(el._kd);el._kd=setTimeout(()=>el.classList.remove('sorot'),KEDIP_MS)}
function sorotKe(id,fokus,ulang){const p=$('#'+id);if(!p)return;
 const f=fokus?$('#'+fokus):null,top=($('.top')||{offsetHeight:0}).offsetHeight,bn=$('#bn'),bw=(bn&&getComputedStyle(bn).display!=='none')?bn.offsetHeight:0;
 const atas=top+10,ruang=innerHeight-atas-bw-10,r=p.getBoundingClientRect();let dy;
 if(r.height<=ruang||!f)dy=r.top-atas;
 else{const fr=f.getBoundingClientRect();dy=fr.top-atas-Math.max(0,(ruang-fr.height)/2)}
 if(Math.abs(dy)>2)window.scrollBy({top:dy,behavior:ulang?'auto':'smooth'});
 if(!ulang){kedip(p);if(f&&r.height>ruang)kedip(f.closest('.fd,label,.tb')||f);if(f&&/^(checkbox|radio)$/.test(f.type||''))setTimeout(()=>{try{f.focus({preventScroll:true})}catch(e){}},500)}
 else if(!p.classList.contains('sorot'))kedip(p)}
async function lompatKe(v,id,fokus){closeM();await go(v);setTimeout(()=>sorotKe(id,fokus),150);setTimeout(()=>sorotKe(id,fokus,true),1100)}
function lompatPengaturan(id,fokus){return lompatKe('pengaturan',id,fokus)}
function kedipHalaman(){setTimeout(()=>kedip($('#v .panel')),200)}
function panduanAwal(){if(!adalahKepala())return '';const L=langkahWajib(),n=L.filter(x=>x.ok).length;if(n===L.length)return '';
 return `<div class="panel" style="border:2px solid #d7a72f"><div class="ph">🚀 Panduan Awal <span class="mu">${n} dari ${L.length} selesai</span></div><div class="pb"><div class="note">Lengkapi data sekolah berikut agar aplikasi siap dipakai. Tombol akan langsung membawa Anda ke bagian yang tepat.</div>${L.map(x=>`<div class="ci" style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin:6px 0"><div><b>${x.ok?'✅':'⬜'} ${x.t}</b><div class="mu">${x.d}</div></div>${x.ok?'':`<button class="btn sm success" onclick="${x.f}">${x.b}</button>`}</div>`).join('')}</div></div>`}
function konfigKurang(){const k='kf_'+SEK;
 if(RHS&&!RHS.error){const m=[];if(!String(RHS.nomor_kepala||'').trim())m.push('Nomor Kepala Sekolah');if(!(RHS.tokens||[]).length)m.push('Token Fonnte');try{localStorage.setItem(k,JSON.stringify(m))}catch(e){}return m}
 if(RHS===null){try{const c=JSON.parse(localStorage.getItem(k)||'null');if(Array.isArray(c))return c}catch(e){}return ['Nomor Kepala Sekolah','Token Fonnte']}
 return null}
function bannerKonfigIsi(){if(!adalahKepala()||KONFIG_NANTI)return '';const m=konfigKurang();if(!m||!m.length)return '';
 return `<div><b>⚙ Konfigurasi belum lengkap.</b><div class="mu">Belum diisi: ${m.join(', ')}. Nomor WhatsApp Kepala Sekolah diatur melalui menu Profil Saya, sedangkan token Fonnte diatur di sini. Keduanya diperlukan agar notifikasi WhatsApp dapat berjalan. ID Group dan Kunci AI bersifat opsional.</div><div class="tb" style="margin-top:8px"><button class="btn sm success" onclick="${m.includes('Nomor Kepala Sekolah') ? "lompatKe('profil','pnProfil')" : "lompatPengaturan('pnKonfig','btnTambahToken')"}">Atur sekarang</button><button class="btn sm soft" onclick="KONFIG_NANTI=true;renderV()">Atur nanti</button></div></div>`}
function sapaAwal(){if(!adalahKepala())return;const L=langkahWajib().filter(x=>!x.ok);if(!L.length)return;const k='sapa_'+SEK;try{if(sessionStorage.getItem(k))return;sessionStorage.setItem(k,'1')}catch(e){}
 info('Selamat Datang 👋','<div style="text-align:center;padding:6px 4px"><div style="font-size:42px">🏫</div><p>Sekolah Anda belum siap dipakai. Masih ada <b>'+L.length+' hal</b> yang perlu diisi: '+L.map(x=>x.t.toLowerCase()).join(', ')+'.</p><button class="btn success" style="width:100%" onclick="closeM();'+L[0].f.replace(/"/g,'&quot;')+'">Mulai atur: '+L[0].b+'</button><button class="btn soft" style="width:100%;margin-top:8px" onclick="closeM()">Nanti</button></div>')}
const tglHero=d=>{const t=String(d||'').split('-');return t.length===3?t[2]+'/'+t[1]+'/'+t[0]:''};
function jamHero(){const p={};new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).formatToParts(new Date()).forEach(x=>p[x.type]=x.value);return p.hour+'<span class="hr-c" style="opacity:'+(+p.second%2?0:1)+'">:</span>'+p.minute+'<span class="hr-w">WIB</span>'}
function hrMulai(){if(window._hrTimer)return;const t=()=>{window._hrTimer=null;const e=document.getElementById('hrJam');if(!e||document.hidden)return;const h=jamHero();if(e.innerHTML!==h)e.innerHTML=h;window._hrTimer=setTimeout(t,1000-Date.now()%1000+15)};window._hrTimer=setTimeout(t,0)}
let rkOpen=false,rkKelas='',rkQ='';
V.dashboard=()=>{if(role==='Developer')return devDashboard();const a=A(TODAY),l=act(),c={Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0},kosong=()=>({t:0,Hadir:0,Terlambat:0,Izin:0,Sakit:0,Alpa:0,Libur:0,Belum:0}),pk={};
 S.kelas.forEach(k=>{pk[k.nama]=kosong()});
 l.forEach(s=>{const st=dayStat(s,TODAY);c[st]++;const p=pk[s.kelas]||(pk[s.kelas]=kosong());p.t++;p[st]++});
 const kl=key=>Object.keys(pk).map(nm=>{const p=pk[nm],v=key==='Hadir'?p.Hadir+p.Terlambat:p[key];return `<div class="${v?'':'z'}" role="button" tabindex="0" style="cursor:pointer" title="Lihat nama anak kelas ${esc(nm)}" onclick="event.stopPropagation();bukaDetailStatusDashboard('${key}',this.dataset.kelas)" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();bukaDetailStatusDashboard('${key}',this.dataset.kelas)}" data-kelas="${esc(nm)}"><b>${esc(nm)}</b> : ${v} dari ${p.t} orang</div>`}).join('');
 const n=l.length||1,cs=[['Hadir',c.Hadir+c.Terlambat,'termasuk '+c.Terlambat+' terlambat','#159447','Hadir'],['Terlambat',c.Terlambat,'','#d99a27','Terlambat'],['Izin',c.Izin,'','#248fe9','Izin'],['Sakit',c.Sakit,'','#ef5361','Sakit'],['Alpa',c.Alpa,'','#7a4be5','Alpa'],['Libur',c.Libur,'','#526b84','Libur'],['Belum Absen',c.Belum,'perlu ditindaklanjuti','#c98a1b','Belum']];
 return `<div class="hero hero2"><div class="hr-top"><span id="hrJam">${jamHero()}</span><span>${tglHero(TODAY)}</span></div><div class="hr-body"><div><h1>Selamat Datang 👋🏻<br>di ${esc(ns())}</h1></div><i>${logoHtml()}</i></div><p class="hr-belum">${c.Belum} anak belum absen.</p></div><div id="absensiPwaInstall" class="panel" hidden style="margin-top:12px"><div class="pb" style="padding:12px;display:flex;align-items:center;gap:12px;flex-wrap:wrap"><div style="flex:1;min-width:160px"><b>📲 Instal Absensi 1486</b><div class="mu">Akses lebih cepat langsung dari layar utama HP.</div></div><button type="button" class="btn success sm" onclick="pasangAbsensiPWA()">Instal Aplikasi</button></div></div>${panduanAwal()}${notifGabung()}
 <div class="panel"><div class="ph">⚡ Aksi Cepat</div><div class="pb"><div class="quick"><button style="background:#168b47" onclick="go('absensi')">✍️ Absensi</button><button style="background:#d7a72f" onclick="go('scan')">📷 Scan</button><button style="background:#7650b8" onclick="go('siswa')">👤 Siswa</button>${S.set&&S.set.tabungan_aktif?'<button style="background:#2a806c" onclick="go(\'tabungan\')">💰 Tabungan</button>':'<button style="background:#2a806c" onclick="go(\'rekap\')">📚 Rekap</button>'}</div></div></div>
 <div class="stats">${cs.map(x=>`<div class="card stat" style="cursor:pointer" role="button" tabindex="0" title="Lihat nama anak" onclick="bukaDetailStatusDashboard('${x[4]}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();bukaDetailStatusDashboard('${x[4]}')}"><b style="color:${x[3]}">${x[1]}</b>${x[0]}<div class="mu">${x[2]||'&nbsp;'}</div><div class="bar"><i style="width:${Math.round(x[1]*100/n)}%;background:${x[3]}"></i></div>${S.kelas.length?`<div class="kls" style="color:${x[3]}">${kl(x[4])}</div>`:''}</div>`).join('')}</div>
 <div class="panel"><div class="ph rk-h" onclick="toggleRekapHari()"><span>📋 Rekap Hari Ini</span><span class="mu">${fmt(TODAY)} <span class="rk-arrow">${rkOpen?'▲':'▼'}</span></span></div>${rkOpen?`<div class="pb"><div class="rekap-filter"><input id="rkq" class="input" placeholder="Cari nama anak..." value="${esc(rkQ)}" oninput="cariRekapHari(this)"><select class="select" onchange="rkKelas=this.value;renderV()">${rkOpt()}</select></div><div id="rkTab" style="margin-top:10px">${rekapHariTabel()}</div></div>`:''}</div>`};
function bukaDetailStatusDashboard(status,kelasFilter){
 const semua=act().filter(s=>!kelasFilter||s.kelas===kelasFilter),a=A(TODAY),pilih=semua.filter(s=>{const st=dayStat(s,TODAY);return status==='Hadir'?(st==='Hadir'||st==='Terlambat'):st===status});
 const waktuUrut=s=>{const r=a[s.id];const t=r&&(r.iso||r.waktu);if(!t)return Number.POSITIVE_INFINITY;const n=Date.parse(t);return Number.isFinite(n)?n:Number.POSITIVE_INFINITY};
 const urut=pilih.sort((x,y)=>String(x.kelas||'').localeCompare(String(y.kelas||''),'id')||waktuUrut(x)-waktuUrut(y)||String(x.nama||'').localeCompare(String(y.nama||''),'id'));
 const judul=(status==='Hadir'?'Hadir (termasuk terlambat)':status==='Belum'?'Belum Absen':status)+(kelasFilter?' · '+kelasFilter:'');
 let html='<div class="mu" style="margin-bottom:8px">'+fmt(TODAY)+' · '+urut.length+' anak'+(status==='Hadir'?' · status Hadir dan Terlambat':'')+'</div>';
 if(!urut.length){html+='<div class="note">Tidak ada anak dengan status '+esc(judul)+' hari ini.</div>'}else{
  let kelas='';
  urut.forEach((s,i)=>{
   if(s.kelas!==kelas){kelas=s.kelas;html+='<div style="margin:8px 0 3px;padding:6px 9px;border-radius:8px;background:var(--bg);font-weight:800">'+esc(kelas||'Tanpa kelas')+'</div>'}
   const r=a[s.id],st=dayStat(s,TODAY),w=r&&r.waktu?jamJkt(r.waktu):'',datang=r&&r.jam?'Datang '+r.jam+' WIB':'',catat=r?((w?w+' WIB':'-')+' · '+namaPencatatAbsensi(r)):'Belum ada catatan waktu/pencatat',ringkas=(datang?datang+' · ':'')+catat;
   const meta='<span class="dash-status-meta">'+(r&&r.jam?'<span>Jam datang: <b>'+esc(r.jam)+' WIB</b></span>':'')+'<span>Diubah: <b>'+(w?esc(w)+' WIB':'-')+'</b></span><span>Oleh: <b>'+esc(r?namaPencatatAbsensi(r):'Belum tersedia')+'</b></span></span>';
    html+='<div class="dash-status-row"><span class="dash-status-no">'+(i+1)+'.</span><b class="dash-status-name" title="'+esc(s.nama)+'">'+esc(s.nama)+'</b><span>'+badge(st)+'</span>'+meta+'</div>';
  });
 }
 info('📋 '+judul,html);
}

const rkOpt=()=>'<option value="">- Pilih kelas -</option><option value="*" '+(rkKelas==='*'?'selected':'')+'>Semua kelas</option>'+kopt(rkKelas,0);
function toggleRekapHari(){rkOpen=!rkOpen;renderV()}
function rekapHariData(){const z=rkQ.toLowerCase().trim();return act().filter(s=>rkKelas&&(rkKelas==='*'||s.kelas===rkKelas)&&(!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z)))}
function rekapHariTabel(){if(!rkKelas)return PKH;const a=A(TODAY),l=rekapHariData();
 const rows=l.map((s,i)=>{const r=a[s.id],w=r&&r.waktu?jamJkt(r.waktu):'',catat=r?((w?'<b>'+esc(w)+' WIB</b>':'-')+'<br><span class="mu">'+esc(namaPencatatAbsensi(r))+'</span>'):'-';return `<tr><td>${i+1}</td><td><b>${esc(s.nama)}</b></td><td>${esc(s.kelas)}</td><td>${badge(dayStat(s,TODAY))}</td><td>${r?esc((r.jam?r.jam+' WIB · ':'')+r.cara+(r.cat?' - '+r.cat:'')):''}</td><td>${catat}</td></tr>`}).join('');
 return '<div class="mu" style="margin-bottom:6px">Menampilkan '+l.length+' anak</div>'+tab(['No','Nama','Kelas','Status','Keterangan','Dicatat/diubah · Oleh'],rows,'Tidak ada anak yang cocok.')}
function cariRekapHari(el){rkQ=el.value;const t=$('#rkTab');if(t)t.innerHTML=rekapHariTabel()}
