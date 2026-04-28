-- Landing hero vs dashboard screenshot; focal point for hero + cards (mobile framing)

alter table public.links
  add column if not exists hero_image_path text;

alter table public.links
  add column if not exists landing_hero_focus jsonb not null default '{"x":50,"y":50}'::jsonb;

-- Existing rows used screenshot_path for the landing hero; copy into hero_image_path.
update public.links
set hero_image_path = screenshot_path
where hero_image_path is null
  and screenshot_path is not null;

-- Stop using the same file for the dashboard "screenshot" card when it was only the hero
-- (paths like userId/linkId.ext — not card uploads under .../cards/).
update public.links
set screenshot_path = null
where screenshot_path is not null
  and hero_image_path is not null
  and screenshot_path = hero_image_path
  and position('/cards/' in screenshot_path) = 0;
