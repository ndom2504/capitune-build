import { NextResponse } from "next/server";
import { errorResponse } from "@/lib/http/guard";
import { previewFileResponse, previewSecurityHeaders } from "@/lib/preview/headers";
import {
  isPublicSiteKey,
  localizePublishedHtml,
  needsPublishedIndexRedirect,
  publishedFilePath,
  publicSitePath,
} from "@/lib/publish/url";
import { validateProjectPath } from "@/lib/projects/paths";
import { getRepository } from "@/lib/store";
import { publishedNotFoundResponse } from "@/lib/publish/not-found-page";
import { NotFoundError, PublishSchemaError } from "@/lib/store/repository";

type Ctx = { params: Promise<{ token: string; path?: string[] }> };

export async function GET(request: Request, context: Ctx) {
  try {
    const { token, path: segments = [] } = await context.params;
    if (!isPublicSiteKey(token)) {
      throw new NotFoundError("Site introuvable.");
    }
    if (needsPublishedIndexRedirect(segments)) {
      return NextResponse.redirect(new URL(publicSitePath(token), request.url), 308);
    }
    const relative = publishedFilePath(segments);
    const pathResult = validateProjectPath(relative);
    if (!pathResult.ok) {
      return new Response("Chemin refusé.", { status: 400, headers: previewSecurityHeaders() });
    }
    const site = await (await getRepository()).getPublishedSite(token);
    const file = site.files.find((item) => item.path === pathResult.path);
    if (!file) {
      throw new NotFoundError("Fichier introuvable.");
    }
    const body =
      file.path.endsWith(".html") ? localizePublishedHtml(file.content, token) : file.content;
    return previewFileResponse(body, file.path);
  } catch (error) {
    if (error instanceof NotFoundError) {
      return publishedNotFoundResponse();
    }
    if (error instanceof PublishSchemaError) {
      return publishedNotFoundResponse(503);
    }
    return errorResponse(error);
  }
}
