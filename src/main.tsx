import { createRoot, hydrateRoot } from "react-dom/client";
import { App, createAppRouter } from "@/app";
import "@/styles/index.css";

const router = createAppRouter();

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element was not found.");
}

if (rootElement.hasChildNodes()) {
  await router.load();
  router.ssr = { manifest: undefined };
  hydrateRoot(rootElement, <App router={router} />);
} else {
  createRoot(rootElement).render(<App router={router} />);
}
