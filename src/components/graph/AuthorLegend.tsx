"use client";

import type { GraphAuthor } from "@/lib/game/graph";

export function AuthorLegend({ authors }: { authors: GraphAuthor[] }) {
  if (authors.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {authors.map((a) => (
        <div
          key={a.id}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
          style={{
            background: `hsla(${a.hue}, 85%, 55%, ${a.isYou ? 0.18 : 0.1})`,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: `hsla(${a.hue}, 85%, 55%, 0.5)`,
            color: `hsl(${a.hue}, 90%, 75%)`,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: `hsl(${a.hue}, 95%, 65%)` }}
          />
          {a.isYou ? "you" : `@${a.name}`}
          <span className="opacity-60">{a.nodeCount}</span>
        </div>
      ))}
    </div>
  );
}
