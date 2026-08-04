import { ImportArtworkRow } from "@/components/levels/import-artwork-row";
import { INDEX_CARD, IndexColumnHeader, IndexRow } from "@/components/levels/index-row";
import type { LevelDescription } from "@/levels/describe-level";

interface ImportedMenuProps {
  levels: readonly LevelDescription[];
  onSelect: (id: string) => void;
  selectedId: string | undefined;
}

export function ImportedMenu({ levels, onSelect, selectedId }: ImportedMenuProps) {
  return (
    <div className={INDEX_CARD}>
      <IndexColumnHeader counted={levels.length > 0} label="Yours" />
      {levels.length > 0 && (
        <ul aria-label="Your artwork" className="divide-y divide-border">
          {levels.map((level) => (
            <IndexRow
              key={level.puzzle.id}
              level={level}
              onSelect={onSelect}
              selected={level.puzzle.id === selectedId}
            />
          ))}
        </ul>
      )}
      <ImportArtworkRow />
    </div>
  );
}
