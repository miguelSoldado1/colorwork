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

  it("uses the generated favicon package", () => {
    const html = readFileSync(resolve(projectRoot, "index.html"), "utf8");
    const favicon = readFileSync(resolve(projectRoot, "public/favicon-96x96.png"));
    const appleTouchIcon = readFileSync(resolve(projectRoot, "public/apple-touch-icon.png"));
    const manifestIcon = readFileSync(resolve(projectRoot, "public/web-app-manifest-512x512.png"));
    const ico = readFileSync(resolve(projectRoot, "public/favicon.ico"));
    const manifest = JSON.parse(readFileSync(resolve(projectRoot, "public/site.webmanifest"), "utf8"));

    expect(html).toContain('href="/favicon.svg"');
    expect(html).toContain('href="/favicon-96x96.png"');
    expect(html).toContain('href="/favicon.ico"');
    expect(html).toContain('href="/apple-touch-icon.png"');
    expect(html).toContain('name="apple-mobile-web-app-title"');
    expect(html).toContain('href="/site.webmanifest"');
    expect(manifest.icons).toHaveLength(2);
    for (const [png, size] of [
      [favicon, 96],
      [appleTouchIcon, 180],
      [manifestIcon, 512],
    ] as const) {
      expect(png.subarray(1, 4).toString("ascii")).toBe("PNG");
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
    }
    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.readUInt16LE(4)).toBeGreaterThan(0);
  });
});
