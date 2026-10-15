export const PUBLISH_TOKEN_RE = /^[A-Za-z0-9_-]{16,64}$/;

export function isPublishToken(value: string): boolean {
  return PUBLISH_TOKEN_RE.test(value);
}

export function publicSitePath(token: string): string {
  return `/s/${token}/index.html`;
}

export function publishedFilePath(segments: string[] | undefined): string {
  const joined = (segments ?? []).filter(Boolean).join("/");
  return joined || "index.html";
}

export function needsPublishedIndexRedirect(segments: string[] | undefined): boolean {
  return (segments ?? []).filter(Boolean).length === 0;
}

/** Map root-absolute asset URLs onto the public site prefix. */
export function localizePublishedHtml(html: string, token: string): string {
  const prefix = `/s/${token}/`;
  return html.replace(
    /(\s(?:href|src))=("|')\/(?!\/)([^"']+)\2/gi,
    (full, attr: string, quote: string, path: string) => {
      if (path.startsWith("s/")) return full;
      const last = path.split("/").filter(Boolean).at(-1) ?? "";
      if (!last.includes(".")) return full;
      return `${attr}=${quote}${prefix}${path.replace(/^\//, "")}${quote}`;
    },
  );
}
