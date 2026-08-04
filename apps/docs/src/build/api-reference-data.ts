import { existsSync, readFileSync } from 'node:fs';
import { CLI_API_REFERENCE_DATA, generatorHint } from './cli-generated-inputs.ts';

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
const RESOLVED_ID = `\0${API_REFERENCE_DATA_MODULE}`;

/**
 * Expose the CLI's generated API reference to the client bundle as
 * `virtual:stacktape/api-reference-data`.
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
    return id === API_REFERENCE_DATA_MODULE ? RESOLVED_ID : undefined;
  },
  load(id) {
    if (id !== RESOLVED_ID) return undefined;

    if (!existsSync(CLI_API_REFERENCE_DATA)) {
      throw new Error(
        `The API reference needs ${CLI_API_REFERENCE_DATA}, which does not exist. ${generatorHint('generate')}`
      );
    }

    this.addWatchFile(CLI_API_REFERENCE_DATA);
    // Re-serialized rather than inlined verbatim so a malformed artifact fails here, at build time,
    // instead of producing a module that throws in the browser.
    const data: unknown = JSON.parse(readFileSync(CLI_API_REFERENCE_DATA, 'utf8'));

    return `export const apiReferenceDefinitions = ${JSON.stringify(data)};`;
  }
});
