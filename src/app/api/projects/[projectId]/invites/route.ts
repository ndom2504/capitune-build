import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { appOrigin } from "@/lib/auth/redirect";
import { isInviteRole } from "@/lib/collab/roles";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = z.object({ role: z.string() }).parse(await request.json());
    if (!isInviteRole(body.role)) {
      return NextResponse.json({ error: "Rôle invalide." }, { status: 400 });
    }
    const invite = await (await getRepository()).createInvite(user.id, projectId, body.role);
    return NextResponse.json({
      invite,
      url: `${appOrigin(request)}${invite.path}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
