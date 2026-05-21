"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSupabaseServer } from "@/lib/supabase/server";

export async function signInWithGoogle(redirectTo?: string) {
  const supabase = await getSupabaseServer();
  const h = await headers();
  const origin = h.get("origin") || h.get("host") || "http://localhost:3000";
  const base = origin.startsWith("http") ? origin : `https://${origin}`;
  const callback = new URL("/auth/callback", base);
  if (redirectTo) callback.searchParams.set("redirectTo", redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) {
    redirect("/?authError=" + encodeURIComponent(error?.message ?? "OAuth failed"));
  }
  redirect(data.url);
}

export async function signOut() {
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut();
  redirect("/");
}
