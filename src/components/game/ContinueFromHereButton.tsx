"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GitBranch, GitMerge, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  characterId: string | null;
  targetNodeId: string;
  authorName: string;
  authorIsYou: boolean;
  disabled?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function ContinueFromHereButton({
  characterId,
  targetNodeId,
  authorName,
  authorIsYou,
  disabled,
  className,
  size = "sm",
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!characterId) {
      router.push("/play");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/character/jump", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId, targetNodeId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to jump");
      router.push("/play");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setBusy(false);
    }
  };

  const label = authorIsYou
    ? "Continue from here"
    : `Branch off @${authorName}'s story`;
  const Icon = authorIsYou ? GitMerge : GitBranch;

  if (!confirming) {
    return (
      <div className={className}>
        <Button
          size={size}
          variant="secondary"
          disabled={disabled || busy || !characterId}
          onClick={() => setConfirming(true)}
        >
          <Icon size={14} />
          {label}
        </Button>
        {!characterId && (
          <div className="mt-1 text-[10px] text-[var(--muted)]">
            Sign in and start a character first.
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 space-y-2">
        <div className="text-xs text-[var(--muted)] leading-relaxed">
          {authorIsYou ? (
            <>This rewinds your character&apos;s active scene to this node. Your existing branches stay in the graph as siblings.</>
          ) : (
            <>
              You&apos;ll continue from <strong>@{authorName}</strong>&apos;s
              node. Your next scenes will be authored by you and shown with
              your own color. The original branch stays untouched.
            </>
          )}
        </div>
        {err && (
          <div className="text-xs text-[var(--danger)]">{err}</div>
        )}
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={submit} disabled={busy}>
            {busy && <Loader2 size={12} className="animate-spin" />}
            {busy ? "Jumping…" : authorIsYou ? "Yes, rewind here" : "Yes, branch off"}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setConfirming(false)}
            disabled={busy}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
