/**
 * Putting the composed configuration on disk.
 *
 * **We never overwrite silently.** A configuration already in the repository is someone's work,
 * possibly hand-edited after the last run. The caller decides; this refuses by default.
 *
 * **Both formats come from the serialisers the rest of the product already uses.** `stringifyToYaml`
 * writes the YAML, and `convertYamlToTypescript` — the same function behind Console's config editor
 * and the YAML/TypeScript toggle in the docs — writes the TypeScript. An earlier version of this file
 * hand-rolled both so it could interleave `# why this resource exists` comments, which cost two
 * emitters and a hand-written YAML quoter to maintain. The provenance is still there; it lives in the
 * wizard, next to the resource, where it can link to the line it came from.
 */

import { writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { convertYamlToTypescript } from '@stacktape/config-authoring/converter';
import { stringifyToYaml } from '@utils/yaml';
import prettier from 'prettier';
import type { CompositionResult } from '@stacktape/config-inference/compose';

export type ConfigFormat = 'yaml' | 'typescript';

const CANDIDATE_FILENAMES = ['stacktape.yml', 'stacktape.yaml', 'stacktape.ts'] as const;

/** An existing configuration in the repository, if there is one. */
export const findExistingConfig = (repositoryRoot: string): string | undefined =>
  CANDIDATE_FILENAMES.map((name) => join(repositoryRoot, name)).find((path) => existsSync(path));

export const renderYaml = (composition: CompositionResult): string => stringifyToYaml(composition.config);

/**
 * The same configuration as TypeScript.
 *
 * Goes through YAML rather than straight from the composition because the shared converter takes
 * YAML, and routing both formats through one path is what stops them describing different
 * infrastructure. It also topologically sorts resources so a `connectTo` target is declared before
 * the thing that references it, which the hand-rolled emitter did not do.
 */
export const renderTypeScript = async (composition: CompositionResult): Promise<string> =>
  prettier.format(convertYamlToTypescript(renderYaml(composition)), {
    parser: 'typescript',
    printWidth: 120,
    singleQuote: true
  });

export type WriteConfigResult = {
  /** Where the configuration was written. */
  path: string;
  /** Basename of that file, for anything that has to name it in a sentence. */
  filename: string;
  /**
   * The configuration that was already in the repository, if there was one.
   *
   * It is never modified. Its presence is why `path` is a `.generated.` file, and the caller has to
   * say so — a user who does not notice ends up deploying a file they did not know they had.
   */
  existingPath?: string;
};

const CANONICAL: Record<ConfigFormat, string> = { yaml: 'stacktape.yml', typescript: 'stacktape.ts' };
const ALONGSIDE: Record<ConfigFormat, string> = {
  yaml: 'stacktape.generated.yml',
  typescript: 'stacktape.generated.ts'
};

/**
 * Write the configuration, without ever touching one that is already there.
 *
 * There is no overwrite option, and that is the whole design. A configuration in a repository is
 * someone's work — possibly hand-edited, possibly deployed — and no amount of confirmation makes
 * replacing it from a browser tab a good default. So a second configuration lands beside the first
 * under a name that says what it is, and the person decides what to do with it.
 *
 * A previous `.generated.` file *is* replaced: that one is ours, and leaving a trail of numbered
 * copies would be a worse answer than refreshing the one we wrote last time.
 */
export const writeComposedConfig = async ({
  repositoryRoot,
  composition,
  format = 'yaml'
}: {
  repositoryRoot: string;
  composition: CompositionResult;
  format?: ConfigFormat;
}): Promise<WriteConfigResult> => {
  const existing = findExistingConfig(repositoryRoot);
  const filename = existing === undefined ? CANONICAL[format] : ALONGSIDE[format];
  const path = join(repositoryRoot, filename);

  const contents = format === 'typescript' ? await renderTypeScript(composition) : renderYaml(composition);
  await writeFile(path, contents, 'utf8');
  return { path, filename, ...(existing === undefined ? {} : { existingPath: existing }) };
};
