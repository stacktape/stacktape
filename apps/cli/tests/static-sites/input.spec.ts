import { expect, test } from 'bun:test';
import { validateBucketSyncInput } from '../../src/commands/bucket-sync';

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
