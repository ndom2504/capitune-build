/**
 * Future execution surface for generated React apps.
 *
 * Static HTML/CSS is served at `/p/[token]/…` with a signed capability (no session).
 * Optionally host that route on NEXT_PUBLIC_PREVIEW_ORIGIN so cookies never attach.
 * A complete React runtime must still live outside the privileged Capitune server:
 * another origin, no session cookies, no AI keys, no database credentials.
 */
export type PreviewRuntimeRequest = {
  projectId: string;
  files: { path: string; content: string }[];
};

export interface PreviewRuntime {
  render(request: PreviewRuntimeRequest): Promise<{ previewUrl: string }>;
}
