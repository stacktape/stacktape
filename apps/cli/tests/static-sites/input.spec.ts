import { expect, test } from 'bun:test';
import { getDirectBucketSyncUploadConfiguration, validateBucketSyncInput } from '../../src/commands/bucket-sync';

test('reports invalid bucket sync modes with a stable, actionable contract', () => {
  let invalidInputError: { category: string; code: string; hints: string[] } | undefined;
  try {
    validateBucketSyncInput({});
  } catch (error) {
    invalidInputError = error as typeof invalidInputError;
  }

  expect(invalidInputError).toMatchObject({
    category: 'CLI',
    code: 'CLI_BUCKET_SYNC_INPUT_INVALID'
  });
  const guidance = invalidInputError?.hints.join(' ') || '';
  expect(guidance).toContain('resolves the bucket from the deployed stack');
  expect(guidance).toContain('source directory from your configuration');
  expect(guidance).toContain('accepts an AWS physical ID or bucket name');
  expect(guidance).toContain('stacktape info:stack');
  for (const args of [
    {},
    { stage: 'dev' },
    { resourceName: 'website' },
    { bucketId: 'assets' },
    { sourcePath: 'dist' },
    { stage: 'dev', resourceName: 'website', bucketId: 'assets', sourcePath: 'dist' }
  ]) {
    expect(() => validateBucketSyncInput(args)).toThrow(
      expect.objectContaining({ code: 'CLI_BUCKET_SYNC_INPUT_INVALID' })
    );
  }
  expect(() => validateBucketSyncInput({ stage: 'dev', resourceName: 'website' })).not.toThrow();
  expect(() => validateBucketSyncInput({ bucketId: 'customer-assets', sourcePath: 'dist' })).not.toThrow();
});

// An accelerated endpoint in these unsupported regions makes an otherwise valid customer upload fail.
test('direct sync disables transfer acceleration in excluded regions and keeps it in supported regions', () => {
  const cases = [
    { region: 'eu-north-1', disabled: true },
    { region: 'ap-east-1', disabled: true },
    { region: 'ap-northeast-3', disabled: true },
    { region: 'af-south-1', disabled: true },
    { region: 'me-south-1', disabled: true },
    { region: 'eu-south-1', disabled: true },
    { region: 'eu-west-1', disabled: false },
    { region: 'us-east-1', disabled: false }
  ] as const;
  for (const { region, disabled } of cases) {
    expect(
      getDirectBucketSyncUploadConfiguration({ args: {}, directoryPath: '/static-content', region })
        .disableS3TransferAcceleration
    ).toBe(disabled);
  }
});
