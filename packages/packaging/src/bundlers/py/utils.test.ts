import { describe, expect, test } from 'bun:test';
import { buildPythonArtifactDockerfile } from '../../docker/dockerfiles';
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

describe('buildPythonArtifactDockerfile', () => {
  test('passes uv dependency selectors only when compiling pyproject dependencies', () => {
    const dockerfile = buildPythonArtifactDockerfile({
      pythonVersion: 3.12,
      alpine: true
    });

    expect(dockerfile).toContain('ARG STP_PY_UV_OPTIONAL_DEPENDENCIES');
    expect(dockerfile).toContain('--extra $extra');
    expect(dockerfile).toContain('--group $group');
    expect(dockerfile).toContain('--no-group $group');
    expect(dockerfile).toContain('--only-group $group');
    expect(dockerfile).toContain('uv pip compile "$STP_PY_DEP_FILE" $compile_uv_args -o /tmp/requirements.txt');
    expect(dockerfile).toContain('uvx --from pipenv pipenv requirements > /tmp/requirements.txt');
  });
});
