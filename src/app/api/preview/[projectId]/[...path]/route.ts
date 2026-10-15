import { requireUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/http/guard";
import { previewFileResponse, previewSecurityHeaders } from "@/lib/preview/headers";
import { validateProjectPath } from "@/lib/projects/paths";
import { getRepository } from "@/lib/store";

type Ctx = { params: Promise<{ projectId: string; path: string[] }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId, path: segments } = await context.params;
    const relative = segments.join("/");
    const pathResult = validateProjectPath(relative);
    if (!pathResult.ok) {
      return new Response("Chemin refusé.", { status: 400, headers: previewSecurityHeaders() });
    }
    const bundle = await (await getRepository()).getProject(user.id, projectId);
    const file = bundle.files.find((item) => item.path === pathResult.path);
    if (!file) {
      return new Response("Fichier introuvable.", { status: 404, headers: previewSecurityHeaders() });
    }
    return previewFileResponse(file.content, file.path);
  } catch (error) {
    return errorResponse(error);
  }
}
