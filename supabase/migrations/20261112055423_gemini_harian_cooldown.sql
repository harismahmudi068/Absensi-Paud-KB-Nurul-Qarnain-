-- Sesuaikan cooldown pengaman jika Gemini melaporkan kuota harian (RPD).
-- Retry harian diarahkan ke reset midnight Pacific, maksimal 24 jam.

create or replace function public.gemini_catat_hasil(
  p_sekolah_id bigint,
  p_model text,
  p_status text,
  p_http_status integer default null,
  p_kode_error text default null,
  p_retry_after_seconds integer default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_model text := left(coalesce(nullif(trim(p_model), ''), 'gemini-3.5-flash-lite'), 80);
  v_kode text := left(regexp_replace(coalesce(p_kode_error, ''), '[^A-Za-z0-9_.:-]', '_', 'g'), 80);
begin
  if p_sekolah_id is null or p_sekolah_id <= 0 or p_status not in ('berhasil','gagal') then
    raise exception 'Parameter hasil Gemini tidak valid';
  end if;

  insert into public.gemini_pengaman_sekolah (sekolah_id, model)
  values (p_sekolah_id, v_model)
  on conflict (sekolah_id, model) do nothing;

  if p_http_status = 429 then
    update public.gemini_pengaman_sekolah
    set consecutive_429 = consecutive_429 + 1,
        status_terakhir = 'kuota',
        kode_error_terakhir = coalesce(nullif(v_kode,''), 'RESOURCE_EXHAUSTED'),
        terakhir_error = v_now,
        cooldown_until = v_now + make_interval(secs =>
          case
            when coalesce(p_retry_after_seconds, 0) > 0
              then least(86400, greatest(1, p_retry_after_seconds))
            else least(3600, greatest(
              1, (60 * power(2, least(consecutive_429, 6)))::integer
            ))
          end
        ),
        diperbarui = v_now
    where sekolah_id = p_sekolah_id and model = v_model;
  elsif p_status = 'berhasil' then
    update public.gemini_pengaman_sekolah
    set consecutive_429 = 0,
        cooldown_until = null,
        status_terakhir = 'berhasil',
        kode_error_terakhir = null,
        diperbarui = v_now
    where sekolah_id = p_sekolah_id and model = v_model;
  else
    update public.gemini_pengaman_sekolah
    set status_terakhir = 'gagal',
        kode_error_terakhir = nullif(v_kode,''),
        terakhir_error = v_now,
        diperbarui = v_now
    where sekolah_id = p_sekolah_id and model = v_model;
  end if;
end;
$$;
