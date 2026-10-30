import { createFileRoute, Link } from "@tanstack/react-router";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import { usePageMetadata } from "@/seo/use-page-metadata";

export const Route = createFileRoute("/privacy")({ component: PrivacyRoute });

const POSTHOG_PRIVACY_URL = "https://posthog.com/privacy";

function PrivacyRoute() {
  usePageMetadata({
    description: "How Colorwork stores data on your device and what it sends for product analytics.",
    path: "/privacy",
    title: "Privacy - Colorwork",
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
          <p className="mt-5 text-[10px] text-primary uppercase tracking-[0.2em]">Privacy</p>
          <h1 className="mt-1 max-w-xl font-semibold text-3xl leading-none sm:text-5xl">
            Your work stays in your browser.
          </h1>
          <p className="mt-5 max-w-2xl text-muted-foreground text-sm leading-6 sm:text-base">
            Colorwork has no user accounts. Your imported artwork and puzzle progress stay on your device.
          </p>
          <p className="mt-3 text-muted-foreground text-xs">Last updated: October 30, 2026</p>
        </header>

        <section aria-labelledby="data-boundary-heading" className="py-7 sm:py-10">
          <h2 className="sr-only" id="data-boundary-heading">
            Where your data goes
          </h2>
          <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-2">
            <DataBoundary
              detail="Artwork data, puzzle progress, and board settings"
              label="Stays on this device"
              marker="Local"
            />
            <DataBoundary
              detail="Explicit, cookieless product events for artwork and board usage"
              label="Sent to PostHog"
              marker="Network"
            />
          </div>
        </section>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Data on your device</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>
              Colorwork saves your puzzle progress and imported artwork in IndexedDB. For each saved artwork, this can
              include the name, size, palette, and converted pixel data. Colorwork does not upload the original image.
            </p>
            <p>
              Colorwork uses local storage to remember whether the grid and cell numbers are on. These settings stay on
              your device.
            </p>
          </div>
        </div>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Delete local data</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>Use "Start over" to delete the saved progress for one artwork.</p>
            <p>To remove an imported artwork from this device, delete it from the artwork menu.</p>
            <p>To remove all artwork, progress, and settings, clear the Colorwork site data in your browser.</p>
          </div>
        </div>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Product analytics</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>
              Colorwork sends these product events to PostHog: artwork opens, puzzle starts and completions, custom
              artwork imports, progress resets, achievement unlocks, and clicks on the artist invitation's email link or
              close button. Achievement events include the award ID.
            </p>
            <p>
              PostHog runs in cookieless server-hash mode. It combines the request IP address, browser details,
              hostname, and a salt to make a daily identifier. The salt changes each day. PostHog does not store the
              identifier in cookies or browser storage.
            </p>
            <p>
              For page views and page leaves, PostHog can receive the page URL and path, referring site, campaign
              parameters, browser, operating system, and device details. Colorwork has turned off person profiles,
              interaction autocapture, dead clicks, heatmaps, performance capture, session recording, surveys, and
              feature flags.
            </p>
            <p>
              Colorwork does not send imported image data, filenames, imported artwork names, pixel data, or color
              values to PostHog.
            </p>
            <p>PostHog is disabled in development and when the production configuration is missing.</p>
            <a
              className="inline-flex min-h-11 items-center text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              href={POSTHOG_PRIVACY_URL}
              rel="noreferrer"
              target="_blank"
            >
              Read the PostHog privacy information
            </a>
          </div>
        </div>

        <div className="grid gap-8 border-border border-y py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Changes</h2>
          <p className="text-muted-foreground text-sm leading-6">
            If Colorwork changes how it stores or collects data, this page and the date above will also change.
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
