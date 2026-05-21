# UNSW Infinite Life Sim

An infinite, AI-generated UNSW Student Life Simulator. Every scene is freshly
written by a Groq-hosted LLM in real time. Pick a choice or type your own.
Branch off, jump back, or hop into another player's story — every node is
attributed to its author and colored on a shared graph.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind v4
- Groq (`llama-3.3-70b-versatile`) for streaming scene generation
- Supabase (Postgres + Auth + RLS) via `@supabase/supabase-js` and `@supabase/ssr`
- React Flow (`@xyflow/react`) for story graphs
- Framer Motion + custom typewriter for DDLC-style slides

## Local setup

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev
```

### Environment

| Var | Used by |
| --- | --- |
| `GROQ_API_KEY` | scene generation |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server |
| `SUPABASE_SERVICE_ROLE_KEY` | server-only writes |

Google OAuth is configured **inside the Supabase dashboard** (Authentication →
Providers → Google). No app-level auth secret is needed.

### Database

Schema lives in plain SQL under [`supabase/migrations/`](./supabase/migrations).
Apply with the Supabase CLI:

```bash
supabase db push
```
