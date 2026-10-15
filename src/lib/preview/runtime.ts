/**
 * Future execution surface for generated React apps.
 *
 * Milestone 1 only renders validated static HTML/CSS via `/api/preview`.
 * A complete React runtime must live outside the privileged Capitune server:
 * another origin, no session cookies, no AI keys, no database credentials.
 */
export type PreviewRuntimeRequest = {
  projectId: string;
  files: { path: string; content: string }[];
};

export interface PreviewRuntime {
  render(request: PreviewRuntimeRequest): Promise<{ previewUrl: string }>;
}
