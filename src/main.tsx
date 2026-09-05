import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppErrorBoundary } from "@/components/app/app-error-boundary";
import { AppErrorFallback } from "@/components/app/app-error-fallback";
import { ProgressQueryInvalidation } from "@/query/progress-query-invalidation";
import { queryClient } from "@/query/query-client";
import { routeTree } from "@/routeTree.gen";
import "@/styles/index.css";

const router = createRouter({ defaultErrorComponent: AppErrorFallback, routeTree });

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
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ProgressQueryInvalidation />
        <RouterProvider router={router} />
      </QueryClientProvider>
    </AppErrorBoundary>
  </StrictMode>
);
