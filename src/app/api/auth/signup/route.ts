import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/auth/password";
import { encodeSession, sessionCookieOptions } from "@/lib/auth/session";
import { errorResponse } from "@/lib/http/guard";
import { seedDemoProject } from "@/lib/projects/seed";
import { getRepository } from "@/lib/store";
import { isSupabaseEnabled } from "@/lib/supabase/config";
import { createSupabaseRouteClient } from "@/lib/supabase/route-client";

const schema = z.object({
  email: z.string().email().max(180),
  password: z.string().min(8).max(120),
  displayName: z.string().trim().min(2).max(80),
});

export async function POST(request: Request) {
  try {
    const body = schema.parse(await request.json());
    const repository = await getRepository();

    if (isSupabaseEnabled()) {
      const response = NextResponse.json({ ok: true });
      const supabase = createSupabaseRouteClient(request, response);
      const { data, error } = await supabase.auth.signUp({
        email: body.email,
        password: body.password,
        options: { data: { display_name: body.displayName } },
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      if (!data.user) {
        return NextResponse.json({ error: "Inscription impossible." }, { status: 400 });
      }
      await repository.createUser({
        id: data.user.id,
        email: body.email,
        displayName: body.displayName,
      });
      if (!data.session) {
        return NextResponse.json({
          needsConfirmation: true,
          error: "Vérifiez votre e-mail pour confirmer le compte, puis connectez-vous.",
        });
      }
      await seedDemoProject(repository, data.user.id);
      return NextResponse.json(
        { user: { id: data.user.id, email: data.user.email } },
        { headers: response.headers },
      );
    }

    const user = await repository.createUser({
      email: body.email,
      displayName: body.displayName,
      passwordHash: await hashPassword(body.password),
    });
    await seedDemoProject(repository, user.id);
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
