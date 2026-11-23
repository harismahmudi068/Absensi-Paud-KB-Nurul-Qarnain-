function enhanceCustomSelects(root=document){
 if(!window.__cselScrollHandler){let raf=0;const repos=()=>{raf=0;document.querySelectorAll('.csel.open').forEach(w=>{if(typeof w._cselReposisi==='function')w._cselReposisi()})};const jadwal=()=>{if(!raf)raf=requestAnimationFrame(repos)};window.addEventListener('scroll',jadwal,{capture:true,passive:true});window.addEventListener('resize',jadwal,{passive:true});window.__cselScrollHandler=true}
 const daftar=[];if(root.matches&&root.matches('select'))daftar.push(root);root.querySelectorAll('select:not([data-csel-ready])').forEach(sel=>daftar.push(sel));
  daftar.filter(sel=>!sel.dataset.cselReady).forEach(sel=>{
  sel.classList.add('select');sel.dataset.cselReady='1';
  const wrap=document.createElement('div');wrap.className='csel';
  const btn=document.createElement('button');btn.type='button';btn.className='csel-btn';btn.setAttribute('aria-disabled',sel.disabled?'true':'false');
  const txt=document.createElement('span'),arr=document.createElement('span');arr.className='csel-arrow';arr.textContent='▼';btn.append(txt,arr);
  const pop=document.createElement('div');pop.className='csel-pop';
  const search=document.createElement('input');search.type='text';search.className='csel-search';search.placeholder='Cari pilihan...';
  pop.appendChild(search);
  const list=document.createElement('div');pop.appendChild(list);
  sel.parentNode.insertBefore(wrap,sel);wrap.appendChild(sel);wrap.appendChild(btn);wrap.appendChild(pop);sel.classList.add('native-hidden');
  const rebuild=()=>{
   txt.textContent=sel.options[sel.selectedIndex]?.textContent||'Pilih kelas';
   list.innerHTML='';
   [...sel.options].forEach((o,i)=>{const b=document.createElement('button');b.type='button';b.disabled=!!o.disabled;b.className='csel-opt'+(o.selected?' sel':'');b.dataset.search=o.textContent.toLowerCase();b.textContent=o.textContent;b.onclick=()=>{sel.selectedIndex=i;sel.dispatchEvent(new Event('change',{bubbles:true}));wrap.classList.remove('open','up');pop.classList.remove('csel-fixed');pop.style.left=pop.style.width=pop.style.top=pop.style.bottom=pop.style.right='';search.value='';filter();};list.appendChild(b)});
  };
  const filter=()=>{const q=search.value.toLowerCase().trim();let n=0;list.querySelectorAll('.csel-opt').forEach(b=>{const ok=!q||b.dataset.search.includes(q);b.style.display=ok?'block':'none';if(ok)n++});let em=list.querySelector('.csel-empty');if(!n){if(!em){em=document.createElement('div');em.className='csel-empty';em.textContent='Tidak ditemukan';list.appendChild(em)}}else if(em)em.remove()};
  const posisikanPop=()=>{
   if(!wrap.classList.contains('open'))return;
   const r=btn.getBoundingClientRect();
   pop.classList.add('csel-fixed');
   pop.style.left=Math.max(8,r.left)+'px';
   pop.style.width=Math.max(220,r.width)+'px';
   pop.style.right='auto';
   pop.style.maxHeight='320px';
   pop.style.top=Math.min(window.innerHeight-20,r.bottom+7)+'px';
   pop.style.bottom='auto';
   const ph=pop.getBoundingClientRect().height;
   const ruangBawah=window.innerHeight-r.bottom-12;
   const ruangAtas=r.top-12;
   if(ruangBawah<ph && ruangAtas>ruangBawah){
    pop.style.top='auto';
    pop.style.bottom=Math.max(8,window.innerHeight-r.top+7)+'px';
   }
  };
  wrap._cselReposisi=posisikanPop;
  const tutupPop=()=>{
   wrap.classList.remove('open','up');
   pop.classList.remove('csel-fixed');
   pop.style.left=pop.style.width=pop.style.top=pop.style.bottom=pop.style.right='';
  };
  btn.onclick=e=>{
   e.stopPropagation();if(sel.disabled)return;
   document.querySelectorAll('.csel.open').forEach(x=>{
    if(x!==wrap){
     x.classList.remove('open','up');
     const pp=x.querySelector('.csel-pop');
     if(pp){pp.classList.remove('csel-fixed');pp.style.left=pp.style.width=pp.style.top=pp.style.bottom=pp.style.right='';}
    }
   });
   if(wrap.classList.contains('open'))tutupPop();
   else{wrap.classList.add('open');requestAnimationFrame(posisikanPop);}
   if(wrap.classList.contains('open'))setTimeout(()=>search.focus(),0);
  };
  search.oninput=filter;
  sel.addEventListener('change',rebuild);
  const optObs=new MutationObserver(()=>{rebuild();btn.setAttribute('aria-disabled',sel.disabled?'true':'false')});optObs.observe(sel,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['disabled','selected']});
  rebuild();
 });
}
function cpick(id,label,value,items,onpick,placeholder){const val=String(value||'');const found=items.find(x=>String(x.value)===val);return `<div class="cpick" id="${id}"><button type="button" class="cpick-btn" onclick="toggleCPick('${id}')"><span>${esc(found?found.label:(placeholder||'Pilih kelas'))}</span><span class="arrow">▼</span></button><div class="cpick-pop"><input class="cpick-search" placeholder="Cari ${esc(label.toLowerCase())}..." oninput="filterCPick('${id}',this.value)">${items.map(x=>`<button type="button" class="cpick-opt ${String(x.value)===val?'sel':''}" data-search="${esc(String(x.label).toLowerCase())}" onclick="${onpick}(decodeURIComponent('${encodeURIComponent(String(x.value))}'))">${esc(x.label)}</button>`).join('')||'<div class="cpick-empty">Tidak ada pilihan</div>'}</div></div>`}
function toggleCPick(id){document.querySelectorAll('.cpick.open').forEach(x=>{if(x.id!==id)x.classList.remove('open')});const e=$('#'+id);if(!e)return;e.classList.toggle('open');if(e.classList.contains('open')){const q=e.querySelector('.cpick-search');if(q)setTimeout(()=>q.focus(),0)}}
function filterCPick(id,q){const e=$('#'+id);if(!e)return;const z=String(q||'').toLowerCase().trim();let n=0;e.querySelectorAll('.cpick-opt').forEach(b=>{const ok=!z||String(b.dataset.search||'').includes(z);b.style.display=ok?'block':'none';if(ok)n++});let em=e.querySelector('.cpick-empty-filter');if(!n){if(!em){em=document.createElement('div');em.className='cpick-empty cpick-empty-filter';em.textContent='Tidak ditemukan';e.querySelector('.cpick-pop').appendChild(em)}}else if(em)em.remove()}
document.addEventListener('click',e=>{if(!e.target.closest('.cpick'))document.querySelectorAll('.cpick.open').forEach(x=>x.classList.remove('open'));if(!e.target.closest('.csel'))document.querySelectorAll('.csel.open').forEach(x=>{x.classList.remove('open','up');const p=x.querySelector('.csel-pop');if(p){p.classList.remove('csel-fixed');p.style.left=p.style.width=p.style.top=p.style.bottom=p.style.right=''}})});
(function(){const pasang=()=>['v','mbd'].forEach(id=>{const root=document.getElementById(id);if(!root||root._cselAutoObs)return;root._cselAutoObs=new MutationObserver(records=>{const added=[];records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType!==1)return;if((n.matches&&n.matches('select'))||(n.querySelector&&n.querySelector('select')))added.push(n)}));if(added.length)queueMicrotask(()=>added.forEach(n=>enhanceCustomSelects(n)))});root._cselAutoObs.observe(root,{childList:true,subtree:true})});pasang();document.addEventListener('DOMContentLoaded',pasang)})();
