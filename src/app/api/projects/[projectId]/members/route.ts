import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const members = await (await getRepository()).listMembers(user.id, projectId);
    return NextResponse.json({ members });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = z.object({ userId: z.string().min(1) }).parse(await request.json());
    await (await getRepository()).removeMember(user.id, projectId, body.userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
