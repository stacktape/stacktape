import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { configManager } from '@domain-services/config-manager';
import { startMiniStack, type MiniStack, type MiniStackAccount } from '@stacktape/ministack/fixture';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { ensureMissingSecretsCreated, releaseDevGeneratedSecrets } from '../../src/commands/_utils/secret-preflight';

// The secrets `stacktape dev` generates for a stage (database passwords) outlive every dev stage: deleting a stage
// removes its user tag and keeps the secret. A secret a CLI up to 4.0.0-preview.11 scheduled for deletion comes back
// with the next command that needs it.

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

/** The tags of a secret dev mode generated for `generatedFor` and that the dev stacks `users` use, in any order. */
const devTags = (generatedFor: string, ...users: string[]) =>
  expect.arrayContaining([
    { Key: tagNames.devGeneratedSecret(), Value: generatedFor },
    ...users.map((user) => ({ Key: tagNames.devSecretUser(user), Value: user }))
  ]);
const userCount = (tags: { Key?: string }[]) =>
  tags.filter(({ Key }) => Key?.startsWith(tagNames.devSecretUserPrefix())).length;

/** Fails the test on any DeleteSecret: no stage deletion may send one. */
const forbidDeletion = () => {
  const original = awsSdkManager.secrets.delete;
  awsSdkManager.secrets.delete = async () => {
    throw new Error('A dev stage deletion sent DeleteSecret');
  };
  return () => (awsSdkManager.secrets.delete = original);
};

// r2rr finding 2 and r2af finding 1: a deletion that decided from the tags whether the secret was still used raced a
// deployment that adopted it, and scheduled a password a running application reads. A deletion now keeps every secret.
test('deleting the only stage that uses a generated secret keeps it and removes only its user tag', async () => {
  const { state, value } = useAccount(ministack.account());
  referenceSecrets('shop-cache');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  expect((await state('shop-cache'))?.tags).toEqual(devTags('shop-alice', 'shop-alice'));
  const generated = await value('shop-cache');

  const allowDeletion = forbidDeletion();
  try {
    expect(await releaseDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual([{ name: 'shop-cache', usedBy: [] }]);
  } finally {
    allowDeletion();
  }
  const kept = await state('shop-cache');
  expect(kept?.deleted).toBe(false);
  expect(kept?.tags).toEqual(devTags('shop-alice'));
  expect(userCount(kept!.tags)).toBe(0);
  expect(await value('shop-cache')).toBe(generated);
});

test('deleting one of two stages that use a generated secret reports the other, and deleting both keeps it', async () => {
  const { state } = useAccount(ministack.account());
  referenceSecrets('shop-session');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  expect((await state('shop-session'))?.tags).toEqual(devTags('shop-alice', 'shop-alice', 'shop-bob'));

  const allowDeletion = forbidDeletion();
  try {
    expect(await releaseDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual([
      { name: 'shop-session', usedBy: ['shop-bob'] }
    ]);
    expect(await releaseDevGeneratedSecrets({ stackName: 'shop-bob' })).toEqual([{ name: 'shop-session', usedBy: [] }]);
  } finally {
    allowDeletion();
  }
  const kept = await state('shop-session');
  expect(kept?.deleted).toBe(false);
  expect(userCount(kept!.tags)).toBe(0);
});

// The r2af interleaving: a deployment outside dev mode adopts the secret while the stage's deletion runs.
test('a deployment that adopts a dev secret while its stage is deleted keeps it, with no dev tags left', async () => {
  const { state, value } = useAccount(ministack.account());
  referenceSecrets('shop-orders');
  await ensureMissingSecretsCreated({ devStackName: 'shop-orders-dev' });
  const generated = await value('shop-orders');

  const untag = awsSdkManager.secrets.untag;
  let adopted = false;
  awsSdkManager.secrets.untag = async (input) => {
    if (!adopted && input.tagKeys?.includes(tagNames.devSecretUser('shop-orders-dev'))) {
      adopted = true;
      await ensureMissingSecretsCreated();
    }
    return untag(input);
  };
  const allowDeletion = forbidDeletion();
  try {
    await releaseDevGeneratedSecrets({ stackName: 'shop-orders-dev' });
  } finally {
    allowDeletion();
    awsSdkManager.secrets.untag = untag;
  }
  expect(adopted).toBe(true);
  expect(await state('shop-orders')).toEqual({ deleted: false, tags: [] });
  expect(await value('shop-orders')).toBe(generated);
});

test('a dev start or deployment restores a generated secret an older CLI scheduled for deletion', async () => {
  const { state, value } = useAccount(ministack.account());
  referenceSecrets('shop-queue');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  const generated = await value('shop-queue');
  // What deleting the stage with a CLI up to 4.0.0-preview.11 does.
  await awsSdkManager.secrets.delete({ secretId: 'shop-queue', recoveryWindowInDays: 7 });
  expect((await state('shop-queue'))?.deleted).toBe(true);

  // Another stage that uses it only inside $CfFormat gets it back and records itself next to the first stage.
  for (const key of overridden.splice(0)) delete (configManager as unknown as Record<PropertyKey, unknown>)[key];
  configManager.config = {
    resources: {},
    variables: { queueUrl: "$CfFormat('amqp://app:{}@queue.internal', $Secret('shop-queue.password'))" }
  } as unknown as typeof configManager.config;
  try {
    await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  } finally {
    configManager.reset();
  }
  const restored = await state('shop-queue');
  expect(restored).toEqual({ deleted: false, tags: devTags('shop-alice', 'shop-alice', 'shop-bob') });
  expect(userCount(restored!.tags)).toBe(2);
  expect(await value('shop-queue')).toBe(generated);

  // A deployment restores one the same way, and takes it out of dev ownership.
  await awsSdkManager.secrets.delete({ secretId: 'shop-queue', recoveryWindowInDays: 7 });
  referenceSecrets('shop-queue');
  await ensureMissingSecretsCreated();
  expect(await state('shop-queue')).toEqual({ deleted: false, tags: [] });
  expect(await value('shop-queue')).toBe(generated);
});

test('a dev start at the tag limit and a deployment that may not untag both go on', async () => {
  const { state } = useAccount(ministack.account());
  referenceSecrets('shop-shared');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  const { tag, untag } = awsSdkManager.secrets;
  awsSdkManager.secrets.tag = async () => {
    throw Object.assign(new Error('Number of tags exceeds the limit of 50 tags for the secret.'), {
      name: 'ValidationException'
    });
  };
  awsSdkManager.secrets.untag = async () => {
    throw Object.assign(new Error('not authorized to perform: secretsmanager:UntagResource'), {
      name: 'AccessDeniedException'
    });
  };
  try {
    await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
    await ensureMissingSecretsCreated();
  } finally {
    Object.assign(awsSdkManager.secrets, { tag, untag });
  }
  expect(await state('shop-shared')).toEqual({ deleted: false, tags: devTags('shop-alice', 'shop-alice') });
});
