"use client";

import { motion } from "framer-motion";
import { Battery, BookOpen, Coins, Users } from "lucide-react";
import type { Stats } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const BARS: Array<{
  key: keyof Omit<Stats, "money">;
  label: string;
  icon: React.ElementType;
  hue: string;
}> = [
  { key: "energy", label: "Energy", icon: Battery, hue: "#7be39c" },
  { key: "study", label: "Study", icon: BookOpen, hue: "#8aaaff" },
  { key: "social", label: "Social", icon: Users, hue: "#ff8ad1" },
];

export function StatBars({ stats, className }: { stats: Stats; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {BARS.map(({ key, label, icon: Icon, hue }) => {
        const value = stats[key];
        return (
          <div key={key} className="text-xs">
            <div className="flex items-center justify-between text-[var(--muted)] mb-1">
              <span className="inline-flex items-center gap-1.5">
                <Icon size={12} />
                {label}
              </span>
              <span className="font-mono">{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-[var(--surface-2)] overflow-hidden">
              <motion.div
                initial={false}
                animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ background: hue }}
              />
            </div>
          </div>
        );
      })}
      <div className="flex items-center justify-between pt-1 text-xs">
        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
          <Coins size={12} />
          Wallet
        </span>
        <span className="font-mono text-[var(--accent)]">${stats.money}</span>
      </div>
    </div>
  );
}
