import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { countRenderedImageColors, getRecommendedGridSize } from "@/coloring/import-image";
import Image2Plus from "@/components/icons/image-plus.svg?react";
import { ImageImportDialog } from "@/components/import/image-import-dialog";
import { rememberImportedPuzzle } from "@/levels/imported-levels";
import type { ChangeEvent } from "react";
import type { ImageImportSource } from "@/coloring/import-image";
import type { PuzzleDefinition } from "@/coloring/types";

export function ImportArtworkRow() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<ImageImportSource | null>(null);
  const [error, setError] = useState("");

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!file) {
      return;
    }

    setError("");
    try {
      const bitmap = await createImageBitmap(file);
      const recommendedSize = getRecommendedGridSize(bitmap.width, bitmap.height);
      setSource({
        bitmap,
        detectedColorCount: countRenderedImageColors(bitmap, recommendedSize.width, recommendedSize.height),
        fileName: file.name,
        height: bitmap.height,
        width: bitmap.width,
      });
    } catch {
      setError("That image could not be opened. Try a PNG, JPG, or WebP file.");
    }
  }

  function closeImporter() {
    source?.bitmap.close();
    setSource(null);
  }

  function openPuzzle(puzzle: PuzzleDefinition) {
    rememberImportedPuzzle(puzzle);
    closeImporter();
    navigate({ params: { levelId: puzzle.id }, to: "/play/$levelId" });
  }

  return (
    <div className="border-border border-t">
      <input accept="image/*" className="sr-only" onChange={selectImage} ref={fileInputRef} type="file" />
      <button
        className="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 sm:px-6"
        onClick={() => fileInputRef.current?.click()}
        type="button"
      >
        <span className="grid size-12 shrink-0 place-items-center rounded-[3px] border border-border border-dashed text-muted-foreground">
          <Image2Plus height={22} width={22} />
        </span>
        <span className="min-w-0">
          <span className="block text-sm leading-none">Import your own</span>
          <span className="mt-1.5 block text-muted-foreground text-xs">
            Turn a PNG, JPG, or WebP into a numbered board
          </span>
        </span>
      </button>

      {error ? (
        <p className="px-4 pb-3.5 text-destructive text-xs sm:px-6" role="alert">
          {error}
        </p>
      ) : null}

      {source ? <ImageImportDialog onCancel={closeImporter} onConfirm={openPuzzle} source={source} /> : null}
    </div>
  );
}
