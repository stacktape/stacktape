import { describe, expect, test } from 'bun:test';
import { IntrinsicFunction } from '../src/cloudformation';
import { CONNECT_TO_AWS_SERVICE_MACROS } from '../src/aws-service-macros';
import { acceptedConfiguration, api, rawSubscription } from './config-import.acceptance';

/**
 * The runtime half of the package's acceptance check.
 *
 * The configuration it asserts against is built in `config-import.acceptance.ts`, which the package's own
 * strict project compiles with `types: []`. This file needs `bun-types` for `bun:test`, and bun-types and
 * @types/node disagree about a few web-stream globals, so it compiles under `tests/tsconfig.json` instead.
 */

describe('a Stacktape configuration can be built from explicit package imports', () => {
  test('the authored resource model, packaging, events and escape hatch compose', () => {
    expect(Object.keys(acceptedConfiguration.resources)).toEqual(['api', 'site', 'uploads']);
    expect(acceptedConfiguration.cloudformationResources?.LegacyTopic?.Type).toBe('AWS::SNS::Topic');
    expect(api.properties.packaging.type).toBe('stacktape-lambda-buildpack');
  });
});

describe('the CloudFormation value vocabulary the escape hatch is written against', () => {
  test('an intrinsic function serialises to the single-key form CloudFormation expects', () => {
    // This shape is what ends up in the emitted template, and the published schema describes it structurally.
    expect(JSON.parse(JSON.stringify(new IntrinsicFunction('Ref', 'MyBucket')))).toEqual({ Ref: 'MyBucket' });
    expect(JSON.parse(JSON.stringify(new IntrinsicFunction('Fn::GetAtt', ['MyBucket', 'Arn'])))).toEqual({
      'Fn::GetAtt': ['MyBucket', 'Arn']
    });
  });

  test('intrinsics survive serialisation from inside a raw resource', () => {
    expect(JSON.parse(JSON.stringify(rawSubscription))).toEqual({
      Type: 'AWS::SNS::Subscription',
      Properties: { TopicArn: { Ref: 'Topic' } },
      Condition: { 'Fn::Equals': ['a', 'b'] }
    });
  });
});

describe('connectTo AWS service macros', () => {
  test('are the authored vocabulary, owned here rather than read back out of the CLI resolver', () => {
    expect(CONNECT_TO_AWS_SERVICE_MACROS).toEqual(['aws:ses']);
    // The CLI narrows `connectTo` entries with this list, so membership must be a real runtime check.
    expect(CONNECT_TO_AWS_SERVICE_MACROS.includes('aws:ses')).toBe(true);
    expect((CONNECT_TO_AWS_SERVICE_MACROS as readonly string[]).includes('myDatabase')).toBe(false);
  });
});
