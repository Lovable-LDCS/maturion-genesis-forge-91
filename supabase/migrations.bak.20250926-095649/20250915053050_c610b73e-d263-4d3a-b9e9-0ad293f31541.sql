-- Helper: role-based access with safe search_path
create or replace function public.has_org_role(org_id_param uuid, allowed_roles_param text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id_param
      and m.user_id = auth.uid()
      and m.role = any(allowed_roles_param)
  );
$$;

-- Optional: membership helper if still used
create or replace function public.is_org_member(org_id_param uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org_id_param
      and m.user_id = auth.uid()
  );
$$;

-- Cleanup existing policies
drop policy if exists "org_branding_read_member"   on storage.objects;
drop policy if exists "org_branding_insert_member" on storage.objects;
drop policy if exists "org_branding_update_member" on storage.objects;
drop policy if exists "org_branding_delete_member" on storage.objects;
drop policy if exists "org_branding_insert_admin"  on storage.objects;
drop policy if exists "org_branding_update_admin"  on storage.objects;
drop policy if exists "org_branding_delete_admin"  on storage.objects;

-- READ: members (or switch to has_org_role with viewer roles if desired)
create policy "org_branding_read_member"
on storage.objects
for select
using (
  bucket_id = 'org_branding'
  and (storage.foldername(name))[1] = 'org'
  and public.is_org_member((storage.foldername(name))[2]::uuid)
);

-- INSERT: admins/owners only
create policy "org_branding_insert_admin"
on storage.objects
for insert
with check (
  bucket_id = 'org_branding'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'org'
  and (storage.foldername(name))[3] = 'logo'
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
  and lower(storage.extension(name)) in ('png','webp','jpg','jpeg')
);

-- UPDATE: admins/owners only, mirror checks
create policy "org_branding_update_admin"
on storage.objects
for update
using (
  bucket_id = 'org_branding'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'org'
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
)
with check (
  bucket_id = 'org_branding'
  and (storage.foldername(name))[1] = 'org'
  and (storage.foldername(name))[3] = 'logo'
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
  and lower(storage.extension(name)) in ('png','webp','jpg','jpeg')
);

-- DELETE: admins/owners only, scoped
create policy "org_branding_delete_admin"
on storage.objects
for delete
using (
  bucket_id = 'org_branding'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'org'
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
);