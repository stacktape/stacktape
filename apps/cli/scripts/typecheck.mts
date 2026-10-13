import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Compile each owned CLI program, including newly added smoke-stack projects. */
export const typecheckCli = (root: string) => {
  const compiler = createRequire(new URL('../../../package.json', import.meta.url)).resolve('typescript/bin/tsc');
  const projects = ['tsconfig.json', 'tests/tsconfig.json', '@generated/tsconfig.json'];
  for (const entry of readdirSync(join(root, '_test-stacks'), { withFileTypes: true })) {
    const config = join('_test-stacks', entry.name, 'tsconfig.json');
    // Independently installed fixture applications own their dependencies and compilation.
    if (
      entry.isDirectory() &&
      existsSync(join(root, config)) &&
      !existsSync(join(root, '_test-stacks', entry.name, 'package.json'))
    ) {
      projects.push(config);
    }
  }
  for (const project of projects) {
    const result = spawnSync(process.execPath, [compiler, '-p', project], { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) return result.status ?? 1;
  }
  return 0;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = typecheckCli(fileURLToPath(new URL('..', import.meta.url)));
}
