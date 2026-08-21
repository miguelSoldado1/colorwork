export const MAX_IMAGE_CROP_ZOOM = 4;
export const MIN_IMAGE_CROP_ZOOM = 1;

export interface ImageCrop {
  centerX: number;
  centerY: number;
  zoom: number;
}

export interface CropSize {
  height: number;
  width: number;
}

export interface CropRect extends CropSize {
  x: number;
  y: number;
}

export const DEFAULT_IMAGE_CROP: ImageCrop = {
  centerX: 0.5,
  centerY: 0.5,
  zoom: MIN_IMAGE_CROP_ZOOM,
};

export function constrainImageCrop(crop: ImageCrop, source: CropSize, output: CropSize) {
  const zoom = clamp(crop.zoom, MIN_IMAGE_CROP_ZOOM, MAX_IMAGE_CROP_ZOOM);
  const baseSize = getBaseCropSize(source, output);
  const normalizedHalfWidth = baseSize.width / zoom / source.width / 2;
  const normalizedHalfHeight = baseSize.height / zoom / source.height / 2;

  return {
    centerX: clamp(crop.centerX, normalizedHalfWidth, 1 - normalizedHalfWidth),
    centerY: clamp(crop.centerY, normalizedHalfHeight, 1 - normalizedHalfHeight),
    zoom,
  };
}

export function getImageCropRect(crop: ImageCrop, source: CropSize, output: CropSize): CropRect {
  const constrained = constrainImageCrop(crop, source, output);
  const baseSize = getBaseCropSize(source, output);
  const width = baseSize.width / constrained.zoom;
  const height = baseSize.height / constrained.zoom;

  return {
    height,
    width,
    x: constrained.centerX * source.width - width / 2,
    y: constrained.centerY * source.height - height / 2,
  };
}

/** Moves the selected source rectangle by fractions of its current width and height. */
export function moveImageCrop(crop: ImageCrop, movement: { x: number; y: number }, source: CropSize, output: CropSize) {
  const constrained = constrainImageCrop(crop, source, output);
  const rect = getImageCropRect(constrained, source, output);

  return constrainImageCrop(
    {
      ...constrained,
      centerX: constrained.centerX + (movement.x * rect.width) / source.width,
      centerY: constrained.centerY + (movement.y * rect.height) / source.height,
    },
    source,
    output
  );
}

/**
 * Changes zoom while holding one point of the current selection still. The anchor is a fraction of
 * the selected rectangle, so a pointer over the image keeps the pixel it is on.
 */
export function zoomImageCrop(
  crop: ImageCrop,
  zoom: number,
  anchor: { x: number; y: number },
  source: CropSize,
  output: CropSize
) {
  const rect = getImageCropRect(crop, source, output);
  const held = {
    x: rect.x + anchor.x * rect.width,
    y: rect.y + anchor.y * rect.height,
  };
  const next = constrainImageCrop({ ...crop, zoom }, source, output);
  const nextRect = getImageCropRect(next, source, output);

  return constrainImageCrop(
    {
      ...next,
      centerX: (held.x + nextRect.width * (0.5 - anchor.x)) / source.width,
      centerY: (held.y + nextRect.height * (0.5 - anchor.y)) / source.height,
    },
    source,
    output
  );
}

export function fitCropFrame(content: CropSize, available: CropSize): CropSize {
  const scale = Math.min(available.width / content.width, available.height / content.height);
  return {
    height: content.height * scale,
    width: content.width * scale,
  };
}

function getBaseCropSize(source: CropSize, output: CropSize) {
  const sourceAspect = source.width / source.height;
  const outputAspect = output.width / output.height;

  if (sourceAspect > outputAspect) {
    return { height: source.height, width: source.height * outputAspect };
  }

  return { height: source.width / outputAspect, width: source.width };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}
