import { NextResponse } from "next/server";
import { sessionCookieOptions } from "@/lib/auth/session";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(sessionCookieOptions.name, "", {
    ...sessionCookieOptions,
    maxAge: 0,
  });

  if (isSupabaseEnabled()) {
    const supabase = createSupabaseRouteClient(request, response);
    await supabase.auth.signOut();
  }

  return response;
}
