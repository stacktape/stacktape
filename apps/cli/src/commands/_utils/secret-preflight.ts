import type { SecretListEntry } from '@aws-sdk/client-secrets-manager';
import type { StacktapeCliArgs } from 'src/config/cli/types';
import { randomBytes } from 'node:crypto';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
import { tagNames } from '@stacktape/naming/tag-names';
import { isAgentMode } from './agent-mode';

/**
 * Generates a secure random string safe for use in most AWS services (RDS, etc.)
 * and safe for embedding in database connection string URLs (RFC 3986 userinfo).
 * Charset: alphanumeric + URL-safe special chars (unreserved + safe sub-delims).
 * Avoids: @, ", /, \, spaces, #, %, ?, $, &, ^, and other URL/shell-breaking chars.
 */
const generateSecureSecretValue = (length = 32): string => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!*+_-=.~';
  const bytes = randomBytes(length);
  return Array.from(bytes, (byte) => charset[byte % charset.length]).join('');
};

// Some consumers (e.g. self-hosted Convex's INSTANCE_SECRET) require values that
// are pure hex. The default charset above contains non-hex characters and would
// fail downstream parsers.
const HEX_REQUIRED_KEY_SUFFIXES = ['instanceSecret', 'instance_secret', 'hexSecret'];
const generateHexSecretValue = (bytes = 32): string => randomBytes(bytes).toString('hex');

const generateValueForJsonKey = (key: string): string => {
  if (HEX_REQUIRED_KEY_SUFFIXES.some((suffix) => key === suffix || key.endsWith(suffix))) {
    return generateHexSecretValue();
  }
  return generateSecureSecretValue();
};

/**
 * Generates the secret value string for a given secret.
 * If jsonKeys are specified (from dot-notation references like $Secret('db.password')),
 * generates a JSON object with a random value for each key.
 * Otherwise generates a plain random string.
 */
const buildSecretValue = (jsonKeys: Set<string>): string => {
  if (!jsonKeys.size) {
    return generateSecureSecretValue();
  }
  const jsonObject: Record<string, string> = {};
  for (const key of jsonKeys) {
    jsonObject[key] = generateValueForJsonKey(key);
  }
  return JSON.stringify(jsonObject);
};

/**
 * Prompts the user to enter values for secrets that can't be auto-generated
 * (e.g. API tokens, third-party credentials). Creates each secret in AWS Secrets Manager.
 */
const promptAndCreateUserInputSecrets = async (secrets: [string, Set<string>][]) => {
  for (const [secretName, jsonKeys] of secrets) {
    if (jsonKeys.size) {
      const jsonObject: Record<string, string> = {};
      for (const key of jsonKeys) {
        const value = await tuiManager.promptText({
          message: `Enter value for ${tuiManager.makeBold(secretName)}.${tuiManager.makeBold(key)}:`,
          isPassword: true
        });
        jsonObject[key] = value;
      }
      const spinner = tuiManager.createSpinner({ text: `Creating secret ${tuiManager.makeBold(secretName)}` });
      await awsSdkManager.secrets.create({ name: secretName, value: JSON.stringify(jsonObject) });
      spinner.success({ text: `Secret ${tuiManager.makeBold(secretName)} created` });
    } else {
      const value = await tuiManager.promptText({
        message: `Enter value for secret ${tuiManager.makeBold(secretName)}:`,
        isPassword: true
      });
      const spinner = tuiManager.createSpinner({ text: `Creating secret ${tuiManager.makeBold(secretName)}` });
      await awsSdkManager.secrets.create({ name: secretName, value });
      spinner.success({ text: `Secret ${tuiManager.makeBold(secretName)} created` });
    }
  }
};

/** `$Secret` references whose secret does not exist in the target region, with the JSON keys the config reads. */
const findMissingSecretReferences = async (): Promise<[string, Set<string>][]> => {
  const secretRefs = configManager.allSecretReferencesUsedInConfig;
  if (!secretRefs.size) {
    return [];
  }
  const existingSecrets = await awsSdkManager.secrets.list();
  const existingSecretNames = new Set(existingSecrets.map(({ Name }) => Name));
  return [...secretRefs.entries()].filter(([name]) => !existingSecretNames.has(name));
};

export type MissingSecret = {
  name: string;
  jsonKeys: string[];
  /** A database password `dev` and `deploy` generate on their own; anything else needs a value from the user. */
  generated: boolean;
};

export const findMissingSecrets = async (): Promise<MissingSecret[]> => {
  const autoGenerableNames = configManager.autoGenerableSecretNames;
  return (await findMissingSecretReferences()).map(([name, jsonKeys]) => ({
    name,
    jsonKeys: [...jsonKeys],
    generated: autoGenerableNames.has(name)
  }));
};

type TaggedSecret = Pick<SecretListEntry, 'ARN' | 'Name' | 'Tags'>;

/** The dev stage that generated the secret. */
const getGeneratedFor = ({ Tags }: TaggedSecret) =>
  Tags?.find(({ Key }) => Key === tagNames.devGeneratedSecret())?.Value;

/**
 * The dev stages that use a secret dev mode generated, one tag each (`devSecretUser`). A secret generated before these
 * tags existed has only the generating stage's tag, which then counts as its one user. Without `includeGenerator`, only
 * the user tags count: after a restore, the generating stage's tag names a stage that may use it no more.
 */
const getDevSecretUsers = (
  secret: TaggedSecret,
  { includeGenerator = true }: { includeGenerator?: boolean } = {}
): string[] => {
  const users = (secret.Tags ?? []).flatMap(({ Key, Value }) =>
    Key?.startsWith(tagNames.devSecretUserPrefix()) && Value ? [Value] : []
  );
  const generatedFor = getGeneratedFor(secret);
  return users.length || !generatedFor || !includeGenerator ? users : [generatedFor];
};

const isDevOwnedSecret = (secret: TaggedSecret) =>
  getGeneratedFor(secret) !== undefined || getDevSecretUsers(secret).length > 0;

/** Secrets Manager refuses a tag beyond the 50 a secret may have. */
const isTagLimitError = (error: unknown) =>
  ['ValidationException', 'InvalidParameterException', 'LimitExceededException'].includes((error as Error).name) &&
  /tag/i.test((error as Error).message);

/**
 * Records which dev stages use a secret dev mode generated. A deployment that is not a dev session removes the dev tags:
 * the secret is then the deployment's, and a CLI up to 4.0.0-preview.11, which deletes a dev stage's generated secrets
 * with the stage, leaves it alone. No tag decides a deletion in this CLI, so a tag change that fails costs only the
 * record and the command goes on.
 */
const updateDevSecretOwnership = async ({
  secret,
  devStackName,
  restored
}: {
  secret: TaggedSecret;
  devStackName?: string;
  restored: boolean;
}) => {
  const secretId = secret.ARN || secret.Name!;
  try {
    if (!devStackName) {
      await awsSdkManager.secrets.untag({
        secretId,
        tagKeys: [
          tagNames.devGeneratedSecret(),
          ...(secret.Tags ?? []).flatMap(({ Key }) => (Key?.startsWith(tagNames.devSecretUserPrefix()) ? [Key] : []))
        ]
      });
      return;
    }
    if ((secret.Tags ?? []).some(({ Key }) => Key === tagNames.devSecretUser(devStackName))) return;
    // Only this stage's tag is added: rewriting the other users' tags would bring back one that a stage deletion removes
    // meanwhile. A secret generated before user tags existed gets the tag of the stage that generated it too.
    const users = getDevSecretUsers(secret, { includeGenerator: !restored });
    const hasUserTags = (secret.Tags ?? []).some(({ Key }) => Key?.startsWith(tagNames.devSecretUserPrefix()));
    await awsSdkManager.secrets.tag({
      secretId,
      tags: [...new Set([...(hasUserTags ? [] : users), devStackName])].map((user) => ({
        Key: tagNames.devSecretUser(user),
        Value: user
      }))
    });
  } catch (error) {
    if ((error as Error).name !== 'AccessDeniedException' && !isTagLimitError(error)) throw error;
  }
};

/** Descriptions `deploy` gives the secrets it generates (see `ensureMissingSecretsCreated`). */
const isGeneratedSecretDescription = (description: string | undefined) =>
  description === 'Created by Stacktape' || Boolean(description?.startsWith('Generated by stacktape '));

/** What `buildSecretValue` makes for these JSON keys: a JSON object with each key, or a plain value. */
const hasGeneratedShape = (value: string | undefined, jsonKeys: Set<string>) => {
  if (!value) return false;
  if (!jsonKeys.size) return true;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      [...jsonKeys].every((key) => typeof (parsed as Record<string, unknown>)[key] === 'string')
    );
  } catch {
    return false;
  }
};

/**
 * Another command created the secret this one was about to generate: two stages that share a database password start at
 * the same moment (r2bc). The secret that exists wins, so both stages use one value. Only a secret Stacktape generated,
 * in the shape this config reads, is taken over; this command's own random value is dropped.
 */
const adoptConcurrentlyCreatedSecret = async ({
  name,
  jsonKeys,
  devStackName
}: {
  name: string;
  jsonKeys: Set<string>;
  devStackName?: string;
}) => {
  const existing = await awsSdkManager.secrets.describe({ secretId: name });
  const isStacktapeGenerated =
    !existing.DeletedDate && (isDevOwnedSecret(existing) || isGeneratedSecretDescription(existing.Description));
  const value = isStacktapeGenerated
    ? (await awsSdkManager.secrets.get({ secretId: existing.ARN || name })).SecretString
    : undefined;
  if (!isStacktapeGenerated || !hasGeneratedShape(value, jsonKeys)) {
    const keysInfo = jsonKeys.size ? ` with the JSON keys ${[...jsonKeys].join(', ')}` : '';
    throw new ExpectedError(
      'CONFIG',
      `Secret ${name} was created by something other than Stacktape while this command was generating it.`,
      [
        `Stacktape does not use a secret it did not generate in place of a generated password. If the secret is meant for this stage, make sure it has the value the config reads${keysInfo} and run the command again.`,
        `Otherwise delete it with ${tuiManager.prettyCommand('secret:delete')} and run the command again.`
      ]
    );
  }
  if (isDevOwnedSecret(existing)) {
    await updateDevSecretOwnership({ secret: existing, devStackName, restored: false });
  }
};

/**
 * Checks all `$Secret` references in the config against existing secrets in the region.
 *
 * Missing secrets are split into two categories:
 * - **Auto-generable**: used in known database password fields (relational-database masterUserPassword,
 *   redis defaultUserPassword, mongo-db-atlas-cluster adminUserCredentials.password).
 *   These are auto-generated with secure random values (with confirmation in interactive mode).
 * - **User-input**: used elsewhere (API tokens, third-party credentials, etc.).
 *   The user is prompted to enter the value interactively. In non-interactive mode,
 *   deployment is aborted with a hint to use `secret:set`.
 */
export const ensureMissingSecretsCreated = async ({
  generatedSecretDescription,
  devStackName
}: {
  generatedSecretDescription?: string;
  /** Set by `stacktape dev`: the secrets it generates are tagged with this dev stack (see `releaseDevGeneratedSecrets`). */
  devStackName?: string;
} = {}) => {
  const secretRefs = configManager.allSecretReferencesUsedInConfig;
  if (!secretRefs.size) {
    return;
  }

  const listed = await awsSdkManager.secrets.list({ includePlannedDeletion: true });
  // A secret this command needs that is scheduled for deletion is restored, whatever its tags say: a CLI up to
  // 4.0.0-preview.11 schedules the secrets dev mode generated for a dev stage it deletes, and another stage or a
  // deployment may still need one.
  const restored = new Set<string>();
  for (const secret of listed) {
    if (!secret.DeletedDate || !secret.Name || !secretRefs.has(secret.Name)) continue;
    await awsSdkManager.secrets.restore({ secretId: secret.ARN || secret.Name });
    restored.add(secret.Name);
    tuiManager.info(`Restored secret ${tuiManager.makeBold(secret.Name)}, which was scheduled for deletion.`);
    secret.DeletedDate = undefined;
  }
  const existingSecrets = listed.filter(({ DeletedDate }) => !DeletedDate);
  const existingSecretNames = new Set(existingSecrets.map(({ Name }) => Name));
  const missingSecrets = [...secretRefs.entries()].filter(([name]) => !existingSecretNames.has(name));
  for (const secret of existingSecrets) {
    if (!secret.Name || !secretRefs.has(secret.Name) || !isDevOwnedSecret(secret)) continue;
    await updateDevSecretOwnership({ secret, devStackName, restored: restored.has(secret.Name) });
  }

  if (!missingSecrets.length) {
    return;
  }

  const autoGenerableNames = configManager.autoGenerableSecretNames;
  const autoGenerable = missingSecrets.filter(([name]) => autoGenerableNames.has(name));
  const userInput = missingSecrets.filter(([name]) => !autoGenerableNames.has(name));

  // Handle user-input secrets first (API tokens, third-party credentials, etc.)
  if (userInput.length) {
    const secretList = userInput
      .map(([name, jsonKeys]) => {
        const keysInfo = jsonKeys.size ? ` (keys: ${[...jsonKeys].join(', ')})` : '';
        return `  - ${tuiManager.makeBold(name)}${keysInfo}`;
      })
      .join('\n');
    tuiManager.warn(
      `The config references ${userInput.length} secret(s) that don't exist in ${tuiManager.makeBold(globalStateManager.region)}:\n${secretList}`
    );

    if (!isAgentMode() && process.stdout.isTTY) {
      await promptAndCreateUserInputSecrets(userInput);
    } else {
      throw new ExpectedError(
        'CONFIG',
        `Missing ${userInput.length} secret(s): ${userInput.map(([n]) => n).join(', ')}`,
        `Create the secrets using ${tuiManager.prettyCommand('secret:set')} and re-run the deployment.`
      );
    }
  }

  // Handle auto-generable secrets (database passwords)
  if (autoGenerable.length) {
    const secretList = autoGenerable
      .map(([name, jsonKeys]) => {
        const keysInfo = jsonKeys.size ? ` (JSON keys: ${[...jsonKeys].join(', ')})` : '';
        return `  - ${tuiManager.makeBold(name)}${keysInfo}`;
      })
      .join('\n');
    tuiManager.info(
      `Auto-generating ${autoGenerable.length} database secret(s) in ${tuiManager.makeBold(globalStateManager.region)}:\n${secretList}`
    );

    const args = globalStateManager.args as StacktapeCliArgs;
    if (!isAgentMode() && !args.autoConfirmOperation && process.stdout.isTTY) {
      const shouldCreate = await tuiManager.promptConfirm({
        message: `Auto-generate ${autoGenerable.length === 1 ? 'this secret' : 'these secrets'} with secure random values?`
      });
      if (!shouldCreate) {
        tuiManager.info(
          `Create the missing secrets manually using ${tuiManager.prettyCommand('secret:set')} before deploying.`
        );
        throw new ExpectedError(
          'CONFIG',
          'Deployment aborted: missing secrets.',
          `Create the secrets using ${tuiManager.prettyCommand('secret:set')} and re-run the deployment.`
        );
      }
    }

    const spinner = tuiManager.createSpinner({ text: `Creating ${autoGenerable.length} database secret(s)` });
    const adopted: string[] = [];
    for (const [secretName, jsonKeys] of autoGenerable) {
      const secretValue = buildSecretValue(jsonKeys);
      const created = await awsSdkManager.secrets.createUnlessExists({
        name: secretName,
        value: secretValue,
        ...(devStackName
          ? {
              description: `Generated by stacktape dev for ${devStackName}`,
              tags: [
                { Key: tagNames.devGeneratedSecret(), Value: devStackName },
                { Key: tagNames.devSecretUser(devStackName), Value: devStackName }
              ]
            }
          : generatedSecretDescription === undefined
            ? {}
            : { description: generatedSecretDescription })
      });
      if (!created) {
        await adoptConcurrentlyCreatedSecret({ name: secretName, jsonKeys, devStackName });
        adopted.push(secretName);
      }
    }
    const createdNames = autoGenerable.map(([name]) => name).filter((name) => !adopted.includes(name));
    spinner.success({
      text: [
        createdNames.length
          ? `Created ${createdNames.length} secret(s): ${createdNames.map((n) => tuiManager.makeBold(n)).join(', ')}`
          : '',
        adopted.length
          ? `Using ${adopted.length} secret(s) another command generated meanwhile: ${adopted.map((n) => tuiManager.makeBold(n)).join(', ')}`
          : ''
      ]
        .filter(Boolean)
        .join('. ')
    });
  }
};

export type DevSecretRelease = {
  name: string;
  /** The other dev stages that use it, by their user tags. */
  usedBy: string[];
};

/**
 * Removes a dev stack that is being deleted from the users of the secrets `stacktape dev` generated, and keeps every
 * secret. A deletion that decided from the tags whether anything else still uses a secret raced the deployments and
 * dev sessions that take one up meanwhile, and a lost race deleted a password a running application reads; deleting a
 * kept secret is the user's call (`secret delete`).
 */
export const releaseDevGeneratedSecrets = async ({ stackName }: { stackName: string }): Promise<DevSecretRelease[]> => {
  const used = (await awsSdkManager.secrets.list()).filter((secret) => getDevSecretUsers(secret).includes(stackName));
  for (const secret of used) {
    if ((secret.Tags ?? []).some(({ Key }) => Key === tagNames.devSecretUser(stackName))) {
      await awsSdkManager.secrets
        .untag({ secretId: secret.ARN || secret.Name!, tagKeys: [tagNames.devSecretUser(stackName)] })
        .catch(() => {});
    }
  }
  return used.map((secret) => ({
    name: secret.Name!,
    usedBy: getDevSecretUsers(secret, { includeGenerator: false }).filter((user) => user !== stackName)
  }));
};
