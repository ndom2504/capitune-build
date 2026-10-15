import { validateGenerationResult } from "@/lib/ai/schema";
import type { Repository } from "@/lib/store/repository";

export async function saveProjectFile(options: {
  repository: Repository;
  ownerId: string;
  projectId: string;
  path: string;
  content: string;
}) {
  const bundle = await options.repository.getProject(options.ownerId, options.projectId);
  const exists = bundle.files.some((file) => file.path === options.path);
  if (!exists) {
    throw new Error("Fichier introuvable.");
  }
  const files = bundle.files.map((file) =>
    file.path === options.path ? { path: file.path, content: options.content } : { path: file.path, content: file.content },
  );
  const validated = validateGenerationResult({
    summary: `Modification de ${options.path}`,
    files,
  });
  return options.repository.replaceFiles(
    options.ownerId,
    options.projectId,
    validated.files,
    `Modification de ${options.path}`.slice(0, 80),
  );
}
