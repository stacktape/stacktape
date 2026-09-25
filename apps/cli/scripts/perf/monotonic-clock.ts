/**
 * Linux `CLOCK_MONOTONIC` in nanoseconds: the one clock every process on the machine shares, which lets a measuring
 * process place a child's timeline in its own (see `utils/timings.ts`, which records the child's anchors).
 *
 * Bun's `process.hrtime` and `Bun.nanoseconds()` count from the process's own start, and wall-clock time can be
 * stepped, so neither can relate two processes. The clock is read through libc with `bun:ffi`; where that is not
 * possible `readMonotonicNs` is null and cross-process measurements are left out.
 */
import { dlopen, ptr } from 'bun:ffi';

const CLOCK_MONOTONIC = 1;
const NANOSECONDS_PER_SECOND = BigInt(1_000_000_000);

const createReader = (): (() => bigint) | null => {
  if (process.platform !== 'linux') return null;
  try {
    const libc = dlopen('libc.so.6', { clock_gettime: { args: ['i32', 'ptr'], returns: 'i32' } });
    const buffer = new BigInt64Array(2);
    const pointer = ptr(buffer);
    return () => {
      if (libc.symbols.clock_gettime(CLOCK_MONOTONIC, pointer) !== 0) throw new Error('clock_gettime failed');
      return buffer[0]! * NANOSECONDS_PER_SECOND + buffer[1]!;
    };
  } catch {
    return null;
  }
};

export const readMonotonicNs = createReader();
