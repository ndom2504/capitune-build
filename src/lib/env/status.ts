import { getSupabasePublicConfig, isSupabaseEnabled } from "@/lib/supabase/config";

export type PersistenceMode = "local" | "supabase";

export type EnvStatus = {
  mode: PersistenceMode;
  ready: boolean;
  missing: string[];
};

export function getEnvStatus(): EnvStatus {
  if (!isSupabaseEnabled()) {
    return { mode: "local", ready: true, missing: [] };
  }

  const missing: string[] = [];
  if (!getSupabasePublicConfig()) {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_URL");
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) missing.push("SUPABASE_SERVICE_ROLE_KEY");

  return {
    mode: "supabase",
    ready: missing.length === 0,
    missing,
  };
}
