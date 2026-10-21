// Optional benchmark diagnostics; normal deployments do not write trace files.
import { appendFileSync } from 'node:fs';
export const trace = (phase: string, detail: Record<string, unknown> = {}) => {
  const file = process.env.STP_CODE_SWAP_BENCH_TRACE;
  if (file) appendFileSync(file, JSON.stringify({ phase, hostMs: performance.now(), ...detail }) + '\n');
};
export const traceAsync = async <T>(phase: string, work: () => Promise<T>) => {
  trace(`${phase}:start`);
  try {
    return await work();
  } finally {
    trace(`${phase}:end`);
  }
};
