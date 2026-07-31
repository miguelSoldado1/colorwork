import { ColorsSwatch } from "pixelarticons/react/ColorsSwatch";
import { Eye } from "pixelarticons/react/Eye";
import { EyeOff } from "pixelarticons/react/EyeOff";
import { Grid3x3 } from "pixelarticons/react/Grid3x3";
import { Hand } from "pixelarticons/react/Hand";
import { Pencil } from "pixelarticons/react/Pencil";
import { Pipette } from "pixelarticons/react/Pipette";
import { Target } from "pixelarticons/react/Target";
import { ZoomIn } from "pixelarticons/react/ZoomIn";
import { ZoomOut } from "pixelarticons/react/ZoomOut";
import { ToolButton } from "./tool-button";
import type { ColoringTool } from "@/coloring/types";

interface ToolPickerProps {
  gridVisible: boolean;
  highlightMissing: boolean;
  numbersVisible: boolean;
  onSelect: (tool: ColoringTool) => void;
  onToggleGrid: () => void;
  onToggleMissing: () => void;
  onToggleNumbers: () => void;
  selectedTool: ColoringTool;
}

// Horizontal above the board on phones, vertical beside it on desktop.
const GROUP = "flex flex-row gap-1.5 sm:flex-col";
const DIVIDER = "w-px shrink-0 self-stretch bg-border sm:h-px sm:w-full";

export function ToolPicker({
  gridVisible,
  highlightMissing,
  numbersVisible,
  onSelect,
  onToggleGrid,
  onToggleMissing,
  onToggleNumbers,
  selectedTool,
}: ToolPickerProps) {
  const gridLabel = gridVisible ? "Hide grid" : "Show grid";
  const numbersLabel = numbersVisible ? "Hide color numbers" : "Show color numbers";
  const missingLabel = highlightMissing ? "Stop highlighting missing cells" : "Highlight missing cells";

  return (
    <div aria-label="Board tools" className="flex flex-row gap-2.5 sm:flex-col" role="toolbar">
      <div className={GROUP}>
        <ToolButton label="Pencil tool" onClick={() => onSelect("pencil")} pressed={selectedTool === "pencil"}>
          <Pencil aria-hidden height={24} width={24} />
        </ToolButton>
        <ToolButton label="Bucket fill tool" onClick={() => onSelect("bucket")} pressed={selectedTool === "bucket"}>
          <ColorsSwatch aria-hidden height={24} width={24} />
        </ToolButton>
        <ToolButton label="Color picker tool" onClick={() => onSelect("picker")} pressed={selectedTool === "picker"}>
          <Pipette aria-hidden height={24} width={24} />
        </ToolButton>
      </div>

      <div aria-hidden className={DIVIDER} />

      <div className={GROUP}>
        <ToolButton label="Zoom in tool" onClick={() => onSelect("zoom-in")} pressed={selectedTool === "zoom-in"}>
          <ZoomIn aria-hidden height={24} width={24} />
        </ToolButton>
        <ToolButton label="Zoom out tool" onClick={() => onSelect("zoom-out")} pressed={selectedTool === "zoom-out"}>
          <ZoomOut aria-hidden height={24} width={24} />
        </ToolButton>
        <ToolButton label="Pan tool" onClick={() => onSelect("pan")} pressed={selectedTool === "pan"}>
          <Hand aria-hidden height={24} width={24} />
        </ToolButton>
      </div>

      <div aria-hidden className={DIVIDER} />

      <div className={GROUP}>
        <ToolButton label={gridLabel} onClick={onToggleGrid} pressed={gridVisible}>
          <Grid3x3 aria-hidden height={24} width={24} />
        </ToolButton>
        <ToolButton label={numbersLabel} onClick={onToggleNumbers} pressed={numbersVisible}>
          {numbersVisible ? <Eye aria-hidden height={24} width={24} /> : <EyeOff aria-hidden height={24} width={24} />}
        </ToolButton>
        <ToolButton label={missingLabel} onClick={onToggleMissing} pressed={highlightMissing}>
          <Target aria-hidden height={24} width={24} />
        </ToolButton>
      </div>
    </div>
  );
}
