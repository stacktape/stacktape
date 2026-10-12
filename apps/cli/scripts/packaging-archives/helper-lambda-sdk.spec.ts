import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import AdmZip from 'adm-zip';
import { packageHelperLambdas } from '../package-helper-lambdas';
import { loadHelperLambdaDetailsFromDir } from '../../src/utils/helper-lambdas';
import { HELPER_LAMBDAS_FOLDER_NAME } from '../../src/config/project-paths';

test('helper SDK bundling is optional and produces a self-contained Node artifact', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-helper-sdk-'));
  try {
    const defaultDir = join(directory, 'default');
    const bundledDir = join(directory, 'bundled');
    await packageHelperLambdas({ distFolderPath: defaultDir });
    const defaultArtifacts = await loadHelperLambdaDetailsFromDir({
      helperLambdasDir: join(defaultDir, HELPER_LAMBDAS_FOLDER_NAME)
    });
    await packageHelperLambdas({ distFolderPath: bundledDir, bundleAwsSdk: true });
    const bundledArtifacts = await loadHelperLambdaDetailsFromDir({
      helperLambdasDir: join(bundledDir, HELPER_LAMBDAS_FOLDER_NAME)
    });
    const extractedDir = join(directory, 'runtime');
    new AdmZip(bundledArtifacts.stacktapeServiceLambda.artifactPath).extractAllTo(extractedDir);
    // This temporary directory has no node_modules. Node must load and invoke the helper without a runtime SDK.
    const child = Bun.spawn(
      [
        'node',
        '-e',
        `
      process.env.DEV_MODE = 'true';
      const helper = require(process.argv[1]);
      const handler = typeof helper.default === 'function' ? helper.default : helper;
      handler({}, {}, () => {}).then(() => console.log(typeof process.env.DEV_MODE));
    `,
        join(extractedDir, 'index.js')
      ],
      { cwd: extractedDir, stdout: 'pipe', stderr: 'pipe' }
    );
    const [exitCode, stdout, stderr] = await Promise.all([
      child.exited,
      new Response(child.stdout).text(),
      new Response(child.stderr).text()
    ]);
    expect(stderr).toBe('');
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('string');
    expect(bundledArtifacts.stacktapeServiceLambda.digest).not.toBe(defaultArtifacts.stacktapeServiceLambda.digest);
    // Compare packaging modes at the same output path, as a release rebuild does.
    await packageHelperLambdas({ distFolderPath: defaultDir, bundleAwsSdk: false });
    const restoredArtifacts = await loadHelperLambdaDetailsFromDir({
      helperLambdasDir: join(defaultDir, HELPER_LAMBDAS_FOLDER_NAME)
    });
    for (const name of Object.keys(defaultArtifacts))
      expect(restoredArtifacts[name].digest).toBe(defaultArtifacts[name].digest);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 120_000);
