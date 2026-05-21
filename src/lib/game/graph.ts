import "server-only";

import type { SbServer } from "./db";

export interface GraphNode {
  id: string;
  parentId: string | null;
  authorUserId: string;
  authorName: string;
  authorHue: number;
  isYou: boolean;
  characterId: string;
  characterName: string | null;
  location: string;
  sceneSnippet: string;
  fullSceneText: string;
  chosenAction: string | null;
  gameTime: string;
  isCurrent: boolean;
  isRoot: boolean;
  presetChoices: string[];
}

export interface GraphAuthor {
  id: string;
  name: string;
  hue: number;
  isYou: boolean;
  nodeCount: number;
}

export interface GraphCrossing {
  nodeAId: string;
  nodeBId: string;
  location: string;
  timeBucket: string;
}

export interface GraphResult {
  characterId: string;
  characterName: string;
  characterOwnerId: string;
  characterOwnerName: string;
  currentNodeId: string | null;
  nodes: GraphNode[];
  authors: GraphAuthor[];
  crossings: GraphCrossing[];
}

/**
 * Returns the full graph centred on a character: all nodes authored under
 * this character (character_id = id) PLUS every ancestor of those nodes
 * (which may belong to other characters / authors when the player jumped
 * into someone else's story). Also returns crossings touching any of the
 * displayed nodes so the UI can draw them as extra edges.
 */
export async function getCharacterGraph(
  supabase: SbServer,
  characterId: string,
  viewerUserId: string | null
): Promise<GraphResult> {
  const { data: character, error: cErr } = await supabase
    .from("characters")
    .select("id, name, user_id, current_node_id")
    .eq("id", characterId)
    .maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!character) throw new Error("Character not found");

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", character.user_id)
    .maybeSingle();

  const { data: own, error: nErr } = await supabase
    .from("nodes")
    .select(
      "id, parent_id, author_user_id, character_id, location, scene_text, chosen_action, game_time, preset_choices"
    )
    .eq("character_id", characterId);
  if (nErr) throw new Error(nErr.message);

  const byId = new Map<string, (typeof own)[number]>();
  for (const n of own ?? []) byId.set(n.id, n);

  const wanted = new Set<string>();
  for (const n of own ?? []) {
    if (n.parent_id && !byId.has(n.parent_id)) wanted.add(n.parent_id);
  }
  const externalNodes: Map<string, (typeof own)[number]> = new Map();
  let frontier = Array.from(wanted);
  let hops = 0;
  while (frontier.length > 0 && hops < 50) {
    const { data: ext } = await supabase
      .from("nodes")
      .select(
        "id, parent_id, author_user_id, character_id, location, scene_text, chosen_action, game_time, preset_choices"
      )
      .in("id", frontier);
    if (!ext || ext.length === 0) break;
    const nextFrontier: string[] = [];
    for (const e of ext) {
      if (!externalNodes.has(e.id)) {
        externalNodes.set(e.id, e);
        if (e.parent_id && !byId.has(e.parent_id) && !externalNodes.has(e.parent_id)) {
          nextFrontier.push(e.parent_id);
        }
      }
    }
    frontier = nextFrontier;
    hops += 1;
  }

  const allNodes = [...(own ?? []), ...externalNodes.values()];
  const allNodeIds = allNodes.map((n) => n.id);
  const authorIds = Array.from(new Set(allNodes.map((n) => n.author_user_id)));
  const characterIds = Array.from(new Set(allNodes.map((n) => n.character_id)));

  const [profileRes, charRes, crossingsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, hue")
      .in("id", authorIds),
    supabase
      .from("characters")
      .select("id, name, user_id")
      .in("id", characterIds),
    supabase
      .from("crossings")
      .select("node_a_id, node_b_id, location, time_bucket")
      .or(
        `node_a_id.in.(${allNodeIds.join(",")}),node_b_id.in.(${allNodeIds.join(",")})`
      ),
  ]);
  const profileMap = new Map(profileRes.data?.map((p) => [p.id, p]));
  const charMap = new Map(charRes.data?.map((c) => [c.id, c]));

  const graphNodes: GraphNode[] = allNodes.map((n) => {
    const p = profileMap.get(n.author_user_id);
    const c = charMap.get(n.character_id);
    return {
      id: n.id,
      parentId: n.parent_id,
      authorUserId: n.author_user_id,
      authorName: p?.display_name ?? "someone",
      authorHue: p?.hue ?? 50,
      isYou: viewerUserId !== null && n.author_user_id === viewerUserId,
      characterId: n.character_id,
      characterName: c?.name ?? null,
      location: n.location,
      sceneSnippet: truncate(n.scene_text, 140),
      fullSceneText: n.scene_text,
      chosenAction: n.chosen_action,
      gameTime: n.game_time,
      isCurrent: n.id === character.current_node_id,
      isRoot: n.parent_id === null,
      presetChoices: n.preset_choices ?? [],
    };
  });

  const authorCounts = new Map<string, number>();
  for (const g of graphNodes) {
    authorCounts.set(g.authorUserId, (authorCounts.get(g.authorUserId) ?? 0) + 1);
  }
  const authors: GraphAuthor[] = Array.from(authorCounts.entries())
    .map(([id, count]) => {
      const p = profileMap.get(id);
      return {
        id,
        name: p?.display_name ?? "someone",
        hue: p?.hue ?? 50,
        isYou: viewerUserId !== null && id === viewerUserId,
        nodeCount: count,
      };
    })
    .sort((a, b) => b.nodeCount - a.nodeCount);

  const crossings: GraphCrossing[] =
    crossingsRes.data?.map((c) => ({
      nodeAId: c.node_a_id,
      nodeBId: c.node_b_id,
      location: c.location,
      timeBucket: c.time_bucket,
    })) ?? [];

  return {
    characterId: character.id,
    characterName: character.name,
    characterOwnerId: character.user_id,
    characterOwnerName: ownerProfile?.display_name ?? "someone",
    currentNodeId: character.current_node_id,
    nodes: graphNodes,
    authors,
    crossings,
  };
}

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return s.slice(0, n - 1).trimEnd() + "…";
}
