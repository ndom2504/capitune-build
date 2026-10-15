import type { GeneratedFile, GenerationResult } from "@/lib/ai/schema";

export type GenerateProjectInput = {
  prompt: string;
  projectName: string;
  projectDescription: string;
  existingFiles: GeneratedFile[];
  recentMessages: { role: "user" | "assistant"; content: string }[];
};

export interface AIProvider {
  readonly id: string;
  readonly demoMode: boolean;
  generate(input: GenerateProjectInput): Promise<GenerationResult>;
}
