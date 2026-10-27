import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { configManager } from '@domain-services/config-manager';
import { startMiniStack, type MiniStack, type MiniStackAccount } from '@stacktape/ministack/fixture';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { deleteDevGeneratedSecrets, ensureMissingSecretsCreated } from '../../src/commands/_utils/secret-preflight';

// The secrets `stacktape dev` generates for a stage (database passwords) are deleted with the stage, but never one that
// another stage uses, and a stage that still needs one gets it back within the recovery window.

let ministack: MiniStack;
beforeAll(async () => {
  ministack = await startMiniStack({ label: 'dev-generated-secrets' });
}, 120_000);
afterAll(async () => {
  await ministack?.stop();
});

const overridden: PropertyKey[] = [];
/** The config references `<name>.password` in a database password field, which makes the secret auto-generable. */
const referenceSecrets = (...names: string[]) => {
  const define = (key: PropertyKey, value: unknown) => {
    Object.defineProperty(configManager, key, { value, configurable: true });
    overridden.push(key);
  };
  define('allSecretReferencesUsedInConfig', new Map(names.map((name) => [name, new Set(['password'])])));
  define('autoGenerableSecretNames', new Set(names));
};
afterEach(() => {
  for (const key of overridden.splice(0)) delete (configManager as unknown as Record<PropertyKey, unknown>)[key];
});

const useAccount = (account: MiniStackAccount) => {
  awsSdkManager.init({ ...ministack.clientConfig(account), region: 'eu-west-1' });
  const client = new SecretsManagerClient({ ...ministack.clientConfig(account), region: 'eu-west-1' });
  const state = async (name: string) => {
    const [entry] = (await awsSdkManager.secrets.list({ includePlannedDeletion: true })).filter(
      ({ Name }) => Name === name
    );
    return entry && { deleted: Boolean(entry.DeletedDate), tags: entry.Tags ?? [] };
  };
  const value = async (name: string) => (await client.send(new GetSecretValueCommand({ SecretId: name }))).SecretString;
  return { state, value };
};

const devTag = (stack: string) => [{ Key: tagNames.devGeneratedSecret(), Value: stack }];

test('a stage deletes only the secrets still tagged for it, and a stage that needs one restores it', async () => {
  const { state, value } = useAccount(ministack.account());

  referenceSecrets('shop-cache');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  expect(await state('shop-cache')).toEqual({ deleted: false, tags: devTag('shop-alice') });
  const generated = await value('shop-cache');

  // Deleting the stage schedules it for deletion; the next session of a stage that uses it restores the same value.
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual(['shop-cache']);
  expect((await state('shop-cache'))?.deleted).toBe(true);
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  expect(await state('shop-cache')).toEqual({ deleted: false, tags: devTag('shop-alice') });
  expect(await value('shop-cache')).toBe(generated);

  // Another stage uses it, so it is no longer the dev stage's to delete.
  await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  expect(await state('shop-cache')).toEqual({ deleted: false, tags: [] });
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual([]);
  expect((await state('shop-cache'))?.deleted).toBe(false);
});

test('a deployment that may not untag a dev secret warns and goes on', async () => {
  const { state } = useAccount(ministack.account());
  referenceSecrets('shop-db');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });

  const untag = awsSdkManager.secrets.untag;
  awsSdkManager.secrets.untag = async () => {
    throw Object.assign(new Error('not authorized to perform: secretsmanager:UntagResource'), {
      name: 'AccessDeniedException'
    });
  };
  try {
    await ensureMissingSecretsCreated();
  } finally {
    awsSdkManager.secrets.untag = untag;
  }
  expect(await state('shop-db')).toEqual({ deleted: false, tags: devTag('shop-alice') });
});

test('a stage that uses a dev secret only inside $CfFormat restores it and keeps it', async () => {
  const { state, value } = useAccount(ministack.account());
  referenceSecrets('shop-queue');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  const generated = await value('shop-queue');
  for (const key of overridden.splice(0)) delete (configManager as unknown as Record<PropertyKey, unknown>)[key];
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual(['shop-queue']);

  configManager.config = {
    resources: {},
    variables: { queueUrl: "$CfFormat('amqp://app:{}@queue.internal', $Secret('shop-queue.password'))" }
  } as unknown as typeof configManager.config;
  try {
    await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  } finally {
    configManager.reset();
  }
  expect(await state('shop-queue')).toEqual({ deleted: false, tags: [] });
  expect(await value('shop-queue')).toBe(generated);
});
