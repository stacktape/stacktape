/**
 * One wake cycle: the box must be scaled to zero and no dev session running. Starts `stacktape dev` (which wakes the
 * box) and, from the same moment, invokes benchArm every 2 s with one fresh connection to the relay address until a
 * query succeeds. Raw → wake.jsonl.
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import { assertAccount, functionName, invoke, record } from './lib';

await assertAccount();
const label = process.argv[2] ?? 'wake';
const target = { host: '172.16.3.128', port: 9232, user: 'postgres', password: 'devbox-proto-password', database: 'postgres' };
const start = Date.now();
const cli = spawn(join(import.meta.dir, 'dev-session.sh'), ['box', '47311', label], { stdio: 'inherit' });
const cliDone = new Promise<number>((resolve) => cli.once('exit', () => resolve(Date.now())));
let firstOk: number | undefined;
let attempts = 0;
while (!firstOk) {
  const at = Date.now();
  const result = await invoke(functionName('box', 'benchArm'), { action: 'once', target });
  attempts += 1;
  if (result.body?.ok) firstOk = Date.now();
  else await new Promise((r) => setTimeout(r, Math.max(0, 2000 - (Date.now() - at))));
  if (Date.now() - start > 10 * 60_000) break;
}
const cliReady = await cliDone;
const entry = { label, cliReadyS: (cliReady - start) / 1000, firstLambdaQueryOkS: firstOk ? (firstOk - start) / 1000 : null, attempts };
record('wake.jsonl', entry);
console.log(JSON.stringify(entry));
