-- 0001 had a cross-referencing pair of policies between `characters` and
-- `nodes` that triggered "infinite recursion detected in policy" the moment
-- either table was queried under RLS. This migration replaces both with
-- self-contained variants.

-- characters: any signed-in or anonymous client can read (so /explore and
-- shared graphs work without joining through nodes). Writes still
-- gated on owner.
drop policy if exists "characters owner read" on public.characters;
drop policy if exists "characters world read" on public.characters;
create policy "characters world read"
  on public.characters
  for select
  using (true);

-- nodes: a node is readable when it's public OR you authored it.
-- (The character-ownership branch was redundant — you'd already match the
-- author branch, since your own character's nodes are authored by you.)
drop policy if exists "nodes read" on public.nodes;
create policy "nodes read"
  on public.nodes
  for select
  using (
    is_public
    or auth.uid() = author_user_id
  );
