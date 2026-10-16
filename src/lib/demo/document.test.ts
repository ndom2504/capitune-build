import { describe, expect, it } from "vitest";
import { playgroundSrcDoc } from "@/lib/demo/document";

describe("playground srcDoc", () => {
  it("inlines CSS and image paths for iframe preview", () => {
    const html = playgroundSrcDoc(
      [
        {
          path: "index.html",
          content:
            '<link rel="stylesheet" href="styles.css"><script src="app.js"></script><img src="images/mark.png" alt="">',
        },
        { path: "app.js", content: "window.__capitune = 1;" },
        { path: "styles.css", content: "body{color:red}" },
        { path: "images/mark.png", content: "iVBORw0KGgo=" },
      ],
      "index.html",
    );
    expect(html).toContain("<style>body{color:red}</style>");
    expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
    expect(html).not.toContain('href="styles.css"');
    expect(html).toContain("window.__capitune = 1;");
    expect(html).not.toContain('src="app.js"');
  });
});
