import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/server";
import { getRepository } from "@/lib/store";
import { CollabSchemaError, NotFoundError } from "@/lib/store/repository";

export default async function JoinPage({ params }: { params: Promise<{ token: string }> }) {
  const user = await getCurrentUser();
  const { token } = await params;
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/join/${token}`)}`);
  }
  try {
    const project = await (await getRepository()).acceptInvite(user.id, token);
    redirect(`/workspace/${project.id}`);
  } catch (error) {
    if (error instanceof CollabSchemaError) {
      redirect("/dashboard?collab=schema");
    }
    if (error instanceof NotFoundError) {
      redirect("/dashboard?collab=invalid");
    }
    throw error;
  }
}
