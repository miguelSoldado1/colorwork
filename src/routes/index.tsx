import { createFileRoute } from "@tanstack/react-router";
import { LevelsMenu } from "@/components/levels/levels-menu";

interface MenuSearch {
  artwork?: string;
}

export const Route = createFileRoute("/")({
  component: LevelsRoute,
  validateSearch: (search: Record<string, unknown>): MenuSearch =>
    typeof search.artwork === "string" ? { artwork: search.artwork } : {},
});

function LevelsRoute() {
  const { artwork } = Route.useSearch();

  return <LevelsMenu previewId={artwork} />;
}
