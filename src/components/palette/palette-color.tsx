import { Check } from "pixelarticons/react/Check";

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
      <button
        aria-label={`Color ${colorIndex + 1}: ${painted} of ${total} cells painted`}
        aria-pressed={selected}
        className="group grid size-12 shrink-0 place-items-center rounded-xl border border-ink/10 bg-ink/5 transition-[transform,border-color,background-color] hover:-translate-y-0.5 hover:bg-ink/10 focus-visible:outline-3 focus-visible:outline-violet focus-visible:outline-offset-2 aria-pressed:border-ink/70 aria-pressed:bg-ink/15"
        onClick={() => onSelect(colorIndex)}
        type="button"
      >
        <span
          className="grid size-8 place-items-center rounded-lg border border-paper/25 font-bold text-paper text-sm shadow-inner"
          style={{ backgroundColor: color }}
        >
          {complete ? <Check aria-hidden height={18} width={18} /> : colorIndex + 1}
        </span>
      </button>
    </li>
  );
}
