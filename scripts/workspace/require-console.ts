import { access } from 'node:fs/promises';

try {
  await access(new URL('../../apps/console/api/package.json', import.meta.url));
  await access(new URL('../../apps/console/ui/package.json', import.meta.url));
} catch {
  console.error('apps/console is not initialized. Run: git submodule update --init apps/console');
  process.exitCode = 1;
}
