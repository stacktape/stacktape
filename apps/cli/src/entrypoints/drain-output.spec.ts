import { describe, expect, it } from 'bun:test';
import { Writable } from 'node:stream';
import { drainOutputStream } from './drain-output';

describe('drainOutputStream', () => {
  it('waits for output that was queued before the drain request', async () => {
    const stream = new Writable({
      write(_chunk, _encoding, callback) {
        setTimeout(callback, 50);
      }
    }) as unknown as NodeJS.WriteStream;
    stream.write('large final JSONL record');

    const startedAt = performance.now();
    const drained = await drainOutputStream(stream, 1_000);

    expect(drained).toBe(true);
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(40);
  });
});
