export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export type SupabaseConfig = SupabasePublicConfig & {
  serviceRoleKey: string;
};

export function isSupabaseEnabled(): boolean {
  return process.env.DATA_STORE === "supabase";
}

export function getSupabasePublicConfig(): SupabasePublicConfig | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function getSupabaseConfig(): SupabaseConfig {
  if (!isSupabaseEnabled()) {
    throw new Error("DATA_STORE n’est pas configuré sur supabase.");
  }
  const publicConfig = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || "";
  if (!publicConfig || !serviceRoleKey) {
    throw new Error(
      "DATA_STORE=supabase exige NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY et SUPABASE_SERVICE_ROLE_KEY. Voir supabase/README.md.",
    );
  }
  return { ...publicConfig, serviceRoleKey };
}
