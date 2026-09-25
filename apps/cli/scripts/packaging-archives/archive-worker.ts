/**
 * One backend's share of the Lambda archive acceptance, in its own process: the driver starts it with a PATH that
 * offers exactly the native tool under test (or none, or a failing one), because the archiver picks its tool once per
 * process. It writes the runtime fixture, archives it through the production archiver the way Lambda packaging does,
 * and prints what each call returned. Paths contain spaces and both kinds of quotes on purpose. It also archives a
 * compressible fixture by default, with an explicit level, and directly with archiver at levels 1, 6 and 9, so the
 * driver can tell which level each backend used.
 *
 *   bun scripts/packaging-archives/archive-worker.ts <output directory>
 */
import { chmod, copyFile, mkdir, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createArchive } from '@utils/zip';

/** The handler reports what Lambda's user can do with each kind of entry the archive has to carry. */
const HANDLER = `import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';

const task = (path) => \`/var/task/\${path}\`;
const mode = (path) => (statSync(task(path)).mode & 0o777).toString(8);

export const handler = async () => ({
  uid: process.getuid(),
  tool: execFileSync(task('bin/tool.sh')).toString().trim(),
  groupOnlyTool: execFileSync(task('bin/group-tool.sh')).toString().trim(),
  otherOnlyTool: execFileSync(task('bin/other-tool.sh')).toString().trim(),
  toolThroughLink: execFileSync(task('tool-link')).toString().trim(),
  throughDirectoryLink: readFileSync(task('current/version.txt'), 'utf8').trim(),
  hidden: readFileSync(task('.hidden-marker'), 'utf8').trim(),
  hiddenDirectory: JSON.parse(readFileSync(task('.config/settings.json'), 'utf8')),
  ownerOnlyOnHost: readFileSync(task('private.txt'), 'utf8').trim(),
  spacedName: readFileSync(task("name with spaces and 'quotes'.txt"), 'utf8').trim(),
  removedPresent: existsSync(task('removed.txt')),
  modes: {
    tool: mode('bin/tool.sh'),
    groupOnlyTool: mode('bin/group-tool.sh'),
    otherOnlyTool: mode('bin/other-tool.sh'),
    ownerOnlyOnHost: mode('private.txt'),
    directory: mode('bin')
  }
});
`;

/** A custom runtime: Lambda executes it directly, so it only runs if the archive made it executable. */
export const BOOTSTRAP = `#!/var/lang/bin/node
const api = \`http://\${process.env.AWS_LAMBDA_RUNTIME_API}/2018-06-01/runtime\`;
for (;;) {
  const next = await fetch(\`\${api}/invocation/next\`);
  const requestId = next.headers.get('lambda-runtime-aws-request-id');
  await next.text();
  await fetch(\`\${api}/invocation/\${requestId}/response\`, {
    method: 'POST',
    body: JSON.stringify({ customRuntime: true, uid: process.getuid() })
  });
}
`;

const file = async (path: string, contents: string, mode = 0o644) => {
  await mkdir(join(path, '..'), { recursive: true });
  await writeFile(path, contents);
  await chmod(path, mode);
};

/**
 * The directory fixture: executables, including ones only the group or others may execute, links to a file and a
 * directory, hidden entries and awkward names.
 */
export const writeRuntimeFixture = async (source: string) => {
  await rm(source, { recursive: true, force: true });
  await file(join(source, 'index.mjs'), HANDLER);
  await file(join(source, 'bin', 'tool.sh'), '#!/bin/sh\necho executable-fixture\n', 0o755);
  // Executable only for the group, or only for others: any execute bit makes the archived file executable for Lambda.
  await file(join(source, 'bin', 'group-tool.sh'), '#!/bin/sh\necho group-executable-fixture\n', 0o654);
  await file(join(source, 'bin', 'other-tool.sh'), '#!/bin/sh\necho other-executable-fixture\n', 0o645);
  await symlink('bin/tool.sh', join(source, 'tool-link'));
  await file(join(source, 'versions', 'v2', 'version.txt'), 'v2\n');
  await symlink('versions/v2', join(source, 'current'));
  await file(join(source, '.hidden-marker'), 'hidden-fixture\n');
  await file(join(source, '.config', 'settings.json'), '{"hidden":true}\n');
  // Readable only by its owner on the build host; Lambda's user must still be able to read it.
  await file(join(source, 'private.txt'), 'private-fixture\n', 0o600);
  await file(join(source, "name with spaces and 'quotes'.txt"), 'spaced-fixture\n');
  await file(join(source, 'removed.txt'), 'removed before the second archive\n');
};

/** Generated JS-like text and JSON: compressible enough that levels 1, 6 and 9 give different archive sizes. */
export const writeLevelFixture = async (source: string) => {
  await rm(source, { recursive: true, force: true });
  const lines = Array.from(
    { length: 4000 },
    (_, index) =>
      `export const value${index} = { id: ${index}, name: 'item-${(index * 7919) % 10007}', enabled: ${index % 3 === 0} };`
  );
  await file(join(source, 'bundle.js'), `${lines.join('\n')}\n`);
  await file(
    join(source, 'data.json'),
    `${JSON.stringify(Array.from({ length: 2000 }, (_, index) => ({ index, hash: ((index * 2654435761) >>> 0).toString(16) })))}\n`
  );
};

const main = async () => {
  const outputDirectory = process.argv[2];
  if (!outputDirectory) throw new Error('Usage: archive-worker.ts <output directory>');
  const source = join(outputDirectory, `source dir 'single' "double"`);
  const destination = join(outputDirectory, 'archives with "quotes" and spaces');
  await writeRuntimeFixture(source);

  // Lambda packaging archives directories with `useNativeZip`; the same destination is written twice, as a rebuild
  // of the same function does, after a file was deleted from the source.
  const first = await createArchive({
    absoluteSourcePath: source,
    absoluteDestDirPath: destination,
    format: 'zip',
    useNativeZip: true
  });
  // The second archive replaces the first at the same path; keep a copy to show what the first one held.
  await copyFile(first.path, join(outputDirectory, 'first archive copy.zip'));
  await rm(join(source, 'removed.txt'));
  const second = await createArchive({
    absoluteSourcePath: source,
    absoluteDestDirPath: destination,
    format: 'zip',
    useNativeZip: true
  });

  // A custom runtime delivered as one file that the host never marked executable.
  const bootstrapPath = join(outputDirectory, 'single file', 'bootstrap');
  await file(bootstrapPath, BOOTSTRAP, 0o644);
  const single = await createArchive({ absoluteSourcePath: bootstrapPath, format: 'zip', useNativeZip: true });

  const levelSource = join(outputDirectory, 'level source');
  await writeLevelFixture(levelSource);
  const levelArchive = async (name: string, options: { useNativeZip: boolean; compressionLevel?: number }) => {
    const result = await createArchive({
      absoluteSourcePath: levelSource,
      absoluteDestDirPath: join(outputDirectory, 'level archives', name),
      format: 'zip',
      ...options
    });
    return { ...result, bytes: (await stat(result.path)).size };
  };
  const levels = {
    byDefault: await levelArchive('default', { useNativeZip: true }),
    override9: await levelArchive('override 9', { useNativeZip: true, compressionLevel: 9 }),
    direct1: await levelArchive('archiver 1', { useNativeZip: false, compressionLevel: 1 }),
    direct6: await levelArchive('archiver 6', { useNativeZip: false, compressionLevel: 6 }),
    direct9: await levelArchive('archiver 9', { useNativeZip: false, compressionLevel: 9 })
  };

  console.log(JSON.stringify({ first, second, single, levels }));
};

if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
