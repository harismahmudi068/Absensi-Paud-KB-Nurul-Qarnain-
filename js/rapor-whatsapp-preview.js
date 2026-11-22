function pnPesan(arr){const sk=ns(),per=pnJenisTxt(pnJenis)+' Semester '+pnSem+' · TA '+S.set.tahun_ajaran;let isi;
 if(arr.length===1){const s=arr[0];isi='Berikut tautan raport ananda di '+sk+'.\nNama : *'+s.nama+'*\nNISN : *'+(s.nisn||'-')+'*\nKelas : '+s.kelas+'\nPeriode : *'+per+'*\n\n🔗 '+linkSiswa(s)+'#rapor'}
 else isi='Berikut tautan raport ananda di '+sk+'.\nPeriode : *'+per+'*\n\n'+arr.map((s,i)=>(i+1)+'. *'+s.nama+'* ('+s.kelas+')\n🔗 '+linkSiswa(s)+'#rapor').join('\n\n');
 return 'Kepada Yth\nBapak/Ibu\n*Di_Tempat*\n\n_Assalamualaikum warohmatullahi wabarakatuh_\n\n'+isi+'\n\nMelalui tautan ini Bapak/Ibu dapat melihat dan mengunduh raport ananda. Mohon tautan tidak dibagikan kepada orang lain.\n\nTerima kasih 🙏🏻\n_Waalaikumsalam warahmatullahi wabarakatuh_'}
/* Pratinjau pesan: tampilan mirip gelembung WhatsApp, persis isi yang akan dikirim */
function pnBubble(teks){let h=esc(teks);h=h.replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/(^|[\s>])_([^_\n<>]+)_(?=[\s<.,!?]|$)/g,'$1<i>$2</i>').replace(/\n/g,'<br>');
 return '<div style="background:#dcf8c6;color:#1f2a1f;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.5;word-break:break-word;max-height:55vh;overflow:auto;box-shadow:0 1px 2px rgba(0,0,0,.15)">'+h+'</div>'}
