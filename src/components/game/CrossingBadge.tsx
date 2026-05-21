"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { GitMerge } from "lucide-react";

interface CrossingPreview {
  nodeId: string;
  authorName: string;
  authorHue: number;
  characterName: string;
}

/**
 * Renders the "↔ you crossed with @x" badge below a scene. We resolve the
 * crossed node's author + character lazily so the parent (which only knows
 * the node ids) doesn't need to know who's behind them.
 */
export function CrossingBadges({ nodeIds }: { nodeIds: string[] }) {
  const [previews, setPreviews] = useState<CrossingPreview[]>([]);

  useEffect(() => {
    let cancelled = false;
    if (nodeIds.length === 0) {
      // nothing to fetch; parent should also key us by node ids to remount
      return;
    }
    (async () => {
      const results = await Promise.all(
        nodeIds.map(async (id) => {
          try {
            const res = await fetch(`/api/node/${id}`);
            if (!res.ok) return null;
            const d = await res.json();
            return {
              nodeId: id,
              authorName: d.authorName,
              authorHue: d.authorHue,
              characterName: d.characterName,
            } as CrossingPreview;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      setPreviews(results.filter(Boolean) as CrossingPreview[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [nodeIds]);

  if (previews.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {previews.map((p) => (
        <motion.div
          key={p.nodeId}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs"
          style={{
            background: `hsla(${p.authorHue}, 90%, 55%, 0.15)`,
            color: `hsl(${p.authorHue}, 90%, 75%)`,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: `hsla(${p.authorHue}, 90%, 55%, 0.45)`,
          }}
        >
          <GitMerge size={11} />
          crossed paths with{" "}
          <Link
            href={`/node/${p.nodeId}`}
            className="font-medium underline-offset-2 hover:underline"
          >
            @{p.authorName} · {p.characterName}
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
