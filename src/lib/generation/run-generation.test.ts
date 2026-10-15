import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { demoProvider } from "@/lib/ai/demo-provider";
import type { AIProvider } from "@/lib/ai/provider";
import { validateGenerationResult } from "@/lib/ai/schema";
import { runGeneration } from "@/lib/generation/run-generation";
import { saveProjectFile, saveProjectMedia } from "@/lib/generation/save-files";
import { PIXEL_PNG_BASE64 } from "@/lib/media/files";
import { hashPassword } from "@/lib/auth/password";
import { resetRateLimitForTests } from "@/lib/rate-limit";
import { createLocalRepository } from "@/lib/store/local-repository";
import { OwnershipError } from "@/lib/store/repository";

describe("generation and ownership", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    resetRateLimitForTests();
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  async function setup() {
    const dir = await mkdtemp(path.join(os.tmpdir(), "capitune-"));
    dirs.push(dir);
    const repository = createLocalRepository(path.join(dir, "store.json"));
    const owner = await repository.createUser({
      email: "owner@example.com",
      displayName: "Owner",
      passwordHash: await hashPassword("password12"),
    });
    const other = await repository.createUser({
      email: "other@example.com",
      displayName: "Other",
      passwordHash: await hashPassword("password12"),
    });
    const created = await repository.createProject({
      ownerId: owner.id,
      name: "Vitrine",
      description: "Demo",
    });
    return { repository, owner, other, projectId: created.project.id };
  }

  it("creates a recoverable version from demo generation", async () => {
    const { repository, owner, projectId } = await setup();
    const result = await runGeneration({
      repository,
      provider: demoProvider,
      ownerId: owner.id,
      projectId,
      prompt: "Une page d’accueil artisanale",
    });
    expect(result.demoMode).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(result.files.some((file) => file.path === "images/mark.png")).toBe(true);
    const bundle = await repository.getProject(owner.id, projectId);
    expect(bundle.versions).toHaveLength(1);
    expect(bundle.messages.some((message) => message.role === "user")).toBe(true);

    const restored = await repository.restoreVersion(owner.id, projectId, bundle.versions[0].id);
    expect(restored.versions.length).toBeGreaterThan(1);
    expect(restored.files.some((file) => file.path === "index.html")).toBe(true);

    const saved = await saveProjectFile({
      repository,
      ownerId: owner.id,
      projectId,
      path: "index.html",
      content: "<h1>Edit</h1>",
    });
    expect(saved.files.find((file) => file.path === "index.html")?.content).toBe("<h1>Edit</h1>");
  });

  it("blocks another user from reading a project", async () => {
    const { repository, other, projectId } = await setup();
    await expect(repository.getProject(other.id, projectId)).rejects.toBeInstanceOf(OwnershipError);
  });

  it("serves published files by token without exposing another user's project", async () => {
    const { repository, owner, projectId } = await setup();
    await runGeneration({
      repository,
      provider: demoProvider,
      ownerId: owner.id,
      projectId,
      prompt: "Une page d’accueil artisanale",
    });
    const published = await repository.setPublishToken(owner.id, projectId, "atelier-vitrine");
    expect(published.publishToken).toBe("atelier-vitrine");
    const site = await repository.getPublishedSite("atelier-vitrine");
    expect(site.files.some((file) => file.path === "index.html")).toBe(true);
    await expect(repository.getPublishedSite("missing-share-token-xx")).rejects.toThrow();

    const otherProject = await repository.createProject({
      ownerId: owner.id,
      name: "Autre",
      description: "Demo",
    });
    await expect(
      repository.setPublishToken(owner.id, otherProject.project.id, "atelier-vitrine"),
    ).rejects.toThrow();
  });

  it("persists generation quota per owner", async () => {
    const { repository, owner } = await setup();
    for (let i = 0; i < 8; i += 1) {
      await expect(repository.consumeGenerationLimit(owner.id)).resolves.toEqual({ ok: true });
    }
    const blocked = await repository.consumeGenerationLimit(owner.id);
    expect(blocked.ok).toBe(false);
  });

  it("keeps uploaded images when the model omits them", async () => {
    const { repository, owner, projectId } = await setup();
    await runGeneration({
      repository,
      provider: demoProvider,
      ownerId: owner.id,
      projectId,
      prompt: "Une page d’accueil artisanale",
    });
    await saveProjectMedia({
      repository,
      ownerId: owner.id,
      projectId,
      path: "images/extra.png",
      content: PIXEL_PNG_BASE64,
    });
    const stub: AIProvider = {
      id: "stub",
      demoMode: true,
      async generate() {
        return validateGenerationResult({
          summary: "Texte seulement",
          files: [
            { path: "index.html", content: "<h1>New</h1>" },
            { path: "styles.css", content: "body{margin:0}" },
          ],
        });
      },
    };
    const next = await runGeneration({
      repository,
      provider: stub,
      ownerId: owner.id,
      projectId,
      prompt: "Change le titre",
    });
    expect(next.files.some((file) => file.path === "images/extra.png")).toBe(true);
    expect(next.files.some((file) => file.path === "images/mark.png")).toBe(true);
  });

  it("raises the cap on the pro plan", async () => {
    const { repository, owner } = await setup();
    await repository.setUserPlan(owner.id, "pro");
    for (let i = 0; i < 40; i += 1) {
      await expect(repository.consumeGenerationLimit(owner.id)).resolves.toEqual({ ok: true });
    }
    const blocked = await repository.consumeGenerationLimit(owner.id);
    expect(blocked.ok).toBe(false);
  });

  it("rejects empty prompts", async () => {
    const { repository, owner, projectId } = await setup();
    await expect(
      runGeneration({
        repository,
        provider: demoProvider,
        ownerId: owner.id,
        projectId,
        prompt: " ",
      }),
    ).rejects.toThrow();
  });
});
