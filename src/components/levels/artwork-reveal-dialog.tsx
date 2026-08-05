import { useEffect, useRef, useState } from "react";
import Close from "@/assets/icons/close.svg?react";
import { LevelPreview } from "@/components/levels/level-preview";
import { Button } from "@/components/ui/button";
import { fitCellSize } from "@/levels/render-level-preview";
import type { PuzzleDefinition } from "@/coloring/types";

interface ArtworkRevealDialogProps {
  onClose: () => void;
  puzzle: PuzzleDefinition;
}

// The mat matches the close button, so the control sits on it without ever covering the artwork.
const MAT = 48;
const VIEWPORT_MARGIN = 48;

export function ArtworkRevealDialog({ onClose, puzzle }: ArtworkRevealDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [viewport, setViewport] = useState(() => ({ height: window.innerHeight, width: window.innerWidth }));

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (!dialog.open) {
      dialog.showModal();
    }

    return () => {
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    // A native dialog reports backdrop clicks as clicks on itself.
    function closeOnBackdrop(event: MouseEvent) {
      if (event.target === dialog) {
        onClose();
      }
    }

    dialog.addEventListener("click", closeOnBackdrop);

    return () => dialog.removeEventListener("click", closeOnBackdrop);
  }, [onClose]);

  useEffect(() => {
    function trackViewport() {
      setViewport({ height: window.innerHeight, width: window.innerWidth });
    }

    window.addEventListener("resize", trackViewport);

    return () => window.removeEventListener("resize", trackViewport);
  }, []);

  // Sized from the same whole-pixel cell the preview renders at, so the artwork fills the frame edge to
  // edge. Deriving it from the raw ratio instead leaves a band wherever the render floors the cell.
  const chrome = VIEWPORT_MARGIN + MAT * 2;
  const cell = fitCellSize(puzzle, {
    height: Math.max(1, viewport.height - chrome),
    width: Math.max(1, viewport.width - chrome),
  });

  return (
    <dialog
      aria-label={`${puzzle.name}, full artwork`}
      className="dialog-surface m-auto h-fit w-fit rounded-xl border border-border bg-card p-0 shadow-[0_32px_90px_-24px_rgba(0,0,0,0.85)] backdrop:bg-background/75 backdrop:backdrop-blur-sm"
      onCancel={onClose}
      ref={dialogRef}
    >
      <div className="relative" style={{ padding: MAT }}>
        <div style={{ height: cell * puzzle.height, width: cell * puzzle.width }}>
          <LevelPreview className="h-full w-full" colored label={`${puzzle.name}, fully colored`} puzzle={puzzle} />
        </div>
        <Button
          aria-label="Close full artwork"
          autoFocus
          className="absolute top-0 right-0"
          onClick={onClose}
          size="icon"
          variant="ghost"
        >
          <Close height={22} width={22} />
        </Button>
      </div>
    </dialog>
  );
}
