"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Compass, MapPin, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface CharacterPreview {
  id: string;
  name: string;
  ownerName: string;
  ownerHue: number;
  nodeCount: number;
  latestNodeId: string | null;
  latestLocation: string | null;
  latestSceneSnippet: string | null;
  latestCreatedAt: string | null;
}

export function ExploreClient() {
  const [items, setItems] = useState<CharacterPreview[]>([]);
  const [offset, setOffset] = useState<number | null>(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (offset === null) return;
    (async () => {
      try {
        const res = await fetch(`/api/explore?offset=${offset}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "Failed to load explore");
        setItems((cur) =>
          offset === 0 ? json.characters : [...cur, ...json.characters]
        );
        setNextOffset(json.nextOffset);
        setError(null);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [offset]);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Home
          </Link>
          <Link href="/play">
            <Button size="sm">Play</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 text-xs text-[var(--muted)] mb-3">
              <Compass size={14} /> Global story explorer
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              Other people&apos;s UNSW lives.
            </h1>
            <p className="mt-3 text-sm text-[var(--muted)] max-w-xl">
              Browse public timelines. Click any to read the scene. From there
              you can branch off and continue someone else&apos;s story as
              your own.
            </p>
          </div>

          {error && (
            <Card className="p-5 border-[var(--danger)]/40 bg-[var(--danger)]/5">
              <div className="text-sm text-[var(--danger)] mb-2">
                Couldn&apos;t load
              </div>
              <div className="text-xs text-[var(--muted)] mb-3">{error}</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setOffset(0);
                  setLoading(true);
                }}
              >
                <RefreshCcw size={14} /> Try again
              </Button>
            </Card>
          )}

          {!error && items.length === 0 && !loading && (
            <Card className="p-8 text-center">
              <div className="text-sm text-[var(--muted)]">
                No public stories yet — be the first.
              </div>
              <Link href="/play" className="inline-block mt-4">
                <Button>Start a life</Button>
              </Link>
            </Card>
          )}

          {items.length > 0 && (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((c) => (
                <ExploreCard key={c.id} c={c} />
              ))}
            </div>
          )}

          {nextOffset !== null && (
            <div className="text-center">
              <Button
                variant="secondary"
                onClick={() => setOffset(nextOffset)}
                disabled={loading}
              >
                Load more
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center text-xs text-[var(--muted)]">
              Loading…
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function ExploreCard({ c }: { c: CharacterPreview }) {
  const hue = c.ownerHue;
  return (
    <Card className="p-5 flex flex-col gap-3 hover:border-[var(--accent)]/40 transition-colors">
      <div className="flex items-center justify-between">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
          style={{
            background: `hsla(${hue}, 90%, 55%, 0.15)`,
            color: `hsl(${hue}, 90%, 75%)`,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: `hsla(${hue}, 90%, 55%, 0.45)`,
          }}
        >
          <span
            className="size-1.5 rounded-full"
            style={{ background: `hsl(${hue}, 95%, 65%)` }}
          />
          @{c.ownerName}
        </span>
        <span className="text-xs text-[var(--muted)]">
          {c.nodeCount} node{c.nodeCount === 1 ? "" : "s"}
        </span>
      </div>
      <div className="font-display text-lg font-semibold leading-tight">
        {c.name}
      </div>
      {c.latestLocation && (
        <div className="text-xs text-[var(--muted)] inline-flex items-center gap-1.5">
          <MapPin size={11} /> {c.latestLocation}
        </div>
      )}
      {c.latestSceneSnippet && (
        <p className="text-sm text-[var(--foreground)]/80 leading-relaxed line-clamp-4 flex-1">
          {c.latestSceneSnippet}
        </p>
      )}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--border)]/50">
        <Link
          href={`/graph?characterId=${c.id}`}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          View graph
        </Link>
        {c.latestNodeId && (
          <Link
            href={`/node/${c.latestNodeId}`}
            className="text-xs text-[var(--accent)] hover:text-[var(--accent-strong)]"
          >
            Read latest ↗
          </Link>
        )}
      </div>
    </Card>
  );
}
