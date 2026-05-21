import { NextResponse } from "next/server";
import { z } from "zod";
import { appendTurn, getSession } from "@/lib/game/in-memory-session";
import { generateScene, isGroqConfigured } from "@/lib/llm/groq";
import { buildSystemPrompt, buildTurnPrompt } from "@/lib/llm/prompt";

export const runtime = "nodejs";

const Body = z.object({
  sessionId: z.string().uuid(),
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
  const { sessionId, action, isCustom } = parsed.data;

  const session = getSession(sessionId);
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

  const next = appendTurn({ sessionId, chosenAction: action, scene });
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
