// Benchmark-only diagnostics. Never record request bodies, URLs, headers or credentials.
import { appendFileSync } from 'node:fs';
import { dlopen, ptr } from 'bun:ffi';

const libc = dlopen('libc.so.6', { clock_gettime: { args: ['i32', 'ptr'], returns: 'i32' } });
const clock = new BigInt64Array(2);
const pointer = ptr(clock);
export const hostClockMs = () => {
  if (libc.symbols.clock_gettime(1, pointer) !== 0) throw new Error('Cannot read benchmark host clock.');
  return Number(clock[0]) * 1000 + Number(clock[1]) / 1e6;
};
export const trace = (phase: string, detail: Record<string, string | number | undefined> = {}) => {
  const file = process.env.STP_CODE_SWAP_BENCH_TRACE;
  if (file) appendFileSync(file, JSON.stringify({ phase, hostMs: hostClockMs(), ...detail }) + '\n');
};
export const traceAsync = async <T>(phase: string, work: () => Promise<T>) => {
  trace(`${phase}:start`);
  try {
    return await work();
  } finally {
    trace(`${phase}:end`);
  }
};
