/**
 * bun disconnect.ts <label> <seconds> '<shell action>' — polls benchArm (fresh connection per call) about once a
 * second, runs the action after 10 s, and records every result with its offset from the action. Raw → disconnect.jsonl.
 */
import { execSync } from 'node:child_process';
import { assertAccount, functionName, invoke, record } from './lib';
await assertAccount();
const [label, seconds, action] = process.argv.slice(2);
const target = { host: '172.16.3.128', port: 9232, user: 'postgres', password: 'devbox-proto-password', database: 'postgres' };
const start = Date.now();
let actionAt: number | undefined;
const timeline: { t: number; ok: boolean; ms: number; error?: string }[] = [];
setTimeout(() => {
  actionAt = Date.now();
  console.log('action:', action);
  try {
    execSync(action, { stdio: 'inherit', shell: '/bin/bash' });
  } catch (error) {
    console.log('action failed', String(error));
  }
}, 10_000);
while (Date.now() - start < Number(seconds) * 1000) {
  const at = Date.now();
  const r = await invoke(functionName('box', 'benchArm'), { action: 'once', target });
  const t = (at - (actionAt ?? at)) / 1000;
  timeline.push({ t: actionAt ? t : (at - start) / 1000 - 10, ok: Boolean(r.body?.ok), ms: r.body?.ms, error: r.body?.error });
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, 1000 - (Date.now() - at))));
}
const failures = timeline.filter((x) => !x.ok && x.t >= 0);
const lastFailure = failures.at(-1);
const recovered = lastFailure ? timeline.find((x) => x.ok && x.t > lastFailure.t) : undefined;
const entry = {
  label,
  failedCalls: failures.length,
  firstFailureT: failures[0]?.t,
  lastFailureT: lastFailure?.t,
  recoveredAtT: recovered?.t,
  errors: [...new Set(failures.map((f) => f.error))],
  timeline
};
record('disconnect.jsonl', entry);
console.log(JSON.stringify({ ...entry, timeline: undefined }));
