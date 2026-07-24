import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hooksPath = path.join(publicRoot, '.githooks');
const repositories = [publicRoot];
const privateRoot = path.join(publicRoot, 'apps', 'console');

if (existsSync(path.join(privateRoot, '.git'))) {
  repositories.push(privateRoot);
}

for (const repository of repositories) {
  const result = spawnSync('git', ['config', '--local', 'core.hooksPath', hooksPath], {
    cwd: repository,
    encoding: 'utf8'
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
}
