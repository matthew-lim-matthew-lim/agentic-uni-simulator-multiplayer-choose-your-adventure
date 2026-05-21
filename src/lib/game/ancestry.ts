import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { generateScene } from "@/lib/llm/groq";
import type { Database } from "@/lib/supabase/types";
import type { AncestorTurn } from "./types";

interface AncestryRow {
  id: string;
  parent_id: string | null;
  author_user_id: string;
  author_display_name: string;
  author_hue: number;
  character_id: string;
  scene_text: string;
  location: string;
  game_time: string;
  stats_snapshot: unknown;
  preset_choices: string[];
  chosen_action: string | null;
  created_at: string;
  depth: number;
}

export interface AncestryResult {
  turns: AncestorTurn[];
  summary?: string;
  totalNodes: number;
  truncatedAt: number;
}

const ROUGH_TOKEN_RATIO = 4; // 1 token ~= 4 chars for English text
const SUMMARIZE_TOKEN_THRESHOLD = 80_000;
const KEEP_RECENT_NODES = 20;

/**
 * Walks the full root -> current_node_id chain (via public.node_ancestry)
 * and serializes it for the LLM prompt. If the serialized history exceeds
 * ~80k tokens, we Groq-summarize everything except the last 20 nodes and
 * pass the summary plus the recent slice forward.
 */
export async function getAncestry(
  supabase: SupabaseClient<Database>,
  currentUserId: string,
  targetNodeId: string
): Promise<AncestryResult> {
  const { data, error } = await supabase.rpc("node_ancestry", {
    target: targetNodeId,
  });
  if (error) {
    throw new Error("Failed to load ancestry: " + error.message);
  }
  const rows = (data ?? []) as AncestryRow[];

  // RPC returns root-first (depth desc).
  const turns: AncestorTurn[] = rows.map((r) => ({
    nodeId: r.id,
    authorName: r.author_display_name,
    authorIsYou: r.author_user_id === currentUserId,
    location: r.location,
    sceneText: r.scene_text,
    chosenAction: r.chosen_action,
  }));

  const totalChars = turns.reduce(
    (n, t) => n + t.sceneText.length + (t.chosenAction?.length ?? 0),
    0
  );
  const estTokens = Math.ceil(totalChars / ROUGH_TOKEN_RATIO);

  if (estTokens <= SUMMARIZE_TOKEN_THRESHOLD || turns.length <= KEEP_RECENT_NODES) {
    return { turns, totalNodes: turns.length, truncatedAt: 0 };
  }

  const olderSlice = turns.slice(0, turns.length - KEEP_RECENT_NODES);
  const recentSlice = turns.slice(turns.length - KEEP_RECENT_NODES);

  const summary = await summarizeOlder(olderSlice);

  return {
    turns: recentSlice,
    summary,
    totalNodes: turns.length,
    truncatedAt: olderSlice.length,
  };
}

async function summarizeOlder(turns: AncestorTurn[]): Promise<string> {
  const condensed = turns
    .map(
      (t, i) =>
        `[${i + 1}] (${t.location}) [${t.authorIsYou ? "you" : `@${t.authorName}`}] ${t.sceneText}` +
        (t.chosenAction ? `\n  → ${t.chosenAction}` : "")
    )
    .join("\n");

  // We re-use generateScene's underlying client by abusing the shape: we
  // wrap the summary in a minimal valid scene-JSON. Cleaner would be a
  // dedicated text endpoint, but this keeps the surface tiny.
  const scene = await generateScene({
    system: `You are summarising the older parts of a UNSW student life simulator playthrough so the next-scene LLM can stay grounded. Be faithful to the chronology and named people/places. 6-10 sentences. Plain prose only.`,
    user:
      `Summarise the following story so far. Keep names, places, key choices, and any unresolved threads.\n\n${condensed}\n\nRespond as a JSON object with sceneText=your summary, location="(summary)", presetChoices=["...","...","...","..."] (placeholder), gameTimeAdvanceMinutes=0, statDeltas={energy:0,study:0,social:0,money:0}. Only the sceneText matters here.`,
  });

  return scene.sceneText;
}
