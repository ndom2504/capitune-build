import { describe, expect, it } from "vitest";
import { validateProjectPath } from "@/lib/projects/paths";

describe("validateProjectPath", () => {
  it("accepts safe relative files", () => {
    expect(validateProjectPath("index.html")).toEqual({ ok: true, path: "index.html" });
    expect(validateProjectPath("css/styles.css")).toEqual({ ok: true, path: "css/styles.css" });
  });

  it("rejects traversal and absolute paths", () => {
    expect(validateProjectPath("../secret.html").ok).toBe(false);
    expect(validateProjectPath("/etc/passwd").ok).toBe(false);
    expect(validateProjectPath("..\\win.html").ok).toBe(false);
    expect(validateProjectPath("foo/../../x.html").ok).toBe(false);
  });

  it("rejects unsupported types", () => {
    expect(validateProjectPath("run.sh").ok).toBe(false);
    expect(validateProjectPath("images/mark.png").ok).toBe(true);
    expect(validateProjectPath("image.exe").ok).toBe(false);
  });
});
