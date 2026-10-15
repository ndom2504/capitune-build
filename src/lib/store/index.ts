import path from "node:path";
import { createLocalRepository } from "@/lib/store/local-repository";
import { createSupabaseRepository } from "@/lib/store/supabase-repository";
import type { Repository } from "@/lib/store/repository";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

let cachedLocal: Repository | null = null;

export async function getRepository(): Promise<Repository> {
  if (isSupabaseEnabled()) {
    return createSupabaseRepository(getSupabaseAdmin());
  }
  if (cachedLocal) return cachedLocal;
  const filePath =
    process.env.DATA_FILE?.trim() || path.join(process.cwd(), ".data", "store.json");
  cachedLocal = createLocalRepository(filePath);
  return cachedLocal;
}

export function setRepositoryForTests(repository: Repository | null): void {
  cachedLocal = repository;
}
