import { createNumberGlyphAtlas, numberGlyphScale } from "./number-glyphs";
import { getCanvasContext, mutedTargetGray, parseHexColor, writePaintedPixel } from "./pixel-raster";
import { countTargetPixelsByColor, createProgressSummary, UNPAINTED_PIXEL } from "./progress";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "./types";

interface CreateColoringBoardOptions {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  gridVisible: boolean;
  highlightMissing: boolean;
  numbersVisible: boolean;
  onProgress: (summary: ProgressSummary) => void;
  onSelectColor: (colorIndex: number) => void;
  overviewCanvas: HTMLCanvasElement;
  progress: PuzzleProgress;
  puzzle: PuzzleDefinition;
  selectedColor: number;
  tool: ColoringTool;
}

interface Cell {
  x: number;
  y: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

interface PinchGesture {
  center: PointerPosition;
  distance: number;
}

interface PendingTouch {
  cell: Cell | undefined;
  start: PointerPosition;
}

const COLOR_ADVANCE_DELAY = 250;
const MAX_ZOOM = 32;
const MIN_ZOOM = 1;
const TOUCH_PAINT_THRESHOLD = 6;
const ZOOM_STEP = 1.8;
const CELL_EDGE_EPSILON = 0.000_001;

const TARGET_GUIDE_MAX_ALPHA = 0.42;
const SELECTION_ALPHA = 0.3;

export function createColoringBoard({
  canvas,
  container,
  gridVisible: initialGridVisible,
  highlightMissing: initialHighlightMissing,
  numbersVisible: initialNumbersVisible,
  overviewCanvas,
  puzzle,
  progress,
  onProgress,
  onSelectColor,
  selectedColor: initialSelectedColor,
  tool: initialTool,
}: CreateColoringBoardOptions) {
  const context = getCanvasContext(canvas, { alpha: false });
  const overviewContext = getCanvasContext(overviewCanvas, { alpha: false });
  const theme = getColoringTheme(canvas);
  const foregroundRgba = resolveCssColor(theme.foreground);
  const primaryRgba = resolveCssColor(theme.primary);
  const translucentForeground = withAlpha(foregroundRgba, 0.12);
  const numberGlyphAtlas = createNumberGlyphAtlas(puzzle.palette.length, {
    selected: theme.foreground,
    unselected: theme.mutedForeground,
  });
  const maximumNumberSpriteWidth = Math.max(...numberGlyphAtlas.sprites.map((sprite) => sprite.width));

  // Puzzle-sized bitmap layers keep per-pixel work out of the main display canvas.
  const totalByColor = countTargetPixelsByColor(puzzle);
  const paintedLayer = document.createElement("canvas");
  paintedLayer.width = puzzle.width;
  paintedLayer.height = puzzle.height;
  const paintedContext = getCanvasContext(paintedLayer);
  const paintedImage = paintedContext.createImageData(puzzle.width, puzzle.height);
  const paletteRgba = puzzle.palette.map(parseHexColor);
  const targetLayer = document.createElement("canvas");
  targetLayer.width = puzzle.width;
  targetLayer.height = puzzle.height;
  const targetContext = getCanvasContext(targetLayer);
  const targetImage = targetContext.createImageData(puzzle.width, puzzle.height);
  const selectionLayer = document.createElement("canvas");
  selectionLayer.width = puzzle.width;
  selectionLayer.height = puzzle.height;
  const selectionContext = getCanvasContext(selectionLayer);
  const selectionImage = selectionContext.createImageData(puzzle.width, puzzle.height);
  const missingLayer = document.createElement("canvas");
  missingLayer.width = puzzle.width;
  missingLayer.height = puzzle.height;
  const missingContext = getCanvasContext(missingLayer);
  const missingImage = missingContext.createImageData(puzzle.width, puzzle.height);

  // Build the static grayscale target shared by the minimap and the board's faint guide, then
  // restore any existing painted pixels.
  for (let index = 0; index < puzzle.targetPixels.length; index += 1) {
    const gray = mutedTargetGray(paletteRgba[puzzle.targetPixels[index]]);
    writePaintedPixel(targetImage.data, index, [gray, gray, gray, 255]);
  }
  targetContext.putImageData(targetImage, 0, 0);

  for (let index = 0; index < progress.paintedPixels.length; index += 1) {
    const colorIndex = progress.paintedPixels[index];
    if (colorIndex === UNPAINTED_PIXEL) {
      continue;
    }
    writePaintedPixel(paintedImage.data, index, paletteRgba[colorIndex]);
  }
  paintedContext.putImageData(paintedImage, 0, 0);

  // Mutable interaction state stays inside this controller rather than React.
  let selectedColor = initialSelectedColor;
  let selectedTool = initialTool;
  let geometry = {
    cellSize: 1,
    height: puzzle.height,
    width: puzzle.width,
    x: 0,
    y: 0,
  };
  let cameraX = puzzle.width / 2;
  let cameraY = puzzle.height / 2;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let availableViewportWidth = 1;
  let availableViewportHeight = 1;
  let fitScale = 1;
  let zoom = 1;
  let showGrid = initialGridVisible;
  let showNumbers = initialNumbersVisible;
  let highlightMissing = initialHighlightMissing;
  let cameraIsSettled = true;
  let frameId: number | undefined;
  let progressFrameId: number | undefined;
  let colorAdvanceTimer: ReturnType<typeof setTimeout> | undefined;
  let activePointerId: number | undefined;
  let activeOverviewPointerId: number | undefined;
  const activeTouchPointers = new Map<number, PointerPosition>();
  let pendingTouch: PendingTouch | undefined;
  let pinchGesture: PinchGesture | undefined;
  let touchGestureWasPinch = false;
  let keyboardCell: Cell | undefined;
  let keyboardFocused = false;
  let previousCell: Cell | undefined;
  let previousPointerPosition: PointerPosition | undefined;
  let destroyed = false;

  function rebuildSelectionLayer() {
    selectionImage.data.fill(0);
    missingImage.data.fill(0);
    for (let index = 0; index < puzzle.targetPixels.length; index += 1) {
      if (progress.paintedPixels[index] !== UNPAINTED_PIXEL) {
        continue;
      }
      if (puzzle.targetPixels[index] === selectedColor) {
        writePaintedPixel(selectionImage.data, index, foregroundRgba);
        writePaintedPixel(missingImage.data, index, primaryRgba);
      } else {
        writePaintedPixel(missingImage.data, index, foregroundRgba);
      }
    }
    selectionContext.putImageData(selectionImage, 0, 0);
    missingContext.putImageData(missingImage, 0, 0);
  }

  // Camera and viewport geometry.
  function resize() {
    const bounds = container.getBoundingClientRect();
    availableViewportWidth = Math.max(1, bounds.width);
    availableViewportHeight = Math.max(1, bounds.height);
    fitScale = Math.min(availableViewportWidth / puzzle.width, availableViewportHeight / puzzle.height);
    resizeCanvasViewport();
    updateGeometry();
    if (cameraIsSettled) {
      snapCameraToGrid();
    }

    scheduleRender();
  }

  function resizeCanvasViewport() {
    const cellSize = fitScale * zoom;
    const zoomedViewportWidth = Math.min(availableViewportWidth, puzzle.width * cellSize);
    const zoomedViewportHeight = Math.min(availableViewportHeight, puzzle.height * cellSize);
    viewportWidth = Math.max(cellSize, Math.floor(zoomedViewportWidth / cellSize + CELL_EDGE_EPSILON) * cellSize);
    viewportHeight = Math.max(cellSize, Math.floor(zoomedViewportHeight / cellSize + CELL_EDGE_EPSILON) * cellSize);
    canvas.style.width = `${viewportWidth}px`;
    canvas.style.height = `${viewportHeight}px`;

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const displayWidth = Math.max(1, Math.round(viewportWidth * dpr));
    const displayHeight = Math.max(1, Math.round(viewportHeight * dpr));

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }
  }

  function updateGeometry() {
    const cellSize = fitScale * zoom;
    const halfVisibleWidth = viewportWidth / cellSize / 2;
    const halfVisibleHeight = viewportHeight / cellSize / 2;

    cameraX =
      halfVisibleWidth >= puzzle.width / 2
        ? puzzle.width / 2
        : Math.min(puzzle.width - halfVisibleWidth, Math.max(halfVisibleWidth, cameraX));
    cameraY =
      halfVisibleHeight >= puzzle.height / 2
        ? puzzle.height / 2
        : Math.min(puzzle.height - halfVisibleHeight, Math.max(halfVisibleHeight, cameraY));

    geometry = {
      cellSize,
      height: cellSize * puzzle.height,
      width: cellSize * puzzle.width,
      x: viewportWidth / 2 - cameraX * cellSize,
      y: viewportHeight / 2 - cameraY * cellSize,
    };
  }

  function snapCameraToGrid() {
    const { cellSize, height, width, x, y } = geometry;

    if (width > viewportWidth) {
      const snappedX = Math.round(x / cellSize) * cellSize;
      cameraX = (viewportWidth / 2 - snappedX) / cellSize;
    }
    if (height > viewportHeight) {
      const snappedY = Math.round(y / cellSize) * cellSize;
      cameraY = (viewportHeight / 2 - snappedY) / cellSize;
    }

    updateGeometry();
  }

  function zoomAt(factor: number, screenX = viewportWidth / 2, screenY = viewportHeight / 2) {
    const worldX = (screenX - geometry.x) / geometry.cellSize;
    const worldY = (screenY - geometry.y) / geometry.cellSize;
    const previousViewportWidth = viewportWidth;
    const previousViewportHeight = viewportHeight;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (nextZoom === zoom) {
      return;
    }

    zoom = nextZoom;
    resizeCanvasViewport();
    const resizedScreenX = screenX + (viewportWidth - previousViewportWidth) / 2;
    const resizedScreenY = screenY + (viewportHeight - previousViewportHeight) / 2;
    const nextCellSize = fitScale * zoom;
    cameraX = worldX - (resizedScreenX - viewportWidth / 2) / nextCellSize;
    cameraY = worldY - (resizedScreenY - viewportHeight / 2) / nextCellSize;
    updateGeometry();
    snapCameraToGrid();
    cameraIsSettled = true;
    scheduleRender();
  }

  function getPinchGesture() {
    const [first, second] = [...activeTouchPointers.values()];
    if (!(first && second)) {
      return;
    }

    return {
      center: {
        x: (first.x + second.x) / 2,
        y: (first.y + second.y) / 2,
      },
      distance: Math.hypot(second.x - first.x, second.y - first.y),
    };
  }

  function updatePinch(nextGesture: PinchGesture) {
    if (!pinchGesture) {
      pinchGesture = nextGesture;
      return;
    }

    const bounds = canvas.getBoundingClientRect();
    const previousScreenX = pinchGesture.center.x - bounds.left;
    const previousScreenY = pinchGesture.center.y - bounds.top;
    const worldX = (previousScreenX - geometry.x) / geometry.cellSize;
    const worldY = (previousScreenY - geometry.y) / geometry.cellSize;
    const factor = pinchGesture.distance > 0 ? nextGesture.distance / pinchGesture.distance : 1;

    zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    resizeCanvasViewport();

    const resizedBounds = canvas.getBoundingClientRect();
    const nextScreenX = nextGesture.center.x - resizedBounds.left;
    const nextScreenY = nextGesture.center.y - resizedBounds.top;
    const nextCellSize = fitScale * zoom;
    cameraX = worldX - (nextScreenX - viewportWidth / 2) / nextCellSize;
    cameraY = worldY - (nextScreenY - viewportHeight / 2) / nextCellSize;
    updateGeometry();
    pinchGesture = nextGesture;
    scheduleRender();
  }

  // Coalesce drawing and summarized progress updates to animation frames.
  function scheduleRender() {
    if (frameId !== undefined || destroyed) {
      return;
    }
    frameId = requestAnimationFrame(render);
  }

  function scheduleProgress() {
    if (progressFrameId !== undefined || destroyed) {
      return;
    }
    progressFrameId = requestAnimationFrame(() => {
      progressFrameId = undefined;
      onProgress(createProgressSummary(puzzle, progress, totalByColor));
    });
  }

  // Main board and minimap rendering.
  function render() {
    frameId = undefined;
    const bounds = canvas.getBoundingClientRect();
    const dpr = canvas.width / Math.max(1, bounds.width);
    const { height, width, x, y } = geometry;

    context.setTransform(dpr, 0, 0, dpr, 0, 0);
    context.imageSmoothingEnabled = false;

    context.fillStyle = theme.canvas;
    context.fillRect(0, 0, bounds.width, bounds.height);

    const visibleCells = getVisibleCells();
    const visibleBoard = getVisibleBoardBounds(visibleCells);
    context.fillStyle = theme.muted;
    context.fillRect(visibleBoard.x, visibleBoard.y, visibleBoard.width, visibleBoard.height);
    if (highlightMissing) {
      context.globalAlpha = 0.38;
      drawVisibleLayer(paintedLayer);
      context.globalAlpha = 1;
      drawVisibleLayer(missingLayer);
      drawGrid();
    } else {
      // Guide under the wash, so the shape survives inside the selected color.
      context.globalAlpha = TARGET_GUIDE_MAX_ALPHA * unpaintedFraction();
      drawVisibleLayer(targetLayer);
      context.globalAlpha = SELECTION_ALPHA;
      drawVisibleLayer(selectionLayer);
      context.globalAlpha = 1;
      drawGrid();
      drawVisibleLayer(paintedLayer);
    }

    drawNumbers();
    drawKeyboardCursor();

    context.strokeStyle = theme.canvasEdge;
    context.lineWidth = 2;
    context.strokeRect(x - 1, y - 1, width + 2, height + 2);
    canvas.dataset.zoom = zoom.toFixed(2);
    renderOverview();
  }

  function renderOverview() {
    const bounds = overviewCanvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const displayWidth = Math.max(1, Math.round(bounds.width * dpr));
    const displayHeight = Math.max(1, Math.round(bounds.height * dpr));
    if (overviewCanvas.width !== displayWidth || overviewCanvas.height !== displayHeight) {
      overviewCanvas.width = displayWidth;
      overviewCanvas.height = displayHeight;
    }

    overviewContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    overviewContext.imageSmoothingEnabled = false;
    overviewContext.fillStyle = theme.muted;
    overviewContext.fillRect(0, 0, bounds.width, bounds.height);
    if (highlightMissing) {
      overviewContext.globalAlpha = 0.16;
      overviewContext.drawImage(targetLayer, 0, 0, bounds.width, bounds.height);
      overviewContext.globalAlpha = 0.38;
      overviewContext.drawImage(paintedLayer, 0, 0, bounds.width, bounds.height);
      overviewContext.globalAlpha = 1;
      overviewContext.drawImage(missingLayer, 0, 0, bounds.width, bounds.height);
    } else {
      overviewContext.globalAlpha = 1;
      overviewContext.drawImage(targetLayer, 0, 0, bounds.width, bounds.height);
      overviewContext.drawImage(paintedLayer, 0, 0, bounds.width, bounds.height);
    }

    const visibleCells = getVisibleCells();
    const worldLeft = cameraIsSettled ? visibleCells.startX : Math.max(0, -geometry.x / geometry.cellSize);
    const worldTop = cameraIsSettled ? visibleCells.startY : Math.max(0, -geometry.y / geometry.cellSize);
    const worldRight = cameraIsSettled
      ? visibleCells.endX
      : Math.min(puzzle.width, (viewportWidth - geometry.x) / geometry.cellSize);
    const worldBottom = cameraIsSettled
      ? visibleCells.endY
      : Math.min(puzzle.height, (viewportHeight - geometry.y) / geometry.cellSize);
    const viewportX = (worldLeft / puzzle.width) * bounds.width;
    const viewportY = (worldTop / puzzle.height) * bounds.height;
    const visibleWidth = ((worldRight - worldLeft) / puzzle.width) * bounds.width;
    const visibleHeight = ((worldBottom - worldTop) / puzzle.height) * bounds.height;

    // The viewport marker sits on top of the artwork, so it stays neutral: a dark stroke under a
    // light one reads against any puzzle, where a single accent hue would vanish into a matching image.
    overviewContext.fillStyle = translucentForeground;
    overviewContext.fillRect(viewportX, viewportY, visibleWidth, visibleHeight);

    const outlineInset = Math.min(2, visibleWidth / 2, visibleHeight / 2);
    const outlineWidth = Math.max(0, visibleWidth - outlineInset * 2);
    const outlineHeight = Math.max(0, visibleHeight - outlineInset * 2);
    overviewContext.strokeStyle = theme.canvas;
    overviewContext.lineWidth = 4;
    overviewContext.strokeRect(viewportX + outlineInset, viewportY + outlineInset, outlineWidth, outlineHeight);
    overviewContext.strokeStyle = theme.foreground;
    overviewContext.lineWidth = 2;
    overviewContext.strokeRect(viewportX + outlineInset, viewportY + outlineInset, outlineWidth, outlineHeight);
  }

  function getVisibleCells() {
    const { cellSize, x, y } = geometry;
    const visibleRight = (viewportWidth - x) / cellSize;
    const visibleBottom = (viewportHeight - y) / cellSize;
    return {
      endX: Math.min(
        puzzle.width,
        cameraIsSettled ? Math.floor(visibleRight + CELL_EDGE_EPSILON) : Math.ceil(visibleRight - CELL_EDGE_EPSILON)
      ),
      endY: Math.min(
        puzzle.height,
        cameraIsSettled ? Math.floor(visibleBottom + CELL_EDGE_EPSILON) : Math.ceil(visibleBottom - CELL_EDGE_EPSILON)
      ),
      startX: Math.max(
        0,
        cameraIsSettled ? Math.ceil(-x / cellSize - CELL_EDGE_EPSILON) : Math.floor(-x / cellSize + CELL_EDGE_EPSILON)
      ),
      startY: Math.max(
        0,
        cameraIsSettled ? Math.ceil(-y / cellSize - CELL_EDGE_EPSILON) : Math.floor(-y / cellSize + CELL_EDGE_EPSILON)
      ),
    };
  }

  function getVisibleBoardBounds({ endX, endY, startX, startY }: ReturnType<typeof getVisibleCells>) {
    return {
      height: (endY - startY) * geometry.cellSize,
      width: (endX - startX) * geometry.cellSize,
      x: geometry.x + startX * geometry.cellSize,
      y: geometry.y + startY * geometry.cellSize,
    };
  }

  function unpaintedFraction() {
    const total = puzzle.targetPixels.length;
    if (total === 0) {
      return 0;
    }
    return 1 - progress.paintedCount / total;
  }

  function drawVisibleLayer(layer: HTMLCanvasElement) {
    const { endX, endY, startX, startY } = getVisibleCells();
    const sourceWidth = endX - startX;
    const sourceHeight = endY - startY;
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      return;
    }

    context.drawImage(
      layer,
      startX,
      startY,
      sourceWidth,
      sourceHeight,
      geometry.x + startX * geometry.cellSize,
      geometry.y + startY * geometry.cellSize,
      sourceWidth * geometry.cellSize,
      sourceHeight * geometry.cellSize
    );
  }

  function drawNumbers() {
    const { cellSize, x, y } = geometry;
    if (!showNumbers) {
      return;
    }

    const { endX, endY, startX, startY } = getVisibleCells();
    const scale = numberGlyphScale(cellSize, maximumNumberSpriteWidth, numberGlyphAtlas.sprites[0].height);
    for (let row = startY; row < endY; row += 1) {
      for (let column = startX; column < endX; column += 1) {
        const index = row * puzzle.width + column;
        if (progress.paintedPixels[index] !== UNPAINTED_PIXEL) {
          continue;
        }
        const targetColor = puzzle.targetPixels[index];
        const sprite = numberGlyphAtlas.sprites[targetColor];
        const width = sprite.width * scale;
        const height = sprite.height * scale;
        context.drawImage(
          numberGlyphAtlas.canvas,
          sprite.x,
          targetColor === selectedColor ? sprite.selectedY : sprite.unselectedY,
          sprite.width,
          sprite.height,
          Math.round(x + (column + 0.5) * cellSize - width / 2),
          Math.round(y + (row + 0.5) * cellSize - height / 2),
          width,
          height
        );
      }
    }
  }

  function drawKeyboardCursor() {
    if (!(keyboardFocused && keyboardCell)) {
      return;
    }

    const inset = Math.min(2, geometry.cellSize / 5);
    const left = geometry.x + keyboardCell.x * geometry.cellSize + inset;
    const top = geometry.y + keyboardCell.y * geometry.cellSize + inset;
    const size = Math.max(0, geometry.cellSize - inset * 2);
    context.strokeStyle = theme.primary;
    context.lineWidth = 2;
    context.strokeRect(Math.floor(left) + 0.5, Math.floor(top) + 0.5, Math.floor(size), Math.floor(size));
  }

  function drawGrid() {
    if (!showGrid) {
      return;
    }

    const { cellSize, x, y } = geometry;
    context.beginPath();
    context.strokeStyle = translucentForeground;
    context.lineWidth = 1;
    const visibleCells = getVisibleCells();
    const { endX, endY, startX, startY } = visibleCells;
    const visibleBoard = getVisibleBoardBounds(visibleCells);
    for (let column = startX; column <= endX; column += 1) {
      const lineX = x + column * cellSize + 0.5;
      context.moveTo(lineX, visibleBoard.y);
      context.lineTo(lineX, visibleBoard.y + visibleBoard.height);
    }
    for (let row = startY; row <= endY; row += 1) {
      const lineY = y + row * cellSize + 0.5;
      context.moveTo(visibleBoard.x, lineY);
      context.lineTo(visibleBoard.x + visibleBoard.width, lineY);
    }
    context.stroke();
  }

  // Grid conversion and painting operations.
  function cancelColorAdvance() {
    clearTimeout(colorAdvanceTimer);
    colorAdvanceTimer = undefined;
  }

  function selectNextUnfinishedColor() {
    if (
      progress.paintedByColor[selectedColor] !== totalByColor[selectedColor] ||
      progress.paintedCount === puzzle.targetPixels.length
    ) {
      return;
    }

    for (let offset = 1; offset < puzzle.palette.length; offset += 1) {
      const colorIndex = (selectedColor + offset) % puzzle.palette.length;
      if (progress.paintedByColor[colorIndex] < totalByColor[colorIndex]) {
        colorAdvanceTimer = setTimeout(() => {
          colorAdvanceTimer = undefined;
          selectedColor = colorIndex;
          rebuildSelectionLayer();
          scheduleRender();
          onSelectColor(colorIndex);
        }, COLOR_ADVANCE_DELAY);
        return;
      }
    }
  }

  function eventToCell(event: PointerEvent) {
    const bounds = canvas.getBoundingClientRect();
    const canvasX = event.clientX - bounds.left;
    const canvasY = event.clientY - bounds.top;
    if (canvasX < 0 || canvasX >= bounds.width || canvasY < 0 || canvasY >= bounds.height) {
      return;
    }

    const localX = canvasX - geometry.x;
    const localY = canvasY - geometry.y;
    const x = Math.floor(localX / geometry.cellSize);
    const y = Math.floor(localY / geometry.cellSize);

    if (x < 0 || x >= puzzle.width || y < 0 || y >= puzzle.height) {
      return;
    }
    if (cameraIsSettled) {
      const { endX, endY, startX, startY } = getVisibleCells();
      if (x < startX || x >= endX || y < startY || y >= endY) {
        return;
      }
    }

    return { x, y };
  }

  function paintCell(cell: Cell) {
    const index = cell.y * puzzle.width + cell.x;
    if (puzzle.targetPixels[index] !== selectedColor || progress.paintedPixels[index] !== UNPAINTED_PIXEL) {
      return;
    }

    progress.paintedPixels[index] = selectedColor;
    progress.paintedCount += 1;
    progress.paintedByColor[selectedColor] += 1;
    writePaintedPixel(paintedImage.data, index, paletteRgba[selectedColor]);
    clearPixel(selectionImage.data, index);
    clearPixel(missingImage.data, index);
    paintedContext.putImageData(paintedImage, 0, 0, cell.x, cell.y, 1, 1);
    selectionContext.putImageData(selectionImage, 0, 0, cell.x, cell.y, 1, 1);
    missingContext.putImageData(missingImage, 0, 0, cell.x, cell.y, 1, 1);
    selectNextUnfinishedColor();
    scheduleRender();
    scheduleProgress();
  }

  function fillConnectedArea(start: Cell) {
    const startIndex = start.y * puzzle.width + start.x;
    if (puzzle.targetPixels[startIndex] !== selectedColor || progress.paintedPixels[startIndex] !== UNPAINTED_PIXEL) {
      return;
    }

    const visibleCells = getVisibleCells();
    const visibleWidth = visibleCells.endX - visibleCells.startX;
    const visibleHeight = visibleCells.endY - visibleCells.startY;
    const queue = new Uint32Array(visibleWidth * visibleHeight);
    let queueStart = 0;
    let queueEnd = 0;

    function enqueue(index: number) {
      const x = index % puzzle.width;
      const y = Math.floor(index / puzzle.width);
      if (x < visibleCells.startX || x >= visibleCells.endX || y < visibleCells.startY || y >= visibleCells.endY) {
        return;
      }
      if (puzzle.targetPixels[index] !== selectedColor || progress.paintedPixels[index] !== UNPAINTED_PIXEL) {
        return;
      }
      progress.paintedPixels[index] = selectedColor;
      progress.paintedCount += 1;
      progress.paintedByColor[selectedColor] += 1;
      writePaintedPixel(paintedImage.data, index, paletteRgba[selectedColor]);
      clearPixel(selectionImage.data, index);
      clearPixel(missingImage.data, index);
      queue[queueEnd] = index;
      queueEnd += 1;
    }

    enqueue(startIndex);
    while (queueStart < queueEnd) {
      const index = queue[queueStart];
      queueStart += 1;
      const x = index % puzzle.width;
      const y = Math.floor(index / puzzle.width);
      if (x > 0) {
        enqueue(index - 1);
      }
      if (x + 1 < puzzle.width) {
        enqueue(index + 1);
      }
      if (y > 0) {
        enqueue(index - puzzle.width);
      }
      if (y + 1 < puzzle.height) {
        enqueue(index + puzzle.width);
      }
    }

    paintedContext.putImageData(paintedImage, 0, 0);
    selectionContext.putImageData(selectionImage, 0, 0);
    missingContext.putImageData(missingImage, 0, 0);
    selectNextUnfinishedColor();
    scheduleRender();
    scheduleProgress();
  }

  function paintLine(from: Cell, to: Cell) {
    let { x, y } = from;
    const { x: targetX, y: targetY } = to;
    const deltaX = Math.abs(targetX - x);
    const deltaY = -Math.abs(targetY - y);
    const stepX = x < targetX ? 1 : -1;
    const stepY = y < targetY ? 1 : -1;
    let error = deltaX + deltaY;
    let reachedEnd = false;

    while (!reachedEnd) {
      paintCell({ x, y });
      reachedEnd = x === targetX && y === targetY;
      if (reachedEnd) {
        continue;
      }
      const doubledError = error * 2;
      if (doubledError >= deltaY) {
        error += deltaY;
        x += stepX;
      }
      if (doubledError <= deltaX) {
        error += deltaX;
        y += stepY;
      }
    }
  }

  // Pointer tools, capture, and drag interpolation.
  function selectCellColor(event: PointerEvent, cell: Cell | undefined) {
    if (!cell) {
      return;
    }
    event.preventDefault();
    cancelColorAdvance();
    onSelectColor(puzzle.targetPixels[cell.y * puzzle.width + cell.x]);
  }

  function selectCellColorAt(cell: Cell) {
    cancelColorAdvance();
    onSelectColor(puzzle.targetPixels[cell.y * puzzle.width + cell.x]);
  }

  function getKeyboardCell() {
    keyboardCell ??= { x: 0, y: 0 };
    return keyboardCell;
  }

  function keepKeyboardCellVisible(cell: Cell) {
    const halfVisibleWidth = viewportWidth / geometry.cellSize / 2;
    const halfVisibleHeight = viewportHeight / geometry.cellSize / 2;
    if (halfVisibleWidth < puzzle.width / 2) {
      const left = cameraX - halfVisibleWidth;
      const right = cameraX + halfVisibleWidth;
      if (cell.x < left) {
        cameraX = cell.x + halfVisibleWidth;
      } else if (cell.x + 1 > right) {
        cameraX = cell.x + 1 - halfVisibleWidth;
      }
    }
    if (halfVisibleHeight < puzzle.height / 2) {
      const top = cameraY - halfVisibleHeight;
      const bottom = cameraY + halfVisibleHeight;
      if (cell.y < top) {
        cameraY = cell.y + halfVisibleHeight;
      } else if (cell.y + 1 > bottom) {
        cameraY = cell.y + 1 - halfVisibleHeight;
      }
    }

    updateGeometry();
    snapCameraToGrid();
    cameraIsSettled = true;
  }

  function moveKeyboardCell(deltaX: number, deltaY: number) {
    const current = getKeyboardCell();
    keyboardCell = {
      x: Math.min(puzzle.width - 1, Math.max(0, current.x + deltaX)),
      y: Math.min(puzzle.height - 1, Math.max(0, current.y + deltaY)),
    };
    keepKeyboardCellVisible(keyboardCell);
    scheduleRender();
  }

  function performKeyboardAction() {
    const cell = getKeyboardCell();
    if (selectedTool === "picker") {
      selectCellColorAt(cell);
    } else if (selectedTool === "bucket") {
      fillConnectedArea(cell);
    } else if (selectedTool === "pencil") {
      paintCell(cell);
    } else if (selectedTool === "zoom-in" || selectedTool === "zoom-out") {
      const zoomFactor = selectedTool === "zoom-in" ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(
        zoomFactor,
        geometry.x + (cell.x + 0.5) * geometry.cellSize,
        geometry.y + (cell.y + 0.5) * geometry.cellSize
      );
    }
  }

  function handleKeyboardDown(event: KeyboardEvent) {
    if (event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    const movement = {
      ArrowDown: [0, 1],
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
    }[event.key];
    if (movement) {
      event.preventDefault();
      moveKeyboardCell(movement[0], movement[1]);
      return;
    }

    if (event.key === "Enter" || event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      performKeyboardAction();
    }
  }

  function handleCanvasFocus() {
    keyboardFocused = true;
    keepKeyboardCellVisible(getKeyboardCell());
    scheduleRender();
  }

  function handleCanvasBlur() {
    keyboardFocused = false;
    scheduleRender();
  }

  function panFromOverview(event: PointerEvent) {
    const bounds = overviewCanvas.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) {
      return;
    }

    const normalizedX = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
    const normalizedY = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    cameraX = normalizedX * puzzle.width;
    cameraY = normalizedY * puzzle.height;
    updateGeometry();
    scheduleRender();
  }

  function handleOverviewPointerDown(event: PointerEvent) {
    if (event.button !== 0 || activePointerId !== undefined || activeOverviewPointerId !== undefined) {
      return;
    }

    event.preventDefault();
    cameraIsSettled = false;
    activeOverviewPointerId = event.pointerId;
    overviewCanvas.setPointerCapture(event.pointerId);
    overviewCanvas.style.cursor = "grabbing";
    panFromOverview(event);
  }

  function handleOverviewPointerMove(event: PointerEvent) {
    if (event.pointerId !== activeOverviewPointerId) {
      return;
    }
    panFromOverview(event);
  }

  function finishOverviewPointer(event: PointerEvent) {
    if (event.pointerId !== activeOverviewPointerId) {
      return;
    }

    snapCameraToGrid();
    cameraIsSettled = true;
    activeOverviewPointerId = undefined;
    overviewCanvas.style.cursor = "grab";
    scheduleRender();
    if (overviewCanvas.hasPointerCapture(event.pointerId)) {
      overviewCanvas.releasePointerCapture(event.pointerId);
    }
  }

  function beginPaintingPointer(event: PointerEvent, cell: Cell) {
    if (selectedTool === "bucket") {
      fillConnectedArea(cell);
    } else {
      paintCell(cell);
    }

    activePointerId = event.pointerId;
    previousCell = cell;
    canvas.setPointerCapture(event.pointerId);
  }

  function beginPinchGesture() {
    const gesture = getPinchGesture();
    if (!gesture) {
      return;
    }

    activePointerId = undefined;
    pendingTouch = undefined;
    previousCell = undefined;
    previousPointerPosition = undefined;
    pinchGesture = gesture;
    touchGestureWasPinch = true;
    cameraIsSettled = false;
    updateCursor();
  }

  function handleTouchPointerDown(event: PointerEvent) {
    event.preventDefault();
    activeTouchPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    canvas.setPointerCapture(event.pointerId);

    if (activeTouchPointers.size >= 2) {
      beginPinchGesture();
      return;
    }
    if (touchGestureWasPinch) {
      return;
    }

    activePointerId = event.pointerId;
    if (selectedTool === "pan") {
      cameraIsSettled = false;
      previousPointerPosition = { x: event.clientX, y: event.clientY };
      canvas.style.cursor = "grabbing";
    } else {
      pendingTouch = {
        cell: eventToCell(event),
        start: { x: event.clientX, y: event.clientY },
      };
    }
  }

  function handleSinglePointerDown(event: PointerEvent) {
    if (activePointerId !== undefined) {
      return;
    }

    const cell = eventToCell(event);
    if (cell) {
      keyboardCell = cell;
    }
    if (event.button === 1) {
      selectCellColor(event, cell);
      return;
    }
    if (event.button !== 0) {
      return;
    }

    if (selectedTool === "pan") {
      event.preventDefault();
      cameraIsSettled = false;
      activePointerId = event.pointerId;
      previousPointerPosition = { x: event.clientX, y: event.clientY };
      canvas.setPointerCapture(event.pointerId);
      canvas.style.cursor = "grabbing";
      return;
    }

    if (!cell) {
      return;
    }
    event.preventDefault();
    if (selectedTool === "picker") {
      selectCellColor(event, cell);
      return;
    }
    if (selectedTool === "zoom-in" || selectedTool === "zoom-out") {
      const bounds = canvas.getBoundingClientRect();
      const zoomFactor = selectedTool === "zoom-in" ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(zoomFactor, event.clientX - bounds.left, event.clientY - bounds.top);
      return;
    }
    beginPaintingPointer(event, cell);
  }

  function handlePointerDown(event: PointerEvent) {
    if (activeOverviewPointerId !== undefined) {
      return;
    }
    if (event.pointerType === "touch") {
      if (activePointerId !== undefined && activeTouchPointers.size === 0) {
        return;
      }
      handleTouchPointerDown(event);
      return;
    }
    if (activeTouchPointers.size > 0) {
      return;
    }
    handleSinglePointerDown(event);
  }

  function moveTouchPan(event: PointerEvent) {
    if (selectedTool !== "pan" || !previousPointerPosition) {
      return false;
    }

    const deltaX = event.clientX - previousPointerPosition.x;
    const deltaY = event.clientY - previousPointerPosition.y;
    cameraX -= deltaX / geometry.cellSize;
    cameraY -= deltaY / geometry.cellSize;
    previousPointerPosition = { x: event.clientX, y: event.clientY };
    updateGeometry();
    scheduleRender();
    return true;
  }

  function movePendingPaint(event: PointerEvent) {
    if (!pendingTouch || (selectedTool !== "bucket" && selectedTool !== "pencil")) {
      return;
    }

    const distance = Math.hypot(event.clientX - pendingTouch.start.x, event.clientY - pendingTouch.start.y);
    if (distance < TOUCH_PAINT_THRESHOLD) {
      return;
    }

    const startCell = pendingTouch.cell;
    pendingTouch = undefined;
    const cell = eventToCell(event);
    if (!(startCell && cell)) {
      previousCell = undefined;
      return;
    }
    beginPaintingPointer(event, startCell);
    paintLine(startCell, cell);
    previousCell = cell;
  }

  function handleTouchPointerMove(event: PointerEvent) {
    if (event.pointerType !== "touch" || !activeTouchPointers.has(event.pointerId)) {
      return false;
    }

    activeTouchPointers.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    if (pinchGesture) {
      const nextGesture = getPinchGesture();
      if (nextGesture) {
        updatePinch(nextGesture);
      }
      return true;
    }
    if (touchGestureWasPinch) {
      return true;
    }
    if (event.pointerId !== activePointerId) {
      return true;
    }
    if (moveTouchPan(event)) {
      return true;
    }

    if (pendingTouch) {
      movePendingPaint(event);
      return true;
    }
    return false;
  }

  function handlePointerMove(event: PointerEvent) {
    if (handleTouchPointerMove(event)) {
      return;
    }

    if (event.pointerId !== activePointerId) {
      return;
    }

    if (selectedTool === "pan" && previousPointerPosition) {
      const deltaX = event.clientX - previousPointerPosition.x;
      const deltaY = event.clientY - previousPointerPosition.y;
      cameraX -= deltaX / geometry.cellSize;
      cameraY -= deltaY / geometry.cellSize;
      previousPointerPosition = { x: event.clientX, y: event.clientY };
      updateGeometry();
      scheduleRender();
      return;
    }
    const cell = eventToCell(event);
    if (!cell) {
      previousCell = undefined;
      return;
    }
    if (!previousCell) {
      paintCell(cell);
      previousCell = cell;
      return;
    }
    paintLine(previousCell, cell);
    previousCell = cell;
  }

  function releasePointerCapture(event: PointerEvent) {
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
  }

  function performPendingTouch(event: PointerEvent) {
    const cell = eventToCell(event) ?? pendingTouch?.cell;
    if (selectedTool === "picker") {
      selectCellColor(event, cell);
    } else if (selectedTool === "zoom-in" || selectedTool === "zoom-out") {
      const bounds = canvas.getBoundingClientRect();
      const zoomFactor = selectedTool === "zoom-in" ? ZOOM_STEP : 1 / ZOOM_STEP;
      zoomAt(zoomFactor, event.clientX - bounds.left, event.clientY - bounds.top);
    } else if (cell && selectedTool === "bucket") {
      fillConnectedArea(cell);
    } else if (cell && selectedTool === "pencil") {
      paintCell(cell);
    }
  }

  function finishPinchPointer(event: PointerEvent) {
    if (pinchGesture && activeTouchPointers.size >= 2) {
      pinchGesture = getPinchGesture();
    } else if (pinchGesture) {
      pinchGesture = undefined;
      snapCameraToGrid();
      cameraIsSettled = true;
      scheduleRender();
    }
    if (activeTouchPointers.size === 0) {
      touchGestureWasPinch = false;
    }
    activePointerId = undefined;
    pendingTouch = undefined;
    releasePointerCapture(event);
  }

  function finishTouchPointer(event: PointerEvent) {
    if (event.pointerType !== "touch" || !activeTouchPointers.has(event.pointerId)) {
      return false;
    }

    activeTouchPointers.delete(event.pointerId);
    if (touchGestureWasPinch) {
      finishPinchPointer(event);
      return true;
    }
    if (event.pointerId !== activePointerId) {
      releasePointerCapture(event);
      return true;
    }
    if (pendingTouch && event.type === "pointerup") {
      performPendingTouch(event);
    }
    pendingTouch = undefined;

    if (selectedTool === "pan") {
      snapCameraToGrid();
      cameraIsSettled = true;
      scheduleRender();
    }
    activePointerId = undefined;
    previousCell = undefined;
    previousPointerPosition = undefined;
    updateCursor();
    releasePointerCapture(event);
    return true;
  }

  function finishPointer(event: PointerEvent) {
    if (finishTouchPointer(event)) {
      return;
    }

    if (event.pointerId !== activePointerId) {
      return;
    }

    if (selectedTool === "pan") {
      snapCameraToGrid();
      cameraIsSettled = true;
      scheduleRender();
    }
    activePointerId = undefined;
    previousCell = undefined;
    previousPointerPosition = undefined;
    updateCursor();
    releasePointerCapture(event);
  }

  function updateCursor() {
    if (selectedTool === "pan") {
      canvas.style.cursor = "grab";
    } else if (selectedTool === "zoom-in") {
      canvas.style.cursor = "zoom-in";
    } else if (selectedTool === "zoom-out") {
      canvas.style.cursor = "zoom-out";
    } else {
      canvas.style.cursor = "crosshair";
    }
  }

  // Attach browser events and expose the small imperative API used by React.
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resizeObserver.observe(overviewCanvas);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("keydown", handleKeyboardDown);
  canvas.addEventListener("focus", handleCanvasFocus);
  canvas.addEventListener("blur", handleCanvasBlur);
  overviewCanvas.addEventListener("pointerdown", handleOverviewPointerDown);
  overviewCanvas.addEventListener("pointermove", handleOverviewPointerMove);
  overviewCanvas.addEventListener("pointerup", finishOverviewPointer);
  overviewCanvas.addEventListener("pointercancel", finishOverviewPointer);
  overviewCanvas.addEventListener("lostpointercapture", finishOverviewPointer);
  overviewCanvas.style.cursor = "grab";
  updateCursor();
  rebuildSelectionLayer();
  resize();

  return {
    destroy() {
      destroyed = true;
      cancelColorAdvance();
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      canvas.removeEventListener("keydown", handleKeyboardDown);
      canvas.removeEventListener("focus", handleCanvasFocus);
      canvas.removeEventListener("blur", handleCanvasBlur);
      overviewCanvas.removeEventListener("pointerdown", handleOverviewPointerDown);
      overviewCanvas.removeEventListener("pointermove", handleOverviewPointerMove);
      overviewCanvas.removeEventListener("pointerup", finishOverviewPointer);
      overviewCanvas.removeEventListener("pointercancel", finishOverviewPointer);
      overviewCanvas.removeEventListener("lostpointercapture", finishOverviewPointer);
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
      if (progressFrameId !== undefined) {
        cancelAnimationFrame(progressFrameId);
      }
    },
    setHighlightMissing(highlighted: boolean) {
      highlightMissing = highlighted;
      scheduleRender();
    },
    setSelectedColor(colorIndex: number) {
      cancelColorAdvance();
      selectedColor = colorIndex;
      rebuildSelectionLayer();
      scheduleRender();
    },
    setShowGrid(visible: boolean) {
      showGrid = visible;
      scheduleRender();
    },
    setShowNumbers(visible: boolean) {
      showNumbers = visible;
      scheduleRender();
    },
    setTool(tool: ColoringTool) {
      selectedTool = tool;
      updateCursor();
    },
  };
}

// Low-level canvas and pixel helpers.
function getColoringTheme(element: HTMLElement) {
  const styles = getComputedStyle(element);
  function getColor(name: string) {
    return styles.getPropertyValue(`--color-${name}`).trim();
  }

  return {
    canvas: getColor("canvas"),
    canvasEdge: getColor("canvas-edge"),
    foreground: getColor("foreground"),
    muted: getColor("muted"),
    mutedForeground: getColor("muted-foreground"),
    primary: getColor("primary"),
  };
}

function resolveCssColor(color: string) {
  const colorCanvas = document.createElement("canvas");
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const context = getCanvasContext(colorCanvas, { willReadFrequently: true });
  context.fillStyle = color;
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
  return [red, green, blue, alpha] as const;
}

function withAlpha([red, green, blue]: ReturnType<typeof resolveCssColor>, alpha: number) {
  return `rgb(${red} ${green} ${blue} / ${alpha})`;
}

function clearPixel(data: Uint8ClampedArray, pixelIndex: number) {
  data.fill(0, pixelIndex * 4, pixelIndex * 4 + 4);
}
