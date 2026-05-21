import "server-only";

import { timeBucketFor } from "./time";
import type { CrossingCandidate } from "./types";
import type { SbServer } from "./db";

const MAX_CANDIDATES = 2;

/**
 * Looks up at most {MAX_CANDIDATES} candidate crossings for the next scene.
 *
 * A candidate is a recent public node that:
 *  - is NOT part of the current ancestry (avoid self-collisions)
 *  - belongs to a DIFFERENT character than the one being played
 *  - was placed at the same location, in the current or one of the next two
 *    time buckets relative to where the player currently is
 *
 * We return enough context (recent scene text, character + author names) for
 * the LLM to weave one of them into the next scene if it makes narrative
 * sense. The route handler then persists `crossings` rows only for those
 * candidates whose nodeIds appear in the LLM's `crossedWithNodeIds` field.
 */
export async function findCrossingCandidates(
  supabase: SbServer,
  args: {
    fromNodeId: string;
    currentCharacterId: string;
    ancestryNodeIds: string[];
  }
): Promise<CrossingCandidate[]> {
  const { fromNodeId, currentCharacterId, ancestryNodeIds } = args;

  const { data: from } = await supabase
    .from("nodes")
    .select("location, game_time")
    .eq("id", fromNodeId)
    .maybeSingle();
  if (!from) return [];

  // Look at this bucket and the next two — captures plausible "still around"
  // and "30-90 min later" candidates without exploding the result set.
  const baseTime = new Date(from.game_time);
  const buckets = [
    timeBucketFor(baseTime),
    timeBucketFor(new Date(baseTime.getTime() + 60 * 60 * 1000)),
    timeBucketFor(new Date(baseTime.getTime() + 3 * 60 * 60 * 1000)),
  ];
  const uniqueBuckets = Array.from(new Set(buckets));

  const { data: hits } = await supabase
    .from("location_index")
    .select("node_id, character_id")
    .eq("location", from.location)
    .in("time_bucket", uniqueBuckets)
    .neq("character_id", currentCharacterId)
    .order("created_at", { ascending: false })
    .limit(20);

  const ancestrySet = new Set(ancestryNodeIds);
  const filtered =
    hits?.filter((h) => !ancestrySet.has(h.node_id)) ?? [];

  // One candidate per other character (no duplicates of the same persona).
  const pickedByChar = new Map<string, string>();
  for (const h of filtered) {
    if (!pickedByChar.has(h.character_id)) {
      pickedByChar.set(h.character_id, h.node_id);
      if (pickedByChar.size >= MAX_CANDIDATES) break;
    }
  }
  const candidateNodeIds = Array.from(pickedByChar.values());
  if (candidateNodeIds.length === 0) return [];

  const { data: nodes } = await supabase
    .from("nodes")
    .select("id, scene_text, location, author_user_id, character_id")
    .in("id", candidateNodeIds)
    .eq("is_public", true);
  if (!nodes || nodes.length === 0) return [];

  const authorIds = Array.from(new Set(nodes.map((n) => n.author_user_id)));
  const charIds = Array.from(new Set(nodes.map((n) => n.character_id)));
  const [profileRes, charRes] = await Promise.all([
    supabase.from("profiles").select("id, display_name").in("id", authorIds),
    supabase.from("characters").select("id, name").in("id", charIds),
  ]);
  const profileMap = new Map(profileRes.data?.map((p) => [p.id, p.display_name]));
  const charMap = new Map(charRes.data?.map((c) => [c.id, c.name]));

  return nodes.map((n) => ({
    nodeId: n.id,
    authorName: profileMap.get(n.author_user_id) ?? "someone",
    characterName: charMap.get(n.character_id) ?? "a player",
    location: n.location,
    recentSceneText:
      n.scene_text.length > 220
        ? n.scene_text.slice(0, 219).trimEnd() + "…"
        : n.scene_text,
  }));
}

/**
 * Persist `crossings` rows for the node ids the LLM actually wove into the
 * scene. Skips already-recorded pairs via ON CONFLICT semantics (we have a
 * UNIQUE constraint on (node_a_id, node_b_id)).
 */
export async function persistCrossings(
  supabase: SbServer,
  args: {
    newNodeId: string;
    crossedNodeIds: string[];
  }
): Promise<number> {
  if (args.crossedNodeIds.length === 0) return 0;
  const { data: newNode } = await supabase
    .from("nodes")
    .select("location, game_time")
    .eq("id", args.newNodeId)
    .maybeSingle();
  if (!newNode) return 0;
  const bucket = timeBucketFor(new Date(newNode.game_time));

  const rows = args.crossedNodeIds.map((other) => ({
    node_a_id: args.newNodeId,
    node_b_id: other,
    location: newNode.location,
    time_bucket: bucket,
  }));

  const { data, error } = await supabase
    .from("crossings")
    .upsert(rows, {
      onConflict: "node_a_id,node_b_id",
      ignoreDuplicates: true,
    })
    .select("id");
  if (error) return 0;
  return data?.length ?? 0;
}
