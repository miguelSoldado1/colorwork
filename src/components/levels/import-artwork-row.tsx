import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import {
  countRenderedImageColors,
  getRecommendedGridSize,
  IMPORT_ACCEPT,
  isSourceImageSizeSupported,
  isSupportedImageFile,
  MAX_IMPORT_FILE_BYTES,
} from "@/coloring/import-image";
import Image2Plus from "@/components/icons/image-plus.svg?react";
import { ImageImportDialog } from "@/components/import/image-import-dialog";
import { saveImportedPuzzle } from "@/levels/imported-levels";
import { artworkQueryKeys } from "@/query/artwork-queries";
import { tryCatch } from "@/try-catch";
import type { ChangeEvent } from "react";
import type { ImageImportSource } from "@/coloring/import-image";
import type { PuzzleDefinition } from "@/coloring/types";

export function ImportArtworkRow() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
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
    if (!isSupportedImageFile(file)) {
      return setError("Choose a PNG, JPG, or WebP image.");
    }
    if (file.size > MAX_IMPORT_FILE_BYTES) {
      return setError("Choose an image smaller than 12 MB.");
    }

    const bitmapResult = await tryCatch(createImageBitmap(file));
    if (bitmapResult.error) {
      return setError("That image could not be opened. Try a PNG, JPG, or WebP file.");
    }

    const bitmap = bitmapResult.data;
    if (!isSourceImageSizeSupported(bitmap.width, bitmap.height)) {
      bitmap.close();
      return setError("That image is too large to process. Choose one under 25 megapixels.");
    }

    try {
      const recommendedSize = getRecommendedGridSize(bitmap.width, bitmap.height);
      const detectedColorCount = countRenderedImageColors(bitmap, recommendedSize.width, recommendedSize.height);

      source?.bitmap.close();
      setSource({
        bitmap,
        detectedColorCount,
        fileName: file.name,
        height: bitmap.height,
        width: bitmap.width,
      });
    } catch {
      bitmap.close();
      setError("That image could not be processed. Try a smaller PNG, JPG, or WebP file.");
    }
  }

  function closeImporter() {
    source?.bitmap.close();
    setSource(null);
  }

  async function openPuzzle(puzzle: PuzzleDefinition) {
    setError("");
    const saveResult = await tryCatch(saveImportedPuzzle(puzzle));
    if (saveResult.error) {
      return setError("Your artwork could not be saved. Check browser storage and try again.");
    }

    const filters = { queryKey: artworkQueryKeys.descriptions, refetchType: "none" as const };
    const invalidationResult = await tryCatch(queryClient.invalidateQueries(filters));
    if (invalidationResult.error) {
      return setError("Your artwork was saved, but the catalog could not be refreshed. Try opening it again.");
    }

    const navigationResult = await tryCatch(navigate({ params: { levelId: puzzle.id }, to: "/play/$levelId" }));
    if (navigationResult.error) {
      return setError("Your artwork was saved, but its board could not be opened. Try opening it from the catalog.");
    }

    source?.bitmap.close();
  }

  return (
    <div>
      <input
        accept={IMPORT_ACCEPT}
        aria-label="Choose an image to import"
        className="sr-only"
        onChange={selectImage}
        ref={fileInputRef}
        type="file"
      />
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

      {source ? (
        <ImageImportDialog onCancel={closeImporter} onConfirm={openPuzzle} saveError={error} source={source} />
      ) : null}
    </div>
  );
}
