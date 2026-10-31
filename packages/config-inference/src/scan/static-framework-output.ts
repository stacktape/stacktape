/**
 * A Nuxt project whose build only writes files.
 *
 * `nuxt generate` prerenders every page into `.output/public` and builds no server, and `ssr: false` makes that one
 * client-rendered page. Such a build is served from storage and a CDN; a Nuxt server resource would run a Lambda
 * function for files that never change. A project with server routes (`server/api`) needs that server, so it keeps it.
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
const STATIC_PRESET = /\bpreset\s*:\s*['"](?:static|github[-_]pages)['"]/;
const SSR_DISABLED = /\bssr\s*:\s*false\b/;
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

    let evidence: Citation | undefined;
    if (typeof script === 'string' && GENERATES.test(script) && manifest !== undefined && scriptName !== undefined) {
      evidence = citeFirstMatchOnly(manifestPath, manifest, new RegExp(`"${scriptName}"\\s*:`), 'servesStaticAssets');
    } else if (typeof script === 'string' && GENERATES.test(script)) {
      evidence = service.evidence?.find((citation) => citation.field === 'buildCommand');
    } else if (configPath !== undefined && configRaw !== undefined && STATIC_PRESET.test(config)) {
      evidence = citeFirstMatchOnly(configPath, configRaw, STATIC_PRESET, 'servesStaticAssets');
    }
    if (evidence === undefined) continue;

    const singlePageApp = SSR_DISABLED.test(config);
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
