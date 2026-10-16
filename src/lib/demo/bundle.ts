import { demoProvider } from "@/lib/ai/demo-provider";
import type { ProjectBundle } from "@/lib/domain";

export async function buildPlaygroundBundle(): Promise<ProjectBundle> {
  const generated = await demoProvider.generate({
    prompt: "Une vitrine artisanale sobre, avec une instruction d’accueil.",
    projectName: "Démo Capitune",
    projectDescription: "Atelier public, sans compte. Les fichiers restent dans cet onglet.",
    existingFiles: [],
    recentMessages: [],
  });
  const now = new Date().toISOString();
  return {
    project: {
      id: "prj_demo",
      ownerId: "usr_demo",
      name: "Démo Capitune",
      description: "Essayez Capitune sans créer de compte.",
      publishToken: null,
      accessRole: "owner",
      createdAt: now,
      updatedAt: now,
    },
    files: generated.files.map((file, index) => ({
      id: `file_demo_${index}`,
      projectId: "prj_demo",
      path: file.path,
      content: file.content,
      updatedAt: now,
    })),
    conversation: { id: "cnv_demo", projectId: "prj_demo", createdAt: now },
    messages: [
      {
        id: "msg_demo",
        conversationId: "cnv_demo",
        role: "assistant",
        content:
          "Démo publique : décrivez une modification. Rien n’est enregistré sur un compte tant que vous ne vous inscrivez pas.",
        demoMode: true,
        createdAt: now,
      },
    ],
    versions: [],
  };
}
