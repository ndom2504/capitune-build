import { z } from "zod";
import {
  MAX_FILE_BYTES,
  MAX_FILES_PER_GENERATION,
  MAX_PROMPT_LENGTH,
  MIN_PROMPT_LENGTH,
} from "@/lib/constants";
import { validateProjectPath } from "@/lib/projects/paths";

export const promptSchema = z
  .string()
  .trim()
  .min(MIN_PROMPT_LENGTH)
  .max(MAX_PROMPT_LENGTH);

export const generatedFileSchema = z.object({
  path: z.string().min(1).max(180),
  content: z.string().max(MAX_FILE_BYTES),
});

export const generationResultSchema = z.object({
  summary: z.string().min(1).max(2_000),
  files: z.array(generatedFileSchema).min(1).max(MAX_FILES_PER_GENERATION),
});

export type GenerationResult = z.infer<typeof generationResultSchema>;
export type GeneratedFile = z.infer<typeof generatedFileSchema>;

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenced?.[1]) {
      return JSON.parse(fenced[1].trim());
    }
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("Réponse IA illisible (JSON attendu).");
  }
}

export function validateGenerationResult(input: unknown): GenerationResult {
  const parsed = generationResultSchema.parse(input);
  const seen = new Set<string>();
  let total = 0;

  const files = parsed.files.map((file) => {
    const pathResult = validateProjectPath(file.path);
    if (!pathResult.ok) {
      throw new Error(`Chemin de fichier refusé (${pathResult.error}): ${file.path}`);
    }
    if (seen.has(pathResult.path)) {
      throw new Error(`Fichier dupliqué: ${pathResult.path}`);
    }
    seen.add(pathResult.path);
    const bytes = Buffer.byteLength(file.content, "utf8");
    if (bytes > MAX_FILE_BYTES) {
      throw new Error(`Fichier trop volumineux: ${pathResult.path}`);
    }
    total += bytes;
    return { path: pathResult.path, content: file.content };
  });

  if (total > 1_500_000) {
    throw new Error("Volume total des fichiers trop élevé.");
  }

  return { summary: parsed.summary, files };
}
