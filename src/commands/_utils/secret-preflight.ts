import { randomBytes } from 'node:crypto';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { configManager } from '@domain-services/config-manager';
import { awsSdkManager } from '@utils/aws-sdk-manager';
import { ExpectedError } from '@utils/errors';
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
    jsonObject[key] = generateSecureSecretValue();
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
      await awsSdkManager.createNewSecret(secretName, JSON.stringify(jsonObject));
      spinner.success({ text: `Secret ${tuiManager.makeBold(secretName)} created` });
    } else {
      const value = await tuiManager.promptText({
        message: `Enter value for secret ${tuiManager.makeBold(secretName)}:`,
        isPassword: true
      });
      const spinner = tuiManager.createSpinner({ text: `Creating secret ${tuiManager.makeBold(secretName)}` });
      await awsSdkManager.createNewSecret(secretName, value);
      spinner.success({ text: `Secret ${tuiManager.makeBold(secretName)} created` });
    }
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
 *   deployment is aborted with a hint to use `secret:create`.
 */
export const ensureMissingSecretsCreated = async () => {
  const secretRefs = configManager.allSecretReferencesUsedInConfig;
  if (!secretRefs.size) {
    return;
  }

  const existingSecrets = await awsSdkManager.listAllSecrets();
  const existingSecretNames = new Set(existingSecrets.map(({ Name }) => Name));
  const missingSecrets = [...secretRefs.entries()].filter(([name]) => !existingSecretNames.has(name));

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
        `Create the secrets using ${tuiManager.prettyCommand('secret:create')} and re-run the deployment.`
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
          `Create the missing secrets manually using ${tuiManager.prettyCommand('secret:create')} before deploying.`
        );
        throw new ExpectedError(
          'CONFIG',
          'Deployment aborted: missing secrets.',
          `Create the secrets using ${tuiManager.prettyCommand('secret:create')} and re-run the deployment.`
        );
      }
    }

    const spinner = tuiManager.createSpinner({ text: `Creating ${autoGenerable.length} database secret(s)` });
    for (const [secretName, jsonKeys] of autoGenerable) {
      const secretValue = buildSecretValue(jsonKeys);
      await awsSdkManager.createNewSecret(secretName, secretValue);
    }
    spinner.success({
      text: `Created ${autoGenerable.length} secret(s): ${autoGenerable.map(([n]) => tuiManager.makeBold(n)).join(', ')}`
    });
  }
};
