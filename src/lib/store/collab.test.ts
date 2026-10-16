import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { hashPassword } from "@/lib/auth/password";
import { createLocalRepository } from "@/lib/store/local-repository";
import { OwnershipError } from "@/lib/store/repository";

describe("local collab invites", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
  });

  it("lets an invited editor open a project while a stranger cannot", async () => {
    const dir = await mkdtemp(path.join(os.tmpdir(), "capitune-collab-"));
    dirs.push(dir);
    const repository = createLocalRepository(path.join(dir, "store.json"));
    const owner = await repository.createUser({
      email: "owner@example.com",
      displayName: "Owner",
      passwordHash: await hashPassword("password12"),
    });
    const editor = await repository.createUser({
      email: "editor@example.com",
      displayName: "Editor",
      passwordHash: await hashPassword("password12"),
    });
    const stranger = await repository.createUser({
      email: "stranger@example.com",
      displayName: "Stranger",
      passwordHash: await hashPassword("password12"),
    });
    const created = await repository.createProject({
      ownerId: owner.id,
      name: "Atelier",
      description: "Demo",
    });
    const invite = await repository.createInvite(owner.id, created.project.id, "editor");
    const joined = await repository.acceptInvite(editor.id, invite.token);
    expect(joined.accessRole).toBe("editor");

    const listed = await repository.listProjects(editor.id);
    expect(listed.some((project) => project.id === created.project.id && project.accessRole === "editor")).toBe(true);

    const bundle = await repository.getProject(editor.id, created.project.id);
    expect(bundle.project.accessRole).toBe("editor");
    await expect(repository.getProject(stranger.id, created.project.id)).rejects.toBeInstanceOf(OwnershipError);

    await repository.replaceFiles(editor.id, created.project.id, [{ path: "index.html", content: "<h1>ok</h1>" }], "edit");
    await expect(
      repository.setPublishToken(editor.id, created.project.id, "slug-collab"),
    ).rejects.toBeInstanceOf(OwnershipError);
  });
});
