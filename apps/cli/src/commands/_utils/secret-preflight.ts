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

/** The dev stage that generated the secret, or whose deletion scheduled it for deletion. */
const getGeneratedFor = ({ Tags }: TaggedSecret) =>
  Tags?.find(({ Key }) => Key === tagNames.devGeneratedSecret())?.Value;

/**
 * The dev stages that use a secret dev mode generated, one tag each (`devSecretUser`). A secret generated before these
 * tags existed has only the generating stage's tag, which then counts as its one user. Without `includeGenerator`, only
 * the user tags count: after a restore, or once a deleted stage removed its own tag, the generating stage's tag names a
 * stage that uses it no more.
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

/**
 * A dev stage that uses a secret dev mode generated records itself as one of its users, so deleting another stage that
 * uses it leaves it. A deployment that is not a dev session takes the secret out of dev ownership: no stage's deletion
 * deletes it any more.
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
  const users = getDevSecretUsers(secret, { includeGenerator: !restored });
  try {
    if (!devStackName) {
      const userTagKeys = (secret.Tags ?? []).flatMap(({ Key }) =>
        Key?.startsWith(tagNames.devSecretUserPrefix()) ? [Key] : []
      );
      await awsSdkManager.secrets.untag({ secretId, tagKeys: [tagNames.devGeneratedSecret(), ...userTagKeys] });
      return;
    }
    if (
      users.includes(devStackName) &&
      (secret.Tags ?? []).some(({ Key }) => Key === tagNames.devSecretUser(devStackName))
    )
      return;
    // A secret generated before user tags existed gets the tag of the stage that generated it too.
    await awsSdkManager.secrets.tag({
      secretId,
      tags: [...new Set([...users, devStackName])].map((user) => ({ Key: tagNames.devSecretUser(user), Value: user }))
    });
  } catch (error) {
    if ((error as Error).name !== 'AccessDeniedException') throw error;
    tuiManager.warn(
      devStackName
        ? `Secret ${tuiManager.makeBold(secret.Name!)} was generated by dev mode for ${users.join(', ')}. Without secretsmanager:TagResource, ` +
            `this command could not record that ${devStackName} uses it too, so deleting ${users.join(' and ')} schedules it for deletion; ` +
            'the next deployment or dev session that uses it within 7 days restores it.'
        : `Secret ${tuiManager.makeBold(secret.Name!)} was generated by dev mode for ${users.join(', ')}, and deleting ${users.length === 1 ? 'that stage' : 'the last of them'} schedules it for deletion. ` +
            'Without secretsmanager:UntagResource, this command could not keep it; the next deployment or dev session that uses it within 7 days restores it.'
    );
  }
};

/**
 * Checks all `$Secret` references in the config against existing secrets in the region.
 *
 * Missing secrets are split into two categories:
 * - **Auto-generable**: used in known database password fields (relational-database masterUserPassword,
 *   redis-cluster defaultUserPassword, mongo-db-atlas-cluster adminUserCredentials.password).
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
  /** Set by `stacktape dev`: the secrets it generates are deleted with this dev stack (see `deleteDevGeneratedSecrets`). */
  devStackName?: string;
} = {}) => {
  const secretRefs = configManager.allSecretReferencesUsedInConfig;
  if (!secretRefs.size) {
    return;
  }

  const listed = await awsSdkManager.secrets.list({ includePlannedDeletion: true });
  // Deleting the last dev stage that uses a secret dev mode generated schedules it for deletion. A stage that still
  // uses it gets it back; another scheduled deletion is the owner's and leaves the secret missing.
  const restored = new Set<string>();
  for (const secret of listed) {
    if (!secret.DeletedDate || !secret.Name || !secretRefs.has(secret.Name) || !isDevOwnedSecret(secret)) continue;
    await awsSdkManager.secrets.restore({ secretId: secret.ARN || secret.Name });
    restored.add(secret.Name);
    tuiManager.info(
      `Restored secret ${tuiManager.makeBold(secret.Name)}, which deleting ${getGeneratedFor(secret)} had scheduled for deletion.`
    );
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
    for (const [secretName, jsonKeys] of autoGenerable) {
      const secretValue = buildSecretValue(jsonKeys);
      await awsSdkManager.secrets.create({
        name: secretName,
        value: secretValue,
        ...(devStackName
          ? {
              description: `Generated by stacktape dev for ${devStackName}; deleted with the last dev stage that uses it`,
              tags: [
                { Key: tagNames.devGeneratedSecret(), Value: devStackName },
                { Key: tagNames.devSecretUser(devStackName), Value: devStackName }
              ]
            }
          : generatedSecretDescription === undefined
            ? {}
            : { description: generatedSecretDescription })
      });
    }
    spinner.success({
      text: `Created ${autoGenerable.length} secret(s): ${autoGenerable.map(([n]) => tuiManager.makeBold(n)).join(', ')}`
    });
  }
};

/**
 * Removes a dev stack that is being deleted from the users of the secrets `stacktape dev` generated, and schedules each
 * secret that no other dev stage uses for deletion. The 7-day recovery window lets the next deployment or dev session of
 * a stage that uses the secret restore it (see `ensureMissingSecretsCreated`). Stages deleted at the same time each
 * read the tags again after removing their own, so the last one deletes the secret.
 */
const DEV_SECRET_RECOVERY_DAYS = 7;

export const deleteDevGeneratedSecrets = async ({
  stackName
}: {
  stackName: string;
}): Promise<{ deleted: string[]; kept: { name: string; usedBy: string[] }[] }> => {
  const used = (await awsSdkManager.secrets.list()).filter((secret) => getDevSecretUsers(secret).includes(stackName));
  const deleted: string[] = [];
  const kept: { name: string; usedBy: string[] }[] = [];
  for (const secret of used) {
    const secretId = secret.ARN || secret.Name!;
    if ((secret.Tags ?? []).some(({ Key }) => Key === tagNames.devSecretUser(stackName))) {
      await awsSdkManager.secrets.untag({ secretId, tagKeys: [tagNames.devSecretUser(stackName)] });
    }
    const current = await awsSdkManager.secrets.describe({ secretId });
    const usedBy = getDevSecretUsers({ ...secret, Tags: current.Tags }, { includeGenerator: false }).filter(
      (user) => user !== stackName
    );
    if (usedBy.length) {
      kept.push({ name: secret.Name!, usedBy });
      continue;
    }
    if (!current.DeletedDate) {
      try {
        // The restore message names the stage whose deletion scheduled it.
        await awsSdkManager.secrets.tag({ secretId, tags: [{ Key: tagNames.devGeneratedSecret(), Value: stackName }] });
        await awsSdkManager.secrets.delete({ secretId, recoveryWindowInDays: DEV_SECRET_RECOVERY_DAYS });
      } catch (error) {
        // Another stage deleted at the same moment scheduled it first.
        if (!/(scheduled|marked) for deletion/i.test(String((error as Error).message))) throw error;
      }
    }
    deleted.push(secret.Name!);
  }
  return { deleted, kept };
};
