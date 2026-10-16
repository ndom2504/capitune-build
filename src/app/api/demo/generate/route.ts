import { NextResponse } from "next/server";
import { z } from "zod";
import { demoProvider } from "@/lib/ai/demo-provider";
import { promptSchema, validateGenerationResult } from "@/lib/ai/schema";
import { errorResponse } from "@/lib/http/guard";
import { isBinaryFilePath } from "@/lib/media/paths";
import { consumeMemoryRateLimit } from "@/lib/rate-limit";

const bodySchema = z.object({
  prompt: promptSchema,
  files: z
    .array(z.object({ path: z.string().min(1).max(180), content: z.string().max(1_000_000) }))
    .max(40)
    .default([]),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4_000) })).max(8).default([]),
});

export async function POST(request: Request) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "demo";
    const limited = consumeMemoryRateLimit(`demo:${ip}`, 6);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Trop d’essais démo. Réessayez dans quelques minutes, ou créez un compte." },
        { status: 429 },
      );
    }
    const body = bodySchema.parse(await request.json());
    const media = body.files.filter((file) => isBinaryFilePath(file.path));
    const result = validateGenerationResult(
      await demoProvider.generate({
        prompt: body.prompt,
        projectName: "Démo Capitune",
        projectDescription: "Atelier public",
        existingFiles: body.files.filter((file) => !isBinaryFilePath(file.path)),
        mediaPaths: media.map((file) => file.path),
        recentMessages: body.messages,
      }),
    );
    const unique = new Map(result.files.map((file) => [file.path, file]));
    for (const file of media) unique.set(file.path, file);
    return NextResponse.json({
      demoMode: true,
      summary: result.summary,
      files: [...unique.values()],
    });
  } catch (error) {
    return errorResponse(error);
  }
}
