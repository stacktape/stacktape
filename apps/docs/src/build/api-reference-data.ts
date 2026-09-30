import { existsSync, readFileSync } from 'node:fs';
import { CLI_API_REFERENCE_DATA, CLI_COMMAND_REFERENCE_DATA, generatorHint } from './cli-generated-inputs.ts';

/**
 * Just the slice of Vite's plugin surface this file uses. Declared structurally so the app needs no
 * direct `vite` dependency, which would pin a second Vite version into the workspace alongside the
 * one Astro brings.
 */
type VirtualModulePlugin = {
  name: string;
  enforce: 'pre';
  resolveId: (id: string) => string | undefined;
  load: (this: { addWatchFile: (id: string) => void }, id: string) => string | undefined;
};

const API_REFERENCE_DATA_MODULE = 'virtual:stacktape/api-reference-data';
const COMMAND_REFERENCE_DATA_MODULE = 'virtual:stacktape/cli-command-reference';
const RESOLVED_ID = `\0${API_REFERENCE_DATA_MODULE}`;
const COMMAND_RESOLVED_ID = `\0${COMMAND_REFERENCE_DATA_MODULE}`;

/**
 * Expose the CLI's generated resource and command references as data modules.
 *
 * This is a reader, not a generator: `apps/cli`'s generation pipeline owns the schema normalization
 * and emits the finished data, so the site cannot drift from the corpus the CLI ships. The file is
 * read with `readFileSync` rather than `createRequire` because Node's module cache would keep
 * serving the first parse, and `astro dev` would then ignore a regenerated artifact despite the
 * watch registration below.
 */
export const apiReferenceDataPlugin = (): VirtualModulePlugin => ({
  name: 'stacktape-api-reference-data',
  enforce: 'pre',
  resolveId(id) {
    if (id === API_REFERENCE_DATA_MODULE) return RESOLVED_ID;
    if (id === COMMAND_REFERENCE_DATA_MODULE) return COMMAND_RESOLVED_ID;
    return undefined;
  },
  load(id) {
    if (id !== RESOLVED_ID && id !== COMMAND_RESOLVED_ID) return undefined;
    const artifact = id === RESOLVED_ID ? CLI_API_REFERENCE_DATA : CLI_COMMAND_REFERENCE_DATA;
    const exportName = id === RESOLVED_ID ? 'apiReferenceDefinitions' : 'cliCommandReference';

    if (!existsSync(artifact)) {
      throw new Error(`The API reference needs ${artifact}, which does not exist. ${generatorHint('generate')}`);
    }

    this.addWatchFile(artifact);
    // Re-serialized rather than inlined verbatim so a malformed artifact fails here, at build time,
    // instead of producing a module that throws in the browser.
    const data: unknown = JSON.parse(readFileSync(artifact, 'utf8'));
    if (id === COMMAND_RESOLVED_ID) {
      if (!data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error(`Invalid CLI command reference in ${artifact}. ${generatorHint('generate')}`);
      }
      for (const [command, args] of Object.entries(data)) {
        if (
          !Array.isArray(args) ||
          args.some((value: unknown) => {
            if (!value || typeof value !== 'object') return true;
            const arg = value as Record<string, unknown>;
            return (
              typeof arg.name !== 'string' ||
              typeof arg.required !== 'boolean' ||
              !Array.isArray(arg.allowedTypes) ||
              arg.allowedTypes.some((allowedType: unknown) => typeof allowedType !== 'string') ||
              (arg.description !== undefined && typeof arg.description !== 'string') ||
              (arg.alias !== undefined && typeof arg.alias !== 'string') ||
              (arg.allowedValues !== undefined &&
                (!Array.isArray(arg.allowedValues) ||
                  arg.allowedValues.some((allowedValue: unknown) => typeof allowedValue !== 'string')))
            );
          })
        ) {
          throw new Error(`Invalid CLI options for ${command} in ${artifact}. ${generatorHint('generate')}`);
        }
      }
    }

    return `export const ${exportName} = ${JSON.stringify(data)};`;
  }
});
