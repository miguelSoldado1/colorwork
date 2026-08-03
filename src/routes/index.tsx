import { createFileRoute } from "@tanstack/react-router";
import { LevelsMenu } from "@/components/levels/levels-menu";

export const Route = createFileRoute("/")({ component: LevelsRoute });

function LevelsRoute() {
  return <LevelsMenu />;
}
