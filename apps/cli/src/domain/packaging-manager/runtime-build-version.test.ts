import { describe, expect, test } from 'bun:test';
import {
  areBuildAndRuntimeVersionsAligned,
  getDotnetBuildVersionForRuntime,
  getJavaBuildVersionForRuntime,
  getPythonBuildVersionForRuntime,
  getRubyBuildVersionForRuntime
} from './runtime-build-version';

describe('Lambda build/runtime alignment', () => {
  test('maps every current managed runtime to its buildpack version', () => {
    expect(getPythonBuildVersionForRuntime('python3.14')).toBe(3.14);
    expect(getJavaBuildVersionForRuntime('java25')).toBe(25);
    expect(getRubyBuildVersionForRuntime('ruby4.0')).toBe(4);
    expect(getDotnetBuildVersionForRuntime('dotnet10')).toBe(10);
  });

  test('keeps legacy runtimes aligned instead of silently building against a newer ABI', () => {
    expect(getPythonBuildVersionForRuntime('python3.10')).toBe('3.10');
    expect(getJavaBuildVersionForRuntime('java8.al2')).toBe(8);
    expect(getDotnetBuildVersionForRuntime('dotnet7')).toBe(7);
  });

  test('does not infer a managed-language build version from an unrelated runtime', () => {
    expect(getPythonBuildVersionForRuntime('nodejs24.x')).toBeUndefined();
  });

  test('compares numeric and string version spellings without losing Python 3.10', () => {
    expect(areBuildAndRuntimeVersionsAligned('3.10', '3.10')).toBe(true);
    expect(areBuildAndRuntimeVersionsAligned(3.1, '3.10')).toBe(false);
  });
});
