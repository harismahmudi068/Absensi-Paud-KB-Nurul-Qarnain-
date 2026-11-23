(function(){var t=0,full=true,pend=new Set(),tk=0;
function ukur(b){if(b.classList.contains('pil-wrap')||!b.offsetParent)return;if(b.scrollWidth>b.clientWidth+2)b.classList.add('pil-wrap')}
function cek(){t=0;if(full){full=false;pend.clear();document.querySelectorAll('.btn').forEach(ukur);return}var a=Array.from(pend);pend.clear();a.forEach(function(b){if(b.isConnected)ukur(b)})}
function jadwal(){if(!t)t=requestAnimationFrame(cek)}
function penuh(){full=true;jadwal()}
function kumpul(n){if(n.matches&&n.matches('.btn'))pend.add(n);else if(n.closest){var c=n.closest('.btn');if(c)pend.add(c)}if(n.querySelectorAll)n.querySelectorAll('.btn').forEach(function(b){pend.add(b)})}
/* hanya tombol yang baru muncul atau berubah labelnya yang diukur; perubahan teks biasa (mis. jam Scan) diabaikan */
new MutationObserver(function(ms){var ada=false;for(var i=0;i<ms.length;i++){var m=ms[i],tg=m.target;
 if(tg&&tg.nodeType===1&&tg.closest){var c=tg.closest('.btn');if(c){pend.add(c);ada=true}}
 for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];if(n.nodeType===1){kumpul(n);ada=true}}}
 if(ada)jadwal()}).observe(document.body,{childList:true,subtree:true});
window.addEventListener('resize',penuh);
document.addEventListener('click',function(){clearTimeout(tk);tk=setTimeout(penuh,150)},true);
jadwal()})();