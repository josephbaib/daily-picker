-- Комнаты: список участников и настройки. Одна ссылка = одна комната.
create table if not exists public.rooms (
  id text primary key check (id ~ '^[a-z0-9-]{1,40}$'),
  participants jsonb not null default '[]'::jsonb,
  settings jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- История игр: сид и итоговый порядок. Нужна для честности и строки «вчера первым был».
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  room_id text not null references public.rooms(id),
  played_at timestamptz not null default now(),
  game text not null,
  seed bigint not null,
  order_ids jsonb not null,
  started_by text
);
create index if not exists games_room_played on public.games(room_id, played_at desc);

alter table public.rooms enable row level security;
alter table public.games enable row level security;

-- Командная игра: у кого есть ссылка, тот читает и пишет. Удалять через API нельзя.
create policy "rooms read" on public.rooms for select to anon, authenticated using (true);
create policy "rooms insert" on public.rooms for insert to anon, authenticated with check (true);
create policy "rooms update" on public.rooms for update to anon, authenticated using (true) with check (true);
create policy "games read" on public.games for select to anon, authenticated using (true);
create policy "games insert" on public.games for insert to anon, authenticated with check (true);

-- Реалтайм на изменения таблиц.
alter publication supabase_realtime add table public.rooms;
alter publication supabase_realtime add table public.games;
