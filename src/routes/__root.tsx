import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { initializeAnalytics } from "@/analytics/posthog";
import { NotFoundPage } from "@/components/app/not-found-page";
import { Toaster } from "@/components/ui/toaster";
import { useServiceWorkerUpdates } from "@/pwa/use-service-worker-updates";

function RootRoute() {
  useServiceWorkerUpdates();

  useEffect(() => {
    initializeAnalytics();
  }, []);

  return (
    <>
      <Outlet />
      <Toaster />
    </>
  );
}

export const Route = createRootRoute({
  component: RootRoute,
  notFoundComponent: NotFoundPage,
});
