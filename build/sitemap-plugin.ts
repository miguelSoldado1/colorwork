import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "vite";

const PUZZLE_DIRECTORY = "src/puzzles";
const PUZZLE_FILE_PATTERN = /^[\w-]+\.ts$/;
const QUOTED_PROPERTY = (property: string) => new RegExp(`^[ \\t]+${property}:[ \\t]*("(?:\\\\.|[^"\\\\])*")[ \\t]*,?[ \\t]*$`, "m");
const SITEMAP_NAMESPACE = "http://www.sitemaps.org/schemas/sitemap/0.9";
const LOCAL_SITE_URL = "http://localhost:4173";

export interface SitemapPuzzle {
  catalogOrder: number;
  id: string;
  name: string;
  path: string;
}

export function readSitemapPuzzles(root: string) {
  const puzzleDirectory = resolve(root, PUZZLE_DIRECTORY);
  const entries = readdirSync(puzzleDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && PUZZLE_FILE_PATTERN.test(entry.name) && entry.name !== "decode-pixels.ts")
    .map((entry) => parsePuzzleSource(entry.name, readFileSync(resolve(puzzleDirectory, entry.name), "utf8")))
    .sort(comparePuzzleEntries);

  const ids = new Set<string>();
  for (const entry of entries) {
    if (ids.has(entry.id)) {
      throw new Error(`[sitemap] Duplicate puzzle id: ${entry.id}`);
    }
    ids.add(entry.id);
  }

  return entries;
}

export function renderSitemapXml(puzzles: readonly SitemapPuzzle[], siteUrl: string) {
  const paths = ["/", "/achievements", "/privacy", ...puzzles.map((puzzle) => puzzle.path)];
  const urls = paths
    .map((path) => `  <url>\n    <loc>${escapeXml(new URL(path, siteUrl).toString())}</loc>\n  </url>`)
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="${SITEMAP_NAMESPACE}">
${urls}
</urlset>
`;
}

export function renderRobotsTxt(siteUrl: string) {
  return `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`;
}

interface SitemapPluginOptions {
  siteUrl?: string;
}

export function sitemapPlugin(options: SitemapPluginOptions = {}) {
  let root: string | undefined;
  let siteUrl: string | undefined;

  return {
    apply: "build",
    configResolved(config) {
      root = config.root;
      siteUrl = normalizeSiteUrl(
        options.siteUrl ??
          process.env.VERCEL_PROJECT_PRODUCTION_URL ??
          process.env.SITE_URL ??
          process.env.VERCEL_URL ??
          LOCAL_SITE_URL,
      );
    },
    generateBundle() {
      if (!root || !siteUrl) {
        throw new Error("[sitemap] Vite project root and site URL must be resolved.");
      }

      this.emitFile({
        fileName: "sitemap.xml",
        source: renderSitemapXml(readSitemapPuzzles(root), siteUrl),
        type: "asset",
      });
      this.emitFile({
        fileName: "robots.txt",
        source: renderRobotsTxt(siteUrl),
        type: "asset",
      });
    },
    name: "sitemap",
  } satisfies Plugin;
}

function parsePuzzleSource(fileName: string, source: string): SitemapPuzzle {
  const defaultExport = source.slice(source.indexOf("export default"));
  const idMatch = QUOTED_PROPERTY("id").exec(defaultExport);
  const nameMatch = idMatch?.index === undefined ? undefined : QUOTED_PROPERTY("name").exec(defaultExport.slice(idMatch.index));
  const orderMatch = /^\s*catalogOrder:\s*(\d+)[ \t]*,?[ \t]*$/m.exec(defaultExport);

  if (!idMatch || !nameMatch) {
    throw new Error(`[sitemap] Could not read id and name from ${fileName}.`);
  }

  const id = parseQuotedProperty(idMatch[1], "id", fileName);
  const name = parseQuotedProperty(nameMatch[1], "name", fileName);
  const catalogOrder = orderMatch ? Number.parseInt(orderMatch[1], 10) : Number.MAX_SAFE_INTEGER;

  return {
    catalogOrder,
    id,
    name,
    path: `/play/${encodeURIComponent(id)}`,
  };
}

function parseQuotedProperty(rawValue: string, property: string, fileName: string) {
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    throw new Error(`[sitemap] Could not parse ${property} in ${fileName}.`);
  }

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`[sitemap] Expected ${property} to be a non-empty string in ${fileName}.`);
  }

  return value;
}

function comparePuzzleEntries(first: SitemapPuzzle, second: SitemapPuzzle) {
  return first.catalogOrder - second.catalogOrder || first.id.localeCompare(second.id);
}

function normalizeSiteUrl(value: string) {
  const withProtocol = /^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  const url = new URL(withProtocol);

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`[sitemap] Site URL must use http or https: ${value}`);
  }

  return url.origin;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
