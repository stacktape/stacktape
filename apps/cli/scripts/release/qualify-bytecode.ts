/**
 * Qualifies Bun bytecode for a release target that still ships without it (`BYTECODE_PLATFORMS` in
 * `build-cli-sources.ts`), on that target's own runner.
 *
 *   bun scripts/release/qualify-bytecode.ts build --platform <platform> --out <directory> [--depth 1]
 *   bun scripts/release/qualify-bytecode.ts check --archives <directory> --work <directory> --out <report.json>
 *     [--samples 11] [--package-samples 7] [--package-functions 1,10] [--skip-package]
 *
 * `build` runs where the release builds its archives (ubuntu-latest), because that cross-built executable is what
 * ships. It builds the platform's release archive twice with the release's own `buildDistPackage`: without bytecode
 * into `<directory>/off`, and at `--depth` into `<directory>/depth-1`. It writes `<directory>/build.json`, and fails
 * when the bytecode archive is over its release gate (`MAX_RELEASE_ARCHIVE_BYTES`).
 *
 * `check` runs on the target (`bytecode-qualification.ts`) and fails unless the bytecode executable behaved exactly
 * like the one without it and was clearly faster to start.
 */
import type { SupportedPlatform } from '@utils/platform';
import { createHash } from 'node:crypto';
import { readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import yargsParser from 'yargs-parser';
import packageJson from '../../package.json';
import { buildDistPackage } from '../build-dist-package';
import { runBytecodeQualification } from './bytecode-qualification';
import { ALL_SUPPORTED_PLATFORMS } from './build-cli-sources';
import { EXPECTED_RELEASE_ARCHIVES, MAX_RELEASE_ARCHIVE_BYTES } from './verify-candidate-assets';

const MEBIBYTE = 1024 * 1024;

const build = async ({ platform, out, depth }: { platform: SupportedPlatform; out: string; depth: number }) => {
  const variants = [
    { name: 'off', bytecodeDepth: 'off' as const },
    { name: 'depth-1', bytecodeDepth: depth }
  ];
  const results: Record<string, unknown>[] = [];
  // One build at a time: both write the workspace's OpenTUI native packages when cross-compiling.
  for (const { name, bytecodeDepth } of variants) {
    const { archivePath, platformDistFolderPath } = await buildDistPackage({
      platform,
      version: packageJson.version,
      distFolderPath: join(out, name),
      keepUnarchived: true,
      bytecodeDepth
    });
    const archiveName = basename(archivePath) as (typeof EXPECTED_RELEASE_ARCHIVES)[number];
    const executable = join(platformDistFolderPath, platform === 'win' ? 'stacktape.exe' : 'stacktape');
    const executableBytes = (await readFile(executable)).length;
    results.push({
      variant: name,
      bytecodeDepth,
      archive: archiveName,
      archiveBytes: (await stat(archivePath)).size,
      gateBytes: MAX_RELEASE_ARCHIVE_BYTES[archiveName],
      executableBytes,
      executableSha256: createHash('sha256')
        .update(await readFile(executable))
        .digest('hex')
    });
    await rm(platformDistFolderPath, { recursive: true, force: true });
  }
  await writeFile(
    join(out, 'build.json'),
    `${JSON.stringify({ platform, version: packageJson.version, variants: results }, null, 2)}\n`
  );
  for (const { variant, archive, archiveBytes, gateBytes } of results as {
    variant: string;
    archive: string;
    archiveBytes: number;
    gateBytes: number;
  }[]) {
    const mebibytes = (archiveBytes / MEBIBYTE).toFixed(2);
    console.info(`${variant}: ${archive} ${archiveBytes} B (${mebibytes} MiB), gate ${gateBytes / MEBIBYTE} MiB`);
    if (variant === 'depth-1' && archiveBytes > gateBytes) {
      throw new Error(`${archive} with bytecode is ${archiveBytes} B, over its release gate of ${gateBytes} B.`);
    }
  }
};

const main = async () => {
  const [command] = process.argv.slice(2);
  const args = yargsParser(process.argv.slice(3), {
    string: ['platform', 'out', 'archives', 'work', 'package-functions'],
    number: ['depth', 'samples', 'package-samples'],
    boolean: ['skip-package']
  });
  if (command === 'build') {
    const platform = args.platform as SupportedPlatform;
    if (!ALL_SUPPORTED_PLATFORMS.includes(platform))
      throw new Error(`--platform must be one of ${ALL_SUPPORTED_PLATFORMS}.`);
    if (!args.out) throw new Error('--out is required.');
    await build({ platform, out: resolve(args.out), depth: args.depth ?? 1 });
    return;
  }
  if (command === 'check') {
    if (!args.archives || !args.work || !args.out) throw new Error('--archives, --work and --out are required.');
    const report = await runBytecodeQualification({
      archives: resolve(args.archives),
      work: resolve(args.work),
      samples: args.samples ?? 11,
      packageSamples: args['package-samples'] ?? 7,
      packageFunctions: (args['package-functions'] ?? '1').split(',').map(Number),
      skipPackage: Boolean(args['skip-package'])
    });
    await writeFile(resolve(args.out), `${JSON.stringify(report, null, 2)}\n`);
    console.info(`${report.qualified ? 'Qualified' : 'Not qualified'}: report in ${resolve(args.out)}`);
    if (!report.qualified) process.exitCode = 1;
    return;
  }
  throw new Error('Usage: qualify-bytecode.ts build|check [options]; see the header of this file.');
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
