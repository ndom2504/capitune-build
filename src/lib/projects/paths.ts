import { ALLOWED_FILE_EXTENSIONS } from "@/lib/constants";

const TRAVERSAL = /(^|\/)\.\.(\/|$)/;

export type PathValidationError =
  | "empty"
  | "absolute"
  | "backslash"
  | "null_byte"
  | "traversal"
  | "extension"
  | "too_long";

export function normalizeProjectPath(input: string): string {
  return input.trim().replace(/^\.\/+/, "").replace(/\/+/g, "/");
}

export function validateProjectPath(
  input: string,
): { ok: true; path: string } | { ok: false; error: PathValidationError } {
  if (!input || !input.trim()) {
    return { ok: false, error: "empty" };
  }
  if (input.includes("\0")) {
    return { ok: false, error: "null_byte" };
  }
  if (input.includes("\\")) {
    return { ok: false, error: "backslash" };
  }
  if (input.length > 180) {
    return { ok: false, error: "too_long" };
  }
  const trimmed = input.trim();
  if (trimmed.startsWith("/") || /^[a-zA-Z]:/.test(trimmed)) {
    return { ok: false, error: "absolute" };
  }
  if (TRAVERSAL.test(trimmed) || trimmed.includes("..")) {
    return { ok: false, error: "traversal" };
  }

  const path = normalizeProjectPath(trimmed);
  if (!path || path.endsWith("/")) {
    return { ok: false, error: "empty" };
  }

  const base = path.split("/").pop() ?? "";
  const ext = base.includes(".") ? base.split(".").pop()?.toLowerCase() : "";
  if (!ext || !(ALLOWED_FILE_EXTENSIONS as readonly string[]).includes(ext)) {
    return { ok: false, error: "extension" };
  }

  return { ok: true, path };
}
