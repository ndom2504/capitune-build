import { demoProvider } from "@/lib/ai/demo-provider";
import { createOpenAICompatibleProvider } from "@/lib/ai/openai-compatible";
import type { AIProvider } from "@/lib/ai/provider";

export function getAIProvider(): AIProvider {
  const apiKey = process.env.AI_API_KEY?.trim();
  if (!apiKey) {
    return demoProvider;
  }
  return createOpenAICompatibleProvider({
    apiKey,
    baseUrl: process.env.AI_BASE_URL?.trim() || "https://api.openai.com/v1",
    model: process.env.AI_MODEL?.trim() || "gpt-4o-mini",
  });
}

export function isDemoAI(): boolean {
  return getAIProvider().demoMode;
}
