import { afterAll, afterEach, beforeAll, describe, expect, spyOn, test } from 'bun:test';
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readdir,
  readFile,
  readlink,
  rm,
  stat,
  symlink,
  writeFile
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { crc32 } from 'node:zlib';
import { listArchiveEntries } from '@stacktape/packaging/artifact/archive-entries';
import { createArchive } from '@utils/zip';
import { assetReplacer, replaceBytes, replaceInFiles } from './asset-replacer';
import { extractFunctionArchive } from './asset-replacer-archive';

/** Links, execute bits and FIFO modes are POSIX fixtures; the Lambda that runs this code is Linux. */
const isPosix = process.platform !== 'win32';

// Fixed now: the resolver tests below point TMPDIR elsewhere to watch the resolver's own workspace.
const TEST_BASE = tmpdir();
const roots: string[] = [];
const createRoot = async () => {
  const root = await mkdtemp(join(TEST_BASE, 'stp-asset-replacer-test-'));
  roots.push(root);
  return root;
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

const file = async (path: string, contents: string | Buffer, mode = 0o644) => {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, contents);
  await chmod(path, mode);
};

/**
 * A ZIP with exactly the given entries, stored uncompressed and marked as made on Unix: the shapes the production
 * archiver never writes, such as escaping names, repeated paths, FIFOs or encrypted entries.
 */
const craftZip = (entries: { name: string; data?: string; mode: number; flags?: number }[]) => {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name, data = '', mode, flags = 0 } of entries) {
    const nameBytes = Buffer.from(name, 'utf8');
    const plain = Buffer.from(data, 'utf8');
    // An encrypted stored entry starts with a 12-byte encryption header.
    const dataBytes = flags & 0x1 ? Buffer.concat([Buffer.alloc(12), plain]) : plain;
    const checksum = crc32(plain);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags | 0x800, 6);
    local.writeUInt32LE(checksum, 14);
    local.writeUInt32LE(dataBytes.length, 18);
    local.writeUInt32LE(plain.length, 22);
    local.writeUInt16LE(nameBytes.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE((3 << 8) | 20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(flags | 0x800, 8);
    central.writeUInt32LE(checksum, 16);
    central.writeUInt32LE(dataBytes.length, 20);
    central.writeUInt32LE(plain.length, 24);
    central.writeUInt16LE(nameBytes.length, 28);
    central.writeUInt32LE((mode << 16) >>> 0, 38);
    central.writeUInt32LE(offset, 42);
    locals.push(local, nameBytes, dataBytes);
    centrals.push(central, nameBytes);
    offset += local.length + nameBytes.length + dataBytes.length;
  }
  const centralDirectory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, centralDirectory, end]);
};

const FILE = 0o100644;
const DIRECTORY = 0o040755;
const LINK = 0o120777;

describe('replacing placeholders', () => {
  test('inserts values literally, without the replacement patterns of String.replace', () => {
    const value = "secret-$&-$$-$1-$'-$`-$<name>";
    const { content, count } = replaceBytes(
      Buffer.from('a {{ X }} b {{ X }}'),
      Buffer.from('{{ X }}'),
      Buffer.from(value)
    );

    expect(count).toBe(2);
    expect(content.toString()).toBe(`a ${value} b ${value}`);
  });

  test('changes only the placeholder bytes of a file that is not UTF-8', () => {
    const before = Buffer.from([0xff, 0xfe, 0x00, 0xc3, 0x28]);
    const after = Buffer.from([0xa0, 0xa1, 0xed, 0xa0, 0x80]);
    const { content } = replaceBytes(
      Buffer.concat([before, Buffer.from('{{ X }}'), after]),
      Buffer.from('{{ X }}'),
      Buffer.from('value')
    );

    expect(content.equals(Buffer.concat([before, Buffer.from('value'), after]))).toBe(true);
  });

  test('rewrites only matching files that contain a placeholder, applying replacements in order', async () => {
    const root = await createRoot();
    const untouchedBytes = Buffer.from([0xff, 0xfe, 0x00, 0xc3, 0x28]);
    await file(join(root, '.next', 'server', 'app.page.js'), 'const bucket = "{{ A }}";');
    await file(join(root, 'index-wrap.mjs'), 'env = {{ B }}');
    await file(join(root, 'nested', 'index-wrap.mjs'), 'env = {{ B }}');
    await file(join(root, 'static', 'chunk.min.js'), untouchedBytes);
    await file(join(root, 'readme.txt'), '{{ A }}');
    const before = await stat(join(root, 'static', 'chunk.min.js'));
    const { entries } = await listArchiveEntries({ sourcePath: root });

    const result = await replaceInFiles({
      entries,
      replacements: [
        { includeFilesPattern: '**/*.@(*js|json|html)', searchString: '{{ A }}', replaceString: '{{ B }}' },
        { includeFilesPattern: '**/*.@(*js|json|html)', searchString: '{{ B }}', replaceString: 'final' },
        { includeFilesPattern: 'index-wrap.mjs', searchString: 'env', replaceString: 'ENV' }
      ]
    });

    expect(result).toEqual({ changedFiles: 3, occurrences: 5 });
    expect(await readFile(join(root, '.next', 'server', 'app.page.js'), 'utf8')).toBe('const bucket = "final";');
    expect(await readFile(join(root, 'index-wrap.mjs'), 'utf8')).toBe('ENV = final');
    // The pattern without a slash names a file at the root only, as it did for fast-glob.
    expect(await readFile(join(root, 'nested', 'index-wrap.mjs'), 'utf8')).toBe('env = final');
    expect(await readFile(join(root, 'readme.txt'), 'utf8')).toBe('{{ A }}');
    expect((await readFile(join(root, 'static', 'chunk.min.js'))).equals(untouchedBytes)).toBe(true);
    expect((await stat(join(root, 'static', 'chunk.min.js'))).mtimeMs).toBe(before.mtimeMs);
  });

  test('refuses an empty search string without naming any value', async () => {
    const root = await createRoot();
    await file(join(root, 'a.js'), 'secret');

    await expect(
      replaceInFiles({
        entries: (await listArchiveEntries({ sourcePath: root })).entries,
        replacements: [{ includeFilesPattern: '**/*.js', searchString: '', replaceString: 'secret-value' }]
      })
    ).rejects.toThrow('Asset replacer: replacement 1 has an empty search string.');
  });

  test.skipIf(!isPosix)('replaces a file once per rule, however many links reach it', async () => {
    const root = await createRoot();
    await file(join(root, 'config', 'settings.json'), '{"token":"TOKEN"}');
    await file(join(root, 'config', 'data.txt'), 'TOKEN');
    // A file alias, a directory alias and a link back to the root: each could make a traversal revisit the file.
    await symlink('settings.json', join(root, 'config', 'settings-alias.json'));
    await symlink('data.txt', join(root, 'config', 'only-alias-matches.json'));
    await symlink('config', join(root, 'linked-config'));
    await mkdir(join(root, '.next', 'server'), { recursive: true });
    await symlink('../..', join(root, '.next', 'server', 'root'));
    const { entries } = await listArchiveEntries({ sourcePath: root });

    const result = await replaceInFiles({
      entries,
      replacements: [
        // Not idempotent: applied twice, it would expand twice.
        { includeFilesPattern: '**/*.@(*js|json|html)', searchString: 'TOKEN', replaceString: 'TOKEN-expanded' },
        {
          includeFilesPattern: '**/*.@(*js|json|html)',
          searchString: 'expanded',
          replaceString: 'expanded-then-second'
        }
      ]
    });

    expect(result).toEqual({ changedFiles: 1, occurrences: 2 });
    expect(await readFile(join(root, 'config', 'settings.json'), 'utf8')).toBe(
      '{"token":"TOKEN-expanded-then-second"}'
    );
    // Selection is by a file's own path: a text file reached only through a `.json` link keeps its contents.
    expect(await readFile(join(root, 'config', 'data.txt'), 'utf8')).toBe('TOKEN');
    expect(await readlink(join(root, 'config', 'settings-alias.json'))).toBe('settings.json');
    expect(await readlink(join(root, 'linked-config'))).toBe('config');
    expect(await readlink(join(root, '.next', 'server', 'root'))).toBe('../..');
  });

  test.skipIf(!isPosix || process.getuid?.() === 0)(
    'reports a failed write only after every other replacement has finished',
    async () => {
      const root = await createRoot();
      const large = `${'x'.repeat(2 * 1024 * 1024)}{{ A }}`;
      await file(join(root, 'a00-read-only.js'), '{{ A }}', 0o444);
      for (let index = 1; index <= 40; index++) {
        await file(join(root, `a${String(index).padStart(2, '0')}.js`), large);
      }
      const { entries } = await listArchiveEntries({ sourcePath: root });
      const snapshot = async () => Promise.all(entries.map(async ({ path }) => (await stat(join(root, path))).mtimeMs));

      await expect(
        replaceInFiles({
          entries,
          replacements: [{ includeFilesPattern: '*.js', searchString: '{{ A }}', replaceString: 'value' }]
        })
      ).rejects.toThrow('EACCES');
      const atFailure = await snapshot();
      await Bun.sleep(300);

      // Nothing is still writing: a workspace removed now stays removed.
      expect(await snapshot()).toEqual(atFailure);
    },
    30_000
  );

  test.skipIf(!isPosix)('never writes through a link, even when the link path matches', async () => {
    const root = await createRoot();
    await file(join(root, 'real.js'), '{{ A }}');
    await symlink('real.js', join(root, 'link.js'));
    const { entries } = await listArchiveEntries({ sourcePath: root });

    expect(
      await replaceInFiles({
        entries,
        replacements: [{ includeFilesPattern: 'link.js', searchString: '{{ A }}', replaceString: 'value' }]
      })
    ).toEqual({ changedFiles: 0, occurrences: 0 });
    // Each file is replaced once, through its own path, although a link also reaches it.
    expect(
      await replaceInFiles({
        entries,
        replacements: [{ includeFilesPattern: '*.js', searchString: '{{ A }}', replaceString: 'value' }]
      })
    ).toEqual({ changedFiles: 1, occurrences: 1 });
    expect(await readlink(join(root, 'link.js'))).toBe('real.js');
    expect(await readFile(join(root, 'real.js'), 'utf8')).toBe('value');
  });
});

describe.if(isPosix)('extracting a function package', () => {
  test('keeps the layout, executable files, hidden entries and links of a production ZIP', async () => {
    const root = await createRoot();
    const source = join(root, 'source');
    await file(join(source, 'index.mjs'), 'export const handler = () => 1;');
    await file(join(source, 'bin', 'tool'), '#!/bin/sh\necho tool\n', 0o755);
    await symlink('tool', join(source, 'bin', 'tool-link'));
    await file(join(source, '.next', '.hidden'), 'hidden');
    await file(join(source, 'lib', 'app.page.runtime.prod.js'), 'multi-dot');
    await file(join(source, 'assets', 'logo.bin'), Buffer.from([0, 255, 254, 1]));
    await mkdir(join(source, 'empty'));
    const { path: zipPath } = await createArchive({
      absoluteSourcePath: source,
      absoluteDestDirPath: root,
      fileNameBase: 'function',
      format: 'zip'
    });

    const target = join(root, 'extracted');
    const entries = await extractFunctionArchive({ zipPath, targetPath: target });

    expect(entries.map(({ type, path, mode }) => `${type} ${path} ${mode.toString(8)}`)).toEqual([
      'directory .next 755',
      'file .next/.hidden 644',
      'directory assets 755',
      'file assets/logo.bin 644',
      'directory bin 755',
      'file bin/tool 755',
      'symlink bin/tool-link 777',
      'directory empty 755',
      'file index.mjs 644',
      'directory lib 755',
      'file lib/app.page.runtime.prod.js 644'
    ]);
    expect(((await stat(join(target, 'bin', 'tool'))).mode & 0o777).toString(8)).toBe('755');
    expect(await readlink(join(target, 'bin', 'tool-link'))).toBe('tool');
    expect((await readFile(join(target, 'assets', 'logo.bin'))).equals(Buffer.from([0, 255, 254, 1]))).toBe(true);
  });

  const refusals: { title: string; entries: Parameters<typeof craftZip>[0]; message: string }[] = [
    {
      title: 'a name that climbs out',
      entries: [{ name: '../escape.txt', mode: FILE }],
      message: 'invalid relative path'
    },
    { title: 'an absolute name', entries: [{ name: '/etc/escape.txt', mode: FILE }], message: 'absolute path' },
    { title: 'a backslash in a name', entries: [{ name: 'a\\b.txt', mode: FILE }], message: 'invalid characters' },
    {
      title: 'an empty name component',
      entries: [{ name: 'a//b.txt', mode: FILE }],
      message: 'is not a plain relative path'
    },
    {
      title: 'a `.` name component',
      entries: [{ name: './a.txt', mode: FILE }],
      message: 'is not a plain relative path'
    },
    {
      title: 'a repeated path',
      entries: [
        { name: 'a.txt', mode: FILE, data: 'first' },
        { name: 'a.txt', mode: FILE, data: 'second' }
      ],
      message: 'a.txt appears more than once'
    },
    {
      title: 'an entry below a file',
      entries: [
        { name: 'a', mode: FILE },
        { name: 'a/b.txt', mode: FILE }
      ],
      message: 'a/b.txt lies below a, which is not a directory'
    },
    {
      title: 'an entry below a link, whatever the entry order',
      entries: [
        { name: 'dir/', mode: DIRECTORY },
        { name: 'dir/inside.txt', mode: FILE, data: 'x' },
        { name: 'link/written-through.txt', mode: FILE, data: 'x' },
        { name: 'link', mode: LINK, data: 'dir' }
      ],
      message: 'link/written-through.txt lies below link, which is not a directory'
    },
    {
      title: 'a link to an absolute path',
      entries: [{ name: 'link', mode: LINK, data: '/etc/passwd' }],
      message: 'points to an absolute path'
    },
    {
      title: 'a link with an empty target',
      entries: [{ name: 'link', mode: LINK, data: '' }],
      message: 'unusable target'
    },
    {
      title: 'a FIFO',
      entries: [{ name: 'pipe', mode: 0o010644 }],
      message: 'is not a directory, a regular file or a symbolic link'
    },
    { title: 'an encrypted entry', entries: [{ name: 'a.txt', mode: FILE, flags: 0x1 }], message: 'is encrypted' }
  ];

  for (const { title, entries, message } of refusals) {
    test(`refuses ${title} before writing anything`, async () => {
      const root = await createRoot();
      await writeFile(join(root, 'input.zip'), craftZip(entries));

      const extraction = extractFunctionArchive({
        zipPath: join(root, 'input.zip'),
        targetPath: join(root, 'extracted')
      });

      await expect(extraction).rejects.toThrow(message);
      await expect(extraction).rejects.toThrow('Cannot extract the function package:');
      expect(await readdir(root)).toEqual(['input.zip']);
    });
  }

  test('refuses a link that leaves the tree before anything reads through it', async () => {
    const root = await createRoot();
    await file(join(root, 'outside.txt'), 'outside');
    await writeFile(
      join(root, 'input.zip'),
      craftZip([
        { name: 'dir/', mode: DIRECTORY },
        { name: 'dir/escape', mode: LINK, data: '../../outside.txt' }
      ])
    );

    await expect(
      extractFunctionArchive({ zipPath: join(root, 'input.zip'), targetPath: join(root, 'extracted') })
    ).rejects.toThrow('points to ../../outside.txt, outside the archived directory');
    expect(await readFile(join(root, 'outside.txt'), 'utf8')).toBe('outside');
  });

  test('refuses bytes that are not a ZIP', async () => {
    const root = await createRoot();
    await writeFile(join(root, 'input.zip'), 'not a zip');

    await expect(
      extractFunctionArchive({ zipPath: join(root, 'input.zip'), targetPath: join(root, 'extracted') })
    ).rejects.toThrow('Cannot extract the function package: it is not a readable ZIP');
  });
});

/**
 * The resolver as the service Lambda runs it, with the real AWS SDK sending real HTTP requests to a loopback server.
 * The CLI's test preload keeps every other address unreachable. `TMPDIR` points at a directory these tests own, so a
 * leftover workspace is visible.
 */
describe.if(isPosix)('the asset replacer resolver', () => {
  const BUCKET = 'deployment-bucket';
  const KEY = 'nextjs-server/v000002-build.2026.09.24.zip';
  const requests: { method: string; path: string }[] = [];
  const uploads: Buffer[] = [];
  const workspacesAtUpload: Promise<string[]>[] = [];
  let objectBytes = Buffer.alloc(0);
  let refuse: { get?: boolean; put?: boolean } = {};
  let server: ReturnType<typeof Bun.serve>;
  let workspaceParent = '';
  const originalEnvironment = { ...process.env };

  const decodeUpload = (request: Request, body: Buffer) => {
    if (!request.headers.get('content-encoding')?.includes('aws-chunked')) return body;
    const chunks: Buffer[] = [];
    let offset = 0;
    for (;;) {
      const lineEnd = body.indexOf('\r\n', offset);
      const size = Number.parseInt(body.toString('latin1', offset, lineEnd).split(';')[0]!, 16);
      offset = lineEnd + 2;
      if (size === 0) return Buffer.concat(chunks);
      chunks.push(body.subarray(offset, offset + size));
      offset += size + 2;
    }
  };

  beforeAll(async () => {
    workspaceParent = await mkdtemp(join(tmpdir(), 'stp-asset-replacer-tmpdir-'));
    server = Bun.serve({
      hostname: '127.0.0.1',
      port: 0,
      fetch: async (request) => {
        const { pathname } = new URL(request.url);
        requests.push({ method: request.method, path: pathname });
        if (pathname !== `/${BUCKET}/${KEY}`) return new Response('unexpected', { status: 400 });
        if (request.method === 'GET') {
          return refuse.get
            ? new Response('<Error><Code>AccessDenied</Code><Message>no</Message></Error>', { status: 403 })
            : new Response(objectBytes, { headers: { 'content-type': 'application/zip' } });
        }
        if (request.method === 'PUT') {
          workspacesAtUpload.push(
            ...(await readdir(workspaceParent)).map(async (workspace) =>
              (await readdir(join(workspaceParent, workspace))).toSorted()
            )
          );
          if (refuse.put) {
            return new Response('<Error><Code>AccessDenied</Code><Message>no</Message></Error>', { status: 403 });
          }
          uploads.push(decodeUpload(request, Buffer.from(await request.arrayBuffer())));
          return new Response(null, { headers: { etag: '"upload"' } });
        }
        return new Response('unexpected', { status: 400 });
      }
    });
    process.env.TMPDIR = workspaceParent;
    // Lambda sets AWS_REGION, which the JavaScript SDK reads; the preload only sets AWS_DEFAULT_REGION.
    process.env.AWS_REGION = 'eu-west-1';
    process.env.AWS_ENDPOINT_URL_S3 = `http://127.0.0.1:${server.port}`;
    delete process.env.AWS_IGNORE_CONFIGURED_ENDPOINT_URLS;
  });

  afterAll(async () => {
    server.stop(true);
    for (const name of ['TMPDIR', 'AWS_REGION', 'AWS_ENDPOINT_URL_S3', 'AWS_IGNORE_CONFIGURED_ENDPOINT_URLS']) {
      if (originalEnvironment[name] === undefined) delete process.env[name];
      else process.env[name] = originalEnvironment[name];
    }
    await rm(workspaceParent, { recursive: true, force: true });
  });

  afterEach(() => {
    requests.length = 0;
    uploads.length = 0;
    workspacesAtUpload.length = 0;
    refuse = {};
  });

  const replacements = [
    {
      includeFilesPattern: '**/*.@(*js|json|html)',
      searchString: '{{ SECRET_SEARCH_7f3a }}',
      replaceString: 'secret-value-9c1d-$&'
    }
  ];

  const createObject = async () => {
    const root = await createRoot();
    const source = join(root, 'function');
    await file(join(source, 'config.json'), '{"value":"{{ SECRET_SEARCH_7f3a }}"}');
    await file(join(source, 'bin', 'tool'), '#!/bin/sh\necho tool\n', 0o755);
    await symlink('tool', join(source, 'bin', 'tool-link'));
    const { path } = await createArchive({
      absoluteSourcePath: source,
      absoluteDestDirPath: root,
      fileNameBase: 'input',
      format: 'zip'
    });
    objectBytes = await readFile(path);
    return root;
  };

  const invoke = (operation: 'Create' | 'Update' | 'Delete') =>
    assetReplacer(
      { bucketName: BUCKET, zipFileS3Key: KEY, replacements },
      undefined,
      operation,
      undefined,
      {} as never
    );

  const expectNoWorkspaceLeft = async () => expect(await readdir(workspaceParent)).toEqual([]);

  test('uploads the replaced package under the same key, logs no value and leaves no workspace', async () => {
    const root = await createObject();
    const logs: string[] = [];
    const info = spyOn(console, 'info').mockImplementation((...args: unknown[]) => void logs.push(args.join(' ')));
    try {
      await invoke('Create');
    } finally {
      info.mockRestore();
    }

    expect(requests).toEqual([
      { method: 'GET', path: `/${BUCKET}/${KEY}` },
      { method: 'PUT', path: `/${BUCKET}/${KEY}` }
    ]);
    await writeFile(join(root, 'uploaded.zip'), uploads[0]!);
    const extracted = join(root, 'uploaded');
    await extractFunctionArchive({ zipPath: join(root, 'uploaded.zip'), targetPath: extracted });
    expect(await readFile(join(extracted, 'config.json'), 'utf8')).toBe('{"value":"secret-value-9c1d-$&"}');
    expect(((await stat(join(extracted, 'bin', 'tool'))).mode & 0o777).toString(8)).toBe('755');
    expect((await lstat(join(extracted, 'bin', 'tool-link'))).isSymbolicLink()).toBe(true);
    expect(logs.join('\n')).not.toContain('SECRET_SEARCH');
    expect(logs.join('\n')).not.toContain('secret-value');
    // The downloaded ZIP was removed once extracted: only the tree and the new ZIP remained.
    expect(await Promise.all(workspacesAtUpload)).toEqual([['extracted', 'output']]);
    await expectNoWorkspaceLeft();
  });

  test('fails without uploading or leaving a workspace when the download is refused', async () => {
    await createObject();
    refuse.get = true;

    await expect(invoke('Create')).rejects.toThrow();
    expect(requests.map(({ method }) => method)).toEqual(['GET']);
    await expectNoWorkspaceLeft();
  });

  test('fails without uploading or leaving a workspace when the object is not a ZIP', async () => {
    objectBytes = Buffer.from('not a zip');

    await expect(invoke('Update')).rejects.toThrow('Cannot extract the function package');
    expect(requests.map(({ method }) => method)).toEqual(['GET']);
    await expectNoWorkspaceLeft();
  });

  test('fails without leaving a workspace when the upload is refused', async () => {
    await createObject();
    refuse.put = true;

    await expect(invoke('Create')).rejects.toThrow();
    expect(requests.map(({ method }) => method)).toEqual(['GET', 'PUT']);
    expect(uploads).toEqual([]);
    await expectNoWorkspaceLeft();
  });

  test('leaves the object alone on Delete', async () => {
    await createObject();

    expect(await invoke('Delete')).toEqual({ data: {} });
    expect(requests).toEqual([]);
    await expectNoWorkspaceLeft();
  });
});
