import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/guard";
import { previewFileResponse, previewSecurityHeaders } from "@/lib/preview/headers";
import { decodePreviewToken } from "@/lib/preview/token";
import { localizePreviewHtml, needsPreviewIndexRedirect, previewFilePath, previewSitePath } from "@/lib/preview/url";
import { validateProjectPath } from "@/lib/projects/paths";
import { getRepository } from "@/lib/store";
import { publishedNotFoundResponse } from "@/lib/publish/not-found-page";
import { NotFoundError, OwnershipError } from "@/lib/store/repository";

type Ctx = { params: Promise<{ token: string; path?: string[] }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const { token, path: segments = [] } = await context.params;
    const payload = decodePreviewToken(token);
    if (!payload) {
      throw new NotFoundError("Aperçu introuvable.");
    }
    if (needsPreviewIndexRedirect(segments)) {
      return NextResponse.redirect(new URL(previewSitePath(token), request.url), 308);
    }
    const relative = previewFilePath(segments);
    const pathResult = validateProjectPath(relative);
    if (!pathResult.ok) {
      return new Response("Chemin refusé.", { status: 400, headers: previewSecurityHeaders() });
    }
    const bundle = await (await getRepository()).getProject(payload.ownerId, payload.projectId);
    const file = bundle.files.find((item) => item.path === pathResult.path);
    if (!file) {
      throw new NotFoundError("Fichier introuvable.");
    }
    const body = file.path.endsWith(".html") ? localizePreviewHtml(file.content, token) : file.content;
    return previewFileResponse(body, file.path);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof OwnershipError) {
      return publishedNotFoundResponse();
    }
    return errorResponse(error);
  }
}
