import { describe, expect, it } from "vitest";
import { decodePreviewToken, encodePreviewToken } from "@/lib/preview/token";

describe("preview token", () => {
  it("round-trips a valid capability", () => {
    const token = encodePreviewToken({ ownerId: "usr_1", projectId: "prj_1" });
    expect(token.startsWith("p1.")).toBe(true);
    expect(decodePreviewToken(token)).toMatchObject({ v: 1, ownerId: "usr_1", projectId: "prj_1" });
  });

  it("rejects tampered or expired tokens", () => {
    const token = encodePreviewToken({ ownerId: "usr_1", projectId: "prj_1" });
    expect(decodePreviewToken(token.slice(0, -2) + "aa")).toBeNull();
    expect(decodePreviewToken(encodePreviewToken({ ownerId: "usr_1", projectId: "prj_1" }, -10))).toBeNull();
    expect(decodePreviewToken("not-a-token")).toBeNull();
  });
});
