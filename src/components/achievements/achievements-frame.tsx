import { Link } from "@tanstack/react-router";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import type { ReactNode } from "react";

interface AchievementsFrameProps {
  children: ReactNode;
}

export function AchievementsFrame({ children }: AchievementsFrameProps) {
  return (
    <main className="min-h-svh px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <article className="mx-auto flex max-w-3xl flex-col gap-6 sm:gap-8">
        <Link
          className="-mx-1 -mb-1 inline-flex min-h-11 w-fit items-center gap-1.5 rounded px-1 text-[10px] text-muted-foreground uppercase tracking-[0.24em] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
          to="/"
        >
          <ArrowLeft aria-hidden height={13} width={13} />
          All artworks
        </Link>
        {children}
      </article>
    </main>
  );
}
