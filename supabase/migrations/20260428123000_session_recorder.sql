-- Session Recorder: store rrweb replay chunks per public landing view

create table if not exists public.session_replays (
  id uuid primary key default gen_random_uuid(),
  link_id uuid not null references public.links (id) on delete cascade,
  visitor_id text not null,
  first_url text not null default '',
  user_agent text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists session_replays_link_id_created_at_idx
  on public.session_replays (link_id, created_at desc);

create table if not exists public.session_replay_chunks (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.session_replays (id) on delete cascade,
  seq int not null,
  events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

create index if not exists session_replay_chunks_session_id_seq_idx
  on public.session_replay_chunks (session_id, seq);

alter table public.session_replays enable row level security;
alter table public.session_replay_chunks enable row level security;

-- Anyone can insert replay data (public pages have anonymous visitors).
create policy "session_replays_insert_public"
  on public.session_replays for insert
  with check (true);

create policy "session_replay_chunks_insert_public"
  on public.session_replay_chunks for insert
  with check (true);

-- Only link owners can view replays (via join to links.user_id).
create policy "session_replays_select_owner"
  on public.session_replays for select
  using (
    exists (
      select 1 from public.links l
      where l.id = link_id
        and l.user_id = auth.uid()
    )
  );

create policy "session_replay_chunks_select_owner"
  on public.session_replay_chunks for select
  using (
    exists (
      select 1
      from public.session_replays s
      join public.links l on l.id = s.link_id
      where s.id = session_id
        and l.user_id = auth.uid()
    )
  );

-- Only owner can update metadata (server may update updated_at, etc).
create policy "session_replays_update_owner"
  on public.session_replays for update
  using (
    exists (
      select 1 from public.links l
      where l.id = link_id
        and l.user_id = auth.uid()
    )
  );

