
/* menu: samping (tombol ☰ / geser dari tepi kiri) dan lembar bawah (tombol Menu / geser naik pada bar bawah) */
(function(){
 var d=document.getElementById('drw');if(!d)return;var m=d.querySelector('.modal');if(!m)return;
 var mb=d.querySelector('.mbody'),mq=window.matchMedia('(max-width:760px)');
 var _drw=window.drw;
 window.drw=function(o,side){
  if(o){bersih();d.classList.toggle('side',!!side)}
  _drw(o);
  if(!o)setTimeout(function(){if(!d.classList.contains('show'))d.classList.remove('side')},340);
 };
 var x0=0,y0=0,dx=0,dy=0,t0=0,on=false,lock=0,ver=false;
 function bersih(){m.style.animation='';m.style.transition='';m.style.transform='';d.style.transition='';d.style.opacity=''}
 d.addEventListener('touchstart',function(e){
  if(!d.classList.contains('show')||d.classList.contains('closing')||e.touches.length!==1)return;
  var t=e.touches[0];x0=t.clientX;y0=t.clientY;dx=0;dy=0;t0=Date.now();on=true;lock=0;
  ver=mq.matches&&!d.classList.contains('side')},{passive:true});
 d.addEventListener('touchmove',function(e){
  if(!on)return;var t=e.touches[0],ax=t.clientX-x0,ay=t.clientY-y0;
  if(!lock){if(Math.abs(ax)<8&&Math.abs(ay)<8)return;
   if(ver)lock=(ay>0&&Math.abs(ay)>Math.abs(ax)*1.2&&(!mb||mb.scrollTop<=0))?1:2;
   else lock=(ax<0&&Math.abs(ax)>Math.abs(ay)*1.2)?1:2;
   if(lock===1){m.style.animation='none';m.style.transition='none'}}
  if(lock!==1)return;
  if(e.cancelable)e.preventDefault();
  if(ver){dy=Math.max(0,ay);m.style.transform='translateY('+dy+'px)'}
  else{dx=Math.min(0,ax);m.style.transform='translateX('+dx+'px)'}},{passive:false});
 function akhir(){
  if(!on)return;on=false;if(lock!==1)return;
  var j=ver?(m.offsetHeight||400):(m.offsetWidth||300),g=ver?dy:-dx,cepat=g/Math.max(1,Date.now()-t0)>0.5;
  m.style.transition='transform .22s ease';
  if(g>j*0.28||(cepat&&g>30)){
   m.style.transform=ver?'translateY(100%)':'translateX(-100%)';d.style.transition='opacity .22s ease';d.style.opacity='0';
   setTimeout(function(){d.classList.remove('show','closing','side');bersih()},230);
  }else{m.style.transform=ver?'translateY(0)':'translateX(0)';setTimeout(function(){m.style.transition='';m.style.transform=''},230)}
 }
 d.addEventListener('touchend',akhir,{passive:true});
 d.addEventListener('touchcancel',akhir,{passive:true});

 /* buka menu samping: geser ke kanan dari tepi kiri layar */
 var ex=0,ey=0,eon=false;
 function bisaBuka(){
  var ap=document.getElementById('ap');
  return mq.matches&&ap&&!ap.classList.contains('hid')&&!document.querySelector('.mb.show');
 }
 document.addEventListener('touchstart',function(e){
  eon=false;if(e.touches.length!==1)return;var t=e.touches[0];
  if(t.clientX>28||!bisaBuka())return;
  ex=t.clientX;ey=t.clientY;eon=true},{passive:true});
 document.addEventListener('touchmove',function(e){
  if(!eon)return;var t=e.touches[0],ax=t.clientX-ex,ay=t.clientY-ey;
  if(Math.abs(ay)>Math.abs(ax)*1.2&&Math.abs(ay)>14){eon=false;return}
  if(ax>44&&Math.abs(ax)>Math.abs(ay)*1.5){eon=false;if(e.cancelable)e.preventDefault();window.drw(1,1)}},{passive:false});
 document.addEventListener('touchend',function(){eon=false},{passive:true});
 document.addEventListener('touchcancel',function(){eon=false},{passive:true});

 /* buka lembar bawah: geser ke atas pada bar bawah */
 var bn=document.getElementById('bn');
 if(bn){var bx=0,by=0,bon=false;
  bn.addEventListener('touchstart',function(e){
   if(e.touches.length!==1||!mq.matches||d.classList.contains('show')){bon=false;return}
   bx=e.touches[0].clientX;by=e.touches[0].clientY;bon=true},{passive:true});
  bn.addEventListener('touchmove',function(e){
   if(!bon)return;var ay=e.touches[0].clientY-by,ax=e.touches[0].clientX-bx;
   if(ay<-36&&Math.abs(ay)>Math.abs(ax)*1.5){bon=false;if(e.cancelable)e.preventDefault();window.drw(1)}},{passive:false});
  bn.addEventListener('touchend',function(){bon=false},{passive:true});
  bn.addEventListener('touchcancel',function(){bon=false},{passive:true});
 }
 /* pengait: penanda awal gestur (samping & bawah) */
 var hs=document.createElement('div');hs.id='hkS';hs.innerHTML='<i></i>';hs.setAttribute('aria-label','Buka menu samping');hs.onclick=function(){window.drw(1,1)};
 var hb=document.createElement('div');hb.id='hkB';hb.innerHTML='<i class="a"></i><i class="b"></i>';hb.setAttribute('aria-label','Buka menu bawah');hb.onclick=function(){window.drw(1)};
 document.body.appendChild(hs);document.body.appendChild(hb);
 var rq=0;
 function sinkron(){
  rq=0;var ap=document.getElementById('ap'),ok=!!(mq.matches&&ap&&!ap.classList.contains('hid')&&!document.querySelector('.mb.show'));
  var bar=!!(bn&&!bn.classList.contains('hid'));
  hs.classList.toggle('on',ok);hb.classList.toggle('on',ok&&bar);
  hb.classList.toggle('tg',!!(bn&&bn.querySelector('button[onclick*=scan]')));
 }
 new MutationObserver(function(){if(!rq)rq=requestAnimationFrame(sinkron)}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
 if(mq.addEventListener)mq.addEventListener('change',sinkron);
 sinkron();
 (function(){var gx=0,gy=0,gon=false;
  hb.addEventListener('touchstart',function(e){if(e.touches.length!==1){gon=false;return}gx=e.touches[0].clientX;gy=e.touches[0].clientY;gon=true},{passive:true});
  hb.addEventListener('touchmove',function(e){if(!gon)return;var ay=e.touches[0].clientY-gy,ax=e.touches[0].clientX-gx;
   if(ay<-24&&Math.abs(ay)>Math.abs(ax)*1.5){gon=false;if(e.cancelable)e.preventDefault();window.drw(1)}},{passive:false});
  hb.addEventListener('touchend',function(){gon=false},{passive:true});
 })();
})();
