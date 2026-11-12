import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { hashReleasePath } from './hash-path';

describe('hashReleasePath', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'release-hash-'));
    await mkdir(join(root, 'migrations', 'nested'), { recursive: true });
    await writeFile(join(root, 'migrations', '001.sql'), 'one');
    await writeFile(join(root, 'migrations', 'nested', '002.sql'), 'two');
    await writeFile(join(root, 'other.txt'), 'other');
  });

  afterEach(() => rm(root, { recursive: true, force: true }));

  const hashOf = async (path = 'migrations') => {
    const hash = createHash('sha256');
    await hashReleasePath({ root, path, hash });
    return hash.digest('hex');
  };

  test('is the same on every platform: files in the order of their names with forward slashes', async () => {
    await mkdir(join(root, 'mixed', 'a'), { recursive: true });
    await writeFile(join(root, 'mixed', 'a', 'x.sql'), 'inside');
    await writeFile(join(root, 'mixed', 'a1.sql'), 'beside');
    // `/` sorts before `1`, and `\` sorts after it, so sorting the platform's paths would differ on Windows.
    const expected = createHash('sha256')
      .update('mixed/a/x.sql\0inside\0')
      .update('mixed/a1.sql\0beside\0')
      .digest('hex');
    expect(await hashOf('mixed')).toBe(expected);
  });

  test('treats CRLF and LF checkouts of a file as the same content, and keeps a lone CR', async () => {
    await writeFile(join(root, 'migrations', '001.sql'), 'one\ntwo\n');
    const unix = await hashOf();
    await writeFile(join(root, 'migrations', '001.sql'), 'one\r\ntwo\r\n');
    expect(await hashOf()).toBe(unix);
    await writeFile(join(root, 'migrations', '001.sql'), 'one\rtwo\n');
    expect(await hashOf()).not.toBe(unix);
  });

  test('stays the same when nothing in the path changed', async () => {
    const before = await hashOf();
    await writeFile(join(root, 'other.txt'), 'changed');
    expect(await hashOf()).toBe(before);
  });

  test('changes with a changed, added, deleted or renamed file', async () => {
    const original = await hashOf();
    await writeFile(join(root, 'migrations', '001.sql'), 'changed');
    const changed = await hashOf();
    expect(changed).not.toBe(original);
    await writeFile(join(root, 'migrations', '003.sql'), 'three');
    const added = await hashOf();
    expect(added).not.toBe(changed);
    await rm(join(root, 'migrations', '003.sql'));
    expect(await hashOf()).toBe(changed);
    await rm(join(root, 'migrations', 'nested', '002.sql'));
    const deleted = await hashOf();
    expect(deleted).not.toBe(changed);
    await rename(join(root, 'migrations', '001.sql'), join(root, 'migrations', '004.sql'));
    expect(await hashOf()).not.toBe(deleted);
  });

  test('hashes a single file', async () => {
    const before = await hashOf('other.txt');
    await writeFile(join(root, 'other.txt'), 'changed');
    expect(await hashOf('other.txt')).not.toBe(before);
  });

  test('explains a path that does not exist', async () => {
    await expect(hashOf('missing')).rejects.toThrow(/`missing` does not exist/);
  });
});
