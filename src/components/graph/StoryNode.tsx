"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import { MapPin, Star } from "lucide-react";

export interface StoryNodeData extends Record<string, unknown> {
  authorName: string;
  authorHue: number;
  isYou: boolean;
  isCurrent: boolean;
  isRoot: boolean;
  location: string;
  sceneSnippet: string;
  chosenAction: string | null;
}

export function StoryNode({ data, selected }: NodeProps) {
  const d = data as StoryNodeData;
  const hue = d.authorHue;
  const bg = d.isYou
    ? `hsla(${hue}, 90%, 55%, 0.18)`
    : `hsla(${hue}, 70%, 60%, 0.10)`;
  const border = d.isCurrent
    ? `hsl(${hue}, 95%, 70%)`
    : d.isYou
      ? `hsla(${hue}, 85%, 60%, 0.7)`
      : `hsla(${hue}, 70%, 60%, 0.45)`;
  const textColor = `hsl(${hue}, 85%, 78%)`;

  return (
    <div
      className="rounded-xl text-xs cursor-pointer transition-shadow"
      style={{
        width: 200,
        background: bg,
        borderWidth: d.isCurrent ? 2 : 1,
        borderStyle: "solid",
        borderColor: border,
        boxShadow: selected
          ? `0 0 0 2px hsla(${hue}, 95%, 65%, 0.6)`
          : d.isCurrent
            ? `0 0 18px -4px hsla(${hue}, 95%, 65%, 0.6)`
            : undefined,
      }}
    >
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <div className="p-2.5">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <span
            className="inline-flex items-center gap-1 font-medium truncate"
            style={{ color: textColor }}
          >
            {d.isRoot && <Star size={10} />}
            {d.isYou ? "you" : `@${d.authorName}`}
          </span>
          {d.isCurrent && (
            <span
              className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full"
              style={{
                background: `hsla(${hue}, 90%, 55%, 0.25)`,
                color: `hsl(${hue}, 95%, 80%)`,
              }}
            >
              here
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-[10px] text-[var(--muted)] mb-1.5 truncate">
          <MapPin size={9} />
          {d.location}
        </div>
        <div className="text-[var(--foreground)]/85 leading-snug line-clamp-3">
          {d.sceneSnippet}
        </div>
        {d.chosenAction && (
          <div className="mt-2 pt-2 border-t border-[var(--border)]/50 text-[10px] text-[var(--muted)] italic line-clamp-1">
            ↳ {d.chosenAction}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  );
}
