import { extractJsonObject, validateGenerationResult, type GenerationResult } from "@/lib/ai/schema";
import type { AIProvider, GenerateProjectInput } from "@/lib/ai/provider";

const SYSTEM_PROMPT = `Tu génères des sites web statiques pour Capitune.
Réponds uniquement par un objet JSON : {"summary":"phrase courte en français","files":[{"path":"index.html","content":"..."}]}.
Règles :
- Fichiers autorisés : html, css, js, md, svg, txt, json, ico.
- Toujours inclure index.html. Préférer styles.css séparé.
- HTML autonome, sémantique, accessible, responsive. Pas de frameworks distants obligatoires.
- Copie visible en français sauf si l’utilisateur demande une autre langue.
- Itère à partir des fichiers existants : conserve ce qui fonctionne, applique l’instruction.
- Interdit : chemins .., secrets, shell, backend, appels vers capitune.com, javascript malveillant.
- summary : 1 à 2 phrases, ce qui a changé.`;

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
          temperature: 0.4,
          max_tokens: 8_000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
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
        throw new Error(
          response.status === 401
            ? "Clé IA refusée. Vérifiez AI_API_KEY sur le serveur."
            : "Le fournisseur IA a renvoyé une erreur. Réessayez.",
        );
      }

      const payload = (await response.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("Réponse IA vide.");
      }
      try {
        return validateGenerationResult(extractJsonObject(content));
      } catch {
        throw new Error("La réponse du modèle n’était pas un projet valide. Réessayez.");
      }
    },
  };
}
