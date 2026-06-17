create table if not exists public.bet_board_state (
  id text primary key,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_bet_board_state_updated_at on public.bet_board_state;

create trigger set_bet_board_state_updated_at
before update on public.bet_board_state
for each row
execute function public.set_updated_at();

alter table public.bet_board_state enable row level security;

drop policy if exists "Anyone can read bet board state" on public.bet_board_state;
drop policy if exists "Anyone can create bet board state" on public.bet_board_state;
drop policy if exists "Anyone can update bet board state" on public.bet_board_state;

create policy "Anyone can read bet board state"
on public.bet_board_state
for select
to anon
using (true);

create policy "Anyone can create bet board state"
on public.bet_board_state
for insert
to anon
with check (true);

create policy "Anyone can update bet board state"
on public.bet_board_state
for update
to anon
using (true)
with check (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'bet_board_state'
  ) then
    alter publication supabase_realtime add table public.bet_board_state;
  end if;
end;
$$;
