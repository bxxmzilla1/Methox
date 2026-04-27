-- METHOX: links, clicks, storage
-- Run this in Supabase SQL Editor or via CLI after linking the project.

create table if not exists public.links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  slug text not null unique,
  bio text not null default '',
  screenshot_path text,
  destination_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clicks (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links (id) on delete cascade,
  visitor_id text not null,
  country text not null default 'unknown',
  created_at timestamptz not null default now()
);

create index if not exists clicks_link_id_idx on public.clicks (link_id);
create index if not exists clicks_link_visitor_idx on public.clicks (link_id, visitor_id);
create index if not exists links_user_id_idx on public.links (user_id);

alter table public.links enable row level security;
alter table public.clicks enable row level security;

create policy "links_select_public"
  on public.links for select
  using (true);

create policy "links_insert_own"
  on public.links for insert
  with check (auth.uid() = user_id);

create policy "links_update_own"
  on public.links for update
  using (auth.uid() = user_id);

create policy "links_delete_own"
  on public.links for delete
  using (auth.uid() = user_id);

create policy "clicks_insert_if_link_exists"
  on public.clicks for insert
  with check (
    exists (select 1 from public.links l where l.id = link_id)
  );

create policy "clicks_select_own_links"
  on public.clicks for select
  using (
    exists (
      select 1 from public.links l
      where l.id = link_id and l.user_id = auth.uid()
    )
  );

insert into storage.buckets (id, name, public)
values ('screenshots', 'screenshots', true)
on conflict (id) do nothing;

create policy "screenshots_public_read"
  on storage.objects for select
  using (bucket_id = 'screenshots');

create policy "screenshots_authenticated_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "screenshots_authenticated_update"
  on storage.objects for update
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername (name))[1] = auth.uid()::text
  );

create policy "screenshots_authenticated_delete"
  on storage.objects for delete
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
    and (storage.foldername (name))[1] = auth.uid()::text
  );
