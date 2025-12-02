import { describe, expect, test } from 'bun:test';
import { isPortInUse } from './ports';

describe('ports', () => {
  test('should return false for free port', async () => {
    // Port 0 lets OS choose a free port
    const inUse = await isPortInUse(0);
    expect(inUse).toBe(false);
  });

  test('should check different hosts', async () => {
    const inUse = await isPortInUse(0, 'localhost');
    expect(typeof inUse).toBe('boolean');
  });
});
