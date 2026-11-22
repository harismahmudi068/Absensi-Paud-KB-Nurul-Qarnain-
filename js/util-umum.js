const $=s=>document.querySelector(s),esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function enhanceSecretInputs(root=document){
  const eye=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>`;
  const eyeOff=`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 3 18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.5 0 10 7 10 7a18.2 18.2 0 0 1-3 3.9M6.2 6.2C3.5 8.1 2 12 2 12s3.5 7 10 7a10.8 10.8 0 0 0 4.1-.8"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>`;
  root.querySelectorAll('input[type="password"]:not([data-eye-ready])').forEach(input=>{
    input.setAttribute('data-eye-ready','1');
    const wrap=document.createElement('div');
    wrap.className='secret-wrap';
    input.parentNode.insertBefore(wrap,input);
    wrap.appendChild(input);
    const btn=document.createElement('button');
    btn.type='button';
    btn.className='secret-toggle nobusy';
    btn.setAttribute('aria-label','Tampilkan sandi');
    btn.setAttribute('title','Tampilkan sandi');
    btn.innerHTML=eye;
    const toggleSandi=()=>{
      const show=input.type==='password';
      input.type=show?'text':'password';
      btn.innerHTML=show?eyeOff:eye;
      btn.setAttribute('aria-label',show?'Sembunyikan sandi':'Tampilkan sandi');
      btn.setAttribute('title',show?'Sembunyikan sandi':'Tampilkan sandi');
      input.focus({preventScroll:true});
    };
    btn.addEventListener('pointerdown',e=>{
      if(e.button!==undefined && e.button!==0)return;
      e.preventDefault();
      toggleSandi();
    });
    btn.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key===' '){
        e.preventDefault();
        toggleSandi();
      }
    });
    wrap.appendChild(btn);
  });
}

enhanceSecretInputs(document);
const _secretObserver=new MutationObserver(m=>{for(const x of m){for(const n of x.addedNodes){if(n.nodeType===1)enhanceSecretInputs(n)}}});
_secretObserver.observe(document.body,{childList:true,subtree:true});
