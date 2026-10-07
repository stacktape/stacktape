/**
 * Runs the synthesis-families spec with template output enabled and validates every written template with cfn-lint.
 *
 *   pnpm --filter @stacktape/cli run test:synthesis-families:cfn-lint
 *
 * cfn-lint must be on PATH (CI installs `cfn-lint==1.53.3` with pip; locally `uv tool install cfn-lint==1.53.3`).
 * Only errors fail the run, matching the CI validation of the dense application template.
 */
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const cliRoot = resolve(import.meta.dir, '..', '..');
const cfnLint = Bun.which('cfn-lint');
if (!cfnLint) {
  console.error('cfn-lint is not installed. Install cfn-lint 1.53.3 (for example `uv tool install cfn-lint==1.53.3`).');
  process.exit(1);
}

const main = async () => {
  const outputDirectory = await mkdtemp(join(tmpdir(), 'stacktape-synthesis-families-'));
  try {
    const spec = Bun.spawnSync(['bun', 'test', join(import.meta.dir, 'families.spec.ts')], {
      cwd: cliRoot,
      stdin: 'ignore',
      stdout: 'inherit',
      stderr: 'inherit',
      env: { ...process.env, STACKTAPE_SYNTHESIS_FAMILY_TEMPLATE_OUTPUT_DIR: outputDirectory }
    });
    if (spec.exitCode !== 0) {
      return spec.exitCode ?? 1;
    }
    const templates = (await readdir(outputDirectory)).filter((name) => name.endsWith('.json')).sort();
    if (!templates.length) {
      console.error('The spec wrote no templates.');
      return 1;
    }
    let failed = false;
    for (const template of templates) {
      const lint = Bun.spawnSync(
        [
          cfnLint,
          '--template',
          join(outputDirectory, template),
          '--regions',
          'eu-west-1',
          '--non-zero-exit-code',
          'error'
        ],
        { stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' }
      );
      const output = `${lint.stdout.toString()}${lint.stderr.toString()}`.trim();
      const errors = output.split('\n').filter((line) => /^E\d{4}/.test(line));
      console.log(`cfn-lint ${template}: ${lint.exitCode === 0 ? 'ok' : 'FAILED'} (${errors.length} errors)`);
      if (lint.exitCode !== 0) {
        failed = true;
        console.log(output);
      }
    }
    return failed ? 1 : 0;
  } finally {
    await rm(outputDirectory, { recursive: true, force: true });
  }
};

main().then(
  (exitCode) => process.exit(exitCode),
  (error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
);
