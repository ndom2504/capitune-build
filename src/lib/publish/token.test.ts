import { describe, expect, it } from "vitest";
import { createPublishToken, isPublishToken, publicSitePath } from "@/lib/publish/token";

describe("publish token", () => {
  it("creates an unguessable url-safe token", () => {
    const token = createPublishToken();
    expect(isPublishToken(token)).toBe(true);
    expect(token).not.toMatch(/[+/=]/);
    expect(publicSitePath(token)).toBe(`/s/${token}/index.html`);
  });

  it("rejects short or decorated values", () => {
    expect(isPublishToken("abc")).toBe(false);
    expect(isPublishToken("not a token!!!!")).toBe(false);
  });
});
