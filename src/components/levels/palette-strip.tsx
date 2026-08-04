interface PaletteStripProps {
  className?: string;
  palette: readonly string[];
}

export function PaletteStrip({ className = "", palette }: PaletteStripProps) {
  return (
    <div
      aria-label={`${palette.length} colors`}
      className={`flex flex-wrap items-center gap-1 ${className}`}
      role="img"
    >
      {palette.map((color) => (
        <span
          aria-hidden
          className="size-2.5 rounded-xs ring-1 ring-foreground/15"
          key={color}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
