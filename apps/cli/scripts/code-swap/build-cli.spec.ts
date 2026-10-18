import { expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { benchmarkBuildPlugin } from './build-cli';
import { createStacktapeOpenTuiBuildPlugin } from '../support/opentui-loader';

// Exercise the actual build boundary: a release-style build must not contain the prototype at all.
test('only the explicit benchmark build includes unsigned swap activation', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'code-swap-build-'));
  try {
    const build = async (benchmark: boolean) => {
      const result = await Bun.build({
        entrypoints: ['src/entrypoints/cli.ts'],
        outdir: join(directory, benchmark ? 'benchmark' : 'ordinary'),
        target: 'bun',
        plugins: [...(benchmark ? [benchmarkBuildPlugin()] : []), createStacktapeOpenTuiBuildPlugin()],
        external: ['follow-redirects', '@opentui/core-*', 'web-tree-sitter', 'web-tree-sitter/*'],
        tsconfig: 'tsconfig.json',
        define: { STACKTAPE_VERSION: '"4.0.0-dev.0"' }
      });
      expect(result.success).toBe(true);
      return result.outputs[0]!.text();
    };
    const [ordinary, benchmark] = await Promise.all([build(false), build(true)]);
    expect(ordinary).not.toContain('STP_CODE_SWAP_BENCH_RUN');
    expect(ordinary).not.toContain('codeSwapBenchmark');
    expect(benchmark).toContain('STP_CODE_SWAP_BENCH_RUN');
    expect(benchmark).toContain('codeSwapBenchmark');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 30000);
