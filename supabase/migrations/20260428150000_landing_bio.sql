-- Separate public landing bio from dashboard-only bio (`bio`).
alter table public.links
  add column if not exists landing_bio text not null default '';

-- Previously the landing page read `bio`; keep public text after the split.
update public.links
set landing_bio = bio;
