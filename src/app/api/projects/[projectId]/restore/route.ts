import { requireUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";
import { NextResponse } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = z.object({ versionId: z.string().min(1) }).parse(await request.json());
    const bundle = await (await getRepository()).restoreVersion(user.id, projectId, body.versionId);
    return NextResponse.json(bundle);
  } catch (error) {
    return errorResponse(error);
  }
}
