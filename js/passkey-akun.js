function pkAkunList(){try{const a=JSON.parse(localStorage.getItem('pk_akun')||'[]');return Array.isArray(a)?a.filter(x=>x&&x.c&&x.u):[]}catch(e){return []}}
function pkAkunSimpan(a){try{localStorage.setItem('pk_akun',JSON.stringify(a.slice(0,8)))}catch(e){}}
function pkAkunTambah(u,n,c){pkAkunSimpan([{u,n,c}].concat(pkAkunList().filter(x=>x.u!==u&&x.c!==c)))}
function pkAkunHapus(c){pkAkunSimpan(pkAkunList().filter(x=>x.c!==c))}
/* Alur resmi supabase-js tetap dipakai; kita hanya (1) menyempitkan pilihan ke satu akun dan (2) mencatat id kredensial yang dipakai */
