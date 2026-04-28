-- Sidebar / path & preview bio is separate from `bio` (redirect stash) and `landing_bio` (public page).
alter table public.links
  add column if not exists dashboard_bio text not null default '';

update public.links
set dashboard_bio = bio;
