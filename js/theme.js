/* Tema aplikasi.
   - Mode terang/gelap : atribut data-tema  (tombol matahari/bulan di header, tmToggle)
   - Pilihan tema      : atribut data-warna (hijau | biru | ungu), tombol palet di header
   - Setiap tema punya satu file sendiri di css/tema/ (warna + font + gaya tampilan):
       hijau.css  = tema bawaan (tidak menimpa apa pun)
       biru.css   = tema Biru  ("Rapi")
       ungu.css   = tema Ungu  ("Ceria")
     File bersama: pemilih.css (kotak pemilih, selalu dimuat) dan penyesuaian.css (untuk biru/ungu).
   - Hanya file tema yang dipilih yang dimuat. Pilihan disimpan di perangkat (localStorage: tema_ui, warna_ui).
   - Halaman portal siswa (/p/... atau portal.html) tidak ikut pilihan tema.
   - Untuk menambah tema: buat css/tema/<nama>.css, lalu tambahkan <nama> di WARNA dan URUT di bawah.
   - Warna bilah browser HP (bar) harus sama dengan --hdrbg di file tema masing-masing. */
(function(){
  var K='tema_ui',KW='warna_ui',V='?v=20261125b',DIR='/css/tema/';
  var root=document.documentElement;
  var WARNA={
    hijau:{nama:'Hijau',a:'#15803D',b:'#166534',bar:{terang:'#166534',gelap:'#0F3D24'}},
    biru:{nama:'Biru',a:'#1D4ED8',b:'#1E3A8A',bar:{terang:'#1E3A8A',gelap:'#12274D'}},
    ungu:{nama:'Ungu',a:'#6D3FD6',b:'#4C2A9A',bar:{terang:'#4C2A9A',gelap:'#2F1B63'}}
  };
  var URUT=['hijau','biru','ungu'];
  var portal=/^\/p\//.test(location.pathname)||/portal/i.test(location.pathname);

  function baca(k,d){try{return localStorage.getItem(k)||d}catch(e){return d}}
  function simpan(k,v){try{localStorage.setItem(k,v)}catch(e){}}
  function mode(){return root.getAttribute('data-tema')==='gelap'?'gelap':'terang'}
  function warna(){var w=root.getAttribute('data-warna');return WARNA[w]?w:'hijau'}
  function bar(){var m=document.querySelector('meta[name=theme-color]');if(m)m.setAttribute('content',WARNA[warna()].bar[mode()])}
  function apMode(t){
    root.setAttribute('data-tema',t);bar();
    var b=document.getElementById('tmBtn');if(b)b.setAttribute('aria-pressed',t==='gelap'?'true':'false');
  }
  function apWarna(w){if(!WARNA[w])w='hijau';root.setAttribute('data-warna',w);bar()}

  /* muat awal: file ditulis langsung ke <head> supaya tampilan tidak berkedip */
  function tulisCss(id,file){
    var href=DIR+file+V;
    if(document.readyState==='loading'){
      try{document.write('<link rel="stylesheet" id="'+id+'" href="'+href+'">');return}catch(e){}
    }
    var l=document.createElement('link');l.rel='stylesheet';l.id=id;l.href=href;document.head.appendChild(l);
  }

  /* ganti tema saat aplikasi berjalan: muat file tema baru dulu, baru atribut diganti (tanpa kedip) */
  function pasang(k,sesudah){
    var perlu=[];
    if(k!=='hijau'&&!document.getElementById('css-penyesuaian'))perlu.push(['css-penyesuaian','penyesuaian.css']);
    if(!document.getElementById('css-tema-'+k))perlu.push(['css-tema-'+k,k+'.css']);
    if(!perlu.length){sesudah();return}
    var sisa=perlu.length,selesai=false;
    function akhir(){if(!selesai){selesai=true;sesudah()}}
    function satu(){if(--sisa<=0)akhir()}
    perlu.forEach(function(p){
      var l=document.createElement('link');l.rel='stylesheet';l.id=p[0];l.href=DIR+p[1]+V;
      l.onload=satu;l.onerror=satu;document.head.appendChild(l);
    });
    setTimeout(akhir,2500);
  }

  apMode(baca(K,'terang')==='gelap'?'gelap':'terang');
  if(!portal){
    var w0=baca(KW,'hijau');if(!WARNA[w0])w0='hijau';
    apWarna(w0);
    tulisCss('css-pemilih','pemilih.css');
    if(w0!=='hijau')tulisCss('css-penyesuaian','penyesuaian.css');
    tulisCss('css-tema-'+w0,w0+'.css');
  }

  window.tmToggle=function(){var n=mode()==='gelap'?'terang':'gelap';apMode(n);simpan(K,n)};

  var IKON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.8-.8 1.8-1.7 0-.5-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.8-1.6 1.7-1.6H17a4 4 0 0 0 4-4c0-4.4-4-8.5-9-8.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/></svg>';

  function bangunPemilih(){
    var tm=document.getElementById('tmBtn');
    if(!tm||!tm.parentNode||document.getElementById('warnaBtn'))return;
    var btn=document.createElement('button');
    btn.type='button';btn.id='warnaBtn';btn.className='wrn';btn.title='Tema tampilan';
    btn.setAttribute('aria-label','Pilih tema tampilan');
    btn.setAttribute('aria-haspopup','true');
    btn.setAttribute('aria-expanded','false');
    btn.innerHTML=IKON;
    tm.parentNode.insertBefore(btn,tm);

    var bd=document.createElement('div');bd.id='wrnbd';
    var pop=document.createElement('div');pop.id='wrnpop';
    pop.setAttribute('role','radiogroup');pop.setAttribute('aria-label','Tema tampilan');
    var jd=document.createElement('div');jd.className='wrn-t';jd.textContent='Tema tampilan';pop.appendChild(jd);

    var opsi={};
    URUT.forEach(function(k){
      var o=document.createElement('button');
      o.type='button';o.className='wrn-o';o.setAttribute('role','radio');
      var s=document.createElement('i');s.className='wrn-s';
      s.style.background='linear-gradient(135deg,'+WARNA[k].a+' 50%,'+WARNA[k].b+' 50%)';
      var n=document.createElement('span');n.textContent=WARNA[k].nama;
      var c=document.createElement('span');c.className='wrn-c';c.textContent='\u2713';
      o.appendChild(s);o.appendChild(n);o.appendChild(c);
      o.addEventListener('click',function(){
        tutup();
        pasang(k,function(){apWarna(k);simpan(KW,k);tandai()});
      });
      pop.appendChild(o);opsi[k]=o;
    });
    bd.appendChild(pop);document.body.appendChild(bd);

    function tandai(){URUT.forEach(function(k){opsi[k].setAttribute('aria-checked',k===warna()?'true':'false')})}
    function buka(){tandai();bd.classList.add('show');btn.setAttribute('aria-expanded','true')}
    function tutup(){bd.classList.remove('show');btn.setAttribute('aria-expanded','false')}
    btn.addEventListener('click',function(){bd.classList.contains('show')?tutup():buka()});
    bd.addEventListener('click',function(e){if(e.target===bd)tutup()});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&bd.classList.contains('show')){tutup();btn.focus()}});
  }

  document.addEventListener('DOMContentLoaded',function(){
    apMode(mode());
    if(!portal)bangunPemilih();
  });
})();
