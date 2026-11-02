import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Type-check each owned CLI program, including newly added smoke-stack projects, and report every failing one. */
export const typecheckCli = (root: string) => {
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
  // `bun check -p` accepts one project per run.
  let status = 0;
  for (const project of projects) {
    const result = spawnSync('bun', ['check', '-p', project], { cwd: root, stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) status = result.status ?? 1;
  }
  return status;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = typecheckCli(fileURLToPath(new URL('..', import.meta.url)));
}
