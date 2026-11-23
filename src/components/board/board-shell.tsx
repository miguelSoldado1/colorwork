import { Link } from "@tanstack/react-router";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import type { ReactNode } from "react";

export function BoardShell({ children }: { children: ReactNode }) {
  return (
    <main className="relative h-svh overflow-hidden p-3 text-foreground sm:px-5 sm:py-4">
      <div className="mx-auto grid h-full max-w-384 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 sm:gap-3.5">
        {children}
      </div>
    </main>
  );
}

export function BoardHeader({ children }: { children: ReactNode }) {
  return (
    // Stacked so the start-over confirmation opens over the board, not under it.
    <header className="relative z-10 flex min-w-0 items-end justify-between gap-3 border-border border-b px-1 pb-3 sm:gap-4 sm:pb-4">
      {children}
    </header>
  );
}

export function BoardHeading({ children }: { children: ReactNode }) {
  return (
    <div className="min-w-0 flex-1">
      <Link
        className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 py-0.5 text-[10px] text-muted-foreground uppercase tracking-[0.24em] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
        to="/"
      >
        <ArrowLeft height={13} width={13} />
        All artworks
      </Link>
      {children}
    </div>
  );
}

export function BoardTitleRow({ children }: { children: ReactNode }) {
  return <div className="mt-1 flex min-w-0 items-center gap-2">{children}</div>;
}

export function BoardTitle({ children }: { children: ReactNode }) {
  return <h1 className="min-w-0 truncate font-semibold text-xl leading-none sm:text-2xl">{children}</h1>;
}
