import { createMemoryHistory } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { App, createAppRouter } from "@/app";
import { prerenderPages as photoPages } from "@/routes/photo-to-pixel-art";
import { prerenderPages as playPages } from "@/routes/play.$levelId";
import { prerenderPages as privacyPages } from "@/routes/privacy";

export function prerenderPages() {
  return Promise.all(
    [...photoPages, ...privacyPages, ...playPages].map(async (page) => ({ ...page, html: await render(page.path) }))
  );
}

async function render(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  await router.load();
  return renderToString(<App router={router} />);
}
