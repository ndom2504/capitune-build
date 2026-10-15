import { describe, expect, it } from "vitest";
import { tickQuota } from "@/lib/rate-limit";

describe("generation quota", () => {
  it("allows up to max in a window then blocks", () => {
    const ownerId = "usr_1";
    const now = 1_000_000;
    let state = undefined as ReturnType<typeof tickQuota>["next"] | undefined;
    for (let i = 0; i < 8; i += 1) {
      const result = tickQuota(state, ownerId, now, 8, 60_000);
      expect(result.ok).toBe(true);
      state = result.next;
    }
    const blocked = tickQuota(state, ownerId, now, 8, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.retryAfterMs).toBe(60_000);
  });

  it("resets after the window", () => {
    const first = tickQuota({ ownerId: "usr_1", count: 8, resetAt: 1_000 }, "usr_1", 2_000, 8, 60_000);
    expect(first.ok).toBe(true);
    expect(first.next.count).toBe(1);
  });
});
