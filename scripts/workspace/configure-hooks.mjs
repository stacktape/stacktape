import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const hooksPath = path.join(publicRoot, '.githooks');
const privateRoot = path.join(publicRoot, 'apps', 'console');

// Installing from an exported copy of the sources (release tarball, CI artifact, container build context) is a
// supported state and has no repository to configure hooks for.
const repositories = [publicRoot, privateRoot].filter((directory) => existsSync(path.join(directory, '.git')));

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
