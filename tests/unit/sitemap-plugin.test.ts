import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readSitemapPuzzles, renderRobotsTxt, renderSitemapXml } from "../../scripts/vite/sitemap-plugin";

const projectRoot = resolve(import.meta.dirname, "../..");

describe("readSitemapPuzzles", () => {
  it("discovers built-in puzzles in catalog order", () => {
    const puzzles = readSitemapPuzzles(projectRoot);

    expect(puzzles.map(({ id, name }) => ({ id, name }))).toEqual([
      { id: "gobbo", name: "Gobbo" },
      { id: "vending-machine", name: "Vending Machine" },
      { id: "ribbit", name: "Ribbit" },
      { id: "warehouse", name: "Warehouse" },
      { id: "mech", name: "Mech" },
      { id: "deep-sea", name: "Deep Sea" },
      { id: "sky-farm", name: "Sky Farm" },
      { id: "jungle", name: "Jungle" },
      { id: "mountain", name: "Mountain" },
    ]);
  });
});

describe("renderSitemapXml", () => {
  it("renders absolute XML locations for the menu and every puzzle", () => {
    const xml = renderSitemapXml(
      [{ catalogOrder: 1, id: "test", name: "A <test> & puzzle", path: "/play/test" }],
      "https://example.com",
      { "/play/test": "2026-09-07" }
    );

    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://example.com/</loc>");
    expect(xml).toContain("<loc>https://example.com/achievements</loc>");
    expect(xml).toContain("<loc>https://example.com/privacy</loc>");
    expect(xml).toContain("<loc>https://example.com/play/test</loc>");
    expect(xml).toContain("<loc>https://example.com/play/test</loc>\n    <lastmod>2026-09-07</lastmod>");
    expect(xml).toContain("<loc>https://example.com/</loc>\n    <lastmod>2026-09-06</lastmod>");
    expect(xml).not.toContain("<style");
  });

  it("includes a fixed date for every current sitemap URL", () => {
    const puzzles = readSitemapPuzzles(projectRoot);
    const xml = renderSitemapXml(puzzles, "https://example.com", {});

    expect(xml.match(/<lastmod>2026-09-06<\/lastmod>/g)).toHaveLength(puzzles.length + 3);
  });

  it("uses the baseline for pages without an override", () => {
    const xml = renderSitemapXml(
      [{ catalogOrder: 1, id: "new", name: "New", path: "/play/new" }],
      "https://example.com",
      { "/": "2026-09-10" }
    );

    expect(xml).toContain("<loc>https://example.com/play/new</loc>\n    <lastmod>2026-09-06</lastmod>");
    expect(xml).toContain("<loc>https://example.com/</loc>\n    <lastmod>2026-09-10</lastmod>");
  });
});

describe("renderRobotsTxt", () => {
  it("allows crawling and points to the generated sitemap", () => {
    expect(renderRobotsTxt("https://example.com")).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://example.com/sitemap.xml\n"
    );
  });
});
