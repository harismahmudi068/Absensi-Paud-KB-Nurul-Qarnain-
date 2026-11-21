-- Hanya autentikasi yang sah yang boleh memanggil helper aplikasi.
-- Fungsi login email_dari_username() dan helper RLS rapor_boleh_tulis()
-- sengaja tetap tersedia untuk anon/public sesuai alur yang sedang berjalan.

revoke execute on function public.adalah_developer_aal2() from public, anon;
revoke execute on function public.batalkan_libur(bigint, date, bigint) from public, anon;
revoke execute on function public.developer_alumni_per_sekolah(integer) from public, anon;
revoke execute on function public.developer_hapus_alumni_sekolah(integer, bigint[]) from public, anon;
revoke execute on function public.developer_pendaftaran() from public, anon;
revoke execute on function public.impor_libur_nasional(jsonb, boolean) from public, anon;
revoke execute on function public.kirim_log_boleh_baca(bigint) from public, anon;
revoke execute on function public.nomor_wa_operator(bigint) from public, anon;
revoke execute on function public.ubah_nama_sekolah(text, text) from public, anon;

-- Trigger functions tidak perlu menjadi endpoint RPC. PostgreSQL tetap menjalankannya
-- melalui trigger yang sudah terpasang; izin eksekusi langsung klien dicabut.
revoke execute on function public.jaga_profil() from public, anon, authenticated;
revoke execute on function public.rapor_cek() from public, anon, authenticated;
revoke execute on function public.rapor_ke_alumni() from public, anon, authenticated;
revoke execute on function public.rapor_mapel_cek() from public, anon, authenticated;
revoke execute on function public.trg_hafalan_item_cek() from public, anon, authenticated;
revoke execute on function public.trg_hafalan_setoran_jaga() from public, anon, authenticated;
revoke execute on function public.trg_kelompok_hapus_jaga() from public, anon, authenticated;
revoke execute on function public.trg_notif_absensi() from public, anon, authenticated;
revoke execute on function public.trg_notif_tabungan() from public, anon, authenticated;
revoke execute on function public.trg_pengaturan_sakelar_jaga() from public, anon, authenticated;
revoke execute on function public.trg_piket_jadwal_cek() from public, anon, authenticated;
revoke execute on function public.trg_push_batas() from public, anon, authenticated;
revoke execute on function public.trigger_sinkronkan_jadwal_alpa() from public, anon, authenticated;
revoke execute on function public.trigger_sinkronkan_jadwal_notif_libur() from public, anon, authenticated;

do $verify$
begin
  if has_function_privilege('anon','public.adalah_developer_aal2()','EXECUTE')
     or has_function_privilege('anon','public.batalkan_libur(bigint,date,bigint)','EXECUTE')
     or has_function_privilege('anon','public.developer_alumni_per_sekolah(integer)','EXECUTE')
     or has_function_privilege('anon','public.developer_hapus_alumni_sekolah(integer,bigint[])','EXECUTE')
     or has_function_privilege('anon','public.developer_pendaftaran()','EXECUTE')
     or has_function_privilege('anon','public.impor_libur_nasional(jsonb,boolean)','EXECUTE')
     or has_function_privilege('anon','public.kirim_log_boleh_baca(bigint)','EXECUTE')
     or has_function_privilege('anon','public.nomor_wa_operator(bigint)','EXECUTE')
     or has_function_privilege('anon','public.ubah_nama_sekolah(text,text)','EXECUTE') then
    raise exception 'Ada RPC administratif yang masih dapat dipanggil anon.';
  end if;

  if has_function_privilege('authenticated','public.developer_pendaftaran()','EXECUTE') = false
     or has_function_privilege('authenticated','public.batalkan_libur(bigint,date,bigint)','EXECUTE') = false
     or has_function_privilege('authenticated','public.impor_libur_nasional(jsonb,boolean)','EXECUTE') = false then
    raise exception 'Hak authenticated untuk RPC aplikasi yang sah tidak terjaga.';
  end if;

  if has_function_privilege('anon','public.email_dari_username(text)','EXECUTE') = false then
    raise exception 'Alur login username tidak lagi dapat memanggil email_dari_username.';
  end if;
  if has_function_privilege('anon','public.rapor_boleh_tulis(bigint,bigint)','EXECUTE') = false then
    raise exception 'Helper kebijakan rapor public/anon tidak lagi dapat dipanggil.';
  end if;
end
$verify$;
