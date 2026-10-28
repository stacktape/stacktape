import type { EnvironmentVar } from '@stacktape/config/shared';
import { join } from 'node:path';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { pathExists, readFile, remove, writeFile } from 'fs-extra';
import { assertEnvironmentResolved } from './unresolved-environment';

export const ENV_FILE_NAME = '.env.local';
const BLOCK_START = '# >>> stacktape dev: managed block, rewritten on every dev start >>>';
const BLOCK_END = '# <<< stacktape dev <<<';

/** The environment each frontend's dev server got at its latest start, for the agent's `/env`. */
const frontendEnvironments = new Map<string, Record<string, string>>();

export const getFrontendEnvironment = (name: string): Record<string, string> | undefined =>
  frontendEnvironments.get(name);

/** A value dotenv reads back unchanged: plain URLs, hosts and generated passwords as they are, anything else quoted. */
const formatEnvValue = (value: string): string => {
  if (/^[\w.:/@?&=%+,~*-]*$/.test(value)) return value;
  if (!value.includes('"')) return `"${value.replaceAll('\r', '').replaceAll('\n', '\\n')}"`;
  if (!value.includes("'")) return `'${value}'`;
  return `\`${value}\``;
};

/**
 * The env file with Stacktape's block replaced by one holding `envVars`, or removed when there are none. Everything
 * outside the markers is the developer's and stays as it is. A new block goes to the end, where its values win over
 * earlier lines with the same names.
 */
export const mergeManagedEnvBlock = (existing: string, envVars: Record<string, string>): string => {
  const newline = existing.includes('\r\n') ? '\r\n' : '\n';
  const lines = existing ? existing.split(/\r?\n/) : [];
  const start = lines.indexOf(BLOCK_START);
  const end = start === -1 ? -1 : lines.indexOf(BLOCK_END, start);
  const before = start === -1 ? lines : lines.slice(0, start);
  const after = start === -1 ? [] : end === -1 ? [] : lines.slice(end + 1);
  const entries = Object.entries(envVars);
  const block = entries.length
    ? [BLOCK_START, ...entries.map(([name, value]) => `${name}=${formatEnvValue(value)}`), BLOCK_END]
    : [];
  if (start === -1) {
    if (!block.length) return existing;
    while (before.length && before.at(-1) === '') before.pop();
    return [...before, ...(before.length ? [''] : []), ...block, ''].join(newline);
  }
  return [...before, ...block, ...after].join(newline);
};

/**
 * Resolves a frontend's own environment (`injectEnvironment` of a hosting bucket, `environment` of an SSR or Next.js
 * app), adds the local variables of the resources it lists in `connectTo`, and writes them to the managed block of
 * `<workingDirectory>/.env.local`. The dev server also gets them as process environment, which outranks every env
 * file, including mode-specific ones such as Vite's `.env.development`.
 */
export const prepareFrontendEnvironment = async ({
  name,
  workingDirectory,
  environment,
  connectedEnvVars
}: {
  name: string;
  workingDirectory: string;
  environment?: EnvironmentVar[];
  connectedEnvVars: Record<string, string>;
}): Promise<Record<string, string>> => {
  const envVars: Record<string, string> = { ...connectedEnvVars };
  if (environment?.length) {
    const resolved = await configManager.resolveDirectives<EnvironmentVar[]>({
      itemToResolve: environment,
      resolveRuntime: true,
      useLocalResolve: true
    });
    assertEnvironmentResolved({
      owner: name,
      environment: Object.fromEntries(resolved.map(({ name: varName, value }) => [varName, value])),
      configured: Object.fromEntries(environment.map(({ name: varName, value }) => [varName, value]))
    });
    for (const { name: varName, value } of resolved) envVars[varName] = String(value);
  }
  frontendEnvironments.set(name, envVars);

  const envFilePath = join(workingDirectory, ENV_FILE_NAME);
  const existing = (await pathExists(envFilePath)) ? await readFile(envFilePath, 'utf8') : '';
  if (!existing && !Object.keys(envVars).length) return envVars;
  const merged = mergeManagedEnvBlock(existing, envVars);
  if (merged !== existing) {
    if (merged.trim()) await writeFile(envFilePath, merged);
    else await remove(envFilePath);
  }
  if (Object.keys(envVars).length) {
    tuiManager.info(
      `[${name}] Wrote ${Object.keys(envVars).length} env vars to the Stacktape block of ${ENV_FILE_NAME}`
    );
  }
  return envVars;
};
