/**
 * Deterministic hue for any user id. Used everywhere a player's color shows up
 * — graph node borders, edge fill on a fork, scene "node by @x" badge.
 */
export function hueForId(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 360;
}

export function authorColors(id: string, isYou: boolean) {
  const hue = hueForId(id);
  const sat = isYou ? 92 : 70;
  const light = isYou ? 60 : 65;
  return {
    hue,
    fill: `hsla(${hue}, ${sat}%, ${light}%, ${isYou ? 0.22 : 0.12})`,
    border: `hsla(${hue}, ${sat}%, ${light}%, ${isYou ? 0.85 : 0.55})`,
    text: `hsl(${hue}, ${sat}%, ${isYou ? 78 : 72}%)`,
  };
}
