import { createFileRoute, Link } from "@tanstack/react-router";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import { usePageMetadata } from "@/seo/use-page-metadata";

export const Route = createFileRoute("/achievements")({ component: AchievementsRoute });

function AchievementsRoute() {
  usePageMetadata({
    description: "Every achievement you have unlocked in Colorwork.",
    path: "/achievements",
    title: "Achievements - Colorwork",
  });

  return (
    <main className="min-h-svh px-4 py-6 text-foreground sm:px-6 sm:py-10">
      <article className="mx-auto max-w-3xl">
        <header className="border-border border-b pb-6 sm:pb-8">
          <Link
            className="-mx-1 inline-flex min-h-11 items-center gap-1.5 rounded px-1 text-[10px] text-muted-foreground uppercase tracking-[0.24em] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            to="/"
          >
            <ArrowLeft aria-hidden height={13} width={13} />
            All artworks
          </Link>
          <p className="mt-5 text-[10px] text-primary uppercase tracking-[0.2em]">Achievements</p>
          <h1 className="mt-1 max-w-xl font-semibold text-3xl leading-none sm:text-5xl">Nothing unlocked yet.</h1>
        </header>
        <p className="mt-8 max-w-2xl text-muted-foreground text-sm leading-6">
          A placeholder, so the toast has somewhere to point while the real page is built.
        </p>
      </article>
    </main>
  );
}
