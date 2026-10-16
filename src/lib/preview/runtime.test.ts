import { describe, expect, it } from "vitest";
import { buildIsolatedSrcDoc, isolatedRuntimeCsp, localizeGeneratedJs } from "@/lib/preview/runtime";

describe("isolated runtime", () => {
  it("inlines CSS, JS and images for srcDoc", () => {
    const html = buildIsolatedSrcDoc(
      [
        {
          path: "index.html",
          content:
            '<link rel="stylesheet" href="styles.css"><script src="app.js" defer></script><img src="images/mark.png" alt="">',
        },
        { path: "styles.css", content: "body{color:red}" },
        { path: "app.js", content: 'document.body.dataset.ready="1";' },
        { path: "images/mark.png", content: "iVBORw0KGgo=" },
      ],
      "index.html",
    );
    expect(html).toContain("<style>body{color:red}</style>");
    expect(html).toContain('document.body.dataset.ready="1";');
    expect(html).not.toContain('src="app.js"');
    expect(html).toContain('src="data:image/png;base64,iVBORw0KGgo="');
  });

  it("rewrites root-absolute JS imports onto the capability prefix", () => {
    const js = `import helper from "/lib/helper.js"; import("/data.json");`;
    const next = localizeGeneratedJs(js, "/p/tok/");
    expect(next).toContain('from "/p/tok/lib/helper.js"');
    expect(next).toContain('import("/p/tok/data.json")');
  });

  it("keeps network closed in the runtime CSP", () => {
    const csp = isolatedRuntimeCsp("'self'");
    expect(csp).toContain("connect-src 'none'");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });
});
