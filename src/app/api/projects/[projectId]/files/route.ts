import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { MAX_FILE_BYTES } from "@/lib/constants";
import { saveProjectFile } from "@/lib/generation/save-files";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";

const bodySchema = z.object({
  path: z.string().min(1).max(180),
  content: z.string().max(MAX_FILE_BYTES),
});

type Ctx = { params: Promise<{ projectId: string }> };

export async function PUT(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const result = await saveProjectFile({
      repository: await getRepository(),
      ownerId: user.id,
      projectId,
      path: body.path,
      content: body.content,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
