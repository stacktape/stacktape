/**
 * A Nuxt project whose build only writes files.
 *
 * `nuxt generate` prerenders every page into `.output/public` and builds no server, and a top-level `ssr: false` makes
 * that one client-rendered page. Such a build is served from storage and a CDN; a Nuxt server resource would run a
 * Lambda function for files that never change. A project with server routes (`server/api`), or a config that moves the
 * output or renders routes differently, keeps the server resource.
 */

import { posix } from 'node:path';
import type { Citation } from '../facts/citation';
import type { ServiceFactInput } from '../facts/service';
import { maskFile } from './lexical';
import { citeFirstMatchOnly } from './probe';

/** The script a package-manager command runs: `npm run build`, `pnpm build`, `yarn run generate`. */
const RUNS_SCRIPT = /^(?:npm|pnpm|yarn|bun)\s+(?:run\s+)?([\w:.-]+)$/;
/** A build that prerenders the whole site: `nuxt generate`, `nuxi generate`, `nuxt build --prerender`. */
const GENERATES = /\bnux[ti]\s+(?:generate\b|build\b[^&|;]*--prerender\b)/;
/**
 * Settings that move or reshape the generated output, or render some routes another way: a custom `publicDir` or
 * `output`, a Nitro `preset`, `routeRules`. Init cannot tell where the files land or which pages exist, so it keeps the
 * Nuxt server resource, which builds the app itself.
 */
const RESHAPES_OUTPUT = /\b(?:routeRules|publicDir|output|preset|prerender|generate|buildDir|srcDir)\s*:/;
/** `ssr: false` as a property of the config object itself, not of a route rule. */
const topLevelSsrDisabled = (config: string): boolean => {
  const start = config.search(/\bdefineNuxtConfig\s*\(\s*\{|\bexport\s+default\s+\{/);
  if (start === -1) return false;
  const open = config.indexOf('{', start);
  for (const match of config.matchAll(/\bssr\s*:\s*false\b/g)) {
    if (match.index < open) continue;
    const between = config.slice(open, match.index);
    const depth = (between.match(/[{[(]/g)?.length ?? 0) - (between.match(/[}\])]/g)?.length ?? 0);
    if (depth === 1) return true;
  }
  return false;
};
const NUXT_CONFIG = ['nuxt.config.ts', 'nuxt.config.js', 'nuxt.config.mjs'];
/** Nuxt server code a static build leaves out. */
const SERVER_CODE = /^(?:server\/(?:api|routes|middleware)\/|server\/[^/]+\.[cm]?[jt]s$)/;

const within = (directory: string, path: string): string => (directory === '.' ? path : `${directory}/${path}`);

export const markStaticNuxtOutput = async ({
  services,
  files,
  read
}: {
  services: readonly ServiceFactInput[];
  files: readonly string[];
  read: (path: string) => Promise<string | undefined>;
}): Promise<void> => {
  for (const service of services) {
    if (service.framework !== 'nuxt' || service.servesStaticAssets !== undefined) continue;
    const prefix = service.path === '.' ? '' : `${service.path}/`;
    if (files.some((file) => file.startsWith(prefix) && SERVER_CODE.test(file.slice(prefix.length)))) continue;

    const manifestPath = within(service.path, 'package.json');
    // oxlint-disable-next-line no-await-in-loop -- one manifest and one config per Nuxt project.
    const manifest = files.includes(manifestPath) ? await read(manifestPath) : undefined;
    let scripts: Record<string, unknown> = {};
    try {
      scripts = (JSON.parse(manifest ?? '{}') as { scripts?: Record<string, unknown> }).scripts ?? {};
    } catch {
      continue;
    }
    const scriptName = RUNS_SCRIPT.exec(service.buildCommand ?? '')?.[1];
    const script = scriptName === undefined ? service.buildCommand : scripts[scriptName];
    const configPath = NUXT_CONFIG.map((name) => within(service.path, name)).find((path) => files.includes(path));
    // oxlint-disable-next-line no-await-in-loop -- see above.
    const configRaw = configPath === undefined ? undefined : await read(configPath);
    const config = configPath === undefined || configRaw === undefined ? '' : maskFile(configPath, configRaw, 'keep');

    if (config !== '' && RESHAPES_OUTPUT.test(config.replace(/\bssr\s*:\s*false\b/g, ''))) continue;
    let evidence: Citation | undefined;
    if (typeof script === 'string' && GENERATES.test(script) && manifest !== undefined && scriptName !== undefined) {
      evidence = citeFirstMatchOnly(manifestPath, manifest, new RegExp(`"${scriptName}"\\s*:`), 'servesStaticAssets');
    } else if (typeof script === 'string' && GENERATES.test(script)) {
      evidence = service.evidence?.find((citation) => citation.field === 'buildCommand');
    }
    if (evidence === undefined) continue;

    const singlePageApp = topLevelSsrDisabled(config);
    service.exposesHttp = false;
    delete service.port;
    // The start script serves the generated files (`npx serve .output/public`); storage and the CDN do that now.
    delete service.startCommand;
    service.servesStaticAssets = {
      path: posix.join(service.path, '.output/public'),
      ...(singlePageApp ? { singlePageApp: true as const } : {})
    };
    service.evidence = [
      ...(service.evidence ?? []).filter((citation) => citation.field !== 'startCommand'),
      { ...evidence, field: 'servesStaticAssets' }
    ];
  }
};
