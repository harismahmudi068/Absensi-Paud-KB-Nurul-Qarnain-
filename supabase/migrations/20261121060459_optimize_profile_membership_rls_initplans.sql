alter policy "baca" on public.keanggotaan
using (
  (select public.adalah_developer_aal2())
  or profil_id = (select auth.uid())
  or sekolah_id in (select public.sekolah_saya())
);

alter policy "baca" on public.profil
using (
  (select public.adalah_developer_aal2())
  or id = (select auth.uid())
  or exists (
    select 1
    from public.keanggotaan k
    where k.profil_id = profil.id
      and k.sekolah_id in (select public.sekolah_saya())
  )
);

alter policy "ubah" on public.profil
using (
  id = (select auth.uid())
  or (select public.adalah_developer_aal2())
)
with check (
  id = (select auth.uid())
  or (select public.adalah_developer_aal2())
);
