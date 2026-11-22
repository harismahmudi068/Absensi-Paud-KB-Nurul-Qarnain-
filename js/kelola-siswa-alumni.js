/* Kelompok fitur: keputusan akhir siswa, pengesahan, perpindahan kelas, dan alumni. */
/* ---------- Kelola Siswa: kenaikan kelas, tinggal kelas, kelulusan, pengesahan ---------- */
let KL={tab:'pindah',asal:'',tujuan:'',q:'',dq:'',dk:'',hm:false,hs:new Set(),sel:new Set(),data:null,ring:null,map:new Map()};
const KJ={naik:'Naik kelas',tinggal:'Tinggal kelas',lulus:'Lulus'},KJC={naik:'Izin',tinggal:'Sakit',lulus:'Alpa'},KST={sementara:'Sementara',disahkan:'Disahkan',diterapkan:'Diterapkan'},KSC={sementara:'Terlambat',disahkan:'Hadir',diterapkan:'Libur'};
const kb=(c,t)=>`<span class="badge ${c}">${esc(t)}</span>`;
async function muatKelola(){
 const ta=S.set.tahun_ajaran;
 const [d,r]=await Promise.all([dbq(db.from('keputusan_akhir_tahun').select('*').eq('sekolah_id',SEK).eq('tahun_ajaran',ta).order('nama_siswa')),dbq(db.rpc('keputusan_validasi',{p_sekolah:SEK}))]);
 KL.data=d||[];KL.ring=r||null;KL.map=new Map(KL.data.filter(x=>x.siswa_id).map(x=>[x.siswa_id,x]));
}
function simpanKelas(id,el){const ci=el.closest('.ci'),inp=ci&&ci.querySelector('select[data-urutan]');if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();if(inp)inp.blur();setUrutan(id,inp?inp.value:'')}
const urutanOpt=n=>'<option value=""'+(n==null?' selected':'')+'>-</option>'+Array.from({length:Math.max(12,n||0)},(_,i)=>'<option value="'+(i+1)+'"'+(n===i+1?' selected':'')+'>'+(i+1)+'</option>').join('');
const setUrutan=(id,v)=>guard(async()=>{const n=String(v).trim()===''?null:parseInt(v,10);if(n!==null&&!(n>=1&&n<=12))throw new Error('Urutan kelas harus angka 1 sampai 12');await dbq(db.from('kelas').update({urutan:n}).eq('id',id));const k=S.kelas.find(x=>x.id===id);if(k)k.urutan=n;toast('Urutan kelas disimpan')});
const setKelasAkhir=(id,on)=>guard(async()=>{await dbq(db.from('kelas').update({kelas_akhir:!!on}).eq('id',id));const k=S.kelas.find(x=>x.id===id);if(k)k.akhir=!!on;toast(on?'Ditandai sebagai kelas akhir':'Tanda kelas akhir dilepas')});
/* kelas tujuan naik: hanya 1 atau 2 tingkat (urutan) di atas kelas asal */
const kelasTujuanNaik=u=>{if(u==null)return[];const lv=[...new Set(S.kelas.filter(c=>c.urutan!=null&&c.urutan>u).map(c=>c.urutan))].sort((a,b)=>a-b).slice(0,2);return S.kelas.filter(c=>lv.includes(c.urutan))};
const klOpsi=(l,sel,ph)=>`<option value="">${ph}</option>`+l.map(k=>`<option value="${k.id}" ${String(k.id)===String(sel)?'selected':''}>${esc(k.nama)}</option>`).join('');
const klAsalList=()=>S.kelas.filter(k=>KL.tab==='lulus'?k.akhir:KL.tab==='naik'?!k.akhir:true);
/* pindah kelas: urutan sama, atau 1 tingkat berikutnya */
const kelasTujuanPindah=a=>{const nx=[...new Set(S.kelas.filter(c=>c.urutan!=null&&c.urutan>a.urutan).map(c=>c.urutan))].sort((x,y)=>x-y)[0];return S.kelas.filter(c=>c.id!==a.id&&c.urutan!=null&&(c.urutan===a.urutan||c.urutan===nx))};
const klTujuanList=()=>{const a=S.kelas.find(k=>String(k.id)===String(KL.asal));return a&&a.urutan!=null?(KL.tab==='pindah'?kelasTujuanPindah(a):kelasTujuanNaik(a.urutan)):[]};
const klSiswa=()=>{const z=KL.q.toLowerCase().trim();return S.siswa.filter(s=>s.aktif&&!klKunci(s)&&KL.asal&&String(s.kelas_id)===String(KL.asal)&&(!z||s.nama.toLowerCase().includes(z)||String(s.pan||'').toLowerCase().includes(z)||String(s.nisn||'').includes(z)||cocokWA(s.wa,z))).sort((a,b)=>a.nama.localeCompare(b.nama,'id'))};
const klKunci=s=>{const d=KL.map.get(s.id);return !!d&&d.status!=='sementara'};
const klInfo=d=>kb(KJC[d.jenis],KJ[d.jenis])+(d.jenis==='naik'&&d.kelas_tujuan_nama?' → '+esc(d.kelas_tujuan_nama):'')+' '+kb(KSC[d.status],KST[d.status]);
const klBolehSahkan=kid=>{const k=S.kelas.find(x=>String(x.id)===String(kid));return !!k&&(k.wali===me||adalahKepala()||(role==='Developer'&&MB()));};
const klListHtml=()=>tab(['','No','Nama','NISN','Keputusan'],klSiswa().map((s,i)=>{const d=KL.map.get(s.id);return `<tr><td><input type="checkbox" class="ckkl" ${KL.sel.has(s.id)?'checked':''} ${klKunci(s)?'disabled':''} onchange="klPilih(${s.id},this.checked)"></td><td>${i+1}</td><td><b>${esc(s.nama)}</b><div class="mu">${esc(s.pan||'')}</div></td><td>${esc(s.nisn||'-')}</td><td>${d?klInfo(d):'<span class="mu">Belum diputuskan</span>'}</td></tr>`}).join(''),KL.asal?'Tidak ada siswa aktif yang cocok di kelas ini.':'<span class="pk-warn">⚠️ Pilih kelas asal terlebih dahulu</span>');
const klRingkasHtml=()=>{const n=KL.sel.size,nm=[...KL.sel].map(id=>(siswaById(id)||{}).nama).filter(Boolean);return `<b>${n} siswa dipilih</b>`+(n?'<div class="mu" style="margin-top:4px">'+nm.slice(0,10).map(esc).join(', ')+(nm.length>10?', dan '+(nm.length-10)+' lainnya':'')+'</div>':'')};
const klRefresh=()=>{const a=$('#klList'),b=$('#klRingkas');if(a)a.innerHTML=klListHtml();if(b)b.innerHTML=klRingkasHtml()};
function klTab(t){KL.tab=t;KL.asal='';KL.tujuan='';KL.q='';KL.sel.clear();renderV()}
function klAsal(v){KL.asal=v;KL.tujuan='';KL.sel.clear();renderV()}
function klTujuan(v){KL.tujuan=v}
function klPilih(id,on){on?KL.sel.add(id):KL.sel.delete(id);const b=$('#klRingkas');if(b)b.innerHTML=klRingkasHtml()}
function klSemua(on){klSiswa().filter(s=>!klKunci(s)).forEach(s=>on?KL.sel.add(s.id):KL.sel.delete(s.id));cekBaris('#v .ckkl:not(:disabled)').forEach(x=>x.checked=on);const b=$('#klRingkas');if(b)b.innerHTML=klRingkasHtml()}
function klCari(el){KL.q=el.value;klRefresh()}
function klCariDaftar(el){KL.dq=el.value;const a=$('#klDaftar');if(a)a.innerHTML=klDaftarHtml()}
const klJudul={naik:['Proses Kenaikan Kelas','Pilih kelas asal dan kelas tujuan, lalu centang siswa yang naik. Kelas tujuan hanya bisa 1 atau 2 tingkat di atas kelas asal, bebas memilih salah satunya.'],tinggal:['Proses Tinggal Kelas','Pilih kelas asal, lalu centang siswa yang tetap berada di kelas yang sama pada tahun ajaran berikutnya.'],lulus:['Proses Kelulusan','Pilih kelas akhir, lalu centang siswa yang dinyatakan lulus. Data siswa lulus tidak langsung berubah.'],pindah:['Pindah Kelas','Pindahkan siswa ke kelas lain dengan urutan yang SAMA atau 1 tingkat berikutnya (misalnya kelas urutan 1 boleh ke urutan 1 atau urutan 2). Berlaku langsung, bukan keputusan akhir tahun.']};
function klProsesHtml(){
 const t=KL.tab,all=klSiswa().filter(s=>!klKunci(s)),sem=all.length>0&&all.every(s=>KL.sel.has(s.id)),as=klAsalList();
 const tanpa=S.kelas.filter(k=>k.urutan==null).map(k=>k.nama),adaAkhir=S.kelas.some(k=>k.akhir);
 let w='';
 if((t==='naik'||t==='pindah')&&tanpa.length)w+=`<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ Urutan kelas belum diisi untuk: ${tanpa.map(esc).join(', ')}. ${kelola()?'Isi di menu Kelas dan Jam Masuk.':'Minta Kepala Sekolah mengisinya di menu Kelas dan Jam Masuk.'}</div>`;
 if(t==='lulus'&&!adaAkhir)w+=`<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ Belum ada kelas yang ditandai sebagai Kelas akhir. ${kelola()?'Atur di menu Kelas dan Jam Masuk.':'Minta Kepala Sekolah mengaturnya di menu Kelas dan Jam Masuk.'}</div>`;
 if((t==='naik'||t==='pindah')&&KL.asal&&!klTujuanList().length&&!tanpa.length)w+=`<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ ${t==='pindah'?'Tidak ada kelas lain dengan urutan yang sama atau 1 tingkat berikutnya dari kelas asal.':'Tidak ada kelas dengan urutan lebih tinggi dari kelas asal.'}</div>`;
 const btn={naik:'Proses Kenaikan Kelas',tinggal:'Proses Tinggal Kelas',lulus:'Proses Kelulusan',pindah:'Pindahkan Siswa'}[t];
 return `<div class="note">${klJudul[t][1]}${t==='pindah'?' Siswa langsung berpindah kelas.':' Keputusan disimpan sebagai <b>sementara</b>, siswa belum dipindahkan.'}</div>${w}
<div class="tb${(t==='naik'||t==='pindah')?'':' tb-full'}"><select class="select grow" onchange="klAsal(this.value)">${klOpsi(as,KL.asal,t==='lulus'?'- Kelas akhir -':'- Kelas asal -')}</select>${(t==='naik'||t==='pindah')?`<select class="select grow" onchange="klTujuan(this.value)">${klOpsi(klTujuanList(),KL.tujuan,'- Kelas tujuan -')}</select>`:''}</div>
<div class="tb"><input class="input grow" style="flex:1 1 100%;width:100%" placeholder="Cari nama atau NISN" value="${esc(KL.q)}" oninput="klCari(this)"></div>
<label class="mu" style="display:flex;gap:8px;align-items:center;margin:0 0 10px"><input type="checkbox" id="klCekAll" ${sem?'checked':''} onchange="klSemua(this.checked)"> Pilih semua yang terlihat</label>
<div id="klList">${klListHtml()}</div><div class="note" id="klRingkas" style="margin-top:12px">${klRingkasHtml()}</div>
<button class="btn success" onclick="klProses()">${btn}</button>`;
}
async function klProses(){
 const j=KL.tab;if(j==='pindah')return klPindah();
 if(!KL.asal)return toast(j==='lulus'?'Pilih kelas akhir terlebih dahulu':'Pilih kelas asal terlebih dahulu',false);
 if(j==='naik'&&!KL.tujuan)return toast('Pilih kelas tujuan terlebih dahulu',false);
 const ids=[...KL.sel];if(!ids.length)return toast('Belum ada siswa yang dipilih',false);
 const asal=S.kelas.find(k=>String(k.id)===String(KL.asal)),tuj=S.kelas.find(k=>String(k.id)===String(KL.tujuan));
 const ada=ids.map(id=>KL.map.get(id)).filter(Boolean);
 let msg={naik:'Naikkan ',tinggal:'Tinggalkan kelas ',lulus:'Luluskan '}[j]+ids.length+' siswa dari kelas '+asal.nama+(j==='naik'?' ke kelas '+tuj.nama:'')+'.\n\nKeputusan disimpan sebagai SEMENTARA. Siswa belum dipindahkan dan baru berlaku setelah keputusan disahkan dan tahun ajaran baru dimulai.';
 if(ada.length)msg+='\n\n'+ada.length+' siswa sudah punya keputusan sementara dan akan DIGANTI:\n'+ada.slice(0,8).map(d=>'- '+d.nama_siswa+' ('+KJ[d.jenis]+(d.jenis==='naik'&&d.kelas_tujuan_nama?' ke '+d.kelas_tujuan_nama:'')+')').join('\n')+(ada.length>8?'\n... dan '+(ada.length-8)+' lainnya':'');
 if(!await konfirmasi(msg,{judul:klJudul[j][0],ikon:'📝',ya:'Simpan keputusan'}))return;
 guard(async()=>{
  const r=await dbq(db.rpc('keputusan_simpan',{p_sekolah:SEK,p_jenis:j,p_kelas_asal:Number(KL.asal),p_kelas_tujuan:j==='naik'?Number(KL.tujuan):null,p_siswa:ids,p_timpa:true}));
  KL.sel.clear();await muatKelola();renderV();
  const tot=(r.disimpan||0)+(r.ditimpa||0);
  if(r.dilewati&&r.dilewati.length)info('Sebagian siswa dilewati',`<div class="note">${tot} keputusan tersimpan (sementara, belum final). ${r.dilewati.length} siswa dilewati:</div>`+tab(['Siswa','Alasan'],r.dilewati.map(x=>`<tr><td>${esc(x.nama)}</td><td>${esc(x.alasan)}</td></tr>`).join('')));
  else toast(tot+' keputusan tersimpan sebagai sementara. Belum final: sahkan di tab Pengesahan');
 });
}
/* ----- Pengesahan ----- */
const klDaftarList=()=>{const z=KL.dq.toLowerCase().trim();return (KL.data||[]).filter(d=>(!KL.dk||d.kelas_asal_nama===KL.dk)&&(!z||d.nama_siswa.toLowerCase().includes(z)||String(d.kelas_asal_nama||'').toLowerCase().includes(z)))};
const klDaftarHtml=()=>{const l=klDaftarList(),m=KL.hm;
 return tab((m?['']:[]).concat(['No','Siswa','Kelas asal','Keputusan','Aksi']),l.map((d,i)=>`<tr>${m?`<td><input type="checkbox" ${KL.hs.has(d.id)?'checked':''} ${d.status==='diterapkan'?'disabled':''} onchange="klHPilih(${d.id},this.checked)"></td>`:''}<td>${i+1}</td><td><b>${esc(d.nama_siswa)}</b></td><td>${esc(d.kelas_asal_nama||'-')}</td><td>${klInfo(d)}</td><td>${d.status==='sementara'?`${klBolehSahkan(d.kelas_asal_id)?`<button class="btn sm success" onclick="klSahkanSiswa(${d.id})">✔ Sahkan</button>`:''}<button class="btn sm danger" onclick="klHapus(${d.id})">Hapus</button>`:d.status==='disahkan'?`<button class="btn sm soft" onclick="klKoreksi(${d.id})">Koreksi</button>`:''}</td></tr>`).join(''),'Belum ada keputusan yang diproses.')};
const klHapusBar=()=>{const l=klDaftarList().filter(d=>d.status!=='diterapkan');
 if(!KL.hm)return l.length?`<div class="tb" style="margin-top:8px"><button class="btn danger sm" title="Hapus massal" onclick="klHMode(true)">🗑️🧹</button></div>`:'';
 const semua=l.length&&l.every(d=>KL.hs.has(d.id));
 return `<div class="tb" style="margin-top:8px"><label class="mu" style="display:flex;gap:6px;align-items:center"><input type="checkbox" ${semua?'checked':''} onchange="klHSemua(this.checked)"> Pilih semua (${l.length})</label><button class="btn danger sm" onclick="klHapusMassal()">🗑️ Hapus terpilih (<span id="klHSel">${KL.hs.size}</span>)</button><button class="btn soft sm" onclick="klHMode(false)">Batal</button></div>`};
function klHRefresh(){const a=$('#klDaftar'),b=$('#klHBar');if(a)a.innerHTML=klDaftarHtml();if(b)b.innerHTML=klHapusBar()}
function klHMode(on){KL.hm=!!on;KL.hs.clear();klHRefresh()}
function klHPilih(id,on){on?KL.hs.add(id):KL.hs.delete(id);const c=$('#klHSel');if(c)c.textContent=KL.hs.size}
function klHSemua(on){klDaftarList().filter(d=>d.status!=='diterapkan').forEach(d=>on?KL.hs.add(d.id):KL.hs.delete(d.id));klHRefresh()}
async function klHapusMassal(){
 const pil=[...KL.hs].map(id=>(KL.data||[]).find(d=>d.id===id)).filter(Boolean);if(!pil.length)return toast('Belum ada data yang dipilih',false);
 const sm=pil.filter(d=>d.status==='sementara'),sh=pil.filter(d=>d.status==='disahkan');
 const jalan=alasan=>guard(async()=>{const gagal=[];
  if(sm.length)await dbq(db.rpc('keputusan_hapus',{p_sekolah:SEK,p_ids:sm.map(d=>d.id)}));
  for(let i=0;i<sh.length;i+=5)await Promise.all(sh.slice(i,i+5).map(d=>dbq(db.rpc('keputusan_koreksi',{p_id:d.id,p_jenis:'batal',p_kelas_tujuan:null,p_alasan:alasan})).catch(e=>gagal.push(d.nama_siswa+': '+(e.message||e)))));
  KL.hs.clear();KL.hm=false;await muatKelola();renderV();
  toast((pil.length-gagal.length)+' keputusan dihapus'+(gagal.length?', '+gagal.length+' gagal ('+gagal[0]+')':''),!gagal.length)});
 if(sh.length){form('Hapus '+pil.length+' keputusan ('+sh.length+' sudah disahkan)',[{k:'a',l:'Alasan (wajib, dicatat bersama nama Anda)'}],async v=>{if(v.a.length<3)throw new Error('Isi alasan');await jalan(v.a)});$('#ms').textContent='Hapus';return}
 if(!await konfirmasi('Hapus '+pil.length+' keputusan terpilih?\n\n'+pil.slice(0,10).map(d=>d.nama_siswa).join('\n')+(pil.length>10?'\n... dan '+(pil.length-10)+' lainnya':'')+'\n\nSiswa kembali berstatus belum diputuskan.',{judul:'Hapus keputusan terpilih',ya:'Hapus semua',bahaya:1}))return;
 jalan('')}
async function klHapus(id){const d=(KL.data||[]).find(x=>x.id===id);if(!d)return;
 if(!await konfirmasi('Hapus keputusan sementara untuk '+d.nama_siswa+'? Siswa kembali berstatus belum diputuskan.',{judul:'Hapus keputusan',ya:'Hapus',bahaya:1}))return;
 guard(async()=>{await dbq(db.rpc('keputusan_hapus',{p_sekolah:SEK,p_ids:[id]}));await muatKelola();renderV();toast('Keputusan dihapus')})}
function klKoreksi(id){const d=(KL.data||[]).find(x=>x.id===id);if(!d)return;
 const LB={'Naik kelas':'naik','Tinggal kelas':'tinggal','Lulus':'lulus','Batalkan keputusan (kembali belum diputuskan)':'batal'},kn=S.kelas.map(k=>k.nama);
 form('Koreksi keputusan - '+d.nama_siswa,[{k:'j',l:'Keputusan baru',o:Object.keys(LB),v:KJ[d.jenis]},{k:'t',l:'Kelas tujuan (khusus Naik kelas)',o:['-',...kn],v:d.kelas_tujuan_nama||'-'},{k:'a',l:'Alasan koreksi (wajib, dicatat bersama nama Anda)'}],async v=>{
  const jn=LB[v.j],tj=S.kelas.find(k=>k.nama===v.t);
  if(jn==='naik'&&!tj)throw new Error('Pilih kelas tujuan untuk Naik kelas');
  if(v.a.length<3)throw new Error('Isi alasan koreksi');
  await dbq(db.rpc('keputusan_koreksi',{p_id:id,p_jenis:jn,p_kelas_tujuan:jn==='naik'?tj.id:null,p_alasan:v.a}));
  await muatKelola();renderV();toast('Koreksi tersimpan dan dicatat')})}
V.kelola=()=>{
 if(!KL.data)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat keputusan akhir tahun...</div></div></div>';
 const T=[['pindah','↔️ Pindah Kelas'],['naik','⬆️ Naik Kelas'],['tinggal','🔁 Tinggal Kelas'],['lulus','🎓 Kelulusan'],['pengesahan','✅ Pengesahan']];
 return `<div class="panel"><div class="ph">Kelola Siswa <span class="mu">Tahun ajaran diproses: ${esc(S.set.tahun_ajaran||'-')}</span></div><div class="pb"><div class="utabs kl">${T.map(t=>`<button class="utab${KL.tab===t[0]?' on':''}" onclick="klTab('${t[0]}')">${t[1]}</button>`).join('')}</div>${KL.tab==='pengesahan'?klPengesahanHtml():klProsesHtml()}</div></div>`;
};

/* ---------- pembantu data siswa lengkap (tgl lahir, jenis kelamin, alamat, tahun masuk) ---------- */
const BLN_PJ=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const tglPjg=iso=>{const p=String(iso||'').split('-');return p.length===3&&BLN_PJ[+p[1]-1]?(+p[2])+' '+BLN_PJ[+p[1]-1]+' '+p[0]:''};
const ttlPjg=(t,iso)=>{t=String(t||'').trim();const d=tglPjg(iso);return t&&d?t+', '+d:(d||t)};
const tglDMY=iso=>iso?String(iso).slice(8,10)+'/'+String(iso).slice(5,7)+'/'+String(iso).slice(0,4):'';
const jkNama=x=>x==='L'?'Laki-laki':x==='P'?'Perempuan':'';
function siswaExtra(v){const th=Number(String(v.masuk||'').trim()),mx=Number(TODAY.slice(0,4))+1;
 if(!(th>=1990&&th<=mx))throw new Error('Tahun masuk harus tahun 4 digit antara 1990 dan '+mx);
 const tp=String(v.tempat||'').replace(/\s+/g,' ').trim();if(tp.length>50)throw new Error('Tempat lahir maksimal 50 karakter');
 return {tempat_lahir:tp||null,tgl_lahir:v.tgl||null,jenis_kelamin:v.jk==='Laki-laki'?'L':v.jk==='Perempuan'?'P':null,alamat:(v.alamat||'').trim()||null,tahun_masuk:th}}
function parseTglLahir(v){v=String(v==null?'':v).trim();if(!v)return null;let d,m,y,mt;
 if(mt=v.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/)){d=+mt[1];m=+mt[2];y=+mt[3]}
 else if(mt=v.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)){y=+mt[1];m=+mt[2];d=+mt[3]}
 else if(/^\d{5}$/.test(v)&&typeof XLSX!=='undefined'){const c=XLSX.SSF.parse_date_code(+v);if(!c)return 'x';y=c.y;m=c.m;d=c.d}
 else return 'x';
 const dt=new Date(Date.UTC(y,m-1,d));if(dt.getUTCFullYear()!==y||dt.getUTCMonth()!==m-1||dt.getUTCDate()!==d||y<1990||y>Number(TODAY.slice(0,4)))return 'x';
 return y+'-'+String(m).padStart(2,'0')+'-'+String(d).padStart(2,'0')}
function parseJK(v){v=String(v==null?'':v).trim().toLowerCase();if(!v)return null;if(['l','laki','laki-laki','laki laki','pria'].includes(v))return 'L';if(['p','perempuan','wanita'].includes(v))return 'P';return 'x'}
function parseMasuk(v){v=String(v==null?'':v).trim();if(!v)return Number(TODAY.slice(0,4));const n=Number(v);return /^\d{4}$/.test(v)&&n>=1990&&n<=Number(TODAY.slice(0,4))+1?n:'x'}

/* ---------- Pindah kelas (urutan sama atau 1 tingkat berikutnya) ---------- */
async function klPindah(){
 if(!KL.asal)return toast('Pilih kelas asal terlebih dahulu',false);
 if(!KL.tujuan)return toast('Pilih kelas tujuan terlebih dahulu',false);
 const ids=[...KL.sel];if(!ids.length)return toast('Belum ada siswa yang dipilih',false);
 const asal=S.kelas.find(k=>String(k.id)===String(KL.asal)),tuj=S.kelas.find(k=>String(k.id)===String(KL.tujuan));
 const ada=ids.map(id=>KL.map.get(id)).filter(Boolean);
 let msg='Pindahkan '+ids.length+' siswa dari kelas '+asal.nama+' ke kelas '+tuj.nama+'.\n\nSiswa LANGSUNG berpindah kelas sekarang.';
 if(ada.length)msg+='\n\n'+ada.length+' siswa punya keputusan akhir tahun sementara yang akan DIHAPUS karena kelasnya berubah. Proses ulang keputusannya setelah pindah.';
 if(!await konfirmasi(msg,{judul:'Pindah Kelas',ikon:'↔️',ya:'Pindahkan'}))return;
 guard(async()=>{
  const r=await dbq(db.rpc('siswa_pindah_kelas',{p_sekolah:SEK,p_siswa:ids,p_kelas_asal:Number(KL.asal),p_kelas_tujuan:Number(KL.tujuan)}));
  KL.sel.clear();await muatDasar();await muatKelola();renderV();
  if(r.dilewati&&r.dilewati.length)info('Sebagian siswa dilewati',`<div class="note">${r.dipindah} siswa dipindahkan. ${r.dilewati.length} siswa dilewati:</div>`+tab(['Siswa','Alasan'],r.dilewati.map(x=>`<tr><td>${esc(x.nama)}</td><td>${esc(x.alasan)}</td></tr>`).join('')));
  else toast(r.dipindah+' siswa dipindahkan ke kelas '+tuj.nama+(r.keputusan_dihapus?'. '+r.keputusan_dihapus+' keputusan sementara dihapus, proses ulang bila perlu':''));
 });
}

/* ---------- Pengesahan per kelas (oleh wali kelas) ---------- */
function klPengesahanHtml(){
 const r=KL.ring||{},m=r.masalah||[],ok=(r.naik||0)+(r.tinggal||0)+(r.lulus||0);
 const cards=[['Total siswa aktif',r.total],['Sudah diputuskan',ok],['Naik kelas',r.naik],['Tinggal kelas',r.tinggal],['Lulus',r.lulus],['Belum diputuskan',r.belum],['Belum disahkan',r.sementara],['Sudah disahkan',r.disahkan]];
 const ringkas=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-bottom:12px">${cards.map(c=>`<div class="note" style="margin:0;text-align:center"><b style="font-size:22px;display:block">${c[1]||0}</b>${c[0]}</div>`).join('')}</div>`;
 const ks=(r.kelas||[]).map(k=>{
  const mk=m.filter(x=>String(x.kelas_id)===String(k.kelas_id));
  const st=!k.total?kb('Belum','Tidak ada siswa'):mk.length?kb('Terlambat',mk.length+' perlu diperiksa'):k.sementara>0?kb('Izin','Siap disahkan'):k.disahkan>0?kb('Hadir','Sudah disahkan'):kb('Belum','Belum ada keputusan');
  const wali=k.wali_nama?'Wali kelas: <b>'+esc(k.wali_nama)+'</b>':'Belum ada wali kelas; pengesahan hanya oleh kelompok akun kepala sekolah';
  const aksi=k.sementara>0&&!mk.length?(k.boleh?`<button class="btn success sm" onclick="klSahkan(${k.kelas_id})">✔ Sahkan kelas ${esc(k.nama)}</button>`:`<span style="color:#d62839;font-weight:700">⚠️ Hanya wali kelas (${esc(k.wali_nama||'-')}) yang dapat mengesahkan kelas ini</span>`):'';
  return `<div class="note" id="klKelas${k.kelas_id}" style="margin:0 0 10px"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;align-items:center"><b>Kelas ${esc(k.nama)}</b>${st}</div><div class="mu" style="margin:4px 0">${wali}</div><div class="mu">${k.total} siswa · naik ${k.naik} · tinggal ${k.tinggal} · lulus ${k.lulus} · belum diputuskan ${k.belum}</div>${mk.length?tab(['Siswa','Masalah'],mk.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.masalah)}</td></tr>`).join('')):''}${aksi?'<div class="tb" style="margin:10px 0 0">'+aksi+'</div>':''}</div>`}).join('');
 const lain=m.filter(x=>x.kelas_id==null);
 const tanpa=lain.length?`<div class="note" style="border-color:#d99a27;background:#fff8df"><b>⚠ Siswa tanpa kelas yang valid (${lain.length}):</b>`+tab(['Siswa','Masalah'],lain.map(x=>`<tr><td><b>${esc(x.nama)}</b></td><td>${esc(x.masalah)}</td></tr>`).join(''))+'</div>':'';
 return `<div class="note"><span style="color:#166534;font-weight:700">Pengesahan dapat dilakukan wali kelas atau kelompok akun kepala sekolah.</span> Jika kelas memiliki wali kelas, keduanya berhak mengesahkan. Jika tidak memiliki wali kelas, hanya kelompok akun kepala sekolah yang berhak. Pengesahan bisa dilakukan satu per satu pada daftar siswa atau sekaligus per kelas. Pengesahan hanya menetapkan keputusan sebagai resmi. Siswa baru dipindahkan, tinggal kelas, atau lulus ketika Kepala Sekolah memulai tahun ajaran baru, setelah SEMUA kelas disahkan.</div>${ringkas}${ks||'<div class="note">Belum ada kelas aktif.</div>'}${tanpa}
<div class="tb klf" style="margin-top:12px"><input class="input grow" placeholder="Cari nama atau kelas" value="${esc(KL.dq)}" oninput="klCariDaftar(this)"><select class="select" onchange="klKelasDaftar(this.value)"><option value="">Semua kelas</option>${S.kelas.map(k=>`<option value="${esc(k.nama)}" ${KL.dk===k.nama?'selected':''}>${esc(k.nama)}</option>`).join('')}</select></div><div id="klHBar">${klHapusBar()}</div><div id="klDaftar">${klDaftarHtml()}</div>`;
}
async function klSahkanSiswa(id){
 const d=(KL.data||[]).find(x=>x.id===id);if(!d||d.status!=='sementara'||!klBolehSahkan(d.kelas_asal_id))return;
 if(!await konfirmasi('Sahkan keputusan '+KJ[d.jenis]+' untuk '+d.nama_siswa+'? Keputusan ini menjadi final dan hanya dapat diubah melalui Koreksi yang dicatat.',{judul:'Sahkan keputusan siswa',ikon:'✅',ya:'Ya, sahkan'}))return;
 guard(async()=>{const x=await dbq(db.rpc('keputusan_sahkan_siswa',{p_id:id}));await muatKelola();renderV();toast('Keputusan '+x.siswa+' berhasil disahkan')});
}
async function klSahkan(kid){
 await guard(muatKelola);renderV();
 const r=KL.ring||{},k=(r.kelas||[]).find(x=>x.kelas_id===kid);if(!k)return;
 const mk=(r.masalah||[]).filter(x=>x.kelas_id===kid);
 if(mk.length)return toast('Pengesahan ditolak: '+mk.length+' siswa kelas '+k.nama+' belum diputuskan atau bermasalah',false);
 if(!(k.sementara>0))return toast(k.disahkan>0?'Kelas '+k.nama+' sudah disahkan':'Belum ada keputusan untuk disahkan',false);
 const sm=(KL.data||[]).filter(d=>d.status==='sementara'&&d.kelas_asal_id===kid),c=j=>sm.filter(d=>d.jenis===j).length;
 if(!await konfirmasi('Sahkan keputusan akhir tahun kelas '+k.nama+' (tahun ajaran '+r.tahun_ajaran+')?\n\nTotal siswa: '+sm.length+'\n- Naik kelas: '+c('naik')+'\n- Tinggal kelas: '+c('tinggal')+'\n- Lulus: '+c('lulus')+'\n\nSetelah disahkan keputusan menjadi final (perubahan hanya lewat Koreksi yang dicatat). Siswa belum dipindahkan sampai tahun ajaran baru dimulai.',{judul:'Sahkan kelas '+k.nama,ikon:'✅',ya:'Ya, sahkan'}))return;
 guard(async()=>{const x=await dbq(db.rpc('keputusan_sahkan',{p_sekolah:SEK,p_kelas:kid}));await muatKelola();renderV();toast('Kelas '+x.kelas+': '+x.disahkan+' keputusan disahkan')});
}

/* ---------- Alumni ---------- */
function klKelasDaftar(v){KL.dk=v;const a=$('#klDaftar');if(a)a.innerHTML=klDaftarHtml()}

/* ---------- Alumni (dilipat sebelum tahun dipilih, hapus terpilih) ---------- */
let AL={data:null,q:'',th:'',mode:false,sel:new Set()};
async function muatAlumni(){AL.data=(await dbq(db.from('alumni').select('*').eq('sekolah_id',SEK).order('tahun_lulus',{ascending:false}).order('nama')))||[]}
const alTerbuka=()=>AL.th!=='';
const alFilter=semua=>{const z=AL.q.toLowerCase().trim();return(AL.data||[]).filter(a=>(semua||alTerbuka())&&(!z||String(a.nama).toLowerCase().includes(z))&&(AL.th===''||AL.th==='*'||String(a.tahun_lulus)===AL.th))};
const alListHtml=()=>{
 if(!alTerbuka())return `<div class="note">📂 Daftar alumni dilipat. Pilih tahun lulus untuk menampilkannya (${(AL.data||[]).length} alumni tersimpan).</div>`;
 const l=alFilter(),m=AL.mode;
 return tab((m?['']:[]).concat(['No','Nama','Tempat, Tgl Lahir','JK','Alamat','WhatsApp','Tahun Masuk','Tahun Lulus','Kepala Sekolah','Raport']),l.map((a,i)=>`<tr>${m?`<td><input type="checkbox" class="ckal" ${AL.sel.has(a.id)?'checked':''} onchange="alPilih(${a.id},this.checked)"></td>`:''}<td>${i+1}</td><td><b>${esc(a.nama)}</b></td><td>${esc(ttlPjg(a.tempat_lahir,a.tgl_lahir))||'-'}</td><td>${jkNama(a.jenis_kelamin)||'-'}</td><td>${esc(a.alamat||'-')}</td><td>${nomorHtml(a.no_wa)} <button type="button" class="salin" onclick="alUbahWa(${a.id})" title="Ubah nomor WhatsApp" aria-label="Ubah nomor WhatsApp"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg></button></td><td>${a.tahun_masuk||'-'}</td><td>${a.tahun_lulus}</td><td>${esc(a.kepala_sekolah||'-')}</td><td><button class="btn sm soft" onclick="alRapor(${a.id})">📄 Raport</button></td></tr>`).join(''),'Tidak ada alumni yang cocok.')};
const alHapusBtn=()=>{if(AL.mode||!adalahKepala()||!alTerbuka()||!alFilter().length)return '';return `<button class="btn danger sm" onclick="alMode(true)">🗑 Hapus</button>`};
const alBarHtml=()=>{if(!adalahKepala()||!alTerbuka())return '';const l=alFilter();if(!l.length)return '';
 if(!AL.mode)return '';
 const semua=l.every(a=>AL.sel.has(a.id));
 return `<div class="tb"><label class="mu" style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="alCekAll" ${semua?'checked':''} onchange="alSemua(this.checked)"> Pilih semua (${l.length})</label><button class="btn danger sm" onclick="alHapusTerpilih()">🗑 Hapus terpilih (<span id="alSel">${AL.sel.size}</span>)</button><button class="btn soft sm" onclick="alMode(false)">Batal</button></div>`};
const alJmlText=()=>alTerbuka()?alFilter().length+' dari '+(AL.data||[]).length+' alumni':(AL.data||[]).length+' alumni tersimpan';
const alRefresh=()=>{const a=$('#alList'),b=$('#alJml'),c=$('#alBar'),h=$('#alHapusSlot');if(h)h.innerHTML=alHapusBtn();if(a)a.innerHTML=alListHtml();if(b)b.textContent=alJmlText();if(c)c.innerHTML=alBarHtml()};
function alCari(el){AL.q=el.value;alRefresh()}
function alTahun(v){AL.th=v;AL.sel.clear();renderV()}
function alUbahWa(id){const a=(AL.data||[]).find(x=>x.id===id);if(!a)return;form('Ubah WhatsApp Alumni',[{k:'wa',l:'Nomor WhatsApp orang tua',t:'tel',v:a.no_wa?('0'+String(a.no_wa).replace(/^62/,'')) :''}],async v=>{const wa=normWA(v.wa);if(wa&&!/^628[0-9]{8,12}$/.test(wa))throw new Error('Nomor WhatsApp tidak valid');await dbq(db.rpc('alumni_wa_ubah',{p_id:id,p_no_wa:wa||null}));a.no_wa=wa||null;alRefresh();toast('Nomor WhatsApp alumni diperbarui')})}
function alMode(on){AL.mode=on;AL.sel.clear();renderV()}
function alCekUI(){const c=$('#alSel');if(c)c.textContent=AL.sel.size;const l=alFilter();const a=document.getElementById('alCekAll');if(a)a.checked=l.length>0&&l.every(x=>AL.sel.has(x.id))}
function alPilih(id,on){on?AL.sel.add(id):AL.sel.delete(id);alCekUI()}
function alSemua(on){alFilter().forEach(a=>on?AL.sel.add(a.id):AL.sel.delete(a.id));cekBaris('#v .ckal').forEach(x=>x.checked=on);alCekUI()}
async function alHapusTerpilih(){
 if(!adalahKepala())return toast('Hanya Kepala Sekolah atau Wakil yang dapat menghapus data alumni',false);
 const ids=[...AL.sel];if(!ids.length)return toast('Belum ada alumni yang dipilih',false);
 const nm=ids.map(id=>(AL.data.find(a=>a.id===id)||{}).nama).filter(Boolean);
 if(!await konfirmasi('Hapus PERMANEN '+ids.length+' data alumni?\n\n'+nm.slice(0,10).join('\n')+(nm.length>10?'\n... dan '+(nm.length-10)+' lainnya':'')+'\n\nData tidak bisa dikembalikan. Unduh dulu bila masih diperlukan.',{judul:'Hapus data alumni',ya:'Hapus permanen',bahaya:1}))return;
 guard(async()=>{const n=await dbq(db.rpc('alumni_hapus',{p_sekolah:SEK,p_ids:ids}));AL.sel.clear();AL.mode=false;await muatAlumni();renderV();toast(n+' data alumni dihapus')});
}
V.alumni=()=>{
 if(!AL.data)return '<div class="panel"><div class="pb"><div class="note">⏳ Memuat data alumni...</div></div></div>';
 const ths=[...new Set(AL.data.map(a=>a.tahun_lulus))].sort((a,b)=>b-a);
 return `<div class="panel"><div class="ph">🏅 Data Alumni <span class="mu" id="alJml">${alJmlText()}</span></div><div class="pb">
<div class="note" style="border-color:#d99a27;background:#fff8df">⚠ Data alumni hanya disimpan <b>2 tahun</b> sejak siswa dinyatakan lulus, setelah itu dihapus otomatis oleh sistem. Silakan <b>unduh data terbaru</b> sebelum dihapus.</div>
<div class="tb"><input class="input grow" placeholder="Cari nama alumni..." value="${esc(AL.q)}" oninput="alCari(this)"><select class="select" onchange="alTahun(this.value)"><option value="">- Pilih tahun lulus -</option><option value="*" ${AL.th==='*'?'selected':''}>Semua tahun lulus</option>${ths.map(t=>`<option value="${t}" ${String(t)===AL.th?'selected':''}>Lulus ${t}</option>`).join('')}</select></div>
<div class="tb"><button class="btn success sm dl" onclick="unduhAlumni('pdf',this)">⬇ PDF</button><button class="btn sm dl pdf" onclick="unduhAlumni('xlsx',this)">⬇ XLSX</button><span id="alHapusSlot" style="display:contents">${alHapusBtn()}</span></div>
<div id="alBar">${alBarHtml()}</div><div id="alList">${alListHtml()}</div></div></div>`;
};
/* ---------- Developer: hapus alumni per tahun ---------- */
function devAlumniPanel(){const r=S.devAlRing,sel=S.devAlTh||'',list=S.devAlList||[],sk=S.devAlSek,P=S.devAlPil||(S.devAlPil=new Set());
 const opt='<option value="">- Pilih tahun alumni -</option>'+(r||[]).map(x=>`<option value="${x.tahun_lulus}" ${String(x.tahun_lulus)===sel?'selected':''}>Lulus ${x.tahun_lulus} (${x.jumlah} alumni, ${x.sekolah_jml} sekolah)</option>`).join('');
 const pilS=sk?sk.filter(x=>P.has(x.sekolah_id)):[],nSel=sk?pilS.reduce((a,x)=>a+x.jumlah,0):list.length,semua=!!(sk&&sk.length&&pilS.length===sk.length);
 const tampil=sk?list.filter(x=>pilS.some(s=>s.sekolah===x.sekolah)):list;
 const pilih=sel&&sk?`<div class="note" style="margin:8px 0"><b>Pilih sekolah yang alumninya dihapus:</b><label style="display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" ${semua?'checked':''} onchange="devAlSemua(this.checked)"> <b>Semua sekolah</b></label>${sk.map(x=>`<label style="display:flex;gap:6px;align-items:center;margin-top:6px"><input type="checkbox" ${P.has(x.sekolah_id)?'checked':''} onchange="devAlSek(${x.sekolah_id},this.checked)"> ${esc(x.sekolah)} <span class="mu">(${x.jumlah} alumni)</span></label>`).join('')}</div>`:'';
 return `<div class="panel"><div class="ph">🏅 5. Hapus data alumni</div><div class="pb"><div class="note" style="color:var(--rd)">Menghapus PERMANEN data alumni untuk tahun lulus yang dipilih, hanya di sekolah yang Anda centang, dan tidak bisa dikembalikan. Data alumni juga terhapus otomatis setelah 2 tahun.${sk===null&&sel?' <b>Pilihan sekolah belum aktif (SQL tambahan belum dijalankan): penghapusan berlaku untuk SEMUA sekolah.</b>':''}</div>${r?(r.length?`<div class="tb"><select class="select grow" onchange="devAlPilih(this.value)">${opt}</select></div>`:'<div class="note">Belum ada data alumni.</div>'):'<div class="note">Data alumni belum bisa dimuat. Pastikan SQL langkah 8 sudah dijalankan.</div>'}${pilih}${sel?`<details style="margin:8px 0"><summary><b>Lihat daftar nama (${tampil.length} orang)</b></summary>${tab(['No','Sekolah','Nama'],tampil.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.sekolah)}</td><td><b>${esc(x.nama)}</b></td></tr>`).join(''),'Tidak ada data')}</details><button class="btn danger" ${(sk&&!P.size)?'disabled':''} onclick="devHapusAlumni()">🗑 Hapus alumni lulus ${esc(sel)} (${nSel} orang${sk?' di '+pilS.length+' sekolah':''})</button>`:''}</div></div>`}
function devAlPilih(v){guard(async()=>{S.devAlTh=v;S.devAlList=v?(await dbq(db.rpc('developer_alumni_daftar',{p_tahun:Number(v)})))||[]:[];S.devAlSek=null;S.devAlPil=new Set();
 if(v){try{S.devAlSek=(await dbq(db.rpc('developer_alumni_per_sekolah',{p_tahun:Number(v)})))||[]}catch(e){S.devAlSek=null}}renderV()})}
function devAlRender(){const y=window.scrollY;renderV();window.scrollTo(0,y)}
function devAlSek(id,on){const P=S.devAlPil||(S.devAlPil=new Set());on?P.add(id):P.delete(id);devAlRender()}
function devAlSemua(on){const P=S.devAlPil=new Set();if(on)(S.devAlSek||[]).forEach(x=>P.add(x.sekolah_id));devAlRender()}
function devHapusAlumni(){const th=S.devAlTh,sk=S.devAlSek,P=S.devAlPil||new Set();if(!th)return toast('Pilih tahun alumni terlebih dahulu',false);
 if(sk&&!P.size)return toast('Pilih minimal satu sekolah',false);
 const pil=sk?sk.filter(x=>P.has(x.sekolah_id)):[],n=sk?pil.reduce((a,x)=>a+x.jumlah,0):(S.devAlList||[]).length,semua=!sk||pil.length===sk.length;
 form('Hapus data alumni lulus '+th,[{k:'kf',l:'Ketik HAPUS ALUMNI untuk menghapus permanen '+n+' data alumni lulus '+th+(sk?(semua?' dari SEMUA sekolah':' dari: '+pil.map(x=>x.sekolah).join(', ')):'')}],async v=>{
  if(v.kf!=='HAPUS ALUMNI')throw new Error('Ketik persis: HAPUS ALUMNI');
  const h=semua?await dbq(db.rpc('developer_hapus_alumni',{p_tahun:Number(th)})):await dbq(db.rpc('developer_hapus_alumni_sekolah',{p_tahun:Number(th),p_sekolah:pil.map(x=>x.sekolah_id)}));
  S.devAlRing=await dbq(db.rpc('developer_alumni_ringkas')).catch(()=>null);S.devAlTh='';S.devAlList=[];S.devAlSek=null;S.devAlPil=new Set();toast(h+' data alumni dihapus');renderV()});$('#ms').textContent='Hapus permanen'}

async function unduhAlumni(t,btn){await muatLib(['exceljs','pdf']);
 if(!setUnduhBusy(btn,true,t==='xlsx'?'Membuat XLSX alumni...':'Membuat PDF alumni...'))return;
 try{await jedaUnduh();const l=alFilter(true);if(!l.length)throw new Error('Tidak ada data alumni untuk diunduh');
  const H=['No','Nama','Tempat, Tanggal Lahir','Jenis Kelamin','Alamat','WhatsApp','Tahun Masuk','Tahun Lulus','Kepala Sekolah'],rows=l.map((a,i)=>[i+1,a.nama,ttlPjg(a.tempat_lahir,a.tgl_lahir),jkNama(a.jenis_kelamin),a.alamat||'',a.no_wa?('0'+String(a.no_wa).replace(/^62/,'')):'',a.tahun_masuk||'',a.tahun_lulus,a.kepala_sekolah||'']);
  if(t==='xlsx'){await muatLib('exceljs');if(typeof ExcelJS==='undefined')throw new Error('Pustaka Excel belum termuat, periksa koneksi internet');
   const wb=new ExcelJS.Workbook();wb.creator=ns();const ws=wb.addWorksheet('Alumni'),ln={style:'thin',color:{argb:'FFCFD9D3'}};
   ws.columns=[{width:6},{width:28},{width:30},{width:16},{width:36},{width:20},{width:14},{width:14},{width:26}];ws.addRow(H);ws.getRow(1).height=24;
   ws.getRow(1).eachCell(c=>{c.font={name:'Arial',size:11,bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF176B3A'}};c.alignment={horizontal:'center',vertical:'middle'};c.border={top:ln,left:ln,bottom:ln,right:ln}});
   rows.forEach(x=>{const r=ws.addRow(x);r.eachCell(c=>{c.font={name:'Arial',size:10};c.border={top:ln,left:ln,bottom:ln,right:ln};c.alignment={vertical:'middle'}});r.getCell(3).numFmt='@';r.getCell(6).numFmt='@'});
   ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:'I'+(rows.length+1)};await tulisXlsx(wb,'data-alumni.xlsx')}
  else{const d=new window.jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});d.setFont('helvetica','bold');d.setFontSize(14);d.setTextColor(23,107,58);d.text('DATA ALUMNI - '+ns().toUpperCase(),148.5,10,{align:'center'});d.setFontSize(9);d.setTextColor(80,100,90);d.text('Dicetak '+fmt(TODAY),148.5,16,{align:'center'});
   d.autoTable({startY:21,head:[H],body:rows,theme:'grid',styles:{font:'helvetica',fontSize:8.5,cellPadding:2.5,valign:'middle'},headStyles:{fillColor:[23,107,58],textColor:[255,255,255],fontStyle:'bold',halign:'center'},columnStyles:{0:{cellWidth:8},1:{cellWidth:40},2:{cellWidth:38},3:{cellWidth:18},4:{cellWidth:38},5:{cellWidth:28},6:{cellWidth:16},7:{cellWidth:16},8:{cellWidth:38}}});d.save('data-alumni.pdf')}
  toast(l.length+' data alumni sedang diproses, mohon ditunggu')}catch(e){toast('Gagal mengunduh data alumni: '+(e.message||e),false)}finally{setUnduhBusy(btn,false)}}

