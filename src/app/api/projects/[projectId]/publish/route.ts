import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { appOrigin } from "@/lib/auth/redirect";
import { errorResponse } from "@/lib/http/guard";
import { assertProjectPublishable } from "@/lib/publish/ready";
import { isPublishSlug, nextSlugCandidate, slugify } from "@/lib/publish/slug";
import { publicSitePath } from "@/lib/publish/token";
import { getRepository } from "@/lib/store";
import { SlugTakenError } from "@/lib/store/repository";

const bodySchema = z.object({
  rotate: z.boolean().optional(),
  slug: z.string().trim().max(48).optional(),
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

    const requested = body.slug ? slugify(body.slug) : "";
    if (body.slug && !isPublishSlug(requested)) {
      return NextResponse.json({ error: "Adresse publique invalide." }, { status: 400 });
    }

    const current = bundle.project.publishToken;
    if (current && !body.rotate && !requested) {
      const path = publicSitePath(current);
      return NextResponse.json({
        project: bundle.project,
        path,
        url: `${appOrigin(request)}${path}`,
      });
    }

    const preferred = requested || slugify(bundle.project.name) || "site";
    const userChoseSlug = Boolean(requested) && !(body.rotate && requested === current);
    let lastError: unknown;

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const forceSuffix = Boolean(body.rotate && preferred === current && attempt === 0);
      const token = nextSlugCandidate(preferred, forceSuffix ? 1 : attempt);
      try {
        const project = await repo.setPublishToken(user.id, projectId, token);
        const path = publicSitePath(project.publishToken ?? token);
        return NextResponse.json({
          project,
          path,
          url: `${appOrigin(request)}${path}`,
        });
      } catch (error) {
        lastError = error;
        if (!(error instanceof SlugTakenError)) throw error;
        if (userChoseSlug && attempt === 0 && !forceSuffix) throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new SlugTakenError();
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
