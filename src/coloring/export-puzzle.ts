import type { PuzzleDefinition } from "./types";

const BASE64_LINE_LENGTH = 100;
const BASE64_ENCODING_CHUNK_SIZE = 32_768;
const FILE_NAME_CHARACTER_PATTERN = /[^a-z0-9]+/gi;
const FILE_NAME_EDGE_PATTERN = /^-|-$/g;
const IDENTIFIER_WORD_PATTERN = /[a-z\d]+/gi;
const IDENTIFIER_STARTS_WITH_NUMBER_PATTERN = /^\d/;

export function createPuzzleModuleSource(puzzle: PuzzleDefinition) {
  const encodedPixels = encodePixels(puzzle.targetPixels);
  const encodedLines = splitIntoLines(encodedPixels, BASE64_LINE_LENGTH);
  const palette = puzzle.palette.map((color) => `    ${JSON.stringify(color)},`).join("\n");

  return [
    'import type { PuzzleDefinition } from "@/coloring/types";',
    "",
    "const encodedPixels = [",
    ...encodedLines.map((line) => `  ${JSON.stringify(line)},`),
    '].join("");',
    "",
    "function decodePixels(value: string) {",
    "  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));",
    "}",
    "",
    `export const ${createExportName(puzzle.name)} = {`,
    `  height: ${puzzle.height},`,
    `  id: ${JSON.stringify(puzzle.id)},`,
    `  name: ${JSON.stringify(puzzle.name)},`,
    "  palette: [",
    palette,
    "  ],",
    "  targetPixels: decodePixels(encodedPixels),",
    `  width: ${puzzle.width},`,
    "} satisfies PuzzleDefinition;",
    "",
  ].join("\n");
}

export function downloadPuzzleModule(puzzle: PuzzleDefinition) {
  const source = createPuzzleModuleSource(puzzle);
  const url = URL.createObjectURL(new Blob([source], { type: "text/plain;charset=utf-8" }));
  const link = document.createElement("a");

  link.download = `${createFileName(puzzle.id)}.ts`;
  link.href = url;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function encodePixels(pixels: Uint8Array) {
  let binary = "";

  for (let index = 0; index < pixels.length; index += BASE64_ENCODING_CHUNK_SIZE) {
    binary += String.fromCharCode(...pixels.subarray(index, index + BASE64_ENCODING_CHUNK_SIZE));
  }

  return btoa(binary);
}

function splitIntoLines(value: string, lineLength: number) {
  const lines: string[] = [];
  for (let index = 0; index < value.length; index += lineLength) {
    lines.push(value.slice(index, index + lineLength));
  }
  return lines;
}

function createExportName(name: string) {
  const words = name.match(IDENTIFIER_WORD_PATTERN) ?? [];
  const identifier = words
    .map((word, index) => (index === 0 ? word.toLowerCase() : `${word[0].toUpperCase()}${word.slice(1).toLowerCase()}`))
    .join("");
  const safeIdentifier =
    identifier && IDENTIFIER_STARTS_WITH_NUMBER_PATTERN.test(identifier) ? `puzzle${identifier}` : identifier;

  return `${safeIdentifier || "custom"}Puzzle`;
}

function createFileName(id: string) {
  const fileName = id.toLowerCase().replaceAll(FILE_NAME_CHARACTER_PATTERN, "-").replace(FILE_NAME_EDGE_PATTERN, "");
  return fileName || "custom-puzzle";
}
