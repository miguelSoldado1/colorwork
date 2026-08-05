import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "../..");

describe("search and social metadata", () => {
  it("includes the required metadata in the application shell", () => {
    const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");

    expect(html).toContain('name="description"');
    expect(html).toContain('name="robots"');
    expect(html).toContain('property="og:title"');
    expect(html).toContain('property="og:description"');
    expect(html).toContain('property="og:type"');
    expect(html).toContain('property="og:url"');
    expect(html).toContain('property="og:image"');
    expect(html).toContain('name="twitter:card"');
    expect(html).toContain('name="twitter:image"');
    expect(html).toContain('type="application/ld+json"');
    expect(html).toContain("https://www.playcolorwork.com/social-preview.png");
  });

  it("uses a 1200 by 630 PNG social image", () => {
    const image = readFileSync(resolve(projectRoot, "public/social-preview.png"));

    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });

  it("uses stable adaptive favicon URLs", () => {
    const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");
    const svg = readFileSync(resolve(projectRoot, "public/favicon.svg"), "utf8");
    const lightPng = readFileSync(resolve(projectRoot, "public/favicon-48x48-light.png"));
    const darkPng = readFileSync(resolve(projectRoot, "public/favicon-48x48-dark.png"));
    const defaultIco = readFileSync(resolve(projectRoot, "public/favicon.ico"));
    const lightIco = readFileSync(resolve(projectRoot, "public/favicon-light.ico"));
    const darkIco = readFileSync(resolve(projectRoot, "public/favicon-dark.ico"));

    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('href="/favicon-48x48-light.png"');
    expect(html).toContain('href="/favicon-48x48-dark.png"');
    expect(html).toContain('href="/favicon-light.ico"');
    expect(html).toContain('href="/favicon-dark.ico"');
    expect(html).toContain('media="(prefers-color-scheme: light)"');
    expect(html).toContain('media="(prefers-color-scheme: dark)"');
    expect(svg).toContain('height="48"');
    expect(svg).toContain('width="48"');
    expect(svg).toContain("fill: #000");
    expect(svg).toContain("fill: #fff");
    for (const png of [lightPng, darkPng]) {
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(48);
      expect(png.readUInt32BE(20)).toBe(48);
    }
    for (const ico of [defaultIco, lightIco, darkIco]) {
      expect(ico.readUInt16LE(0)).toBe(0);
      expect(ico.readUInt16LE(2)).toBe(1);
      expect(ico.readUInt16LE(4)).toBeGreaterThan(0);
    }
  });
});
