/** Query latency matrix: function × path, each invocation runs n SELECT 1 and largeReps 5 MB results. Raw → latency.jsonl. */
import { readFileSync } from 'node:fs';
import { assertAccount, functionName, invoke, record, summary } from './lib';

await assertAccount();
const [boxHost, boxPort] = ['172.16.3.128', 9232];
const [boreHost, borePort] = readFileSync('/tmp/devbox-borepub-endpoint', 'utf8').trim().split(':');
const creds = { user: 'postgres', password: 'devbox-proto-password', database: 'postgres' };
const paths = {
  devbox: { host: boxHost, port: boxPort, ...creds },
  borepub: { host: boreHost, port: Number(borePort), ...creds }
};
const matrix: [string, keyof typeof paths][] = [
  ['benchArm', 'devbox'],
  ['benchX86', 'devbox'],
  ['benchArm', 'borepub'],
  ['benchX86', 'borepub'],
  ['benchNoVpc', 'borepub']
];
const reps = Number(process.env.REPS ?? 3);
const all: Record<string, { selectOne: number[]; large: number[]; connect: number[] }> = {};
for (let rep = 0; rep < reps; rep++) {
  for (const [fn, path] of matrix) {
    const result = await invoke(functionName('box', fn), { action: 'latency', target: paths[path], n: 200, largeReps: 5 });
    record('latency.jsonl', { fn, path, rep, ...result });
    const key = `${fn}/${path}`;
    all[key] ??= { selectOne: [], large: [], connect: [] };
    if (result.functionError || !result.body?.selectOne) {
      console.log(key, 'FAILED', JSON.stringify(result.body).slice(0, 300));
      continue;
    }
    all[key].connect.push(result.body.connectMs);
    all[key].selectOne.push(result.body.selectOne.p50, result.body.selectOne.p95);
    all[key].large.push(result.body.large.p50);
    console.log(key, rep, 'connect', result.body.connectMs.toFixed(0), 'select1', JSON.stringify(result.body.selectOne), '5MB', JSON.stringify(result.body.large));
  }
}
