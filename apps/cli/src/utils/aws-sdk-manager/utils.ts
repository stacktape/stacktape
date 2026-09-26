import type { Credentials } from '@aws-sdk/types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import type { GetCallerIdentityResponse } from '@aws-sdk/client-sts';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { hintMessages } from '@errors';
import { createFetchHandler } from 'src/aws/fetch-handler';
import { retryPlugin } from 'src/aws/client-middleware';
import { redactAwsRequestInput } from 'src/aws/redact-request-input';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { CliError } from '@utils/errors';
import { startTiming, timeAsync } from '@utils/timings';
import { cacheAwsIdentity, readCachedAwsIdentity } from './identity-cache';

export const getErrorHandler = (message: string) => (err: Error) => {
  if (err instanceof CliError) {
    throw err;
  }
  let additionalMessage = '';
  if (`${err}`.includes('provided token has expired')) {
    additionalMessage = JSON.stringify({
      ...globalStateManager.credentials.identity,
      expiration: globalStateManager.credentials.expiration,
      source: globalStateManager.credentials.source
    });
  }
  throw new CliError({
    category: 'AWS',
    code: 'AWS_REQUEST_FAILED',
    message: `${message}\nError message:\n${err}${additionalMessage ? `\n${additionalMessage}` : ''}`,
    hints: getHintsForAWSError(err),
    cause: err
  });
};

const getHintsForAWSError = (err: Error) => {
  const hints = [];
  const lowerCasedError = `${err}`.toLowerCase();
  const isPotentiallyWrongProfileError =
    lowerCasedError.includes('accessdenied') ||
    lowerCasedError.includes('access denied') ||
    lowerCasedError.includes('notauthorized') ||
    lowerCasedError.includes('unauthorized') ||
    lowerCasedError.includes('insufficient privileges') ||
    lowerCasedError.includes('insufficient permissions') ||
    lowerCasedError.includes('not authorized');
  if (isPotentiallyWrongProfileError) {
    hints.push(
      ...hintMessages.weakCredentials({
        profile: globalStateManager.awsProfileName,
        credentials: globalStateManager.credentials
      })
    );
  }
  return hints;
};

export const loggingPlugin = {
  applyToStack: (stack) => {
    // Middleware added to mark start and end of an complete API call.
    stack.add(
      (next, context) => async (args) => {
        const operation = `${context.clientName.replace('Client', '')}.${context.commandName.replace('Command', '')}`;
        const input = redactAwsRequestInput({
          commandName: context.commandName,
          filterSensitiveLog: context.inputFilterSensitiveLog,
          input: args.input || {}
        });
        const prefix = `[${tuiManager.colorize('gray', `DEBUG: ${operation}`)}]`;
        const shouldPrint =
          globalStateManager.logLevel === 'debug' &&
          // we are not printing requests for sending logs to /stp/stack-operations log group as it creates infinite sending loop (and too much logs) during debug logging
          !(
            context.commandName.includes('PutLogEvents') &&
            input.logGroupName === awsResourceNames.stackOperationsLogGroup()
          );

        if (shouldPrint) {
          tuiManager.debug(`${prefix} Request input:\n  └ ${JSON.stringify(input)}`);
        }

        const start = Date.now();

        // One span per HTTP attempt: retries run this middleware again. Only the operation name is recorded.
        const result = await timeAsync('aws:request', () => next(args), { operation });

        const end = Date.now();

        // const metadata = result.output?.$metadata || {};
        if (shouldPrint) {
          tuiManager.debug(`${prefix} Done in ${end - start}ms.`);
        }
        return result;
      },
      { tags: ['ROUND_TRIP'], step: 'deserialize' }
    );
  }
};

// This method is separated from awsSdkManager because it does NOT use internal client (STS client) of the manager.
// This is due to this method being used by globalStateManager.credentials getter which is then used by awsSdkManager.
// This creates uncomfortable dependency loop between globalStateManager and awsSdkManager,
// so we decided to separate this method from awsSdkManager (though theoretically it could be part of it).
// Also methods in awsSdkManager are methods that should be called on/used with the globalStateManager.targetAwsAccount,
// but this method is for more general purpose
// The identity for an access key is cached for a day (`identity-cache.ts`), so most runs skip the STS round trip. A
// cached identity is exactly what STS returned for that key, so the account check of a named connection is unchanged.
export const getAwsCredentialsIdentity = async ({
  credentials
}: {
  credentials: Credentials;
}): Promise<GetCallerIdentityResponse> => {
  const endTiming = startTiming('aws:identity');
  const cached = credentials.accessKeyId ? await readCachedAwsIdentity(credentials.accessKeyId) : null;
  if (cached) {
    endTiming({ source: 'cache', account: cached.account });
    return { Account: cached.account, Arn: cached.arn, UserId: cached.userId };
  }
  const errHandler = getErrorHandler(
    `Unable to get identity for credentials (access key id: ${credentials.accessKeyId}).`
  );
  const tempStsCli = new STSClient({
    credentials,
    region: globalStateManager.region,
    requestHandler: createFetchHandler()
  });
  tempStsCli.middlewareStack.use(loggingPlugin);
  tempStsCli.middlewareStack.use(retryPlugin);
  const identity = await tempStsCli.send(new GetCallerIdentityCommand({})).catch((error: Error) => {
    endTiming({ source: 'sts', outcome: 'error' });
    return errHandler(error);
  });
  endTiming({ source: 'sts', account: identity.Account });
  if (credentials.accessKeyId && identity.Account && identity.Arn && identity.UserId) {
    await cacheAwsIdentity(credentials.accessKeyId, {
      account: identity.Account,
      arn: identity.Arn,
      userId: identity.UserId
    });
  }
  return identity;
};
