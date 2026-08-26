/** Opt-in Docker parity check; normal package tests never execute Docker. */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { sourceFileForDockerPath } from './dockerfile-command-source';

const FILES = ['root.js', 'apps/api/index.js', 'alternate/index.js'];
const CASES = [
  {
    id: 'identity',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY . .\n',
    path: '/app/apps/api/index.js',
    source: 'apps/api/index.js',
    mustResolve: true
  },
  {
    id: 'file-remap',
    raw: 'FROM scratch\nWORKDIR /\nCOPY root.js /apps/api/index.js\n',
    path: '/apps/api/index.js',
    source: 'root.js'
  },
  {
    id: 'directory-remap',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY alternate ./apps/api\n',
    path: '/app/apps/api/index.js',
    source: 'alternate/index.js'
  },
  {
    id: 'later-overwrite',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY . .\nCOPY root.js ./apps/api/index.js\n',
    path: '/app/apps/api/index.js',
    source: 'root.js'
  },
  {
    id: 'named-stage',
    raw: 'FROM scratch AS deps\nWORKDIR /app\nCOPY apps ./apps\nFROM scratch\nWORKDIR /app\nCOPY --from=deps /app /app\n',
    path: '/app/apps/api/index.js',
    source: 'apps/api/index.js',
    mustResolve: true
  },
  {
    id: 'numeric-stage',
    raw: 'FROM scratch AS deps\nWORKDIR /app\nCOPY apps ./apps\nFROM scratch\nWORKDIR /app\nCOPY --from=0 /app /app\n',
    path: '/app/apps/api/index.js',
    source: 'apps/api/index.js',
    mustResolve: true
  },
  {
    id: 'inherited-stage',
    raw: 'FROM scratch AS base\nWORKDIR /app\nCOPY apps ./apps\nFROM base\n',
    path: '/app/apps/api/index.js',
    source: 'apps/api/index.js',
    mustResolve: true
  },
  {
    id: 'changed-workdir',
    raw: 'FROM scratch\nWORKDIR /app\nCOPY . .\nWORKDIR /other\nCOPY root.js ./apps/api/index.js\n',
    path: '/other/apps/api/index.js',
    source: 'root.js'
  }
];

const docker = (args: string[]) => {
  const result = spawnSync('docker', args, { encoding: 'utf8', timeout: 45_000, windowsHide: true });
  if (result.status !== 0) {
    throw new Error(`docker ${args[0]} failed: ${result.error?.message ?? result.stderr?.slice(-2000)}`);
  }
  return result.stdout.trim();
};

const removeOwnedDockerObject = (kind: 'container' | 'image', name: string, runId: string) => {
  const label = docker([kind, 'inspect', '--format', '{{index .Config.Labels "stp.copy-parity"}}', name]);
  if (label !== runId) throw new Error(`Refusing to remove a ${kind} without this run's ownership label.`);
  docker([kind, 'rm', name]);
};

const removeFixtureDirectory = async (directory: string) => {
  if (dirname(resolve(directory)) !== resolve(tmpdir())) throw new Error('Unexpected fixture directory parent.');
  await rm(directory, { recursive: true, force: true });
};

const run = async () => {
  const runId = randomUUID();
  const directory = await mkdtemp(join(tmpdir(), 'stp-docker-copy-parity-'));
  const results: Array<{ id: string; status: 'passed' | 'failed'; detail: string }> = [];
  try {
    for (const entry of CASES) {
      const context = join(directory, entry.id);
      const image = `stp-copy-parity-${runId}-${entry.id}`;
      let created = false;
      let built = false;
      try {
        for (const file of FILES) {
          const path = join(context, file);
          // oxlint-disable-next-line no-await-in-loop -- tiny isolated fixtures are intentionally sequential.
          await mkdir(dirname(path), { recursive: true });
          // oxlint-disable-next-line no-await-in-loop -- every marker must exist before building this case.
          await writeFile(path, `source:${file}\n`);
        }
        // These trusted fixtures contain no downloaded base, RUN instruction, bind mount, port or secret.
        // oxlint-disable-next-line no-await-in-loop -- finish and clean each case before starting another.
        await writeFile(join(context, 'Dockerfile'), entry.raw);
        docker([
          'build',
          '--network=none',
          '--pull=false',
          '--label',
          `stp.copy-parity=${runId}`,
          '-t',
          image,
          context
        ]);
        built = true;
        docker([
          'create',
          '--label',
          `stp.copy-parity=${runId}`,
          '--name',
          image,
          '--entrypoint',
          '/never-executed',
          image
        ]);
        created = true;
        const observedPath = join(context, 'observed.txt');
        docker(['cp', `${image}:${entry.path}`, observedPath]);
        // oxlint-disable-next-line no-await-in-loop -- compare actual Docker output before removing the container.
        const actual = (await readFile(observedPath, 'utf8')).trim();
        if (actual !== `source:${entry.source}`) throw new Error('The fixture does not match Docker copy semantics.');
        const mappings = [entry.path, 'apps/api/index.js'].map((containerPath) =>
          sourceFileForDockerPath({ raw: entry.raw, containerPath, files: FILES })
        );
        for (const inferred of mappings) {
          if ((entry.mustResolve || inferred !== undefined) && inferred !== entry.source) {
            throw new Error(`Source mapping expected ${entry.source}; got ${inferred ?? 'unresolved'}.`);
          }
        }
        results.push({
          id: entry.id,
          status: 'passed',
          detail: mappings.map((source) => source ?? 'conservatively unresolved').join(', ')
        });
      } catch (error) {
        results.push({ id: entry.id, status: 'failed', detail: String(error) });
      } finally {
        if (created) removeOwnedDockerObject('container', image, runId);
        if (built) removeOwnedDockerObject('image', image, runId);
      }
    }
  } finally {
    await removeFixtureDirectory(directory);
  }
  const failed = results.filter(({ status }) => status === 'failed').length;
  console.log(
    JSON.stringify(
      {
        scope: 'Docker source mapping, not project packaging or deployment',
        ownershipLabel: `stp.copy-parity=${runId}`,
        passed: results.length - failed,
        failed,
        results
      },
      null,
      2
    )
  );
  if (failed > 0) process.exitCode = 1;
};

if (import.meta.main) await run();
