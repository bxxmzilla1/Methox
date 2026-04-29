-- Landing page presets: saved configurations reusable across links
create table if not exists public.landing_presets (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'My preset',
  display_name  text not null default '',
  handle        text not null default '',
  landing_bio   text not null default '',
  landing_cards jsonb not null default '[]'::jsonb,
  landing_hero_focus jsonb not null default '{"x":50,"y":50,"scale":1}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.landing_presets enable row level security;

create policy "owner select" on public.landing_presets
  for select using (auth.uid() = user_id);

create policy "owner insert" on public.landing_presets
  for insert with check (auth.uid() = user_id);

create policy "owner update" on public.landing_presets
  for update using (auth.uid() = user_id);

create policy "owner delete" on public.landing_presets
  for delete using (auth.uid() = user_id);

create index if not exists landing_presets_user_id_idx on public.landing_presets(user_id);
