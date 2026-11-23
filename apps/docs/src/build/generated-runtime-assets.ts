import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import {
  STACKTAPE_DECLARATION_FILES,
  STACKTAPE_TYPES_ROUTE,
  TS_LIB_ROUTE,
  twoslashLibFileNames
} from '../components/Mdx/twoslash-types.ts';
import {
  CLI_LLM_DOCS_DIR,
  CLI_STACKTAPE_DECLARATIONS_DIR,
  generatorHint,
  LLM_DISCOVERY_FILES
} from './cli-generated-inputs.ts';

/**
 * Runtime assets that are generated rather than authored, so they are served out of the build
 * instead of being committed into `public/`.
 *
 * Three groups, all sourced locally and served same-origin:
 *
 *  - `/llms*.txt` — the CLI's LLM discovery corpus, copied byte-for-byte.
 *  - `/stacktape/*.d.ts` — the `stacktape` declarations the in-browser Twoslash type-checks the
 *    documentation samples against.
 *  - `/ts-lib/lib.*.d.ts` — the standard library of this workspace's own TypeScript, which Twoslash
 *    needs alongside those declarations.
 *
 * The last two replace what the legacy site fetched from jsDelivr and the TypeScript playground CDN,
 * which is what made its samples describe a published release rather than this checkout. A missing
 * generated input fails the build (and `astro dev` start-up) instead of falling back to a network
 * source.
 */

type Asset = { route: string; sourcePath: string };

const requireNonEmpty = async (sourcePath: string, turboTask: string) => {
  const info = await stat(sourcePath).catch(() => undefined);
  if (!info?.isFile() || info.size === 0) {
    throw new Error(`Missing or empty generated input ${sourcePath}. ${generatorHint(turboTask)}`);
  }
};

/** Directory holding the workspace TypeScript's `lib.*.d.ts` files. */
export const typescriptLibDir = () => dirname(createRequire(import.meta.url).resolve('typescript'));

const typescriptLibAssets = (): Asset[] => {
  const libDir = typescriptLibDir();
  const assets = twoslashLibFileNames()
    .map((name) => ({ route: `${TS_LIB_ROUTE}/${name}`, sourcePath: join(libDir, name) }))
    .filter((asset) => existsSync(asset.sourcePath));
  if (assets.length === 0) {
    throw new Error(`No TypeScript standard library declarations found in ${libDir}.`);
  }
  return assets;
};

/**
 * Resolve the full asset list, failing closed when a generated input is absent. Used by both dev and
 * build so a missing generator output surfaces identically in either mode.
 */
const collectAssets = async (): Promise<Asset[]> => {
  const declarations = STACKTAPE_DECLARATION_FILES.map((name) => ({
    route: `${STACKTAPE_TYPES_ROUTE}/${name}`,
    sourcePath: join(CLI_STACKTAPE_DECLARATIONS_DIR, name)
  }));
  const discovery = LLM_DISCOVERY_FILES.map((name) => ({
    route: `/${name}`,
    sourcePath: join(CLI_LLM_DOCS_DIR, name)
  }));

  await Promise.all([
    ...declarations.map((asset) => requireNonEmpty(asset.sourcePath, 'generate:monaco')),
    ...discovery.map((asset) => requireNonEmpty(asset.sourcePath, 'generate'))
  ]);

  return [...declarations, ...discovery, ...typescriptLibAssets()];
};

export const generatedRuntimeAssets = (): AstroIntegration => ({
  name: 'stacktape-generated-runtime-assets',
  hooks: {
    'astro:config:setup': ({ updateConfig }) => {
      updateConfig({
        vite: {
          plugins: [
            {
              name: 'stacktape-generated-runtime-assets-dev',
              apply: 'serve',
              async configureServer(server) {
                const byRoute = new Map((await collectAssets()).map((asset) => [asset.route, asset.sourcePath]));
                server.middlewares.use((request, response, next) => {
                  const sourcePath = byRoute.get((request.url ?? '').split('?')[0]);
                  if (!sourcePath) {
                    next();
                    return;
                  }
                  void (async () => {
                    try {
                      const contents = await readFile(sourcePath);
                      response.setHeader('content-type', 'text/plain; charset=utf-8');
                      response.end(contents);
                    } catch (error) {
                      next(error);
                    }
                  })();
                });
              }
            }
          ]
        }
      });
    },
    'astro:build:done': async ({ dir, logger }) => {
      const assets = await collectAssets();
      const targets = assets.map((asset) => ({
        sourcePath: asset.sourcePath,
        targetPath: fileURLToPath(new URL(`.${asset.route}`, dir))
      }));

      await Promise.all(
        [...new Set(targets.map((target) => dirname(target.targetPath)))].map((directory) =>
          mkdir(directory, { recursive: true })
        )
      );
      await Promise.all(targets.map((target) => copyFile(target.sourcePath, target.targetPath)));

      logger.info(`Copied ${assets.length} generated runtime assets into the built output.`);
    }
  }
});
