import { describe, expect, it } from "vitest";
import { demoProvider } from "@/lib/ai/demo-provider";
import { getAIProvider } from "@/lib/ai";

describe("demo provider", () => {
  it("returns deterministic sample files", async () => {
    const first = await demoProvider.generate({
      prompt: "Boutique de café",
      projectName: "Café",
      projectDescription: "Test",
      existingFiles: [],
      recentMessages: [],
    });
    const second = await demoProvider.generate({
      prompt: "Boutique de café",
      projectName: "Café",
      projectDescription: "Test",
      existingFiles: [],
      recentMessages: [],
    });
    expect(first.files).toEqual(second.files);
    expect(first.files.some((file) => file.path === "index.html")).toBe(true);
    expect(first.files.find((file) => file.path === "index.html")?.content).toContain("Boutique de café");
    expect(first.files.find((file) => file.path === "index.html")?.content).toContain('href="styles.css"');
    expect(first.files.some((file) => file.path === "contact.html")).toBe(true);
    expect(first.files.some((file) => file.path === "app.js")).toBe(true);
  });

  it("uses demo mode when no AI key is configured", () => {
    const previous = process.env.AI_API_KEY;
    delete process.env.AI_API_KEY;
    expect(getAIProvider().demoMode).toBe(true);
    expect(getAIProvider().id).toBe("demo");
    process.env.AI_API_KEY = previous;
  });
});
