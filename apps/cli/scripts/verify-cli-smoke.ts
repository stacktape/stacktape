import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import stripAnsi from 'strip-ansi';
import packageJson from '../package.json';
import { packageHelperLambdas } from './package-helper-lambdas';
import { buildBinaryFile } from './release/build-cli-sources';

// Compiles the CLI the way a release does and runs the two commands every installation must answer. Neither
// command touches AWS, reads a project, or reaches the network: `version` prints the version compiled into the
// binary, `help` prints the command table, and both are in `commandsWithDisabledAnnouncements`, so neither runs
// the update check or the announcements fetch. Telemetry is switched off so nothing is reported from a check run.
const runBinary = (binaryPath: string, args: string[]) => {
  const result = Bun.spawnSync({
    cmd: [binaryPath, ...args],
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, STP_DISABLE_TELEMETRY: '1' }
  });
  const output = stripAnsi(`${result.stdout.toString()}${result.stderr.toString()}`);
  if (result.exitCode !== 0) {
    throw new Error(`\`stacktape ${args.join(' ')}\` exited with ${result.exitCode}:\n${output}`);
  }
  return output;
};

const expectOutputToContain = ({ args, output, expected }: { args: string[]; output: string; expected: string[] }) => {
  const missing = expected.filter((fragment) => !output.includes(fragment));
  if (missing.length > 0) {
    throw new Error(`\`stacktape ${args.join(' ')}\` did not print ${missing.join(', ')}:\n${output}`);
  }
};

const verifyCliSmoke = async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stacktape-cli-smoke-'));
  const platform = getPlatform();

  try {
    const binaryFolderPath = await buildBinaryFile({
      distFolderPath: directory,
      platform,
      version: packageJson.version
    });
    // Every command loads the helper-Lambda artifacts that sit next to the executable, so the binary on its own
    // is not a runnable installation. Assembling them here is what makes this a check of the release layout.
    await packageHelperLambdas({ distFolderPath: binaryFolderPath });
    const binaryPath = join(binaryFolderPath, platform === 'win' ? 'stacktape.exe' : 'stacktape');

    expectOutputToContain({
      args: ['--version'],
      output: runBinary(binaryPath, ['--version']),
      expected: [`Stacktape version: ${packageJson.version}`]
    });

    // The help table is generated from the command definitions, so a few representative commands prove the
    // binary rendered it rather than printing an empty or truncated shell.
    expectOutputToContain({
      args: ['--help'],
      output: runBinary(binaryPath, ['--help']),
      expected: ['Available commands:', 'deploy', 'delete', 'package', 'CLI Documentation']
    });

    console.info(`Verified compiled ${platform} CLI ${packageJson.version}: version and help output.`);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
};

if (import.meta.main) {
  verifyCliSmoke().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
