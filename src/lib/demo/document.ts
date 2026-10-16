import { buildIsolatedSrcDoc } from "@/lib/preview/runtime";

/** Inline CSS, JS and images so a playground iframe can use srcDoc (no signed /p/ session). */
export function playgroundSrcDoc(files: { path: string; content: string }[], page: string): string {
  return buildIsolatedSrcDoc(files, page);
}
