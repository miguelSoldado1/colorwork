import Bucket from "@/assets/icons/bucket.svg?react";
import Eye from "@/assets/icons/eye.svg?react";
import EyeOff from "@/assets/icons/eye-off.svg?react";
import Grid from "@/assets/icons/grid.svg?react";
import Hand from "@/assets/icons/hand.svg?react";
import Pencil from "@/assets/icons/pencil.svg?react";
import Pipette from "@/assets/icons/pipette.svg?react";
import Target from "@/assets/icons/target.svg?react";
import ZoomIn from "@/assets/icons/zoom-in.svg?react";
import ZoomOut from "@/assets/icons/zoom-out.svg?react";
import { TOOL_SHORTCUTS, TOOLBAR_SHORTCUTS } from "@/keyboard/game-shortcuts";
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
    <fieldset aria-label="Board tools" className="flex flex-row gap-2.5 sm:flex-col">
      <div className={GROUP}>
        <ToolButton
          label="Pencil tool"
          onClick={() => onSelect("pencil")}
          pressed={selectedTool === "pencil"}
          shortcut={TOOL_SHORTCUTS.pencil}
        >
          <Pencil height={24} width={24} />
        </ToolButton>
        <ToolButton
          label="Bucket fill tool"
          onClick={() => onSelect("bucket")}
          pressed={selectedTool === "bucket"}
          shortcut={TOOL_SHORTCUTS.bucket}
        >
          <Bucket height={24} width={24} />
        </ToolButton>
        <ToolButton
          label="Color picker tool"
          onClick={() => onSelect("picker")}
          pressed={selectedTool === "picker"}
          shortcut={TOOL_SHORTCUTS.picker}
        >
          <Pipette height={24} width={24} />
        </ToolButton>
      </div>

      <div aria-hidden className={DIVIDER} />

      <div className={GROUP}>
        <ToolButton
          label="Zoom in tool"
          onClick={() => onSelect("zoom-in")}
          pressed={selectedTool === "zoom-in"}
          shortcut={TOOL_SHORTCUTS["zoom-in"]}
        >
          <ZoomIn height={24} width={24} />
        </ToolButton>
        <ToolButton
          label="Zoom out tool"
          onClick={() => onSelect("zoom-out")}
          pressed={selectedTool === "zoom-out"}
          shortcut={TOOL_SHORTCUTS["zoom-out"]}
        >
          <ZoomOut height={24} width={24} />
        </ToolButton>
        <ToolButton
          label="Pan tool"
          onClick={() => onSelect("pan")}
          pressed={selectedTool === "pan"}
          shortcut={TOOL_SHORTCUTS.pan}
        >
          <Hand height={24} width={24} />
        </ToolButton>
      </div>

      <div aria-hidden className={DIVIDER} />

      <div className={GROUP}>
        <ToolButton label={gridLabel} onClick={onToggleGrid} pressed={gridVisible} shortcut={TOOLBAR_SHORTCUTS.grid}>
          <Grid height={24} width={24} />
        </ToolButton>
        <ToolButton
          label={numbersLabel}
          onClick={onToggleNumbers}
          pressed={numbersVisible}
          shortcut={TOOLBAR_SHORTCUTS.numbers}
        >
          {numbersVisible ? <Eye height={24} width={24} /> : <EyeOff height={24} width={24} />}
        </ToolButton>
        <ToolButton
          label={missingLabel}
          onClick={onToggleMissing}
          pressed={highlightMissing}
          shortcut={TOOLBAR_SHORTCUTS.missing}
        >
          <Target height={24} width={24} />
        </ToolButton>
      </div>
    </fieldset>
  );
}
