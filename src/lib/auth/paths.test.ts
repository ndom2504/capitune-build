import { describe, expect, it } from "vitest";
import { isAuthPath, isProtectedPath } from "@/lib/auth/paths";
import { safeNextPath } from "@/lib/auth/redirect";
import { decodeSession, encodeSession } from "@/lib/auth/session";

describe("auth helpers", () => {
  it("marks dashboard and workspace as protected", () => {
    expect(isProtectedPath("/dashboard")).toBe(true);
    expect(isProtectedPath("/workspace/abc")).toBe(true);
    expect(isProtectedPath("/")).toBe(false);
    expect(isAuthPath("/login")).toBe(true);
  });

  it("rejects open redirects", () => {
    expect(safeNextPath("/dashboard")).toBe("/dashboard");
    expect(safeNextPath("/")).toBe("/dashboard");
    expect(safeNextPath("/login")).toBe("/dashboard");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("https://evil.example")).toBe("/dashboard");
  });

  it("round-trips a signed session", () => {
    const token = encodeSession({ userId: "usr_1", email: "a@b.c" });
    const payload = decodeSession(token);
    expect(payload?.userId).toBe("usr_1");
    expect(decodeSession("tampered.token")).toBeNull();
  });
});
