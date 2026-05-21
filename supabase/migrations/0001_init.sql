-- UNSW Infinite Life Sim — initial schema
-- Apply with: supabase db push
-- Or paste this file into the Supabase SQL editor.

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- profiles: mirrors auth.users with the bits we want to query (display name,
-- avatar, and a stable HSL hue for graph coloring).
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  hue integer not null check (hue >= 0 and hue < 360),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  computed_hue integer;
  fallback_name text;
begin
  computed_hue := (('x' || substring(md5(new.id::text), 1, 7))::bit(28)::int) % 360;
  if computed_hue < 0 then
    computed_hue := computed_hue + 360;
  end if;

  fallback_name := coalesce(
    nullif(new.raw_user_meta_data->>'name', ''),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Player'
  );

  insert into public.profiles (id, display_name, avatar_url, hue)
  values (
    new.id,
    fallback_name,
    new.raw_user_meta_data->>'avatar_url',
    computed_hue
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- characters: a player's persona. One user can have many characters.
-- current_node_id is set whenever the player advances or jumps. The actual
-- next-scene fork is computed by reading character.current_node_id and using
-- it as the new node's parent_id.
-- ---------------------------------------------------------------------------
create table if not exists public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  avatar_config jsonb not null default '{}'::jsonb,
  stats jsonb not null default '{"energy":70,"study":30,"social":40,"money":80}'::jsonb,
  current_node_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists characters_user_idx on public.characters(user_id);

-- ---------------------------------------------------------------------------
-- nodes: every scene the LLM has ever generated. Author-attributed, so a
-- node belongs to whoever made it; a character_id is the persona that was
-- playing. parent_id can point to any node (including another author's),
-- which is what enables jump-back and cross-user forks.
-- ---------------------------------------------------------------------------
create table if not exists public.nodes (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.nodes(id) on delete set null,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  character_id uuid not null references public.characters(id) on delete cascade,
  scene_text text not null,
  location text not null,
  game_time timestamptz not null,
  stats_snapshot jsonb not null,
  preset_choices jsonb not null,
  chosen_action text,
  is_public boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists nodes_parent_idx on public.nodes(parent_id);
create index if not exists nodes_author_idx on public.nodes(author_user_id);
create index if not exists nodes_character_idx on public.nodes(character_id);
create index if not exists nodes_public_recent_idx
  on public.nodes(is_public, created_at desc)
  where is_public;

-- characters.current_node_id -> nodes(id) (circular FK, both nullable)
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'characters_current_node_fk'
      and table_schema = 'public'
  ) then
    alter table public.characters
      add constraint characters_current_node_fk
      foreign key (current_node_id) references public.nodes(id) on delete set null;
  end if;
end$$;

-- ---------------------------------------------------------------------------
-- location_index: one row per (node, location, time_bucket). Used to find
-- candidate crossings BEFORE the LLM call so other players' recent scenes
-- can be woven into yours.
-- ---------------------------------------------------------------------------
create table if not exists public.location_index (
  node_id uuid primary key references public.nodes(id) on delete cascade,
  location text not null,
  time_bucket text not null,
  character_id uuid not null references public.characters(id) on delete cascade,
  author_user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists location_index_loc_bucket_idx
  on public.location_index(location, time_bucket);
create index if not exists location_index_character_idx
  on public.location_index(character_id);

-- ---------------------------------------------------------------------------
-- crossings: persisted only when the LLM actually wove an other-player node
-- into the current scene (returned in `crossedWithNodeIds`). Renders as a
-- colored edge between the two timelines on the graph.
-- ---------------------------------------------------------------------------
create table if not exists public.crossings (
  id uuid primary key default gen_random_uuid(),
  node_a_id uuid not null references public.nodes(id) on delete cascade,
  node_b_id uuid not null references public.nodes(id) on delete cascade,
  location text not null,
  time_bucket text not null,
  created_at timestamptz not null default now(),
  unique (node_a_id, node_b_id),
  check (node_a_id <> node_b_id)
);
create index if not exists crossings_node_a_idx on public.crossings(node_a_id);
create index if not exists crossings_node_b_idx on public.crossings(node_b_id);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.nodes enable row level security;
alter table public.location_index enable row level security;
alter table public.crossings enable row level security;

-- profiles: world-readable (we need display_name + hue for the graph),
-- only self can update.
drop policy if exists "profiles read" on public.profiles;
create policy "profiles read" on public.profiles for select using (true);
drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update" on public.profiles for update
  using (auth.uid() = id) with check (auth.uid() = id);

-- characters: owner full access; readable to others when they have at least
-- one public node (so the explore page can list public characters).
drop policy if exists "characters owner read" on public.characters;
create policy "characters owner read" on public.characters for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.nodes n
      where n.character_id = characters.id and n.is_public
    )
  );
drop policy if exists "characters owner insert" on public.characters;
create policy "characters owner insert" on public.characters for insert
  with check (auth.uid() = user_id);
drop policy if exists "characters owner update" on public.characters;
create policy "characters owner update" on public.characters for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists "characters owner delete" on public.characters;
create policy "characters owner delete" on public.characters for delete
  using (auth.uid() = user_id);

-- nodes: public read for is_public; otherwise only author or the character
-- owner. Only the author may insert / update.
drop policy if exists "nodes read" on public.nodes;
create policy "nodes read" on public.nodes for select
  using (
    is_public
    or auth.uid() = author_user_id
    or exists (
      select 1 from public.characters c
      where c.id = nodes.character_id and c.user_id = auth.uid()
    )
  );
drop policy if exists "nodes author insert" on public.nodes;
create policy "nodes author insert" on public.nodes for insert
  with check (auth.uid() = author_user_id);
drop policy if exists "nodes author update" on public.nodes;
create policy "nodes author update" on public.nodes for update
  using (auth.uid() = author_user_id) with check (auth.uid() = author_user_id);

-- location_index: read whatever you could read the underlying node for;
-- insert only when you're the author of that node.
drop policy if exists "location_index read" on public.location_index;
create policy "location_index read" on public.location_index for select using (true);
drop policy if exists "location_index author insert" on public.location_index;
create policy "location_index author insert" on public.location_index for insert
  with check (auth.uid() = author_user_id);

-- crossings: world-readable; insertable only by the author of one of the
-- nodes involved (typically node_a, the just-created one).
drop policy if exists "crossings read" on public.crossings;
create policy "crossings read" on public.crossings for select using (true);
drop policy if exists "crossings author insert" on public.crossings;
create policy "crossings author insert" on public.crossings for insert
  with check (
    exists (
      select 1 from public.nodes n
      where (n.id = node_a_id or n.id = node_b_id)
        and n.author_user_id = auth.uid()
    )
  );
