/**
 * Bucket a game time into a coarse string used for crossing lookups.
 * Two characters whose nodes share the same (location, bucket) are candidates
 * for an intersecting timeline.
 *
 * Format: `YYYY-Www-DAY-SLOT` (e.g. `2026-W10-MON-AM`).
 * Slots: AM (6-12), MIDDAY (12-15), PM (15-19), EVENING (19-23), NIGHT (23-6).
 */
export function timeBucketFor(d: Date): string {
  const y = d.getUTCFullYear();
  const week = isoWeek(d);
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  // Sydney is roughly UTC+10 / +11 — use AEST/AEDT-aware extraction.
  const sydney = new Date(d.toLocaleString("en-US", { timeZone: "Australia/Sydney" }));
  const day = days[sydney.getDay()];
  const h = sydney.getHours();
  let slot = "NIGHT";
  if (h >= 6 && h < 12) slot = "AM";
  else if (h >= 12 && h < 15) slot = "MIDDAY";
  else if (h >= 15 && h < 19) slot = "PM";
  else if (h >= 19 && h < 23) slot = "EVENING";
  return `${y}-W${String(week).padStart(2, "0")}-${day}-${slot}`;
}

function isoWeek(d: Date): number {
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = Math.round(
    ((target.getTime() - firstThursday.getTime()) / 86400000 -
      3 +
      ((firstThursday.getUTCDay() + 6) % 7)) /
      7
  );
  return week + 1;
}
