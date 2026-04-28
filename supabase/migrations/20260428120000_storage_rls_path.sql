-- Harden storage RLS: first path segment must match auth.uid() (same as foldername[1] for userId/file.ext)

drop policy if exists "screenshots_authenticated_insert" on storage.objects;
drop policy if exists "screenshots_authenticated_update" on storage.objects;
drop policy if exists "screenshots_authenticated_delete" on storage.objects;

create policy "screenshots_authenticated_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "screenshots_authenticated_update"
  on storage.objects for update
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );

create policy "screenshots_authenticated_delete"
  on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and split_part(name, '/', 1) = auth.uid()::text
  );
