import { Link } from "@tanstack/react-router";
import ArrowRight from "@/assets/icons/arrow-right.svg?react";

export function NotFoundPage() {
  return (
    <main className="grid min-h-svh place-items-center p-6 text-foreground">
      <title>Page not found - Colorwork</title>
      <meta content="noindex" name="robots" />
      <div className="max-w-md text-center">
        <p className="text-[10px] text-primary uppercase tracking-[0.2em]">404</p>
        <h1 className="mt-2 font-semibold text-2xl">This page doesn&apos;t exist</h1>
        <p className="mt-3 text-muted-foreground text-sm leading-6">
          The link may be mistyped, or the page may have moved. Your artworks and progress are still in this browser.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-primary bg-primary pr-3 pl-5 text-primary-foreground transition-[filter,transform] duration-200 ease-out hover:brightness-108 focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 active:translate-y-px"
          to="/"
        >
          Browse artworks
          <ArrowRight aria-hidden className="-my-1" height={24} width={24} />
        </Link>
      </div>
    </main>
  );
}
