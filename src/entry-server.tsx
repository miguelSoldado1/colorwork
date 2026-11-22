import { createMemoryHistory } from "@tanstack/react-router";
import { renderToString } from "react-dom/server";
import { App, createAppRouter } from "@/app";
import { photoToPixelArtMetadata } from "@/routes/photo-to-pixel-art";

export const prerenderedPages = [photoToPixelArtMetadata];

export async function render(path: string) {
  const router = createAppRouter(createMemoryHistory({ initialEntries: [path] }));
  await router.load();
  return renderToString(<App router={router} />);
}
