import { requireUser } from "@/lib/auth/server";
import { getAIProvider } from "@/lib/ai";
import { runGeneration } from "@/lib/generation/run-generation";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";
import { NextResponse } from "next/server";
import { z } from "zod";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const body = z.object({ prompt: z.string() }).parse(await request.json());
    const result = await runGeneration({
      repository: await getRepository(),
      provider: getAIProvider(),
      ownerId: user.id,
      projectId,
      prompt: body.prompt,
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
