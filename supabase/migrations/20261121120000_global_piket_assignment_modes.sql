-- Dua mode penugasan untuk jenis piket dengan cakupan seluruh kelas.
-- kelas_utuh: satu jadwal untuk satu kelas atau seluruh kelas tanpa siswa_id.
-- siswa_gabungan: satu baris per siswa, dengan kelas_id dan siswa_id yang tervalidasi.
-- siswa_per_kelas: penugasan individual untuk jenis piket cakupan kelas.
alter table public.piket_jadwal
  add column if not exists mode_penugasan text not null default 'kelas_utuh';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.piket_jadwal'::regclass
      and conname='piket_jadwal_mode_penugasan_check'
  ) then
    alter table public.piket_jadwal
      add constraint piket_jadwal_mode_penugasan_check
      check (mode_penugasan in ('kelas_utuh','siswa_per_kelas','siswa_gabungan'));
  end if;
end $$;

update public.piket_jadwal j
set mode_penugasan = case when k.cakupan='kelas' then 'siswa_per_kelas' else 'kelas_utuh' end
from public.piket_jenis k
where k.id=j.jenis_id
  and j.mode_penugasan='kelas_utuh'
  and ((k.cakupan='kelas' and j.siswa_id is not null)
    or (k.cakupan='semua' and j.siswa_id is null));

create or replace function public.trg_piket_jadwal_cek()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare j record; k record; s record;
begin
  select sekolah_id, cakupan into j from public.piket_jenis where id=new.jenis_id;
  if not found or j.sekolah_id<>new.sekolah_id then raise exception 'Jenis piket tidak valid'; end if;
  if new.kelas_id is not null then
    select sekolah_id into k from public.kelas where id=new.kelas_id;
    if not found or k.sekolah_id<>new.sekolah_id then raise exception 'Kelas tidak valid'; end if;
  end if;
  if j.cakupan='kelas' then
    if new.kelas_id is null or new.siswa_id is null then raise exception 'Piket per kelas wajib memilih kelas dan siswa'; end if;
    select sekolah_id,kelas_id into s from public.siswa where id=new.siswa_id;
    if not found or s.sekolah_id<>new.sekolah_id or s.kelas_id is distinct from new.kelas_id then
      raise exception 'Siswa bukan anggota kelas ini';
    end if;
    if new.mode_penugasan not in ('siswa_per_kelas','kelas_utuh') then raise exception 'Mode piket per kelas tidak valid'; end if;
  elsif j.cakupan='semua' then
    if new.mode_penugasan='kelas_utuh' then
      if new.siswa_id is not null then raise exception 'Piket kelas utuh tidak memakai siswa_id'; end if;
    elsif new.mode_penugasan='siswa_gabungan' then
      if new.kelas_id is null or new.siswa_id is null then raise exception 'Piket gabungan siswa wajib memilih kelas dan siswa'; end if;
      select sekolah_id,kelas_id into s from public.siswa where id=new.siswa_id;
      if not found or s.sekolah_id<>new.sekolah_id or s.kelas_id is distinct from new.kelas_id then
        raise exception 'Siswa bukan anggota kelas ini';
      end if;
    else raise exception 'Mode piket seluruh kelas tidak valid';
    end if;
  else raise exception 'Cakupan piket tidak valid';
  end if;
  return new;
end
$function$;
