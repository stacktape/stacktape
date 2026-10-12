import { describe, expect, test } from 'bun:test';
import { getPythonUvDependencySelectorBuildArgs } from './utils';

const createPackagingError = ({ message }: { message: string }) => new Error(message);

describe('getPythonUvDependencySelectorBuildArgs', () => {
  test('serializes uv extras and groups for Docker build args', () => {
    expect(
      getPythonUvDependencySelectorBuildArgs(
        {
          uvOptionalDependencies: ['heavy', 'postgres'],
          uvWithGroups: ['prod'],
          uvWithoutGroups: ['test'],
          uvOnlyGroups: ['lambda']
        },
        createPackagingError
      )
    ).toEqual({
      optionalDependencies: 'heavy postgres',
      withGroups: 'prod',
      withoutGroups: 'test',
      onlyGroups: 'lambda'
    });
  });

  test('rejects selector names that cannot be safely expanded by the Dockerfile shell', () => {
    expect(() =>
      getPythonUvDependencySelectorBuildArgs(
        {
          uvWithGroups: ['prod; rm -rf /']
        },
        createPackagingError
      )
    ).toThrow('Invalid Python uv dependency selector');
  });
});
