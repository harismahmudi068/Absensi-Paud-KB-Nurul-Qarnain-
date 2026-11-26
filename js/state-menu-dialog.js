const MENUS=[['dashboard','Dashboard','⌂','KGD'],['absensi','Absensi','✍️','KG'],['scan','Scan','📷','KG'],['tabungan','Tabungan','💰','KG'],['piket','Jadwal Piket','🧹','KG'],['hafalan','Hafalan','📖','KG'],['kartu','Kartu','🪪','KG'],['siswa','Data Siswa','👥','KG'],['kelola','Kelola Siswa','🎓','KG'],['alumni','Alumni','🏅','KG'],['kelasjam','Kelas dan Jam Masuk','🏫','KG'],['guru','Data Guru','👨‍🏫','KG'],['penilaian','Penilaian Siswa','📝','KG'],['raport','Raport','📄','KG'],['rekap','Rekap Absensi','📚','KG'],['pesan','Pesan WA','💬','KG'],['libur','Jadwal Libur','🥳','KG'],['profil','Profil Saya','👤','KGD'],['tahunajaran','Tahun Ajaran Baru','🎓','K'],['pengaturan','Pengaturan','⚙','K'],['developer','Developer','🛠','D']];
const MENU_GRUP=[['Utama',['dashboard','profil']],['Kegiatan Harian',['absensi','scan','piket','hafalan','tabungan']],['Data Sekolah',['siswa','alumni','kartu','guru','kelasjam']],['Kelola Raport',['kelola','penilaian','raport']],['Laporan &amp; Komunikasi',['rekap','pesan']],['Pengaturan',['tahunajaran','libur','pengaturan']]];
const LBL={kepala_sekolah:'Kepala Sekolah',wakil_kepala:'Wakil Kepala Sekolah',pengelola:'Pengelola/Pengasuh',operator:'Operator',guru:'Guru',developer:'Developer'},KEYR={'Kepala Sekolah':'kepala_sekolah','Wakil Kepala Sekolah':'wakil_kepala','Pengelola/Pengasuh':'pengelola','Operator':'operator','Guru':'guru','Developer':'developer'},RC={'Kepala Sekolah':'K','Wakil Kepala Sekolah':'K','Pengelola/Pengasuh':'K','Operator':'K','Guru':'G','Developer':'D'};
const adalahKepala=()=>role==='Kepala Sekolah'||role==='Wakil Kepala Sekolah'||role==='Pengelola/Pengasuh'||role==='Operator';
const bolehKelolaTtdGuru=()=>!MB()&&['Kepala Sekolah','Wakil Kepala Sekolah','Pengelola/Pengasuh','Operator','Developer'].includes(role);
let S={siswa:[],kelas:[],guru:[],libur:[],mingguan:[],set:{},absen:{},pesan:[],kirim:{}},me=null,meNama='',role='',view='dashboard',attDate=TODAY,attKelas='',draft=null,bulan=TODAY.slice(0,7),rk='',kk='',q='',lo='',lb=TODAY.slice(0,7),chk=null,okL={},liburPrompted={},cam='belakang',scanner=null,busy=false,lastKode='',lastAt=0;
async function dbq(p){const r=await p;if(r.error)throw r.error;return r.data}
let ldn=0;function ld(on,m){ldn=Math.max(0,ldn+(on?1:-1));if(on)$('#ldt').textContent=m||'Memuat...';$('#ld').style.display=ldn?'flex':'none'}
const guard=(fn,q)=>{if(!q)ld(1);return fn().catch(e=>toast((e&&e.message)||String(e),false)).finally(()=>{if(!q)ld(0)})};
/* ---------- Penjaga perubahan yang belum disimpan (konfirmasi Simpan / Abaikan sebelum keluar) ---------- */
const JGM={},JG_TOLAK=/^(Hapus|Tolak|Koreksi|Beritahu|Batalkan|Verifikasi|Atur ulang|Nomor WhatsApp hilang)/i;
const jgEl=ids=>ids.map(i=>document.getElementById(i)).filter(Boolean);
const jgBeda=ids=>jgEl(ids).some(e=>String(e.value||'').trim()!==String(e.defaultValue||'').trim());
const jgReset=ids=>jgEl(ids).forEach(e=>{e.value=e.defaultValue});
const jgDiModal=ids=>jgEl(ids).some(e=>e.closest&&e.closest('#md'));
const jgSnap=r=>Array.prototype.map.call(r.querySelectorAll('input,select,textarea'),e=>(/csel-search|cpick-search/.test(e.className)||e.type==='button')?'':(e.type==='checkbox'||e.type==='radio')?(e.checked?'1':'0'):String(e.value)).join('\u0001');
function absKotor(){if(view!=='absensi'||mMulti||!draft)return false;const b=A(attDate)||{};for(const id in draft){const d=draft[id],o=b[id];if(!o||o.st!==d.st||o.cara!==d.cara||(o.cat||'')!==(d.cat||''))return true}for(const id in b)if(!draft[id])return true;return false}
const JG_TETAP=[
 {id:'absensi',scope:'halaman',ket:'Absensi harian',kotor:()=>absKotor(),simpan:()=>saveAtt(),abaikan:()=>{draft=null}},
 {id:'multi',scope:'halaman',ket:'Absensi multi hari',kotor:()=>view==='absensi'&&mMulti&&(mSel.size>0||(mCat||'').trim()!==''||mStatus!=='Hadir'||mA!==mB||mLewat!==true||mTimpa!==false),simpan:()=>mhTerapkan(),abaikan:()=>{mSel.clear();mStatus='Hadir';mCat='';mA=attDate||TODAY;mB=mA;mLewat=true;mTimpa=false}},
 {id:'ns',ids:['nsInp'],ket:'Nama sekolah',kotor:()=>jgBeda(['nsInp']),simpan:()=>simpanNamaSekolah(document.getElementById('nsBtn')),abaikan:()=>jgReset(['nsInp'])},
 {id:'alamat',ids:['alInp','ktInp'],ket:'Alamat sekolah',kotor:()=>jgBeda(['alInp','ktInp']),simpan:()=>simpanAlamat(null),abaikan:()=>jgReset(['alInp','ktInp'])},
 {id:'koneksi',ids:['rhAI'],ket:'Kunci API AI',kotor:()=>jgBeda(['rhAI']),simpan:()=>simpanKoneksi(null),abaikan:()=>jgReset(['rhAI'])},
 {id:'tabungan',ids:['tbJml','tbCat'],ket:'Transaksi tabungan',kotor:()=>jgBeda(['tbJml','tbCat']),simpan:()=>{const b=document.querySelector('button[onclick^="tabSimpan"]');return b?tabSimpan(/tarik/.test(b.getAttribute('onclick'))?'tarik':'setor'):false},abaikan:()=>jgReset(['tbJml','tbCat'])},
 {id:'kal',scope:'kal',ket:'Kalibrasi cetak belakang',kotor:()=>!!document.getElementById('kal')&&document.getElementById('kal').classList.contains('show')&&(kalT.x!==KAL.x||kalT.y!==KAL.y),simpan:()=>kalSimpan(),abaikan:()=>{kalT={x:KAL.x,y:KAL.y}}}
];
/* modal #md: snapshot isian saat dibuka; dianggap berubah bila isiannya berbeda */
function jagaModal(ket,simpan,aktif){
 if(aktif===false||!simpan){delete JGM.modal;return}
 const b=document.getElementById('mbd'),root=b.firstElementChild,snap=jgSnap(b);
 JGM.modal={id:'modal',scope:'modal',ket:ket||'formulir',simpan,abaikan:()=>{delete JGM.modal},
  kotor:()=>document.getElementById('md').classList.contains('show')&&document.getElementById('mbd').firstElementChild===root&&jgSnap(document.getElementById('mbd'))!==snap}}
/* modal #md dengan penanda berubah sendiri (mis. editor master indikator) */
function jagaKhusus(o){const root=document.getElementById('mbd').firstElementChild,k=o.kotor,a=o.abaikan;
 JGM.modal=Object.assign({id:'modal',scope:'modal'},o,{kotor:()=>document.getElementById('md').classList.contains('show')&&document.getElementById('mbd').firstElementChild===root&&!!k(),abaikan:()=>{try{a&&a()}catch(e){}delete JGM.modal}})}
/* popup berisi isian yang bukan data tersimpan (pendaftaran, tahun ajaran baru, catatan setoran): hanya Abaikan / Kembali mengedit */
function jagaIsian(ket,kotor,abaikan){JGM.modal={id:'modal',scope:'modal',ket,tanpaSimpan:true,simpan:()=>true,
 kotor:()=>document.getElementById('md').classList.contains('show')&&!!kotor(),
 abaikan:()=>{try{abaikan?abaikan():delete JGM.modal}catch(e){}}}}
function jagaKotorList(sel){const out=[];for(const e of JG_TETAP.concat(Object.values(JGM))){let d=false;try{d=!!e.kotor()}catch(x){}if(!d)continue;const sc=e.ids?(jgDiModal(e.ids)?'modal':'halaman'):e.scope;if(sel==='semua'||sel.indexOf(e.id)>-1||sel.indexOf(sc)>-1)out.push(e)}return out}
function jagaDialog(daftar,tanpa){return new Promise(res=>{let m=document.getElementById('jg');
 if(!m){m=document.createElement('div');m.id='jg';m.className='mb';m.style.zIndex='170';
  m.innerHTML='<div class="modal" style="width:min(400px,100%)"><div class="mbody" style="text-align:center;padding:24px 20px 14px"><div style="font-size:42px;line-height:1">💾</div><h3 style="margin:10px 0 6px">Perubahan belum disimpan</h3><div id="jgm" class="mu" style="font-size:14px;white-space:pre-line"></div></div><div class="mf" style="flex-direction:column;justify-content:stretch;gap:8px"><button type="button" class="btn success" id="jgS" style="width:100%">Simpan</button><button type="button" class="btn danger" id="jgA" style="width:100%">Abaikan perubahan</button><button type="button" class="btn soft" id="jgK" style="width:100%">Kembali mengedit</button></div></div>';document.body.appendChild(m)}
 document.getElementById('jgm').textContent=tanpa?'Ada isian yang belum disimpan pada: '+daftar.join(', ')+'.\n\nAbaikan isian ini, atau kembali mengedit?':'Ada perubahan yang belum disimpan pada: '+daftar.join(', ')+'.\n\nSimpan sekarang, atau abaikan perubahan?';
 document.getElementById('jgS').style.display=tanpa?'none':'';
 const kd=e=>{if(e.key==='Escape')fin('kembali')},fin=v=>{document.removeEventListener('keydown',kd);m.classList.remove('show');m.onclick=null;res(v)};
 document.addEventListener('keydown',kd);
 document.getElementById('jgS').onclick=()=>fin('simpan');document.getElementById('jgA').onclick=()=>fin('abaikan');document.getElementById('jgK').onclick=()=>fin('kembali');
 m.onclick=e=>{if(e.target===m)fin('kembali')};m.classList.add('show');document.getElementById('jgK').focus()})}
/* true bila boleh lanjut keluar; false bila pengguna kembali mengedit atau penyimpanan gagal */
async function jagaTanya(sel){const k=jagaKotorList(sel);if(!k.length)return true;
 const p=await jagaDialog(k.map(x=>x.ket),k.every(x=>x.tanpaSimpan));
 if(p==='kembali')return false;
 if(p==='abaikan'){k.forEach(x=>{try{x.abaikan&&x.abaikan()}catch(e){}});return true}
 for(const x of k){if(x.tanpaSimpan)continue;let ok=false;try{ok=!!await x.simpan()}catch(e){toast((e&&e.message)||String(e),false)}if(!ok)return false}
 return true}
window.addEventListener('beforeunload',e=>{if(jagaKotorList('semua').length){e.preventDefault();e.returnValue='';return ''}});

function resetTutup(){const b=$('#mtp');if(!b)return;b.textContent='Tutup';b.className='btn soft';b.onclick=()=>tutupM()}
function info(t,h){delete JGM.modal;resetTutup();$('#mt').textContent=t;$('#mbd').innerHTML=h;$('#ms').style.display='none';$('#md').classList.add('show')}
function peringatan(ket,e){try{console.warn(ket,e)}catch(x){}toast(ket+(e&&e.message?': '+e.message:''),false)}
function toast(m,ok=true){const t=$('#ts');if(!ok)m=idErr(m);t.textContent=(ok?'✓ ':'⚠ ')+m;t.className='toast '+(ok?'ok':'err');t.style.display='block';clearTimeout(t._t);t._t=setTimeout(()=>t.style.display='none',3200)}
const A=d=>S.absen[d]||{},act=()=>S.siswa.filter(s=>s.aktif),kelola=()=>role!=='Guru',allowed=id=>MENUS.find(m=>m[0]===id)[3].includes(RC[role])&&(id!=='tabungan'||!!(S.set&&S.set.tabungan_aktif))&&(id!=='piket'||!!(S.set&&S.set.piket_aktif))&&(id!=='hafalan'||!!(S.set&&S.set.hafalan_aktif));
const badge=s=>`<span class="badge ${s}">${s}</span>`,ini=s=>esc((s||'?')[0]);
/* tab(): bila header belum punya kolom "No", kolom nomor urut ditambahkan otomatis (setelah kolom centang bila ada). Baris pengelompok (colspan) tidak dinomori. */
const tab=(h,r,m)=>{
 const bersih=x=>String(x==null?'':x).replace(/<[^>]*>/g,'').trim().toLowerCase();
 const adaNo=h.some(x=>bersih(x)==='no');
 const f=String(h.length?h[0]:''),pos=(!adaNo&&(f.trim()===''||/^\s*<(input|label)/i.test(f)||bersih(f)==='pilih'))?1:0;
 const H=h.map(x=>`<th>${x}</th>`);let n=h.length,body=r;
 if(!adaNo){n++;H.splice(pos,0,'<th class="no">No</th>');
  if(typeof r==='string'&&r.indexOf('<tr')>=0&&r.indexOf('<table')<0){let i=0;
   body=r.replace(/<tr(\s[^>]*)?>([\s\S]*?)<\/tr>/g,(all,at,inner)=>{const a=at||'',fm=/^\s*<td([^>]*)>/.exec(inner);
    if(fm&&/colspan\s*=\s*["']?\d+/i.test(fm[1]))return '<tr'+a+'>'+inner.replace(/(colspan\s*=\s*["']?)(\d+)/i,(q,p1,c)=>p1+(Number(c)+1))+'</tr>';
    const cell='<td class="no">'+(++i)+'</td>';
    if(pos===0)return '<tr'+a+'>'+cell+inner+'</tr>';
    const k=inner.indexOf('</td>');return '<tr'+a+'>'+(k<0?cell+inner:inner.slice(0,k+5)+cell+inner.slice(k+5))+'</tr>'})}}
 return `<div class="tw"><table><thead><tr>${H.join('')}</tr></thead><tbody>${body||`<tr><td colspan="${n}" class="mu" style="text-align:center">${m||'Belum ada data.'}</td></tr>`}</tbody></table></div>`};
const PK='⚠️ Pilih kelas terlebih dahulu',PKM=`<span class="pk-warn">${PK}</span>`,PKH=`<div class="note" style="text-align:center">${PKM}</div>`;
const kopt=(sel,all)=>(all?`<option value="">Semua kelas</option>`:'')+S.kelas.map(k=>`<option ${k.nama===sel?'selected':''}>${esc(k.nama)}</option>`).join('');
const kopt3=s=>'<option value="">- Pilih kelas -</option><option value="*" '+(s==='*'?'selected':'')+'>Semua kelas</option>'+kopt(s,0);
const kopt2=s=>'<option value="">- Pilih kelas -</option>'+kopt(s,0);
const kopt2s=s=>'<option value="">- Pilih kelas -</option><option value="*" '+(s==='*'?'selected':'')+'>Semua kelas</option>'+kopt(s,0);
