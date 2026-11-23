import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { renderPageHtml } from "../../scripts/vite/prerender-plugin";

it("renders a page into the shell with its own head tags", () => {
  const template = readFileSync(resolve(import.meta.dirname, "../../index.html"), "utf8");
  const html = renderPageHtml(
    template,
    { description: 'Say "hi" & <go>', path: "/a", title: "A <page>" },
    "<main></main>"
  );

  expect(html).toContain('<div id="root"><main></main></div>');
  expect(html).toContain("<title>A &lt;page&gt;</title>");
  expect(html).toContain('<meta content="Say &quot;hi&quot; &amp; &lt;go&gt;" name="description">');
  expect(html).toContain('<meta content="https://www.playcolorwork.com/a" property="og:url">');
  expect(html).toContain('<link href="https://www.playcolorwork.com/a" rel="canonical">');
  expect(html.match(/name="description"/g)).toHaveLength(1);
});
