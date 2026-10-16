import { describe, expect, it } from "vitest";
import { canEdit, canManage, isInviteRole, roleAtLeast } from "@/lib/collab/roles";

describe("collab roles", () => {
  it("ranks viewer below editor below owner", () => {
    expect(canEdit("viewer")).toBe(false);
    expect(canEdit("editor")).toBe(true);
    expect(canManage("editor")).toBe(false);
    expect(canManage("owner")).toBe(true);
    expect(roleAtLeast("editor", "viewer")).toBe(true);
    expect(isInviteRole("owner")).toBe(false);
    expect(isInviteRole("viewer")).toBe(true);
  });
});
