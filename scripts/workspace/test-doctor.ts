import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { access } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { type CapturedProcess, runCapturedProcess } from './child-process.ts';

const workspaceRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const EXPECTED_NODE = '24.15.0';
const EXPECTED_PNPM = '11.17.0';
const EXPECTED_BUN = '1.4.1';
const CONSOLE_DEV_ACCOUNT = '977946299200';

export type DoctorScope = 'workspace' | 'console' | 'aws';

export type DoctorOptions = {
  json: boolean;
  scope: DoctorScope;
};

type Check = {
  detail: string;
  name: string;
  status: 'pass' | 'fail' | 'skip';
};

const isDoctorScope = (value: string): value is DoctorScope => ['workspace', 'console', 'aws'].includes(value);

const parseVersion = (value: string): number[] => {
  const match = /^(\d+)\.(\d+)\.(\d+)/.exec(value.replace(/^v/, ''));
  if (!match) throw new Error(`Could not parse version ${value}.`);
  return match.slice(1).map(Number);
};

export const parseDoctorArgs = (args: string[]): DoctorOptions => {
  let scope: DoctorScope = 'workspace';
  let json = false;
  for (const argument of args) {
    // pnpm keeps the conventional separator when forwarding arguments to a package script.
    if (argument === '--') continue;
    if (argument === '--json') {
      json = true;
      continue;
    }
    if (argument.startsWith('--for=')) {
      const value = argument.slice('--for='.length);
      if (!isDoctorScope(value)) throw new Error(`Unknown doctor scope: ${value}`);
      scope = value;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  return { json, scope };
};

export const compareVersions = (left: string, right: string): number => {
  const leftParts = parseVersion(left);
  const rightParts = parseVersion(right);
  for (let index = 0; index < 3; index += 1) {
    const difference = leftParts[index]! - rightParts[index]!;
    if (difference !== 0) return difference;
  }
  return 0;
};

const run = (command: string, args: string[], env: NodeJS.ProcessEnv = process.env): Promise<CapturedProcess> =>
  runCapturedProcess({ args, command, cwd: workspaceRoot, env });

const addVersionCheck = async (
  checks: Check[],
  name: string,
  command: string,
  expected: string,
  options: { minimum?: boolean } = {}
) => {
  const result = await run(command, ['--version']);
  const actual = result.stdout.trim().replace(/^v/, '');
  const matches =
    result.code === 0 &&
    (options.minimum
      ? compareVersions(actual, expected) >= 0 && compareVersions(actual, '25.0.0') < 0
      : compareVersions(actual, expected) === 0);
  checks.push({
    detail: matches
      ? actual
      : result.code === 0
        ? `found ${actual}; expected ${options.minimum ? `>=${expected} <25` : expected}`
        : result.stderr.trim() || 'command not found',
    name,
    status: matches ? 'pass' : 'fail'
  });
};

const addCommandCheck = async (checks: Check[], name: string, command: string, args: string[]) => {
  const result = await run(command, args);
  checks.push({
    detail: result.code === 0 ? result.stdout.trim() || 'available' : result.stderr.trim() || result.stdout.trim(),
    name,
    status: result.code === 0 ? 'pass' : 'fail'
  });
  return result;
};

const addPathCheck = async (checks: Check[], name: string, path: string) => {
  try {
    await access(join(workspaceRoot, path));
    checks.push({ detail: path, name, status: 'pass' });
  } catch {
    checks.push({ detail: `missing ${path}`, name, status: 'fail' });
  }
};

export const runDoctor = async ({ json, scope }: DoctorOptions): Promise<number> => {
  const checks: Check[] = [];
  await addVersionCheck(checks, 'Node.js', process.execPath, EXPECTED_NODE, { minimum: true });
  await addVersionCheck(checks, 'pnpm', 'pnpm', EXPECTED_PNPM);
  await addVersionCheck(checks, 'Bun', 'bun', EXPECTED_BUN);
  await addPathCheck(checks, 'Workspace install', 'node_modules/.pnpm/lock.yaml');
  await addPathCheck(checks, 'Workspace command links', 'node_modules/.bin/turbo');

  if (scope === 'console') {
    await addPathCheck(checks, 'Console submodule', 'apps/console/api/package.json');
    await addPathCheck(checks, 'Console API install', 'apps/console/api/node_modules/.pnpm/lock.yaml');
    await addPathCheck(checks, 'Console API command links', 'apps/console/api/node_modules/.bin/prisma');
    await addPathCheck(checks, 'Console Prisma client', 'apps/console/api/@generated/prisma/client.ts');
    await addPathCheck(checks, 'Console UI install', 'apps/console/ui/node_modules/.pnpm/lock.yaml');
    await addPathCheck(checks, 'Console UI command links', 'apps/console/ui/node_modules/.bin/playwright');
  }

  if (scope === 'console' || scope === 'aws') {
    await addCommandCheck(checks, 'Docker daemon', 'docker', ['info', '--format', '{{.ServerVersion}}']);
    const expectedAccount = scope === 'console' ? CONSOLE_DEV_ACCOUNT : process.env.STP_AWS_CANARY_EXPECTED_ACCOUNT_ID;
    try {
      const identity = await new STSClient({ region: 'eu-west-1' }).send(new GetCallerIdentityCommand({}));
      const account = identity.Account;
      const identityMatches = typeof account === 'string' && account === expectedAccount;
      checks.push({
        detail: !expectedAccount
          ? 'set STP_AWS_CANARY_EXPECTED_ACCOUNT_ID to the exact disposable account ID'
          : identityMatches
            ? account
            : `active account ${String(account ?? 'unknown')}; expected ${expectedAccount}`,
        name: 'AWS account preflight',
        status: identityMatches ? 'pass' : 'fail'
      });
    } catch (error) {
      checks.push({
        detail: error instanceof Error ? error.message : 'AWS identity lookup failed',
        name: 'AWS account preflight',
        status: 'fail'
      });
    }
  }

  if (scope === 'console' && !checks.some((check) => check.status === 'fail')) {
    const loginCheck = await addCommandCheck(checks, 'Stacktape dev login', 'pnpm', [
      'dev:cli',
      'info:whoami',
      '--agent',
      '--outputFormat',
      'jsonl'
    ]);
    if (loginCheck.code !== 0) {
      checks.at(-1)!.detail = 'not logged in; run `pnpm dev:cli login` and finish the browser flow';
    }
    await addCommandCheck(checks, 'Console dev parameters', 'pnpm', ['parameters:check:console:dev']);
    await addCommandCheck(checks, 'Console devlocal parameters', 'pnpm', ['parameters:check:console:devlocal']);
  }

  if (json) {
    console.info(JSON.stringify({ checks, ok: !checks.some((check) => check.status === 'fail'), scope }, null, 2));
  } else {
    console.info(`Stacktape test doctor (${scope})`);
    for (const check of checks) {
      console.info(`${check.status.toUpperCase().padEnd(4)}  ${check.name}: ${check.detail}`);
    }
  }
  return checks.some((check) => check.status === 'fail') ? 1 : 0;
};

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  try {
    process.exitCode = await runDoctor(parseDoctorArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 2;
  }
}
