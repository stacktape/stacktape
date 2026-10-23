/** Paused-sandbox test: module-scope pools in pauseProbe, invoked after idle gaps. Raw → pause.jsonl. */
import { readFileSync } from 'node:fs';
import { assertAccount, functionName, invoke, record } from './lib';

await assertAccount();
const [boreHost, borePort] = readFileSync('/tmp/devbox-borepub-endpoint', 'utf8').trim().split(':');
const creds = { user: 'postgres', password: 'devbox-proto-password', database: 'postgres' };
const targets = [
  { name: 'laptopViaDevbox', target: { host: '172.16.3.128', port: 9232, ...creds } },
  { name: 'laptopViaBorePub', target: { host: boreHost, port: Number(borePort), ...creds } },
  { name: 'boxLocalControl', target: { host: '172.16.3.128', port: 5499, ...creds } }
];
const gapsMin = (process.env.GAPS ?? '0,1,5,10,20').split(',').map(Number);
for (const gap of gapsMin) {
  if (gap) await new Promise((r) => setTimeout(r, gap * 60_000));
  const result = await invoke(functionName('box', 'pauseProbe'), { action: 'pool', targets });
  record('pause.jsonl', { gapMin: gap, ...result });
  console.log(`gap ${gap} min sandbox ${result.body?.sandboxId} inv ${result.body?.invocations}`, JSON.stringify(result.body?.results));
}
