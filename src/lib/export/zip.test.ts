import { describe, expect, it } from "vitest";
import { buildProjectExportArchive } from "@/lib/export/project-archive";
import { createZipArchive } from "@/lib/export/zip";

describe("export", () => {
  it("builds a zip containing generated files and a Capitune readme", () => {
    const zip = buildProjectExportArchive(
      {
        id: "prj_1",
        ownerId: "usr_1",
        name: "Studio",
        description: "Test",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      [
        {
          id: "f1",
          projectId: "prj_1",
          path: "index.html",
          content: "<h1>Studio</h1>",
          updatedAt: new Date().toISOString(),
        },
      ],
    );
    expect(zip.subarray(0, 2).toString()).toBe("PK");
    expect(zip.includes(Buffer.from("CAPITUNE.md"))).toBe(true);
    expect(zip.includes(Buffer.from("index.html"))).toBe(true);
    expect(zip.includes(Buffer.from("distincts du code source de la plateforme"))).toBe(true);
  });

  it("creates a valid store zip for multiple files", () => {
    const zip = createZipArchive([
      { path: "a.txt", content: "one" },
      { path: "b.txt", content: "two" },
    ]);
    expect(zip.length).toBeGreaterThan(40);
  });
});
