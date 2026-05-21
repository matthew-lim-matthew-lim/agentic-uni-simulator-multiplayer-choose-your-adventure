import { z } from "zod";

export const StatsSchema = z.object({
  energy: z.number().min(0).max(100),
  study: z.number().min(0).max(100),
  social: z.number().min(0).max(100),
  money: z.number().int(),
});
export type Stats = z.infer<typeof StatsSchema>;

export const StatDeltasSchema = z.object({
  energy: z.number().int().optional().default(0),
  study: z.number().int().optional().default(0),
  social: z.number().int().optional().default(0),
  money: z.number().int().optional().default(0),
});
export type StatDeltas = z.infer<typeof StatDeltasSchema>;

export const AvatarConfigSchema = z.object({
  hair: z.enum(["short", "long", "curly", "buzz", "messy"]).default("short"),
  hairColor: z.string().default("#2a1f1a"),
  skin: z.string().default("#e8c39e"),
  outfit: z.enum(["hoodie", "tee", "jacket", "lab-coat", "uniform"]).default("hoodie"),
  outfitColor: z.string().default("#FFD600"),
  accessory: z.enum(["none", "glasses", "headphones", "beanie"]).default("none"),
  mood: z.enum(["neutral", "happy", "tired", "stressed", "focused"]).default("neutral"),
});
export type AvatarConfig = z.infer<typeof AvatarConfigSchema>;

export const AvatarUpdatesSchema = AvatarConfigSchema.partial();
export type AvatarUpdates = z.infer<typeof AvatarUpdatesSchema>;

export const LlmSceneSchema = z.object({
  sceneText: z.string().min(1),
  location: z.string().min(1),
  gameTimeAdvanceMinutes: z.number().int().min(0).max(48 * 60).default(30),
  statDeltas: StatDeltasSchema.default({
    energy: 0,
    study: 0,
    social: 0,
    money: 0,
  }),
  avatarUpdates: AvatarUpdatesSchema.optional(),
  presetChoices: z.array(z.string().min(1)).length(4),
  crossedWithNodeIds: z.array(z.string().uuid()).default([]),
});
export type LlmScene = z.infer<typeof LlmSceneSchema>;

export interface AncestorTurn {
  nodeId: string;
  authorName: string;
  authorIsYou: boolean;
  location: string;
  sceneText: string;
  chosenAction: string | null;
}

export interface CrossingCandidate {
  nodeId: string;
  authorName: string;
  characterName: string;
  location: string;
  recentSceneText: string;
}

export interface CharacterSnapshot {
  id: string;
  name: string;
  authorName: string;
  stats: Stats;
  avatarConfig: AvatarConfig;
  currentLocation: string;
  gameTime: string;
}

export const STARTING_STATS: Stats = {
  energy: 70,
  study: 30,
  social: 40,
  money: 80,
};

export const STARTING_AVATAR: AvatarConfig = {
  hair: "short",
  hairColor: "#2a1f1a",
  skin: "#e8c39e",
  outfit: "hoodie",
  outfitColor: "#FFD600",
  accessory: "none",
  mood: "neutral",
};

export function applyDeltas(stats: Stats, deltas: StatDeltas): Stats {
  return {
    energy: clamp(stats.energy + (deltas.energy ?? 0), 0, 100),
    study: clamp(stats.study + (deltas.study ?? 0), 0, 100),
    social: clamp(stats.social + (deltas.social ?? 0), 0, 100),
    money: stats.money + (deltas.money ?? 0),
  };
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
