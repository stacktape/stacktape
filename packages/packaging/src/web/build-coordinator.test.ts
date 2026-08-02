import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { runWebBuildExclusive } from './build-coordinator';

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};

describe('web build coordination', () => {
  test('does not overlap framework builds that write into the same application', async () => {
    const firstCanFinish = deferred();
    const firstStarted = deferred();
    const starts: string[] = [];

    const first = runWebBuildExclusive({
      workingDirectory: join(process.cwd(), 'same-app'),
      build: async () => {
        starts.push('first');
        firstStarted.resolve();
        await firstCanFinish.promise;
      }
    });
    await firstStarted.promise;
    const second = runWebBuildExclusive({
      workingDirectory: join(process.cwd(), 'same-app', '.'),
      build: async () => {
        starts.push('second');
      }
    });

    await Bun.sleep(10);
    expect(starts).toEqual(['first']);
    firstCanFinish.resolve();
    await Promise.all([first, second]);
    expect(starts).toEqual(['first', 'second']);
  });

  test('allows unrelated applications to build concurrently', async () => {
    const canFinish = deferred();
    const starts: string[] = [];
    const build = (name: string) =>
      runWebBuildExclusive({
        workingDirectory: join(process.cwd(), name),
        build: async () => {
          starts.push(name);
          await canFinish.promise;
        }
      });

    const builds = [build('first-app'), build('second-app')];
    await Bun.sleep(10);
    expect(starts).toEqual(['first-app', 'second-app']);
    canFinish.resolve();
    await Promise.all(builds);
  });

  test('releases the application after a failed build', async () => {
    const workingDirectory = join(process.cwd(), 'failing-app');
    await expect(
      runWebBuildExclusive({
        workingDirectory,
        build: () => Promise.reject(new Error('framework failed'))
      })
    ).rejects.toThrow('framework failed');

    expect(
      await runWebBuildExclusive({
        workingDirectory,
        build: () => Promise.resolve('next build completed')
      })
    ).toBe('next build completed');
  });
});
