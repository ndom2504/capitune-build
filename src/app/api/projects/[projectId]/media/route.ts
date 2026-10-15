import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/server";
import { MAX_MEDIA_FILE_BYTES } from "@/lib/constants";
import { saveProjectMedia } from "@/lib/generation/save-files";
import { errorResponse } from "@/lib/http/guard";
import { encodeMediaBytes, isBinaryFilePath } from "@/lib/media/files";
import { validateProjectPath } from "@/lib/projects/paths";
import { getRepository } from "@/lib/store";

type Ctx = { params: Promise<{ projectId: string }> };

export async function POST(request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const form = await request.formData();
    const upload = form.get("file");
    if (!(upload instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }
    if (upload.size > MAX_MEDIA_FILE_BYTES) {
      return NextResponse.json({ error: "Image trop volumineuse (1 Mo max)." }, { status: 400 });
    }
    const original = upload.name.replace(/\\/g, "/").split("/").pop() || "image.png";
    const relative = original.includes("/") ? original : `images/${original}`;
    const pathResult = validateProjectPath(relative);
    if (!pathResult.ok || !isBinaryFilePath(pathResult.path)) {
      return NextResponse.json({ error: "Type d’image refusé (png, jpg, webp, gif, ico)." }, { status: 400 });
    }
    const bytes = Buffer.from(await upload.arrayBuffer());
    const result = await saveProjectMedia({
      repository: await getRepository(),
      ownerId: user.id,
      projectId,
      path: pathResult.path,
      content: encodeMediaBytes(bytes),
    });
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
