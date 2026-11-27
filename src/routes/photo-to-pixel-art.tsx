import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import ArrowLeft from "@/assets/icons/arrow-left.svg?react";
import ImagePlus from "@/assets/icons/image-plus.svg?react";
import { SiteFooter } from "@/components/app/site-footer";
import { useImageImport } from "@/components/import/use-image-import";
import { PaintingDemo } from "@/components/photo/painting-demo";
import { Button } from "@/components/ui/button";
import { findLevel } from "@/levels/level-catalog";
import { usePageMetadata } from "@/seo/use-page-metadata";

export const Route = createFileRoute("/photo-to-pixel-art")({ component: PhotoToPixelArtRoute });

const metadata = {
  description:
    "Turn any photo into pixel art you can color, free in your browser. Pick a grid size and colors, then paint it in. Your photo never leaves your device.",
  path: "/photo-to-pixel-art",
  title: "Turn a Photo into Pixel Art to Color - Colorwork",
};

export const prerenderPages = [metadata];

const DEMO_ARTWORK_ID = "boo";
const DEMO_DURATION_MS = 6600;

function PhotoToPixelArtRoute() {
  const { chooseImage, dialog, error, input, openImage } = useImageImport();
  const dragging = useFileDrop(openImage, dialog === null);
  const demoArtwork = findLevel(DEMO_ARTWORK_ID);
  usePageMetadata(metadata);

  return (
    <main className="min-h-svh px-4 pt-6 pb-10 text-foreground sm:px-6 sm:pt-10">
      {input}
      <div className="mx-auto flex max-w-6xl flex-col gap-12 sm:gap-16">
        <div>
          <Link
            className="-mx-1 inline-flex min-h-11 items-center gap-1.5 rounded px-1 text-[10px] text-muted-foreground uppercase tracking-[0.24em] transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
            to="/"
          >
            <ArrowLeft aria-hidden height={13} width={13} />
            All artworks
          </Link>

          <section className="mt-6 grid gap-10 sm:mt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-x-16">
            <div className="min-w-0 lg:self-end">
              <h1 className="font-semibold text-4xl leading-[1.05] sm:text-6xl lg:text-[3.25rem] xl:text-6xl">
                Turn a photo into pixel art you can color.
              </h1>
              <p className="mt-6 max-w-md text-muted-foreground text-sm leading-6 sm:text-base sm:leading-7">
                Pick a photo and Colorwork turns it into a pixel board. You paint it in one color at a time, and the
                photo never leaves your browser.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Button className="pr-6 pl-5" onClick={chooseImage} variant="primary">
                  <ImagePlus aria-hidden height={18} width={18} />
                  Choose a photo
                </Button>
                <p className="pointer-fine:block hidden text-muted-foreground text-xs">
                  or drop one anywhere on this page
                </p>
              </div>
              {error ? (
                <p className="mt-3 text-destructive text-xs" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
            {demoArtwork ? (
              <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-center">
                <PaintingDemo duration={DEMO_DURATION_MS} puzzle={demoArtwork} />
              </div>
            ) : null}
            <dl className="max-w-md divide-y divide-border self-start border-border border-y text-xs">
              <Spec label="Grid" value="Up to 65,536 cells" />
              <Spec label="Colors" value="1 to 32" />
              <Spec label="Price" value="Free, no account" />
            </dl>
          </section>
        </div>

        <section aria-labelledby="steps-heading" className="border-border border-t pt-8 sm:pt-10">
          <h2 className="font-semibold text-lg" id="steps-heading">
            How it works
          </h2>
          <ol className="mt-6 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step, index) => (
              <li className="min-w-0" key={step.title}>
                <span
                  aria-hidden
                  className="grid size-9 place-items-center border border-border bg-muted text-muted-foreground text-sm"
                >
                  {index + 1}
                </span>
                <h3 className="mt-4 font-semibold text-base">{step.title}</h3>
                <p className="mt-2 text-muted-foreground text-sm leading-6">{step.detail}</p>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="questions-heading" className="border-border border-t pt-8 sm:pt-10">
          <h2 className="font-semibold text-lg" id="questions-heading">
            Questions
          </h2>
          <dl className="mt-6 divide-y divide-border border-border border-t">
            {QUESTIONS.map((item) => (
              <div className="grid gap-2 py-5 sm:grid-cols-[16rem_minmax(0,1fr)] sm:gap-10" key={item.question}>
                <dt className="font-semibold text-sm">{item.question}</dt>
                <dd className="max-w-2xl text-muted-foreground text-sm leading-6">{item.answer}</dd>
              </div>
            ))}
          </dl>
        </section>

        <SiteFooter />
      </div>

      <div
        aria-hidden
        className="pointer-events-none fixed inset-3 z-40 grid place-items-center rounded-xl border-2 border-primary border-dashed bg-background/80 opacity-0 transition-opacity duration-150 ease-out data-[active=true]:opacity-100"
        data-active={dragging}
      >
        <p className="text-lg">Drop your photo to start</p>
      </div>

      {dialog}
    </main>
  );
}

interface SpecProps {
  label: string;
  value: string;
}

function Spec({ label, value }: SpecProps) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <dt className="text-[10px] text-muted-foreground uppercase tracking-[0.2em]">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function useFileDrop(onDrop: (file: File) => void, enabled: boolean) {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    let depth = 0;

    function carriesFiles(event: DragEvent) {
      return event.dataTransfer?.types.includes("Files") ?? false;
    }

    function enter(event: DragEvent) {
      if (!carriesFiles(event)) {
        return;
      }
      depth += 1;
      setDragging(true);
    }

    function leave(event: DragEvent) {
      if (!carriesFiles(event)) {
        return;
      }
      depth = Math.max(0, depth - 1);
      if (depth === 0) {
        setDragging(false);
      }
    }

    function over(event: DragEvent) {
      if (carriesFiles(event)) {
        event.preventDefault();
      }
    }

    function drop(event: DragEvent) {
      if (!carriesFiles(event)) {
        return;
      }
      event.preventDefault();
      depth = 0;
      setDragging(false);
      const [file] = Array.from(event.dataTransfer?.files ?? []);
      if (file) {
        onDrop(file);
      }
    }

    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
    };
  }, [enabled, onDrop]);

  return enabled && dragging;
}

const STEPS = [
  {
    detail: "PNG, JPG, or WebP up to 12 MB. Crop to the part you want to paint.",
    title: "Pick a photo",
  },
  {
    detail: "More cells keep more detail. Fewer colors keep it simple. You see the result before you start.",
    title: "Set the grid and colors",
  },
  {
    detail:
      "Pick a color and the board shows where it goes. Your progress saves as you go, and you can download the finished piece as a PNG.",
    title: "Paint it in",
  },
];

const QUESTIONS = [
  {
    answer:
      "No. The photo is converted right here in your browser and never sent anywhere. Colorwork keeps only the board it made (the grid, colors and name), and that stays on this device.",
    question: "Is my photo uploaded?",
  },
  {
    answer:
      "Into your artwork list on the home page, next to the other artworks. It's saved on this device, so you can close the tab and pick it up later. Clearing your browser data deletes it.",
    question: "Where does my board go?",
  },
  {
    answer:
      "One clear subject with strong lights and darks. Crop in close. A face that fills the frame turns out much better than someone standing across the room, and busy backgrounds mostly become noise.",
    question: "Which photos work best?",
  },
  {
    answer:
      "About 10,000 cells to start, roughly 100 × 100, so it doesn't take forever to finish. Turn the grid up for sharper faces and textures. It goes as high as 65,536 cells.",
    question: "How big is the board?",
  },
  {
    answer: "Yes. No account, nothing to install. It works in any modern browser, on a computer or a phone.",
    question: "Is it free?",
  },
];
