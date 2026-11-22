import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { evaluateImportedPuzzleAchievements } from "@/achievements/process-achievements";
import { checkAndShowAchievementUnlocks } from "@/achievements/show-achievement-toast";
import { trackCustomArtworkImported } from "@/analytics/posthog";
import {
  countRenderedImageColors,
  getRecommendedGridSize,
  IMPORT_ACCEPT,
  isSourceImageSizeSupported,
  isSupportedImageFile,
  MAX_IMPORT_FILE_BYTES,
} from "@/coloring/import-image";
import { ImageImportDialog } from "@/components/import/image-import-dialog";
import { saveImportedPuzzle } from "@/levels/imported-levels";
import { artworkQueryKeys } from "@/query/artwork-queries";
import { tryCatch } from "@/try-catch";
import type { ChangeEvent } from "react";
import type { ImageImportSource } from "@/coloring/import-image";
import type { PuzzleDefinition } from "@/coloring/types";

export function useImageImport() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState<ImageImportSource | null>(null);
  const [error, setError] = useState("");

  function chooseImage() {
    fileInputRef.current?.click();
  }

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const [file] = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (file) {
      await openImage(file);
    }
  }

  async function openImage(file: File) {
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
    const importSource = source;
    if (!importSource) {
      return setError("The image import expired. Choose the image again.");
    }

    setError("");
    const saveResult = await tryCatch(saveImportedPuzzle(puzzle));
    if (saveResult.error) {
      return setError("Your artwork could not be saved. Check browser storage and try again.");
    }

    checkAndShowAchievementUnlocks(evaluateImportedPuzzleAchievements);
    trackCustomArtworkImported({ puzzle, sourceHeight: importSource.height, sourceWidth: importSource.width });

    const filters = { queryKey: artworkQueryKeys.descriptions, refetchType: "none" as const };
    const invalidationResult = await tryCatch(queryClient.invalidateQueries(filters));
    if (invalidationResult.error) {
      return setError("Your artwork was saved, but the catalog could not be refreshed. Try opening it again.");
    }

    const navigationResult = await tryCatch(navigate({ params: { levelId: puzzle.id }, to: "/play/$levelId" }));
    if (navigationResult.error) {
      return setError("Your artwork was saved, but its board could not be opened. Try opening it from the catalog.");
    }

    importSource.bitmap.close();
  }

  const input = (
    <input
      accept={IMPORT_ACCEPT}
      aria-label="Choose an image to import"
      className="sr-only"
      onChange={selectImage}
      ref={fileInputRef}
      type="file"
    />
  );

  const dialog = source ? (
    <ImageImportDialog onCancel={closeImporter} onConfirm={openPuzzle} saveError={error} source={source} />
  ) : null;

  return { chooseImage, dialog, error, input, openImage };
}
