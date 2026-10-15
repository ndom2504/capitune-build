import { validateGenerationResult, type GenerationResult } from "@/lib/ai/schema";
import type { AIProvider, GenerateProjectInput } from "@/lib/ai/provider";

export function createOpenAICompatibleProvider(config: {
  apiKey: string;
  baseUrl: string;
  model: string;
}): AIProvider {
  return {
    id: "openai-compatible",
    demoMode: false,
    async generate(input: GenerateProjectInput): Promise<GenerationResult> {
      const response = await fetch(`${config.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You generate static websites as JSON: {\"summary\":\"...\",\"files\":[{\"path\":\"index.html\",\"content\":\"...\"}]}. Only HTML, CSS, JS, MD, SVG, TXT, JSON, ICO. No shell commands, no secrets, no path traversal. Prefer index.html + styles.css. Language of visible copy: French unless the user asks otherwise.",
            },
            ...input.recentMessages.slice(-6).map((message) => ({
              role: message.role,
              content: message.content,
            })),
            {
              role: "user",
              content: JSON.stringify({
                prompt: input.prompt,
                projectName: input.projectName,
                projectDescription: input.projectDescription,
                existingFiles: input.existingFiles.map((file) => ({
                  path: file.path,
                  content: file.content.slice(0, 8_000),
                })),
              }),
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error("Le fournisseur IA a renvoyé une erreur. Réessayez.");
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Réponse IA vide.");
      }
      return validateGenerationResult(JSON.parse(content));
    },
  };
}
