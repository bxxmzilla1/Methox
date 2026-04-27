-- Add optional display username per link (run in Supabase SQL Editor if you already applied the initial migration.)

alter table public.links
  add column if not exists username text not null default '';
