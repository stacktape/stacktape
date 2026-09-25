import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPlatform } from '@utils/bin-executable';
import stripAnsi from 'strip-ansi';
import packageJson from '../package.json';
import { packageHelperLambdas } from './package-helper-lambdas';
import { buildBinaryFile } from './release/build-cli-sources';
import { verifyInteractiveLauncher } from './verify-interactive-launcher';

// Compiles the release entrypoint and checks version/help, nested invocation isolation and removed runner input.
// These paths finish before AWS or announcements initialize. Telemetry is disabled in every child process.
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

    const fixtureDirectory = join(directory, 'nested-invocation');
    const fixtureHome = join(directory, 'home');
    await mkdir(fixtureHome, { recursive: true });
    await cp(join(binaryFolderPath, 'helper-lambdas'), join(fixtureDirectory, '__stacktape-dist/dev/helper-lambdas'), {
      recursive: true
    });
    const nested = Bun.spawnSync({
      cmd: [process.execPath, join(import.meta.dir, 'fixtures/nested-cli-invocation.ts'), binaryPath],
      cwd: fixtureDirectory,
      env: {
        PATH: process.env.PATH,
        SystemRoot: process.env.SystemRoot,
        HOME: fixtureHome,
        USERPROFILE: fixtureHome,
        STP_DEV_MODE: 'true',
        STP_DISABLE_TELEMETRY: '1',
        STP_INVOCATION_ID: 'runner-parent-smoke',
        AWS_EC2_METADATA_DISABLED: 'true'
      },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 60_000
    });
    if (nested.exitCode !== 0) {
      throw new Error(`Nested CLI invocation failed:\n${nested.stdout.toString()}${nested.stderr.toString()}`);
    }
    console.info(nested.stdout.toString().trim());

    const removedRunner = Bun.spawnSync({
      cmd: [
        binaryPath,
        'deploy',
        '--runner',
        'codebuild',
        '--projectName',
        'proof',
        '--stage',
        'proof',
        '--region',
        'eu-west-1'
      ],
      cwd: fixtureDirectory,
      env: {
        HOME: fixtureHome,
        USERPROFILE: fixtureHome,
        STP_DISABLE_TELEMETRY: '1',
        AWS_EC2_METADATA_DISABLED: 'true'
      },
      stdout: 'pipe',
      stderr: 'pipe',
      timeout: 30_000
    });
    const removedRunnerOutput = stripAnsi(`${removedRunner.stdout.toString()}${removedRunner.stderr.toString()}`);
    if (
      removedRunner.exitCode !== 1 ||
      !/runner/i.test(removedRunnerOutput) ||
      !/local/.test(removedRunnerOutput) ||
      !/ec2/.test(removedRunnerOutput)
    ) {
      throw new Error(`Removed CodeBuild runner did not fail with supported alternatives:\n${removedRunnerOutput}`);
    }
    console.info('Verified removed CodeBuild runner fails with the supported local/ec2 alternatives.');

    // Bun provides pseudo-terminals on POSIX hosts only.
    if (platform === 'win') {
      console.info('Skipped the interactive launcher check, which needs a POSIX terminal.');
    } else {
      await verifyInteractiveLauncher({ binaryPath, home: fixtureHome });
      console.info('Verified the interactive launcher draws, redraws for typed input and quits on Ctrl+C.');
    }

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
