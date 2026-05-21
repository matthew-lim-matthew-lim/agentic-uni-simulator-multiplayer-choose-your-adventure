import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * OAuth callback — Supabase redirects the browser here after the Google
 * popup; we exchange the auth `code` for a session cookie and forward the
 * user to the page they originally wanted (or /play by default).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const redirectTo = url.searchParams.get("redirectTo") || "/play";

  if (code) {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorUrl = new URL("/", url.origin);
      errorUrl.searchParams.set("authError", error.message);
      return NextResponse.redirect(errorUrl);
    }
  }

  return NextResponse.redirect(new URL(redirectTo, url.origin));
}
