-- Public page: redirect vs customizable landing, profile fields, social + card JSON

alter table public.links
  add column if not exists public_page_mode text not null default 'landing';

alter table public.links
  add constraint links_public_page_mode_check
  check (public_page_mode in ('landing', 'redirect'));

alter table public.links
  add column if not exists display_name text not null default '';

alter table public.links
  add column if not exists handle text not null default '';

alter table public.links
  add column if not exists verified boolean not null default false;

alter table public.links
  add column if not exists follower_summary text not null default '';

alter table public.links
  add column if not exists social_links jsonb not null default '[]'::jsonb;

alter table public.links
  add column if not exists landing_cards jsonb not null default '[]'::jsonb;
