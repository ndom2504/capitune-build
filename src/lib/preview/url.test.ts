import { describe, expect, it } from "vitest";
import { localizePreviewHtml, needsPreviewIndexRedirect, previewPageUrl, previewSitePath } from "@/lib/preview/url";

describe("preview urls", () => {
  it("builds a signed file path", () => {
    expect(previewSitePath("p1.abc.def")).toBe("/p/p1.abc.def/index.html");
    expect(needsPreviewIndexRedirect([])).toBe(true);
    expect(previewPageUrl("p1.abc.def", "contact.html", 3)).toBe("/p/p1.abc.def/contact.html?v=3");
  });

  it("rewrites root-absolute assets onto the preview prefix", () => {
    const html = `<link href="/styles.css"><img src="/logo.svg"><a href="/login">x</a>`;
    const next = localizePreviewHtml(html, "p1.abc.def");
    expect(next).toContain('href="/p/p1.abc.def/styles.css"');
    expect(next).toContain('src="/p/p1.abc.def/logo.svg"');
    expect(next).toContain('href="/login"');
  });
});
