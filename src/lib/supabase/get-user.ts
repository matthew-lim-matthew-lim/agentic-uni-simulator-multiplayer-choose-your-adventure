import "server-only";

import { getSupabaseServer } from "./server";
import type { Profile } from "./types";

export interface SessionUser {
  id: string;
  email: string | null;
  profile: Profile;
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    // The on_auth_user_created trigger may not have fired yet (rare race);
    // synthesize a minimal profile so the UI doesn't crash.
    return {
      id: user.id,
      email: user.email ?? null,
      profile: {
        id: user.id,
        display_name: user.email?.split("@")[0] ?? "Player",
        avatar_url: null,
        hue: 50,
        created_at: new Date().toISOString(),
      },
    };
  }
  return { id: user.id, email: user.email ?? null, profile };
}
