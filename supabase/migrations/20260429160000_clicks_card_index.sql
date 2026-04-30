-- Distinguish page visits (null) from landing link-card taps (0-based index in landing_cards order).
alter table public.clicks
  add column if not exists card_index integer null;

comment on column public.clicks.card_index is 'When null, row counts as a page visit. When set, counts as a tap on landing_cards[card_index].';
