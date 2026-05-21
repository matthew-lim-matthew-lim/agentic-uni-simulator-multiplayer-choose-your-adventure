import Link from "next/link";
import { redirect } from "next/navigation";
import { GraphClient } from "./GraphClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getActiveCharacter } from "@/lib/game/db";
import { getSessionUser } from "@/lib/supabase/get-user";
import { getSupabaseServer, isSupabaseConfigured } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function GraphPage({
  searchParams,
}: {
  searchParams: Promise<{ characterId?: string }>;
}) {
  const { characterId: explicitId } = await searchParams;

  if (!isSupabaseConfigured()) {
    return <DemoModeNotice />;
  }
  const user = await getSessionUser();
  if (!user) {
    redirect("/?redirectTo=/graph");
  }

  let resolvedId = explicitId;
  if (!resolvedId) {
    const supabase = await getSupabaseServer();
    const active = await getActiveCharacter(supabase, user.id);
    if (!active) {
      return <NoCharactersYet />;
    }
    resolvedId = active.characterId;
  }

  return <GraphClient characterId={resolvedId} />;
}

function DemoModeNotice() {
  return (
    <Wrap>
      <Card className="p-6 max-w-md mx-auto text-center">
        <div className="font-display text-xl mb-2">Demo mode</div>
        <div className="text-sm text-[var(--muted)] mb-4">
          Story graphs need Supabase persistence. Configure
          NEXT_PUBLIC_SUPABASE_URL / KEY and SUPABASE_SERVICE_ROLE_KEY to
          enable them.
        </div>
        <Link href="/play">
          <Button variant="secondary" size="sm">
            Back to play
          </Button>
        </Link>
      </Card>
    </Wrap>
  );
}

function NoCharactersYet() {
  return (
    <Wrap>
      <Card className="p-6 max-w-md mx-auto text-center">
        <div className="font-display text-xl mb-2">Nothing to graph yet</div>
        <div className="text-sm text-[var(--muted)] mb-4">
          You haven&apos;t played a turn yet — start a life and your story
          graph will appear here.
        </div>
        <Link href="/play">
          <Button size="sm">Start playing</Button>
        </Link>
      </Card>
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
        </div>
      </header>
      <main className="flex-1 grid place-items-center py-20 px-6">{children}</main>
    </div>
  );
}
