import type { LambdaSplitOutput, LayerArtifact, LayerAssignmentResult } from './types';
import { existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { emptyDir, ensureDir, outputJSON, readdir, remove } from 'fs-extra';
import { assertOnlyLayerChunkImportsAbsolute, getChunkImportEdits, getChunkPrefixFor } from './chunk-rewriter';
import { getArchiveLayoutDigest, listArchiveEntries } from '../artifact/archive-entries';
import { getArchiveInventoryChecksum, mergeHashes } from '../artifact/hashing';
import { getFolderSizeBytes } from '../fs/files';
import { writeEditedJavaScript } from '../es/source-map-edits';

/** Where a published layer's chunks are mounted inside a Lambda execution environment. */
const LAYER_CHUNKS_PATH = '/opt/nodejs/chunks/';

/**
 * Create layer artifacts and update lambda packages to use layers.
 *
 * This function:
 * 1. Creates layer directories with the assigned chunks (nodejs/chunks/ structure)
 * 2. Removes layered chunks from lambda packages
 * 3. Rewrites imports: layered chunks use /opt/nodejs/chunks/, local chunks use ./chunks/
 */
export const createLayerArtifacts = async ({
  lambdaOutputs,
  layerAssignment,
  layerBasePath
}: {
  /** Lambda outputs from buildSplitBundle */
  lambdaOutputs: Map<string, LambdaSplitOutput>;
  /** Layer assignment from assignChunksToLayers */
  layerAssignment: LayerAssignmentResult;
  /** Base path for layer directories (e.g., /build/layers/) */
  layerBasePath: string;
}): Promise<{
  /** Layer artifacts with paths and content hashes */
  layerArtifacts: LayerArtifact[];
}> => {
  const layeredChunkNames = new Set(layerAssignment.layeredChunks.map((c) => c.chunkName));

  // Create all layers in parallel
  const layerArtifacts = await Promise.all(
    layerAssignment.layers.map(async (layer) => {
      const layerDir = join(layerBasePath, `layer-${layer.layerNumber}`);
      const layerChunksDir = join(layerDir, 'nodejs', 'chunks');
      // Layer numbers are stable across rebuilds while content hashes are not. Clear the prior publishable tree so a
      // changed chunk graph cannot leave obsolete bytes in the next layer ZIP or content digest.
      await emptyDir(layerDir);
      await ensureDir(layerChunksDir);

      // Copy all chunks to layer in parallel
      await Promise.all(
        layer.chunks.map(async (chunkName) => {
          const chunkAssignment = layerAssignment.layeredChunks.find((c) => c.chunkName === chunkName);
          if (!chunkAssignment) return;

          // The layer's copy of the chunk's map moves with the edits and omits `sourcesContent`; the shared outdir
          // keeps the full map.
          const content = await writeEditedJavaScript({
            from: chunkAssignment.chunkPath,
            to: join(layerChunksDir, chunkName),
            edits: (code) => getChunkImportEdits(code, getChunkPrefixFor(layeredChunkNames, LAYER_CHUNKS_PATH, './')),
            packaged: true
          });
          assertOnlyLayerChunkImportsAbsolute(content);
        })
      );

      // Create package.json for ESM support in layer
      await outputJSON(join(layerDir, 'nodejs', 'package.json'), { type: 'module' });

      // Hash and measure the final publishable tree, including rewritten code, source maps, and package metadata.
      const [{ entries }, sizeBytes] = await Promise.all([
        listArchiveEntries({ sourcePath: layerDir }),
        getFolderSizeBytes(layerDir)
      ]);
      const directoryChecksum = await getArchiveInventoryChecksum(entries);

      return {
        layerNumber: layer.layerNumber,
        layerPath: layerDir,
        chunks: layer.chunks,
        sizeBytes,
        // The layer's S3 key is built from this hash, so it carries the archive layout too: a layer zipped under
        // older rules gets a new key instead of being reused.
        contentHash: mergeHashes(directoryChecksum, getArchiveLayoutDigest(entries)).slice(0, 12)
      };
    })
  );

  // Update all lambda packages in parallel
  await updateLambdaPackages(lambdaOutputs, layeredChunkNames);

  return { layerArtifacts };
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

      // Rewrite imports in entry file, and in its map
      const entryContent = await writeEditedJavaScript({
        from: output.entryFile,
        to: output.entryFile,
        edits: (code) =>
          getChunkImportEdits(code, getChunkPrefixFor(layeredChunkNames, LAYER_CHUNKS_PATH, './chunks/')),
        packaged: true
      });
      assertOnlyLayerChunkImportsAbsolute(entryContent);

      // Rewrite imports in remaining (non-layered) chunks in parallel
      if (existsSync(lambdaChunksDir)) {
        const remainingFiles = await readdir(lambdaChunksDir).catch(() => [] as string[]);
        const remainingChunks = remainingFiles.filter((f) => f.endsWith('.js'));

        await Promise.all(
          remainingChunks.map(async (chunkFile) => {
            const chunkPath = join(lambdaChunksDir, chunkFile);
            if (existsSync(chunkPath)) {
              const content = await writeEditedJavaScript({
                from: chunkPath,
                to: chunkPath,
                edits: (code) =>
                  getChunkImportEdits(code, getChunkPrefixFor(layeredChunkNames, LAYER_CHUNKS_PATH, './')),
                packaged: true
              });
              assertOnlyLayerChunkImportsAbsolute(content);
            }
          })
        );
      }

      // Update the files list to remove layered chunks
      output.files = output.files.filter((f) => !layeredChunkNames.has(basename(f)));
    })
  );
};
