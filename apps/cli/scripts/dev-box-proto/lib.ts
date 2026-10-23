/** Shared guardrails and helpers for the dev-box prototype measurements (account 597581086285, eu-west-1 only). */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';

export const EXPECTED_ACCOUNT = '597581086285';
export const REGION = 'eu-west-1';
export const PROFILE = 'stacktape-e2e';
process.env.AWS_PROFILE = PROFILE;
delete process.env.AWS_ACCESS_KEY_ID;
delete process.env.AWS_SECRET_ACCESS_KEY;
delete process.env.AWS_SESSION_TOKEN;

export const RUN = process.env.DEVBOX_RUN ?? readFileSync('/tmp/devbox-proto-current-run', 'utf8').trim();
export const PROJECT = RUN;
export const RUNS_DIR = '/home/congy/projects/stacktape/.stacktape/research/dev-mode-e2e/devbox-runs';
export const RUN_DIR = join(RUNS_DIR, RUN);
export const STATE_FILE = join(RUNS_DIR, `${RUN}.state.json`);
export const WORK_DIR = `/tmp/${RUN}`;
mkdirSync(RUN_DIR, { recursive: true });

export const stackName = (stage: string) => `${PROJECT}-${stage}`;
export const functionName = (stage: string, fn: string) => `${stackName(stage)}-${fn}`;

export const assertAccount = async () => {
  const { Account } = await new STSClient({ region: REGION }).send(new GetCallerIdentityCommand({}));
  if (Account !== EXPECTED_ACCOUNT) throw new Error(`Refusing to run: account ${Account} is not ${EXPECTED_ACCOUNT}`);
  return Account;
};

type State = { run: string; account: string; region: string; profile: string; resources: Record<string, unknown>[] };
export const readState = (): State =>
  existsSync(STATE_FILE)
    ? JSON.parse(readFileSync(STATE_FILE, 'utf8'))
    : { run: RUN, account: EXPECTED_ACCOUNT, region: REGION, profile: PROFILE, resources: [] };
export const recordResource = (resource: Record<string, unknown>) => {
  const state = readState();
  if (!state.resources.some((r) => JSON.stringify(r) === JSON.stringify(resource))) state.resources.push(resource);
  writeFileSync(STATE_FILE, `${JSON.stringify(state, null, 2)}\n`);
};

export const record = (file: string, entry: unknown) =>
  appendFileSync(join(RUN_DIR, file), `${JSON.stringify({ at: new Date().toISOString(), ...(entry as object) })}\n`);

const lambda = new LambdaClient({ region: REGION });
/** Invokes a function and returns its payload plus the REPORT line numbers (duration, init duration). */
export const invoke = async (fn: string, payload: unknown) => {
  const started = performance.now();
  const response = await lambda.send(
    new InvokeCommand({ FunctionName: fn, Payload: Buffer.from(JSON.stringify(payload)), LogType: 'Tail' })
  );
  const clientMs = performance.now() - started;
  const log = Buffer.from(response.LogResult ?? '', 'base64').toString('utf8');
  const report = log.split('\n').find((line) => line.startsWith('REPORT')) ?? '';
  const num = (label: string) => Number(report.match(new RegExp(`${label}: ([0-9.]+) ms`))?.[1] ?? NaN);
  const body = response.Payload ? JSON.parse(Buffer.from(response.Payload).toString('utf8') || 'null') : null;
  return {
    body,
    functionError: response.FunctionError,
    clientMs,
    durationMs: num('Duration'),
    initMs: num('Init Duration'),
    log: response.FunctionError ? log.slice(-2000) : undefined
  };
};

export const summary = (samples: number[]) => {
  const sorted = [...samples].filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1))];
  return { n: sorted.length, p50: at(0.5), p95: at(0.95), max: sorted.at(-1), min: sorted[0] };
};
