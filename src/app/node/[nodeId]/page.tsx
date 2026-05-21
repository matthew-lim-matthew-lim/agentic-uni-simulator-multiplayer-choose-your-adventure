import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, MapPin, User2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ContinueFromHereButton } from "@/components/game/ContinueFromHereButton";
import { getNodeDetail } from "@/lib/game/node-detail";
import { getActiveCharacter } from "@/lib/game/db";
import { getSessionUser } from "@/lib/supabase/get-user";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function NodePage({
  params,
}: {
  params: Promise<{ nodeId: string }>;
}) {
  const { nodeId } = await params;

  if (!isSupabaseConfigured()) {
    return (
      <Wrap>
        <Card className="p-6 max-w-md mx-auto text-center">
          <div className="font-display text-xl mb-2">Demo mode</div>
          <div className="text-sm text-[var(--muted)]">
            Node detail needs Supabase persistence.
          </div>
        </Card>
      </Wrap>
    );
  }

  const supabase = await getSupabaseServer();
  const user = await getSessionUser();
  const detail = await getNodeDetail(supabase, nodeId, user?.id ?? null);
  if (!detail) notFound();

  let viewerCharacterId: string | null = null;
  if (user) {
    const active = await getActiveCharacter(supabase, user.id);
    viewerCharacterId = active?.characterId ?? null;
  }

  const hue = detail.authorHue;
  const isYou = user !== null && detail.authorUserId === user.id;

  return (
    <Wrap>
      <article className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/graph?characterId=${detail.characterId}`}
            className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] inline-flex items-center gap-1.5"
          >
            <ArrowLeft size={14} /> View graph
          </Link>
          {detail.childCount > 0 && (
            <div className="text-xs text-[var(--muted)]">
              {detail.childCount} branch{detail.childCount === 1 ? "" : "es"} from this node
            </div>
          )}
        </div>

        <Card className="p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-2 text-xs mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium"
              style={{
                background: `hsla(${hue}, 90%, 55%, ${isYou ? 0.18 : 0.1})`,
                color: `hsl(${hue}, 90%, 75%)`,
                borderWidth: 1,
                borderStyle: "solid",
                borderColor: `hsla(${hue}, 90%, 55%, 0.45)`,
              }}
            >
              <User2 size={12} />
              {isYou ? "you" : `@${detail.authorName}`} · {detail.characterName}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-2)] border border-[var(--border)] px-2.5 py-1 text-[var(--muted)]">
              <MapPin size={12} />
              {detail.location}
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
              <Clock size={12} />
              {new Date(detail.gameTime).toLocaleString("en-AU", {
                weekday: "short",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
                timeZone: "Australia/Sydney",
              })}
            </span>
          </div>

          {detail.chosenAction && (
            <div className="text-xs italic text-[var(--muted)] mb-3">
              ↳ after: &ldquo;{detail.chosenAction}&rdquo;
            </div>
          )}

          <p className="font-display text-[1.35rem] leading-relaxed whitespace-pre-wrap text-[var(--foreground)]/95">
            {detail.sceneText}
          </p>

          <div className="mt-6 pt-5 border-t border-[var(--border)]/50">
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted)] mb-2">
              Choices offered here
            </div>
            <ul className="grid sm:grid-cols-2 gap-2 text-sm text-[var(--muted)]">
              {detail.presetChoices.map((c, i) => (
                <li
                  key={i}
                  className="flex gap-2 rounded-lg border border-[var(--border)]/60 bg-[var(--surface)]/40 px-3 py-2"
                >
                  <span className="font-mono text-xs opacity-60">
                    {String.fromCharCode(65 + i)}.
                  </span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {user ? (
              <ContinueFromHereButton
                characterId={viewerCharacterId}
                targetNodeId={detail.id}
                authorName={detail.authorName}
                authorIsYou={isYou}
              />
            ) : (
              <Link href={`/?redirectTo=/node/${detail.id}`}>
                <Button size="sm">Sign in to branch off</Button>
              </Link>
            )}
          </div>
        </Card>

        {detail.ancestry.length > 0 && (
          <Card className="p-6">
            <div className="text-xs font-medium uppercase tracking-wider text-[var(--muted)] mb-4">
              Story so far ({detail.ancestry.length} node{detail.ancestry.length === 1 ? "" : "s"})
            </div>
            <ol className="space-y-4">
              {detail.ancestry.map((a, i) => (
                <li
                  key={a.id}
                  className="border-l-2 pl-4"
                  style={{
                    borderColor: `hsla(${a.authorHue}, 85%, 55%, ${a.isYou ? 0.7 : 0.4})`,
                  }}
                >
                  <div className="flex items-center gap-2 text-[10px] mb-1">
                    <span
                      className="font-mono"
                      style={{ color: `hsl(${a.authorHue}, 80%, 70%)` }}
                    >
                      {i + 1}.
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: `hsl(${a.authorHue}, 80%, 75%)` }}
                    >
                      {a.isYou ? "you" : `@${a.authorName}`}
                    </span>
                    <span className="text-[var(--muted)]">·</span>
                    <span className="text-[var(--muted)]">{a.location}</span>
                  </div>
                  {a.chosenAction && (
                    <div className="text-[10px] italic text-[var(--muted)] mb-0.5">
                      ↳ after: &ldquo;{a.chosenAction}&rdquo;
                    </div>
                  )}
                  <div className="text-xs text-[var(--foreground)]/80 leading-relaxed line-clamp-3">
                    {a.sceneText}
                  </div>
                  <Link
                    href={`/node/${a.id}`}
                    className="text-[10px] text-[var(--muted)] hover:text-[var(--foreground)] inline-block mt-1"
                  >
                    Open ↗
                  </Link>
                </li>
              ))}
            </ol>
          </Card>
        )}
      </article>
    </Wrap>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--border)]/50 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="size-7 rounded-md bg-[var(--accent)] text-[var(--accent-ink)] grid place-items-center font-display font-bold text-sm">
              U
            </div>
            <div className="text-sm font-medium">UNSW Infinite</div>
          </Link>
          <div className="flex items-center gap-2">
            <Link href="/play">
              <Button variant="ghost" size="sm">
                Play
              </Button>
            </Link>
            <Link href="/explore">
              <Button variant="ghost" size="sm">
                Explore
              </Button>
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
