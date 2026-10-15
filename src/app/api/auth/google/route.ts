import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/guard";
import { oauthCallbackUrl, safeNextPath } from "@/lib/auth/redirect";
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
    const response = NextResponse.json({ ok: true });
    const supabase = createSupabaseRouteClient(request, response);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: oauthCallbackUrl(request, next),
        queryParams: { access_type: "offline", prompt: "select_account" },
      },
    });
    if (error || !data.url) {
      const raw = error?.message || "";
      const message = /provider is not enabled|Unsupported provider/i.test(raw)
        ? "Google n’est pas activé dans Supabase. Authentication → Providers → Google : activer, coller Client ID et Client Secret, puis enregistrer."
        : raw || "Impossible de démarrer la connexion Google.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ url: data.url }, { headers: response.headers });
  } catch (error) {
    return errorResponse(error);
  }
}
