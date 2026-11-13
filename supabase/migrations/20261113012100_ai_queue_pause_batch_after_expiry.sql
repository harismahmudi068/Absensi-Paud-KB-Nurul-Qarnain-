create or replace function public.gemini_antrean_ambil_batch(p_sekolah_id bigint, p_limit integer default 10)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'vault', 'pg_temp'
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_msg public.pesan_ai_antrean%rowtype;
  v_key record;
  v_token uuid;
  v_jobs jsonb := '[]'::jsonb;
  v_expired jsonb := '[]'::jsonb;
  v_count integer := 0;
  v_limit integer := least(10,greatest(1,coalesce(p_limit,10)));
begin
  if p_sekolah_id is null or p_sekolah_id<=0 then
    raise exception 'Sekolah tidak valid';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('gemini_ai_queue:' || p_sekolah_id::text,0));

  for v_msg in
    select *
    from public.pesan_ai_antrean
    where sekolah_id=p_sekolah_id
      and status='menunggu'
      and diterima_pada <= v_now-interval '5 minutes'
      and ai_percobaan_terakhir_pada is not null
    order by diterima_pada,id
    limit 50
    for update skip locked
  loop
    update public.pesan_ai_antrean
    set status='kedaluwarsa',klaim_sampai=null,diperbarui=v_now
    where id=v_msg.id and sekolah_id=p_sekolah_id;

    v_expired := v_expired || jsonb_build_array(jsonb_build_object(
      'id',v_msg.id,
      'dari_nomor',v_msg.dari_nomor,
      'isi',v_msg.isi,
      'diterima_pada',v_msg.diterima_pada,
      'ai_percobaan_terakhir_pada',v_msg.ai_percobaan_terakhir_pada
    ));
  end loop;

  -- Jika ada pesan yang harus dialihkan ke manual, jangan klaim pesan lain pada batch yang sama.
  -- Webhook akan mengaktifkan mode manual, lalu antrean lainnya ditangani pada siklus berikutnya.
  if jsonb_array_length(v_expired)>0 then
    return jsonb_build_object('jobs',v_jobs,'expired',v_expired);
  end if;

  loop
    exit when v_count >= v_limit;

    select *
    into v_msg
    from public.pesan_ai_antrean
    where sekolah_id=p_sekolah_id
      and status='menunggu'
      and (diterima_pada > v_now-interval '5 minutes' or ai_percobaan_terakhir_pada is null)
    order by diterima_pada,id
    limit 1
    for update skip locked;

    exit when not found;

    select
      k.id,k.label,k.secret_id,k.window_start,k.jumlah_permintaan_window,
      d.decrypted_secret as api_key
    into v_key
    from public.gemini_api_key_sekolah k
    join vault.decrypted_secrets d on d.id=k.secret_id
    where k.sekolah_id=p_sekolah_id
      and k.aktif=true
      and coalesce(k.error_permanen,false)=false
      and (k.reservasi_sampai is null or k.reservasi_sampai<=v_now)
      and (k.cooldown_until is null or k.cooldown_until<=v_now)
      and (k.next_allowed_at is null or k.next_allowed_at<=v_now)
      and (k.jumlah_permintaan_window<10 or k.window_start<=v_now-interval '60 seconds')
    order by k.terakhir_dicoba asc nulls first,k.urutan,k.id
    limit 1
    for update of k skip locked;

    if not found then
      exit;
    end if;

    v_token:=gen_random_uuid();

    update public.gemini_api_key_sekolah
    set window_start=case
          when window_start<=v_now-interval '60 seconds' then v_now
          else window_start
        end,
        jumlah_permintaan_window=case
          when window_start<=v_now-interval '60 seconds' then 1
          else jumlah_permintaan_window+1
        end,
        next_allowed_at=v_now+interval '60 seconds',
        reservasi_token=v_token,
        reservasi_mulai=v_now,
        reservasi_sampai=v_now+interval '45 seconds',
        terakhir_dicoba=v_now,
        status_terakhir='dibatasi',
        diperbarui=v_now
    where id=v_key.id and sekolah_id=p_sekolah_id;

    update public.pesan_ai_antrean
    set status='diproses',
        klaim_sampai=v_now+interval '120 seconds',
        jumlah_percobaan=jumlah_percobaan+1,
        api_key_id=v_key.id,
        reservasi_token=v_token,
        diperbarui=v_now
    where id=v_msg.id and sekolah_id=p_sekolah_id;

    v_jobs:=v_jobs || jsonb_build_array(jsonb_build_object(
      'id',v_msg.id,
      'sekolah_id',v_msg.sekolah_id,
      'kunci_duplikat',v_msg.kunci_duplikat,
      'payload',v_msg.payload,
      'dari_nomor',v_msg.dari_nomor,
      'isi',v_msg.isi,
      'diterima_pada',v_msg.diterima_pada,
      'api_key_id',v_key.id,
      'api_key_label',v_key.label,
      'api_key',v_key.api_key,
      'reservasi_token',v_token
    ));

    v_count:=v_count+1;
  end loop;

  return jsonb_build_object('jobs',v_jobs,'expired',v_expired);
end;
$function$;