import { countTargetPixelsByColor, createProgressSummary, UNPAINTED_PIXEL } from "./progress";
import type { ColoringTool, ProgressSummary, PuzzleDefinition, PuzzleProgress } from "./types";

interface CreateColoringBoardOptions {
  canvas: HTMLCanvasElement;
  onProgress: (summary: ProgressSummary) => void;
  onSelectColor: (colorIndex: number) => void;
  overviewCanvas: HTMLCanvasElement;
  progress: PuzzleProgress;
  puzzle: PuzzleDefinition;
}

interface Cell {
  x: number;
  y: number;
}

interface PointerPosition {
  x: number;
  y: number;
}

const NUMBER_THRESHOLD = 12;
const GRID_THRESHOLD = 7;
const MAX_ZOOM = 32;
const MIN_ZOOM = 1;
const ZOOM_STEP = 1.8;

export function createColoringBoard({
  canvas,
  overviewCanvas,
  puzzle,
  progress,
  onProgress,
  onSelectColor,
}: CreateColoringBoardOptions) {
  const context = getCanvasContext(canvas, { alpha: false });
  const overviewContext = getCanvasContext(overviewCanvas, { alpha: false });

  // Puzzle-sized bitmap layers keep per-pixel work out of the main display canvas.
  const totalByColor = countTargetPixelsByColor(puzzle);
  const paintedLayer = document.createElement("canvas");
  paintedLayer.width = puzzle.width;
  paintedLayer.height = puzzle.height;
  const paintedContext = getCanvasContext(paintedLayer);
  const paintedImage = paintedContext.createImageData(puzzle.width, puzzle.height);
  const paletteRgba = puzzle.palette.map(parseHexColor);
  const overviewBaseLayer = document.createElement("canvas");
  overviewBaseLayer.width = puzzle.width;
  overviewBaseLayer.height = puzzle.height;
  const overviewBaseContext = getCanvasContext(overviewBaseLayer);
  const overviewBaseImage = overviewBaseContext.createImageData(puzzle.width, puzzle.height);
  const selectionLayer = document.createElement("canvas");
  selectionLayer.width = puzzle.width;
  selectionLayer.height = puzzle.height;
  const selectionContext = getCanvasContext(selectionLayer);
  const selectionImage = selectionContext.createImageData(puzzle.width, puzzle.height);

  // Build the static grayscale overview and restore any existing painted pixels.
  for (let index = 0; index < puzzle.targetPixels.length; index += 1) {
    const color = paletteRgba[puzzle.targetPixels[index]];
    const luminance = color[0] * 0.2126 + color[1] * 0.7152 + color[2] * 0.0722;
    const gray = Math.round(52 + luminance * 0.35);
    writePaintedPixel(overviewBaseImage.data, index, [gray, gray, gray, 255]);
  }
  overviewBaseContext.putImageData(overviewBaseImage, 0, 0);

  for (let index = 0; index < progress.paintedPixels.length; index += 1) {
    const colorIndex = progress.paintedPixels[index];
    if (colorIndex === UNPAINTED_PIXEL) {
      continue;
    }
    writePaintedPixel(paintedImage.data, index, paletteRgba[colorIndex]);
  }
  paintedContext.putImageData(paintedImage, 0, 0);

  // Mutable interaction state stays inside this controller rather than React.
  let selectedColor = 0;
  let selectedTool: ColoringTool = "pencil";
  let geometry = { cellSize: 1, height: puzzle.height, width: puzzle.width, x: 0, y: 0 };
  let cameraX = puzzle.width / 2;
  let cameraY = puzzle.height / 2;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let fitScale = 1;
  let zoom = 1;
  let showNumbers = true;
  let frameId: number | undefined;
  let progressFrameId: number | undefined;
  let activePointerId: number | undefined;
  let previousCell: Cell | undefined;
  let previousPointerPosition: PointerPosition | undefined;
  let destroyed = false;

  function rebuildSelectionLayer() {
    selectionImage.data.fill(0);
    for (let index = 0; index < puzzle.targetPixels.length; index += 1) {
      if (puzzle.targetPixels[index] === selectedColor && progress.paintedPixels[index] === UNPAINTED_PIXEL) {
        writePaintedPixel(selectionImage.data, index, [58, 63, 82, 255]);
      }
    }
    selectionContext.putImageData(selectionImage, 0, 0);
  }

  // Camera and viewport geometry.
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const displayWidth = Math.max(1, Math.round(bounds.width * dpr));
    const displayHeight = Math.max(1, Math.round(bounds.height * dpr));

    if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
      canvas.width = displayWidth;
      canvas.height = displayHeight;
    }

    viewportWidth = bounds.width;
    viewportHeight = bounds.height;
    const availableWidth = Math.max(1, viewportWidth - 32);
    const availableHeight = Math.max(1, viewportHeight - 32);
    fitScale = Math.min(availableWidth / puzzle.width, availableHeight / puzzle.height);
    updateGeometry();

    scheduleRender();
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

  function zoomAt(factor: number, screenX = viewportWidth / 2, screenY = viewportHeight / 2) {
    const worldX = (screenX - geometry.x) / geometry.cellSize;
    const worldY = (screenY - geometry.y) / geometry.cellSize;
    const nextZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom * factor));
    if (nextZoom === zoom) {
      return;
    }

    zoom = nextZoom;
    const nextCellSize = fitScale * zoom;
    cameraX = worldX - (screenX - viewportWidth / 2) / nextCellSize;
    cameraY = worldY - (screenY - viewportHeight / 2) / nextCellSize;
    updateGeometry();
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
    const renderStartedAt = performance.now();

    context.fillStyle = "#11141e";
    context.fillRect(0, 0, bounds.width, bounds.height);

    context.fillStyle = "#252938";
    context.fillRect(x, y, width, height);
    drawVisibleLayer(selectionLayer);
    drawVisibleLayer(paintedLayer);

    drawNumbers();
    drawGrid();

    context.strokeStyle = "#596078";
    context.lineWidth = 2;
    context.strokeRect(x - 1, y - 1, width + 2, height + 2);
    canvas.dataset.renderMs = (performance.now() - renderStartedAt).toFixed(2);
    canvas.dataset.logicalPixels = String(puzzle.width * puzzle.height);
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
    overviewContext.fillStyle = "#252938";
    overviewContext.fillRect(0, 0, bounds.width, bounds.height);
    overviewContext.drawImage(overviewBaseLayer, 0, 0, bounds.width, bounds.height);
    overviewContext.drawImage(paintedLayer, 0, 0, bounds.width, bounds.height);

    const worldLeft = Math.max(0, -geometry.x / geometry.cellSize);
    const worldTop = Math.max(0, -geometry.y / geometry.cellSize);
    const worldRight = Math.min(puzzle.width, (viewportWidth - geometry.x) / geometry.cellSize);
    const worldBottom = Math.min(puzzle.height, (viewportHeight - geometry.y) / geometry.cellSize);
    const viewportX = (worldLeft / puzzle.width) * bounds.width;
    const viewportY = (worldTop / puzzle.height) * bounds.height;
    const visibleWidth = ((worldRight - worldLeft) / puzzle.width) * bounds.width;
    const visibleHeight = ((worldBottom - worldTop) / puzzle.height) * bounds.height;

    overviewContext.fillStyle = "rgba(255, 255, 255, 0.12)";
    overviewContext.fillRect(viewportX, viewportY, visibleWidth, visibleHeight);
    overviewContext.strokeStyle = "#ffffff";
    overviewContext.lineWidth = 2;
    overviewContext.strokeRect(
      viewportX + 1,
      viewportY + 1,
      Math.max(0, visibleWidth - 2),
      Math.max(0, visibleHeight - 2)
    );
  }

  function getVisibleCells() {
    const { cellSize, x, y } = geometry;
    return {
      endX: Math.min(puzzle.width, Math.ceil((viewportWidth - x) / cellSize)),
      endY: Math.min(puzzle.height, Math.ceil((viewportHeight - y) / cellSize)),
      startX: Math.max(0, Math.floor(-x / cellSize)),
      startY: Math.max(0, Math.floor(-y / cellSize)),
    };
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
    if (!showNumbers || cellSize < NUMBER_THRESHOLD) {
      return;
    }

    context.font = `600 ${Math.min(16, Math.max(12, Math.floor(cellSize * 0.42)))}px "Pixelify Sans"`;
    context.textAlign = "center";
    context.textBaseline = "middle";

    const { endX, endY, startX, startY } = getVisibleCells();
    for (let row = startY; row < endY; row += 1) {
      for (let column = startX; column < endX; column += 1) {
        const index = row * puzzle.width + column;
        if (progress.paintedPixels[index] !== UNPAINTED_PIXEL) {
          continue;
        }
        context.fillStyle = puzzle.targetPixels[index] === selectedColor ? "#ffffff" : "#9ea3b8";
        context.fillText(
          String(puzzle.targetPixels[index] + 1),
          x + (column + 0.5) * cellSize,
          y + (row + 0.52) * cellSize
        );
      }
    }
  }

  function drawGrid() {
    const { cellSize, height, width, x, y } = geometry;
    if (cellSize < GRID_THRESHOLD) {
      return;
    }

    context.beginPath();
    context.strokeStyle = "rgba(235, 232, 255, 0.12)";
    context.lineWidth = 1;
    const { endX, endY, startX, startY } = getVisibleCells();
    for (let column = startX; column <= endX; column += 1) {
      const lineX = x + column * cellSize + 0.5;
      context.moveTo(lineX, y);
      context.lineTo(lineX, y + height);
    }
    for (let row = startY; row <= endY; row += 1) {
      const lineY = y + row * cellSize + 0.5;
      context.moveTo(x, lineY);
      context.lineTo(x + width, lineY);
    }
    context.stroke();
  }

  // Grid conversion and painting operations.
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
    paintedContext.putImageData(paintedImage, 0, 0, cell.x, cell.y, 1, 1);
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
    onSelectColor(puzzle.targetPixels[cell.y * puzzle.width + cell.x]);
  }

  function handlePointerDown(event: PointerEvent) {
    if (activePointerId !== undefined) {
      return;
    }

    const cell = eventToCell(event);
    if (event.button === 1) {
      selectCellColor(event, cell);
      return;
    }
    if (event.button !== 0) {
      return;
    }

    if (selectedTool === "pan") {
      event.preventDefault();
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
    if (selectedTool === "bucket") {
      fillConnectedArea(cell);
      return;
    }
    activePointerId = event.pointerId;
    previousCell = cell;
    canvas.setPointerCapture(event.pointerId);
    paintCell(cell);
  }

  function handlePointerMove(event: PointerEvent) {
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

  function finishPointer(event: PointerEvent) {
    if (event.pointerId !== activePointerId) {
      return;
    }
    activePointerId = undefined;
    previousCell = undefined;
    previousPointerPosition = undefined;
    updateCursor();
    if (canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
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
  resizeObserver.observe(canvas);
  canvas.addEventListener("pointerdown", handlePointerDown);
  canvas.addEventListener("pointermove", handlePointerMove);
  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  updateCursor();
  resize();

  return {
    destroy() {
      destroyed = true;
      resizeObserver.disconnect();
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", finishPointer);
      canvas.removeEventListener("pointercancel", finishPointer);
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
      if (progressFrameId !== undefined) {
        cancelAnimationFrame(progressFrameId);
      }
    },
    setSelectedColor(colorIndex: number) {
      selectedColor = colorIndex;
      rebuildSelectionLayer();
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
function parseHexColor(color: string) {
  return [
    Number.parseInt(color.slice(1, 3), 16),
    Number.parseInt(color.slice(3, 5), 16),
    Number.parseInt(color.slice(5, 7), 16),
    255,
  ] as const;
}

function writePaintedPixel(
  data: Uint8ClampedArray,
  pixelIndex: number,
  [red, green, blue, alpha]: readonly [number, number, number, number]
) {
  const offset = pixelIndex * 4;
  data[offset] = red;
  data[offset + 1] = green;
  data[offset + 2] = blue;
  data[offset + 3] = alpha;
}

function getCanvasContext(canvas: HTMLCanvasElement, options?: CanvasRenderingContext2DSettings) {
  const context = canvas.getContext("2d", options);
  if (!context) {
    throw new Error("Canvas 2D is not available in this browser.");
  }
  return context;
}
