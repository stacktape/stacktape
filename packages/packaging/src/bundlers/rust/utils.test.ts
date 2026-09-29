import { afterEach, describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveRustCrate } from './utils';

const temporaryDirectories: string[] = [];
afterEach(async () => {
  await Promise.all(temporaryDirectories.map((directory) => rm(directory, { force: true, recursive: true })));
  temporaryDirectories.length = 0;
});

const createRoot = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stacktape-rust-'));
  temporaryDirectories.push(root);
  return root;
};
const write = async (root: string, path: string, contents: string) => {
  await mkdir(join(root, path, '..'), { recursive: true });
  await writeFile(join(root, path), contents);
};

describe('resolveRustCrate', () => {
  test('builds a single crate from its own root and names the binary after the package', async () => {
    const root = await createRoot();
    await write(root, 'Cargo.toml', '[package]\nname = "rust-lambda-api"\nversion = "0.1.0"\n');
    await write(root, 'src/main.rs', 'fn main() {}\n');

    expect(resolveRustCrate({ cwd: root, entryfilePath: 'src/main.rs' })).toEqual({
      buildRoot: root,
      crateRoot: root,
      packageName: 'rust-lambda-api',
      binaryName: 'rust-lambda-api'
    });
  });

  test('builds a workspace member from the workspace root so the shared lock and siblings are in the context', async () => {
    const root = await createRoot();
    await write(root, 'Cargo.toml', '[workspace]\nmembers = ["crates/*"]\n');
    await write(
      root,
      'crates/api/Cargo.toml',
      '[package]\nname = "api"\n\n[[bin]]\nname = "handler"\npath = "src/bin/handler.rs"\n'
    );
    await write(root, 'crates/api/src/bin/handler.rs', 'fn main() {}\n');
    await write(root, 'crates/api/src/main.rs', 'fn main() {}\n');

    expect(resolveRustCrate({ cwd: root, entryfilePath: 'crates/api/src/bin/handler.rs' })).toEqual({
      buildRoot: root,
      crateRoot: join(root, 'crates', 'api'),
      packageName: 'api',
      binaryName: 'handler'
    });
    expect(resolveRustCrate({ cwd: root, entryfilePath: 'crates/api/src/main.rs' }).binaryName).toBe('api');
  });

  test('names cargo auto-discovered binaries after their file or directory, not the package', async () => {
    const root = await createRoot();
    await write(root, 'Cargo.toml', '[package]\nname = "multi"\n');
    await write(root, 'src/main.rs', 'fn main() {}\n');
    await write(root, 'src/bin/worker.rs', 'fn main() {}\n');
    await write(root, 'src/bin/scheduler/main.rs', 'fn main() {}\n');

    expect(resolveRustCrate({ cwd: root, entryfilePath: 'src/bin/worker.rs' }).binaryName).toBe('worker');
    expect(resolveRustCrate({ cwd: root, entryfilePath: 'src/bin/scheduler/main.rs' }).binaryName).toBe('scheduler');
    expect(resolveRustCrate({ cwd: root, entryfilePath: 'src/main.rs' }).binaryName).toBe('multi');
  });

  test('does not look above the Stacktape config directory and fails without a package manifest', async () => {
    const root = await createRoot();
    await write(root, 'Cargo.toml', '[workspace]\nmembers = ["app"]\n');
    await write(root, 'app/Cargo.toml', '[package]\nname = "app"\n');
    await write(root, 'app/src/main.rs', 'fn main() {}\n');

    expect(resolveRustCrate({ cwd: join(root, 'app'), entryfilePath: 'src/main.rs' }).buildRoot).toBe(
      join(root, 'app')
    );
    await write(root, 'plain/src/main.rs', 'fn main() {}\n');
    expect(() => resolveRustCrate({ cwd: root, entryfilePath: 'plain/src/main.rs' })).toThrow('No Cargo.toml');
  });
});
