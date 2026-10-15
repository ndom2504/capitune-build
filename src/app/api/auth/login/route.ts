import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPassword } from "@/lib/auth/password";
import { encodeSession, sessionCookieOptions } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/guard";
import { seedDemoProject } from "@/lib/projects/seed";
import { getRepository } from "@/lib/store";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(120),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());

    if (isSupabaseEnabled()) {
      const response = NextResponse.json({ ok: true });
      const supabase = createSupabaseRouteClient(request, response);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: body.email,
        password: body.password,
      });
      if (error || !data.user) {
        return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
      }
      const repository = await getRepository();
      const meta = data.user.user_metadata as { display_name?: string } | undefined;
      await repository.createUser({
        id: data.user.id,
        email: data.user.email || body.email,
        displayName: meta?.display_name || data.user.email || "Utilisateur",
      });
      await seedDemoProject(repository, data.user.id);
      return NextResponse.json(
        { user: { id: data.user.id, email: data.user.email } },
        { headers: response.headers },
      );
    }

    const user = await (await getRepository()).findUserByEmail(body.email);
    if (!user || !user.passwordHash || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Identifiants incorrects." }, { status: 401 });
    }
    const response = NextResponse.json({ user: { id: user.id, email: user.email } });
    response.cookies.set(sessionCookieOptions.name, encodeSession({ userId: user.id, email: user.email }), {
      ...sessionCookieOptions,
      maxAge: 60 * 60 * 24 * 7,
    });
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
