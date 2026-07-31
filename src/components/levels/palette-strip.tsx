interface PaletteStripProps {
  className?: string;
  /** Per palette index: true once that color has no cells left. */
  finishedColors: readonly boolean[];
  palette: readonly string[];
}

export function PaletteStrip({ className = "", finishedColors, palette }: PaletteStripProps) {
  const completedColors = finishedColors.filter(Boolean).length;

  return (
    <ul
      aria-label={`${palette.length} colors, ${completedColors} finished`}
      className={`flex flex-wrap items-center gap-1 ${className}`}
      role="img"
    >
      {palette.map((color, colorIndex) => (
        <li
          aria-hidden
          className={`size-2.5 rounded-[2px] ring-1 ring-foreground/15 ${
            finishedColors[colorIndex] ? "opacity-40" : ""
          }`}
          key={color}
          style={{ backgroundColor: color }}
        />
      ))}
    </ul>
  );
}
