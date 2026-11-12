-- Pemulihan otomatis Gemini dan retry antrean maksimal 5 menit.
-- API key permanen dilewati oleh antrean; hanya error sementara yang diprobe ulang.

create or replace function public.gemini_key_daftar_pemulihan(
  p_sekolah_id bigint,
  p_model text default 'gemini-3.5-flash-lite'
) returns jsonb
language sql
security definer
set search_path = public, vault, pg_temp
as $$
  select coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
  from (
    select
      k.id,
      k.label,
      d.decrypted_secret as api_key,
      k.status_terakhir,
      k.kode_error_terakhir,
      k.cooldown_until,
      k.next_allowed_at
    from public.gemini_api_key_sekolah k
    join vault.decrypted_secrets d on d.id = k.secret_id
    where k.sekolah_id = p_sekolah_id
      and k.aktif = true
      and coalesce(k.error_permanen,false) = false
      and k.kode_error_terakhir is not null
    order by k.terakhir_error asc nulls first, k.urutan, k.id
    limit 1
  ) x;
$$;

revoke all on function public.gemini_key_daftar_pemulihan(bigint,text) from public, anon, authenticated;
grant execute on function public.gemini_key_daftar_pemulihan(bigint,text) to service_role;

-- Jangan pernah memilih API key yang sudah dipastikan salah/tidak memiliki izin.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.gemini_antrean_ambil_batch(bigint,integer)'::regprocedure)
  into v_def;
  if position('coalesce(k.error_permanen,false)=false' in v_def) = 0 then
    v_def := replace(v_def, 'and k.aktif=true', 'and k.aktif=true' || E'\n      and coalesce(k.error_permanen,false)=false');
    execute v_def;
  end if;
end
$$;

-- Sertakan flag error permanen pada daftar key; _AI.js akan melewati key permanen,
-- sedangkan tombol tes manual tetap dapat memeriksanya.
do $$
declare
  v_def text;
begin
  select pg_get_functiondef('public.gemini_key_daftar_rotasi(bigint,text)'::regprocedure)
  into v_def;
  if position('error_permanen' in v_def) = 0 then
    v_def := replace(v_def, '''status_terakhir'',k.status_terakhir',
      '''status_terakhir'',k.status_terakhir,''error_permanen'',k.error_permanen');
    execute v_def;
  end if;
end
$$;

-- Retry worker juga harus tetap berjalan ketika antrean kosong tetapi ada key sementara
-- yang perlu diuji pemulihannya. Job tetap one-shot dan menjadwalkan dirinya lagi hanya
-- selama antrean atau key bermasalah masih ada.
create or replace function public.gemini_retry_trigger(p_sekolah_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public, cron, net, pg_temp
as $$
declare
  v_job text := 'gemini-retry-' || p_sekolah_id::text;
  v_key text;
  v_job_id bigint;
  v_request_id bigint;
  v_ada_antrean boolean;
  v_perlu_pemulihan boolean;
begin
  select webhook_kunci into v_key
  from public.pengaturan_rahasia
  where sekolah_id = p_sekolah_id;

  select exists(
    select 1 from public.pesan_ai_antrean
    where sekolah_id = p_sekolah_id
      and status in ('menunggu','diproses','kedaluwarsa')
  ) into v_ada_antrean;

  select exists(
    select 1 from public.gemini_api_key_sekolah
    where sekolah_id = p_sekolah_id
      and aktif = true
      and coalesce(error_permanen,false) = false
      and kode_error_terakhir is not null
  ) into v_perlu_pemulihan;

  select jobid into v_job_id from cron.job where jobname = v_job;
  if v_job_id is not null then perform cron.unschedule(v_job_id); end if;

  if v_key is null or btrim(v_key) = '' or (not v_ada_antrean and not v_perlu_pemulihan) then
    update public.gemini_pengaman_sekolah
    set next_retry_at = null, diperbarui = now()
    where sekolah_id = p_sekolah_id and model = 'gemini-3.5-flash-lite';
    return null;
  end if;

  perform public.gemini_jadwalkan_retry(p_sekolah_id,0);

  v_request_id := net.http_post(
    url := 'https://absensi-1486.vercel.app/api/webhook?key=' || v_key,
    body := jsonb_build_object('__ai_retry',true),
    headers := jsonb_build_object('Content-Type','application/json'),
    timeout_milliseconds := 10000
  );
  return v_request_id;
end;
$$;

revoke all on function public.gemini_retry_trigger(bigint) from public, anon, authenticated;
grant execute on function public.gemini_retry_trigger(bigint) to service_role;

-- Koreksi klasifikasi lama: error abort/timeout adalah sementara, bukan permanen.
update public.gemini_api_key_sekolah
set error_permanen = false,
    status_terakhir = 'gagal',
    diperbarui = now()
where kode_error_terakhir = '20'
  and detail_error ilike '%operation was aborted%'
  and error_permanen = true;
