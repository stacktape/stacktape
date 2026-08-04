import { describe, expect, test } from 'bun:test';
import { SUPPORTED_AWS_REGIONS, isSupportedAwsRegion } from '../src/aws-regions';

describe('supported AWS regions', () => {
  test('preserves the CLI region catalog and ordering', () => {
    expect(SUPPORTED_AWS_REGIONS).toEqual([
      'us-east-2',
      'us-east-1',
      'us-west-1',
      'us-west-2',
      'ap-east-1',
      'ap-south-1',
      'ap-northeast-3',
      'ap-northeast-2',
      'ap-southeast-1',
      'ap-southeast-2',
      'ap-northeast-1',
      'ca-central-1',
      'eu-central-1',
      'eu-west-1',
      'eu-west-2',
      'eu-west-3',
      'eu-north-1',
      'me-south-1',
      'sa-east-1',
      'af-south-1',
      'eu-south-1'
    ]);
  });

  test('recognizes only regions in the supported catalog', () => {
    expect(isSupportedAwsRegion('eu-west-1')).toBe(true);
    expect(isSupportedAwsRegion('eu-central-2')).toBe(false);
    expect(isSupportedAwsRegion('')).toBe(false);
  });
});
