import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { formatBuildError, formatBuildLogs } from './error-format';

describe('formatBuildError', () => {
  test('uses the message of a structural error object', () => {
    expect(formatBuildError({ message: 'build failed' })).toBe('build failed');
  });

  test('joins messages from structural Bun diagnostics', () => {
    expect(formatBuildError({ errors: [{ message: 'first diagnostic' }, { message: 'second diagnostic' }] })).toBe(
      'first diagnostic\nsecond diagnostic'
    );
  });

  // r2l/r2qq: a dev rebuild reported only "Build failed: Unexpected ;", without the file, line or column.
  test('keeps the file, line, column and source line of a Bun diagnostic, the file relative to the project', () => {
    const cwd = join('/', 'work', 'shop');
    const diagnostic = {
      message: 'Unexpected ;',
      position: { file: join(cwd, 'src', 'api.ts'), line: 12, column: 5, lineText: '  const x = ;' }
    };
    expect(formatBuildError({ errors: [diagnostic] }, { cwd })).toBe('src/api.ts:12:5: Unexpected ;\n    const x = ;');
    expect(formatBuildLogs([{ level: 'warning' }, { level: 'error', ...diagnostic }], { cwd })).toBe(
      'src/api.ts:12:5: Unexpected ;\n    const x = ;'
    );
  });

  test('keeps a file outside the project, and a relative one, as Bun reported it', () => {
    const outside = join('/', 'opt', 'shared', 'lib.ts');
    expect(
      formatBuildError(
        { errors: [{ message: 'Unexpected }', position: { file: outside, line: 3, column: 1 } }] },
        { cwd: join('/', 'work', 'shop') }
      )
    ).toBe(`${outside.replaceAll('\\', '/')}:3:1: Unexpected }`);
    expect(
      formatBuildError({ errors: [{ message: 'Unexpected }', position: { file: 'src/api.ts', line: 3, column: 0 } }] })
    ).toBe('src/api.ts:3: Unexpected }');
  });
});
