alter function public.boleh_antre_notif_siswa() set search_path = public;
alter function public.waktu_kirim_notif_siswa() set search_path = public;
alter function public.pengaturan_jaga_push() set search_path = public;
alter function public.hitung_jadwal_alpa_gmt() set search_path = public;
alter function public.libur_berlaku(date, bigint, bigint) set search_path = public;
alter function public.rapor_mapel_bawaan(bigint) set search_path = public;
alter function public.saldo_siswa(bigint[]) set search_path = public;
