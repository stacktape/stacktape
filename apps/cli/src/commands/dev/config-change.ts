import { basename } from 'node:path';

export type ConfigChange = { changed: false } | { changed: true; reason: string };

/** The configuration as text with object keys sorted, so key order and formatting do not count as a change. */
const canonicalJson = (value: unknown) =>
  JSON.stringify(value, (_key, item: unknown) =>
    item && typeof item === 'object' && !Array.isArray(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map((key) => [key, (item as Record<string, unknown>)[key]])
        )
      : item
  );

/**
 * A `$This()` directive that can read the scripts: `$This().scripts...`, or `$This()` alone, the whole configuration.
 * `$This().resources...` cannot.
 */
const READS_SCRIPTS = /\$This\(\s*\)(?!\s*\.\s*(?!scripts\b)\w)/;

/**
 * The configuration without its `scripts`: scripts run only on request (`seed` reads them from the file each time), so
 * adding or editing one changes nothing that the running session deployed or started. When another part of the
 * configuration reads them through `$This()`, they count like the rest.
 */
const withoutScripts = (config: unknown) => {
  if (!config || typeof config !== 'object' || Array.isArray(config)) return config;
  const { scripts: _scripts, ...rest } = config as Record<string, unknown>;
  return READS_SCRIPTS.test(JSON.stringify(rest)) ? config : rest;
};

/**
 * Tells whether the configuration file now describes something else than the session started with. A rebuild deploys
 * code only: the dev stack, the functions' settings and the local resources keep the configuration of the start.
 * Changes to `scripts` alone apply without a restart.
 */
export const createConfigChangeDetector = ({
  configPath,
  sessionConfig,
  loadConfig
}: {
  configPath: string;
  /** The configuration the session loaded when it started. */
  sessionConfig: unknown;
  /** Loads the configuration file again, executing a TypeScript or JavaScript configuration again. */
  loadConfig: () => Promise<unknown>;
}): (() => Promise<ConfigChange>) => {
  const reference = canonicalJson(withoutScripts(sessionConfig));
  const file = basename(configPath);
  return async () => {
    try {
      if (canonicalJson(withoutScripts(await loadConfig())) === reference) return { changed: false };
      return {
        changed: true,
        reason: `${file} changed after dev mode started. A rebuild deploys code only; restart dev mode to apply the configuration.`
      };
    } catch (error) {
      return {
        changed: true,
        reason: `${file} changed after dev mode started and no longer loads: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  };
};
