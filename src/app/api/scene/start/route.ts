import { NextResponse } from "next/server";
import { z } from "zod";
import { createSession, appendTurn } from "@/lib/game/in-memory-session";
import { generateScene, isGroqConfigured } from "@/lib/llm/groq";
import { buildSystemPrompt, buildTurnPrompt } from "@/lib/llm/prompt";

export const runtime = "nodejs";

const Body = z
  .object({
    characterName: z.string().min(1).max(40).optional(),
  })
  .default({});

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

  const session = createSession({ characterName: parsed.data.characterName });

  const scene = await generateScene({
    system: buildSystemPrompt(),
    user: buildTurnPrompt({
      character: session.character,
      ancestry: [],
      crossingCandidates: [],
      action: "(opening — narrate the start of the day, set the scene at the current location)",
      isCustom: false,
    }),
  });

  const next = appendTurn({
    sessionId: session.sessionId,
    chosenAction: "(opening)",
    scene,
  });
  if (!next) {
    return NextResponse.json(
      { error: "Session vanished mid-request" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    sessionId: next.sessionId,
    character: next.character,
    scene: {
      nodeId: next.latestNode!.nodeId,
      sceneText: scene.sceneText,
      location: scene.location,
      presetChoices: scene.presetChoices,
      crossedWithNodeIds: scene.crossedWithNodeIds,
      authorName: next.character.name,
      authorIsYou: true,
    },
  });
}
