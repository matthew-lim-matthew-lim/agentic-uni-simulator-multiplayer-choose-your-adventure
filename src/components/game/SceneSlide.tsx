"use client";

import { AnimatePresence, motion } from "framer-motion";
import { MapPin, User2 } from "lucide-react";
import { Typewriter } from "./Typewriter";
import { Card } from "@/components/ui/card";

interface Props {
  nodeId: string;
  sceneText: string;
  location: string;
  authorName: string;
  authorIsYou: boolean;
  authorHue?: number;
  isLoading?: boolean;
  onDone?: () => void;
}

export function SceneSlide({
  nodeId,
  sceneText,
  location,
  authorName,
  authorIsYou,
  authorHue,
  isLoading,
  onDone,
}: Props) {
  const hue = authorHue ?? 50;
  const tagBg = `hsla(${hue}, 80%, 55%, ${authorIsYou ? 0.18 : 0.1})`;
  const tagBorder = `hsla(${hue}, 80%, 55%, 0.45)`;
  const tagText = `hsl(${hue}, 90%, 75%)`;

  return (
    <div className="relative w-full">
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <Card className="p-8 min-h-[180px] flex items-center gap-3 text-[var(--muted)]">
              <div className="size-2 rounded-full bg-[var(--accent)] animate-pulse" />
              <span className="text-sm">
                Generating your next moment…
              </span>
            </Card>
          </motion.div>
        ) : (
          <motion.div
            key={nodeId}
            initial={{ opacity: 0, y: 24, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -16, filter: "blur(4px)" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <Card className="p-7 md:p-8">
              <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-1 text-[var(--muted)]">
                  <MapPin size={12} />
                  {location}
                </span>
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
                  style={{
                    background: tagBg,
                    borderWidth: 1,
                    borderStyle: "solid",
                    borderColor: tagBorder,
                    color: tagText,
                  }}
                >
                  <User2 size={12} />
                  {authorIsYou ? "your node" : `node by @${authorName}`}
                </span>
              </div>
              <Typewriter
                key={nodeId}
                text={sceneText}
                onDone={onDone}
                className="font-display text-xl md:text-[1.35rem] text-[var(--foreground)]/95"
              />
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
