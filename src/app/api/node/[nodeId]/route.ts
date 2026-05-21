import { NextResponse } from "next/server";
import { getNodeDetail } from "@/lib/game/node-detail";
import { getSessionUser } from "@/lib/supabase/get-user";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ nodeId: string }> }
) {
  const { nodeId } = await ctx.params;
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: "Node detail needs Supabase persistence." },
      { status: 503 }
    );
  }
  const user = await getSessionUser();
  const supabase = await getSupabaseServer();
  const detail = await getNodeDetail(supabase, nodeId, user?.id ?? null);
  if (!detail) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(detail);
}
