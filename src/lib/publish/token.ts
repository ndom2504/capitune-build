import { randomBytes } from "node:crypto";

export { PUBLISH_TOKEN_RE, isPublicSiteKey, isPublishToken, publicSitePath } from "@/lib/publish/url";

export function createPublishToken(): string {
  return randomBytes(18).toString("base64url");
}
