import { describe, expect, test } from 'bun:test';
import { isTransferAccelerationEnabledInRegion } from './buckets';

describe('buckets', () => {
  describe('isTransferAccelerationEnabledInRegion', () => {
    test('should return false for ap-east-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'ap-east-1' });
      expect(result).toBe(false);
    });

    test('should return false for ap-northeast-3', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'ap-northeast-3' });
      expect(result).toBe(false);
    });

    test('should return false for af-south-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'af-south-1' });
      expect(result).toBe(false);
    });

    test('should return false for eu-north-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'eu-north-1' });
      expect(result).toBe(false);
    });

    test('should return false for me-south-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'me-south-1' });
      expect(result).toBe(false);
    });

    test('should return false for eu-south-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'eu-south-1' });
      expect(result).toBe(false);
    });

    test('should return true for us-east-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'us-east-1' });
      expect(result).toBe(true);
    });

    test('should return true for us-west-2', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'us-west-2' });
      expect(result).toBe(true);
    });

    test('should return true for eu-west-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'eu-west-1' });
      expect(result).toBe(true);
    });

    test('should return true for eu-central-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'eu-central-1' });
      expect(result).toBe(true);
    });

    test('should return true for ap-southeast-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'ap-southeast-1' });
      expect(result).toBe(true);
    });

    test('should return true for ap-northeast-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'ap-northeast-1' });
      expect(result).toBe(true);
    });

    test('should return true for sa-east-1', () => {
      const result = isTransferAccelerationEnabledInRegion({ region: 'sa-east-1' });
      expect(result).toBe(true);
    });

    test('should consistently return same result for same region', () => {
      const result1 = isTransferAccelerationEnabledInRegion({ region: 'us-east-1' });
      const result2 = isTransferAccelerationEnabledInRegion({ region: 'us-east-1' });
      expect(result1).toBe(result2);
    });

    test('should handle all disabled regions correctly', () => {
      const disabledRegions: Array<AWSRegion> = [
        'ap-east-1',
        'ap-northeast-3',
        'af-south-1',
        'eu-north-1',
        'me-south-1',
        'eu-south-1'
      ];

      disabledRegions.forEach((region) => {
        const result = isTransferAccelerationEnabledInRegion({ region });
        expect(result).toBe(false);
      });
    });
  });
});
