import type { ArchiveItem } from '@stacktape/packaging/runtime-contracts';
import { stat } from 'node:fs/promises';
import { isTimingEnabled, startTiming } from '@utils/timings';
import { createArchive } from '@utils/zip';

/**
 * `archiveItem` for the CLI's packaging, with opt-in timing. The spans are recorded here rather than in `utils/zip.ts`
 * because the deployed service helper bundles that module too, and measurement code must not change what customers
 * deploy.
 *
 * Without `STP_TIMINGS_FILE` this is `createArchive(input).path`, exactly what `archiveItem` in `utils/zip.ts` does.
 * With it, each archive is a `zip:archive` span that records the backend that wrote it.
 */
export const archiveItem: ArchiveItem = async (input) => {
  if (!isTimingEnabled()) return (await createArchive(input)).path;
  const directory = (await stat(input.absoluteSourcePath)).isDirectory();
  const endArchive = startTiming('zip:archive', {
    format: input.format,
    directory,
    parallel: Boolean(input.parallelZip)
  });
  try {
    const result = await createArchive(input);
    endArchive({ backend: result.backend });
    return result.path;
  } catch (error) {
    endArchive({ outcome: 'error' });
    throw error;
  }
};
