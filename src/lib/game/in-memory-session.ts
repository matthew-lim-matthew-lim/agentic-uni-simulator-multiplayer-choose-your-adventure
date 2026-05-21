/**
 * Per-process in-memory session store for the phase-1 LLM loop.
 *
 * Replaced by Supabase persistence in a later todo. We keep the API surface
 * shaped like the eventual DB-backed code so the route handlers don't need
 * to change much when we swap implementations.
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
  chosenAction: string | null;
  gameTime: Date;
  stats: Stats;
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
  // eslint-disable-next-line no-var
  var __unswSessions: Map<string, MemorySession> | undefined;
}

const sessions: Map<string, MemorySession> =
  globalThis.__unswSessions ?? new Map();
globalThis.__unswSessions = sessions;

const STARTING_GAME_TIME = new Date("2026-03-02T08:30:00+11:00");

export interface PublicSession {
  sessionId: string;
  character: CharacterSnapshot;
  ancestry: AncestorTurn[];
  latestNode: AncestorTurn | null;
  latestChoices: string[];
}

export function createSession(opts: { characterName?: string } = {}): PublicSession {
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

export function getSession(id: string): PublicSession | null {
  if (!sessions.has(id)) return null;
  return projectSession(id);
}

export function appendTurn(args: {
  sessionId: string;
  chosenAction: string;
  scene: LlmScene;
}): PublicSession | null {
  const s = sessions.get(args.sessionId);
  if (!s) return null;

  if (s.turns.length > 0) {
    s.turns[s.turns.length - 1].chosenAction = args.chosenAction;
  }

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
    chosenAction: null,
    gameTime: new Date(s.character.gameTime.getTime()),
    stats: { ...newStats },
  });
  return projectSession(s.id);
}

function projectSession(id: string): PublicSession {
  const s = sessions.get(id)!;
  const ancestry: AncestorTurn[] = s.turns.map((t) => ({
    nodeId: t.nodeId,
    authorName: t.authorName,
    authorIsYou: t.authorIsYou,
    location: t.location,
    sceneText: t.sceneText,
    chosenAction: t.chosenAction,
  }));
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
    latestChoices: [],
  };
}
