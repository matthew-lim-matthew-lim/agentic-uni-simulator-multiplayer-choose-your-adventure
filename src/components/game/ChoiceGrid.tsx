"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { type FormEvent, useState } from "react";
import { cn } from "@/lib/utils";

interface Props {
  choices: string[];
  disabled?: boolean;
  visible?: boolean;
  onPick: (action: string, isCustom: boolean) => void;
}

export function ChoiceGrid({ choices, disabled, visible = true, onPick }: Props) {
  const [custom, setCustom] = useState("");

  const handleCustomSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = custom.trim();
    if (!trimmed || disabled) return;
    setCustom("");
    onPick(trimmed, true);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="choices"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.25, delay: 0.05 }}
          className="space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {choices.map((choice, i) => (
              <motion.button
                key={`${i}-${choice}`}
                type="button"
                disabled={disabled}
                onClick={() => onPick(choice, false)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: 0.05 + i * 0.05 }}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.99 }}
                className={cn(
                  "choice-tile text-left rounded-xl px-4 py-3.5",
                  "bg-[var(--surface)] hover:bg-[var(--surface-2)]",
                  "border border-[var(--border)] hover:border-[var(--accent)]/60",
                  "transition-colors",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 size-6 rounded-md bg-[var(--accent)]/15 text-[var(--accent)] grid place-items-center text-xs font-mono">
                    {String.fromCharCode(65 + i)}
                  </div>
                  <span className="text-sm leading-snug">{choice}</span>
                </div>
              </motion.button>
            ))}
          </div>

          <form
            onSubmit={handleCustomSubmit}
            className="flex items-stretch gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)]/60 transition-colors"
          >
            <div className="grid place-items-center pl-3 text-[var(--muted)]">
              <Sparkles size={14} />
            </div>
            <input
              type="text"
              value={custom}
              disabled={disabled}
              onChange={(e) => setCustom(e.target.value)}
              placeholder="…or do something else entirely"
              className="flex-1 bg-transparent px-2 py-3 text-sm outline-none placeholder:text-[var(--muted)]/70"
            />
            <button
              type="submit"
              disabled={disabled || custom.trim().length === 0}
              className="m-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[var(--accent)] text-[var(--accent-ink)] px-3 text-xs font-medium hover:bg-[var(--accent-strong)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send size={12} /> Send
            </button>
          </form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
