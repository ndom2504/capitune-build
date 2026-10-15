import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/guard";
import { safeNextPath } from "@/lib/auth/redirect";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  try {
    if (!isSupabaseEnabled()) {
      return NextResponse.json(
        { error: "La connexion Google nécessite DATA_STORE=supabase." },
        { status: 400 },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { next?: string };
    const next = safeNextPath(body.next);
    const origin = new URL(request.url).origin;
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteClient(request, response);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error || !data.url) {
      return NextResponse.json(
        { error: error?.message || "Impossible de démarrer la connexion Google." },
        { status: 400 },
      );
    }
    return NextResponse.json({ url: data.url }, { headers: response.headers });
  } catch (error) {
    return errorResponse(error);
  }
}
