import { afterEach, describe, expect, it } from "vitest";
import { getEnvStatus } from "@/lib/env/status";

const keys = [
  "DATA_STORE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const previous = new Map<string, string | undefined>();

describe("env status", () => {
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

  it("reports a ready local store", () => {
    setEnv({ DATA_STORE: "local" });
    expect(getEnvStatus()).toEqual({ mode: "local", ready: true, missing: [] });
  });

  it("lists missing supabase keys", () => {
    setEnv({
      DATA_STORE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: undefined,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });
    expect(getEnvStatus().ready).toBe(false);
    expect(getEnvStatus().missing).toEqual([
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ]);
  });
});
