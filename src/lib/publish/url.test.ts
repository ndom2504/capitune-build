import { describe, expect, it } from "vitest";
import {
  localizePublishedHtml,
  needsPublishedIndexRedirect,
  publicSitePath,
  publishedFilePath,
} from "@/lib/publish/url";

describe("published urls", () => {
  it("uses index.html as the shareable entry", () => {
    expect(publicSitePath("abc_token_value_ok")).toBe("/s/abc_token_value_ok/index.html");
    expect(publishedFilePath([])).toBe("index.html");
    expect(publishedFilePath(["styles.css"])).toBe("styles.css");
    expect(needsPublishedIndexRedirect([])).toBe(true);
    expect(needsPublishedIndexRedirect(["index.html"])).toBe(false);
  });

  it("rewrites root-absolute assets onto the public prefix", () => {
    const html = `<link href="/styles.css"><img src="/logo.svg"><a href="/login">x</a>`;
    const next = localizePublishedHtml(html, "tok_share_value_ok1");
    expect(next).toContain('href="/s/tok_share_value_ok1/styles.css"');
    expect(next).toContain('src="/s/tok_share_value_ok1/logo.svg"');
    expect(next).toContain('href="/login"');
  });
});
