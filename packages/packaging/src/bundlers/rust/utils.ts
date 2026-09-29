import { dirname, isAbsolute, join, parse, relative, resolve } from 'node:path';
import { existsSync, readFileSync } from 'node:fs';
import { parse as parseToml } from 'smol-toml';
import { STACKTAPE_LANGUAGE_SOURCE_GLOBS } from '../../artifact/language-build-context';
import { getBundleDigestFromGlobs, getSourceFilesFromGlobs } from '../digest';
import { transformToUnixPath } from '../../fs/files';

const FILE_GLOBS = [...STACKTAPE_LANGUAGE_SOURCE_GLOBS, '!./**/target', '!./**/target/**'];
const EXTRA_FILES = ['Cargo.toml', 'Cargo.lock', 'rust-toolchain', 'rust-toolchain.toml', '.cargo/config.toml'];

export const getBundleDigest = ({
  rootPath,
  additionalDigestInput,
  rawEntryfilePath,
  lambdaZip
}: {
  rootPath: string;
  additionalDigestInput?: string | undefined;
  rawEntryfilePath: string;
  lambdaZip?: boolean | undefined;
}) =>
  getBundleDigestFromGlobs({
    rootPath,
    fileGlobs: FILE_GLOBS,
    extraFiles: EXTRA_FILES,
    externalDependencies: [],
    additionalDigestInput,
    rawEntryfilePath,
    lambdaZip
  });

export const getSourceFiles = ({ rootPath }: { rootPath: string }) =>
  getSourceFilesFromGlobs({ rootPath, fileGlobs: FILE_GLOBS, extraFiles: EXTRA_FILES });

type CargoManifest = {
  workspace?: unknown;
  package?: { name?: string } | undefined;
  bin?: { name?: string; path?: string }[] | undefined;
};

const readCargoManifest = (path: string): CargoManifest => parseToml(readFileSync(path, 'utf8')) as CargoManifest;

/**
 * Where a Rust Lambda is built from and what cargo-lambda must build. The crate is the nearest `Cargo.toml` above
 * the entry file. The build root is the nearest ancestor `Cargo.toml` with a `[workspace]` table, so that workspace
 * members and the shared `Cargo.lock` are in the Docker context; a crate outside a workspace is its own build root.
 * The binary is the `[[bin]]` whose `path` is the entry file; otherwise cargo's auto-discovery names decide:
 * `src/bin/<name>.rs` and `src/bin/<name>/main.rs` are `<name>`, and `src/main.rs` is the package.
 */
export const resolveRustCrate = ({
  cwd,
  entryfilePath
}: {
  cwd: string;
  entryfilePath: string;
}): { buildRoot: string; crateRoot: string; packageName: string; binaryName: string } => {
  const absoluteCwd = resolve(cwd);
  const absoluteEntryfilePath = isAbsolute(entryfilePath) ? resolve(entryfilePath) : resolve(cwd, entryfilePath);
  const filesystemRoot = parse(absoluteEntryfilePath).root;
  let crateRoot: string | undefined;
  let buildRoot: string | undefined;
  let candidate = dirname(absoluteEntryfilePath);
  while (true) {
    const manifestPath = join(candidate, 'Cargo.toml');
    if (existsSync(manifestPath)) {
      const manifest = readCargoManifest(manifestPath);
      if (crateRoot === undefined && manifest.package !== undefined) crateRoot = candidate;
      if (manifest.workspace !== undefined) {
        buildRoot = candidate;
        break;
      }
    }
    if (candidate === absoluteCwd || candidate === filesystemRoot) break;
    candidate = dirname(candidate);
  }
  if (crateRoot === undefined) {
    throw new Error(
      `No Cargo.toml with a [package] table was found between ${entryfilePath} and the Stacktape config directory.`
    );
  }
  const manifest = readCargoManifest(join(crateRoot, 'Cargo.toml'));
  const entryRelativeToCrate = transformToUnixPath(relative(crateRoot, absoluteEntryfilePath));
  const declaredBinary = (manifest.bin ?? []).find(
    (bin) => bin.path !== undefined && transformToUnixPath(bin.path).replace(/^\.\//, '') === entryRelativeToCrate
  );
  const discovered =
    entryRelativeToCrate.match(/^src\/bin\/([^/]+)\.rs$/)?.[1] ??
    entryRelativeToCrate.match(/^src\/bin\/([^/]+)\/main\.rs$/)?.[1];
  const packageName = manifest.package?.name;
  const binaryName = declaredBinary?.name ?? discovered ?? packageName;
  if (!binaryName || !packageName) {
    throw new Error(`Cargo.toml in ${crateRoot} declares no package name and no [[bin]] for ${entryRelativeToCrate}.`);
  }
  return { buildRoot: buildRoot ?? crateRoot, crateRoot, packageName, binaryName };
};
