import { INDEX_CARD, IndexColumnHeader, IndexRow } from "@/components/levels/index-row";
import type { LevelDescription } from "@/levels/describe-level";

interface CatalogMenuProps {
  levels: readonly LevelDescription[];
  onSelect: (id: string) => void;
  selectedId: string | undefined;
}

export function CatalogMenu({ levels, onSelect, selectedId }: CatalogMenuProps) {
  return (
    <div className={INDEX_CARD}>
      <IndexColumnHeader counted label="Artwork" />

      <ul aria-label="Built-in artwork" className="divide-y divide-border">
        {levels.map((level) => (
          <IndexRow key={level.puzzle.id} level={level} onSelect={onSelect} selected={level.puzzle.id === selectedId} />
        ))}
      </ul>
    </div>
  );
}
