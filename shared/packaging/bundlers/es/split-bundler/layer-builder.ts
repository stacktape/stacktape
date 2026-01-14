/**
 * Layer artifact creation and lambda package updating.
 *
 * Creates the physical layer directories with chunks and updates
 * lambda packages to remove layered chunks and rewrite imports.
 */

import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { copy, ensureDir, outputJSON, readdir, readFile, remove, writeFile } from 'fs-extra';
import { rewriteChunkImportsSelective } from './chunk-rewriter';
import { LAYER_CHUNKS_PATH } from './constants';
import type { LambdaSplitOutput, LayerArtifact, LayerAssignmentResult } from './types';

/**
 * Create layer artifacts and update lambda packages to use layers.
 *
 * This function:
 * 1. Creates layer directories with the assigned chunks (nodejs/chunks/ structure)
 * 2. Removes layered chunks from lambda packages
 * 3. Rewrites imports: layered chunks use /opt/nodejs/chunks/, local chunks use ./chunks/
 *
 * @param lambdaOutputs - Lambda outputs from buildSplitBundle
 * @param layerAssignment - Layer assignment from assignChunksToLayers
 * @param layerBasePath - Base path for layer directories (e.g., /build/layers/)
 * @returns Layer artifacts with paths and content hashes
 */
export const createLayerArtifacts = async ({
  lambdaOutputs,
  layerAssignment,
  layerBasePath
}: {
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  layerAssignment: LayerAssignmentResult;
  layerBasePath: string;
}): Promise<{ layerArtifacts: LayerArtifact[] }> => {
  const layeredChunkNames = new Set(layerAssignment.layeredChunks.map((c) => c.chunkName));

  // Pre-read all chunk files that will be layered (for parallel processing)
  const chunkContentCache = new Map<string, string>();
  await Promise.all(
    layerAssignment.layeredChunks.map(async (chunk) => {
      const content = await readFile(chunk.chunkPath, 'utf-8');
      chunkContentCache.set(chunk.chunkPath, content);
    })
  );

  // Create all layers in parallel
  const layerArtifacts = await Promise.all(
    layerAssignment.layers.map(async (layer) => {
      const layerDir = join(layerBasePath, `layer-${layer.layerNumber}`);
      const layerChunksDir = join(layerDir, 'nodejs', 'chunks');
      await ensureDir(layerChunksDir);

      // Copy all chunks to layer in parallel
      await Promise.all(
        layer.chunks.map(async (chunkName) => {
          const chunkAssignment = layerAssignment.layeredChunks.find((c) => c.chunkName === chunkName);
          if (!chunkAssignment) return;

          const destPath = join(layerChunksDir, chunkName);
          const content = rewriteChunkImportsSelective(
            chunkContentCache.get(chunkAssignment.chunkPath)!,
            layeredChunkNames,
            LAYER_CHUNKS_PATH,
            './'
          );
          await writeFile(destPath, content);

          // Copy source map if exists
          const sourceMapPath = `${chunkAssignment.chunkPath}.map`;
          if (existsSync(sourceMapPath)) {
            await copy(sourceMapPath, `${destPath}.map`);
          }
        })
      );

      // Create package.json for ESM support in layer
      await outputJSON(join(layerDir, 'nodejs', 'package.json'), { type: 'module' });

      // Compute content hash for caching
      const contentHash = computeLayerContentHash(layer.chunks, layerAssignment);

      return {
        layerNumber: layer.layerNumber,
        layerPath: layerDir,
        chunks: layer.chunks,
        sizeBytes: layer.totalSizeBytes,
        contentHash
      };
    })
  );

  // Update all lambda packages in parallel
  await updateLambdaPackages(lambdaOutputs, layeredChunkNames);

  return { layerArtifacts };
};

/**
 * Compute a content-based hash for a layer.
 * Hash is based on chunk names and sizes to ensure re-upload only when content changes.
 */
const computeLayerContentHash = (chunks: string[], layerAssignment: LayerAssignmentResult): string => {
  const chunkInfo = chunks
    .map((chunkName) => {
      const assignment = layerAssignment.layeredChunks.find((c) => c.chunkName === chunkName);
      const size = assignment?.chunkPath ? Bun.file(assignment.chunkPath).size : 0;
      return `${chunkName}:${size}`;
    })
    .sort()
    .join('|');

  return Bun.hash(chunkInfo).toString(16).slice(0, 12);
};

/**
 * Update lambda packages after layer creation.
 * Removes layered chunks and rewrites imports to point to layer paths.
 */
const updateLambdaPackages = async (
  lambdaOutputs: Map<string, LambdaSplitOutput>,
  layeredChunkNames: Set<string>
): Promise<void> => {
  // Process all lambdas in parallel
  await Promise.all(
    Array.from(lambdaOutputs.values()).map(async (output) => {
      const lambdaChunksDir = join(dirname(output.entryFile), 'chunks');

      // Remove layered chunks from lambda's chunks directory in parallel
      await Promise.all(
        Array.from(layeredChunkNames).map(async (chunkName) => {
          const chunkPath = join(lambdaChunksDir, chunkName);
          if (existsSync(chunkPath)) {
            await remove(chunkPath);
            const mapPath = `${chunkPath}.map`;
            if (existsSync(mapPath)) {
              await remove(mapPath);
            }
          }
        })
      );

      // Rewrite imports in entry file
      let entryContent = await readFile(output.entryFile, 'utf-8');
      entryContent = rewriteChunkImportsSelective(entryContent, layeredChunkNames, LAYER_CHUNKS_PATH, './chunks/');
      await writeFile(output.entryFile, entryContent);

      // Rewrite imports in remaining (non-layered) chunks in parallel
      if (existsSync(lambdaChunksDir)) {
        const remainingFiles = await readdir(lambdaChunksDir).catch(() => [] as string[]);
        const remainingChunks = remainingFiles.filter((f) => f.endsWith('.js'));

        await Promise.all(
          remainingChunks.map(async (chunkFile) => {
            const chunkPath = join(lambdaChunksDir, chunkFile);
            if (existsSync(chunkPath)) {
              let content = await readFile(chunkPath, 'utf-8');
              content = rewriteChunkImportsSelective(content, layeredChunkNames, LAYER_CHUNKS_PATH, './');
              await writeFile(chunkPath, content);
            }
          })
        );
      }

      // Update the files list to remove layered chunks
      output.files = output.files.filter((f) => !layeredChunkNames.has(basename(f)));
    })
  );
};
