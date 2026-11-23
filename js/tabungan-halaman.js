/* ---------- Tabungan Siswa ---------- */
let tabK='',tabQ='';
async function muatTabungan(){const a=await dbq(db.rpc('tabungan_saldo',{p_sekolah:SEK}));S.tab=a||[];if(tabP==='rek'&&tabK)await tabRekRaw()}
const fmtIn=v=>String(v||'').replace(/\D/g,'').replace(/^0+(?=\d)/,'').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
let tabP='in',tabS=0,tabBln=TODAY.slice(0,7),tabRw=[],tabRekD=null;
const tabWali=k=>{const w=ttdWali(k);return w?w.nama:'-'},tabAdaWali=k=>{const x=S.kelas.find(c=>c.nama===k);return !!x&&x.wali===me};
async function tabHal(p){if(p!==tabP&&!await jagaTanya(['tabungan'])){renderV();return}tabP=p;if(p!=='rek'&&tabK==='*'){tabK='';tabS=0;tabRw=[]}tabRekD=null;renderV();if(p==='rek')tabMuatRek()}
async function tabPilihK(v){if(v!==tabK&&!await jagaTanya(['tabungan'])){renderV();return}tabK=v;tabS=0;tabRw=[];tabRekD=null;renderV();if(tabP==='rek'&&v)tabMuatRek()}
async function tabPilihS(v){if((Number(v)||0)!==tabS&&!await jagaTanya(['tabungan'])){renderV();return}tabS=Number(v)||0;guard(async()=>{await tabMuatRw();renderV()})}
function tabSetBln(v){if(!/^\d{4}-\d{2}$/.test(v||''))return;tabBln=v;tabRekD=null;renderV();tabMuatRek()}
async function tabMuatRw(){tabRw=tabS?(await dbq(db.from('tabungan_transaksi').select('*').eq('siswa_id',tabS).order('id',{ascending:true}).limit(5000)))||[]:[]}
async function tabRekRaw(){const sem=tabK==='*',kx=n=>{const i=S.kelas.findIndex(k=>k.nama===n);return i<0?999:i},ids=(sem?S.tab.filter(r=>Number(r.saldo)!==0||r.aktif).slice().sort((a,b)=>kx(a.kelas_nama)-kx(b.kelas_nama)||String(a.nama).localeCompare(String(b.nama),'id')):S.tab.filter(r=>r.kelas_nama===tabK)).map(r=>r.siswa_id);if(!ids.length){tabRekD=[];return}
 const y=+tabBln.slice(0,4),m=+tabBln.slice(5,7),aw=tabBln+'-01',ak=tabBln+'-'+String(new Date(y,m,0).getDate()).padStart(2,'0'),all=[];
 for(let a=0;a<50000;a+=1000){const p=await dbq(db.from('tabungan_transaksi').select('*').in('siswa_id',ids).lte('tanggal',ak).order('id',{ascending:true}).range(a,a+999));all.push(...p);if(p.length<1000)break}
 const net=l=>l.reduce((a,x)=>a+(x.jenis==='setor'?1:-1)*Number(x.jumlah),0),sum=(l,j)=>l.filter(x=>x.jenis===j).reduce((a,x)=>a+Number(x.jumlah),0);
 tabRekD=ids.map(id=>{const t=all.filter(x=>x.siswa_id===id),bl=t.filter(x=>x.tanggal>=aw),awl=net(t.filter(x=>x.tanggal<aw));return{r:S.tab.find(x=>x.siswa_id===id),bl,awal:awl,masuk:sum(bl,'setor'),keluar:sum(bl,'tarik'),akhir:awl+net(bl)}})}
function tabMuatRek(){if(!tabK)return;guard(async()=>{await tabRekRaw();renderV()})}
const tabCmp=(a,b)=>a.tanggal!==b.tanggal?(a.tanggal<b.tanggal?-1:1):(a.dibuat!==b.dibuat?(a.dibuat<b.dibuat?-1:1):a.id-b.id);
const tabBarisAsc=rw=>{let s=0;return rw.slice().sort(tabCmp).map(x=>{const m=x.jenis==='setor'?Number(x.jumlah):'',k=x.jenis==='tarik'?Number(x.jumlah):'';s+=(m||0)-(k||0);return{x,m,k,s}})};
