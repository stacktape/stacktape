import { createHash } from 'node:crypto';
import { readdir, readFile, lstat } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const sha256 = (bytes: Uint8Array | string) => createHash('sha256').update(bytes).digest('hex');
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
const canonical = (value: Json): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object')
    return `{${Object.keys(value)
      .toSorted()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key]!)}`)
      .join(',')}}`;
  return JSON.stringify(value);
};

/** Runnable files form the code identity; dependencies and all execution settings form the image identity. */
export const createCodeSwapBundle = async (directory: string, baseInputs: Json) => {
  const files: { name: string; bytes: Buffer; executable: boolean }[] = [];
  const visit = async (relative: string) => {
    for (const name of (await readdir(join(directory, relative))).toSorted()) {
      if (name === 'node_modules') continue;
      const path = relative ? `${relative}/${name}` : name;
      // eslint-disable-next-line no-await-in-loop -- Bound directory traversal.
      const stat = await lstat(join(directory, path));
      if (stat.isDirectory()) {
        // eslint-disable-next-line no-await-in-loop -- Bound open files and retain archive order.
        await visit(path);
      } else if (stat.isFile())
        files.push({
          name: path, // eslint-disable-next-line no-await-in-loop -- Read one file at a time.
          bytes: await readFile(join(directory, path)),
          executable: !!(stat.mode & 0o111)
        });
      else throw new Error(`Code swap cannot archive links or special files: ${path}`);
    }
  };
  await visit('');
  if (!files.length) throw new Error('Code swap bundle is empty.');
  const entries: Buffer[] = [];
  for (const file of files) {
    if (!/^[a-zA-Z0-9_./@+-]+$/.test(file.name) || Buffer.byteLength(file.name) > 100)
      throw new Error(`Unsupported code swap archive path: ${file.name}`);
    const header = Buffer.alloc(512);
    header.write(file.name);
    const octal = (value: number, offset: number, length: number) =>
      header.write(value.toString(8).padStart(length - 1, '0') + '\0', offset, length);
    octal(file.executable ? 0o755 : 0o644, 100, 8);
    octal(0, 108, 8);
    octal(0, 116, 8);
    octal(file.bytes.length, 124, 12);
    octal(0, 136, 12);
    header.fill(32, 148, 156);
    header[156] = 48;
    header.write('ustar\0', 257);
    header.write('00', 263);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    entries.push(header, file.bytes, Buffer.alloc((512 - (file.bytes.length % 512)) % 512));
  }
  const tar = Buffer.concat([...entries, Buffer.alloc(1024)]);
  const bytes = gzipSync(tar, { level: 9 });
  return {
    bytes,
    sha256: sha256(bytes),
    codeDigest: sha256(tar),
    baseDigest: sha256(canonical(baseInputs)),
    size: bytes.length
  };
};
