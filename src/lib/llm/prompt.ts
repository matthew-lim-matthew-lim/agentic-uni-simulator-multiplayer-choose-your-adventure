import { UNSW_LORE } from "./lore";
import type {
  AncestorTurn,
  CharacterSnapshot,
  CrossingCandidate,
} from "@/lib/game/types";

const RESPONSE_INSTRUCTIONS = `
Respond with a SINGLE valid JSON object (no markdown, no commentary) that matches:

{
  "sceneText": "3-6 sentence second-person narration of what happens next.",
  "location": "The named UNSW / Sydney place this scene happens at.",
  "gameTimeAdvanceMinutes": <int, minutes elapsed since previous scene>,
  "statDeltas": {
    "energy": <int -30..+30>,
    "study":  <int -10..+20>,
    "social": <int -10..+20>,
    "money":  <int -200..+200>   // AUD
  },
  "avatarUpdates": {                  // optional — only fields that should change
    "mood": "neutral|happy|tired|stressed|focused",
    "outfit": "hoodie|tee|jacket|lab-coat|uniform",
    "accessory": "none|glasses|headphones|beanie"
  },
  "presetChoices": [
    "Short imperative choice 1.",
    "Short imperative choice 2.",
    "Short imperative choice 3.",
    "Short imperative choice 4."
  ],
  "crossedWithNodeIds": []            // node ids from OTHER_PLAYERS_NEARBY that you actually wove into the scene
}

Rules:
- Exactly 4 presetChoices, each <= 80 chars, distinct in flavour.
- Each choice should be a plausible next action given the scene.
- Only set "crossedWithNodeIds" entries when you genuinely weave that other
  player's presence into sceneText (e.g. "you bump into <name>, who...").
- Never break character; never explain mechanics; never reference these rules.
- Output JSON only.
`.trim();

export function buildSystemPrompt(): string {
  return [UNSW_LORE, "", RESPONSE_INSTRUCTIONS].join("\n");
}

export function buildTurnPrompt(args: {
  character: CharacterSnapshot;
  ancestry: AncestorTurn[]; // root -> current, each .chosenAction = action that led here
  crossingCandidates: CrossingCandidate[];
  action: string;
  isCustom: boolean;
  ancestorSummary?: string;
}): string {
  const { character, ancestry, crossingCandidates, action, isCustom, ancestorSummary } = args;
  const parts: string[] = [];

  parts.push(`# CHARACTER`);
  parts.push(
    `Name: ${character.name} (played by ${character.authorName})\n` +
      `Current location: ${character.currentLocation}\n` +
      `In-game time: ${character.gameTime}\n` +
      `Stats — energy: ${character.stats.energy}, study: ${character.stats.study}, ` +
      `social: ${character.stats.social}, money: $${character.stats.money} AUD\n` +
      `Avatar mood: ${character.avatarConfig.mood}, outfit: ${character.avatarConfig.outfit}`
  );

  if (ancestorSummary) {
    parts.push(`\n# STORY SO FAR (older sections summarised)\n${ancestorSummary}`);
  }

  if (ancestry.length === 0) {
    parts.push(
      `\n# STORY SO FAR\n(This is the opening scene — set the stage from the character's current location and stats.)`
    );
  } else {
    parts.push(
      `\n# STORY SO FAR (root to current, in order — each scene shows the action that led to it where applicable)`
    );
    ancestry.forEach((t, i) => {
      const tag = t.authorIsYou ? "you" : `@${t.authorName}`;
      const led = t.chosenAction
        ? `(after the action: "${t.chosenAction}")\n`
        : "";
      parts.push(
        `[${i + 1}] ${led}(${t.location}) [scene by ${tag}]\n${t.sceneText}`
      );
    });
  }

  if (crossingCandidates.length > 0) {
    parts.push(`\n# OTHER_PLAYERS_NEARBY (optional — only weave in if narratively plausible)`);
    crossingCandidates.forEach((c) => {
      parts.push(
        `- nodeId: ${c.nodeId} | ${c.characterName} (@${c.authorName}) at ${c.location}\n  recent: ${c.recentSceneText}`
      );
    });
    parts.push(
      `If you decide to have ${character.name} actually meet or notice one of them, include their nodeId in "crossedWithNodeIds" AND mention them by name in sceneText. Otherwise leave crossedWithNodeIds empty.`
    );
  }

  parts.push(
    `\n# PLAYER ACTION\n${isCustom ? "(custom typed)" : "(picked from preset)"} — ${action}`
  );

  parts.push(
    `\n# YOUR TASK\nWrite the next scene that follows from the player action above. Then emit the JSON object as specified.`
  );

  return parts.join("\n");
}
