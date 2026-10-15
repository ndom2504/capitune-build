import { isAuthPath } from "@/lib/auth/paths";

export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("://")) {
    return fallback;
  }
  if (value === "/" || isAuthPath(value.split("?")[0] || value)) {
    return fallback;
  }
  return value;
}

export function appOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}

export function oauthCallbackUrl(request: Request, next = "/dashboard"): string {
  const nextPath = safeNextPath(next);
  return `${appOrigin(request)}/auth/callback?next=${encodeURIComponent(nextPath)}`;
}

export function isGoogleProviderAuthCode(code: string): boolean {
  return code.startsWith("4/");
}

export const GOOGLE_REDIRECT_MISCONFIGURED =
  "L’URI de redirection Google Cloud est incorrecte. Dans le client OAuth Web, autorise uniquement https://nvykactdasdegjhbfwpm.supabase.co/auth/v1/callback — pas capitune.com.";
