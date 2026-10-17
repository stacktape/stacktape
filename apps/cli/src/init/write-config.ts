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

import { readFile, writeFile } from 'node:fs/promises';
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
  /**
   * The `stacktape` dev dependency a TypeScript config needs, when init added or changed it in `package.json`.
   *
   * `stacktape.ts` imports the resource classes from `stacktape`, and the editor needs the package for its types.
   * Pinned to the CLI that wrote the file, so the classes and the CLI that loads them agree.
   */
  devDependency?: { specifier: string; previousVersion?: string; installCommand: string };
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
  format = 'yaml',
  stacktapeVersion
}: {
  repositoryRoot: string;
  composition: CompositionResult;
  format?: ConfigFormat;
  /** The running CLI's version. A TypeScript config in a project with a `package.json` depends on it. */
  stacktapeVersion?: string;
}): Promise<WriteConfigResult> => {
  const existing = findExistingConfig(repositoryRoot);
  const filename = existing === undefined ? CANONICAL[format] : ALONGSIDE[format];
  const path = join(repositoryRoot, filename);

  const contents = format === 'typescript' ? await renderTypeScript(composition) : renderYaml(composition);
  await writeFile(path, contents, 'utf8');
  const devDependency =
    format === 'typescript' && stacktapeVersion !== undefined
      ? await pinStacktapeDevDependency({ repositoryRoot, version: stacktapeVersion })
      : undefined;
  return {
    path,
    filename,
    ...(existing === undefined ? {} : { existingPath: existing }),
    ...(devDependency === undefined ? {} : { devDependency })
  };
};

const INSTALL_COMMANDS: ReadonlyArray<{ lockfile: string; command: string }> = [
  { lockfile: 'pnpm-lock.yaml', command: 'pnpm install' },
  { lockfile: 'yarn.lock', command: 'yarn install' },
  { lockfile: 'bun.lock', command: 'bun install' },
  { lockfile: 'bun.lockb', command: 'bun install' }
];

/**
 * Add `stacktape@<version>` to the project's dev dependencies, or move an older pin to it.
 *
 * Only for a JavaScript or TypeScript project, one with a `package.json`. Elsewhere the CLI serves the import from
 * its own authoring runtime, and adding a Node manifest to a Go or Python repository would be clutter. Nothing is
 * installed here: init never runs the project's package manager, so the user is told the command instead.
 */
const pinStacktapeDevDependency = async ({
  repositoryRoot,
  version
}: {
  repositoryRoot: string;
  version: string;
}): Promise<WriteConfigResult['devDependency']> => {
  const manifestPath = join(repositoryRoot, 'package.json');
  if (!existsSync(manifestPath)) return undefined;
  const raw = await readFile(manifestPath, 'utf8');
  let manifest: Record<string, unknown>;
  try {
    manifest = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // A manifest init cannot parse is not one it should rewrite.
    return undefined;
  }
  const section = (name: 'dependencies' | 'devDependencies') =>
    typeof manifest[name] === 'object' && manifest[name] !== null
      ? (manifest[name] as Record<string, string>)
      : undefined;
  const declared = section('dependencies')?.stacktape ?? section('devDependencies')?.stacktape;
  if (declared === version) return undefined;
  if (section('dependencies')?.stacktape !== undefined) {
    section('dependencies')!.stacktape = version;
  } else {
    manifest.devDependencies = { ...section('devDependencies'), stacktape: version };
  }
  const indentation = /^([ \t]+)"/m.exec(raw)?.[1] ?? '  ';
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, indentation)}\n`, 'utf8');
  return {
    specifier: `stacktape@${version}`,
    ...(declared === undefined ? {} : { previousVersion: declared }),
    installCommand:
      INSTALL_COMMANDS.find(({ lockfile }) => existsSync(join(repositoryRoot, lockfile)))?.command ?? 'npm install'
  };
};
