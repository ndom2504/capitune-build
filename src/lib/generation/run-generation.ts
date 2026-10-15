import { promptSchema, validateGenerationResult } from "@/lib/ai/schema";
import type { AIProvider } from "@/lib/ai/provider";
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

  const result = validateGenerationResult(
    await options.provider.generate({
      prompt,
      projectName: bundle.project.name,
      projectDescription: bundle.project.description,
      existingFiles: bundle.files.map((file) => ({ path: file.path, content: file.content })),
      recentMessages: bundle.messages
        .filter((message) => message.role === "user" || message.role === "assistant")
        .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
    }),
  );

  const applied = await options.repository.replaceFiles(
    options.ownerId,
    options.projectId,
    result.files,
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
