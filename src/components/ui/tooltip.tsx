import {
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const OPEN_DELAY = 380;
// Grace after a close during which neighbours open instantly.
const GROUP_GRACE = 300;
const GAP = 14;
const EDGE = 8;

let groupOpenUntil = 0;
// Only one tooltip may be open at a time: focus can hold one open while the pointer opens another.
let activeClose: (() => void) | null = null;

interface Spot {
  left: number;
  origin: string;
  top: number;
}

interface Size {
  height: number;
  width: number;
}

interface Box extends Size {
  bottom: number;
  left: number;
  right: number;
  top: number;
}

interface TooltipOptions {
  label: string;
  shortcut?: string;
}

// Hover/focus label for icon-only controls, portalled out of the toolbar's scroll container.
export function useTooltip({ label, shortcut }: TooltipOptions) {
  const triggerRef = useRef<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef(0);
  // Mirrors `open` so closing can grant the grace window without waiting for a render.
  const openRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [instant, setInstant] = useState(false);
  const [spot, setSpot] = useState<Spot | null>(null);

  const close = useCallback(() => {
    window.clearTimeout(timerRef.current);

    if (openRef.current) {
      groupOpenUntil = Date.now() + GROUP_GRACE;
      openRef.current = false;
    }

    setOpen(false);
    setSpot(null);
  }, []);

  const reveal = useCallback(() => {
    openRef.current = true;
    setOpen(true);
  }, []);

  const show = useCallback(
    (withoutDelay: boolean) => {
      if (activeClose && activeClose !== close) {
        activeClose();
      }
      activeClose = close;

      window.clearTimeout(timerRef.current);
      const skipWait = withoutDelay || Date.now() < groupOpenUntil;
      setInstant(skipWait);

      if (skipWait) {
        reveal();
        return;
      }

      timerRef.current = window.setTimeout(reveal, OPEN_DELAY);
    },
    [close, reveal]
  );

  useEffect(
    () => () => {
      window.clearTimeout(timerRef.current);
      if (activeClose === close) {
        activeClose = null;
      }
    },
    [close]
  );

  useLayoutEffect(() => {
    const trigger = triggerRef.current;
    const tooltip = tooltipRef.current;
    if (!(open && trigger && tooltip)) {
      return;
    }

    setSpot(
      placeTooltip(trigger.getBoundingClientRect(), tooltip.getBoundingClientRect(), isStacked(trigger), {
        height: window.innerHeight,
        width: window.innerWidth,
      })
    );
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        close();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", close);
    // Capture, because the rail itself scrolls.
    window.addEventListener("scroll", close, true);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [close, open]);

  const triggerProps = {
    onBlur: close,
    onFocus: (event: FocusEvent<HTMLElement>) => {
      if (event.target.matches(":focus-visible")) {
        show(true);
      }
    },
    onPointerDown: close,
    onPointerEnter: (event: PointerEvent<HTMLElement>) => {
      if (event.pointerType !== "touch") {
        show(false);
      }
    },
    onPointerLeave: close,
    ref: (node: HTMLElement | null) => {
      triggerRef.current = node;
    },
  };

  const tooltip: ReactNode = open
    ? createPortal(
        <div
          aria-hidden
          className="pointer-events-none fixed z-50 flex scale-[0.97] items-center gap-2 whitespace-nowrap rounded-md border border-border bg-card px-2.5 py-1.5 text-foreground text-xs opacity-0 shadow-black/40 shadow-lg transition-[opacity,transform] duration-150 ease-out data-open:scale-100 data-open:opacity-100 data-instant:duration-0"
          data-instant={instant || undefined}
          data-open={spot ? true : undefined}
          ref={tooltipRef}
          role="tooltip"
          style={{
            left: spot?.left ?? 0,
            top: spot?.top ?? 0,
            transformOrigin: spot?.origin ?? "center",
            visibility: spot ? "visible" : "hidden",
          }}
        >
          {label}
          {shortcut ? (
            <kbd className="rounded border border-border/70 bg-foreground/8 px-1 pt-px font-[inherit] text-[10px] text-muted-foreground uppercase">
              {shortcut}
            </kbd>
          ) : null}
        </div>,
        document.body
      )
    : null;

  return { tooltip, triggerProps };
}

// Beside a stacked group, below a row of them — a row's neighbours would cover a side tooltip.
export function placeTooltip(trigger: Box, tip: Size, stacked: boolean, viewport: Size): Spot {
  const centerX = trigger.left + trigger.width / 2;
  const centerY = trigger.top + trigger.height / 2;

  if (stacked && trigger.right + GAP + tip.width + EDGE <= viewport.width) {
    const top = clamp(centerY - tip.height / 2, EDGE, viewport.height - tip.height - EDGE);
    return { left: trigger.right + GAP, origin: `0px ${centerY - top}px`, top };
  }

  const left = clamp(centerX - tip.width / 2, EDGE, viewport.width - tip.width - EDGE);
  const below = trigger.bottom + GAP;
  const fitsBelow = below + tip.height + EDGE <= viewport.height;

  return {
    left,
    origin: `${centerX - left}px ${fitsBelow ? 0 : tip.height}px`,
    top: fitsBelow ? below : trigger.top - GAP - tip.height,
  };
}

// The trigger's group box encodes the rail direction, so no breakpoints leak in here.
function isStacked(trigger: HTMLElement) {
  const group = trigger.parentElement?.getBoundingClientRect();
  return group ? group.height > group.width : false;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
