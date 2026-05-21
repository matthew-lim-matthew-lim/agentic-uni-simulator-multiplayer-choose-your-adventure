import "server-only";

import type { SbServer } from "./db";

export interface NodeDetail {
  id: string;
  parentId: string | null;
  authorUserId: string;
  authorName: string;
  authorHue: number;
  characterId: string;
  characterName: string;
  location: string;
  sceneText: string;
  chosenAction: string | null;
  gameTime: string;
  presetChoices: string[];
  isPublic: boolean;
  childCount: number;
  ancestry: Array<{
    id: string;
    authorName: string;
    authorHue: number;
    isYou: boolean;
    location: string;
    sceneText: string;
    chosenAction: string | null;
  }>;
}

export async function getNodeDetail(
  supabase: SbServer,
  nodeId: string,
  viewerUserId: string | null
): Promise<NodeDetail | null> {
  const { data: node } = await supabase
    .from("nodes")
    .select(
      "id, parent_id, author_user_id, character_id, location, scene_text, chosen_action, game_time, preset_choices, is_public"
    )
    .eq("id", nodeId)
    .maybeSingle();
  if (!node) return null;

  const [profileRes, charRes, ancestryRes, childRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name, hue")
      .eq("id", node.author_user_id)
      .maybeSingle(),
    supabase
      .from("characters")
      .select("name")
      .eq("id", node.character_id)
      .maybeSingle(),
    supabase.rpc("node_ancestry", { target: node.id }),
    supabase
      .from("nodes")
      .select("id", { count: "exact", head: true })
      .eq("parent_id", node.id),
  ]);

  const ancestryRows = (ancestryRes.data ?? []).slice(0, -1); // drop self
  const ancestry = ancestryRows.map((r) => ({
    id: r.id,
    authorName: r.author_display_name,
    authorHue: r.author_hue,
    isYou: viewerUserId !== null && r.author_user_id === viewerUserId,
    location: r.location,
    sceneText: r.scene_text,
    chosenAction: r.chosen_action,
  }));

  return {
    id: node.id,
    parentId: node.parent_id,
    authorUserId: node.author_user_id,
    authorName: profileRes.data?.display_name ?? "someone",
    authorHue: profileRes.data?.hue ?? 50,
    characterId: node.character_id,
    characterName: charRes.data?.name ?? "a player",
    location: node.location,
    sceneText: node.scene_text,
    chosenAction: node.chosen_action,
    gameTime: node.game_time,
    presetChoices: node.preset_choices ?? [],
    isPublic: node.is_public,
    childCount: childRes.count ?? 0,
    ancestry,
  };
}
