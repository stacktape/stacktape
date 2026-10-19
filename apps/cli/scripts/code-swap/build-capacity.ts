import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import Zip from 'adm-zip';
export const buildCapacity = async (directory: string) => {
  const path = resolve(directory);
  await mkdir(path, { recursive: true });
  const result = await Bun.build({
    entrypoints: [resolve(import.meta.dir, 'capacity/handler.ts')],
    target: 'node',
    format: 'cjs',
    minify: true
  });
  if (!result.success) throw new Error(result.logs.map(({ message }) => message).join('\n'));
  const zip = new Zip();
  zip.addFile('index.js', Buffer.from(await result.outputs[0]!.arrayBuffer()));
  const output = join(path, 'capacity.zip');
  await writeFile(output, zip.toBuffer());
  return output;
};
