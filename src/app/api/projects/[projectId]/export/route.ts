import { requireUser } from "@/lib/auth/server";
import { buildProjectExportArchive } from "@/lib/export/project-archive";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";

type Ctx = { params: Promise<{ projectId: string }> };

export async function GET(_request: Request, context: Ctx) {
  try {
    const user = await requireUser();
    const { projectId } = await context.params;
    const bundle = await (await getRepository()).getProject(user.id, projectId);
    const zip = buildProjectExportArchive(bundle.project, bundle.files);
    const filename = `${bundle.project.name.replace(/[^\w\-]+/g, "-").toLowerCase() || "projet"}-capitune.zip`;
    return new Response(new Uint8Array(zip), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
