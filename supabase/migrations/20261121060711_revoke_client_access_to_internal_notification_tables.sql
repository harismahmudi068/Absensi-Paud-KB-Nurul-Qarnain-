revoke all privileges on table
  public.notif_antrean,
  public.notif_siswa_jam,
  public.notifikasi_alpa,
  public.pesan_dedup
from public, anon, authenticated;

do $verify$
begin
  if has_table_privilege('anon','public.notif_antrean','SELECT')
     or has_table_privilege('authenticated','public.notif_antrean','SELECT')
     or has_table_privilege('anon','public.notif_siswa_jam','SELECT')
     or has_table_privilege('authenticated','public.notif_siswa_jam','SELECT')
     or has_table_privilege('anon','public.notifikasi_alpa','SELECT')
     or has_table_privilege('authenticated','public.notifikasi_alpa','SELECT')
     or has_table_privilege('anon','public.pesan_dedup','SELECT')
     or has_table_privilege('authenticated','public.pesan_dedup','SELECT') then
    raise exception 'Akses langsung ke tabel internal masih terbuka.';
  end if;

  if not has_table_privilege('service_role','public.notif_antrean','SELECT')
     or not has_table_privilege('service_role','public.notif_siswa_jam','SELECT')
     or not has_table_privilege('service_role','public.notifikasi_alpa','SELECT')
     or not has_table_privilege('service_role','public.pesan_dedup','SELECT') then
    raise exception 'Hak service_role ke tabel internal berubah; migrasi dibatalkan.';
  end if;
end
$verify$;
