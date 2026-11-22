import { Link } from "@tanstack/react-router";
import Sparkle from "@/assets/icons/sparkle.svg?react";

// Negative margin buys the 44px target without changing the footer's height.
const FOOTER_LINK =
  "-my-3.5 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-sm underline decoration-border underline-offset-4 transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2";

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-4 border-border border-t pt-4 text-muted-foreground text-xs sm:flex-row sm:items-center sm:justify-between">
      <p className="min-w-0">Your work stays on this device.</p>
      <nav aria-label="Site" className="flex flex-wrap items-center gap-x-5">
        <Link className={FOOTER_LINK} to="/photo-to-pixel-art">
          Photo to Pixel Art
        </Link>
        <Link className={FOOTER_LINK} to="/achievements">
          <Sparkle aria-hidden className="text-primary" height={12} width={12} />
          Achievements
        </Link>
        <Link className={FOOTER_LINK} to="/privacy">
          Privacy
        </Link>
      </nav>
    </footer>
  );
}
