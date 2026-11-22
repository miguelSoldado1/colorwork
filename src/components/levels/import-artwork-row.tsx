import Image2Plus from "@/assets/icons/image-plus.svg?react";
import { useImageImport } from "@/components/import/use-image-import";

export function ImportArtworkRow() {
  const { chooseImage, dialog, error, input } = useImageImport();

  return (
    <div>
      {input}
      <button
        className="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors duration-150 ease-out hover:bg-foreground/4 focus-visible:outline-2 focus-visible:outline-ring focus-visible:-outline-offset-2 sm:px-6"
        onClick={chooseImage}
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

      {dialog}
    </div>
  );
}
