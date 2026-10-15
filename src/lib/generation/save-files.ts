import { validateGenerationResult } from "@/lib/ai/schema";
import { MAX_MEDIA_FILES } from "@/lib/constants";
import { isBinaryFilePath } from "@/lib/media/files";
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

export async function saveProjectMedia(options: {
  repository: Repository;
  ownerId: string;
  projectId: string;
  path: string;
  content: string;
}) {
  if (!isBinaryFilePath(options.path)) {
    throw new Error("Type de média refusé.");
  }
  const bundle = await options.repository.getProject(options.ownerId, options.projectId);
  const exists = bundle.files.some((file) => file.path === options.path);
  const mediaCount = bundle.files.filter((file) => isBinaryFilePath(file.path)).length;
  if (!exists && mediaCount >= MAX_MEDIA_FILES) {
    throw new Error(`Trop d’images (max ${MAX_MEDIA_FILES}).`);
  }
  const files = exists
    ? bundle.files.map((file) =>
        file.path === options.path
          ? { path: file.path, content: options.content }
          : { path: file.path, content: file.content },
      )
    : [...bundle.files.map((file) => ({ path: file.path, content: file.content })), { path: options.path, content: options.content }];
  const validated = validateGenerationResult({
    summary: `Média ${options.path}`,
    files,
  });
  return options.repository.replaceFiles(
    options.ownerId,
    options.projectId,
    validated.files,
    `Média ${options.path}`.slice(0, 80),
  );
}
