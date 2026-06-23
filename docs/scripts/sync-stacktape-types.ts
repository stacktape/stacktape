/**
 * Dev-only: copy the freshly built Stacktape npm package (its .d.ts files) into public/stacktape so
 * the CodeBlock's in-browser Twoslash can load `/stacktape/*.d.ts` locally. In production the
 * CodeBlock loads the same types from the jsDelivr CDN, so this is not needed for `astro build`.
 *
 * Mirrors what the old next.config.ts did on dev start.
 */
import { join } from 'node:path';
import { copy, pathExists } from 'fs-extra';

const repoRoot = join(process.cwd(), '..');
const releasePath = join(repoRoot, '__release-npm');
const typesDest = join(process.cwd(), 'public', 'stacktape');

const sync = async () => {
  if (!(await pathExists(releasePath))) {
    console.warn(
      `[sync-stacktape-types] ${releasePath} not found — skipping. Run \`bun run build:npm:main\` in the repo root to generate it for local Twoslash.`
    );
    return;
  }
  await copy(releasePath, typesDest, { overwrite: true });
  console.info('[sync-stacktape-types] Copied Stacktape types into public/stacktape.');
};

sync();
