/**
 * Chunk import path rewriting utilities.
 *
 * Handles rewriting of import paths in bundled JavaScript files to point
 * to the correct location (layer path or local path) after code splitting.
 */

import { basename } from 'node:path';

/**
 * Rewrite all chunk import paths in file content to use a new prefix.
 *
 * @param content - File content to process
 * @param newPrefix - New prefix for chunk paths (e.g., "./chunks/" or "./")
 * @returns Modified content with rewritten imports
 */
export const rewriteChunkImports = (content: string, newPrefix: string): string => {
  // Single comprehensive pattern that matches any chunk reference in quoted strings
  // Handles: "/chunks/...", "./chunks/...", "../chunks/...", "chunks/...", just "chunk-xxx.js"
  const result = content.replace(/(["'`])([^"'`]*?)(chunk-[a-z0-9]+\.js)\1/g, (_match, quote, _path, chunkFile) => {
    return `${quote}${newPrefix}${chunkFile}${quote}`;
  });

  // Verify no absolute /chunks/ paths remain (they would fail at runtime)
  if (result.includes('"/chunks/') || result.includes("'/chunks/") || result.includes('`/chunks/')) {
    const matches = result.match(/["'`]\/chunks\/chunk-[a-z0-9]+\.js["'`]/g);
    throw new Error(
      `Failed to rewrite chunk imports. Found unrewritten absolute paths: ${matches?.join(', ') || 'unknown'}`
    );
  }

  return result;
};

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
  const getPrefix = (chunkFile: string) => (layeredChunkNames.has(chunkFile) ? layerPrefix : localPrefix);

  // Single comprehensive pattern that matches any chunk reference and rewrites it
  // This handles: "/chunks/...", "./chunks/...", "../chunks/...", "chunks/...", just "chunk-xxx.js"
  // In any context: from "...", import("..."), require("..."), or standalone strings
  const result = content.replace(/(["'`])([^"'`]*?)(chunk-[a-z0-9]+\.js)\1/g, (_match, quote, _path, chunkFile) => {
    return `${quote}${getPrefix(chunkFile)}${chunkFile}${quote}`;
  });

  // Verify no problematic paths remain
  // Absolute /chunks/ is only valid if it's the layer path (/opt/nodejs/chunks/)
  const badAbsolutePattern = /["'`]\/chunks\/chunk-[a-z0-9]+\.js["'`]/g;
  const badMatches = result.match(badAbsolutePattern);
  if (badMatches && badMatches.length > 0) {
    throw new Error(
      `Failed to rewrite chunk imports selectively. Found unrewritten absolute /chunks/ paths: ${badMatches.join(', ')}`
    );
  }

  return result;
};

/**
 * Find all chunk imports in a file's content.
 *
 * @param content - File content to search
 * @param allChunkPaths - List of all available chunk file paths
 * @returns List of chunk paths that are imported by this file
 */
export const findChunkImports = (content: string, allChunkPaths: string[]): string[] => {
  // Build a map from chunk filename to full path for O(1) lookup
  const chunkNameToPath = new Map<string, string>();
  for (const chunkPath of allChunkPaths) {
    chunkNameToPath.set(basename(chunkPath), chunkPath);
  }

  // Single regex to find all chunk references - much faster than checking each pattern
  const chunkRegex = /["'`][^"'`]*?(chunk-[a-z0-9]+\.js)["'`]/g;
  const foundChunks = new Set<string>();

  let match;
  // eslint-disable-next-line no-cond-assign
  while ((match = chunkRegex.exec(content)) !== null) {
    const chunkName = match[1];
    const chunkPath = chunkNameToPath.get(chunkName);
    if (chunkPath) {
      foundChunks.add(chunkPath);
    }
  }

  return Array.from(foundChunks);
};
