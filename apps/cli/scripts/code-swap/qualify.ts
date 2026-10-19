import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { createCodeSwapBundle } from '@stacktape/packaging/artifact/code-swap';
import { buildSupervisor } from './build-supervisor';

export const prepareQualification = async (directory: string) => {
  await mkdir(directory, { recursive: true });
  await cp(await buildSupervisor(join(directory, 'build')), join(directory, 'stacktape-supervisor'));
  await cp(resolve(import.meta.dir, 'fixtures/qualification.mjs'), join(directory, 'qualification.mjs'));
  const application = await readFile(resolve(import.meta.dir, 'fixtures/application.mjs'));
  const configurations = {
    old: { revision: 'old' },
    old500: { revision: 'old500', status: 500 },
    new: { revision: 'new' },
    new500: { revision: 'new500', status: 500 },
    workers: { revision: 'workers', workers: 1, lateForks: true },
    oom: { revision: 'oom', workers: 2 },
    startupCrash: { revision: 'startupCrash', startupCrash: true },
    detach: { revision: 'detach', detach: true },
    doubleFork: { revision: 'doubleFork', doubleFork: true },
    large: { revision: 'large', initialMiB: 350 },
    ignoreTerm: { revision: 'ignoreTerm', ignoreTerm: true },
    stop: { revision: 'stop', ignoreTerm: true, workers: 2 }
  };
  await mkdir(join(directory, 'bundles'), { recursive: true });
  for (const [revision, config] of Object.entries(configurations)) {
    const path = join(directory, 'apps', revision);
    await mkdir(path, { recursive: true });
    await writeFile(join(path, 'index.mjs'), application);
    await writeFile(join(path, 'config.json'), JSON.stringify(config));
    const bundle = await createCodeSwapBundle(path, { runtime: 'node22', supervisor: 'qualification' });
    await writeFile(join(directory, 'bundles', `${revision}.tgz`), bundle.bytes);
  }
  await writeFile(
    join(directory, 'Dockerfile'),
    'FROM public.ecr.aws/docker/library/node:22-bookworm-slim@sha256:c3de60bf2f9dd0ac6370e6117950ff62d6e339527e7472301c9c78a017978392\nCOPY stacktape-supervisor /stacktape-supervisor\nCOPY apps/ /qualification/apps/\nCOPY bundles/ /qualification/bundles/\nCOPY qualification.mjs /qualification/qualification.mjs\nENTRYPOINT ["node", "/qualification/qualification.mjs"]\n'
  );
};
const main = async () => {
  const directory = resolve(process.argv[2] ?? `.stacktape/code-swap/qualification-${randomBytes(6).toString('hex')}`);
  await prepareQualification(directory);
  const name = `stp-swap-qual-${randomBytes(6).toString('hex')}`;
  const run = async (args: string[]) => {
    const child = Bun.spawn(args, { stdout: 'inherit', stderr: 'inherit' });
    if (await child.exited) throw new Error(`Failed: ${args.slice(0, 2).join(' ')}`);
  };
  const reports: Record<string, unknown> = {};
  await writeFile(
    join(directory, 'docker-state.json'),
    JSON.stringify({ container: name, image: name, cleaned: false })
  );
  try {
    await run(['docker', 'build', '-t', name, directory]);
    for (const scenario of process.env.QUAL_SCENARIOS?.split(',') ?? [
      'normal',
      'oom-prepare',
      'oom-switch',
      'lifetime',
      'stop-prepare',
      'stop-switch',
      'stop-old-shutdown'
    ]) {
      try {
        await run([
          'docker',
          'run',
          '--name',
          name,
          '--init',
          '--oom-score-adj=-998',
          '--memory=1024m',
          '--memory-swap=1024m',
          '--shm-size=32m',
          '-e',
          'STP_BENCH_TASK_MIB=1024',
          '-e',
          `QUAL_SCENARIO=${scenario}`,
          ...(process.env.QUAL_STOP_GRACE ? ['-e', `QUAL_STOP_GRACE=${process.env.QUAL_STOP_GRACE}`] : []),
          name
        ]);
      } finally {
        const logs = Bun.spawn(['docker', 'logs', name], { stdout: 'pipe', stderr: 'pipe' });
        const [output, errors] = await Promise.all([
          new Response(logs.stdout).text(),
          new Response(logs.stderr).text()
        ]);
        await logs.exited;
        await writeFile(join(directory, `${scenario}.log`), output + errors);
        const parsed = output.split('\n').flatMap((line) => {
          try {
            const data = JSON.parse(line);
            return data.qualification ? [data.qualification] : [];
          } catch {
            return [];
          }
        });
        reports[scenario] = parsed.at(-1) ?? { state: 'failed', error: 'No qualification report' };
        await writeFile(join(directory, 'reports.json'), JSON.stringify(reports, null, 2));
        await run(['docker', 'rm', '-f', name]);
      }
    }
  } finally {
    await run(['docker', 'image', 'rm', name]);
    await writeFile(
      join(directory, 'docker-state.json'),
      JSON.stringify({ container: name, image: name, cleaned: true })
    );
    await rm(join(directory, 'build'), { recursive: true, force: true });
  }
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
