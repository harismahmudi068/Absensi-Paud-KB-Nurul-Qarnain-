// Pengaman kuota Gemini: batas lokal per sekolah + cooldown saat Google mengirim 429.
function parseRetryGemini(error) {
  const candidates = [
    error?.retryAfter,
    error?.retry_after,
    error?.response?.headers?.get?.('retry-after'),
    error?.headers?.get?.('retry-after')
  ];
  for (const value of candidates) {
    if (value == null || value === '') continue;
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.min(3600, Math.ceil(n));
    const t = Date.parse(String(value));
    if (Number.isFinite(t) && t > Date.now()) return Math.min(3600, Math.ceil((t - Date.now()) / 1000));
  }
  const details = error?.errorDetails || error?.details || [];
  for (const detail of Array.isArray(details) ? details : []) {
    const delay = String(detail?.retryDelay || detail?.retry_delay || '');
    const match = delay.match(/([0-9]+(?:\.[0-9]+)?)s/i);
    if (match) return Math.min(3600, Math.ceil(Number(match[1])));
  }
  return null;
}

function klasifikasiErrorGemini(error) {
  const status = Number(error?.status || error?.statusCode || error?.response?.status || 0) || null;
  const kode = String(error?.code || error?.status || error?.error?.status || '').toUpperCase();
  const pesan = String(error?.message || '').toLowerCase();
  const kuota = status === 429 || kode === 'RESOURCE_EXHAUSTED'
    || /resource_exhausted|too many requests|rate.?limit|quota exceeded/.test(pesan);
  return {
    httpStatus: kuota ? 429 : status,
    kode: kuota ? 'RESOURCE_EXHAUSTED'
      : (kode && /^[A-Z0-9_.:-]{1,70}$/.test(kode) ? kode : (status ? 'HTTP_' + status : 'AI_REQUEST_FAILED')),
    retryAfter: parseRetryGemini(error)
  };
}

function errorPengamanGemini(kode, tunggu) {
  const e = new Error(
    kode === 'cooldown'
      ? 'AI sekolah sedang dijeda sementara karena batas kuota Gemini.'
      : kode === 'batas_lokal_per_menit'
        ? 'Batas aman permintaan AI sekolah per menit tercapai.'
        : kode === 'jeda_antar_permintaan'
          ? 'Permintaan AI sekolah terlalu berdekatan.'
          : 'Pengaman kuota Gemini belum dapat diperiksa.'
  );
  e.isGeminiGuard = true;
  e.code = 'GEMINI_GUARD_' + String(kode || 'UNAVAILABLE').toUpperCase();
  e.retryAfterSeconds = Number(tunggu) || null;
  return e;
}

async function generateContentDenganPengaman({ model, pengamanGemini, generate }) {
  if (!pengamanGemini || typeof pengamanGemini.ambilIzin !== 'function'
      || typeof pengamanGemini.catatHasil !== 'function') {
    throw errorPengamanGemini('unavailable');
  }

  let izin;
  try {
    izin = await pengamanGemini.ambilIzin(model);
  } catch (_) {
    throw errorPengamanGemini('unavailable');
  }
  if (!izin || izin.allowed !== true) {
    throw errorPengamanGemini(izin?.reason || 'unavailable', izin?.retry_after_seconds);
  }

  try {
    const hasil = await generate();
    await pengamanGemini.catatHasil({
      model, status: 'berhasil', httpStatus: 200, kode: null, retryAfter: null
    }).catch(() => {});
    return hasil;
  } catch (error) {
    const info = klasifikasiErrorGemini(error);
    await pengamanGemini.catatHasil({
      model, status: 'gagal', httpStatus: info.httpStatus,
      kode: info.kode, retryAfter: info.retryAfter
    }).catch(() => {});
    throw error;
  }
}

module.exports = { generateContentDenganPengaman };
