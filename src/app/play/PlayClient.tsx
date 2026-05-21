"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, Loader2, MapPin, RefreshCcw } from "lucide-react";
import { Avatar } from "@/components/game/Avatar";
import { ChoiceGrid } from "@/components/game/ChoiceGrid";
import { SceneSlide } from "@/components/game/SceneSlide";
import { StatBars } from "@/components/game/StatBar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  STARTING_AVATAR,
  STARTING_STATS,
  type AvatarConfig,
  type Stats,
} from "@/lib/game/types";
import { hueForId } from "@/lib/game/hue";

interface CharacterState {
  id: string;
  name: string;
  authorName: string;
  stats: Stats;
  avatarConfig: AvatarConfig;
  currentLocation: string;
  gameTime: string;
}

interface SceneState {
  nodeId: string;
  sceneText: string;
  location: string;
  presetChoices: string[];
  crossedWithNodeIds: string[];
  authorName: string;
  authorIsYou: boolean;
}

export function PlayClient() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [character, setCharacter] = useState<CharacterState | null>(null);
  const [scene, setScene] = useState<SceneState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typewriterDone, setTypewriterDone] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    start();
  }, []);

  async function start() {
    setLoading(true);
    setError(null);
    setTypewriterDone(false);
    try {
      const res = await fetch("/api/scene/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start");
      }
      setSessionId(data.sessionId);
      setCharacter(data.character);
      setScene(data.scene);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  async function pick(action: string, isCustom: boolean) {
    if (!sessionId || loading) return;
    setLoading(true);
    setError(null);
    setTypewriterDone(false);
    try {
      const res = await fetch("/api/scene/next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, action, isCustom }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to advance");
      setCharacter(data.character);
      setScene(data.scene);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  const displayCharacter = character ?? {
    id: "preview",
    name: "You",
    authorName: "you",
    stats: STARTING_STATS,
    avatarConfig: STARTING_AVATAR,
    currentLocation: "Loading…",
    gameTime: new Date().toISOString(),
  };

  const authorHue = scene
    ? hueForId(scene.authorName || displayCharacter.id)
    : undefined;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)]/50 backdrop-blur-sm sticky top-0 z-10 bg-[var(--background)]/70">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="size-7 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] grid place-items-center font-display font-bold text-sm">
              U
            </div>
            <div className="text-sm font-medium">UNSW Infinite</div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/graph">
              <Button variant="ghost" size="sm">
                Story graph
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="ghost" size="sm">
                Explore
              </Button>
            </Link>
            <Button variant="secondary" size="sm" onClick={start}>
              <RefreshCcw size={14} /> New life
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-8 grid lg:grid-cols-[280px_1fr] gap-6">
          <aside className="space-y-4">
            <Card className="p-5">
              <div className="flex flex-col items-center text-center">
                <Avatar
                  config={displayCharacter.avatarConfig}
                  stats={displayCharacter.stats}
                  size={140}
                />
                <div className="mt-2 font-display text-lg font-semibold">
                  {displayCharacter.name}
                </div>
                <div className="text-xs text-[var(--muted)] inline-flex items-center gap-1 mt-1">
                  <MapPin size={11} />
                  {displayCharacter.currentLocation}
                </div>
                <div className="text-xs text-[var(--muted)] inline-flex items-center gap-1 mt-0.5">
                  <Clock size={11} />
                  {formatGameTime(displayCharacter.gameTime)}
                </div>
              </div>
              <div className="mt-5">
                <StatBars stats={displayCharacter.stats} />
              </div>
            </Card>
            <Card className="p-4 text-xs text-[var(--muted)] leading-relaxed">
              <div className="font-medium text-[var(--foreground)] mb-1">
                Tip
              </div>
              Pick a tile, or type your own action. Every scene is generated
              fresh — your full story is the prompt.
            </Card>
          </aside>

          <section className="space-y-4 min-h-[60vh]">
            {error && (
              <Card className="p-5 border-[var(--danger)]/40 bg-[var(--danger)]/5">
                <div className="text-sm font-medium text-[var(--danger)] mb-1">
                  Something broke
                </div>
                <div className="text-sm text-[var(--muted)]">{error}</div>
                <div className="mt-3">
                  <Button variant="outline" size="sm" onClick={start}>
                    <RefreshCcw size={14} /> Try again
                  </Button>
                </div>
              </Card>
            )}

            {!error && (
              <>
                <SceneSlide
                  nodeId={scene?.nodeId ?? "loading"}
                  sceneText={scene?.sceneText ?? ""}
                  location={scene?.location ?? "—"}
                  authorName={scene?.authorName ?? displayCharacter.name}
                  authorIsYou={scene?.authorIsYou ?? true}
                  authorHue={authorHue}
                  isLoading={loading || !scene}
                  onDone={() => setTypewriterDone(true)}
                />

                {scene && (
                  <ChoiceGrid
                    choices={scene.presetChoices}
                    disabled={loading}
                    visible={!loading && typewriterDone}
                    onPick={pick}
                  />
                )}

                <AnimatePresence>
                  {loading && scene && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-2 text-xs text-[var(--muted)]"
                    >
                      <Loader2 size={12} className="animate-spin" />
                      Spinning up the next scene…
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

function formatGameTime(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-AU", {
      weekday: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "Australia/Sydney",
    });
  } catch {
    return iso;
  }
}
