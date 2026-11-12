create or replace function public.developer_pemakaian_ai_ringkasan()
returns jsonb
language sql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
    'harian_per_sekolah', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.tanggal desc, x.nama asc) from (
        select r.sekolah_id, s.nama, r.tanggal,
          sum(r.jumlah_permintaan) jumlah_permintaan,
          sum(r.jumlah_berhasil) jumlah_berhasil, sum(r.jumlah_gagal) jumlah_gagal,
          sum(r.jumlah_metadata_tidak_tersedia) jumlah_metadata_tidak_tersedia,
          sum(r.input_tokens) input_tokens, sum(r.output_tokens) output_tokens,
          sum(r.total_tokens) total_tokens
        from public.pemakaian_ai_ringkasan_harian r
        join public.sekolah s on s.id = r.sekolah_id
        where r.tanggal >= (now() at time zone 'Asia/Jakarta')::date - 30
        group by r.sekolah_id, s.nama, r.tanggal
      ) x
    ), '[]'::jsonb),
    'bulanan_per_sekolah', coalesce((
      select jsonb_agg(to_jsonb(x) order by x.bulan desc, x.nama asc) from (
        select r.sekolah_id, s.nama, date_trunc('month', r.tanggal)::date bulan,
          sum(r.jumlah_permintaan) jumlah_permintaan,
          sum(r.jumlah_berhasil) jumlah_berhasil, sum(r.jumlah_gagal) jumlah_gagal,
          sum(r.jumlah_metadata_tidak_tersedia) jumlah_metadata_tidak_tersedia,
          sum(r.input_tokens) input_tokens, sum(r.output_tokens) output_tokens,
          sum(r.total_tokens) total_tokens
        from public.pemakaian_ai_ringkasan_harian r
        join public.sekolah s on s.id = r.sekolah_id
        group by r.sekolah_id, s.nama, date_trunc('month', r.tanggal)
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
$function$;

revoke all on function public.developer_pemakaian_ai_ringkasan() from public, anon, authenticated;
grant execute on function public.developer_pemakaian_ai_ringkasan() to service_role;