/* ---------- Pencarian menu dan fitur dashboard ---------- */
/* Pencarian menu dan fitur: hasil dipilih manual, tidak ada navigasi saat mengetik. */
const CARI_FITUR=[
 ...MENUS.map(m=>({id:m[0],label:m[1],path:m[1],icon:m[2],type:'menu'})),
 {id:'pnAlpa',label:'Alpa Otomatis',path:'Pengaturan → Alpa Otomatis',icon:'⏰',type:'pengaturan'},
 {id:'pnNotifLibur',label:'Notifikasi Libur',path:'Pengaturan → Notifikasi Libur',icon:'🔔',type:'pengaturan'},
 {id:'pnTabungan',label:'Pengaturan Tabungan',path:'Pengaturan → Tabungan',icon:'💰',type:'pengaturan'},
 {id:'pnPiket',label:'Jadwal Piket',path:'Pengaturan → Jadwal Piket',icon:'🧹',type:'pengaturan'},
 {id:'pnHafalan',label:'Pengaturan Hafalan',path:'Pengaturan → Hafalan',icon:'📖',type:'pengaturan'},
 {id:'pnNotifOrtu',label:'Notifikasi Orang Tua',path:'Pengaturan → Notifikasi Orang Tua',icon:'📨',type:'pengaturan'},
 {id:'pnNama',label:'Nama Sekolah',path:'Pengaturan → Nama Sekolah',icon:'🏫',type:'pengaturan'},
 {id:'pnLogo',label:'Logo Sekolah',path:'Pengaturan → Logo Sekolah',icon:'🖼️',type:'pengaturan'},
 {id:'pnStempel',label:'Stempel Sekolah',path:'Pengaturan → Stempel Sekolah',icon:'🔖',type:'pengaturan'},
 {id:'pnFotoOrtu',label:'Foto Orang Tua',path:'Pengaturan → Foto Orang Tua',icon:'👨‍👩‍👧',type:'pengaturan'},
 {id:'pnAlamat',label:'Alamat Sekolah',path:'Pengaturan → Alamat Sekolah',icon:'📍',type:'pengaturan'},
 {id:'pnKonfig',label:'Konfigurasi Webhook',path:'Pengaturan → Konfigurasi Webhook',icon:'🔗',type:'pengaturan'},
 {id:'kel',label:'Pengaturan Penilaian, Kelompok dan Indikator',path:'Penilaian Siswa → Pengaturan',icon:'⚙️',type:'penilaian'},
 {id:'nilai',label:'Penilaian Siswa',path:'Penilaian Siswa → Penilaian',icon:'📝',type:'penilaian'},
 {id:'mapel',label:'Mapel dan KKM',path:'Penilaian Siswa → Mapel & KKM',icon:'📚',type:'penilaian'},
 {id:'kep',label:'Keputusan Akhir',path:'Penilaian Siswa → Keputusan Akhir',icon:'🎓',type:'penilaian'},
 {id:'kirim',label:'Kirim Laporan Raport',path:'Penilaian Siswa → Kirim Laporan',icon:'📤',type:'penilaian'},
 /* Tab di dalam menu utama */
 {id:'pindah',label:'Pindah Kelas',path:'Kelola Siswa → Pindah Kelas',icon:'↔️',type:'tab',parent:'kelola'},
 {id:'naik',label:'Naik Kelas',path:'Kelola Siswa → Naik Kelas',icon:'⬆️',type:'tab',parent:'kelola'},
 {id:'tinggal',label:'Tinggal Kelas',path:'Kelola Siswa → Tinggal Kelas',icon:'🔁',type:'tab',parent:'kelola'},
 {id:'lulus',label:'Kelulusan',path:'Kelola Siswa → Kelulusan',icon:'🎓',type:'tab',parent:'kelola'},
 {id:'pengesahan',label:'Pengesahan',path:'Kelola Siswa → Pengesahan',icon:'✅',type:'tab',parent:'kelola'},
 {id:'in',label:'Pemasukan Tabungan',path:'Tabungan → Pemasukan',icon:'⬇️',type:'tab',parent:'tabungan'},
 {id:'out',label:'Pengeluaran Tabungan',path:'Tabungan → Pengeluaran',icon:'⬆️',type:'tab',parent:'tabungan'},
 {id:'rek',label:'Rekap dan Laporan Tabungan',path:'Tabungan → Rekap & Laporan',icon:'📊',type:'tab',parent:'tabungan'},
 {id:'jadwal',label:'Jadwal Piket',path:'Jadwal Piket → Jadwal',icon:'📅',type:'tab',parent:'piket'},
 {id:'jenis',label:'Jenis Piket',path:'Jadwal Piket → Jenis Piket',icon:'🏷️',type:'tab',parent:'piket'},
 {id:'setor',label:'Setor Hafalan',path:'Hafalan → Setor',icon:'✍️',type:'tab',parent:'hafalan'},
 {id:'daftar',label:'Daftar Hafalan',path:'Hafalan → Daftar Hafalan',icon:'📋',type:'tab',parent:'hafalan'},
 {id:'rekap',label:'Rekap Hafalan',path:'Hafalan → Rekap',icon:'📊',type:'tab',parent:'hafalan'},
 {id:'jenis',label:'Jenis Hafalan',path:'Hafalan → Jenis',icon:'🏷️',type:'tab',parent:'hafalan'},
 {id:'masuk',label:'Pesan Masuk',path:'Pesan WA → Pesan Masuk',icon:'💬',type:'tab',parent:'pesan'},
 {id:'riwayat',label:'Riwayat Status Pesan',path:'Pesan WA → Riwayat Status Pesan',icon:'📋',type:'tab',parent:'pesan'}
];
let cariTerbuka=false,cariHasil=[],cariPilih=0;
function pencarianToggle(){
 const p=$('#dashSearchPanel');if(!p)return;
 cariTerbuka=!cariTerbuka;p.hidden=!cariTerbuka;
 if(cariTerbuka){setTimeout(()=>$('#dashSearchInput')?.focus(),50);pencarianInput($('#dashSearchInput')?.value||'')}
 else pencarianTutup();
}
function pencarianTutup(){
 cariTerbuka=false;const p=$('#dashSearchPanel');if(p)p.hidden=true;
 const i=$('#dashSearchInput');if(i)i.value='';
 const r=$('#dashSearchResults');if(r)r.innerHTML='';
 cariHasil=[];cariPilih=0;
}
function pencarianCocok(q,item){
 const norm=x=>String(x||'').toLocaleLowerCase('id').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
 const kata=norm(q).split(/\s+/).filter(Boolean),target=norm(item.label+' '+item.path);
 if(!kata.length)return false;
 const tokens=target.split(' ');
 return kata.every(k=>tokens.some(t=>t.startsWith(k)||t.includes(k))||target.includes(k));
}
function pencarianInput(v){
 const r=$('#dashSearchResults');if(!r)return;
 const q=String(v||'').trim();cariPilih=0;
 if(!q){cariHasil=[];r.innerHTML='<div class="dash-search-empty">Ketik nama menu atau fitur yang ingin dicari.</div>';return}
 cariHasil=CARI_FITUR.filter(x=>allowed(x.type==='tab'?x.parent:x.type==='pengaturan'?'pengaturan':x.type==='penilaian'?'penilaian':x.id)&&pencarianCocok(q,x)).slice(0,10);
 r.innerHTML=cariHasil.length?cariHasil.map((x,i)=>'<button type="button" class="dash-search-result" role="option" aria-selected="'+(i===0)+'" onclick="pencarianBuka('+i+')"><span class="dsr-icon">'+x.icon+'</span><span class="dsr-main"><span class="dsr-name">'+esc(x.label)+'</span><span class="dsr-path">'+esc(x.path)+'</span></span><span aria-hidden="true">›</span></button>').join(''):'<div class="dash-search-empty">Tidak ada menu atau fitur yang cocok.</div>';
}
function pencarianKey(e){
 if(e.key==='Escape'){e.preventDefault();pencarianTutup();return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){
  if(!cariHasil.length)return;e.preventDefault();cariPilih=(cariPilih+(e.key==='ArrowDown'?1:-1)+cariHasil.length)%cariHasil.length;
  document.querySelectorAll('.dash-search-result').forEach((b,i)=>b.setAttribute('aria-selected',String(i===cariPilih)));
  document.querySelectorAll('.dash-search-result')[cariPilih]?.scrollIntoView({block:'nearest'});return
 }
 if(e.key==='Enter'&&cariHasil.length){e.preventDefault();pencarianBuka(cariPilih)}
}
async function pencarianBuka(i){
 const x=cariHasil[i];if(!x)return;
 pencarianTutup();
 if(x.type==='pengaturan')return lompatPengaturan(x.id);
 if(x.type==='penilaian'){await go('penilaian');pnHal(x.id);return}
 if(x.type==='tab'){
  await go(x.parent);
  if(x.parent==='kelola')return klTab(x.id);
  if(x.parent==='tabungan')return tabHal(x.id);
  if(x.parent==='piket')return pkHal(x.id);
  if(x.parent==='hafalan')return hfHal(x.id);
  if(x.parent==='pesan')return pesHal(x.id);
  return;
 }
 return go(x.id);
}
document.addEventListener('click',e=>{const p=$('#dashSearchPanel'),b=$('#dashSearchToggle');if(cariTerbuka&&p&&!p.contains(e.target)&&b&&!b.contains(e.target))pencarianTutup()});

