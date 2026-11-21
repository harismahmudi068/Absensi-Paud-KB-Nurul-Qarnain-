do $migration$
declare
  v_def text;
  v_old_notif text := '  delete from public.notifikasi_alpa     where dibuat  < v_awal;';
  v_new_notif text := '  delete from public.notifikasi_alpa     where dibuat  < v_awal - interval ''2 days'';';
  v_old_audit text := '  delete from public.log_audit           where waktu   < v_awal - interval ''2 days'';';
  v_new_audit text := '  delete from public.log_audit           where waktu   < v_awal - interval ''6 days'';';
begin
  select pg_get_functiondef('public.bersihkan_data_lama()'::regprocedure)
    into v_def;

  if position(v_old_notif in v_def) = 0 then
    raise exception 'Pola pembersihan notifikasi_alpa berubah; migrasi dibatalkan tanpa perubahan.';
  end if;
  if position(v_old_audit in v_def) = 0 then
    raise exception 'Pola pembersihan log_audit berubah; migrasi dibatalkan tanpa perubahan.';
  end if;
  if position(v_new_notif in v_def) > 0 or position(v_new_audit in v_def) > 0 then
    raise exception 'Fungsi sudah memuat salah satu aturan retensi baru; tinjau manual.';
  end if;

  v_def := replace(v_def, v_old_notif, v_new_notif);
  v_def := replace(v_def, v_old_audit, v_new_audit);
  execute v_def;
end
$migration$;

revoke execute on function public.sinkronkan_jadwal_alpa() from public, anon, authenticated;
grant execute on function public.sinkronkan_jadwal_alpa() to service_role;

do $verify$
declare
  v_def text;
begin
  select pg_get_functiondef('public.bersihkan_data_lama()'::regprocedure) into v_def;

  if position('notifikasi_alpa     where dibuat  < v_awal - interval ''2 days''' in v_def) = 0 then
    raise exception 'Verifikasi retensi notifikasi_alpa gagal.';
  end if;
  if position('log_audit           where waktu   < v_awal - interval ''6 days''' in v_def) = 0 then
    raise exception 'Verifikasi retensi log_audit gagal.';
  end if;
  if has_function_privilege('anon', 'public.sinkronkan_jadwal_alpa()', 'EXECUTE')
     or has_function_privilege('authenticated', 'public.sinkronkan_jadwal_alpa()', 'EXECUTE') then
    raise exception 'Verifikasi pembatasan RPC sinkronkan_jadwal_alpa gagal.';
  end if;
  if not has_function_privilege('service_role', 'public.sinkronkan_jadwal_alpa()', 'EXECUTE') then
    raise exception 'service_role tidak memiliki hak EXECUTE pada sinkronkan_jadwal_alpa.';
  end if;
end
$verify$;
