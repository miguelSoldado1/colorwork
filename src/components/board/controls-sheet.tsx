import { useEffect, useId, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useTooltip } from "@/components/ui/tooltip";
import { TOOL_SHORTCUTS, TOOLBAR_SHORTCUTS } from "@/keyboard/game-shortcuts";
import { useKeyboardShortcuts } from "@/keyboard/use-keyboard-shortcuts";
import type { ReactNode, ToggleEvent } from "react";

const SHORTCUT = "?";
const GAP = 8;

interface ControlsSheetProps {
  colorCount: number;
}

export function ControlsSheet({ colorCount }: ControlsSheetProps) {
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { tooltip, triggerProps } = useTooltip({ label: "Controls", shortcut: SHORTCUT });

  useKeyboardShortcuts([{ key: SHORTCUT, onTrigger: () => panelRef.current?.togglePopover() }]);

  useEffect(() => {
    function close() {
      panelRef.current?.hidePopover();
    }

    window.addEventListener("resize", close);
    return () => window.removeEventListener("resize", close);
  }, []);

  function place(event: ToggleEvent<HTMLDivElement>) {
    const trigger = buttonRef.current;
    if (!trigger || event.newState !== "open") {
      return;
    }
    const box = trigger.getBoundingClientRect();
    event.currentTarget.style.right = `${window.innerWidth - box.right}px`;
    event.currentTarget.style.bottom = `${window.innerHeight - box.top + GAP}px`;
  }

  const lastColor = Math.min(9, colorCount);

  return (
    <>
      <Button
        aria-keyshortcuts={SHORTCUT}
        aria-label="Controls"
        className="shrink-0 text-lg"
        focusTone="neutral"
        popoverTarget={panelId}
        size="icon"
        transition="press"
        variant="ghost"
        {...triggerProps}
        ref={(node) => {
          buttonRef.current = node;
          triggerProps.ref(node);
        }}
      >
        ?
      </Button>
      {tooltip}

      <div
        aria-label="Controls"
        className="popover-surface fixed inset-auto m-0 max-h-[calc(100svh-1rem)] w-max max-w-[calc(100vw-1rem)] origin-bottom-right overflow-y-auto rounded-xl border border-border bg-card p-5 text-card-foreground shadow-black/40 shadow-lg"
        id={panelId}
        onBeforeToggle={place}
        popover="auto"
        ref={panelRef}
        role="dialog"
      >
        <p className="mb-4 text-[10px] text-muted-foreground uppercase tracking-[0.24em]">Controls</p>
        <div className="grid grid-cols-[auto_auto] gap-x-10 gap-y-5">
          <div className="flex flex-col gap-5">
            <Group title="Tools">
              <Row keys={[TOOL_SHORTCUTS.pencil]} label="Pencil" />
              <Row keys={[TOOL_SHORTCUTS.bucket]} label="Bucket fill" />
              <Row keys={[TOOL_SHORTCUTS.picker]} label="Color picker" />
              <Row keys={[TOOL_SHORTCUTS["zoom-in"]]} label="Zoom in" />
              <Row keys={[TOOL_SHORTCUTS["zoom-out"]]} label="Zoom out" />
              <Row keys={[TOOL_SHORTCUTS.pan]} label="Pan" />
            </Group>
            <Group title="Colors">
              <Row keys={lastColor > 1 ? ["1", "–", String(lastColor)] : ["1"]} label="Choose a color" />
            </Group>
          </div>
          <div className="flex flex-col gap-5">
            <Group title="View">
              <Row keys={[TOOLBAR_SHORTCUTS.numbers]} label="Color numbers" />
              <Row keys={[TOOLBAR_SHORTCUTS.grid]} label="Grid" />
              <Row keys={[TOOLBAR_SHORTCUTS.missing]} label="Highlight missing cells" />
            </Group>
            <Group title="Pointer">
              <Row gesture="Middle-click" label="Pick a cell's color" />
              <Row gesture="Pinch" label="Zoom and move" />
              <Row gesture="Drag overview" label="Move around" />
            </Group>
          </div>
        </div>
      </div>
    </>
  );
}

function Group({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section>
      <h2 className="mb-2 text-muted-foreground text-xs">{title}</h2>
      <dl className="flex flex-col gap-1.5">{children}</dl>
    </section>
  );
}

interface RowProps {
  gesture?: string;
  keys?: string[];
  label: string;
}

function Row({ gesture, keys, label }: RowProps) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-6 text-sm">
      <dt>{label}</dt>
      <dd className="flex items-center gap-1">
        {gesture ? <span className="text-[11px] text-muted-foreground">{gesture}</span> : null}
        {keys?.map((key) =>
          key === "–" ? (
            <span aria-hidden className="text-muted-foreground text-xs" key="dash">
              –
            </span>
          ) : (
            <Keycap key={key}>{key}</Keycap>
          )
        )}
      </dd>
    </div>
  );
}

function Keycap({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded-[3px] border border-border bg-foreground/6 px-1.5 font-[inherit] text-[11px] text-foreground uppercase leading-none shadow-[0_2px_0_0_var(--color-border)]">
      {children}
    </kbd>
  );
}
