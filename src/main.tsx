import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { Analytics } from "@vercel/analytics/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ProgressQueryInvalidation } from "@/query/progress-query-invalidation";
import { queryClient } from "@/query/query-client";
import { routeTree } from "@/routeTree.gen";
import "@/styles/index.css";

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(
  <StrictMode>
    <Analytics />
    <QueryClientProvider client={queryClient}>
      <ProgressQueryInvalidation />
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);
