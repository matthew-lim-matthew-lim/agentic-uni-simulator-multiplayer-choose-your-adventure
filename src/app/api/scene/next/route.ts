import { NextResponse } from "next/server";
import { z } from "zod";
import {
  appendMemoryTurn,
  getMemorySession,
} from "@/lib/game/in-memory-session";
import { appendDbScene } from "@/lib/game/db";
import { getAncestry } from "@/lib/game/ancestry";
import {
  findCrossingCandidates,
  persistCrossings,
} from "@/lib/game/crossings";
import { generateScene, isGroqConfigured } from "@/lib/llm/groq";
import { buildSystemPrompt, buildTurnPrompt } from "@/lib/llm/prompt";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/get-user";
import type { CharacterSnapshot } from "@/lib/game/types";

export const runtime = "nodejs";

const Body = z.object({
  characterId: z.string().min(1),
  action: z.string().min(1).max(400),
  isCustom: z.boolean().default(false),
});

export async function POST(req: Request) {
  if (!isGroqConfigured()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY is not set on the server." },
      { status: 500 }
    );
  }

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", detail: parsed.error.format() },
      { status: 400 }
    );
  }
  const { characterId, action, isCustom } = parsed.data;

  if (isSupabaseConfigured()) {
    const user = await getSessionUser();
    if (user) {
      const supabase = await getSupabaseServer();

      const { data: character, error: cErr } = await supabase
        .from("characters")
        .select("*")
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
      if (!character.current_node_id) {
        return NextResponse.json(
          { error: "Character has no current node; start the session first." },
          { status: 400 }
        );
      }

      // 1. Walk full ancestry (root -> current) with summarisation fallback.
      const ancestry = await getAncestry(
        supabase,
        user.id,
        character.current_node_id
      );

      const { data: currentNode } = await supabase
        .from("nodes")
        .select("location, game_time")
        .eq("id", character.current_node_id)
        .single();

      // 2. Pre-LLM crossing candidates — other players' recent nodes at
      //    this location / time bucket. The LLM will choose whether to
      //    weave them in.
      const crossingCandidates = await findCrossingCandidates(supabase, {
        fromNodeId: character.current_node_id,
        currentCharacterId: character.id,
        ancestryNodeIds: ancestry.turns.map((t) => t.nodeId),
      });

      const charSnapshot: CharacterSnapshot = {
        id: character.id,
        name: character.name,
        authorName: user.profile.display_name,
        stats: character.stats,
        avatarConfig: character.avatar_config,
        currentLocation: currentNode?.location ?? "—",
        gameTime: currentNode?.game_time ?? new Date().toISOString(),
      };

      const scene = await generateScene({
        system: buildSystemPrompt(),
        user: buildTurnPrompt({
          character: charSnapshot,
          ancestry: ancestry.turns,
          ancestorSummary: ancestry.summary,
          crossingCandidates,
          action,
          isCustom,
        }),
      });

      const { node, character: charUpdated } = await appendDbScene(supabase, {
        userId: user.id,
        characterId: character.id,
        parentNodeId: character.current_node_id,
        chosenAction: action,
        scene,
      });

      // 3. Persist actually-used crossings.
      const validCrossedIds = scene.crossedWithNodeIds.filter((id) =>
        crossingCandidates.some((c) => c.nodeId === id)
      );
      let crossingsInserted = 0;
      if (validCrossedIds.length > 0) {
        crossingsInserted = await persistCrossings(supabase, {
          newNodeId: node.id,
          crossedNodeIds: validCrossedIds,
        });
      }

      return NextResponse.json({
        mode: "db",
        characterId: charUpdated.id,
        character: {
          id: charUpdated.id,
          name: charUpdated.name,
          authorName: user.profile.display_name,
          stats: charUpdated.stats,
          avatarConfig: charUpdated.avatar_config,
          currentLocation: node.location,
          gameTime: node.game_time,
        },
        scene: {
          nodeId: node.id,
          sceneText: node.scene_text,
          location: node.location,
          presetChoices: node.preset_choices,
          crossedWithNodeIds: validCrossedIds,
          authorName: user.profile.display_name,
          authorHue: user.profile.hue,
          authorIsYou: true,
        },
        crossingsInserted,
        ancestrySummarised:
          ancestry.summary !== undefined
            ? { kept: ancestry.turns.length, truncated: ancestry.truncatedAt }
            : undefined,
      });
    }
  }

  // In-memory demo path — no crossings, just the loop.
  const session = getMemorySession(characterId);
  if (!session) {
    return NextResponse.json(
      { error: "Session not found. Start a new one." },
      { status: 404 }
    );
  }
  const scene = await generateScene({
    system: buildSystemPrompt(),
    user: buildTurnPrompt({
      character: session.character,
      ancestry: session.ancestry,
      crossingCandidates: [],
      action,
      isCustom,
    }),
  });
  const next = appendMemoryTurn({
    sessionId: session.sessionId,
    chosenAction: action,
    scene,
  });
  if (!next) {
    return NextResponse.json({ error: "Session vanished" }, { status: 500 });
  }
  return NextResponse.json({
    mode: "memory",
    characterId: next.sessionId,
    character: next.character,
    scene: {
      nodeId: next.latestNode!.nodeId,
      sceneText: scene.sceneText,
      location: scene.location,
      presetChoices: scene.presetChoices,
      crossedWithNodeIds: [],
      authorName: next.character.name,
      authorHue: undefined,
      authorIsYou: true,
    },
  });
}
