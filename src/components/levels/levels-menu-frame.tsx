import { SiteFooter } from "@/components/app/site-footer";
import { ArtistCallout } from "@/components/levels/artist-callout";
import type { ReactNode } from "react";

interface LevelsMenuFrameProps {
  children: ReactNode;
  summary: string;
}

export function LevelsMenuFrame({ children, summary }: LevelsMenuFrameProps) {
  return (
    <main className="min-h-svh px-3 pt-5 pb-24 text-foreground sm:px-6 sm:pt-8 lg:pb-8">
      <div className="mx-auto flex min-w-0 max-w-384 flex-col gap-6 sm:gap-8">
        <header className="min-w-0 border-border border-b pb-4 sm:pb-6">
          <p className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">Colorwork</p>
          <h1 className="mt-1 font-semibold text-xl leading-none sm:text-2xl">Color pixel art by number</h1>
          <p className="mt-2 max-w-xl text-muted-foreground text-sm">
            A quiet place to color at your own pace. Choose an artwork or bring your own image.
          </p>
          <p className="mt-2 text-muted-foreground text-xs">
            Free, no account. Images and progress stay in this browser.
          </p>
          <p className="mt-1 text-muted-foreground text-xs">{summary}</p>
        </header>
        {children}
        <SiteFooter />
        <ArtistCallout />
      </div>
    </main>
  );
}

export function LevelsMenuLoading() {
  return (
    <LevelsMenuFrame summary="Your local artwork collection">
      <div
        className="grid min-h-48 place-items-center rounded-xl border border-border text-muted-foreground text-sm"
        role="status"
      >
        Loading artworks…
      </div>
    </LevelsMenuFrame>
  );
}

interface LevelsMenuLoadErrorProps {
  onRetry: () => void;
}

export function LevelsMenuLoadError({ onRetry }: LevelsMenuLoadErrorProps) {
  return (
    <LevelsMenuFrame summary="Your local artwork collection">
      <div className="grid min-h-48 place-items-center rounded-xl border border-border p-6 text-center" role="alert">
        <div>
          <p className="font-medium text-sm">Couldn&apos;t load your artworks</p>
          <p className="mt-1 text-muted-foreground text-xs">
            The collection stored in this browser couldn&apos;t be opened.
          </p>
          <button
            className="mt-4 min-h-11 rounded-md border border-border px-4 text-sm transition-colors hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            onClick={onRetry}
            type="button"
          >
            Try again
          </button>
        </div>
      </div>
    </LevelsMenuFrame>
  );
}
