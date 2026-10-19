import { expect, test } from 'bun:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildBenchmarkCli, benchmarkBuildPlugin } from './build-cli';
import { createStacktapeOpenTuiBuildPlugin } from '../support/opentui-loader';

// Exercise the actual build boundary: a release-style build must not contain the prototype at all.
test('only the explicit benchmark build includes unsigned swap activation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'code-swap-build-'));
  try {
    const build = async () => {
      const result = await Bun.build({
        entrypoints: ['src/entrypoints/cli.ts'],
        outdir: join(directory, 'ordinary'),
        target: 'bun',
        plugins: [createStacktapeOpenTuiBuildPlugin()],
        external: ['follow-redirects', '@opentui/core-*', 'web-tree-sitter', 'web-tree-sitter/*'],
        tsconfig: 'tsconfig.json',
        define: { STACKTAPE_VERSION: '"4.0.0-dev.0"' }
      });
      expect(result.success).toBe(true);
      return result.outputs[0]!.text();
    };
    const [ordinary, outputs] = await Promise.all([build(), buildBenchmarkCli(join(directory, 'benchmark'))]);
    const benchmark = (
      await Promise.all(outputs.filter((output) => output.path.endsWith('.js')).map((output) => output.text()))
    ).join('\n');
    // Source CLI startup reads the development helper directory even for version. Keep this process smoke
    // independent of an earlier build:dev-artifacts and of the developer's persisted state.
    if (process.platform === 'linux') {
      const working = join(directory, 'working');
      await mkdir(join(working, '__stacktape-dist', 'dev', 'helper-lambdas'), { recursive: true });
      const child = Bun.spawn(
        [
          process.execPath,
          '--preload',
          resolve('scripts/network-guard-preload.ts'),
          join(directory, 'benchmark', 'entrypoint.js'),
          'version'
        ],
        {
          cwd: working,
          env: { ...process.env, HOME: working, STP_DISABLE_TELEMETRY: '1' },
          stdout: 'pipe',
          stderr: 'pipe'
        }
      );
      const [stdout, stderr, code] = await Promise.all([
        new Response(child.stdout).text(),
        new Response(child.stderr).text(),
        child.exited
      ]);
      if (code !== 0) throw new Error(`Built CLI version failed (${code}): ${stdout}\n${stderr}`);
      expect(stdout).toContain('Stacktape version:');
    }
    expect(ordinary).not.toContain('STP_CODE_SWAP_BENCH_RUN');
    expect(ordinary).not.toContain('codeSwapBenchmark');
    expect(ordinary).not.toContain('STP_CODE_SWAP_BENCH_TRACE');
    expect(ordinary).not.toContain('firstByteMs');
    expect(benchmark).toContain('STP_CODE_SWAP_BENCH_RUN');
    expect(benchmark).toContain('codeSwapBenchmark');
    expect(benchmark).toContain('STP_CODE_SWAP_BENCH_TRACE');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);

test('only an active benchmark omits the separate Cloud Map drain container', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'swap-drain-boundary-'));
  try {
    for (const benchmark of [false, true]) {
      const result = await Bun.build({
        entrypoints: [
          'src/domain/calculated-stack-overview-manager/resource-resolvers/multi-container-workloads/cloud-map-drain.ts'
        ],
        outdir: join(directory, benchmark ? 'benchmark' : 'ordinary'),
        target: 'bun',
        plugins: benchmark ? [benchmarkBuildPlugin()] : []
      });
      expect(result.success).toBe(true);
      for (const active of [false, true]) {
        const env = { ...process.env };
        if (active) env.STP_CODE_SWAP_BENCH_RUN = 'fixture-run.json';
        else delete env.STP_CODE_SWAP_BENCH_RUN;
        const child = Bun.spawn(
          [
            process.execPath,
            '-e',
            `
          const m=await import(${JSON.stringify(result.outputs[0]!.path)});
          const workload={containers:[{name:'app',events:[{type:'http-api-gateway'}]}]};
          console.log(JSON.stringify([m.needsCloudMapDrain(workload),Boolean(m.getCloudMapDrainContainer(workload,'image'))]));
        `
          ],
          { env, stdout: 'pipe', stderr: 'pipe' }
        );
        const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
        expect(await child.exited, err).toBe(0);
        expect(JSON.parse(out)).toEqual(benchmark && active ? [false, false] : [true, true]);
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
