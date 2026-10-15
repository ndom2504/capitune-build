import { createHmac, timingSafeEqual } from "node:crypto";

export const PREVIEW_TTL_SECONDS = 60 * 60 * 8;

export type PreviewTokenPayload = {
  v: 1;
  ownerId: string;
  projectId: string;
  exp: number;
};

function secret(): string {
  return process.env.SESSION_SECRET?.trim() || "capitune-dev-only-change-me";
}

function sign(input: string): string {
  return createHmac("sha256", secret()).update(input).digest("base64url");
}

export function encodePreviewToken(
  payload: Omit<PreviewTokenPayload, "v" | "exp">,
  ttlSeconds = PREVIEW_TTL_SECONDS,
): string {
  const body: PreviewTokenPayload = {
    v: 1,
    ownerId: payload.ownerId,
    projectId: payload.projectId,
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(body)).toString("base64url");
  return `p1.${encoded}.${sign(encoded)}`;
}

export function decodePreviewToken(token: string | undefined): PreviewTokenPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "p1") return null;
  const [, encoded, signature] = parts;
  if (!encoded || !signature) return null;
  const expected = sign(encoded);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as PreviewTokenPayload;
    if (
      payload.v !== 1 ||
      !payload.ownerId ||
      !payload.projectId ||
      payload.exp < Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
