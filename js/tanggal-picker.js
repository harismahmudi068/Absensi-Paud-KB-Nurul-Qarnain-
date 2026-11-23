const BLN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'],HR=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
const hariIni=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'Asia/Jakarta'}),jamJkt=iso=>iso?new Date(iso).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Jakarta'}):'';
let TODAY=hariIni();const ST=['Hadir','Terlambat','Izin','Sakit','Alpa'],cap=s=>s.charAt(0).toUpperCase()+s.slice(1),low=s=>s.toLowerCase();
const fmt=d=>{if(!d)return '';const p=d.split('-');return +p[2]+' '+BLN[p[1]-1]+' '+p[0]},fmtB=b=>{const p=b.split('-');return BLN[p[1]-1]+' '+p[0]},wd=d=>new Date(d+'T00:00:00').getDay();
/* ---------- picker tanggal/bulan/tahun custom ---------- */
const TPI='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>';
const tpLabel=(t,v,ph)=>v?(t==='hour'?tpP(parseInt(v,10))+' : 00':t==='time'?v:t==='month'?fmtB(v):t==='year'?v:fmt(v)):(ph||(t==='time'||t==='hour'?'Pilih jam':t==='month'?'Pilih bulan':t==='year'?'Pilih tahun':'Pilih tanggal'));
const dt=(type,v,fn,cl='',o={})=>`<div class="tp ${cl}" data-t="${type}"${o.min?` data-min="${o.min}"`:''}${o.max?` data-max="${o.max}"`:''}${o.hmin!=null?` data-hmin="${o.hmin}"`:''}${o.hmax!=null?` data-hmax="${o.hmax}"`:''}${o.kosong?' data-kosong="1"':''}${o.ref?` data-ref="${o.ref}"`:''}${o.ph?` data-ph="${esc(o.ph)}"`:''}><button type="button" class="input tp-btn" onclick="tpBuka(this.parentNode)"><span class="tp-t">${esc(tpLabel(type,v,o.ph))}</span><span class="tp-i">${TPI}</span></button><input type="hidden"${o.id?` id="${o.id}"`:''} value="${v||''}" onchange="${fn||''}"></div>`;
let TP=null;
const tpP=n=>String(n).padStart(2,'0');
function tpEls(){let b=document.getElementById('tpbd');if(!b){b=document.createElement('div');b.id='tpbd';b.onclick=()=>tpTutup();document.body.appendChild(b);const p=document.createElement('div');p.id='tpop';p.setAttribute('role','dialog');p.setAttribute('aria-label','Pilih tanggal');document.body.appendChild(p)}return [b,document.getElementById('tpop')]}
function tpBuka(w){if(TP&&TP.w===w)return tpTutup();tpTutup();const inp=w.querySelector('input[type=hidden]'),t=w.dataset.t||'date',min=w.dataset.min||'2000-01-01',max=w.dataset.max||'2099-12-31',v=inp.value||'';
 let ref=v?(t==='month'?v+'-01':t==='year'?v+'-01-01':v):(w.dataset.ref||TODAY);if(ref<min)ref=min;if(ref>max)ref=max;
 TP={w,inp,t,min,max,v,y:+ref.slice(0,4),m:+ref.slice(5,7)-1,hh:v&&(t==='time'||t==='hour')?parseInt(v.slice(0,2),10)||0:7,mm:v&&t==='time'?+v.slice(3,5):0,hmin:w.dataset.hmin==null?0:parseInt(w.dataset.hmin,10),hmax:w.dataset.hmax==null?23:parseInt(w.dataset.hmax,10),vw:t==='year'?'y':t==='month'?'m':'d',kosong:!!w.dataset.kosong};w.classList.add('open');tpDraw()}
function tpTutup(){const w=TP&&TP.w;TP=null;if(w)w.classList.remove('open');const b=document.getElementById('tpbd'),p=document.getElementById('tpop');if(b)b.classList.remove('show');if(p)p.classList.remove('show')}
function tpLib(d){try{if(S.nasMap&&S.nasMap.has(d))return S.nasMap.get(d);const l=S.libur.find(x=>x.tgl<=d&&d<=(x.sampai||x.tgl)&&!x.kelas);return l?(l.ket||'Libur'):''}catch(e){return ''}}
function tpHtml(){const T=TP,y=T.y,m=T.m,mn=T.min,mx=T.max;let h='';
 if(T.t==='time'||T.t==='hour'){
 const jam=[];for(let i=T.hmin;i<=T.hmax;i++)jam.push(i);
 const roda=(id,label,vals,field)=>'<div class="tp-wheel-col"><div class="tp-wheel-label">'+label+'</div><div class="tp-wheel-frame"><div class="tp-wheel" id="'+id+'" onscroll="tpWheelScroll(this,\''+field+'\')"><div class="tp-wheel-spacer"></div>'+vals.map(i=>'<button type="button" class="tp-wheel-item" data-v="'+i+'" onclick="tpWheelPick(\''+field+'\','+i+',this.parentNode)">'+tpP(i)+'</button>').join('')+'<div class="tp-wheel-spacer"></div></div><div class="tp-wheel-marker" aria-hidden="true"></div></div></div>';
 h+='<div class="tp-wheel-wrap'+(T.t==='hour'?' single':'')+'">'+roda('tpWheelHour','Jam',jam,'hh')+(T.t==='time'?roda('tpWheelMinute','Menit',Array.from({length:60},(_,i)=>i),'mm'):'')+'</div>';
 h+='<div class="tp-f"><button type="button" class="x" onclick="tpTutup()">Tutup</button><button type="button" onclick="tpPilihJam()">Pilih jam</button></div>';return h}
 const nav=(dis1,dis2,judul,vw)=>`<div class="tp-h"><button type="button" class="tp-n" ${dis1?'disabled':''} onclick="tpGeser(-1)" aria-label="Sebelumnya">‹</button><button type="button" class="tp-j" ${vw?`onclick="tpView('${vw}')"`:'disabled'}>${judul}</button><button type="button" class="tp-n" ${dis2?'disabled':''} onclick="tpGeser(1)" aria-label="Berikutnya">›</button></div>`;
 if(T.vw==='d'){
  const off=(new Date(y,m,1).getDay()+6)%7,dim=new Date(y,m+1,0).getDate(),ming=(S.mingguan&&S.mingguan.length)?S.mingguan:[0],pm=y+'-'+tpP(m+1),prev=m===0?(y-1)+'-12':y+'-'+tpP(m),next=m===11?(y+1)+'-01':y+'-'+tpP(m+2);
  h+=nav(prev<mn.slice(0,7),next>mx.slice(0,7),BLN[m]+' '+y,'m');
  h+='<div class="tp-w">'+['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map((n,i)=>`<span class="${ming.includes((i+1)%7)?'m':''}">${n}</span>`).join('')+'</div><div class="tp-g">'+'<span></span>'.repeat(off);
  for(let d=1;d<=dim;d++){const iso=pm+'-'+tpP(d),dow=(off+d)%7,lb=tpLib(iso),c=['tp-d'];if(ming.includes(dow))c.push('m');if(iso===TODAY)c.push('t');if(lb)c.push('lb');if(iso===T.v)c.push('s');
   h+=`<button type="button" class="${c.join(' ')}" ${iso<mn||iso>mx?'disabled':''} ${lb?`title="${esc(lb)}"`:''} onclick="tpPilih('${iso}')">${d}</button>`}
  h+='</div>'}
 else if(T.vw==='m'){
  h+=nav(y-1<+mn.slice(0,4),y+1>+mx.slice(0,4),String(y),'y')+'<div class="tp-gm">';
  for(let i=0;i<12;i++){const pf=y+'-'+tpP(i+1),c=['tp-d'];if(pf===TODAY.slice(0,7))c.push('t');if((T.t==='month'&&pf===T.v)||(T.t==='date'&&i===T.m&&T.v&&T.v.slice(0,4)==String(y)))c.push('s');
   h+=`<button type="button" class="${c.join(' ')}" ${pf<mn.slice(0,7)||pf>mx.slice(0,7)?'disabled':''} onclick="tpBulan(${i})">${BLN[i].slice(0,3)}</button>`}
  h+='</div>'}
 else{
  const y0=2000+Math.floor((y-2000)/12)*12;
  h+=nav(y0-1<+mn.slice(0,4),y0+12>+mx.slice(0,4),y0+' – '+(y0+11),'')+'<div class="tp-gm">';
  for(let i=0;i<12;i++){const yy=y0+i,c=['tp-d'];if(yy===+TODAY.slice(0,4))c.push('t');if((T.t==='year'&&String(yy)===T.v)||(T.t!=='year'&&yy===y&&T.v&&T.v.slice(0,4)==String(yy)))c.push('s');
   h+=`<button type="button" class="${c.join(' ')}" ${yy<+mn.slice(0,4)||yy>+mx.slice(0,4)?'disabled':''} onclick="tpTahun(${yy})">${yy}</button>`}
  h+='</div>'}
 const nowV=T.t==='month'?TODAY.slice(0,7):T.t==='year'?TODAY.slice(0,4):TODAY,len=nowV.length,okNow=nowV>=mn.slice(0,len)&&nowV<=mx.slice(0,len);
 h+='<div class="tp-f">'+(okNow?`<button type="button" onclick="tpPilih('${nowV}')">${T.t==='month'?'Bulan ini':T.t==='year'?'Tahun ini':'Hari ini'}</button>`:'')+(T.kosong&&T.v?'<button type="button" onclick="tpPilih(\'\')">Kosongkan</button>':'')+'<button type="button" class="x" onclick="tpTutup()">Tutup</button></div>';
 return h}
function tpDraw(){if(!TP)return;if(!document.body.contains(TP.w))return tpTutup();const [b,p]=tpEls();p.innerHTML=tpHtml();b.classList.add('show');p.classList.add('show');if(TP.t==='time'||TP.t==='hour')tpWheelInit(p);tpPos()}
function tpPos(){const T=TP,p=document.getElementById('tpop');if(!T||!p)return;if(innerWidth<=640){p.style.left='';p.style.top='';return}
 const r=T.w.getBoundingClientRect(),w=p.offsetWidth,h=p.offsetHeight;let left=Math.min(Math.max(8,r.left+r.width/2-w/2),innerWidth-w-8),top=r.bottom+8;if(top+h>innerHeight-8)top=Math.max(8,r.top-h-8);p.style.left=left+'px';p.style.top=top+'px'}
function tpGeser(n){const T=TP;if(!T)return;if(T.vw==='d'){T.m+=n;if(T.m<0){T.m=11;T.y--}if(T.m>11){T.m=0;T.y++}}else if(T.vw==='m')T.y+=n;else T.y+=12*n;tpDraw()}
function tpView(v){if(!TP)return;TP.vw=v;tpDraw()}
function tpBulan(i){const T=TP;if(!T)return;if(T.t==='month')return tpPilih(T.y+'-'+tpP(i+1));T.m=i;T.vw='d';tpDraw()}
function tpTahun(yy){const T=TP;if(!T)return;if(T.t==='year')return tpPilih(String(yy));T.y=yy;T.vw='m';tpDraw()}
function tpWheelMark(el,v){el.querySelectorAll('.tp-wheel-item').forEach(b=>b.classList.toggle('selected',Number(b.dataset.v)===v))}function tpWheelInit(p){[['tpWheelHour',TP.hh,TP.hmin],['tpWheelMinute',TP.mm,0]].forEach(([id,val,min])=>{const el=p.querySelector('#'+id);if(el){el.scrollTop=(val-min)*44;tpWheelMark(el,val)}})}function tpWheelScroll(el,field){if(!TP)return;const min=field==='hh'?TP.hmin:0,max=field==='hh'?TP.hmax:59,idx=Math.max(0,Math.min(max-min,Math.round(el.scrollTop/44))),v=min+idx;TP[field]=v;tpWheelMark(el,v)}function tpWheelPick(field,v,el){if(!TP)return;const idx=field==='hh'?v-TP.hmin:v;el.scrollTo({top:idx*44,behavior:'smooth'});TP[field]=v;tpWheelMark(el,v)}function tpPilihJam(){const T=TP;if(!T)return;const nilai=tpP(T.hh)+(T.t==='time'?':'+tpP(T.mm):'');tpPilih(nilai)}function tpPilih(v){const T=TP;if(!T)return;const ada=document.body.contains(T.w);if(ada){T.inp.value=v;T.w.querySelector('.tp-t').textContent=tpLabel(T.t,v,T.w.dataset.ph)}const inp=T.inp;tpTutup();if(ada)inp.dispatchEvent(new Event('change',{bubbles:true}))}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&TP)tpTutup()});
window.addEventListener('resize',()=>{if(TP)tpPos()});
window.addEventListener('scroll',e=>{if(TP&&innerWidth>640&&!(e.target&&e.target.nodeType===1&&e.target.closest('#tpop')))tpTutup()},true);
