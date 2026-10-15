import { randomBytes } from "node:crypto";

export const PUBLISH_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PUBLISH_SLUG_MIN = 3;
export const PUBLISH_SLUG_MAX = 48;

const RESERVED_SLUGS = new Set([
  "api",
  "auth",
  "login",
  "signup",
  "dashboard",
  "workspace",
  "admin",
  "www",
  "static",
  "assets",
  "preview",
  "index",
  "new",
  "edit",
  "s",
  "p",
  "capitune",
]);

export function isPublishSlug(value: string): boolean {
  return (
    PUBLISH_SLUG_RE.test(value) &&
    value.length >= PUBLISH_SLUG_MIN &&
    value.length <= PUBLISH_SLUG_MAX &&
    !RESERVED_SLUGS.has(value)
  );
}

export function slugify(input: string): string {
  const ascii = input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/œ/gi, "oe")
    .replace(/æ/gi, "ae")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, PUBLISH_SLUG_MAX)
    .replace(/-+$/g, "");
  if (ascii.length < PUBLISH_SLUG_MIN || RESERVED_SLUGS.has(ascii)) return "";
  return ascii;
}

export function randomSlugSuffix(): string {
  return randomBytes(3).toString("hex").slice(0, 4);
}

export function nextSlugCandidate(base: string, attempt: number): string {
  const root = (isPublishSlug(base) ? base : slugify(base) || "site").slice(0, 40);
  if (attempt === 0) return root;
  const suffix = randomSlugSuffix();
  return `${root}-${suffix}`.slice(0, PUBLISH_SLUG_MAX);
}
