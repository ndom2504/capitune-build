import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { appOrigin } from "@/lib/auth/redirect";
import { errorResponse } from "@/lib/http/guard";
import { assertProjectPublishable } from "@/lib/publish/ready";
import { createPublishToken, publicSitePath } from "@/lib/publish/token";
import { getRepository } from "@/lib/store";

const bodySchema = z.object({
  rotate: z.boolean().optional(),
});

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const raw = await request.text();
    const body = raw ? bodySchema.parse(JSON.parse(raw)) : {};
    const repo = await getRepository();
    const bundle = await repo.getProject(user.id, projectId);
    assertProjectPublishable(bundle.files);
    const token =
      bundle.project.publishToken && !body.rotate ? bundle.project.publishToken : createPublishToken();
    const project = await repo.setPublishToken(user.id, projectId, token);
    const path = publicSitePath(token);
    return NextResponse.json({
      project,
      path,
      url: `${appOrigin(request)}${path}`,
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const project = await (await getRepository()).setPublishToken(user.id, projectId, null);
    return NextResponse.json({ project });
  } catch (error) {
    return errorResponse(error);
  }
}
