import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Plugin } from "vite";

const SERVER_ENTRY = "src/entry-server.tsx";
const SERVER_OUT_DIR = "dist-ssr";
const SITE_URL = "https://www.playcolorwork.com";
const SHELL_FILE = "_shell.html";
const ROOT_ELEMENT = '<div id="root"></div>';
const TITLE_ELEMENT = /<title>[^<]*<\/title>/;

interface PrerenderedPage {
  description: string;
  path: string;
  title: string;
}

interface ServerEntry {
  prerenderPages: () => Promise<(PrerenderedPage & { html: string })[]>;
}

export function renderPageHtml(template: string, page: PrerenderedPage, appHtml: string) {
  const canonicalUrl = new URL(page.path, SITE_URL).toString();
  let html = replaceOnce(template, ROOT_ELEMENT, `<div id="root">${appHtml}</div>`);
  html = replaceOnce(html, TITLE_ELEMENT, `<title>${escapeHtml(page.title)}</title>`);

  for (const [attribute, key, content] of [
    ["name", "description", page.description],
    ["property", "og:title", page.title],
    ["property", "og:description", page.description],
    ["property", "og:url", canonicalUrl],
    ["name", "twitter:title", page.title],
    ["name", "twitter:description", page.description],
  ] as const) {
    html = replaceOnce(
      html,
      new RegExp(`<meta\\b[^>]*\\b${attribute}="${key}"[^>]*>`),
      `<meta content="${escapeHtml(content)}" ${attribute}="${key}">`
    );
  }

  return replaceOnce(html, "</head>", `  <link href="${escapeHtml(canonicalUrl)}" rel="canonical">\n  </head>`);
}

export function prerenderPlugin() {
  let root = "";
  let outDir = "";

  return {
    apply: (_, { command, isPreview }) => command === "build" || Boolean(isPreview),
    buildApp: {
      async handler(builder) {
        await builder.build(builder.environments.client);
        await builder.build(builder.environments.ssr);

        const serverDir = resolve(root, SERVER_OUT_DIR);
        try {
          const entry: ServerEntry = await import(pathToFileURL(resolve(serverDir, "entry-server.js")).href);
          const template = await readFile(resolve(outDir, "index.html"), "utf8");
          await writeFile(resolve(outDir, SHELL_FILE), template);

          await Promise.all(
            (await entry.prerenderPages()).map(async (page) => {
              const file = resolve(outDir, page.path === "/" ? "index.html" : `.${page.path}.html`);
              await mkdir(dirname(file), { recursive: true });
              await writeFile(file, renderPageHtml(template, page, page.html));
            })
          );
        } finally {
          await rm(serverDir, { force: true, recursive: true });
        }
      },
      order: "post",
    },
    config: () => ({
      builder: {},
      environments: {
        ssr: {
          build: {
            outDir: SERVER_OUT_DIR,
            rollupOptions: { input: { "entry-server": SERVER_ENTRY } },
          },
        },
      },
    }),
    configResolved(config) {
      ({ root } = config);
      outDir = resolve(root, config.environments.client.build.outDir);
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const pathname = req.url?.split("?")[0] ?? "/";
        if (pathname !== "/" && !extname(pathname) && !existsSync(resolve(outDir, `.${pathname}.html`))) {
          req.url = `/${SHELL_FILE}`;
        }
        next();
      });
    },
    name: "prerender",
  } satisfies Plugin;
}

function replaceOnce(html: string, pattern: string | RegExp, replacement: string) {
  const found = typeof pattern === "string" ? html.includes(pattern) : pattern.test(html);
  if (!found) {
    throw new Error(`[prerender] Could not find ${pattern} in index.html.`);
  }
  return html.replace(pattern, () => replacement);
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
