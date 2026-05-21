"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  text: string;
  charMs?: number;
  startDelayMs?: number;
  className?: string;
  onDone?: () => void;
}

/**
 * Reveals `text` one character at a time. To reset for new text, the parent
 * should re-mount with a fresh `key` (e.g. nodeId).
 */
export function Typewriter({
  text,
  charMs = 18,
  startDelayMs = 120,
  className,
  onDone,
}: Props) {
  const [shown, setShown] = useState(0);
  const isDone = shown >= text.length;

  useEffect(() => {
    if (isDone) return;
    const delay = shown === 0 ? startDelayMs : charMs;
    const t = window.setTimeout(() => {
      setShown((n) => Math.min(n + 1, text.length));
    }, delay);
    return () => window.clearTimeout(t);
  }, [shown, text.length, charMs, startDelayMs, isDone]);

  useEffect(() => {
    if (isDone && onDone) onDone();
  }, [isDone, onDone]);

  return (
    <p className={cn("whitespace-pre-wrap leading-relaxed", className)}>
      {text.slice(0, shown)}
      {!isDone && <span className="typewriter-caret" aria-hidden />}
    </p>
  );
}
