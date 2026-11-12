// Pengaman kuota Gemini: batas lokal per sekolah + cooldown saat Google mengirim 429.
function detailGemini(error) {
  const sumber = [error?.errorDetails, error?.details, error?.error?.details, error?.response?.data?.error?.details];
  const hasil = [], dilihat = new Set();
  function tambah(nilai, kedalaman = 0) {
    if (nilai == null || kedalaman > 5) return;
    if (Array.isArray(nilai)) { for (const item of nilai) tambah(item, kedalaman + 1); return; }
    if (typeof nilai !== 'object' || dilihat.has(nilai)) return;
    dilihat.add(nilai); hasil.push(nilai);
    for (const kunci of ['details','violations','quotaFailure','quota_failure','metadata']) {
      if (nilai[kunci]) tambah(nilai[kunci], kedalaman + 1);
    }
  }
  for (const item of sumber) tambah(item);
  return hasil;
}
function detikKeResetHarianGemini() {
  const format = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'});
  const awal=Date.now(), hari=format.format(new Date(awal));
  let bawah=awal, atas=awal+36*60*60*1000;
  while(format.format(new Date(atas))===hari) atas+=12*60*60*1000;
  while(atas-bawah>1000){const tengah=Math.floor((bawah+atas)/2);if(format.format(new Date(tengah))===hari)bawah=tengah;else atas=tengah;}
  return Math.max(1,Math.ceil((atas-awal)/1000));
}
function parseRetryGemini(error, details=detailGemini(error), jenisKuota='') {
  if(jenisKuota==='RPD') return detikKeResetHarianGemini();
  const candidates=[error?.retryAfter,error?.retry_after,error?.response?.headers?.get?.('retry-after'),error?.headers?.get?.('retry-after')];
  for(const value of candidates){
    if(value==null||value==='') continue;
    const n=Number(value); if(Number.isFinite(n)&&n>0)return Math.min(86400,Math.ceil(n));
    const t=Date.parse(String(value));if(Number.isFinite(t)&&t>Date.now())return Math.min(86400,Math.ceil((t-Date.now())/1000));
  }
  for(const detail of details){const delay=String(detail?.retryDelay||detail?.retry_delay||'');const match=delay.match(/([0-9]+(?:\.[0-9]+)?)s/i);if(match)return Math.min(86400,Math.ceil(Number(match[1])));}
  return null;
}
function klasifikasiErrorGemini(error) {
  const status=Number(error?.status||error?.statusCode||error?.response?.status||0)||null;
  const kode=String(error?.code||error?.status||error?.error?.status||'').toUpperCase();
  const pesan=String(error?.message||error?.error?.message||'').toLowerCase();
  const details=detailGemini(error);
  const detailText=details.map(x=>[
    x?.quotaId,x?.quotaMetric,x?.metric,x?.reason,x?.description,x?.message,
    ...(Array.isArray(x?.violations)?x.violations.flatMap(v=>[v?.quotaId,v?.quotaMetric,v?.metric,v?.reason,v?.description]):[])
  ].filter(Boolean).join(' ')).join(' ').toLowerCase();
  const gabungan=detailText+' '+pesan;
  const kuota=status===429||kode==='RESOURCE_EXHAUSTED'||/resource_exhausted|too many requests|rate.?limit|quota exceeded/.test(pesan);
  const rpd=/per[\s._/-]*day|daily|requests?[\s._/-]*per[\s._/-]*day|generate[\s._/-]*requests?[\s._/-]*day|requestsperday|\brpd\b/.test(gabungan);
  const tpm=/tokens?[\s._/-]*per[\s._/-]*minute|inputtokensperminute|\btpm\b/.test(gabungan);
  const rpm=/requests?[\s._/-]*per[\s._/-]*minute|generaterequestsperminute|\brpm\b/.test(gabungan);
  const jenisKuota=rpd?'RPD':tpm?'TPM':rpm?'RPM':'';
  const httpStatus=kuota?429:status;
  const kodeFinal=kuota?('RESOURCE_EXHAUSTED'+(jenisKuota?'_'+jenisKuota:'')):(kode&&/^[A-Z0-9_.:-]{1,70}$/.test(kode)?kode:(status?'HTTP_'+status:'AI_REQUEST_FAILED'));
  const kodeError=String(error?.code||'').toUpperCase();
  // AbortSignal.timeout() dapat menghasilkan DOMException code 20 dengan pesan
  // "This operation was aborted". Ini kegagalan sementara, bukan konfigurasi permanen.
  const dibatalkan=Number(error?.code)===20 || kodeError==='ABORT_ERR' ||
    /operation was aborted|the operation was aborted|aborted/i.test(pesan);
  const network=dibatalkan || /timeout|timed out|aborterror|econnreset|econnrefused|enotfound|eai_again|socket hang up|fetch failed|network/i.test(pesan)
    || ['ETIMEDOUT','ECONNRESET','ECONNREFUSED','ENOTFOUND','EAI_AGAIN','ABORT_ERR'].includes(kodeError);
  const sementara=network || [408,425,429,500,502,503,504].includes(Number(httpStatus));
  const permanen=!sementara;
  return {httpStatus,kode:kodeFinal,retryAfter:parseRetryGemini(error,details,jenisKuota),sementara,permanen};
}
function errorPengamanGemini(kode,tunggu) {
  const e=new Error(kode==='busy'?'API Key Gemini sedang digunakan oleh permintaan lain.':kode==='cooldown'?'API Key Gemini sedang dijeda sementara karena batas kuota.':kode==='batas_lokal_per_menit'?'Batas aman permintaan AI sekolah per menit tercapai.':kode==='jeda_antar_permintaan'?'API Key Gemini masih dalam jeda 60 detik.':'Pengaman kuota Gemini belum dapat diperiksa.');
  e.isGeminiGuard=true;e.code='GEMINI_GUARD_'+String(kode||'UNAVAILABLE').toUpperCase();e.retryAfterSeconds=Number(tunggu)||null;return e;
}
async function generateContentDenganPengaman({model,pengamanGemini,apiKeyId,generate}) {
  if(!pengamanGemini) throw errorPengamanGemini('unavailable');
  const perKey=Number.isSafeInteger(Number(apiKeyId)) && Number(apiKeyId)>0
    && typeof pengamanGemini.ambilIzinKey==='function'
    && typeof pengamanGemini.catatHasilKey==='function';
  const tandaiTerakhir=async()=>{if(perKey&&typeof pengamanGemini.tandaiTerakhirKey==='function')await pengamanGemini.tandaiTerakhirKey(Number(apiKeyId),model).catch(()=>{});};
  let izin;
  try {
    izin=perKey
      ? await pengamanGemini.ambilIzinKey(Number(apiKeyId),model)
      : (typeof pengamanGemini.ambilIzin==='function' ? await pengamanGemini.ambilIzin(model) : null);
  } catch(_) { throw errorPengamanGemini('unavailable'); }
  if(!izin||izin.allowed!==true) {
    await tandaiTerakhir();
    const e=errorPengamanGemini(izin?.reason||'unavailable',izin?.retry_after_seconds);
    e.geminiInfo={httpStatus:null,kode:e.code,retryAfter:izin?.retry_after_seconds||null,sementara:true,permanen:false,perluNotifikasi:false};
    throw e;
  }
  try {
    const hasil=await generate();
    await tandaiTerakhir();
    if(perKey) await pengamanGemini.catatHasilKey({id:Number(apiKeyId),model,status:'berhasil',httpStatus:200,kode:null,detail:null,retryAfter:null,permanen:false}).catch(()=>false);
    else if(typeof pengamanGemini.catatHasil==='function') await pengamanGemini.catatHasil({model,status:'berhasil',httpStatus:200,kode:null,retryAfter:null}).catch(()=>{});
    return hasil;
  } catch(error) {
    const info=klasifikasiErrorGemini(error);
    await tandaiTerakhir();
    let perluNotifikasi=false;
    if(perKey) {
      try {
        perluNotifikasi=await pengamanGemini.catatHasilKey({
          id:Number(apiKeyId),model,status:'gagal',httpStatus:info.httpStatus,kode:info.kode,
          detail:error?.message||String(error),retryAfter:info.retryAfter,permanen:info.permanen
        });
      } catch(_) {}
    } else if(typeof pengamanGemini.catatHasil==='function') {
      await pengamanGemini.catatHasil({model,status:'gagal',httpStatus:info.httpStatus,kode:info.kode,retryAfter:info.retryAfter}).catch(()=>{});
    }
    try { error.geminiInfo={...info,perluNotifikasi:!!perluNotifikasi}; } catch(_) {}
    throw error;
  } finally {
    if(perKey && izin?.reservation_token && typeof pengamanGemini.lepasIzinKey==='function') {
      await pengamanGemini.lepasIzinKey(Number(apiKeyId),String(izin.reservation_token)).catch(()=>false);
    }
  }
}
module.exports={generateContentDenganPengaman,klasifikasiErrorGemini};
