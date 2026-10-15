import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { demoProvider } from "@/lib/ai/demo-provider";
import { runGeneration } from "@/lib/generation/run-generation";
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
    const bundle = await repository.getProject(owner.id, projectId);
    expect(bundle.versions).toHaveLength(1);
    expect(bundle.messages.some((message) => message.role === "user")).toBe(true);

    const restored = await repository.restoreVersion(owner.id, projectId, bundle.versions[0].id);
    expect(restored.versions.length).toBeGreaterThan(1);
    expect(restored.files.some((file) => file.path === "index.html")).toBe(true);
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
    const published = await repository.setPublishToken(owner.id, projectId, "public-share-token-ok");
    expect(published.publishToken).toBe("public-share-token-ok");
    const site = await repository.getPublishedSite("public-share-token-ok");
    expect(site.files.some((file) => file.path === "index.html")).toBe(true);
    await expect(repository.getPublishedSite("missing-share-token-xx")).rejects.toThrow();
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
