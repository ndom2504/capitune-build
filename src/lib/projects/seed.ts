import { demoProvider } from "@/lib/ai/demo-provider";
import type { Repository } from "@/lib/store/repository";

export async function seedDemoProject(repository: Repository, ownerId: string) {
  const existing = await repository.listProjects(ownerId);
  if (existing.length > 0) {
    return existing[0];
  }

  const bundle = await repository.createProject({
    ownerId,
    name: "Atelier vitrine",
    description: "Projet de démonstration Capitune.",
  });

  const generated = await demoProvider.generate({
    prompt: "Une vitrine artisanale sobre, avec une instruction d’accueil.",
    projectName: bundle.project.name,
    projectDescription: bundle.project.description,
    existingFiles: [],
    recentMessages: [],
  });

  await repository.replaceFiles(
    ownerId,
    bundle.project.id,
    generated.files,
    "Version initiale de démonstration",
  );
  await repository.addMessage(ownerId, bundle.project.id, {
    role: "assistant",
    content:
      "Voici un projet de démonstration. Décrivez une modification pour générer une nouvelle version.",
    demoMode: true,
  });

  return bundle.project;
}
