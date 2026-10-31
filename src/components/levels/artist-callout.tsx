import { useState } from "react";
import { trackArtistInvitation } from "@/analytics/posthog";
import Close from "@/assets/icons/close.svg?react";
import Pencil from "@/assets/icons/pencil.svg?react";

const ARTIST_CONTACT_EMAIL = "art@playcolorwork.com";

// Plain-language permission the artist confirms by sending. Not a contract.
const SUBMISSION_BODY = `Hey Colorwork,

Name to credit:
Link for the credit (portfolio, itch.io, socials):

My artwork is attached as a PNG. (Small grids with flat colors and no anti-aliasing work best.)

By sending this, I confirm that:
- I made this artwork and have the right to share it.
- I still own it. Colorwork gets non-exclusive permission to use it.
- Colorwork may turn it into a color-by-number puzzle, which can mean resizing it and reducing its colors.
- Colorwork may show it in the game and in posts or videos about the game, credited to me with a link.
- I'm sharing it for free and don't expect payment.
- Nothing is published until Colorwork confirms by email, and I can ask for it to be removed at any time.
`;

const SUBMISSION_HREF = `mailto:${ARTIST_CONTACT_EMAIL}?subject=${encodeURIComponent("Artwork for Colorwork")}&body=${encodeURIComponent(SUBMISSION_BODY)}`;

// Survives returning from a board, resets on reload.
let dismissedThisPageLoad = false;

// Sticky rather than fixed, so it settles below the footer at the end of the page instead of covering it.
export function ArtistCallout() {
  const [dismissed, setDismissed] = useState(dismissedThisPageLoad);

  function dismiss() {
    trackArtistInvitation("dismissed");
    dismissedThisPageLoad = true;
    setDismissed(true);
  }

  if (dismissed) {
    return null;
  }

  return (
    <aside
      aria-label="Invitation for pixel artists"
      className="artist-callout sticky bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 flex min-w-0 items-start gap-4 rounded-lg border border-border bg-card/95 py-3.5 pr-4 pl-4 text-card-foreground backdrop-blur-sm sm:items-center sm:gap-6 sm:pr-12 sm:pl-6 lg:bottom-6 lg:w-[calc(100%-23rem)]"
    >
      <span className="hidden size-12 shrink-0 place-items-center rounded-[3px] border border-border border-dashed text-muted-foreground sm:grid">
        <Pencil aria-hidden height={22} width={22} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col sm:contents">
        <p className="min-w-0 flex-1 text-pretty text-muted-foreground text-sm leading-snug">
          <span className="font-medium text-foreground">Pixel artist?</span> Your work could be in Colorwork, credited
          with a link back to you.
        </p>
        <a
          className="-mb-2.5 inline-flex min-h-11 shrink-0 items-center self-start rounded-sm text-foreground/80 text-xs underline decoration-border underline-offset-4 transition-colors duration-200 ease-out hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 sm:my-0 sm:self-auto"
          href={SUBMISSION_HREF}
          onClick={() => trackArtistInvitation("email_clicked")}
        >
          Email {ARTIST_CONTACT_EMAIL}
        </a>
      </div>
      <button
        aria-label="Dismiss artist invitation"
        className="group absolute right-1 bottom-0.5 grid size-11 cursor-pointer place-items-center text-muted-foreground outline-none sm:top-1/2 sm:bottom-auto sm:-translate-y-1/2"
        onClick={dismiss}
        type="button"
      >
        <span className="grid size-7 place-items-center rounded-md transition-[background-color,color,transform] duration-150 ease-out group-hover:bg-foreground/6 group-hover:text-foreground group-focus-visible:outline-2 group-focus-visible:outline-ring group-focus-visible:outline-offset-2 group-active:scale-[0.97]">
          <Close aria-hidden height={16} width={16} />
        </span>
      </button>
    </aside>
  );
}
