import { Check } from "pixelarticons/react/Check";
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

  return (
    <li>
      <Button
        aria-label={`Color ${colorIndex + 1}: ${painted} of ${total} cells painted`}
        aria-pressed={selected}
        className="group shrink-0 hover:-translate-y-0.5 aria-pressed:border-foreground/70 aria-pressed:bg-foreground/15"
        onClick={() => onSelect(colorIndex)}
        size="icon"
        variant="secondary"
      >
        <span
          className="grid size-8 place-items-center rounded-sm border border-background/25 font-bold text-background text-sm shadow-inner"
          style={{ backgroundColor: color }}
        >
          {complete ? <Check aria-hidden height={18} width={18} /> : colorIndex + 1}
        </span>
      </Button>
    </li>
  );
}
