import { describe, expect, test } from 'bun:test';
import { describeBuildCall, parseBytecodeSetting, withBuildOptions } from './build-release-install';

describe('parseBytecodeSetting', () => {
  test('reads the release default, explicit off, full bytecode and a nesting depth', () => {
    expect(parseBytecodeSetting(undefined)).toStrictEqual({ name: 'release-default', options: {} });
    // `off` and `all` override the release call's own depth, so they remove it rather than inherit it.
    expect(parseBytecodeSetting('off')).toStrictEqual({
      name: 'off',
      options: { bytecode: false, bytecodeDepth: undefined }
    });
    expect(parseBytecodeSetting('all')).toStrictEqual({
      name: 'all',
      options: { bytecode: true, bytecodeDepth: undefined }
    });
    expect(parseBytecodeSetting('0')).toStrictEqual({
      name: 'depth-0',
      options: { bytecode: true, bytecodeDepth: 0 }
    });
    expect(parseBytecodeSetting('2')).toStrictEqual({
      name: 'depth-2',
      options: { bytecode: true, bytecodeDepth: 2 }
    });
  });

  test.each(['on', 'true', '-1', '1.5', ''])('refuses %p', (value) => {
    expect(() => parseBytecodeSetting(value)).toThrow('--bytecode must be off, all or a nesting depth');
  });
});

describe('withBuildOptions', () => {
  test('adds the options to each Bun.build call, records it and restores Bun.build', async () => {
    const real = Bun.build;
    const received: unknown[] = [];
    const fake = ((options: unknown) => {
      received.push(options);
      return Promise.resolve('built');
    }) as unknown as typeof Bun.build;
    Bun.build = fake;
    try {
      const { result, calls } = await withBuildOptions({ bytecode: true, bytecodeDepth: 1 }, () =>
        Bun.build({ entrypoints: ['entry.ts'], format: 'esm' } as never)
      );
      expect(result).toBe('built' as never);
      expect(received).toEqual([{ entrypoints: ['entry.ts'], format: 'esm', bytecode: true, bytecodeDepth: 1 }]);
      expect(calls).toEqual(received as never);
      expect(Bun.build).toBe(fake);
      // An undefined override removes the call's own option instead of passing it through.
      await withBuildOptions({ bytecode: false, bytecodeDepth: undefined }, () =>
        Bun.build({ entrypoints: ['entry.ts'], bytecode: true, bytecodeDepth: 1 } as never)
      );
      expect(received[1]).toStrictEqual({ entrypoints: ['entry.ts'], bytecode: false });
      expect(Bun.build).toBe(fake);
      await expect(
        withBuildOptions({}, () => {
          throw new Error('failed');
        })
      ).rejects.toThrow('failed');
      expect(Bun.build).toBe(fake);
    } finally {
      Bun.build = real;
    }
  });
});

describe('describeBuildCall', () => {
  test('keeps settings, names plugins and makes paths relative', () => {
    expect(
      describeBuildCall(
        {
          format: 'esm',
          plugins: [{ name: 'stacktape-opentui-build', setup: () => {} }],
          compile: { target: 'bun-linux-x64', outfile: '/tmp/out/linux/stacktape' },
          bytecode: true
        },
        '/tmp/out'
      )
    ).toEqual({
      format: 'esm',
      plugins: ['stacktape-opentui-build'],
      compile: { target: 'bun-linux-x64', outfile: '<out>/linux/stacktape' },
      bytecode: true
    });
  });
});
