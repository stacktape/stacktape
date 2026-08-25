/**
 * The environment probe's hosting claim: which file speaks for where the data lives.
 *
 * The property under protection is the "never replace a live external database" guarantee. It
 * triggers off `currentlyHostedOn`, and `currentlyHostedOn` comes from environment files that can
 * disagree: the laptop's `.env` says localhost while `.env.production` says Supabase. Whichever
 * claim wins decides whether composition provisions a brand-new database next to a live one.
 */

import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'bun:test';
import { assembleCandidateFacts, createProbeContext } from '../assemble';
import { safeDeclaredLiteral } from './declared-environment';
import { environmentProbe } from './environment';

let root: string;

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

const makeRepo = async (files: Record<string, string>): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'stp-env-probe-'));
  await Promise.all(
    Object.entries(files).map(async ([path, contents]) => {
      const absolute = join(directory, path);
      await mkdir(join(absolute, '..'), { recursive: true });
      await writeFile(absolute, contents, 'utf8');
    })
  );
  return directory;
};

describe('the environment probe hosting claim', () => {
  it('lets a managed provider beat the laptop, whichever file is read first', async () => {
    root = await makeRepo({
      // `.env` sorts (and is usually listed) before `.env.production`. First-wins here would
      // record `local` and quietly bypass the live-database protection.
      '.env': 'DATABASE_URL=postgres://localhost:5432/dev\n',
      '.env.production': 'DATABASE_URL=postgres://db.abcdefgh.supabase.co:5432/postgres\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [environmentProbe]
    });
    const database = facts.dependencies.find((entry) => entry.kind === 'postgres');

    expect(database?.currentlyHostedOn).toBe('supabase');
  });

  it('retains safe deployment-template overrides without copying numeric credential-like values', async () => {
    root = await makeRepo({
      '.env.docker.example': [
        'CACHE_DRIVER=redis',
        'QUEUE_DRIVER=redis',
        'PHP_OPCACHE_ENABLE=1',
        'APP_DOMAIN=yourdomain.example',
        'ADMIN_PIN=1234',
        'OTP_CODE=000000'
      ].join('\n')
    });

    const output = await environmentProbe.run(createProbeContext(root, ['.env.docker.example']));
    const variables = new Map(
      (output.serviceEnvironments?.[0]?.environmentVariables ?? []).map((variable) => [variable.name, variable])
    );

    expect(variables.get('CACHE_DRIVER')).toMatchObject({ safeLiteralValue: 'redis', required: true });
    expect(variables.get('QUEUE_DRIVER')).toMatchObject({ safeLiteralValue: 'redis', required: true });
    expect(variables.has('PHP_OPCACHE_ENABLE')).toBe(false);
    expect(variables.has('APP_DOMAIN')).toBe(false);
    expect(variables.has('ADMIN_PIN')).toBe(false);
    expect(variables.has('OTP_CODE')).toBe(false);
  });

  it('keeps the managed provider when a later file names localhost', async () => {
    root = await makeRepo({
      '.env': 'DATABASE_URL=postgres://db.abcdefgh.supabase.co:5432/postgres\n',
      '.env.development': 'DATABASE_URL=postgres://localhost:5432/dev\n'
    });

    const { facts } = await assembleCandidateFacts({
      root,
      probes: [environmentProbe]
    });
    const database = facts.dependencies.find((entry) => entry.kind === 'postgres');

    expect(database?.currentlyHostedOn).toBe('supabase');
  });

  it('uses template values to identify dependencies without claiming their example resources are live', async () => {
    root = await makeRepo({
      '.env.example': [
        'DATABASE_URL=postgres://db.abcdefgh.supabase.co:5432/postgres',
        'SQS_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/123456789012/example-queue'
      ].join('\n')
    });

    const output = await environmentProbe.run(createProbeContext(root, ['.env.example']));
    const database = output.dependencies?.find((entry) => entry.kind === 'postgres');
    const queue = output.dependencies?.find((entry) => entry.kind === 'queue');

    expect(database).toMatchObject({
      kind: 'postgres',
      addressedBy: ['DATABASE_URL']
    });
    expect(queue).toMatchObject({
      kind: 'queue',
      addressedBy: ['SQS_QUEUE_URL']
    });
    expect(database?.currentlyHostedOn).toBeUndefined();
    expect(database?.hostingEvidence).toBeUndefined();
    expect(queue?.currentlyHostedOn).toBeUndefined();
    expect(queue?.hostingEvidence).toBeUndefined();
  });

  it('keeps broker protocols distinct instead of translating RabbitMQ or NATS into SQS', async () => {
    root = await makeRepo({
      '.env.example': ['RABBITMQ_URL=amqp://rabbitmq:5672/orders', 'NATS_URL=nats://nats:4222'].join('\n')
    });

    const output = await environmentProbe.run(createProbeContext(root, ['.env.example']));

    expect(output.dependencies?.map((entry) => entry.kind).toSorted()).toEqual(['amqp', 'nats']);
    expect(output.dependencies?.some((entry) => entry.kind === 'queue')).toBe(false);
  });
});

describe('safe declared environment literals', () => {
  it('requires an operational name even when the value looks boolean or numeric', () => {
    expect(safeDeclaredLiteral('PHP_OPCACHE_ENABLE', '1')).toBe('1');
    expect(safeDeclaredLiteral('AUTORUN_LARAVEL_MIGRATION', true)).toBe('true');
    expect(safeDeclaredLiteral('ADMIN_PIN', 1234)).toBeUndefined();
    expect(safeDeclaredLiteral('OTP_CODE', '000000')).toBeUndefined();
  });
});
