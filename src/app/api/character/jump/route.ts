import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/get-user";

export const runtime = "nodejs";

const Body = z.object({
  characterId: z.string().uuid(),
  targetNodeId: z.string().uuid(),
});

/**
 * Single primitive that powers both "jump back to an earlier own node" and
 * "branch off another player's node". Just sets the character's current_node_id
 * to the chosen node; the next /api/scene/next call uses that as parent_id
 * and attributes the new node to the jumper.
 *
 * Permissions:
 * - The character must belong to the logged-in user.
 * - The target node must be public OR authored by the user OR belong to one
 *   of the user's own characters (the RLS policies on `nodes` enforce this).
 */
export async function POST(req: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Jumping requires Supabase persistence." },
      { status: 503 }
    );
  }
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in to jump." }, { status: 401 });
  }
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", detail: parsed.error.format() },
      { status: 400 }
    );
  }
  const { characterId, targetNodeId } = parsed.data;
  const supabase = await getSupabaseServer();

  const { data: character, error: cErr } = await supabase
    .from("characters")
    .select("id, user_id")
    .eq("id", characterId)
    .maybeSingle();
  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!character || character.user_id !== user.id) {
    return NextResponse.json(
      { error: "Character not found or not yours." },
      { status: 404 }
    );
  }

  const { data: node, error: nErr } = await supabase
    .from("nodes")
    .select("id, author_user_id, character_id, is_public")
    .eq("id", targetNodeId)
    .maybeSingle();
  if (nErr) {
    return NextResponse.json({ error: nErr.message }, { status: 500 });
  }
  if (!node) {
    return NextResponse.json(
      { error: "Target node not found or not visible to you." },
      { status: 404 }
    );
  }

  const { data: updated, error: uErr } = await supabase
    .from("characters")
    .update({ current_node_id: targetNodeId })
    .eq("id", characterId)
    .select("id, current_node_id")
    .single();
  if (uErr || !updated) {
    return NextResponse.json(
      { error: uErr?.message ?? "Failed to jump" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    characterId,
    currentNodeId: updated.current_node_id,
    forkedFromOtherAuthor: node.author_user_id !== user.id,
  });
}
