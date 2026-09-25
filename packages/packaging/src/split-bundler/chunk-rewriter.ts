import type { TextEdit } from '../es/source-map-edits';
import { applyTextEdits } from '../es/source-map-edits';

/**
 * Chunk import path rewriting utilities.
 *
 * Handles rewriting of import paths in bundled JavaScript files to point
 * to the correct location (layer path or local path) after code splitting.
 */

/**
 * A chunk specifier, and only in a position where a module specifier can appear.
 *
 * These rewrites run over a whole bundled file, and the Lambda's own code is in there with it. Matching
 * every quoted string that ends in a chunk-shaped name rewrote application data too: a CDN URL, an object
 * key, anything of the form `…/chunk-<hash>.js`. The artifact still deployed and still loaded — it just
 * requested the wrong thing at run time, with nothing in the build to say so.
 *
 * The lookbehind restricts a match to what actually carries a specifier: `from "…"`, a bare or dynamic
 * `import`, and `require(…)`, which is what Bun emits for chunk edges.
 */
const CHUNK_SPECIFIER = /(?<=\b(?:from|import|require)\s*\(?\s*)(["'`])([^"'`]*?)(chunk-[a-z0-9]+\.js)\1/g;

/**
 * The edits that point every chunk specifier in `content` at the prefix `prefixFor` gives its chunk file, keeping the
 * quote style. As edits rather than a new string, so the file's source map can move with them
 * (`es/source-map-edits`).
 */
export const getChunkImportEdits = (content: string, prefixFor: (chunkFile: string) => string): TextEdit[] =>
  Array.from(content.matchAll(CHUNK_SPECIFIER), (match) => {
    const [specifier, quote, , chunkFile] = match;
    return {
      start: match.index,
      end: match.index + specifier.length,
      text: `${quote}${prefixFor(chunkFile!)}${chunkFile}${quote}`
    };
  });

/** Refuses root-absolute `/chunks/` specifiers after a rewrite: they would fail to resolve in a Lambda. */
export const assertNoRootChunkImports = (result: string) => {
  if (result.includes('"/chunks/') || result.includes("'/chunks/") || result.includes('`/chunks/')) {
    const matches = result.match(/["'`]\/chunks\/chunk-[a-z0-9]+\.js["'`]/g);
    throw new Error(
      `Failed to rewrite chunk imports. Found unrewritten absolute paths: ${matches?.join(', ') || 'unknown'}`
    );
  }
};

/** Refuses root-absolute `/chunks/` specifiers after a selective rewrite: only the layer mount may be absolute. */
export const assertOnlyLayerChunkImportsAbsolute = (result: string) => {
  const badMatches = result.match(/["'`]\/chunks\/chunk-[a-z0-9]+\.js["'`]/g);
  if (badMatches && badMatches.length > 0) {
    throw new Error(
      `Failed to rewrite chunk imports selectively. Found unrewritten absolute /chunks/ paths: ${badMatches.join(', ')}`
    );
  }
};

/**
 * Rewrite all chunk import paths in file content to use a new prefix.
 *
 * @param content - File content to process
 * @param newPrefix - New prefix for chunk paths (e.g., "./chunks/" or "./")
 * @returns Modified content with rewritten imports
 */
export const rewriteChunkImports = (content: string, newPrefix: string): string => {
  const result = applyTextEdits(
    content,
    getChunkImportEdits(content, () => newPrefix)
  );
  assertNoRootChunkImports(result);
  return result;
};

/** Where a layered or a local chunk is imported from: the layer mount, or `localPrefix`. */
export const getChunkPrefixFor =
  (layeredChunkNames: Set<string>, layerPrefix: string, localPrefix: string) => (chunkFile: string) =>
    layeredChunkNames.has(chunkFile) ? layerPrefix : localPrefix;

/**
 * Rewrite chunk imports selectively based on whether chunks are layered.
 * Layered chunks get the layer prefix, non-layered chunks get the local prefix.
 *
 * @param content - File content to process
 * @param layeredChunkNames - Set of chunk names that are in layers
 * @param layerPrefix - Prefix for layered chunk imports (e.g., "/opt/nodejs/chunks/")
 * @param localPrefix - Prefix for non-layered chunk imports (e.g., "./chunks/" or "./")
 * @returns Modified content with selectively rewritten imports
 */
export const rewriteChunkImportsSelective = (
  content: string,
  layeredChunkNames: Set<string>,
  layerPrefix: string,
  localPrefix: string
): string => {
  const result = applyTextEdits(
    content,
    getChunkImportEdits(content, getChunkPrefixFor(layeredChunkNames, layerPrefix, localPrefix))
  );
  assertOnlyLayerChunkImportsAbsolute(result);
  return result;
};
