import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";

const patchSchema = z.object({
  name: z.string().trim().min(2).max(80),
});

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const bundle = await (await getRepository()).getProject(user.id, projectId);
    return NextResponse.json(bundle);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = patchSchema.parse(await request.json());
    const project = await (await getRepository()).renameProject(user.id, projectId, body.name);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    await (await getRepository()).deleteProject(user.id, projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
