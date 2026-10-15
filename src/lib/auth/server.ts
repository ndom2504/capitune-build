import { cookies } from "next/headers";
import { decodeSession, sessionCookieOptions } from "@/lib/auth/session";
import { getRepository } from "@/lib/store";
import type { Profile } from "@/lib/domain";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentUser(): Promise<Profile | null> {
  const repository = await getRepository();

  if (isSupabaseEnabled()) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    const profile = await repository.findUserById(data.user.id);
    if (profile) return profile;
    const meta = data.user.user_metadata as { display_name?: string } | undefined;
    return repository.createUser({
      id: data.user.id,
      email: data.user.email || "",
      displayName: meta?.display_name || data.user.email || "Utilisateur",
    });
  }

  const jar = await cookies();
  const token = jar.get(sessionCookieOptions.name)?.value;
  const session = decodeSession(token);
  if (!session) return null;
  return repository.findUserById(session.userId);
}

export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
