/* ---------- tab bergulir ke tengah ---------- */
function utabTengah(sl){const c=document.querySelector('#v .utabs');if(!c)return;if(sl)c.scrollLeft=sl;const a=c.querySelector('.utab.on');if(!a)return;requestAnimationFrame(()=>{c.scrollTo({left:Math.max(0,a.offsetLeft-(c.clientWidth-a.offsetWidth)/2),behavior:'smooth'})})}
