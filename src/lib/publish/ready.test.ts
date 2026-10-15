import { describe, expect, it } from "vitest";
import { assertProjectPublishable, isMissingPublishColumn } from "@/lib/publish/ready";

describe("publish ready", () => {
  it("requires index.html before going live", () => {
    expect(() => assertProjectPublishable([{ path: "styles.css" }])).toThrow(/index\.html/);
    expect(() => assertProjectPublishable([{ path: "index.html" }])).not.toThrow();
  });

  it("detects a missing publish_token column", () => {
    expect(isMissingPublishColumn("column projects.publish_token does not exist")).toBe(true);
    expect(isMissingPublishColumn("Could not find the 'publish_token' column of 'projects' in the schema cache")).toBe(
      true,
    );
    expect(isMissingPublishColumn("permission denied")).toBe(false);
  });
});
