import { describe, expect, it } from "vitest";
import { isUuid, mapProfile, mapProject } from "@/lib/store/mappers";

describe("supabase row mappers", () => {
  it("maps profile and project rows", () => {
    expect(
      mapProfile({
        id: "11111111-1111-4111-8111-111111111111",
        email: "a@b.c",
        display_name: "Ada",
        created_at: "2026-01-01T00:00:00.000Z",
      }),
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      email: "a@b.c",
      displayName: "Ada",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
    expect(
      mapProject({
        id: "22222222-2222-4222-8222-222222222222",
        owner_id: "11111111-1111-4111-8111-111111111111",
        name: "Vitrine",
        description: "Demo",
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-02T00:00:00.000Z",
      }),
    ).toMatchObject({
      ownerId: "11111111-1111-4111-8111-111111111111",
      publishToken: null,
    });
  });

  it("accepts uuid v4 identifiers", () => {
    expect(isUuid("6b289591-7bbf-49ce-996e-f2342dddee47")).toBe(true);
    expect(isUuid("prj_6b289591-7bbf-49ce-996e-f2342dddee47")).toBe(false);
  });
});
