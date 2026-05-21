"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, MapPin, RefreshCcw, User2 } from "lucide-react";
import { AuthorLegend } from "@/components/graph/AuthorLegend";
import { StoryGraph } from "@/components/graph/StoryGraph";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContinueFromHereButton } from "@/components/game/ContinueFromHereButton";
import type { GraphAuthor, GraphNode } from "@/lib/game/graph";

interface GraphPayload {
  characterId: string;
  characterName: string;
  characterOwnerId: string;
  characterOwnerName: string;
  currentNodeId: string | null;
  nodes: GraphNode[];
  authors: GraphAuthor[];
}

export function GraphClient({
  characterId,
  viewerCharacterId,
}: {
  characterId: string;
  viewerCharacterId?: string | null;
}) {
  const [data, setData] = useState<GraphPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/graph/${characterId}`);
        const json = await res.json();
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error || "Failed to load graph");
        setData(json);
        setError(null);
        if (json.currentNodeId) {
          const cur = json.nodes.find(
            (n: GraphNode) => n.id === json.currentNodeId
          );
          if (cur) setSelected(cur);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [characterId, refreshTick]);

  const refresh = () => {
    setLoading(true);
    setRefreshTick((t) => t + 1);
  };

  const jumpCharacterId =
    viewerCharacterId ?? (data && data.characterId) ?? null;

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
          <Link
            href="/play"
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> Back to play
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={refresh}>
              <RefreshCcw size={14} /> Refresh
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-6 py-6 grid lg:grid-cols-[1fr_320px] gap-6 h-[calc(100vh-7rem)]">
          <Card className="overflow-hidden h-full">
            {error && (
              <div className="p-6">
                <div className="text-sm text-[var(--danger)] mb-2">
                  Couldn&apos;t load graph
                </div>
                <div className="text-xs text-[var(--muted)] mb-3">{error}</div>
                <Button variant="outline" size="sm" onClick={refresh}>
                  <RefreshCcw size={14} /> Try again
                </Button>
              </div>
            )}
            {!error && (loading || !data) && (
              <div className="p-6 text-sm text-[var(--muted)]">
                Loading your graph…
              </div>
            )}
            {!error && data && (
              <div className="h-full w-full">
                <StoryGraph
                  nodes={data.nodes}
                  authors={data.authors}
                  onSelect={(n) => setSelected(n)}
                  selectedNodeId={selected?.id}
                />
              </div>
            )}
          </Card>

          <aside className="space-y-4 overflow-y-auto pr-1 scrollbar-thin">
            {data && (
              <Card className="p-4 space-y-3">
                <div className="font-display text-lg font-semibold leading-tight">
                  {data.characterName}
                </div>
                <div className="text-xs text-[var(--muted)]">
                  Persona played by @{data.characterOwnerName} ·{" "}
                  {data.nodes.length} node{data.nodes.length === 1 ? "" : "s"}
                </div>
                <div>
                  <div className="text-xs font-medium text-[var(--muted)] mb-2 uppercase tracking-wider">
                    Authors in this graph
                  </div>
                  <AuthorLegend authors={data.authors} />
                </div>
              </Card>
            )}

            {selected && (
              <NodeDetail node={selected} characterId={jumpCharacterId} />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}

function NodeDetail({
  node,
  characterId,
}: {
  node: GraphNode;
  characterId: string | null;
}) {
  const hue = node.authorHue;
  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium"
          style={{
            background: `hsla(${hue}, 90%, 55%, ${node.isYou ? 0.18 : 0.1})`,
            color: `hsl(${hue}, 90%, 75%)`,
            borderWidth: 1,
            borderStyle: "solid",
            borderColor: `hsla(${hue}, 90%, 55%, 0.45)`,
          }}
        >
          <User2 size={11} /> {node.isYou ? "you" : `@${node.authorName}`}
        </span>
        <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
          <MapPin size={11} /> {node.location}
        </span>
      </div>

      {node.chosenAction && (
        <div className="text-xs italic text-[var(--muted)] mb-2">
          ↳ after: &ldquo;{node.chosenAction}&rdquo;
        </div>
      )}

      <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4 font-display text-[var(--foreground)]/90">
        {node.fullSceneText}
      </p>

      <div className="border-t border-[var(--border)]/50 pt-3 space-y-2 mb-4">
        <div className="text-[10px] uppercase tracking-wider text-[var(--muted)]">
          Choices offered here
        </div>
        <ul className="text-xs space-y-1.5 text-[var(--muted)]">
          {node.presetChoices.map((c, i) => (
            <li key={i} className="flex gap-2">
              <span className="font-mono opacity-60">
                {String.fromCharCode(65 + i)}.
              </span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-[var(--border)]/50 pt-3 space-y-2">
        <ContinueFromHereButton
          characterId={characterId}
          targetNodeId={node.id}
          authorName={node.authorName}
          authorIsYou={node.isYou}
        />
        <Link
          href={`/node/${node.id}`}
          className="block text-[11px] text-[var(--muted)] hover:text-[var(--foreground)]"
        >
          Open full-page view ↗
        </Link>
      </div>
    </Card>
  );
}
