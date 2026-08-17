import { describe, expect, test } from 'bun:test';
import {
  formatBytesAsMb,
  getLambdaCombinedUnzippedSizeBytes,
  LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES
} from './lambda-limits';

describe('Lambda combined size limit', () => {
  test('counts the function and every attached layer', () => {
    expect(
      getLambdaCombinedUnzippedSizeBytes({
        functionSizeBytes: 200 * 1024 * 1024,
        layerSizeBytes: [30 * 1024 * 1024, 21 * 1024 * 1024]
      })
    ).toBeGreaterThan(LAMBDA_MAX_COMBINED_UNZIPPED_SIZE_BYTES);
  });

  test('formats exact byte counts for actionable errors', () => {
    expect(formatBytesAsMb(262_144_000)).toBe('250.00');
  });
});
