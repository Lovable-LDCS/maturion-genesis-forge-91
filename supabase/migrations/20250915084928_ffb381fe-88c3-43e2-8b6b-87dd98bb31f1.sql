-- 1) Keep bucket PRIVATE (do not flip to public)
-- If it already exists, this does nothing and preserves 'public=false'
insert into storage.buckets (id, name, public, file_size_limit)
values ('org_branding', 'org_branding', false, 5242880)  -- 5MB is ample for logos; raise if truly needed
on conflict (id) do nothing;

-- 2) Ensure org branding columns (keep a check on header_mode)
alter table organizations
  add column if not exists brand_logo_light_path        text,
  add column if not exists brand_logo_dark_path         text,
  add column if not exists brand_wordmark_black_path    text,
  add column if not exists brand_wordmark_white_path    text,
  add column if not exists brand_favicon_path           text,
  add column if not exists brand_primary_hex            text,
  add column if not exists brand_secondary_hex          text,
  add column if not exists brand_text_hex               text,
  add column if not exists brand_font_css               text,
  add column if not exists brand_header_mode            text
    check (brand_header_mode in ('light','dark'));

-- 3) Recreate storage policies with tight guards (NO public select)
drop policy if exists "org_branding_insert_admin" on storage.objects;
drop policy if exists "org_branding_update_admin" on storage.objects;
drop policy if exists "org_branding_delete_admin" on storage.objects;
drop policy if exists "org_branding_select_public" on storage.objects;  -- remove broad public read

-- INSERT: admins/owners only; restrict to /logo OR /branding and safe extensions (including svg)
create policy "org_branding_insert_admin"
on storage.objects
for insert
with check (
  bucket_id = 'org_branding'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'org'
  and ((storage.foldername(name))[3] = 'logo' or (storage.foldername(name))[3] = 'branding')
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
  and lower(storage.extension(name)) in ('png','webp','jpg','jpeg','svg')
);

-- UPDATE: mirror the same guards in USING and WITH CHECK
create policy "org_branding_update_admin"
on storage.objects
for update
using (
  bucket_id = 'org_branding'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'org'
  and ((storage.foldername(name))[3] = 'logo' or (storage.foldername(name))[3] = 'branding')
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
)
with check (
  bucket_id = 'org_branding'
  and (storage.foldername(name))[1] = 'org'
  and ((storage.foldername(name))[3] = 'logo' or (storage.foldername(name))[3] = 'branding')
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
  and lower(storage.extension(name)) in ('png','webp','jpg','jpeg','svg')
);

-- DELETE: scoped to the same org/subfolders
create policy "org_branding_delete_admin"
on storage.objects
for delete
using (
  bucket_id = 'org_branding'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = 'org'
  and ((storage.foldername(name))[3] = 'logo' or (storage.foldername(name))[3] = 'branding')
  and public.has_org_role((storage.foldername(name))[2]::uuid, array['admin','owner'])
);