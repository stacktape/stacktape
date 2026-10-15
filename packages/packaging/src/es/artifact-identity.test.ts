import { describe, expect, test } from 'bun:test';
import { projectRelativeSource, resolveBunOutputPath } from './artifact-identity';

describe('artifact identity', () => {
  test('a source outside the project keeps its dependency tail or only its name', () => {
    expect(projectRelativeSource('/home/dev/app/src/x.ts', '/home/dev/app')).toBe('src/x.ts');
    expect(projectRelativeSource('/home/dev/app/node_modules/zod/index.js', '/home/dev/app')).toBe(
      'node_modules/zod/index.js'
    );
    expect(
      projectRelativeSource('/home/dev/.cache/pnpm/node_modules/.pnpm/zod/node_modules/zod/index.js', '/home/dev/app')
    ).toBe('node_modules/zod/index.js');
    expect(projectRelativeSource('/home/dev/elsewhere/helper.ts', '/home/dev/app')).toBe('external/helper.ts');
    expect(projectRelativeSource('C:\\Users\\dev\\app\\src\\x.ts', 'C:\\Users\\dev\\app')).toBe('src/x.ts');
  });

  test("Bun's output-relative paths resolve on both hosts, including Windows' other-drive climb", () => {
    expect(resolveBunOutputPath('/home/dev/app/out', '../src/a.ts')).toBe('/home/dev/app/src/a.ts');
    expect(resolveBunOutputPath('/home/dev/app/out', '../../../../home/dev/app/src/a.ts')).toBe(
      '/home/dev/app/src/a.ts'
    );
    // Bun on Windows, working directory on D: and the project on C: (the CI runner's layout).
    expect(resolveBunOutputPath('D:\\work\\out', '../../C:/Users/dev/app/src/a.ts')).toBe(
      'C:\\Users\\dev\\app\\src\\a.ts'
    );
    expect(resolveBunOutputPath('C:\\Users\\dev\\app\\out', '../src/a.ts')).toBe('C:\\Users\\dev\\app\\src\\a.ts');
    expect(
      projectRelativeSource(
        resolveBunOutputPath('D:\\work\\out', '../../C:/Users/dev/app/src/a.ts'),
        'C:\\Users\\dev\\app'
      )
    ).toBe('src/a.ts');
  });
});
