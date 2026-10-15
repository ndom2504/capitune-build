import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth/server";
import { errorResponse } from "@/lib/http/guard";
import { getRepository } from "@/lib/store";

const createSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).default(""),
});

export async function GET() {
  try {
    const user = await requireUser();
    const projects = await (await getRepository()).listProjects(user.id);
    return NextResponse.json({ projects });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = createSchema.parse(await request.json());
    const bundle = await (await getRepository()).createProject({
      ownerId: user.id,
      name: body.name,
      description: body.description,
    });
    return NextResponse.json(bundle);
  } catch (error) {
    return errorResponse(error);
  }
}
