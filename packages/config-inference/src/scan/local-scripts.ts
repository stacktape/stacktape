/**
 * Seed and migrate scripts a developer runs by hand, from `package.json` scripts.
 *
 * An assembler enrichment like the environment scan, because which database a script reaches is only known once the
 * dependencies are final. A script becomes a config `scripts` entry, which is what `stacktape dev` (and its MCP `seed`
 * action) runs against the local databases.
 */

import { posix } from 'node:path';
import type { DependencyFact } from '../facts/dependency';
import type { LocalScriptFact, PackageManager } from '../facts/project-facts';
import { scriptEnvironmentUsage } from './environment-usage';
import type { SourceRead } from './read-source';

/** Script names in the order they win: `seed` over `db:seed` when a manifest has both. */
const SCRIPT_NAMES: ReadonlyArray<{ script: string; name: LocalScriptFact['name'] }> = [
  { script: 'seed', name: 'seed' },
  { script: 'db:seed', name: 'seed' },
  { script: 'migrate', name: 'migrate' },
  { script: 'db:migrate', name: 'migrate' }
];

/** The source file a script body runs: `node scripts/seed.mjs`, `tsx src/db/seed.ts`, `python3 seed.py`. */
const SCRIPT_ENTRY = /(?:^|\s)(?:\.\/)?([\w@-][\w./@-]*\.(?:[cm]?[jt]s|py))(?=\s|$)/;

const MANIFEST_PATH = /(?:^|\/)package\.json$/;
const SKIPPED_MANIFEST = /(?:^|\/)(?:node_modules|test|tests|e2e|examples?|fixtures|docs?)\//;

const RUNNERS: Partial<Record<PackageManager, string>> = { npm: 'npm', pnpm: 'pnpm', yarn: 'yarn', bun: 'bun' };

export const findLocalScripts = async ({
  files,
  dependencies,
  packageManager,
  read
}: {
  files: readonly string[];
  dependencies: readonly DependencyFact[];
  packageManager: PackageManager | undefined;
  read: (repoRelativePath: string) => Promise<SourceRead>;
}): Promise<LocalScriptFact[]> => {
  const runner = RUNNERS[packageManager ?? 'npm'] ?? 'npm';
  const fileSet = new Set(files);
  const scripts: LocalScriptFact[] = [];
  // The repository root first, then packages by depth: a monorepo's root `seed` is the one people run.
  const manifests = files
    .filter((path) => MANIFEST_PATH.test(path) && !SKIPPED_MANIFEST.test(path))
    .toSorted((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  for (const manifest of manifests) {
    // oxlint-disable-next-line no-await-in-loop -- few manifests, read in a stable order.
    const result = await read(manifest);
    if (result.kind !== 'contents') continue;
    let declared: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(result.contents) as { scripts?: unknown };
      if (typeof parsed.scripts === 'object' && parsed.scripts !== null)
        declared = parsed.scripts as Record<string, unknown>;
    } catch {
      continue;
    }
    const directory = posix.dirname(manifest);
    for (const { script, name } of SCRIPT_NAMES) {
      const body = declared[script];
      if (typeof body !== 'string' || scripts.some((existing) => existing.name === name)) continue;
      const entry = SCRIPT_ENTRY.exec(body)?.[1];
      const entryPath = entry === undefined ? undefined : posix.normalize(posix.join(directory, entry));
      const line = result.contents.split(/\r?\n/).findIndex((text) => text.includes(`"${script}"`));
      scripts.push({
        name,
        command: `${runner} run ${script}`,
        directory,
        environmentVariables:
          entryPath === undefined || !fileSet.has(entryPath)
            ? []
            : // oxlint-disable-next-line no-await-in-loop -- one script file per manifest entry.
              await scriptEnvironmentUsage({ entry: entryPath, dependencies, files, read }),
        evidence: line === -1 ? [] : [{ file: manifest, line: line + 1, quote: `"${script}"` }]
      });
    }
  }
  return scripts;
};
