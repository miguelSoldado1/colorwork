import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArtworkPreviewPanel } from "@/components/levels/artwork-preview-panel";
import { CatalogMenu } from "@/components/levels/catalog-menu";
import { ImportedMenu } from "@/components/levels/imported-menu";
import { LevelsMenuFrame, LevelsMenuLoadError, LevelsMenuLoading } from "@/components/levels/levels-menu-frame";
import { MobileArtworkAction } from "@/components/levels/mobile-artwork-action";
import { LEVELS } from "@/levels/level-catalog";
import { artworkDescriptionsQueryOptions } from "@/query/artwork-queries";
import type { LevelDescription } from "@/levels/describe-level";

export const Route = createFileRoute("/")({ component: IndexRoute });

function IndexRoute() {
  const levelsQuery = useQuery(artworkDescriptionsQueryOptions());
  const [previewId, setPreviewId] = useState(() => LEVELS[0]?.id);

  if (levelsQuery.isPending) {
    return <LevelsMenuLoading />;
  }
  if (levelsQuery.isError) {
    return <LevelsMenuLoadError onRetry={retry} />;
  }

  const preview = levelsQuery.data.find((level) => level.puzzle.id === previewId) ?? levelsQuery.data[0];
  const catalog = levelsQuery.data.filter((level) => level.source === "catalog");
  const imported = levelsQuery.data.filter((level) => level.source === "imported");

  return (
    <LevelsMenuFrame summary={summarizeCatalog(levelsQuery.data)}>
      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-8">
        <div className="flex min-w-0 flex-col gap-6">
          <CatalogMenu levels={catalog} onSelect={setPreviewId} selectedId={preview?.puzzle.id} />
          <ImportedMenu levels={imported} onSelect={setPreviewId} selectedId={preview?.puzzle.id} />
        </div>
        {preview ? <ArtworkPreviewPanel level={preview} /> : null}
      </div>
      {preview ? <MobileArtworkAction level={preview} /> : null}
    </LevelsMenuFrame>
  );

  async function retry() {
    await levelsQuery.refetch();
  }
}

function summarizeCatalog(levels: readonly LevelDescription[]) {
  const finished = levels.filter((level) => level.finished).length;
  const started = levels.filter((level) => level.started && !level.finished).length;
  const parts = [`${levels.length} ${levels.length === 1 ? "artwork" : "artworks"}`];

  if (started > 0) {
    parts.push(`${started} started`);
  }
  if (finished > 0) {
    parts.push(`${finished} finished`);
  }
  return parts.join(" · ");
}
