-- Run once in your Supabase project's SQL Editor. This creates one public
-- attachment bucket; it does not modify existing application buckets/policies.
-- Public reads are intentional: the files are shared in public GitHub issues.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'character-card-attachments', 'character-card-attachments', true, 20971520,
  array['image/png', 'image/jpeg', 'image/webp', 'text/plain', 'audio/mpeg', 'audio/wav']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Each authenticated GitHub user can only add new files in their own UUID
-- prefix. No client update/delete policy: existing issue links stay intact.
drop policy if exists "heim_creator_insert_own_attachments" on storage.objects;
create policy "heim_creator_insert_own_attachments"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'character-card-attachments'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select auth.jwt() -> 'app_metadata' ->> 'provider') = 'github'
  and array_length(storage.foldername(name), 1) = 2
  and lower(storage.extension(name)) in ('png', 'jpg', 'jpeg', 'webp', 'txt', 'mp3', 'wav')
);

-- No SELECT policy is required for the public download URLs; uploads require
-- a valid Supabase user JWT. Do not use a service_role key in the browser.
