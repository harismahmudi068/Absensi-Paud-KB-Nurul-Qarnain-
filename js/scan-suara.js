let AC=null;const unlockAC=()=>{try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==='suspended')AC.resume()}catch(e){}};
function beep(ok){try{unlockAC();const t=AC.currentTime,nada=(f,m,d,jenis,v,f2)=>{const o=AC.createOscillator(),g=AC.createGain();o.type=jenis;o.frequency.setValueAtTime(f,t+m);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+m+d);g.gain.setValueAtTime(.0001,t+m);g.gain.exponentialRampToValueAtTime(v,t+m+.012);g.gain.exponentialRampToValueAtTime(.0001,t+m+d);o.connect(g);g.connect(AC.destination);o.start(t+m);o.stop(t+m+d+.03)};
 if(ok){nada(1175,0,.1,'sine',.35);nada(1760,.09,.45,'sine',.35);nada(3520,.09,.2,'sine',.07)}
 else{nada(440,0,.22,'sawtooth',.4,330);nada(330,.25,.5,'sawtooth',.4,220);nada(880,0,.22,'square',.06,660)}}catch(e){}}
const CEK='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" fill-opacity=".92"/><path d="M28 52 L44 68 L73 34"/></svg>',SIL='<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="#fff" fill-opacity=".92"/><path d="M33 33 L67 67 M67 33 L33 67"/></svg>';let fbT=null;
function tanda(ok){const f=$('#fb');if(!f)return;clearTimeout(fbT);f.className='fb';f.innerHTML=ok?CEK:SIL;void f.offsetWidth;f.className='fb show '+(ok?'ok':'no');fbT=setTimeout(()=>{f.className='fb'},ok?700:900)}
/* suara ucapan nama lengkap + status (Hadir/Terlambat/telah tercatat); bila peramban tidak mendukung, kembali ke bunyi beep */
const SUARA_K='suara_scanner';
function suaraMuat(){try{const o=JSON.parse(localStorage.getItem(SUARA_K)||'{}');return{v:String(o.v||''),r:Math.min(1.5,Math.max(.6,+o.r||.95)),p:Math.min(1.8,Math.max(.6,+o.p||1))}}catch(e){return{v:'',r:.95,p:1}}}
let SUARA=suaraMuat(),suaraOpen=false;
const suaraSimpan=()=>{try{localStorage.setItem(SUARA_K,JSON.stringify(SUARA))}catch(e){}};
function suaraDaftar(){try{return(window.speechSynthesis.getVoices()||[]).filter(v=>/^id/i.test(v.lang))}catch(e){return[]}}
function suaraPilih(){let l=suaraDaftar();if(netMati()){const lk=l.filter(v=>v.localService);if(lk.length)l=lk}return l.find(v=>v.voiceURI===SUARA.v)||l.find(v=>/^id[-_]ID/i.test(v.lang))||l[0]||null}
function ucap(teks){try{const ss=window.speechSynthesis;if(!ss||!window.SpeechSynthesisUtterance)return false;
 const u=new SpeechSynthesisUtterance(teks);u.lang='id-ID';u.rate=SUARA.r;u.pitch=SUARA.p;u.volume=1;const v=suaraPilih();if(v)u.voice=v;
 u.onerror=()=>{try{beep(!/gagal|tidak|bukan|nonaktif|sudah tercatat|telah tercatat/i.test(teks))}catch(e){}};ss.cancel();ss.speak(u);return true}catch(e){return false}}
/* C. pemanasan mesin suara (tanpa bunyi) saat sesi scan dimulai, agar ucapan pertama tidak telat */
let _suaraPanas=0;
function suaraPanas(){try{const ss=window.speechSynthesis;if(!ss||!window.SpeechSynthesisUtterance||Date.now()-_suaraPanas<60000)return;_suaraPanas=Date.now();const u=new SpeechSynthesisUtterance('a');u.lang='id-ID';u.volume=0;u.rate=2;const v=suaraPilih();if(v)u.voice=v;ss.speak(u)}catch(e){}}
function suaraOpsi(){const l=suaraDaftar(),c=suaraPilih();return l.length?l.map(v=>`<option value="${esc(v.voiceURI)}"${c&&c.voiceURI===v.voiceURI?' selected':''}>${esc(v.name)}</option>`).join(''):'<option value="">Suara bawaan perangkat</option>'}
const suaraPanel=()=>`<details class="suarabox"${suaraOpen?' open':''} ontoggle="suaraOpen=this.open"><summary>🔊 Pengaturan suara</summary><div class="suarabd"><label class="mu">Suara</label><select id="suaraSel" class="select" onchange="suaraUbah('v',this.value)">${suaraOpsi()}</select><label class="mu">Kecepatan: <b id="suaraRv">${SUARA.r.toFixed(2)}</b>×</label><input id="suaraR" type="range" min="0.6" max="1.5" step="0.05" value="${SUARA.r}" oninput="suaraUbah('r',this.value)"><label class="mu">Nada: <b id="suaraPv">${SUARA.p.toFixed(2)}</b></label><input id="suaraP" type="range" min="0.6" max="1.8" step="0.05" value="${SUARA.p}" oninput="suaraUbah('p',this.value)"><div class="tb" style="justify-content:center"><button type="button" class="btn soft sm" onclick="suaraCoba()">▶ Coba suara</button><button type="button" class="btn soft sm" onclick="suaraReset()">Atur ulang</button></div></div></details>`;
function suaraUbah(k,v){if(k==='v')SUARA.v=String(v);else SUARA[k]=+v;const r=$('#suaraRv'),p=$('#suaraPv');if(r)r.textContent=SUARA.r.toFixed(2);if(p)p.textContent=SUARA.p.toFixed(2);suaraSimpan()}
function suaraCoba(){unlockAC();if(!ucap('absensi siap'))toast('Perangkat ini tidak mendukung suara ucapan.',false)}
function suaraReset(){SUARA={v:'',r:.95,p:1};suaraSimpan();const s=$('#suaraSel'),r=$('#suaraR'),p=$('#suaraP');if(s)s.innerHTML=suaraOpsi();if(r)r.value=SUARA.r;if(p)p.value=SUARA.p;suaraUbah('r',SUARA.r);suaraUbah('p',SUARA.p)}
try{if(window.speechSynthesis)speechSynthesis.onvoiceschanged=()=>{const s=$('#suaraSel');if(s)s.innerHTML=suaraOpsi()}}catch(e){}
