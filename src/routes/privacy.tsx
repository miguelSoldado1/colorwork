import { createFileRoute, Link } from "@tanstack/react-router";
import ArrowLeft from "@/components/icons/arrow-left.svg?react";
import { usePageMetadata } from "@/seo/use-page-metadata";

export const Route = createFileRoute("/privacy")({ component: PrivacyRoute });

const VERCEL_PRIVACY_URL = "https://vercel.com/docs/analytics/privacy-policy";

function PrivacyRoute() {
  usePageMetadata({
    description: "Learn what Colorwork stores on your device and what anonymous page-view data it collects.",
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
            Colorwork has no user accounts. It does not upload your imported artwork or puzzle progress to a Colorwork
            server.
          </p>
          <p className="mt-3 text-muted-foreground text-xs">Last updated: August 5, 2026</p>
        </header>

        <section aria-labelledby="data-boundary-heading" className="py-7 sm:py-10">
          <h2 className="sr-only" id="data-boundary-heading">
            Where your data goes
          </h2>
          <div className="grid overflow-hidden rounded-xl border border-border sm:grid-cols-2">
            <DataBoundary
              detail="Artwork data, puzzle progress, and board preferences"
              label="Stays on this device"
              marker="Local"
            />
            <DataBoundary
              detail="Anonymous page-view data for site analytics"
              label="Sent to Vercel"
              marker="Network"
            />
          </div>
        </section>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Data on your device</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>
              Colorwork uses IndexedDB to save your puzzle progress and imported artwork. Saved artwork data can include
              its name, size, palette, and converted pixel data. The original image file is not uploaded.
            </p>
            <p>
              Colorwork uses local storage to remember if you show the grid and cell numbers. This storage is necessary
              to save the choices that you make in the app.
            </p>
          </div>
        </div>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Delete local data</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>Use “Start over” to delete the saved progress for one artwork.</p>
            <p>Delete an imported artwork from the artwork menu to remove that artwork from this device.</p>
            <p>Clear the site data for Colorwork in your browser to remove all artwork, progress, and preferences.</p>
          </div>
        </div>

        <div className="grid gap-8 border-border border-t py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Page-view analytics</h2>
          <div className="space-y-5 text-muted-foreground text-sm leading-6">
            <p>
              Colorwork uses Vercel Web Analytics. Vercel can receive the page path, referring site, approximate
              location, browser, operating system, and device type.
            </p>
            <p>
              Vercel Web Analytics does not use cookies. It creates a daily identifier from the web request and uses the
              data for aggregated statistics. It does not use the identifier to follow you across websites.
            </p>
            <p>Colorwork does not send imported artwork or puzzle progress to Vercel Web Analytics.</p>
            <a
              className="inline-flex min-h-11 items-center text-foreground underline decoration-border underline-offset-4 transition-colors hover:text-primary focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
              href={VERCEL_PRIVACY_URL}
              rel="noreferrer"
              target="_blank"
            >
              Read the Vercel privacy information
            </a>
          </div>
        </div>

        <div className="grid gap-8 border-border border-y py-8 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-12 sm:py-10">
          <h2 className="font-semibold text-lg">Changes</h2>
          <p className="text-muted-foreground text-sm leading-6">
            This page will change if Colorwork changes how it stores or collects data. The date at the top will show
            when this notice was last changed.
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
    <div className="border-border p-5 first:border-b sm:p-6 sm:first:border-r sm:first:border-b-0">
      <p className="text-[10px] text-primary uppercase tracking-[0.2em]">{marker}</p>
      <p className="mt-2 font-semibold text-base">{label}</p>
      <p className="mt-2 text-muted-foreground text-xs leading-5">{detail}</p>
    </div>
  );
}
