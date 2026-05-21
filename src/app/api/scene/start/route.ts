import { NextResponse } from "next/server";
import { z } from "zod";
import {
  appendMemoryTurn,
  createMemorySession,
} from "@/lib/game/in-memory-session";
import {
  appendDbScene,
  createCharacter,
} from "@/lib/game/db";
import {
  STARTING_AVATAR,
  STARTING_STATS,
  applyDeltas,
  type CharacterSnapshot,
} from "@/lib/game/types";
import { generateScene, isGroqConfigured } from "@/lib/llm/groq";
import { buildSystemPrompt, buildTurnPrompt } from "@/lib/llm/prompt";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";
import { getSessionUser } from "@/lib/supabase/get-user";

export const runtime = "nodejs";

const Body = z
  .object({
    characterName: z.string().min(1).max(40).optional(),
  })
  .default({});

const STARTING_LOCATION = "Anzac Parade light rail stop, Kingsford";
const STARTING_GAME_TIME = "2026-03-02T08:30:00+11:00";

export async function POST(req: Request) {
  if (!isGroqConfigured()) {
    return NextResponse.json(
      {
        error: "GROQ_API_KEY is not set on the server.",
        hint: "Add GROQ_API_KEY to .env.local (see .env.example).",
      },
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

  // DB-backed path when both Supabase is configured AND the user is logged in.
  if (isSupabaseConfigured()) {
    const user = await getSessionUser();
    if (user) {
      const supabase = await getSupabaseServer();
      const character = await createCharacter(supabase, user.id, {
        name: parsed.data.characterName,
      });

      // Synthesise a starting CharacterSnapshot for the prompt builder.
      const charSnapshot: CharacterSnapshot = {
        id: character.id,
        name: character.name,
        authorName: user.profile.display_name,
        stats: { ...STARTING_STATS },
        avatarConfig: { ...STARTING_AVATAR },
        currentLocation: STARTING_LOCATION,
        gameTime: STARTING_GAME_TIME,
      };

      const scene = await generateScene({
        system: buildSystemPrompt(),
        user: buildTurnPrompt({
          character: charSnapshot,
          ancestry: [],
          crossingCandidates: [],
          action:
            "(opening — narrate the start of the day, set the scene at the current location)",
          isCustom: false,
        }),
      });

      const { node, character: charUpdated } = await appendDbScene(supabase, {
        userId: user.id,
        characterId: character.id,
        parentNodeId: null,
        chosenAction: null,
        scene,
      });

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
          crossedWithNodeIds: [],
          authorName: user.profile.display_name,
          authorHue: user.profile.hue,
          authorIsYou: true,
        },
      });
    }
  }

  // In-memory demo path (no auth or no Supabase env).
  const session = createMemorySession({ characterName: parsed.data.characterName });
  const scene = await generateScene({
    system: buildSystemPrompt(),
    user: buildTurnPrompt({
      character: session.character,
      ancestry: [],
      crossingCandidates: [],
      action:
        "(opening — narrate the start of the day, set the scene at the current location)",
      isCustom: false,
    }),
  });
  const next = appendMemoryTurn({
    sessionId: session.sessionId,
    chosenAction: null,
    scene,
  });
  if (!next) {
    return NextResponse.json({ error: "Session vanished" }, { status: 500 });
  }
  // Avoid unused warning: keep helper imported for parity with db path.
  void applyDeltas;

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
