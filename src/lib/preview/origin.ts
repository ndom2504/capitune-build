function hostOf(value: string): string | null {
  try {
    return new URL(value).host.toLowerCase();
  } catch {
    return null;
  }
}

export function siteOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function previewOrigin(): string | null {
  const value = process.env.NEXT_PUBLIC_PREVIEW_ORIGIN?.trim().replace(/\/$/, "");
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

export function isPreviewOriginIsolated(): boolean {
  const preview = previewOrigin();
  const site = siteOrigin();
  return Boolean(preview && site && preview !== site);
}

/** Host header of the dedicated preview origin, or null when preview shares the app host. */
export function isolatedPreviewHost(): string | null {
  if (!isPreviewOriginIsolated()) return null;
  const origin = previewOrigin();
  return origin ? hostOf(origin) : null;
}

export function isIsolatedPreviewRequest(hostHeader: string | null | undefined): boolean {
  const expected = isolatedPreviewHost();
  if (!expected || !hostHeader) return false;
  return hostHeader.split(",")[0].trim().toLowerCase() === expected;
}

/** Value for CSP frame-ancestors: parent app origin when preview is isolated. */
export function previewFrameAncestors(): string {
  if (isPreviewOriginIsolated()) {
    return siteOrigin() ?? "'self'";
  }
  return "'self'";
}

export function previewPublicOrigin(): string {
  return previewOrigin() ?? "";
}
