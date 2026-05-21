-- Returns the ancestry from root -> target (target last) of any node, joined
-- with each ancestor's author display name + hue. Used by /api/scene/next to
-- feed the full story-so-far into the LLM prompt.
--
-- security invoker is the default: the recursive CTE will only return rows
-- the caller can read under RLS, which is fine because we only ever ask
-- about ancestors of a node the caller could already see.

create or replace function public.node_ancestry(target uuid)
returns table (
  id uuid,
  parent_id uuid,
  author_user_id uuid,
  author_display_name text,
  author_hue integer,
  character_id uuid,
  scene_text text,
  location text,
  game_time timestamptz,
  stats_snapshot jsonb,
  preset_choices jsonb,
  chosen_action text,
  created_at timestamptz,
  depth integer
)
language sql
stable
as $$
  with recursive ancestry as (
    select n.*, 0 as depth
    from public.nodes n
    where n.id = target
    union all
    select n.*, a.depth + 1
    from public.nodes n
    join ancestry a on n.id = a.parent_id
  )
  select a.id, a.parent_id, a.author_user_id, p.display_name, p.hue,
         a.character_id, a.scene_text, a.location, a.game_time,
         a.stats_snapshot, a.preset_choices, a.chosen_action, a.created_at,
         a.depth
  from ancestry a
  join public.profiles p on p.id = a.author_user_id
  order by depth desc;
$$;

grant execute on function public.node_ancestry(uuid) to anon, authenticated;


-- Returns the subtree rooted at a node (the node and all descendants),
-- joined with author info. Used by /graph and /node/[id] views.
create or replace function public.node_subtree(target uuid, max_depth integer default 200)
returns table (
  id uuid,
  parent_id uuid,
  author_user_id uuid,
  author_display_name text,
  author_hue integer,
  character_id uuid,
  scene_text text,
  location text,
  game_time timestamptz,
  preset_choices jsonb,
  chosen_action text,
  created_at timestamptz,
  depth integer
)
language sql
stable
as $$
  with recursive subtree as (
    select n.*, 0 as depth
    from public.nodes n
    where n.id = target
    union all
    select n.*, s.depth + 1
    from public.nodes n
    join subtree s on n.parent_id = s.id
    where s.depth < max_depth
  )
  select s.id, s.parent_id, s.author_user_id, p.display_name, p.hue,
         s.character_id, s.scene_text, s.location, s.game_time,
         s.preset_choices, s.chosen_action, s.created_at, s.depth
  from subtree s
  join public.profiles p on p.id = s.author_user_id;
$$;

grant execute on function public.node_subtree(uuid, integer) to anon, authenticated;
