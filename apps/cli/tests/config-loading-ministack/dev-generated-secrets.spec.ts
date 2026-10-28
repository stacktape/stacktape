import { GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
import { configManager } from '@domain-services/config-manager';
import { startMiniStack, type MiniStack, type MiniStackAccount } from '@stacktape/ministack/fixture';
import { tagNames } from '@stacktape/naming/tag-names';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { afterAll, afterEach, beforeAll, expect, test } from 'bun:test';
import { deleteDevGeneratedSecrets, ensureMissingSecretsCreated } from '../../src/commands/_utils/secret-preflight';

// The secrets `stacktape dev` generates for a stage (database passwords) are deleted with the last dev stage that uses
// them, never while another stage uses one, and a stage that still needs one gets it back within the recovery window.

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
const released = { Key: tagNames.devSecretReleased(), Value: 'true' };
const userCount = (tags: { Key?: string }[]) =>
  tags.filter(({ Key }) => Key?.startsWith(tagNames.devSecretUserPrefix())).length;

test('a stage deletes a secret it alone uses, and a stage that needs one restores it', async () => {
  const { state, value } = useAccount(ministack.account());

  referenceSecrets('shop-cache');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  expect((await state('shop-cache'))?.tags).toEqual(devTags('shop-alice', 'shop-alice'));
  const generated = await value('shop-cache');

  // Deleting the stage schedules it for deletion; the next session of a stage that uses it restores the same value.
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual({ deleted: ['shop-cache'], kept: [] });
  expect((await state('shop-cache'))?.deleted).toBe(true);
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  const restored = await state('shop-cache');
  expect(restored).toEqual({ deleted: false, tags: devTags('shop-alice', 'shop-alice') });
  expect(userCount(restored!.tags)).toBe(1);
  expect(await value('shop-cache')).toBe(generated);
});

// Fifth dogfood (r2cc): two dev stages used one generated secret, and after both were deleted it stayed, with no
// deletion planned.
test('a secret two dev stages use is deleted with the last of them, also when both are deleted at once', async () => {
  const { state } = useAccount(ministack.account());
  referenceSecrets('shop-session');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  expect((await state('shop-session'))?.tags).toEqual(devTags('shop-alice', 'shop-alice', 'shop-bob'));

  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual({
    deleted: [],
    kept: [{ name: 'shop-session', usedBy: ['shop-bob'] }]
  });
  expect(await state('shop-session')).toEqual({ deleted: false, tags: devTags('shop-alice', 'shop-bob') });
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-bob' })).toEqual({ deleted: ['shop-session'], kept: [] });
  expect((await state('shop-session'))?.deleted).toBe(true);

  // Both stages again, deleted in parallel: whichever removes its tag last schedules the deletion.
  referenceSecrets('shop-jobs');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  const results = await Promise.all(
    ['shop-alice', 'shop-bob'].map((stackName) => deleteDevGeneratedSecrets({ stackName }))
  );
  expect(results.flatMap(({ deleted }) => deleted)).toContain('shop-jobs');
  expect((await state('shop-jobs'))?.deleted).toBe(true);
});

test('a deployment that is not a dev session takes a dev secret out of dev ownership', async () => {
  const { state } = useAccount(ministack.account());
  referenceSecrets('shop-search');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  await ensureMissingSecretsCreated();
  expect(await state('shop-search')).toEqual({ deleted: false, tags: [released] });
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual({ deleted: [], kept: [] });
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-bob' })).toEqual({ deleted: [], kept: [] });
  expect((await state('shop-search'))?.deleted).toBe(false);
});

// Review of #369: past 50 tags, a dev start failed. It now keeps such a secret out of dev ownership instead.
test('a secret shared by more dev stages than its tags can record is kept, and no stage deletes it', async () => {
  const { state } = useAccount(ministack.account());
  referenceSecrets('shop-shared');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });

  const tag = awsSdkManager.secrets.tag;
  awsSdkManager.secrets.tag = async () => {
    throw Object.assign(new Error('Number of tags exceeds the limit of 50 tags for the secret.'), {
      name: 'ValidationException'
    });
  };
  try {
    await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  } finally {
    awsSdkManager.secrets.tag = tag;
  }
  expect((await state('shop-shared'))?.tags.filter(({ Key }) => Key !== released.Key)).toEqual([]);
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual({ deleted: [], kept: [] });
  expect((await state('shop-shared'))?.deleted).toBe(false);
});

test('a deployment that may not untag a dev secret marks it released, and deleting the stage keeps it', async () => {
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
  expect((await state('shop-db'))?.tags).toEqual(expect.arrayContaining([released]));
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual({ deleted: [], kept: [] });
  expect((await state('shop-db'))?.deleted).toBe(false);
});

test('a stage that uses a dev secret only inside $CfFormat restores it and keeps it', async () => {
  const { state, value } = useAccount(ministack.account());
  referenceSecrets('shop-queue');
  await ensureMissingSecretsCreated({ devStackName: 'shop-alice' });
  const generated = await value('shop-queue');
  for (const key of overridden.splice(0)) delete (configManager as unknown as Record<PropertyKey, unknown>)[key];
  expect(await deleteDevGeneratedSecrets({ stackName: 'shop-alice' })).toEqual({ deleted: ['shop-queue'], kept: [] });

  configManager.config = {
    resources: {},
    variables: { queueUrl: "$CfFormat('amqp://app:{}@queue.internal', $Secret('shop-queue.password'))" }
  } as unknown as typeof configManager.config;
  try {
    await ensureMissingSecretsCreated({ devStackName: 'shop-bob' });
  } finally {
    configManager.reset();
  }
  expect(await state('shop-queue')).toEqual({ deleted: false, tags: devTags('shop-alice', 'shop-bob') });
  expect(userCount((await state('shop-queue'))!.tags)).toBe(1);
  expect(await value('shop-queue')).toBe(generated);
});

/** Runs `during` once, inside the first call of `method` that `when` selects, before or after the real call. */
const interleave = <K extends 'untag' | 'tag' | 'delete'>(
  method: K,
  when: (input: Parameters<(typeof awsSdkManager.secrets)[K]>[0]) => boolean,
  during: () => Promise<unknown>,
  { after = false }: { after?: boolean } = {}
) => {
  const original = awsSdkManager.secrets[method] as (input: unknown) => Promise<unknown>;
  let ran = false;
  (awsSdkManager.secrets as unknown as Record<string, unknown>)[method] = async (input: never) => {
    if (ran || !when(input)) return original(input);
    ran = true;
    if (!after) await during();
    const result = await original(input);
    if (after) await during();
    return result;
  };
  return () => ((awsSdkManager.secrets as unknown as Record<string, unknown>)[method] = original);
};

// r2rr bug hunt, finding 2: a normal deployment adopted a dev secret while its dev stage was being deleted, and the
// deletion put the generator tag back and scheduled the adopted secret for deletion.
test('a deployment that adopts a dev secret while its stage is deleted keeps it, whenever it runs', async () => {
  const { state, value } = useAccount(ministack.account());
  const userTag = (stack: string) => (input: { tagKeys?: string[] }) =>
    Boolean(input.tagKeys?.includes(tagNames.devSecretUser(stack)));
  const scenarios = [
    // Between the deletion's removal of its own tag and its check of the remaining tags.
    [
      'shop-orders',
      () => interleave('untag', userTag('shop-orders-dev'), () => ensureMissingSecretsCreated(), { after: true })
    ],
    // Between the deletion's check and its DeleteSecret call.
    [
      'shop-billing',
      () =>
        interleave(
          'delete',
          () => true,
          () => ensureMissingSecretsCreated()
        )
    ],
    // The deployment read the tags before the deletion ran, and marks the secret after it was scheduled.
    [
      'shop-mail',
      () =>
        interleave(
          'tag',
          (input) => input.tags.some(({ Key }) => Key === released.Key),
          () => deleteDevGeneratedSecrets({ stackName: 'shop-mail-dev' })
        )
    ]
  ] as const;
  for (const [name, arrange] of scenarios) {
    referenceSecrets(name);
    await ensureMissingSecretsCreated({ devStackName: `${name}-dev` });
    const generated = await value(name);
    const restore = arrange();
    try {
      if (name === 'shop-mail') await ensureMissingSecretsCreated();
      else await deleteDevGeneratedSecrets({ stackName: `${name}-dev` });
    } finally {
      restore();
    }
    const after = await state(name);
    expect({ name, ...after }).toEqual({ name, deleted: false, tags: [released] });
    expect(await value(name)).toBe(generated);
  }
});
