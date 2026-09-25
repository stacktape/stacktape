import type { ArchiveItem } from '@stacktape/packaging/runtime-contracts';
import { stat } from 'node:fs/promises';
import { isTimingEnabled, startTiming } from '@utils/timings';
import { createArchive, getAvailableZipTool } from '@utils/zip';

let detectionTimed = false;

/**
 * `archiveItem` for the CLI's packaging, with opt-in timing. The spans are recorded here rather than in `utils/zip.ts`
 * because the deployed service helper bundles that module too, and measurement code must not change what customers
 * deploy.
 *
 * Without `STP_TIMINGS_FILE` this is `createArchive(input).path`, exactly what `archiveItem` in `utils/zip.ts` does.
 * With it, each archive is a `zip:archive` span that records the backend that wrote it. The first ZIP of a directory
 * that may use a native tool also times the tool detection on its own, as `zip:detect-native-tool`, just before that
 * archive instead of inside it. Detection still runs once per process: the archive reuses its cached result.
 */
export const archiveItem: ArchiveItem = async (input) => {
  if (!isTimingEnabled()) return (await createArchive(input)).path;
  const directory = (await stat(input.absoluteSourcePath)).isDirectory();
  if (!detectionTimed && input.format === 'zip' && input.useNativeZip && directory) {
    detectionTimed = true;
    const endDetection = startTiming('zip:detect-native-tool');
    endDetection({ tool: await getAvailableZipTool() });
  }
  const endArchive = startTiming('zip:archive', {
    format: input.format,
    directory,
    native: Boolean(input.useNativeZip)
  });
  try {
    const result = await createArchive(input);
    endArchive({ backend: result.backend, nativeFailed: Boolean(result.nativeFailure) });
    return result.path;
  } catch (error) {
    endArchive({ outcome: 'error' });
    throw error;
  }
};
