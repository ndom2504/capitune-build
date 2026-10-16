import { isBinaryFilePath } from "@/lib/media/paths";

export type RuntimeFile = { path: string; content: string };

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dataUrl(path: string, content: string): string {
  const compact = content.replace(/\s/g, "");
  if (path.endsWith(".png")) return `data:image/png;base64,${compact}`;
  if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return `data:image/jpeg;base64,${compact}`;
  if (path.endsWith(".webp")) return `data:image/webp;base64,${compact}`;
  if (path.endsWith(".gif")) return `data:image/gif;base64,${compact}`;
  if (path.endsWith(".ico")) return `data:image/x-icon;base64,${compact}`;
  if (path.endsWith(".svg")) return `data:image/svg+xml,${encodeURIComponent(content)}`;
  return compact;
}

/** CSP for generated HTML/CSS/JS: scripts may run, network and forms stay closed. */
export function isolatedRuntimeCsp(frameAncestors: string): string {
  return [
    "default-src 'none'",
    "img-src 'self' data: https:",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    "font-src 'none'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    `frame-ancestors ${frameAncestors}`,
  ].join("; ");
}

export function isolatedRuntimeHeaders(frameAncestors: string): Record<string, string> {
  return {
    "Content-Security-Policy": isolatedRuntimeCsp(frameAncestors),
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
  };
}

/** Map root-absolute JS/JSON specifiers onto the preview or public prefix. */
export function localizeGeneratedJs(source: string, prefix: string): string {
  return source.replace(/(["'])\/(?!\/)([^"']+\.(?:js|json))\1/g, (full, quote: string, path: string) => {
    if (path.startsWith("p/") || path.startsWith("s/") || path.startsWith("api/")) return full;
    return `${quote}${prefix}${path}${quote}`;
  });
}

/**
 * Inline CSS, JS and images so an iframe can use srcDoc (playground) without /p/ or cookies.
 * Vanilla JS only: a single app.js without npm imports is the supported shape.
 */
export function buildIsolatedSrcDoc(files: RuntimeFile[], page: string): string {
  const html = files.find((file) => file.path === page)?.content;
  if (!html) return "<!doctype html><title>Aperçu</title><p>Fichier introuvable.</p>";
  let documentHtml = html;
  for (const file of files) {
    const escaped = escapeRegExp(file.path);
    if (file.path.endsWith(".css")) {
      documentHtml = documentHtml.replace(
        new RegExp(`<link[^>]+href=["']${escaped}["'][^>]*>`, "gi"),
        `<style>${file.content}</style>`,
      );
    }
    if (file.path.endsWith(".js")) {
      documentHtml = documentHtml.replace(
        new RegExp(`<script([^>]*?)\\ssrc=["'](?:\\./)?${escaped}["']([^>]*)>\\s*</script>`, "gi"),
        (_match, before: string, after: string) => `<script${before}${after}>\n${file.content}\n</script>`,
      );
    }
    if (isBinaryFilePath(file.path) || file.path.endsWith(".svg")) {
      documentHtml = documentHtml.replace(
        new RegExp(`(["'])${escaped}\\1`, "g"),
        `$1${dataUrl(file.path, file.content)}$1`,
      );
    }
  }
  return documentHtml;
}
