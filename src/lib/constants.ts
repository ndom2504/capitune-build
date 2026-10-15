export const APP_NAME = "Capitune";

export const SESSION_COOKIE = "capitune_session";

export const MAX_PROMPT_LENGTH = 4_000;
export const MIN_PROMPT_LENGTH = 3;
export const MAX_FILES_PER_GENERATION = 40;
export const MAX_FILE_BYTES = 200_000;
export const MAX_TOTAL_BYTES = 1_500_000;

export const ALLOWED_FILE_EXTENSIONS = [
  "html",
  "css",
  "js",
  "json",
  "md",
  "svg",
  "txt",
  "ico",
] as const;

export const GENERATION_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  max: 8,
} as const;
