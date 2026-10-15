import { fileBytes, isBinaryFilePath } from "@/lib/media/files";
import { previewFrameAncestors } from "@/lib/preview/origin";

export function previewContentType(filePath: string): string {
  if (filePath.endsWith(".html")) return "text/html; charset=utf-8";
  if (filePath.endsWith(".css")) return "text/css; charset=utf-8";
  if (filePath.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (filePath.endsWith(".svg")) return "image/svg+xml";
  if (filePath.endsWith(".json")) return "application/json; charset=utf-8";
  if (filePath.endsWith(".png")) return "image/png";
  if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) return "image/jpeg";
  if (filePath.endsWith(".webp")) return "image/webp";
  if (filePath.endsWith(".gif")) return "image/gif";
  if (filePath.endsWith(".ico")) return "image/x-icon";
  return "text/plain; charset=utf-8";
}

export function previewSecurityHeaders(): Record<string, string> {
  const ancestors = previewFrameAncestors();
  return {
    "Content-Security-Policy":
      `default-src 'none'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; font-src 'none'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors ${ancestors}`,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Cache-Control": "no-store",
    "X-Robots-Tag": "noindex",
  };
}

export function previewFileResponse(content: string, filePath: string): Response {
  const body = isBinaryFilePath(filePath) ? new Uint8Array(fileBytes(filePath, content)) : content;
  return new Response(body, {
    headers: {
      ...previewSecurityHeaders(),
      "Content-Type": previewContentType(filePath),
    },
  });
}
