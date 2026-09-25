import { describe, expect, test } from 'bun:test';
import objectHash from 'object-hash';
import { getStableBuildpackDigestProps } from './artifact-digest-inputs';

const digestOf = (props: Record<string, unknown>, configured: { entryfilePath: string }) =>
  objectHash({ props: getStableBuildpackDigestProps({ props, configured }) });

describe('what a buildpack artifact is identified by', () => {
  const configured = { entryfilePath: './src/handler.ts' };
  const propsBuiltIn = (checkoutRoot: string, cliRoot = '/usr/local/lib/stacktape/dist') => ({
    entryfilePath: `${checkoutRoot}/src/handler.ts`,
    tracingRuntimeFilePath: `${cliRoot}/lambda-tracing-runtime.mjs`,
    nodeTarget: '24',
    minify: false
  });

  test('the same source built from two checkouts is the same artifact', () => {
    // A laptop and a CI runner check the repository out to different paths. Without this, every workload
    // was rebuilt and re-uploaded the first time it was built anywhere else.
    expect(digestOf(propsBuiltIn('/home/dev/app'), configured)).toBe(
      digestOf(propsBuiltIn('/builds/ci/12345/app'), configured)
    );
  });

  test('the same source is the same artifact however this CLI was installed', () => {
    expect(digestOf(propsBuiltIn('/home/dev/app', '/opt/stacktape/dist'), configured)).toBe(
      digestOf(propsBuiltIn('/home/dev/app', '/home/dev/.npm/stacktape/dist'), configured)
    );
  });

  test('pointing at a different entry file is a different artifact', () => {
    expect(digestOf(propsBuiltIn('/home/dev/app'), { entryfilePath: './src/handler.ts' })).not.toBe(
      digestOf(propsBuiltIn('/home/dev/app'), { entryfilePath: './src/worker.ts' })
    );
  });

  test('turning tracing on is a different artifact, because the bundle gains a wrapper', () => {
    const { tracingRuntimeFilePath: _omitted, ...untraced } = propsBuiltIn('/home/dev/app');

    expect(digestOf(untraced, configured)).not.toBe(digestOf(propsBuiltIn('/home/dev/app'), configured));
  });

  test('every other build input still decides identity', () => {
    const base = propsBuiltIn('/home/dev/app');

    expect(digestOf({ ...base, nodeTarget: '22' }, configured)).not.toBe(digestOf(base, configured));
    expect(digestOf({ ...base, minify: true }, configured)).not.toBe(digestOf(base, configured));
  });
});
