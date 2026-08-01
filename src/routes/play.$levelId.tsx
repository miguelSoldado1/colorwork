import { createFileRoute, redirect } from "@tanstack/react-router";
import { App } from "@/app/app";
import { findImportedPuzzle } from "@/levels/imported-levels";
import { findLevel } from "@/levels/level-catalog";

export const Route = createFileRoute("/play/$levelId")({
  // An unknown artwork is a dead end, so send the player back to the menu instead of an error. An
  // imported one reloaded from a fresh tab is unknown too, since imports live only in memory.
  beforeLoad: ({ params }) => {
    if (!resolvePuzzle(params.levelId)) {
      throw redirect({ to: "/" });
    }
  },
  component: PlayRoute,
});

function PlayRoute() {
  const { levelId } = Route.useParams();
  const catalogPuzzle = findLevel(levelId);
  const puzzle = catalogPuzzle ?? findImportedPuzzle(levelId);

  if (!puzzle) {
    return null;
  }

  // Keyed so switching artworks rebuilds board state instead of inheriting the previous puzzle's.
  return <App key={puzzle.id} persistProgress={catalogPuzzle !== undefined} puzzle={puzzle} />;
}

function resolvePuzzle(levelId: string) {
  return findLevel(levelId) ?? findImportedPuzzle(levelId);
}
