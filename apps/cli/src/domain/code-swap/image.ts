import { copyFile, mkdir, readdir, rename } from 'node:fs/promises';
import { join } from 'node:path';

// Keep the invariant supervisor out of the changing application layer. COPY . previously embedded it twice.
export const codeSwapDockerfile = async (context: string, dockerfile: string, supervisor: string) => {
  if (dockerfile.split('COPY . /app').length !== 2 || dockerfile.includes('COPY --from='))
    throw new Error('Code swap requires a fully bundled single-stage image.');
  const entries = await readdir(context);
  if (entries.includes('stacktape-app')) throw new Error('Code-swap image context was not freshly bundled.');
  await mkdir(join(context, 'stacktape-app'));
  for (const entry of entries) await rename(join(context, entry), join(context, 'stacktape-app', entry));
  await copyFile(supervisor, join(context, 'stacktape-supervisor'));
  return dockerfile.replace(
    'COPY . /app',
    'COPY --chmod=755 stacktape-supervisor /stacktape-supervisor\nCOPY stacktape-app/ /app'
  );
};
