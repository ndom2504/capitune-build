import { afterEach, describe, expect, it } from "vitest";
import { getSupabaseConfig, getSupabasePublicConfig, isSupabaseEnabled } from "@/lib/supabase/config";

const keys = [
  "DATA_STORE",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
] as const;

const previous = new Map<string, string | undefined>();

describe("supabase config", () => {
  afterEach(() => {
    for (const key of keys) {
      if (previous.has(key)) {
        const value = previous.get(key);
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
        previous.delete(key);
      }
    }
  });

  function setEnv(values: Partial<Record<(typeof keys)[number], string | undefined>>) {
    for (const [key, value] of Object.entries(values)) {
      if (!previous.has(key)) previous.set(key, process.env[key]);
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }

  it("stays on the local store unless DATA_STORE=supabase", () => {
    setEnv({ DATA_STORE: "local" });
    expect(isSupabaseEnabled()).toBe(false);
  });

  it("requires all three keys in supabase mode", () => {
    setEnv({
      DATA_STORE: "supabase",
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon",
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });
    expect(isSupabaseEnabled()).toBe(true);
    expect(getSupabasePublicConfig()?.url).toBe("https://example.supabase.co");
    expect(() => getSupabaseConfig()).toThrow(/SERVICE_ROLE/);
  });
});
