import { NextResponse } from "next/server";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PAGE_SIZE = 12;

/**
 * Lists public characters (those with at least one public node) for the
 * global explore page. We return enough info to render preview cards:
 * recent location + scene snippet + author + node count.
 */
export async function GET(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ characters: [] });
  }
  const url = new URL(req.url);
  const cursor = Number(url.searchParams.get("offset") ?? "0");
  const supabase = await getSupabaseServer();

  // Characters whose latest node is publicly readable. Order by the
  // recency of the most recent node.
  const { data: latestNodes, error } = await supabase
    .from("nodes")
    .select("character_id, id, scene_text, location, created_at")
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const seen = new Set<string>();
  const charIds: string[] = [];
  const recentByChar = new Map<
    string,
    { id: string; sceneText: string; location: string; createdAt: string }
  >();
  for (const n of latestNodes ?? []) {
    if (!seen.has(n.character_id)) {
      seen.add(n.character_id);
      charIds.push(n.character_id);
      recentByChar.set(n.character_id, {
        id: n.id,
        sceneText: n.scene_text,
        location: n.location,
        createdAt: n.created_at,
      });
    }
  }
  const pageIds = charIds.slice(cursor, cursor + PAGE_SIZE);

  if (pageIds.length === 0) {
    return NextResponse.json({ characters: [], nextOffset: null });
  }

  const { data: chars } = await supabase
    .from("characters")
    .select("id, name, user_id, current_node_id")
    .in("id", pageIds);

  const userIds = Array.from(new Set(chars?.map((c) => c.user_id) ?? []));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name, hue")
    .in("id", userIds);
  const profileMap = new Map(profiles?.map((p) => [p.id, p]));

  // Node counts per character (cheap query)
  const counts = new Map<string, number>();
  for (const id of pageIds) {
    const { count } = await supabase
      .from("nodes")
      .select("id", { count: "exact", head: true })
      .eq("character_id", id);
    counts.set(id, count ?? 0);
  }

  const characters = (chars ?? []).map((c) => {
    const profile = profileMap.get(c.user_id);
    const recent = recentByChar.get(c.id);
    return {
      id: c.id,
      name: c.name,
      ownerName: profile?.display_name ?? "someone",
      ownerHue: profile?.hue ?? 50,
      nodeCount: counts.get(c.id) ?? 0,
      latestNodeId: recent?.id ?? c.current_node_id ?? null,
      latestLocation: recent?.location ?? null,
      latestSceneSnippet: recent
        ? recent.sceneText.length > 160
          ? recent.sceneText.slice(0, 159).trimEnd() + "…"
          : recent.sceneText
        : null,
      latestCreatedAt: recent?.createdAt ?? null,
    };
  });

  characters.sort((a, b) => {
    if (!a.latestCreatedAt) return 1;
    if (!b.latestCreatedAt) return -1;
    return b.latestCreatedAt.localeCompare(a.latestCreatedAt);
  });

  return NextResponse.json({
    characters,
    nextOffset: cursor + PAGE_SIZE < charIds.length ? cursor + PAGE_SIZE : null,
  });
}
