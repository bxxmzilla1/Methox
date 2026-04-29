-- Store landing hero screenshot path for presets (scoped to preset id in screenshots bucket).
alter table public.landing_presets add column if not exists hero_image_path text;
