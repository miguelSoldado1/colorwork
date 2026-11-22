import { createFileRoute, Link } from "@tanstack/react-router";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import { usePageMetadata } from "@/seo/use-page-metadata";

export const Route = createFileRoute("/privacy")({ component: PrivacyRoute });

const POSTHOG_PRIVACY_URL = "https://posthog.com/privacy";

const metadata = {
  description: "How Colorwork stores data on your device and what it sends for product analytics.",
  path: "/privacy",
  title: "Privacy - Colorwork",
};

export const prerenderPages = [metadata];

function PrivacyRoute() {
  usePageMetadata(metadata);

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
          <p className="mt-5 text-[10px] text-primary uppercase tracking-[0.2em]">Privacy</p>
          <h1 className="mt-1 max-w-xl font-semibold text-3xl leading-none sm:text-5xl">
            Your work stays in your browser.
          </h1>
          <p className="mt-5 max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
            Colorwork has no user accounts. Your imported artwork and puzzle progress stay on your device.
          </p>
          <p className="mt-3 text-muted-foreground text-xs">Last updated: November 1, 2026</p>
        </header>

        <section aria-labelledby="data-boundary-heading" className="py-7 sm:py-10">
          <h2 className="sr-only" id="data-boundary-heading">
            Where your data goes
          </h2>
          <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-2">
            <DataBoundary
              detail="Artwork, progress, achievements, and board settings"
              label="Stays on this device"
              marker="Local"
            />
            <DataBoundary
              detail="Cookieless events about how you use Colorwork"
              label="Sent to PostHog"
              marker="Network"
            />
          </div>
        </section>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Data on your device</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>
              Your puzzle progress, imported artwork, completed puzzles, and achievements live in your browser's
              IndexedDB. An imported artwork is saved as its name, size, palette, and converted pixels. The original
              image is never uploaded.
            </p>
            <p>Local storage remembers whether the grid and cell numbers are on, and which artwork you painted last.</p>
          </div>
        </div>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Delete local data</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>Use "Start over" to delete the saved progress for one artwork.</p>
            <p>To remove an imported artwork from this device, delete it from the artwork menu.</p>
            <p>
              To remove everything, including achievements and settings, clear Colorwork's site data in your browser.
            </p>
          </div>
        </div>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Product analytics</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>
              Colorwork sends PostHog events about puzzle play, artwork imports, achievements, and the artist
              invitation. Puzzle and import events can include the grid size, palette size, and how many cells you've
              painted. Built-in artwork adds its catalog ID, imports add the source image's dimensions, and achievements
              add the award ID.
            </p>
            <p>
              PostHog runs in cookieless mode. To count visitors, it hashes your IP address, browser details, and the
              hostname with a salt that changes every day. The result works as an ID for one day and is never stored in
              cookies or browser storage.
            </p>
            <p>
              PostHog also records page views and page leaves. Those can include the page URL, the site that sent you,
              campaign parameters, and your browser, operating system, and device. Person profiles, autocapture, dead
              clicks, heatmaps, performance capture, session recording, surveys, and feature flags are all off.
            </p>
            <p>
              Your imports stay out of it. PostHog never gets their image data, filenames, names, pixels, or colors.
            </p>
            <a
              className="inline-flex min-h-11 items-center text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              href={POSTHOG_PRIVACY_URL}
              rel="noreferrer"
              target="_blank"
            >
              PostHog's privacy policy
            </a>
          </div>
        </div>

        <div className="grid gap-8 border-border border-y py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Changes</h2>
          <p className="text-muted-foreground text-sm leading-6">
            If Colorwork changes what it stores or sends, this page and its date will change too.
          </p>
        </div>
      </article>
    </main>
  );
}

interface DataBoundaryProps {
  detail: string;
  label: string;
  marker: string;
}

function DataBoundary({ detail, label, marker }: DataBoundaryProps) {
  return (
    <div className="border-border border-t p-5 first:border-t-0 last:border-r-0 sm:border-t-0 sm:border-r sm:p-6">
      <p className="text-[10px] text-primary uppercase tracking-[0.2em]">{marker}</p>
      <p className="mt-2 font-semibold text-base">{label}</p>
      <p className="mt-2 text-muted-foreground text-xs leading-5">{detail}</p>
    </div>
  );
}
