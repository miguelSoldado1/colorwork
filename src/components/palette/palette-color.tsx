import { readableInk } from "@/coloring/readable-ink";
import Check from "@/components/icons/check.svg?react";
import { Button } from "@/components/ui/button";

interface PaletteColorProps {
  color: string;
  colorIndex: number;
  onSelect: (colorIndex: number) => void;
  painted: number;
  selected: boolean;
  total: number;
}

export function PaletteColor({ color, colorIndex, onSelect, painted, selected, total }: PaletteColorProps) {
  const complete = total > 0 && painted === total;
  const filled = total === 0 ? 0 : (painted / total) * 100;
  const ink = readableInk(color);

  return (
    <li>
      <Button
        aria-label={`Color ${colorIndex + 1}: ${painted} of ${total} cells painted`}
        aria-pressed={selected}
        className="relative shrink-0 overflow-hidden hover:-translate-y-0.5 focus-visible:outline-offset-4 aria-pressed:ring-2 aria-pressed:ring-foreground/80 aria-pressed:ring-offset-2 aria-pressed:ring-offset-card data-[complete=true]:opacity-50"
        data-complete={complete}
        onClick={() => onSelect(colorIndex)}
        size="icon"
        style={{ backgroundColor: color, borderColor: `${ink}26`, color: ink }}
        variant="secondary"
      >
        <span className="font-bold text-base leading-none">
          {complete ? <Check className="block" height={20} width={20} /> : colorIndex + 1}
        </span>
        {/* The swatch drains as its cells are filled, so the row doubles as ambient progress. */}
        <span
          aria-hidden
          className="absolute inset-x-1.5 bottom-1.5 h-0.5 overflow-hidden rounded-full"
          style={{ backgroundColor: `${ink}2e` }}
        >
          <span
            className="block h-full rounded-full transition-[width] duration-300 ease-out"
            style={{ backgroundColor: `${ink}d9`, width: `${filled}%` }}
          />
        </span>
      </Button>
    </li>
  );
}
