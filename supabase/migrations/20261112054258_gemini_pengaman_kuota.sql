-- Pengaman kuota Gemini per sekolah dan model.
-- Batas lokal aplikasi: maksimal 10 permintaan/60 detik + jeda minimum 6 detik.
-- Status ini tidak menyimpan isi pesan, nomor WhatsApp, maupun API key.

create table if not exists public.gemini_pengaman_sekolah (
  sekolah_id bigint not null references public.sekolah(id) on delete cascade,
  model text not null,
  window_start timestamptz not null default now(),
  jumlah_permintaan_window integer not null default 0 check (jumlah_permintaan_window >= 0),
  next_allowed_at timestamptz,
  cooldown_until timestamptz,
  consecutive_429 integer not null default 0 check (consecutive_429 >= 0),
  status_terakhir text not null default 'belum_ada'
    check (status_terakhir in ('belum_ada','berhasil','gagal','kuota','dibatasi')),
  kode_error_terakhir text,
  terakhir_dicoba timestamptz,
  terakhir_error timestamptz,
  diperbarui timestamptz not null default now(),
  primary key (sekolah_id, model)
);

create index if not exists idx_gemini_pengaman_cooldown
  on public.gemini_pengaman_sekolah (cooldown_until);

alter table public.gemini_pengaman_sekolah enable row level security;
revoke all on public.gemini_pengaman_sekolah from public, anon, authenticated;
grant all on public.gemini_pengaman_sekolah to service_role;

create or replace function public.gemini_ambil_izin(p_sekolah_id bigint, p_model text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_now timestamptz := clock_timestamp();
  v_model text := left(coalesce(nullif(trim(p_model), ''), 'gemini-3.5-flash-lite'), 80);
  v_row public.gemini_pengaman_sekolah%rowtype;
  v_tunggu integer := 0;
begin
  if p_sekolah_id is null or p_sekolah_id <= 0 then
    raise exception 'Sekolah tidak valid untuk pengaman Gemini';
  end if;
  insert into public.gemini_pengaman_sekolah (sekolah_id, model)
  values (p_sekolah_id, v_model) on conflict (sekolah_id, model) do nothing;
  select * into v_row from public.gemini_pengaman_sekolah
  where sekolah_id = p_sekolah_id and model = v_model for update;

  if v_row.cooldown_until is not null and v_row.cooldown_until > v_now then
    v_tunggu := greatest(1, ceil(extract(epoch from (v_row.cooldown_until - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'cooldown',
      'retry_after_seconds', v_tunggu, 'cooldown_until', v_row.cooldown_until);
  end if;
  if v_row.window_start is null or v_now >= v_row.window_start + interval '60 seconds' then
    update public.gemini_pengaman_sekolah
    set window_start = v_now, jumlah_permintaan_window = 0
    where sekolah_id = p_sekolah_id and model = v_model returning * into v_row;
  end if;
  if v_row.jumlah_permintaan_window >= 10 then
    v_tunggu := greatest(1, ceil(extract(epoch from (v_row.window_start + interval '60 seconds' - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'batas_lokal_per_menit',
      'retry_after_seconds', v_tunggu);
  end if;
  if v_row.next_allowed_at is not null and v_row.next_allowed_at > v_now then
    v_tunggu := greatest(1, ceil(extract(epoch from (v_row.next_allowed_at - v_now)))::integer);
    return jsonb_build_object('allowed', false, 'reason', 'jeda_antar_permintaan',
      'retry_after_seconds', v_tunggu);
  end if;
  update public.gemini_pengaman_sekolah
  set jumlah_permintaan_window = jumlah_permintaan_window + 1,
      next_allowed_at = v_now + interval '6 seconds',
      terakhir_dicoba = v_now, status_terakhir = 'dibatasi', diperbarui = v_now
  where sekolah_id = p_sekolah_id and model = v_model;
  return jsonb_build_object('allowed', true,
    'permintaan_dalam_jendela', v_row.jumlah_permintaan_window + 1,
    'batas_lokal_per_menit', 10, 'jeda_minimum_detik', 6);
end;
$$;

create or replace function public.gemini_catat_hasil(
  p_sekolah_id bigint, p_model text, p_status text,
  p_http_status integer default null, p_kode_error text default null,
  p_retry_after_seconds integer default null
) returns void language plpgsql security definer set search_path = public, pg_temp as $$
declare
  v_now timestamptz := clock_timestamp();
  v_model text := left(coalesce(nullif(trim(p_model), ''), 'gemini-3.5-flash-lite'), 80);
  v_kode text := left(regexp_replace(coalesce(p_kode_error, ''), '[^A-Za-z0-9_.:-]', '_', 'g'), 80);
begin
  if p_sekolah_id is null or p_sekolah_id <= 0 or p_status not in ('berhasil','gagal') then
    raise exception 'Parameter hasil Gemini tidak valid';
  end if;
  insert into public.gemini_pengaman_sekolah (sekolah_id, model)
  values (p_sekolah_id, v_model) on conflict (sekolah_id, model) do nothing;

  if p_http_status = 429 then
    update public.gemini_pengaman_sekolah
    set consecutive_429 = consecutive_429 + 1, status_terakhir = 'kuota',
        kode_error_terakhir = coalesce(nullif(v_kode,''), 'RESOURCE_EXHAUSTED'),
        terakhir_error = v_now,
        cooldown_until = v_now + make_interval(secs => least(3600, greatest(
          1, coalesce(nullif(p_retry_after_seconds, 0),
          (60 * power(2, least(consecutive_429, 6)))::integer)
        ))), diperbarui = v_now
    where sekolah_id = p_sekolah_id and model = v_model;
  elsif p_status = 'berhasil' then
    update public.gemini_pengaman_sekolah
    set consecutive_429 = 0, cooldown_until = null, status_terakhir = 'berhasil',
        kode_error_terakhir = null, diperbarui = v_now
    where sekolah_id = p_sekolah_id and model = v_model;
  else
    update public.gemini_pengaman_sekolah
    set status_terakhir = 'gagal', kode_error_terakhir = nullif(v_kode,''),
        terakhir_error = v_now, diperbarui = v_now
    where sekolah_id = p_sekolah_id and model = v_model;
  end if;
end;
$$;

create or replace function public.developer_gemini_pengaman()
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.nama asc), '[]'::jsonb)
  from (
    select g.sekolah_id, s.nama, g.model,
      case when g.cooldown_until > now() then 'cooldown'
           when g.next_allowed_at > now() then 'jeda' else 'normal' end as status,
      case when g.window_start > now() - interval '60 seconds'
           then g.jumlah_permintaan_window else 0 end as permintaan_60_detik,
      g.consecutive_429, g.cooldown_until, g.next_allowed_at,
      g.status_terakhir, g.kode_error_terakhir, g.terakhir_dicoba,
      g.terakhir_error, g.diperbarui
    from public.gemini_pengaman_sekolah g
    join public.sekolah s on s.id = g.sekolah_id
  ) x;
$$;

revoke all on function public.gemini_ambil_izin(bigint,text) from public, anon, authenticated;
grant execute on function public.gemini_ambil_izin(bigint,text) to service_role;
revoke all on function public.gemini_catat_hasil(bigint,text,text,integer,text,integer) from public, anon, authenticated;
grant execute on function public.gemini_catat_hasil(bigint,text,text,integer,text,integer) to service_role;
revoke all on function public.developer_gemini_pengaman() from public, anon, authenticated;
grant execute on function public.developer_gemini_pengaman() to service_role;
