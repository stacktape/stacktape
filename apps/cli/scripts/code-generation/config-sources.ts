import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIG_PACKAGE_SRC_PATH, RETAINED_AMBIENT_CONFIG_PATH } from 'src/config/project-paths';

/** Package tests and acceptance fixtures are not authored configuration model modules. */
const isConfigModelModule = (file: string) => file.endsWith('.ts') && !file.endsWith('.acceptance.ts');

/**
 * Where the authored configuration model is read from, now that `@stacktape/config` owns it.
 *
 * Generators, documentation extraction and the npm class build refer to config sources by their historical
 * `.d.ts` names — `functions.d.ts`, `__helpers.d.ts` — and those names are recorded in
 * `src/config-sdk/class-config.ts`, which is a published-surface mapping. That logical identity is kept; only
 * the physical location changed. Resolution is deliberately strict: every one of these callers used to fail
 * open, silently emitting nothing when its glob or `readFile` found no source.
 */
/**
 * Historical source names whose module was given an intentional public name in the package's export map.
 * `_root` became the package root and `__helpers` became `./shared`; the logical names stay valid because
 * `class-config.ts` records them as part of the published-surface mapping.
 */
const RENAMED_CONFIG_SOURCES: Record<string, string> = {
  '_root.d.ts': 'config.ts',
  '__helpers.d.ts': 'shared.ts'
};

/** The module holding the shared authored types that resource props inherit from (`ResourceAccessProps`). */
export const SHARED_CONFIG_SOURCE = '__helpers.d.ts';

export const resolveConfigSourceFile = (logicalSourceName: string): string => {
  const moduleName = RENAMED_CONFIG_SOURCES[logicalSourceName] ?? logicalSourceName.replace(/\.d\.ts$/, '.ts');
  const path = join(CONFIG_PACKAGE_SRC_PATH, moduleName);
  if (!existsSync(path)) {
    throw new Error(`No @stacktape/config module for "${logicalSourceName}" (looked for ${path}).`);
  }
  return path;
};

/**
 * Every source that carries configuration declarations, for callers that process the whole model: the package
 * modules plus the CLI's retained resolved/internal declarations in `types/stacktape-config`.
 *
 * Never returns an empty list.
 */
export const listConfigSourceFiles = (): string[] => {
  const packageModules = readdirSync(CONFIG_PACKAGE_SRC_PATH)
    .filter(isConfigModelModule)
    .map((file) => join(CONFIG_PACKAGE_SRC_PATH, file));

  if (packageModules.length === 0) {
    throw new Error(`No configuration modules found in ${CONFIG_PACKAGE_SRC_PATH}.`);
  }

  const retainedAmbient = existsSync(RETAINED_AMBIENT_CONFIG_PATH)
    ? readdirSync(RETAINED_AMBIENT_CONFIG_PATH)
        .filter((file) => file.endsWith('.d.ts'))
        .map((file) => join(RETAINED_AMBIENT_CONFIG_PATH, file))
    : [];

  return [...packageModules, ...retainedAmbient].sort();
};
