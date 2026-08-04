import type { Credentials } from '@aws-sdk/types';
import { globalStateManager } from '@application-services/global-state-manager';
import { tuiManager } from '@application-services/tui-manager';
import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts';
import { hintMessages } from '@errors';
import { createFetchHandler } from 'src/aws/fetch-handler';
import { retryPlugin } from 'src/aws/client-middleware';
import { redactAwsRequestInput } from 'src/aws/redact-request-input';
import { awsResourceNames } from '@stacktape/naming/aws-resource-names';
import { CliError } from '@utils/errors';

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

        const result = await next(args);

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
export const getAwsCredentialsIdentity = async ({ credentials }: { credentials: Credentials }) => {
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
  return tempStsCli.send(new GetCallerIdentityCommand({})).catch(errHandler);
};
