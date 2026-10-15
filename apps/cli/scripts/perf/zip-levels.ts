/**
 * Measures Lambda ZIP compression levels on real artifact directories.
 *
 *   pnpm --filter @stacktape/cli run perf:zip-levels -- <label>=<directory> [<label>=<directory> ...] [--runs 5]
 *
 * Each directory is archived with the CLI's own `createArchive`, once per backend (archiver, and `zip` when it is on
 * PATH) and level, `--runs` times. The report gives the median time, the archive size and how long that archive takes
 * to upload at a few connection speeds, so the trade-off between compression time and upload time is visible.
 */
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { createArchive, getAvailableZipTool } from '../../src/utils/zip';

const LEVELS = [1, 3, 6, 9];
const UPLOAD_MEGABITS_PER_SECOND = [10, 50, 200];

const median = (numbers: number[]) => numbers.toSorted((left, right) => left - right)[Math.floor(numbers.length / 2)]!;

const main = async () => {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { runs: { type: 'string', default: '5' } }
  });
  const runs = Number(values.runs);
  const inputs = positionals.map((argument) => {
    const [label, directory] = argument.split('=');
    if (!label || !directory) throw new Error(`Expected <label>=<directory>, got "${argument}".`);
    return { label, directory: resolve(directory) };
  });
  if (inputs.length === 0) throw new Error('Pass at least one <label>=<directory>.');

  const backends = (await getAvailableZipTool()) === 'zip' ? ['archiver', 'zip'] : ['archiver'];
  const outputDirectory = await mkdtemp(join(tmpdir(), 'stacktape-zip-levels-'));

  const rows: string[][] = [];
  try {
    for (const { label, directory } of inputs) {
      for (const backend of backends) {
        for (const level of LEVELS) {
          const durations: number[] = [];
          let bytes = 0;
          for (let run = 0; run < runs; run += 1) {
            const started = performance.now();
            const archive = await createArchive({
              absoluteSourcePath: directory,
              absoluteDestDirPath: outputDirectory,
              fileNameBase: `${label}-${backend}-${level}`,
              format: 'zip',
              compressionLevel: level,
              useNativeZip: backend === 'zip'
            });
            durations.push(performance.now() - started);
            bytes = (await stat(archive.path)).size;
            if (archive.backend !== backend) throw new Error(`${label}: expected ${backend}, got ${archive.backend}.`);
          }
          const milliseconds = median(durations);
          const uploadSeconds = UPLOAD_MEGABITS_PER_SECOND.map((speed) => (bytes * 8) / (speed * 1_000_000));
          rows.push([
            label,
            backend,
            String(level),
            milliseconds.toFixed(0),
            (bytes / 1024 / 1024).toFixed(2),
            ...uploadSeconds.map((seconds) => seconds.toFixed(2)),
            (milliseconds / 1000 + uploadSeconds[1]!).toFixed(2)
          ]);
          console.error(rows.at(-1)!.join(' '));
        }
      }
    }
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }

  const header = [
    'input',
    'backend',
    'level',
    'median ms',
    'MiB',
    ...UPLOAD_MEGABITS_PER_SECOND.map((speed) => `upload s @${speed} Mbit/s`),
    'zip + upload s @50'
  ];
  console.log(`| ${header.join(' | ')} |`);
  console.log(`| ${header.map(() => '---').join(' | ')} |`);
  for (const row of rows) console.log(`| ${row.join(' | ')} |`);
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
