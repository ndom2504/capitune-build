import { promptSchema, validateGenerationResult } from "@/lib/ai/schema";
import type { AIProvider } from "@/lib/ai/provider";
import { isBinaryFilePath } from "@/lib/media/files";
import { RateLimitError } from "@/lib/rate-limit";
import type { Repository } from "@/lib/store/repository";

export async function runGeneration(options: {
  repository: Repository;
  provider: AIProvider;
  ownerId: string;
  projectId: string;
  prompt: string;
}) {
  const prompt = promptSchema.parse(options.prompt);
  const limited = await options.repository.consumeGenerationLimit(options.ownerId);
  if (!limited.ok) {
    throw new RateLimitError(limited.retryAfterMs);
  }

  const bundle = await options.repository.getProject(options.ownerId, options.projectId);
  await options.repository.addMessage(options.ownerId, options.projectId, {
    role: "user",
    content: prompt,
  });

  const media = bundle.files.filter((file) => isBinaryFilePath(file.path));
  const result = validateGenerationResult(
    await options.provider.generate({
      prompt,
      projectName: bundle.project.name,
      projectDescription: bundle.project.description,
      existingFiles: bundle.files
        .filter((file) => !isBinaryFilePath(file.path))
        .map((file) => ({ path: file.path, content: file.content })),
      mediaPaths: media.map((file) => file.path),
      recentMessages: bundle.messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
    }),
  );

  const unique = new Map(result.files.map((file) => [file.path, file]));
  for (const file of media) {
    unique.set(file.path, { path: file.path, content: file.content });
  }

  const applied = await options.repository.replaceFiles(
    options.ownerId,
    options.projectId,
    [...unique.values()],
    result.summary.slice(0, 80),
  );

  const assistant = await options.repository.addMessage(options.ownerId, options.projectId, {
    role: "assistant",
    content: result.summary,
    demoMode: options.provider.demoMode,
  });

  return {
    demoMode: options.provider.demoMode,
    summary: result.summary,
    files: applied.files,
    version: applied.version,
    assistant,
  };
}
