import { redirect, notFound } from "next/navigation";
import { WorkspaceClient } from "@/components/workspace-client";
import { isDemoAI } from "@/lib/ai";
import { getCurrentUser } from "@/lib/auth/server";
import { OwnershipError, NotFoundError } from "@/lib/store/repository";
import { getRepository } from "@/lib/store";

export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  const { projectId } = await params;
  try {
    const bundle = await (await getRepository()).getProject(user.id, projectId);
    return <WorkspaceClient initial={bundle} demoMode={isDemoAI()} />;
  } catch (error) {
    if (error instanceof OwnershipError) {
      redirect("/dashboard");
    }
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
}
