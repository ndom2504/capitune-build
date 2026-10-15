import { describe, expect, it } from "vitest";
import { isPublishSlug, nextSlugCandidate, slugify } from "@/lib/publish/slug";
import { isPublicSiteKey } from "@/lib/publish/url";

describe("publish slug", () => {
  it("slugifies french names", () => {
    expect(slugify("Atelier vitrine")).toBe("atelier-vitrine");
    expect(slugify("Café de l’été")).toBe("cafe-de-l-ete");
    expect(isPublishSlug("atelier-vitrine")).toBe(true);
    expect(isPublishSlug("login")).toBe(false);
    expect(isPublishSlug("AB")).toBe(false);
    expect(isPublicSiteKey("atelier-vitrine")).toBe(true);
  });

  it("allocates a suffix when the base is already taken conceptually", () => {
    const next = nextSlugCandidate("atelier-vitrine", 1);
    expect(next.startsWith("atelier-vitrine-")).toBe(true);
    expect(isPublishSlug(next)).toBe(true);
    expect(nextSlugCandidate("atelier-vitrine", 0)).toBe("atelier-vitrine");
  });
});
