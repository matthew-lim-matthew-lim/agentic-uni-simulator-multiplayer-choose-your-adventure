import { NextResponse } from "next/server";
import { getCharacterGraph } from "@/lib/game/graph";
import { getSessionUser } from "@/lib/supabase/get-user";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ characterId: string }> }
) {
  const { characterId } = await ctx.params;

  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Supabase isn't configured. Graphs require persistence." },
      { status: 503 }
    );
  }

  const user = await getSessionUser();
  const supabase = await getSupabaseServer();

  try {
    const graph = await getCharacterGraph(supabase, characterId, user?.id ?? null);
    return NextResponse.json(graph);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 404 }
    );
  }
}
