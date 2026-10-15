import { describe, expect, it } from "vitest";
import { validateGenerationResult } from "@/lib/ai/schema";

describe("validateGenerationResult", () => {
  it("accepts a valid payload", () => {
    const result = validateGenerationResult({
      summary: "ok",
      files: [{ path: "index.html", content: "<h1>Hi</h1>" }],
    });
    expect(result.files[0].path).toBe("index.html");
  });

  it("rejects traversal in model output", () => {
    expect(() =>
      validateGenerationResult({
        summary: "bad",
        files: [{ path: "../index.html", content: "x" }],
      }),
    ).toThrow();
  });
});
