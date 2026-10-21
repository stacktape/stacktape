import { chmod, mkdtemp, mkdir, writeFile, copyFile, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createCodeSwapBundle } from '@stacktape/packaging/artifact/code-swap';
import { buildSupervisor } from './build-supervisor';
import { codeSwapDockerfile } from '../../src/domain/code-swap/image';

const main = async () => {
  const root = await mkdtemp(join(tmpdir(), 'stp-swap-smoke-'));
  const name = `stp-swap-smoke-${randomUUID()}`;
  const run = async (args: string[]) => {
    const child = Bun.spawn(args, { stdout: 'pipe', stderr: 'inherit' });
    const text = await new Response(child.stdout).text();
    if (await child.exited) throw new Error(`Failed: ${args[0]} ${args[1]}`);
    return text.trim();
  };
  try {
    await copyFile(await buildSupervisor(root), join(root, 'supervisor'));
    // Release extraction or the build-context host can lose Unix executable bits.
    await chmod(join(root, 'supervisor'), 0o644);
    const app = (revision: string) =>
      `import http from 'node:http'; const server=http.createServer((req,res)=>{res.statusCode=500;res.end('${revision}')}).listen(process.env.PORT,'0.0.0.0');process.on('SIGTERM',()=>server.close());`;
    const imageContext = join(root, 'image');
    await mkdir(imageContext);
    await writeFile(join(imageContext, 'index.mjs'), app('old'));
    await writeFile(
      join(imageContext, 'Dockerfile'),
      await codeSwapDockerfile(
        imageContext,
        'FROM public.ecr.aws/docker/library/node:22-bookworm-slim\nWORKDIR /app\nCOPY . /app\nENTRYPOINT ["/stacktape-supervisor"]\n',
        join(root, 'supervisor')
      )
    );
    await run(['docker', 'build', '-t', name, imageContext]);
    await run([
      'docker',
      'run',
      '-d',
      '--name',
      name,
      '--init',
      '--oom-score-adj=-998',
      '--user',
      `${process.getuid!()}:${process.getgid!()}`,
      '--memory',
      '512m',
      '-p',
      '127.0.0.1::8080',
      '-v',
      `${root}:/control`,
      '-e',
      'STP_BENCH_LOCAL=/control',
      '-e',
      'STP_BENCH_TASK_MIB=512',
      name
    ]);
    const port = (await run(['docker', 'port', name, '8080'])).split(':').at(-1);
    const url = `http://127.0.0.1:${port}`;
    const wait = async (predicate: () => Promise<boolean>) => {
      for (let i = 0; i < 300; i++) {
        if (await predicate().catch(() => false)) return;
        await Bun.sleep(100);
      }
      throw new Error('Supervisor smoke timed out.');
    };
    await wait(async () => (await (await fetch(url)).text()) === 'old');
    await run(['docker', 'exec', name, 'test', '!', '-e', '/app/stacktape-supervisor']);
    const code = join(root, 'code');
    await import('node:fs/promises').then(({ mkdir }) => mkdir(code));
    await writeFile(join(code, 'index.mjs'), app('new'));
    const bundle = await createCodeSwapBundle(code, { runtime: 'node22', supervisor: 'smoke' });
    await writeFile(join(root, 'bundle.tgz'), bundle.bytes);
    const record = {
      Revision: 'smoke-1',
      Key: '/control/bundle.tgz',
      Sha256: bundle.sha256,
      Size: bundle.size,
      Phase: 'prepare'
    };
    await writeFile(join(root, 'release.json'), JSON.stringify(record));
    await wait(
      async () => JSON.parse(await readFile(join(root, 'status#node#local.json'), 'utf8')).state === 'prepared'
    );
    await writeFile(join(root, 'release.json'), JSON.stringify({ ...record, Phase: 'commit' }));
    await wait(async () => (await (await fetch(url)).text()) === 'new');
    await wait(
      async () =>
        JSON.parse(await readFile(join(root, 'status#node#local.json'), 'utf8')).revision === 'smoke-1' &&
        JSON.parse(await readFile(join(root, 'status#node#local.json'), 'utf8')).state === 'complete'
    );
    console.log(
      'Built Node image: baseline, verified bundle, proxy switch, HTTP 500 reachability and old-process reaping passed.'
    );
  } finally {
    await run(['docker', 'rm', '-f', name]).catch(() => {});
    await run(['docker', 'image', 'rm', name]).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
};
if (import.meta.main)
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
