import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/redirect";
import { seedDemoProject } from "@/lib/projects/seed";
import { getRepository } from "@/lib/store";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

function displayNameFromUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata || {};
  const fromMeta = [meta.full_name, meta.name, meta.display_name].find(
    (value) => typeof value === "string" && value.trim().length >= 2,
  ) as string | undefined;
  return fromMeta?.trim() || user.email || "Utilisateur";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNextPath(url.searchParams.get("next"));
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (oauthError || !code) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", oauthError || "Connexion Google annulée.");
    return NextResponse.redirect(login);
  }

  const redirect = NextResponse.redirect(new URL(next === "/" ? "/dashboard" : next, url.origin));
  const supabase = createSupabaseRouteClient(request, redirect);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const login = new URL("/login", url.origin);
    login.searchParams.set("error", error.message);
    return NextResponse.redirect(login);
  }

  const { data } = await supabase.auth.getUser();
  if (data.user?.email) {
    const repository = await getRepository();
    await repository.createUser({
      id: data.user.id,
      email: data.user.email,
      displayName: displayNameFromUser(data.user),
    });
    await seedDemoProject(repository, data.user.id);
  }

  return redirect;
}
