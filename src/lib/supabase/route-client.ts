import { createServerClient } from "@supabase/ssr";
import type { NextResponse } from "next/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

function cookiesFromRequest(request: Request) {
  return (
    request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => {
        const [name, ...rest] = part.trim().split("=");
        return { name, value: rest.join("=") };
      })
      .filter((item) => item.name) ?? []
  );
}

export function createSupabaseRouteClient(request: Request, response: NextResponse) {
  const { url, anonKey } = getSupabaseConfig();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookiesFromRequest(request);
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });
}
