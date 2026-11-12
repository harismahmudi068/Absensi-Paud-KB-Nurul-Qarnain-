-- Pemantauan pemakaian Gemini: riwayat 30 hari + ringkasan permanen.
-- Tabel terpisah; tidak mengubah tabel absensi yang sudah ada.

create table if not exists public.pemakaian_ai_riwayat (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  sekolah_id bigint not null references public.sekolah(id) on delete cascade,
  layanan text not null check (layanan in ('analisis','terjemahan')),
  model text not null,
  input_tokens integer,
  output_tokens integer,
  total_tokens integer,
  status text not null check (status in ('berhasil','gagal','metadata_tidak_tersedia')),
  kode_error text
);

create index if not exists idx_pemakaian_ai_riwayat_created
  on public.pemakaian_ai_riwayat (created_at desc);
create index if not exists idx_pemakaian_ai_riwayat_sekolah_created
  on public.pemakaian_ai_riwayat (sekolah_id, created_at desc);

create table if not exists public.pemakaian_ai_ringkasan_harian (
  tanggal date not null,
  sekolah_id bigint not null references public.sekolah(id) on delete cascade,
  layanan text not null check (layanan in ('analisis','terjemahan')),
  model text not null,
  jumlah_permintaan bigint not null default 0,
  jumlah_berhasil bigint not null default 0,
  jumlah_gagal bigint not null default 0,
  jumlah_metadata_tidak_tersedia bigint not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  total_tokens bigint not null default 0,
  diperbarui timestamptz not null default now(),
  primary key (tanggal, sekolah_id, layanan, model)
);

create index if not exists idx_pemakaian_ai_ringkasan_tanggal
  on public.pemakaian_ai_ringkasan_harian (tanggal desc);
create index if not exists idx_pemakaian_ai_ringkasan_sekolah
  on public.pemakaian_ai_ringkasan_harian (sekolah_id, tanggal desc);

alter table public.pemakaian_ai_riwayat enable row level security;
alter table public.pemakaian_ai_ringkasan_harian enable row level security;
revoke all on public.pemakaian_ai_riwayat from anon, authenticated;
revoke all on public.pemakaian_ai_ringkasan_harian from anon, authenticated;
grant all on public.pemakaian_ai_riwayat to service_role;
grant all on public.pemakaian_ai_ringkasan_harian to service_role;
grant usage, select on sequence public.pemakaian_ai_riwayat_id_seq to service_role;

create or replace function public.catat_pemakaian_ai(
  p_sekolah_id bigint,
  p_layanan text,
  p_model text,
  p_input_tokens integer,
  p_output_tokens integer,
  p_total_tokens integer,
  p_status text,
  p_kode_error text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_tanggal date := (now() at time zone 'Asia/Jakarta')::date;
  v_model text := left(coalesce(nullif(trim(p_model), ''), 'tidak_diketahui'), 80);
  v_layanan text := coalesce(p_layanan, '');
  v_status text := coalesce(p_status, '');
begin
  if p_sekolah_id is null or v_layanan not in ('analisis','terjemahan')
     or v_status not in ('berhasil','gagal','metadata_tidak_tersedia') then
    raise exception 'Parameter pemakaian AI tidak valid';
  end if;

  insert into public.pemakaian_ai_riwayat
    (sekolah_id, layanan, model, input_tokens, output_tokens, total_tokens, status, kode_error)
  values
    (p_sekolah_id, v_layanan, v_model,
     case when p_input_tokens >= 0 then p_input_tokens else null end,
     case when p_output_tokens >= 0 then p_output_tokens else null end,
     case when p_total_tokens >= 0 then p_total_tokens else null end,
     v_status, left(nullif(trim(p_kode_error), ''), 50));

  insert into public.pemakaian_ai_ringkasan_harian (
    tanggal, sekolah_id, layanan, model, jumlah_permintaan, jumlah_berhasil,
    jumlah_gagal, jumlah_metadata_tidak_tersedia, input_tokens, output_tokens, total_tokens, diperbarui
  ) values (
    v_tanggal, p_sekolah_id, v_layanan, v_model, 1,
    case when v_status in ('berhasil','metadata_tidak_tersedia') then 1 else 0 end,
    case when v_status = 'gagal' then 1 else 0 end,
    case when v_status = 'metadata_tidak_tersedia' then 1 else 0 end,
    greatest(coalesce(p_input_tokens,0),0),
    greatest(coalesce(p_output_tokens,0),0),
    greatest(coalesce(p_total_tokens,0),0),
    now()
  )
  on conflict (tanggal, sekolah_id, layanan, model) do update set
    jumlah_permintaan = public.pemakaian_ai_ringkasan_harian.jumlah_permintaan + 1,
    jumlah_berhasil = public.pemakaian_ai_ringkasan_harian.jumlah_berhasil +
      excluded.jumlah_berhasil,
    jumlah_gagal = public.pemakaian_ai_ringkasan_harian.jumlah_gagal + excluded.jumlah_gagal,
    jumlah_metadata_tidak_tersedia = public.pemakaian_ai_ringkasan_harian.jumlah_metadata_tidak_tersedia +
      excluded.jumlah_metadata_tidak_tersedia,
    input_tokens = public.pemakaian_ai_ringkasan_harian.input_tokens + excluded.input_tokens,
    output_tokens = public.pemakaian_ai_ringkasan_harian.output_tokens + excluded.output_tokens,
    total_tokens = public.pemakaian_ai_ringkasan_harian.total_tokens + excluded.total_tokens,
    diperbarui = now();
end;
$$;

create or replace function public.developer_pemakaian_ai_ringkasan()
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'total', (
      select jsonb_build_object(
        'jumlah_permintaan', coalesce(sum(jumlah_permintaan),0),
        'jumlah_berhasil', coalesce(sum(jumlah_berhasil),0),
        'jumlah_gagal', coalesce(sum(jumlah_gagal),0),
        'jumlah_metadata_tidak_tersedia', coalesce(sum(jumlah_metadata_tidak_tersedia),0),
        'input_tokens', coalesce(sum(input_tokens),0),
        'output_tokens', coalesce(sum(output_tokens),0),
        'total_tokens', coalesce(sum(total_tokens),0)
      ) from public.pemakaian_ai_ringkasan_harian
    ),
    'harian', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.tanggal desc) from (
        select tanggal, sum(jumlah_permintaan) jumlah_permintaan,
          sum(jumlah_berhasil) jumlah_berhasil, sum(jumlah_gagal) jumlah_gagal,
          sum(jumlah_metadata_tidak_tersedia) jumlah_metadata_tidak_tersedia,
          sum(input_tokens) input_tokens, sum(output_tokens) output_tokens,
          sum(total_tokens) total_tokens
        from public.pemakaian_ai_ringkasan_harian
        where tanggal >= (now() at time zone 'Asia/Jakarta')::date - 30
        group by tanggal order by tanggal desc limit 31
      ) x
    ), '[]'::jsonb),
    'bulanan', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.bulan desc) from (
        select date_trunc('month', tanggal)::date bulan,
          sum(jumlah_permintaan) jumlah_permintaan, sum(jumlah_berhasil) jumlah_berhasil,
          sum(jumlah_gagal) jumlah_gagal,
          sum(jumlah_metadata_tidak_tersedia) jumlah_metadata_tidak_tersedia,
          sum(input_tokens) input_tokens, sum(output_tokens) output_tokens,
          sum(total_tokens) total_tokens
        from public.pemakaian_ai_ringkasan_harian
        group by date_trunc('month', tanggal) order by bulan desc
      ) x
    ), '[]'::jsonb),
    'per_sekolah', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.total_tokens desc) from (
        select s.id sekolah_id, s.nama,
          sum(r.jumlah_permintaan) jumlah_permintaan,
          sum(r.jumlah_berhasil) jumlah_berhasil, sum(r.jumlah_gagal) jumlah_gagal,
          sum(r.input_tokens) input_tokens, sum(r.output_tokens) output_tokens,
          sum(r.total_tokens) total_tokens
        from public.pemakaian_ai_ringkasan_harian r
        join public.sekolah s on s.id = r.sekolah_id
        group by s.id, s.nama
      ) x
    ), '[]'::jsonb),
    'per_layanan', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.layanan) from (
        select layanan, sum(jumlah_permintaan) jumlah_permintaan,
          sum(jumlah_berhasil) jumlah_berhasil, sum(jumlah_gagal) jumlah_gagal,
          sum(input_tokens) input_tokens, sum(output_tokens) output_tokens,
          sum(total_tokens) total_tokens
        from public.pemakaian_ai_ringkasan_harian group by layanan
      ) x
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.catat_pemakaian_ai(bigint,text,text,integer,integer,integer,text,text) from public, anon, authenticated;
grant execute on function public.catat_pemakaian_ai(bigint,text,text,integer,integer,integer,text,text) to service_role;
revoke all on function public.developer_pemakaian_ai_ringkasan() from public, anon, authenticated;
grant execute on function public.developer_pemakaian_ai_ringkasan() to service_role;

do $$
begin
  if not exists (
    select 1 from cron.job
    where command like '%DELETE FROM public.pemakaian_ai_riwayat%'
       or command like '%delete from public.pemakaian_ai_riwayat%'
  ) then
    perform cron.schedule(
      '5 17 * * *',
      $job$delete from public.pemakaian_ai_riwayat where created_at < now() - interval '30 days'$job$
    );
  end if;
end
$$;
