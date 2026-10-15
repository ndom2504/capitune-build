import { afterEach, describe, expect, it } from "vitest";
import {
  isIsolatedPreviewRequest,
  isPreviewOriginIsolated,
  previewFrameAncestors,
  previewPublicOrigin,
} from "@/lib/preview/origin";

const keys = ["NEXT_PUBLIC_SITE_URL", "NEXT_PUBLIC_PREVIEW_ORIGIN"] as const;
const previous = new Map<string, string | undefined>();

describe("preview origin", () => {
  afterEach(() => {
    for (const key of keys) {
      if (!previous.has(key)) continue;
      const value = previous.get(key);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
      previous.delete(key);
    }
  });

  function setEnv(values: Partial<Record<(typeof keys)[number], string | undefined>>) {
    for (const [key, value] of Object.entries(values)) {
      if (!previous.has(key)) previous.set(key, process.env[key]);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  it("shares the app origin when PREVIEW_ORIGIN is unset", () => {
    setEnv({ NEXT_PUBLIC_SITE_URL: "https://capitune.com", NEXT_PUBLIC_PREVIEW_ORIGIN: undefined });
    expect(isPreviewOriginIsolated()).toBe(false);
    expect(previewFrameAncestors()).toBe("'self'");
    expect(previewPublicOrigin()).toBe("");
    expect(isIsolatedPreviewRequest("preview.capitune.com")).toBe(false);
  });

  it("locks a dedicated preview host and allows the app to embed it", () => {
    setEnv({
      NEXT_PUBLIC_SITE_URL: "https://capitune.com",
      NEXT_PUBLIC_PREVIEW_ORIGIN: "https://preview.capitune.com",
    });
    expect(isPreviewOriginIsolated()).toBe(true);
    expect(previewFrameAncestors()).toBe("https://capitune.com");
    expect(previewPublicOrigin()).toBe("https://preview.capitune.com");
    expect(isIsolatedPreviewRequest("preview.capitune.com")).toBe(true);
    expect(isIsolatedPreviewRequest("capitune.com")).toBe(false);
  });
});
