# UNSW Infinite Life Sim

An infinite, AI-generated UNSW Student Life Simulator. Every scene is freshly
written by Groq on demand. Pick from four choices or type your own. Branch
off your own story, jump back to any earlier scene, or hop into another
player's timeline. Nodes are author-attributed and color-coded on a shared
React Flow graph, so a fork to someone else's story is visible at a glance.

## What's in here

| Area | Where |
| --- | --- |
| Scene generation (Groq + UNSW lore + structured JSON) | [`src/lib/llm/`](./src/lib/llm) |
| Full root→current ancestry walk + 80k-token summarisation | [`src/lib/game/ancestry.ts`](./src/lib/game/ancestry.ts) |
| Crossings — find nearby other-player nodes, weave them in via the LLM, record the ones it used | [`src/lib/game/crossings.ts`](./src/lib/game/crossings.ts) |
| Schema, RLS, recursive `node_ancestry` / `node_subtree` SQL functions | [`supabase/migrations/`](./supabase/migrations) |
| Jump-back / cross-user fork primitive | [`POST /api/character/jump`](./src/app/api/character/jump/route.ts) |
| Personal graph (author hue, forks dashed, crossings dotted) | [`src/components/graph/`](./src/components/graph) |
| Game UI (typewriter, slide transitions, choice grid, SVG avatar) | [`src/components/game/`](./src/components/game) |
| Pages | [`src/app/`](./src/app) |

Pages:
- `/` — landing + Google sign-in
- `/play` — main scene loop with avatar, stats, 4 choice tiles, custom action
- `/graph` — your personal React Flow graph, color-by-author, crossings as dashed edges
- `/explore` — global story explorer
- `/node/[id]` — shareable scene view with ancestry crumb + "Continue from here"

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Supabase (Postgres + Auth + RLS) via `@supabase/supabase-js` + `@supabase/ssr` — no Prisma
- Groq `llama-3.3-70b-versatile` with JSON mode + Zod validation
- `@xyflow/react` for the story graph
- Framer Motion + custom typewriter for DDLC-style slides

## Local setup

```bash
npm install
cp .env.example .env.local
# fill in the values; see "Environment" below
npm run dev
```

Open <http://localhost:3000>.

**Without Supabase credentials**, the app runs in demo mode: the `/play`
loop works (in-memory sessions reset on server restart), but `/graph`,
`/explore`, sign-in, and persistent crossings are stubbed.

## Environment

| Var | Used by |
| --- | --- |
| `GROQ_API_KEY` | scene generation |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only (admin client; unused at present but kept for future server-side fan-out) |
| `GROQ_MODEL` (optional) | overrides the default `llama-3.3-70b-versatile` |

Google OAuth is configured **inside the Supabase dashboard**
(Authentication → Providers → Google). No app-level `AUTH_SECRET` is needed —
Supabase manages session JWT signing internally.

## Database

Schema lives in plain SQL under [`supabase/migrations/`](./supabase/migrations).

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste the migration files directly into the Supabase SQL editor in order.

Key tables / shapes (mirrored as hand-written TS types in
[`src/lib/supabase/types.ts`](./src/lib/supabase/types.ts)):

- `profiles` — `id`, `display_name`, `avatar_url`, **`hue` (0–359, hashed from id)**, `created_at`. Trigger on `auth.users` auto-creates the row.
- `characters` — `user_id`, `name`, `avatar_config`, `stats`, **`current_node_id`** (the leaf of the player's active branch).
- `nodes` — `parent_id` (any node; nullable for root), **`author_user_id`** (who generated this scene), `character_id` (which persona was playing), `scene_text`, `location`, `game_time`, `stats_snapshot`, `preset_choices[4]`, `chosen_action` (the action that led HERE from parent — so multi-child forks work cleanly), `is_public`.
- `location_index` — `(node_id, location, time_bucket)` for cheap crossing lookups.
- `crossings` — `(node_a_id, node_b_id)` unique, recorded only when the LLM actually wove in the other player's node.

Row Level Security is on for everything. Reads are permissive for public nodes; writes are gated on `auth.uid() = author_user_id`.

## How the next-scene call works

```
POST /api/scene/next { characterId, action, isCustom }

1. Walk full ancestry root → current via the recursive node_ancestry SQL fn
   (turn-by-turn, each ancestor author-tagged).
2. If serialised history > ~80k tokens, summarise everything older than
   the last 20 nodes via a Groq summariser call.
3. Pre-LLM crossing lookup: at this (location, time bucket ±) find up to 2
   recent nodes by OTHER characters, attach their last scene as candidates.
4. Compose prompt: UNSW lore + character profile + full ancestry +
   OTHER_PLAYERS_NEARBY + player action.
5. Groq returns a single JSON object with sceneText, location, time
   advance, stat deltas, optional avatar updates, 4 choices, and
   crossedWithNodeIds — the node ids it actually wove in.
6. Persist:
   - new node (author_user_id = me, parent_id = character.current_node_id)
   - update character (stats, avatar, current_node_id, etc.)
   - one location_index row
   - one crossings row per id in crossedWithNodeIds that came from our
     candidate set (so the model can't fabricate ids)
```

## Jump-back & cross-user fork — same primitive

```
POST /api/character/jump { characterId, targetNodeId }
  -> sets characters.current_node_id = targetNodeId
```

The next `/api/scene/next` creates a child of that node with
`author_user_id = me`. So:

- Target is one of *your* earlier nodes → "Continue from here" rewinds your
  active branch (the old branch stays as a sibling in your graph).
- Target is another user's node → "Branch off @x's story". Your descendants
  carry your hue; the original branch is untouched.

Both UI affordances live in [`ContinueFromHereButton`](./src/components/game/ContinueFromHereButton.tsx).

## Out of scope (intentionally)

- Per-scene AI image generation (the avatar is composed from layered SVG)
- Real-time presence push (crossings are evaluated on each turn)
- Mobile-first polish beyond responsive layout

## Scripts

```bash
npm run dev         # Next.js dev server
npm run build       # Production build
npm run lint        # eslint
npm run typecheck   # tsc --noEmit
```
