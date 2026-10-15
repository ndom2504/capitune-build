import { describe, expect, it } from "vitest";
import { extractJsonObject, validateGenerationResult } from "@/lib/ai/schema";
import { PIXEL_PNG_BASE64 } from "@/lib/media/files";

describe("validateGenerationResult", () => {
  it("accepts a valid payload", () => {
    const result = validateGenerationResult({
      summary: "ok",
      files: [{ path: "index.html", content: "<h1>Hi</h1>" }],
    });
    expect(result.files[0].path).toBe("index.html");
  });

  it("parses JSON even when wrapped in a markdown fence", () => {
    const parsed = extractJsonObject(
      '```json\n{"summary":"ok","files":[{"path":"index.html","content":"<p>x</p>"}]}\n```',
    );
    expect(validateGenerationResult(parsed).summary).toBe("ok");
  });

  it("accepts a small png stored as base64", () => {
    const result = validateGenerationResult({
      summary: "media",
      files: [
        { path: "index.html", content: "<img src='images/mark.png' alt=''>" },
        { path: "images/mark.png", content: PIXEL_PNG_BASE64 },
      ],
    });
    expect(result.files.some((file) => file.path === "images/mark.png")).toBe(true);
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
