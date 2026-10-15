import { previewPublicOrigin } from "@/lib/preview/origin";

export function previewFilePath(segments: string[] | undefined): string {
  const joined = (segments ?? []).filter(Boolean).join("/");
  return joined || "index.html";
}

export function needsPreviewIndexRedirect(segments: string[] | undefined): boolean {
  return (segments ?? []).filter(Boolean).length === 0;
}

export function previewSitePath(token: string, filePath = "index.html"): string {
  const clean = filePath.replace(/^\//, "");
  return `/p/${token}/${clean}`;
}

export function previewPageUrl(token: string, filePath: string, cacheBust?: number): string {
  const origin = previewPublicOrigin();
  const path = previewSitePath(token, filePath);
  const query = cacheBust != null ? `?v=${cacheBust}` : "";
  return `${origin}${path}${query}`;
}

/** Map root-absolute asset URLs onto the signed preview prefix. */
export function localizePreviewHtml(html: string, token: string): string {
  const prefix = `/p/${token}/`;
  return html.replace(
    /(\s(?:href|src))=("|')\/(?!\/)([^"']+)\2/gi,
    (full, attr: string, quote: string, path: string) => {
      if (path.startsWith("p/") || path.startsWith("s/") || path.startsWith("api/")) return full;
      const last = path.split("/").filter(Boolean).at(-1) ?? "";
      if (!last.includes(".")) return full;
      return `${attr}=${quote}${prefix}${path.replace(/^\//, "")}${quote}`;
    },
  );
}
