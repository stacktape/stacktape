/**
 * Error tracking is on by default in Stacktape 4 and adds a log subscription filter per function, plus one shared
 * permission. A Stacktape 3 stack close to CloudFormation's 500-resource limit can cross it on its first v4 deploy, so
 * the limit error says how many resources error tracking added and how to turn it off.
 */
import { describe, expect, test } from 'bun:test';
import { join } from 'node:path';
import { synthesizeFixture } from '../characterization/synthesis-fixture';

const FUNCTIONS = 10;

const nearLimitConfig = ({ handles, errorTracking }: { handles: number; errorTracking?: { enabled: boolean } }) => ({
  ...(errorTracking && { deploymentConfig: { errorTracking } }),
  resources: Object.fromEntries(
    Array.from({ length: FUNCTIONS }, (_, index) => [
      `fn${index}`,
      {
        type: 'function',
        properties: { packaging: { type: 'js-bundle', properties: { entryfilePath: './src/handler.ts' } } }
      }
    ])
  ),
  cloudformationResources: Object.fromEntries(
    Array.from({ length: handles }, (_, index) => [
      `Handle${index}`,
      { Type: 'AWS::CloudFormation::WaitConditionHandle' }
    ])
  )
});

const synthesize = (config: ReturnType<typeof nearLimitConfig>) =>
  synthesizeFixture({
    compiledConfig: { config, transforms: {} } as never,
    workingDir: join(import.meta.dir, 'fixtures')
  });

describe('CloudFormation resource limit', () => {
  test('names the resources error tracking added and the setting that removes them', async () => {
    const withoutTracking = await synthesize(nearLimitConfig({ handles: 0, errorTracking: { enabled: false } }));
    const handles = 500 - Object.keys(withoutTracking.Resources).length;

    const atLimit = await synthesize(nearLimitConfig({ handles, errorTracking: { enabled: false } }));
    expect(Object.keys(atLimit.Resources)).toHaveLength(500);

    const error = await synthesize(nearLimitConfig({ handles })).then(
      () => undefined,
      (failure: unknown) => failure as { code?: string; message: string; hints: string[] }
    );
    expect(error?.code).toBe('CLOUDFORMATION_RESOURCE_LIMIT_EXCEEDED');
    // One subscription filter per function plus the shared permission.
    expect(error?.message).toContain(
      `This template contains ${500 + FUNCTIONS + 1}, ${FUNCTIONS + 1} of them added by error tracking.`
    );
    expect(error?.hints.join('\n')).toContain('Without it, this template has 500 resources, within the limit.');
    expect(error?.hints.join('\n')).toContain('`deploymentConfig.errorTracking.enabled: false`');
    expect(error?.hints.join('\n')).toContain('`deploymentConfig.errorTracking.stages: [...]`');
  });
});
