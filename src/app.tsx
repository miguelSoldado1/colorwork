import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { AppErrorBoundary } from "@/components/app/app-error-boundary";
import { AppErrorFallback } from "@/components/app/app-error-fallback";
import { ProgressQueryInvalidation } from "@/query/progress-query-invalidation";
import { queryClient } from "@/query/query-client";
import { routeTree } from "@/routeTree.gen";
import type { RouterHistory } from "@tanstack/react-router";

export function createAppRouter(history?: RouterHistory) {
  return createRouter({ defaultErrorComponent: AppErrorFallback, history, routeTree });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export function App({ router }: { router: ReturnType<typeof createAppRouter> }) {
  return (
    <StrictMode>
      <AppErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <ProgressQueryInvalidation />
          <RouterProvider router={router} />
        </QueryClientProvider>
      </AppErrorBoundary>
    </StrictMode>
  );
}
