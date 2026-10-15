import { describe, expect, it } from "vitest";
import { previewContentType, previewSecurityHeaders } from "@/lib/preview/headers";

describe("preview", () => {
  it("maps content types and sets a restrictive CSP", () => {
    expect(previewContentType("index.html")).toContain("text/html");
    expect(previewContentType("styles.css")).toContain("text/css");
    const headers = previewSecurityHeaders();
    expect(headers["Content-Security-Policy"]).toContain("default-src 'none'");
    expect(headers["Content-Security-Policy"]).toContain("frame-ancestors 'self'");
    expect(headers["X-Content-Type-Options"]).toBe("nosniff");
  });
});
