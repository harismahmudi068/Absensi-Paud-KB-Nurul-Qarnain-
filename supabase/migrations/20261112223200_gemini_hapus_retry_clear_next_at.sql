-- Unschedule retry AI and clear the persisted next_retry_at marker.
create or replace function public.gemini_hapus_retry(p_sekolah_id bigint)
returns boolean
language plpgsql
security definer
set search_path = public, cron, pg_temp
as $$
declare
  v_job_id bigint;
  v_unscheduled boolean := false;
begin
  select jobid into v_job_id
  from cron.job
  where jobname = 'gemini-retry-' || p_sekolah_id::text;

  if v_job_id is not null then
    v_unscheduled := cron.unschedule(v_job_id);
  end if;

  update public.gemini_pengaman_sekolah
  set next_retry_at = null, diperbarui = now()
  where sekolah_id = p_sekolah_id
    and model = 'gemini-3.5-flash-lite';

  return coalesce(v_unscheduled,false);
end;
$$;

revoke all on function public.gemini_hapus_retry(bigint) from public, anon, authenticated;
grant execute on function public.gemini_hapus_retry(bigint) to service_role;
