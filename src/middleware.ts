import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/constants";
import { isAuthPath, isProtectedPath } from "@/lib/auth/paths";
import { GOOGLE_REDIRECT_MISCONFIGURED, isGoogleProviderAuthCode } from "@/lib/auth/redirect";
import { isIsolatedPreviewRequest } from "@/lib/preview/origin";
import { getSupabasePublicConfig, isSupabaseEnabled } from "@/lib/supabase/config";

function copyCookies(from: NextResponse, to: NextResponse): NextResponse {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
  return to;
}

export async function middleware(request: NextRequest) {
  if (isIsolatedPreviewRequest(request.headers.get("host"))) {
    if (!request.nextUrl.pathname.startsWith("/p/")) {
      return new NextResponse(null, { status: 404 });
    }
    return NextResponse.next();
  }

  let response = NextResponse.next({ request });
  let hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);

  if (isSupabaseEnabled()) {
    const config = getSupabasePublicConfig();
    if (!config) {
      hasSession = false;
    } else {
      const supabase = createServerClient(config.url, config.anonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({ request });
            cookiesToSet.forEach(({ name, value, options }) => {
              response.cookies.set(name, value, options);
            });
          },
        },
      });
      const { data } = await supabase.auth.getUser();
      hasSession = Boolean(data.user);
    }
  }

  const { pathname } = request.nextUrl;

  const inboundCode = request.nextUrl.searchParams.get("code");
  if (inboundCode && isGoogleProviderAuthCode(inboundCode)) {
    const login = request.nextUrl.clone();
    login.pathname = "/login";
    login.search = "";
    login.searchParams.set("error", GOOGLE_REDIRECT_MISCONFIGURED);
    return copyCookies(response, NextResponse.redirect(login));
  }

  if (pathname !== "/auth/callback" && inboundCode) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/callback";
    if (!url.searchParams.get("next")) {
      url.searchParams.set("next", "/dashboard");
    }
    return copyCookies(response, NextResponse.redirect(url));
  }

  if (isProtectedPath(pathname) && !hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return copyCookies(response, NextResponse.redirect(url));
  }

  if (isAuthPath(pathname) && hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return copyCookies(response, NextResponse.redirect(url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
