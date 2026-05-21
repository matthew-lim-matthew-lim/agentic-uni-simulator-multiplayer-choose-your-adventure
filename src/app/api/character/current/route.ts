import { NextResponse } from "next/server";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/get-user";
import { getActiveCharacter } from "@/lib/game/db";

export const runtime = "nodejs";

/**
 * Returns the most recent character for the logged-in user, plus the node
 * it's sitting on (so /play can rehydrate after a refresh / login).
 *
 * Returns `{ active: null }` when the user has never played; the client
 * should then call /api/scene/start.
 */
export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ mode: "memory", active: null });
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Not signed in." },
      { status: 401 }
    );
  }
  const supabase = await getSupabaseServer();
  const active = await getActiveCharacter(supabase, user.id);
  if (!active) {
    return NextResponse.json({ mode: "db", active: null });
  }
  return NextResponse.json({
    mode: "db",
    active: {
      characterId: active.characterId,
      character: {
        id: active.character.id,
        name: active.character.name,
        authorName: user.profile.display_name,
        stats: active.character.stats,
        avatarConfig: active.character.avatarConfig,
        currentLocation: active.scene?.location ?? "—",
        gameTime: active.scene?.gameTime ?? new Date().toISOString(),
      },
      scene: active.scene
        ? {
            nodeId: active.scene.nodeId,
            sceneText: active.scene.sceneText,
            location: active.scene.location,
            presetChoices: active.scene.presetChoices,
            crossedWithNodeIds: [],
            authorName: active.scene.authorName,
            authorHue: active.scene.authorHue,
            authorIsYou: active.scene.authorIsYou,
          }
        : null,
    },
  });
}
