import { createZipArchive } from "@/lib/export/zip";
import type { Project, ProjectFile } from "@/lib/domain";

export function buildProjectExportArchive(project: Project, files: ProjectFile[]): Buffer {
  const entries = files.map((file) => ({ path: file.path, content: file.content }));
  entries.push({
    path: "CAPITUNE.md",
    content: `# ${project.name}

Ces fichiers sont le code généré pour votre projet Capitune.

Ils sont distincts du code source de la plateforme Capitune (application Next.js dans le dépôt produit).

## Lancer le projet
1. Décompressez cette archive.
2. Ouvrez \`index.html\` dans un navigateur, ou servez le dossier avec n’importe quel serveur statique.

## Description
${project.description || "—"}
`,
  });
  return createZipArchive(entries);
}
