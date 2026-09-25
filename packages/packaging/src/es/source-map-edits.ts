/**
 * Edits to emitted JavaScript that keep its source map correct.
 *
 * Packaging rewrites some of what Bun emits (chunk specifiers, asset paths, a default export) and moves files into
 * function and layer folders. Bun's maps describe each file as Bun wrote it, where Bun wrote it. Minified output is
 * essentially one line, so an edit that changes a specifier's length moves every later column on that line, and a
 * moved map resolves its relative `sources` from the wrong folder: a stack trace then names the wrong column, line or
 * file. Each such edit goes through here instead. The map's segments move with the text they describe, and its
 * `sources` are re-expressed relative to the folder the map is written to.
 */
import type { SourceMapSegment } from '@jridgewell/sourcemap-codec';
import { decode, encode } from '@jridgewell/sourcemap-codec';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { withoutSourcesContent } from './packaged-source-map';

/** Replaces `code.slice(start, end)` with `text`. An edit neither spans nor inserts a line break. */
export type TextEdit = { start: number; end: number; text: string };

/** A map as read from disk. A map without `mappings` or `sources` has nothing to move or rebase, and is kept. */
type SourceMapJson = {
  sources?: (string | null)[] | undefined;
  sourceRoot?: string | undefined;
  mappings?: string | undefined;
  [key: string]: unknown;
};

/** A source that is a URL (`webpack://`, `bun:`, …) names no file to rebase. */
const URL_SCHEME = /^[a-z][a-z\d+.-]*:\/?/i;

const toPosix = (path: string) => path.replace(/\\/g, '/');

const sortEdits = (code: string, edits: TextEdit[]) => {
  const sorted = edits.toSorted((left, right) => left.start - right.start);
  sorted.forEach((edit, index) => {
    const previous = sorted[index - 1];
    if (edit.end < edit.start || (previous !== undefined && edit.start < previous.end)) {
      throw new Error(`Emitted-code edits overlap at offset ${edit.start}.`);
    }
    if (edit.text.includes('\n') || code.slice(edit.start, edit.end).includes('\n')) {
      throw new Error(`An emitted-code edit at offset ${edit.start} crosses a line break.`);
    }
  });
  return sorted;
};

export const applyTextEdits = (code: string, edits: TextEdit[]): string => {
  let output = '';
  let position = 0;
  for (const edit of sortEdits(code, edits)) {
    output += code.slice(position, edit.start) + edit.text;
    position = edit.end;
  }
  return output + code.slice(position);
};

/**
 * `map` for `code` after `edits`. Each segment keeps its original position and moves with the generated text it
 * starts. A segment inside replaced text (which only ever describes the replaced specifier) moves to the start of the
 * replacement, and is dropped there when a segment already starts at that column.
 */
export const shiftSourceMap = <Map extends SourceMapJson>(map: Map, code: string, edits: TextEdit[]): Map => {
  if (edits.length === 0 || typeof map.mappings !== 'string') return map;
  const lines = decode(map.mappings);
  const editsByLine = new Map<number, { start: number; end: number; delta: number }[]>();
  let line = 0;
  let lineStart = 0;
  let scanned = 0;
  for (const edit of sortEdits(code, edits)) {
    for (; scanned < edit.start; scanned += 1) {
      if (code.charCodeAt(scanned) === 10) {
        line += 1;
        lineStart = scanned + 1;
      }
    }
    const lineEdits = editsByLine.get(line) ?? [];
    lineEdits.push({
      start: edit.start - lineStart,
      end: edit.end - lineStart,
      delta: edit.text.length - (edit.end - edit.start)
    });
    editsByLine.set(line, lineEdits);
  }
  for (const [lineIndex, lineEdits] of editsByLine) {
    const segments = lines[lineIndex];
    if (!segments) continue;
    // Segments come sorted by column, and the edits before a segment only grow with its column: one pass over both.
    const shifted: SourceMapSegment[] = [];
    let next = 0;
    let offset = 0;
    for (const segment of segments) {
      const column = segment[0];
      for (; next < lineEdits.length; next += 1) {
        const { start, end, delta } = lineEdits[next]!;
        // Text inserted at a segment's column goes before it; replaced text starting there begins where it did.
        if (start === end ? column < start : column < end) break;
        offset += delta;
      }
      const enclosing = lineEdits[next];
      const collapsedTo = enclosing && column > enclosing.start ? enclosing.start + offset : undefined;
      if (collapsedTo !== undefined && shifted.at(-1)?.[0] === collapsedTo) continue;
      shifted.push([collapsedTo ?? column + offset, ...segment.slice(1)] as SourceMapSegment);
    }
    lines[lineIndex] = shifted;
  }
  return { ...map, mappings: encode(lines) };
};

/**
 * `map` as written in `toDirectory`: each relative source, resolved from `fromDirectory` and `sourceRoot`, is
 * expressed relative to `toDirectory`, the folder the source-map format resolves it from. URL sources and absent
 * ones are kept.
 */
export const rebaseSources = <Map extends SourceMapJson>(map: Map, fromDirectory: string, toDirectory: string): Map => {
  const { sources } = map;
  if (!Array.isArray(sources) || (fromDirectory === toDirectory && !map.sourceRoot)) return map;
  const { sourceRoot, ...rest } = map;
  return {
    ...rest,
    sources: sources.map((source) =>
      source === null || URL_SCHEME.test(source)
        ? source
        : toPosix(relative(toDirectory, resolve(fromDirectory, sourceRoot ?? '', source)))
    )
  } as unknown as Map;
};

/**
 * Writes the JavaScript at `from` to `to` with `edits` applied, and its map, if it has one, to `<to>.map`: shifted
 * to the edited code and rebased from `sourcesDirectory` (the folder its sources are relative to: `from`'s own unless
 * said otherwise) to `to`'s folder. A `packaged` map omits `sourcesContent`. Returns the edited code.
 */
export const writeEditedJavaScript = async ({
  from,
  to,
  edits,
  sourcesDirectory = dirname(from),
  packaged
}: {
  from: string;
  to: string;
  /** The edits, or how to compute them from the code. */
  edits: TextEdit[] | ((code: string) => TextEdit[]);
  sourcesDirectory?: string;
  packaged: boolean;
}): Promise<string> => {
  const code = await readFile(from, 'utf8');
  const textEdits = typeof edits === 'function' ? edits(code) : edits;
  const output = applyTextEdits(code, textEdits);
  if (from !== to || textEdits.length > 0) {
    await writeFile(to, output);
  }
  const mapPath = `${from}.map`;
  if ((from !== to || textEdits.length > 0 || sourcesDirectory !== dirname(to) || packaged) && existsSync(mapPath)) {
    const map = rebaseSources(
      shiftSourceMap(JSON.parse(await readFile(mapPath, 'utf8')) as SourceMapJson, code, textEdits),
      sourcesDirectory,
      dirname(to)
    );
    await writeFile(`${to}.map`, JSON.stringify(packaged ? withoutSourcesContent(map) : map));
  }
  return output;
};
