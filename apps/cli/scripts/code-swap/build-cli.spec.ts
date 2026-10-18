import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildBenchmarkCli } from './build-cli';
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
    // Execute the actual split/minified artifact, including dynamic command imports.
    if (process.platform === 'linux') {
      const child = Bun.spawn([process.execPath, join(directory, 'benchmark', 'entrypoint.js'), 'version'], {
        stdout: 'pipe',
        stderr: 'pipe'
      });
      const stdout = await new Response(child.stdout).text();
      expect(await child.exited).toBe(0);
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
