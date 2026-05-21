/**
 * Per-process in-memory session store for the phase-1 LLM loop.
 *
 * Used as a fallback when Supabase isn't configured. Logged-in players go
 * through the DB-backed flow in src/lib/game/db.ts instead. We keep the
 * API surface aligned so the route handlers can dispatch on auth state.
 */

import { randomUUID } from "node:crypto";
import {
  STARTING_AVATAR,
  STARTING_STATS,
  applyDeltas,
  type AncestorTurn,
  type AvatarConfig,
  type CharacterSnapshot,
  type LlmScene,
  type Stats,
} from "./types";

interface MemoryTurn {
  nodeId: string;
  authorName: string;
  authorIsYou: boolean;
  location: string;
  sceneText: string;
  chosenAction: string | null; // action that led TO this turn
  gameTime: Date;
  stats: Stats;
  presetChoices: string[];
}

interface MemorySession {
  id: string;
  character: {
    name: string;
    avatarConfig: AvatarConfig;
    stats: Stats;
    currentLocation: string;
    gameTime: Date;
  };
  turns: MemoryTurn[];
}

declare global {
  var __unswSessions: Map<string, MemorySession> | undefined;
}

const sessions: Map<string, MemorySession> =
  globalThis.__unswSessions ?? new Map();
globalThis.__unswSessions = sessions;

const STARTING_GAME_TIME = new Date("2026-03-02T08:30:00+11:00");

export interface MemorySessionProjection {
  sessionId: string;
  character: CharacterSnapshot;
  ancestry: AncestorTurn[];
  latestNode: AncestorTurn | null;
  latestChoices: string[];
}

export function createMemorySession(opts: { characterName?: string } = {}): MemorySessionProjection {
  const id = randomUUID();
  const character = {
    name: opts.characterName?.trim() || "You",
    avatarConfig: { ...STARTING_AVATAR },
    stats: { ...STARTING_STATS },
    currentLocation: "Anzac Parade light rail stop, Kingsford",
    gameTime: new Date(STARTING_GAME_TIME.getTime()),
  };
  sessions.set(id, { id, character, turns: [] });
  return projectSession(id);
}

export function getMemorySession(id: string): MemorySessionProjection | null {
  if (!sessions.has(id)) return null;
  return projectSession(id);
}

export function appendMemoryTurn(args: {
  sessionId: string;
  chosenAction: string | null;
  scene: LlmScene;
}): MemorySessionProjection | null {
  const s = sessions.get(args.sessionId);
  if (!s) return null;

  const newStats = applyDeltas(s.character.stats, args.scene.statDeltas);
  s.character.stats = newStats;
  s.character.currentLocation = args.scene.location;
  s.character.gameTime = new Date(
    s.character.gameTime.getTime() +
      args.scene.gameTimeAdvanceMinutes * 60 * 1000
  );
  if (args.scene.avatarUpdates) {
    s.character.avatarConfig = {
      ...s.character.avatarConfig,
      ...args.scene.avatarUpdates,
    };
  }
  s.turns.push({
    nodeId: randomUUID(),
    authorName: s.character.name,
    authorIsYou: true,
    location: args.scene.location,
    sceneText: args.scene.sceneText,
    chosenAction: args.chosenAction,
    gameTime: new Date(s.character.gameTime.getTime()),
    stats: { ...newStats },
    presetChoices: args.scene.presetChoices,
  });
  return projectSession(s.id);
}

function projectSession(id: string): MemorySessionProjection {
  const s = sessions.get(id)!;
  const ancestry: AncestorTurn[] = s.turns.map((t) => ({
    nodeId: t.nodeId,
    authorName: t.authorName,
    authorIsYou: t.authorIsYou,
    location: t.location,
    sceneText: t.sceneText,
    chosenAction: t.chosenAction,
  }));
  const last = s.turns[s.turns.length - 1];
  return {
    sessionId: s.id,
    character: {
      id: s.id,
      name: s.character.name,
      authorName: "you",
      stats: { ...s.character.stats },
      avatarConfig: { ...s.character.avatarConfig },
      currentLocation: s.character.currentLocation,
      gameTime: s.character.gameTime.toISOString(),
    },
    ancestry,
    latestNode: ancestry[ancestry.length - 1] ?? null,
    latestChoices: last?.presetChoices ?? [],
  };
}
