import type { PuzzleDefinition } from "@/coloring/types";

interface ArtworkCreditProps {
  artist: PuzzleDefinition["artist"];
}

export function ArtworkCredit({ artist }: ArtworkCreditProps) {
  if (!artist) {
    return null;
  }

  return (
    <p className="truncate text-muted-foreground text-xs">
      Artwork by{" "}
      {artist.url ? (
        <a
          className="rounded-sm text-foreground/80 underline decoration-border underline-offset-3 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          href={artist.url}
          rel="noreferrer"
          target="_blank"
        >
          {artist.name}
        </a>
      ) : (
        <span className="text-foreground/80">{artist.name}</span>
      )}
    </p>
  );
}
