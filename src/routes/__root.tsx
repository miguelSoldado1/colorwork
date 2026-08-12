import { createRootRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { initializeAnalytics } from "@/analytics/posthog";

function RootRoute() {
  useEffect(() => {
    initializeAnalytics();
  }, []);

  return <Outlet />;
}

export const Route = createRootRoute({
  component: RootRoute,
});
