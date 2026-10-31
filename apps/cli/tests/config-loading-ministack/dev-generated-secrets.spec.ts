import { CreateSecretCommand, GetSecretValueCommand, SecretsManagerClient } from '@aws-sdk/client-secrets-manager';
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
/** The tag only the generation path writes, naming the project it generated the secret for. */
const generatedFor = (projectName: string) => ({ Key: tagNames.generatedSecretProject(), Value: projectName });
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
  await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-alice' });
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
  await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-alice' });
  await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-bob' });
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
  await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-orders-dev' });
  const generated = await value('shop-orders');

  const untag = awsSdkManager.secrets.untag;
  let adopted = false;
  awsSdkManager.secrets.untag = async (input) => {
    if (!adopted && input.tagKeys?.includes(tagNames.devSecretUser('shop-orders-dev'))) {
      adopted = true;
      await ensureMissingSecretsCreated({ projectName: 'shop' });
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
  expect(await state('shop-orders')).toEqual({ deleted: false, tags: [generatedFor('shop')] });
  expect(await value('shop-orders')).toBe(generated);
});

test('a dev start or deployment restores a generated secret an older CLI scheduled for deletion', async () => {
  const { state, value } = useAccount(ministack.account());
  referenceSecrets('shop-queue');
  await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-alice' });
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
    await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-bob' });
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
  await ensureMissingSecretsCreated({ projectName: 'shop' });
  expect(await state('shop-queue')).toEqual({ deleted: false, tags: [generatedFor('shop')] });
  expect(await value('shop-queue')).toBe(generated);
});

test('a dev start at the tag limit and a deployment that may not untag both go on', async () => {
  const { state } = useAccount(ministack.account());
  referenceSecrets('shop-shared');
  await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-alice' });
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
    await ensureMissingSecretsCreated({ projectName: 'shop', devStackName: 'shop-bob' });
    await ensureMissingSecretsCreated({ projectName: 'shop' });
  } finally {
    Object.assign(awsSdkManager.secrets, { tag, untag });
  }
  expect(await state('shop-shared')).toEqual({ deleted: false, tags: devTags('shop-alice', 'shop-alice') });
});

/** Holds every `list` call until `parties` calls have listed, so each command decides from a list without the others. */
const listTogether = (parties: number) => {
  const original = awsSdkManager.secrets.list;
  let release!: () => void;
  const allListed = new Promise<void>((resolve) => (release = resolve));
  let listed = 0;
  awsSdkManager.secrets.list = async (input) => {
    const result = await original(input);
    if (++listed === parties) release();
    await allListed;
    return result;
  };
  return () => (awsSdkManager.secrets.list = original);
};

type SecretInput = {
  Name: string;
  SecretString: string;
  Description?: string;
  Tags?: { Key: string; Value: string }[];
};
const createSecret = (account: MiniStackAccount, input: SecretInput) =>
  new SecretsManagerClient({ ...ministack.clientConfig(account), region: 'eu-west-1' }).send(
    new CreateSecretCommand(input)
  );

// r2bc: two fresh stages that share a generated database password started at the same moment. Both listed no secret,
// and the second CreateSecret failed with ResourceExistsException.
test('two stages that generate a shared secret at the same moment both start and use the value that won', async () => {
  const account = ministack.account();
  const { state, value } = useAccount(account);
  referenceSecrets('probe-db');
  const restoreList = listTogether(2);
  const create = awsSdkManager.secrets.createUnlessExists;
  const createResults: boolean[] = [];
  awsSdkManager.secrets.createUnlessExists = async (input) => {
    const created = await create(input);
    createResults.push(created);
    return created;
  };
  try {
    await Promise.all([
      ensureMissingSecretsCreated({ projectName: 'probe', devStackName: 'probe-neta' }),
      ensureMissingSecretsCreated({ projectName: 'probe', devStackName: 'probe-netb' })
    ]);
  } finally {
    restoreList();
    awsSdkManager.secrets.createUnlessExists = create;
  }
  expect(createResults.sort()).toEqual([false, true]);
  const secret = await state('probe-db');
  expect(secret?.deleted).toBe(false);
  expect(userCount(secret!.tags)).toBe(2);
  expect(secret?.tags).toEqual(
    expect.arrayContaining([
      { Key: tagNames.devSecretUser('probe-neta'), Value: 'probe-neta' },
      { Key: tagNames.devSecretUser('probe-netb'), Value: 'probe-netb' }
    ])
  );
  expect(secret?.tags).toContainEqual(generatedFor('probe'));
  const winner = secret!.tags.find(({ Key }) => Key === tagNames.devGeneratedSecret())?.Value;
  expect(['probe-neta', 'probe-netb']).toContain(winner);
  expect(Object.keys(JSON.parse((await value('probe-db'))!))).toEqual(['password']);

  // A deployment that generates the same password at the same moment as a dev stage uses the same value too.
  referenceSecrets('probe-cache');
  const restoreList2 = listTogether(2);
  try {
    await Promise.all([
      ensureMissingSecretsCreated({ projectName: 'probe', devStackName: 'probe-neta' }),
      ensureMissingSecretsCreated({ projectName: 'probe' })
    ]);
  } finally {
    restoreList2();
  }
  expect((await state('probe-cache'))?.deleted).toBe(false);
  expect(Object.keys(JSON.parse((await value('probe-cache'))!))).toEqual(['password']);
});

// Review of #430: the conflict path took over any secret with a dev tag or Stacktape's default description, also one
// generated for another project or set with `secret set`.
test('a secret created meanwhile that Stacktape did not generate for this project, or in another shape, stops the start', async () => {
  const account = ministack.account();
  const { state, value } = useAccount(account);
  /** Runs `create` right before this command's own CreateSecret, as a command that won the race. */
  const createMeanwhile = (create: () => Promise<unknown>) => {
    const original = awsSdkManager.secrets.createUnlessExists;
    awsSdkManager.secrets.createUnlessExists = async (args) => {
      awsSdkManager.secrets.createUnlessExists = original;
      await create();
      return original(args);
    };
    return () => (awsSdkManager.secrets.createUnlessExists = original);
  };
  const expectRefused = async (name: string, create: () => Promise<unknown>, expected: string) => {
    referenceSecrets(name);
    const restore = createMeanwhile(create);
    try {
      await expect(ensureMissingSecretsCreated({ projectName: 'probe', devStackName: 'probe-neta' })).rejects.toThrow(
        expected
      );
    } finally {
      restore();
    }
    const tags = (await state(name))?.tags ?? [];
    expect(tags).not.toContainEqual({ Key: tagNames.devSecretUser('probe-neta'), Value: 'probe-neta' });
  };
  const refusal = (name: string) =>
    `Secret ${name} was created while this command was generating it, and Stacktape did not generate it for project probe`;

  // Generated by dev mode for a stage of another project, with the same JSON keys.
  await expectRefused(
    'probe-other-project',
    () =>
      createSecret(account, {
        Name: 'probe-other-project',
        SecretString: JSON.stringify({ password: 'other-project-value' }),
        Description: 'Generated by stacktape dev for billing-dev',
        Tags: [
          generatedFor('billing'),
          { Key: tagNames.devGeneratedSecret(), Value: 'billing-dev' },
          { Key: tagNames.devSecretUser('billing-dev'), Value: 'billing-dev' }
        ]
      }),
    refusal('probe-other-project')
  );
  expect(JSON.parse((await value('probe-other-project'))!)).toEqual({ password: 'other-project-value' });

  // A dev tag without the generation tag: an older CLI, or a hand-made secret.
  await expectRefused(
    'probe-legacy-tag',
    () =>
      createSecret(account, {
        Name: 'probe-legacy-tag',
        SecretString: JSON.stringify({ password: 'hand-made' }),
        Tags: [{ Key: tagNames.devGeneratedSecret(), Value: 'probe-other' }]
      }),
    refusal('probe-legacy-tag')
  );

  // What `secret set` creates: the default description and no tags.
  await expectRefused(
    'probe-secret-set',
    () =>
      awsSdkManager.secrets.create({ name: 'probe-secret-set', value: JSON.stringify({ password: 'set-by-hand' }) }),
    refusal('probe-secret-set')
  );
  expect(JSON.parse((await value('probe-secret-set'))!)).toEqual({ password: 'set-by-hand' });

  // Generated for this project, but not in the shape this config reads: a plain value, an array, an empty key.
  for (const [name, secretValue] of [
    ['probe-shape-plain', 'plain-not-json'],
    ['probe-shape-array', JSON.stringify([{ password: 'x' }])],
    ['probe-shape-empty', JSON.stringify({ password: '' })]
  ] as const) {
    await expectRefused(
      name,
      () => createSecret(account, { Name: name, SecretString: secretValue, Tags: [generatedFor('probe')] }),
      `${refusal(name)} in the shape the config reads (a JSON object with password)`
    );
    expect(await value(name)).toBe(secretValue);
  }

  // A plain reference does not take over a JSON object.
  for (const key of overridden.splice(0)) delete (configManager as unknown as Record<PropertyKey, unknown>)[key];
  Object.defineProperty(configManager, 'allSecretReferencesUsedInConfig', {
    value: new Map([['probe-plain-ref', new Set()]]),
    configurable: true
  });
  Object.defineProperty(configManager, 'autoGenerableSecretNames', {
    value: new Set(['probe-plain-ref']),
    configurable: true
  });
  overridden.push('allSecretReferencesUsedInConfig', 'autoGenerableSecretNames');
  const restore = createMeanwhile(() =>
    createSecret(account, {
      Name: 'probe-plain-ref',
      SecretString: JSON.stringify({ password: 'x' }),
      Tags: [generatedFor('probe')]
    })
  );
  try {
    await expect(ensureMissingSecretsCreated({ projectName: 'probe', devStackName: 'probe-neta' })).rejects.toThrow(
      `${refusal('probe-plain-ref')} in the shape the config reads (a plain value)`
    );
  } finally {
    restore();
  }
});
